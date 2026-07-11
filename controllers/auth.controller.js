const { User } = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const dotenv = require("dotenv");
const {
  registerSchema,
  loginSchema,
  forgotSchema,
  resetSchema,
  genderSchema,
} = require("../validators/auth.validator");
const { sendPasswordResetEmail } = require("../utils/mailer");

dotenv.config();

const generateToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

const buildUserPayload = (user) => ({
  _id: user._id,
  email: user.email,
  name: user.name,
  phone: user.phone || "",
  role: user.role,
  gender: user.gender || null,
  avatar: user.avatar || "",
  savedCards: user.savedCards || [],
});

async function register(request, response) {
  const { error, value } = registerSchema.validate(request.body, {
    abortEarly: false,
  });
  
  if (error) {
    return response
      .status(400)
      .json({ message: error.details.map((item) => item.message) });
  }
  
  try {
    const { email, password, name, phone } = value;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return response.status(400).json({ message: "Email Already used..." });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await User.create({ email, password: hashedPassword, name, phone });
    const token = generateToken(user);

    return response.status(201).json({
      message: "user created ..",
      data: {
        token,
        user: buildUserPayload(user),
      },
    });
  } catch (error) {
    console.log(error);
    return response.status(500).json({ message: "internal server error.." });
  }
}

async function validateMe(request, response) {
  try {
    const id = request.user.id;
    const user = await User.findById(id);
    if (!user) {
      return response.status(404).json({ message: "User not found" });
    }

    return response.json({
      message: "user logged in",
      isLoggedIn: true,
      data: {
        user: buildUserPayload(user),
      },
    });
  } catch (error) {
    console.log(error);
    return response.status(500).json({ message: "internal server error.." });
  }
}

