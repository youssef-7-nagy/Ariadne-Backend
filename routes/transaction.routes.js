const express = require("express");
const router = express.Router();
const transactionController = require("../controllers/transaction.controller");
const { authMiddleWare } = require("../middlewares/auth.middleware");
const { adminOnly, superAdminOnly } = require("../middlewares/admin.middleware");

// Protect endpoints with super admin authorization
router.post("/", authMiddleWare, superAdminOnly, transactionController.createTransaction);
router.get("/", authMiddleWare, superAdminOnly, transactionController.getTransactions);

// Client route
router.get("/client/:clientName", authMiddleWare, transactionController.getTransactionsByClient);
router.delete("/:id", authMiddleWare, superAdminOnly, transactionController.deleteTransaction);
router.put("/:id", authMiddleWare, superAdminOnly, transactionController.updateTransaction);

module.exports = router;
