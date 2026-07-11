const mongoose = require("mongoose");
const dotenv = require("dotenv");

const { User } = require("../models/User");
const { Car } = require("../models/Car");
const Package = require("../models/Package");
const LegacyOrder = require("../models/Order");
const PackageSubscription = require("../models/PackageSubscription");
const BookWash = require("../models/BookWash");

dotenv.config();

const VALID_SUBSCRIPTION_STATUSES = new Set([
  "pending",
  "delivered",
  "completed",
  "cancelled",
]);

const toSafeString = (value, fallback = "") => String(value ?? fallback).trim();
const toPositiveNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return parsed < 0 ? fallback : parsed;
};

const normalizeOrderItems = (items = []) => {
  if (!Array.isArray(items)) return [];
  return items
    .filter((item) => item && typeof item === "object")
    .map((item) => ({
      packageId: item.packageId || undefined,
      title: toSafeString(item.title || "Subscription Package"),
      quantity: toPositiveNumber(item.quantity, 1) || 1,
      unitPrice: toPositiveNumber(item.unitPrice ?? item.price, 0),
      specialInstructions: toSafeString(item.specialInstructions || "", ""),
    }));
};

const normalizeSubscriptionDetails = (details = {}, items = []) => {
  const startDate = details.startDate ? new Date(details.startDate) : new Date();
  const durationMonths = Math.max(1, toPositiveNumber(details.durationMonths, 1));
  const endDate = details.endDate ? new Date(details.endDate) : new Date(startDate);

  if (!details.endDate) {
    endDate.setMonth(endDate.getMonth() + durationMonths);
  }

  return {
    isSubscription:
      typeof details.isSubscription === "boolean" ? details.isSubscription : true,
    packageId: details.packageId || items[0]?.packageId,
    packageTitle: toSafeString(
      details.packageTitle || items[0]?.title || "Subscription Package"
    ),
    billingCycle: toSafeString(details.billingCycle || "monthly").toLowerCase(),
    durationMonths,
    washesPerMonth: Math.max(1, toPositiveNumber(details.washesPerMonth, 4)),
    startDate,
    endDate,
  };
};

async function normalizeResetPasswordIndex() {
  const usersCollection = mongoose.connection.collection("users");
  const indexes = await usersCollection.indexes();
  const resetTokenIndex = indexes.find((index) => index.name === "resetPasswordToken_1");

  if (resetTokenIndex && !resetTokenIndex.sparse) {
    await usersCollection.dropIndex("resetPasswordToken_1");
  }

  await usersCollection.createIndex(
    { resetPasswordToken: 1 },
    {
      name: "resetPasswordToken_1",
      unique: true,
      sparse: true,
      background: true,
    }
  );
}

async function normalizeLegacyOrderIndex() {
  const subscriptionsCollection = mongoose.connection.collection("package_subscriptions");
  const indexes = await subscriptionsCollection.indexes();
  const legacyIndex = indexes.find((index) => index.name === "legacyOrderId_1");

  if (legacyIndex && !legacyIndex.unique) {
    await subscriptionsCollection.dropIndex("legacyOrderId_1");
  }

  await subscriptionsCollection.createIndex(
    { legacyOrderId: 1 },
    {
      name: "legacyOrderId_1",
      unique: true,
      sparse: true,
      background: true,
    }
  );
}

async function ensureIndexes() {
  await normalizeLegacyOrderIndex();

  await Promise.all([
    User.createIndexes(),
    Car.createIndexes(),
    Package.createIndexes(),
    PackageSubscription.createIndexes(),
    BookWash.createIndexes(),
  ]);
  await normalizeResetPasswordIndex();
}

async function migrateLegacyOrders() {
  const legacyOrders = await LegacyOrder.find({}).lean();
  let migrated = 0;
  let skipped = 0;

  for (const order of legacyOrders) {
    const alreadyMigrated = await PackageSubscription.exists({
      legacyOrderId: order._id,
    });

    if (alreadyMigrated) {
      skipped += 1;
      continue;
    }

    const items = normalizeOrderItems(order.items);
    const normalizedDetails = normalizeSubscriptionDetails(order.subscriptionDetails, items);
    const rawStatus = toSafeString(order.status || "pending").toLowerCase();

    await PackageSubscription.create({
      legacyOrderId: order._id,
      user: order.user,
      userName: toSafeString(order.userName || "App User"),
      userEmail: toSafeString(order.userEmail),
      userPhone: toSafeString(order.userPhone || "Not Provided"),
      address: toSafeString(order.address),
      items,
      subscriptionDetails: normalizedDetails,
      totalAmount: toPositiveNumber(order.totalAmount, 0),
      paymentMethod: toSafeString(order.paymentMethod || "cash").toLowerCase(),
      status: VALID_SUBSCRIPTION_STATUSES.has(rawStatus) ? rawStatus : "pending",
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    });

    migrated += 1;
  }

  return { totalLegacyOrders: legacyOrders.length, migrated, skipped };
}

async function getCollectionSummary() {
  const [users, cars, packages, subscriptions, bookWashes, legacyOrders] = await Promise.all([
    User.countDocuments(),
    Car.countDocuments(),
    Package.countDocuments(),
    PackageSubscription.countDocuments(),
    BookWash.countDocuments(),
    LegacyOrder.countDocuments(),
  ]);

  return {
    users,
    cars,
    packages,
    package_subscriptions: subscriptions,
    book_washes: bookWashes,
    legacy_orders: legacyOrders,
  };
}

async function main() {
  if (!process.env.DB_URL) {
    throw new Error("DB_URL is missing in environment variables");
  }

  await mongoose.connect(process.env.DB_URL);
  console.log("Connected to MongoDB.");

  await ensureIndexes();
  const migration = await migrateLegacyOrders();
  const summary = await getCollectionSummary();

  console.log("Migration result:", migration);
  console.log("Collections summary:", summary);
}

main()
  .then(async () => {
    await mongoose.disconnect();
    console.log("Database organization completed.");
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("Database organization failed:", error);
    try {
      await mongoose.disconnect();
    } catch {
      // no-op
    }
    process.exit(1);
  });
