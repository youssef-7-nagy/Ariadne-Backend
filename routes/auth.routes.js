const express = require("express");
const router = express.Router();
const passport = require("passport");

const authController = require("../controllers/auth.controller.js");
const { authMiddleWare } = require("../middlewares/auth.middleware.js");
const { adminOnly } = require("../middlewares/admin.middleware.js");

// ─── Email / Password routes (unchanged) ─────────────────────────────────────
router.get("/me", authMiddleWare, authController.validateMe);
router.put("/me/gender", authMiddleWare, authController.updateMyGender);

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);

router.get("/users", authMiddleWare, adminOnly, authController.getAllUsers);
router.put("/users/:id/role", authMiddleWare, adminOnly, authController.updateUserRole);

// Legacy route kept for backwards-compatibility during transition
router.post("/google", authController.googleLogin);

// ─── Google OAuth ─────────────────────────────────────────────────────────────
// Step 1: redirect browser → Google consent screen
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// Step 2: Google redirects back here after user grants permission
router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: `${process.env.CLIENT_URL
      ? process.env.CLIENT_URL.split(",")[0].trim()
      : "http://localhost:5173"}/oauth/callback?error=google_auth_failed`,
    session: false,
  }),
  authController.oauthCallback
);



module.exports = router;