async function login(request, response) {
  try {
    const { error } = loginSchema.validate(request.body);
    if (error) {
      return response.status(400).json({ message: error.message });
    }
    
    const { email, password } = request.body;
    const user = await User.findOne({ email });

    if (!user) {
      return response.status(400).json({ message: "Invalid Credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return response.status(400).json({ message: "Invalid Credentials" });
    }

    const token = generateToken(user);
    return response.json({
      message: "user logged in successfully ..",
      data: {
        token,
        user: buildUserPayload(user),
      },
    });
  } catch (error) {
    console.log(error);
    return response.status(500).json({ message: "internal server error.." });
  }
}

async function forgotPassword(request, response) {
  try {
    const { error } = forgotSchema.validate(request.body);
    if (error) {
      return response.status(400).json({ message: error.message });
    }
    
    const { email } = request.body;
    const user = await User.findOne({ email });
    if (!user) {
      // Security: return success message anyway to not reveal if email exists
      return response.json({ message: "If this email is registered, a reset link has been sent." });
    }

    const token = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour from now
    await user.save();

    const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${token}`;
    
    // IMPORTANT: Print the URL to the terminal so the user can click it locally!
    console.log("\n=======================================================");
    console.log("🔑 PASSWORD RESET LINK:");
    console.log(resetUrl);
    console.log("=======================================================\n");

    try {
      await sendPasswordResetEmail(email, resetUrl);
      return response.json({ message: "Reset link sent! Check your inbox (or terminal)." });
    } catch (mailError) {
      console.log("SMTP Error (ISP blocking port):", mailError.message);
      // Even if email fails, return success so they can use the terminal link
      return response.json({ message: "Email blocked by ISP. Please check your terminal for the reset link!" });
    }
  } catch (error) {
    console.log("forgotPassword error:", error);
    return response.status(500).json({ message: "Failed to send reset email. Please try again." });
  }
}

async function resetPassword(request, response) {
  try {
    const { error } = resetSchema.validate(request.body);
    if (error) {
      return response.status(400).json({ message: error.message });
    }

    const { newPassword, token } = request.body;

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }, // must not be expired
    });

    if (!user) {
      return response.status(400).json({ message: "Reset link is invalid or has expired. Please request a new one." });
    }

    user.password = await bcrypt.hash(newPassword, 12);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return response.json({ message: "Password updated successfully! You can now log in." });
  } catch (error) {
    console.log("resetPassword error:", error);
    return response.status(500).json({ message: "internal server error.." });
  }
}

async function getAllUsers(request, response) {
  try {
    const users = await User.find({}).select("-password -resetPasswordToken");
    return response.json({ message: "Users fetched successfully", data: users });
  } catch (error) {
    console.log(error);
    return response.status(500).json({ message: "internal server error.." });
  }
}

async function updateUserRole(request, response) {
  try {
    const { id } = request.params;
    const { role } = request.body;
    
    if (!["user", "admin"].includes(role)) {
      return response.status(400).json({ message: "Invalid role" });
    }

    const user = await User.findById(id);
    if (!user) {
      return response.status(404).json({ message: "User not found" });
    }

    user.role = role;
    await user.save();

    return response.json({ message: "Role updated successfully", data: { id: user._id, role: user.role } });
  } catch (error) {
    console.log(error);
    return response.status(500).json({ message: "internal server error.." });
  }
}

async function updateMyGender(request, response) {
  try {
    const { error, value } = genderSchema.validate(request.body);
    if (error) {
      return response.status(400).json({ message: error.message });
    }

    const id = request.user.id;
    const user = await User.findById(id);

    if (!user) {
      return response.status(404).json({ message: "User not found" });
    }

    user.gender = value.gender;
    await user.save();

    return response.json({
      message: "Gender updated successfully",
      data: {
        user: buildUserPayload(user),
      },
    });
  } catch (error) {
    console.log(error);
    return response.status(500).json({ message: "internal server error.." });
  }
}

async function googleLogin(request, response) {
  try {
    const { email, name } = request.body;
    
    let user = await User.findOne({ email });

    if (!user) {
      // Securely auto-generate a strong placeholder password for Google users
      const generatedPassword = crypto.randomBytes(16).toString("hex");
      const hashedPassword = await bcrypt.hash(generatedPassword, 12);
      
      user = await User.create({ email, password: hashedPassword, name });
    }

    const token = generateToken(user);

    return response.json({
      message: "Google login successfully processed",
      data: {
        token,
        user: buildUserPayload(user),
      },
    });
  } catch (error) {
    console.log(error);
    return response.status(500).json({ message: "internal server error.." });
  }
}

/**
 * OAuth callback — called by Passport after a successful Google/Facebook login.
 * Generates a JWT and redirects the browser to the frontend /oauth/callback
 * page with the token and encoded user payload in the query string.
 */
async function oauthCallback(request, response) {
  try {
    const user = request.user; // set by Passport
    if (!user) {
      const clientUrl = process.env.CLIENT_URL
        ? process.env.CLIENT_URL.split(",")[0].trim()
        : "http://localhost:5173";
      return response.redirect(`${clientUrl}/oauth/callback?error=authentication_failed`);
    }

    const token = generateToken(user);
    const userPayload = buildUserPayload(user);

    const clientUrl = process.env.CLIENT_URL
      ? process.env.CLIENT_URL.split(",")[0].trim()
      : "http://localhost:5173";

    const params = new URLSearchParams({
      token,
      user: JSON.stringify(userPayload),
    });

    return response.redirect(`${clientUrl}/oauth/callback?${params.toString()}`);
  } catch (err) {
    console.error("oauthCallback error:", err);
    const clientUrl = process.env.CLIENT_URL
      ? process.env.CLIENT_URL.split(",")[0].trim()
      : "http://localhost:5173";
    return response.redirect(`${clientUrl}/oauth/callback?error=server_error`);
  }
}

module.exports = {
  register,
  login,
  validateMe,
  forgotPassword,
  resetPassword,
  getAllUsers,
  updateUserRole,
  updateMyGender,
  googleLogin,
  oauthCallback,
};
