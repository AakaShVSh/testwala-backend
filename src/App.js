// const express = require("express");
// const cookieParser = require("cookie-parser");
// const cors = require("cors");
// const helmet = require("helmet");
// const mongoSanitize = require("express-mongo-sanitize");
// const xss = require("xss-clean");
// const hpp = require("hpp");
// const rateLimit = require("express-rate-limit");
// const mongoose = require("mongoose");
// const { lfiGuard, protoGuard } = require("./middlewares/security.middleware");
// const morgan = require("morgan");

// const app = express();

// /* ═══════════════════════════════════════════════════════════════════════════
//    1. TRUST PROXY
//    Required when running behind Render / Railway / Nginx so that
//    rate limiters see the real client IP (not the proxy IP).
// ═══════════════════════════════════════════════════════════════════════════ */
// app.set("trust proxy", 1);

// /* ═══════════════════════════════════════════════════════════════════════════
//    2. SECURITY HEADERS  (helmet)
//    Sets 15+ HTTP headers automatically:
//    - X-Frame-Options: DENY              → Clickjacking protection
//    - X-Content-Type-Options: nosniff   → MIME-type sniffing protection
//    - X-XSS-Protection: 1; mode=block   → Legacy XSS filter
//    - Strict-Transport-Security (HSTS)  → Forces HTTPS
//    - Content-Security-Policy           → Controls resource loading
//    - Referrer-Policy                   → Limits referrer leakage
//    - Permissions-Policy                → Restricts browser features
// ═══════════════════════════════════════════════════════════════════════════ */
// app.use(
//   helmet({
//     contentSecurityPolicy: {
//       directives: {
//         defaultSrc: ["'self'"],
//         scriptSrc: ["'self'"],
//         styleSrc: ["'self'", "'unsafe-inline'"],
//         imgSrc: ["'self'", "data:", "https:"],
//         connectSrc: ["'self'"],
//         fontSrc: ["'self'", "https:", "data:"],
//         objectSrc: ["'none'"],
//         frameAncestors: ["'none'"], // Clickjacking — stronger than X-Frame-Options
//         upgradeInsecureRequests: [],
//       },
//     },
//     crossOriginEmbedderPolicy: false, // Needed for some CDN assets
//     hsts: {
//       maxAge: 31536000, // 1 year
//       includeSubDomains: true,
//       preload: true,
//     },
//   }),
// );

// /* ═══════════════════════════════════════════════════════════════════════════
//    3. CORS
//    Only whitelisted origins can make credentialed requests.
//    Blocks all other origins including direct Postman-style curl from browsers.
// ═══════════════════════════════════════════════════════════════════════════ */
// const IS_PROD = process.env.NODE_ENV === "production";

// const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "")
//   .split(",")
//   .map((o) => o.trim())
//   .filter(Boolean)
//   .concat([
//     "http://localhost:3000",
//     "http://localhost:5173",
//     ...(IS_PROD ? ["https://revisionkarlo.in", "https://www.revisionkarlo.in"] : []),
//   ]);

// app.use(
//   cors({
//     origin(origin, cb) {
//       // Allow non-browser requests (mobile apps, server-to-server) in dev
//       if (!origin && !IS_PROD) return cb(null, true);
//       if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
//       cb(new Error(`CORS: origin ${origin} not allowed`));
//     },
//     credentials: true,
//     methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
//     allowedHeaders: ["Content-Type", "Authorization"],
//     exposedHeaders: ["RateLimit-Limit", "RateLimit-Remaining"],
//   }),
// );

// app.use(morgan());

// /* ═══════════════════════════════════════════════════════════════════════════
//    4. BODY PARSERS
//    Strict size limits prevent large payload DoS attacks.
//    10mb allows question images as base64 but blocks giant uploads.
// ═══════════════════════════════════════════════════════════════════════════ */
// app.use(express.json({ limit: "10mb" }));
// app.use(express.urlencoded({ extended: true, limit: "10mb" }));
// app.use(cookieParser());

