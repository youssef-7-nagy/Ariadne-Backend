const mongoose = require("mongoose");
const dns = require("dns");
const dotenv = require("dotenv");

dotenv.config();

async function databaseConnection() {
  const dbUrl = process.env.DB_URL;

  if (!dbUrl) {
    console.error("[ERROR] DB_URL is not set in your .env file.");
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

  const MAX_RETRIES = 5;
  const RETRY_DELAY_MS = 2000;

  const mongooseOptions = {
    serverSelectionTimeoutMS: 15000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 15000,
    maxPoolSize: 15,
    minPoolSize: 2,
    maxIdleTimeMS: 30000,
    heartbeatFrequencyMS: 10000,
    family: 4, // Force IPv4 to prevent IPv6 DNS/routing hang on Windows
  };

  // Prevent multiple listener bindings on reconnects
  if (!mongoose.connection._hasAtlasListeners) {
    mongoose.connection._hasAtlasListeners = true;
    mongoose.connection.on("connected", () => {
      console.log("[OK] MongoDB Connected successfully.");
    });
    mongoose.connection.on("error", (err) => {
      console.warn("[WARN] MongoDB connection error:", err.message);
    });
    mongoose.connection.on("disconnected", () => {
      console.warn("[WARN] MongoDB disconnected. Driver will attempt to reconnect.");
    });
  }

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await mongoose.connect(dbUrl, mongooseOptions);
      console.log("[OK] MongoDB Connected to:", dbUrl.split("@").pop()?.split("?")[0] || "Atlas");
      return; // success
    } catch (error) {
      console.error(`[ERROR] MongoDB connection attempt ${attempt}/${MAX_RETRIES} failed:`, error.message);
      if (attempt < MAX_RETRIES) {
        console.log(`[INFO] Retrying in ${RETRY_DELAY_MS / 1000}s...`);
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      } else {
        console.error("[ERROR] All MongoDB connection attempts failed. Exiting.");
        process.exit(1);
      }
    }
  }
}

module.exports = {
  databaseConnection,
};
