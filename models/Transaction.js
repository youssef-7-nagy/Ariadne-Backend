const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    clientName: { type: String, required: true },
    serviceName: { type: String, required: true },
    amount: { type: Number, required: true },
    paymentMethod: { type: String, enum: ["cash", "visa"], required: true },
    date: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Transaction", transactionSchema);
