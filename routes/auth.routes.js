const express = require("express");
const router = express.Router();
const passport = require("passport");

const authController = require("../controllers/auth.controller.js");
const { authMiddleWare } = require("../middlewares/auth.middleware.js");
const { adminOnly, superAdminOnly } = require("../middlewares/admin.middleware.js");

// ─── Email / Password routes (unchanged) ─────────────────────────────────────
router.get("/me", authMiddleWare, authController.validateMe);
router.put("/me/gender", authMiddleWare, authController.updateMyGender);

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);

router.get("/users", authMiddleWare, adminOnly, authController.getAllUsers);
router.put("/users/:id/role", authMiddleWare, superAdminOnly, authController.updateUserRole);

// Legacy route kept for backwards-compatibility during transition
router.post("/google", authController.googleLogin);

// ─── Google OAuth ─────────────────────────────────────────────────────────────
// Step 1: redirect browser → Google consent screen
router.get(
  "/google",
  (req, res, next) => {
    if (!passport._strategies || !passport._strategies.google) {
      console.error("[Google OAuth] Error: Google OAuth is not configured on the backend server. Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in .env.");
      const clientUrl = process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',')[0].trim() : "http://localhost:5173";
      return res.redirect(`${clientUrl}/oauth/callback?error=google_auth_failed`);
    }
    passport.authenticate("google", { scope: ["profile", "email"], prompt: "select_account" })(req, res, next);
  }
);

// Step 2: Google redirects back here after user grants permission
router.get(
  "/google/callback",
  (req, res, next) => {
    passport.authenticate("google", { session: false }, (err, user, info) => {
      const getRedirectClientUrl = () => {
        let reqOrigin = req?.headers?.origin;
        if (!reqOrigin && req?.headers?.referer) {
          try { reqOrigin = new URL(req.headers.referer).origin; } catch (e) {}
        }
        if (reqOrigin && !reqOrigin.includes("localhost") && !reqOrigin.includes("127.0.0.1")) {
          return reqOrigin.replace(/\/$/, "");
        }
        if (process.env.CLIENT_URL) {
          const urls = process.env.CLIENT_URL.split(",").map(u => u.trim());
          const prodUrl = urls.find(u => u.startsWith("https://"));
          if (prodUrl) return prodUrl.replace(/\/$/, "");
          return urls[0].replace(/\/$/, "");
        }
        return "http://localhost:5173";
      };

      const clientUrl = getRedirectClientUrl();

      if (err) {
        console.error("[Google OAuth] Strategy error:", err.message || err);
        return res.redirect(`${clientUrl}/oauth/callback?error=google_auth_failed`);
      }
      if (!user) {
        console.error("[Google OAuth] Authentication failed — no user returned.", info);
        return res.redirect(`${clientUrl}/oauth/callback?error=google_auth_failed`);
      }
      // Attach user to request so oauthCallback can access it
      req.user = user;
      return authController.oauthCallback(req, res, next);
    })(req, res, next);
  }
);



module.exports = router;
