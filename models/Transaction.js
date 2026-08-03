const mongoose = require("mongoose");

if (mongoose.models && mongoose.models.Transaction) {
  delete mongoose.models.Transaction;
}

const transactionSchema = new mongoose.Schema(
  {
    clientName: { type: String, required: true },
    serviceName: { type: String, required: true },
    amount: { type: Number, required: true },
    paymentMethod: { 
      type: String, 
      enum: ["cash", "instapay", "bank transfer", "visa"], 
      default: "cash",
      required: true 
    },
    date: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Transaction", transactionSchema);


