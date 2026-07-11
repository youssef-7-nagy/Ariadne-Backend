const express = require("express");
const router = express.Router();
const transactionController = require("../controllers/transaction.controller");
const { authMiddleWare } = require("../middlewares/auth.middleware");
const { adminOnly } = require("../middlewares/admin.middleware");

// Protect endpoints with admin authorization
router.post("/", authMiddleWare, adminOnly, transactionController.createTransaction);
router.get("/", authMiddleWare, adminOnly, transactionController.getTransactions);

// Client route
router.get("/client/:clientName", authMiddleWare, transactionController.getTransactionsByClient);
router.delete("/:id", authMiddleWare, adminOnly, transactionController.deleteTransaction);
router.put("/:id", authMiddleWare, adminOnly, transactionController.updateTransaction);

module.exports = router;
