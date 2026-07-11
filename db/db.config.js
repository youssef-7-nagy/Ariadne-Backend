const mongoose = require("mongoose");
const dns = require("dns");
const dotenv = require("dotenv");

dotenv.config();

async function databaseConnection() {
  const dbUrl = process.env.DB_URL;

  if (!dbUrl) {
    console.error("❌ DB_URL is not set in your .env file.");
    process.exit(1);
  }

  // Fix: Some networks (especially IPv6-only DNS) can't resolve SRV records.
  // Force Google DNS for reliable mongodb+srv:// connections.
  if (dbUrl.startsWith("mongodb+srv://")) {
    try {
      dns.setServers(["8.8.8.8", "8.8.4.4"]);
    } catch (e) {
      // Silently ignore if already set or not supported
    }
  }

  try {
    await mongoose.connect(dbUrl);
    console.log("✅ MongoDB Connected to:", dbUrl.split("@").pop()?.split("?")[0] || "Atlas");
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    process.exit(1);
  }
}

module.exports = {
  databaseConnection,
};
