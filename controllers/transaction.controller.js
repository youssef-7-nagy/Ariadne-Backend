const Transaction = require("../models/Transaction");
const Category = require("../models/Category");
const Project = require("../models/Project");

exports.createTransaction = async (req, res) => {
  try {
    const { clientName, serviceName, amount, paymentMethod, category, project, categoryName, projectName } = req.body;
    const normalizedMethod = String(paymentMethod || 'cash').toLowerCase().trim();

    let finalCategoryName = categoryName;
    let finalProjectName = projectName;

    if (category && !finalCategoryName) {
      const catDoc = await Category.findById(category);
      if (catDoc) finalCategoryName = catDoc.name;
    }

    if (project && !finalProjectName) {
      const projDoc = await Project.findById(project);
      if (projDoc) finalProjectName = projDoc.title;
    }

    const finalServiceName = serviceName || finalProjectName || finalCategoryName || 'Project Service';

    const newTransaction = new Transaction({ 
      clientName, 
      serviceName: finalServiceName, 
      amount: Number(amount), 
      paymentMethod: normalizedMethod,
      category: category || null,
      categoryName: finalCategoryName || '',
      project: project || null,
      projectName: finalProjectName || ''
    });
    await newTransaction.save();

    const populated = await Transaction.findById(newTransaction._id)
      .populate('category', 'name slug')
      .populate('project', 'title slug coverImage');

    res.status(201).json({ success: true, data: populated || newTransaction });
  } catch (error) {
    console.error("Error creating transaction:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find()
      .populate('category', 'name slug')
      .populate('project', 'title slug coverImage')
      .sort({ createdAt: -1 });
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
    })
      .populate('category', 'name slug')
      .populate('project', 'title slug coverImage')
      .sort({ createdAt: -1 });
    
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
    const updateData = { ...req.body };
    if (updateData.paymentMethod) {
      updateData.paymentMethod = String(updateData.paymentMethod).toLowerCase().trim();
    }

    if (updateData.category && !updateData.categoryName) {
      const catDoc = await Category.findById(updateData.category);
      if (catDoc) updateData.categoryName = catDoc.name;
    }
    if (updateData.project && !updateData.projectName) {
      const projDoc = await Project.findById(updateData.project);
      if (projDoc) updateData.projectName = projDoc.title;
    }

    if (!updateData.serviceName && (updateData.projectName || updateData.categoryName)) {
      updateData.serviceName = updateData.projectName || updateData.categoryName;
    }

    const updated = await Transaction.findByIdAndUpdate(id, updateData, { new: true, runValidators: true })
      .populate('category', 'name slug')
      .populate('project', 'title slug coverImage');

    if (!updated) {
      return res.status(404).json({ success: false, message: "Transaction not found" });
    }
    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    console.error("Error updating transaction:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

