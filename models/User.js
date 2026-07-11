const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    password: { type: String, required: true },
    gender: { type: String, enum: ["male", "female"], default: undefined },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    resetPasswordToken: { type: String, unique: true, sparse: true },
    resetPasswordExpires: { type: Date },
    // ─── OAuth provider IDs ───────────────────────────────────────────────────
    googleId: { type: String, unique: true, sparse: true },
    facebookId: { type: String, unique: true, sparse: true },
    appleId: { type: String, unique: true, sparse: true },
    avatar: { type: String, default: "" },
    // ─────────────────────────────────────────────────────────────────────────
    savedCards: [{
      cardName: String,
      cardNumberLast4: String,
      encryptedCardNumber: String,
      expiryDate: String,
      cardType: { type: String, default: "stripe" }
    }]
  },
  {
    timestamps: true,
    collection: "users",
  }
);

userSchema.index({ role: 1, createdAt: -1 });

const User = mongoose.model("User", userSchema);

module.exports = { User };