// /* ═══════════════════════════════════════════════════════════════════════════
//    5. INPUT SANITIZATION
//    Three layers — each catches different attack vectors.
// ═══════════════════════════════════════════════════════════════════════════ */

// // NoSQL Injection — strips $ and . operators from req.body/query/params
// // Blocks: { "Email": { "$gt": "" } } style attacks
// app.use(mongoSanitize({ replaceWith: "_" }));

// // Stored XSS — strips all HTML tags and script content from string inputs
// // Blocks: <script>alert(1)</script> stored in DB and later rendered
// app.use(xss());

// // HTTP Parameter Pollution — removes duplicate query params
// // Blocks: ?sort=name&sort=password (HPP attack)
// app.use(
//   hpp({
//     whitelist: ["examType", "subject", "status", "sort", "page", "limit"],
//   }),
// );

// /* ═══════════════════════════════════════════════════════════════════════════
//    5b. LFI + PROTOTYPE POLLUTION GUARDS
//    Applied globally — blocks path traversal and __proto__ injection on all routes.
// ═══════════════════════════════════════════════════════════════════════════ */
// app.use(lfiGuard);
// app.use(protoGuard);

// /* ═══════════════════════════════════════════════════════════════════════════
//    6. RATE LIMITERS
//    Different windows for different risk levels.
// ═══════════════════════════════════════════════════════════════════════════ */

// // Auth routes — very tight (brute force + credential stuffing protection)
// const authLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 20,
//   standardHeaders: true,
//   legacyHeaders: false,
//   message: { message: "Too many attempts, please try again in 15 minutes" },
//   skipSuccessfulRequests: false,
// });

// // OTP verification — tightest (prevent OTP brute force: 6 digits = 1M combos)
// const otpLimiter = rateLimit({
//   windowMs: 10 * 60 * 1000, // 10 minutes (matches OTP expiry)
//   max: 5, // Only 5 attempts per window
//   message: { message: "Too many OTP attempts. Request a new OTP." },
// });

// // Test submission — prevents automated spam submissions
// const submitLimiter = rateLimit({
//   windowMs: 60 * 1000, // 1 minute
//   max: 10,
//   message: { message: "Too many submissions, slow down" },
// });

// // General API limiter
// const apiLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000,
//   max: 300,
//   standardHeaders: true,
//   legacyHeaders: false,
//   message: { message: "Too many requests, slow down" },
// });

// // Admin routes — separate generous limit (admin needs more)
// const adminLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000,
//   max: 500,
//   message: { message: "Admin rate limit reached" },
// });

// /* ═══════════════════════════════════════════════════════════════════════════
//    7. GLOBAL OBJECTID GUARD
//    Any /:id param that isn't a valid Mongo ObjectId returns 400 immediately.
//    Prevents CastError 500s that leak stack traces.
// ═══════════════════════════════════════════════════════════════════════════ */
// app.param("id", (req, res, next, id) => {
//   if (!mongoose.Types.ObjectId.isValid(id))
//     return res.status(400).json({ message: "Invalid ID format" });
//   next();
// });

// /* ═══════════════════════════════════════════════════════════════════════════
//    8. SECURITY MIDDLEWARE — request fingerprinting
//    Logs suspicious patterns without blocking (can promote to block later).
// ═══════════════════════════════════════════════════════════════════════════ */
// app.use((req, _res, next) => {
//   const ua = req.headers["user-agent"] || "";
//   const suspicious = [
//     "sqlmap",
//     "nikto",
//     "nmap",
//     "masscan",
//     "zgrab",
//     "curl/7",
//     "python-requests",
//     "../",
//     "..\\",
//     "<script",
//     "UNION SELECT",
//   ];
//   const isSuspicious = suspicious.some(
//     (s) =>
//       ua.toLowerCase().includes(s.toLowerCase()) ||
//       req.url.toLowerCase().includes(s.toLowerCase()),
//   );
//   if (isSuspicious) {
//     console.warn(
//       `[SECURITY] Suspicious request: ${req.method} ${req.url} UA:${ua} IP:${req.ip}`,
//     );
//   }
//   next();
// });

