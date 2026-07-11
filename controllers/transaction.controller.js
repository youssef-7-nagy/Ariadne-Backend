const Transaction = require("../models/Transaction");

exports.createTransaction = async (req, res) => {
  try {
    const { clientName, serviceName, amount, paymentMethod } = req.body;
    const newTransaction = new Transaction({ clientName, serviceName, amount, paymentMethod });
    await newTransaction.save();
    res.status(201).json({ success: true, data: newTransaction });
  } catch (error) {
    console.error("Error creating transaction:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: transactions });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getTransactionsByClient = async (req, res) => {
  try {
    const { clientName } = req.params;
    if (!clientName) {
      return res.status(400).json({ success: false, message: "Client name is required" });
    }
    // Case-insensitive regex search
    const transactions = await Transaction.find({ 
      clientName: { $regex: new RegExp(`^${clientName}$`, 'i') } 
    }).sort({ createdAt: -1 });
    
    res.status(200).json({ success: true, data: transactions });
  } catch (error) {
    console.error("Error fetching client transactions:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Transaction.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Transaction not found" });
    }
    res.status(200).json({ success: true, message: "Transaction deleted successfully" });
  } catch (error) {
    console.error("Error deleting transaction:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await Transaction.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
    if (!updated) {
      return res.status(404).json({ success: false, message: "Transaction not found" });
    }
    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    console.error("Error updating transaction:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
