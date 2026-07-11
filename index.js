// ─── Load environment variables FIRST (before any import reads them) ─────────
const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const authRouter = require("./routes/auth.routes");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const session = require("express-session");
const passport = require("./config/passport"); // loads and configures all strategies

const { databaseConnection } = require("./db/db.config");

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',').map(url => url.trim())
  : ['http://localhost:5173'];

console.log(`CORS allowed origins: ${allowedOrigins.join(', ')}`);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`Blocked CORS request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Serve static upload files – with range-request support for large video streaming
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: '1d',
  acceptRanges: true,   // enables seek/scrub for large videos
  setHeaders: (res, filePath) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    if (/\.(mp4|mov|avi|webm|mkv|m4v|hevc)$/i.test(filePath)) {
      res.setHeader('Content-Type', 'video/mp4');
      res.setHeader('Cache-Control', 'public, max-age=86400');
    }
  }
}));

app.set("trust proxy", 1); // Trust first proxy (necessary for secure cookies behind a proxy/load balancer)

// ─── Session (required by Passport for the OAuth redirect round-trip) ─────────
app.use(
  session({
    secret: process.env.SESSION_SECRET || "fallback_session_secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      // Session only needed for the brief OAuth redirect round-trip
      maxAge: 10 * 60 * 1000, // 10 minutes
      secure: process.env.NODE_ENV === "production", // true in production (HTTPS), false in dev (localhost)
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax", // 'none' required for cross-origin cookies
    },
  })
);

// ─── Passport ──────────────────────────────────────────────────────────────────
app.use(passport.initialize());
app.use(passport.session());

// ─── Routes ───────────────────────────────────────────────────────────────────
// Auth router mounted at /api/auth so callbacks match the .env CALLBACK_URL values
app.use("/api/auth", authRouter);

const transactionRouter = require("./routes/transaction.routes");
app.use("/transactions", transactionRouter);

const portfolioRouter = require("./routes/portfolio.routes");
app.use("/api/portfolio", portfolioRouter);

const adminRouter = require("./routes/admin.routes");
app.use("/api/admin", adminRouter);

// ─── Start server only after DB connects ─────────────────────────────────────
(async () => {
  await databaseConnection();

  // Verify email service on startup
  const { transporter } = require('./utils/mailer');
  transporter.verify((error, success) => {
    if (error) {
      console.error('❌ Nodemailer SMTP connection FAILED:', error.message);
      console.error('   → Check SMTP_USER and SMTP_PASS in your .env file.');
    } else {
      console.log('✅ Nodemailer SMTP connection verified — ready to send emails.');
    }
  });

  const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });

  // Allow up to 30 minutes for large video uploads (3 GB at typical local speeds)
  const THIRTY_MINUTES = 30 * 60 * 1000;
  server.timeout = THIRTY_MINUTES;          // total request timeout
  server.headersTimeout = THIRTY_MINUTES;   // time to receive headers
  server.requestTimeout = THIRTY_MINUTES;   // time to receive the full request body
})();