// /* ═══════════════════════════════════════════════════════════════════════════
//    9. HEALTH CHECK (no auth, no rate limit)
// ═══════════════════════════════════════════════════════════════════════════ */
// app.get("/health", (_req, res) => res.json({ ok: true, ts: Date.now() }));

// /* ═══════════════════════════════════════════════════════════════════════════
//    10. ROUTES — with targeted rate limiters
// ═══════════════════════════════════════════════════════════════════════════ */

// // Tight auth limiters first (must be before the route handlers)
// app.use("/auth/signin", authLimiter);
// app.use("/auth/signup", authLimiter);
// app.use("/auth/forgot-password", authLimiter);
// app.use("/auth/verify-otp", otpLimiter); // tightest — 5 per 10 min

// // Submit limiter
// app.use("/results/submit", submitLimiter);

// // Admin gets its own limiter
// app.use("/admin", adminLimiter);

// // General limiter on everything else
// app.use(apiLimiter);

// // Route handlers
// app.use("/auth", require("./controllers/auth.controller"));
// app.use("/admin", require("./controllers/admin.controller")); // before /coaching
// app.use("/coaching", require("./controllers/coaching.controller"));
// app.use("/tests", require("./controllers/test.controller"));
// app.use("/results", require("./controllers/result.controller"));
// app.use("/questions", require("./controllers/question.controller"));
// app.use("/test-requests", require("./controllers/testRequest.controller"));
// app.use("/notifications", require("./controllers/notification.controller"));

// /* ═══════════════════════════════════════════════════════════════════════════
//    11. 404
// ═══════════════════════════════════════════════════════════════════════════ */
// app.use((_req, res) => res.status(404).json({ message: "Route not found" }));

// /* ═══════════════════════════════════════════════════════════════════════════
//    12. GLOBAL ERROR HANDLER
//    Never leaks stack traces to client in production.
//    Handles Mongoose validation errors cleanly.
// ═══════════════════════════════════════════════════════════════════════════ */
// app.use((err, req, res, _next) => {
//   // Always log full error server-side
//   console.error(`[ERROR] ${req.method} ${req.url}`, err);

//   // Mongoose validation error → 400
//   if (err.name === "ValidationError") {
//     const messages = Object.values(err.errors).map((e) => e.message);
//     return res.status(400).json({ message: messages.join(", ") });
//   }

//   // Mongoose duplicate key → 409
//   if (err.code === 11000) {
//     const field = Object.keys(err.keyValue || {})[0] || "field";
//     return res.status(409).json({ message: `${field} already exists` });
//   }

//   // JWT errors → 401
//   if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
//     return res.status(401).json({ message: "Invalid or expired session" });
//   }

//   // CORS error → 403
//   if (err.message?.startsWith("CORS:")) {
//     return res.status(403).json({ message: "Not allowed by CORS" });
//   }

//   // In production: never send stack trace
//   const status = err.status || err.statusCode || 500;
//   return res.status(status).json({
//     message: IS_PROD ? "Something went wrong" : err.message || "Server error",
//     // Stack only in development
//     ...(IS_PROD ? {} : { stack: err.stack }),
//   });
// });

// module.exports = app;








/**
 * src/App.js
 *
 * Changes from original:
 *  - Rate limiters now use RedisStore (via rate-limit-redis) when
 *    Redis is available. Each limiter gets its own store instance with a
 *    unique prefix (required by express-rate-limit).
 *  - Redis client is imported from configs/redis.
 *  - Everything else is identical.
 */

const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const hpp = require("hpp");
const rateLimit = require("express-rate-limit");
const mongoose = require("mongoose");
const { lfiGuard, protoGuard } = require("./middlewares/security.middleware");
const morgan = require("morgan");

const app = express();

