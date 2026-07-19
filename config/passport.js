const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;

const { User } = require("../models/User");
const bcrypt = require("bcrypt");
const crypto = require("crypto");

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Find an existing user by OAuth provider ID or email,
 * or create a brand-new one.
 *
 * @param {object} opts
 * @param {string} opts.providerField  - "googleId" | "facebookId" | "appleId"
 * @param {string} opts.providerId     - The ID returned by the OAuth provider
 * @param {string} opts.email          - User email (may be undefined for Facebook)
 * @param {string} opts.name           - Display name
 * @param {string} [opts.avatar]       - Profile picture URL
 * @returns {Promise<import("../models/User").User>}
 */
async function findOrCreateOAuthUser({ providerField, providerId, email, name, avatar }) {
  // 1. Try to find by provider-specific ID first (most reliable)
  let user = await User.findOne({ [providerField]: providerId });
  if (user) return user;

  // 2. If we have an email, try to link to an existing account
  if (email) {
    user = await User.findOne({ email });
    if (user) {
      // Link this provider to the existing account
      user[providerField] = providerId;
      if (!user.avatar && avatar) user.avatar = avatar;
      await user.save();
      return user;
    }
  }

  // 3. Create a completely new user
  const generatedPassword = crypto.randomBytes(16).toString("hex");
  const hashedPassword = await bcrypt.hash(generatedPassword, 12);

  const newUser = await User.create({
    name: name || "User",
    email: email || `${providerId}@oauth.placeholder`, // fallback if email is missing (rare)
    password: hashedPassword,
    [providerField]: providerId,
    avatar: avatar || "",
  });

  return newUser;
}

// ─── Serialize / Deserialize ──────────────────────────────────────────────────
// We only use session briefly during the OAuth redirect round-trip,
// so we store only the MongoDB _id.

passport.serializeUser((user, done) => {
  done(null, user._id.toString());
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

// ─── Google Strategy ──────────────────────────────────────────────────────────

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email =
            profile.emails && profile.emails.length > 0
              ? profile.emails[0].value
              : undefined;

          const avatar =
            profile.photos && profile.photos.length > 0
              ? profile.photos[0].value
              : "";

          const name = profile.displayName || profile.name?.givenName || "Google User";

          const user = await findOrCreateOAuthUser({
            providerField: "googleId",
            providerId: profile.id,
            email,
            name,
            avatar,
          });

          return done(null, user);
        } catch (err) {
          return done(err, null);
        }
      }
    )
  );
} else {
  console.warn("[WARN] Google OAuth is not configured - set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env to enable it.");
}



module.exports = passport;