/* ── Redis client + RedisStore (optional) ────────────────────────────────── */
// redisClient is kept in scope so each limiterBase() call can create its own
// RedisStore instance with a unique prefix — express-rate-limit requires this.
let redisClient = null;
let RedisStore = null;

try {
  if (process.env.REDIS_URL) {
    RedisStore = require("rate-limit-redis").RedisStore;
    const redisConfig = require("./configs/redis");
    redisClient = redisConfig.getClient();
    if (redisClient) {
      console.log("[RateLimit] Using Redis store ✅");
    }
  }
} catch (e) {
  console.warn(
    "[RateLimit] rate-limit-redis not available — using memory store.",
    e.message,
  );
}

/**
 * Creates a rate limiter. Each call produces a fresh RedisStore instance
 * (with a unique prefix) so express-rate-limit doesn't throw ERR_ERL_STORE_REUSE.
 */
function limiterBase(opts) {
  const { keyPrefix, ...rlOpts } = opts;
  return rateLimit({
    standardHeaders: true,
    legacyHeaders: false,
    ...(redisClient && RedisStore
      ? {
          store: new RedisStore({
            sendCommand: (...args) => redisClient.call(...args),
            prefix: `rl:${keyPrefix}:`,
          }),
        }
      : {}),
    ...rlOpts,
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   1. TRUST PROXY
═══════════════════════════════════════════════════════════════════════════ */
app.set("trust proxy", 1);

/* ═══════════════════════════════════════════════════════════════════════════
   2. SECURITY HEADERS
═══════════════════════════════════════════════════════════════════════════ */
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'", "https:", "data:"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginEmbedderPolicy: false,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  }),
);

/* ═══════════════════════════════════════════════════════════════════════════
   3. CORS
═══════════════════════════════════════════════════════════════════════════ */
const IS_PROD = process.env.NODE_ENV === "production";

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean)
  .concat([
    "http://localhost:3000",
    "http://localhost:5173",
    ...(IS_PROD
      ? ["https://revisionkarlo.in", "https://www.revisionkarlo.in"]
      : []),
  ]);

app.use(
  cors({
    origin(origin, cb) {
      if (!origin && !IS_PROD) return cb(null, true);
      if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
      cb(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["RateLimit-Limit", "RateLimit-Remaining", "X-Cache"],
  }),
);

// app.use(morgan("dev"));
app.use(morgan("combined"));

/* ═══════════════════════════════════════════════════════════════════════════
   4. BODY PARSERS
═══════════════════════════════════════════════════════════════════════════ */
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

/* ═══════════════════════════════════════════════════════════════════════════
   5. INPUT SANITIZATION
═══════════════════════════════════════════════════════════════════════════ */
app.use(mongoSanitize({ replaceWith: "_" }));
app.use(xss());
app.use(
  hpp({
    whitelist: ["examType", "subject", "status", "sort", "page", "limit"],
  }),
);

/* ── LFI + Prototype Pollution guards ───────────────────────────────────── */
app.use(lfiGuard);
app.use(protoGuard);

/* ═══════════════════════════════════════════════════════════════════════════
   6. RATE LIMITERS
   Each limiter gets its own RedisStore instance with a unique prefix.
   express-rate-limit throws ERR_ERL_STORE_REUSE if the same store instance
   is shared — so limiterBase() creates a fresh one per limiter.
═══════════════════════════════════════════════════════════════════════════ */

// Auth routes — tight (brute force + credential stuffing)
const authLimiter = limiterBase({
  keyPrefix: "auth",
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: "Too many attempts, please try again in 15 minutes" },
  skipSuccessfulRequests: false,
});

// OTP — tightest (6 digits = 1M combos, only 5 attempts allowed)
const otpLimiter = limiterBase({
  keyPrefix: "otp",
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: { message: "Too many OTP attempts. Request a new OTP." },
});

// Test submission — prevents automated spam submissions
const submitLimiter = limiterBase({
  keyPrefix: "submit",
  windowMs: 60 * 1000,
  max: 10,
  message: { message: "Too many submissions, slow down" },
});

// General API
const apiLimiter = limiterBase({
  keyPrefix: "api",
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { message: "Too many requests, slow down" },
});

// Admin — generous separate limit
const adminLimiter = limiterBase({
  keyPrefix: "admin",
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { message: "Admin rate limit reached" },
});

/* ═══════════════════════════════════════════════════════════════════════════
   7. GLOBAL OBJECTID GUARD
═══════════════════════════════════════════════════════════════════════════ */
app.param("id", (req, res, next, id) => {
  if (!mongoose.Types.ObjectId.isValid(id))
    return res.status(400).json({ message: "Invalid ID format" });
  next();
});

/* ═══════════════════════════════════════════════════════════════════════════
   8. REQUEST FINGERPRINTING
═══════════════════════════════════════════════════════════════════════════ */
app.use((req, _res, next) => {
  const ua = req.headers["user-agent"] || "";
  const suspicious = [
    "sqlmap",
    "nikto",
    "nmap",
    "masscan",
    "zgrab",
    "curl/7",
    "python-requests",
    "../",
    "..\\ ",
    "<script",
    "UNION SELECT",
  ];
  const isSuspicious = suspicious.some(
    (s) =>
      ua.toLowerCase().includes(s.toLowerCase()) ||
      req.url.toLowerCase().includes(s.toLowerCase()),
  );
  if (isSuspicious) {
    console.warn(
      `[SECURITY] Suspicious request: ${req.method} ${req.url} UA:${ua} IP:${req.ip}`,
    );
  }
  next();
});

/* ═══════════════════════════════════════════════════════════════════════════
   9. HEALTH CHECK
═══════════════════════════════════════════════════════════════════════════ */
app.get("/health", (_req, res) => {
  const { isConnected } = require("./configs/redis");
  res.json({ ok: true, ts: Date.now(), redis: isConnected() });
});

/* ═══════════════════════════════════════════════════════════════════════════
   10. ROUTES — with targeted rate limiters
═══════════════════════════════════════════════════════════════════════════ */

// Tight auth limiters first
app.use("/auth/signin", authLimiter);
app.use("/auth/signup", authLimiter);
app.use("/auth/forgot-password", authLimiter);
app.use("/auth/verify-otp", otpLimiter);

// Submit limiter
app.use("/results/submit", submitLimiter);

// Admin limiter
app.use("/admin", adminLimiter);

// General limiter on everything else
app.use(apiLimiter);

// Route handlers
app.use("/auth", require("./controllers/auth.controller"));
app.use("/admin", require("./controllers/admin.controller"));
app.use("/coaching", require("./controllers/coaching.controller"));
app.use("/tests", require("./controllers/test.controller"));
app.use("/results", require("./controllers/result.controller"));
app.use("/questions", require("./controllers/question.controller"));
app.use("/test-requests", require("./controllers/testRequest.controller"));
app.use("/notifications", require("./controllers/notification.controller"));

/* ═══════════════════════════════════════════════════════════════════════════
   11. 404
═══════════════════════════════════════════════════════════════════════════ */
app.use((_req, res) => res.status(404).json({ message: "Route not found" }));

/* ═══════════════════════════════════════════════════════════════════════════
   12. GLOBAL ERROR HANDLER
═══════════════════════════════════════════════════════════════════════════ */
app.use((err, req, res, _next) => {
  console.error(`[ERROR] ${req.method} ${req.url}`, err);

  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ message: messages.join(", ") });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "field";
    return res.status(409).json({ message: `${field} already exists` });
  }

  if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
    return res.status(401).json({ message: "Invalid or expired session" });
  }

  if (err.message?.startsWith("CORS:")) {
    return res.status(403).json({ message: "Not allowed by CORS" });
  }

  const status = err.status || err.statusCode || 500;
  return res.status(status).json({
    message: IS_PROD ? "Something went wrong" : err.message || "Server error",
    ...(IS_PROD ? {} : { stack: err.stack }),
  });
});

module.exports = app;