

// const express = require("express");
// const jwt = require("jsonwebtoken");
// const bcrypt = require("bcrypt");
// const User = require("../models/User.model");
// const { requireAuth } = require("../middlewares/auth.middleware");

// const router = express.Router();
// const JWT_SECRET =
//   process.env.JWT_SECRET || "revisionkarlo_dev_secret_key_32chars";
// const IS_PROD = process.env.NODE_ENV === "production";

// const COOKIE_OPTS = {
//   httpOnly: true,
//   secure: IS_PROD,
//   sameSite: IS_PROD ? "none" : "lax",
//   maxAge: 7 * 24 * 60 * 60 * 1000,
//   path: "/",
// };

// const signToken = (id) =>
//   jwt.sign({ _id: id }, JWT_SECRET, { expiresIn: "7d" });

// const safeUser = (u) => ({
//   _id: u._id,
//   Name: u.Name,
//   Email: u.Email,
//   Phone: u.Phone,
//   isAdmin: u.isAdmin,
//   coachingId: u.coachingId,
//   lastLogin: u.lastLogin,
//   lastSeen: u.lastSeen,
//   daysSinceLogin: u.lastLogin
//     ? Math.floor((Date.now() - new Date(u.lastLogin).getTime()) / 86400000)
//     : null,
// });

// /* ── GET /auth/me ─────────────────────────────────────────────────────────
//    Also updates lastSeen so admin can see "online" status.
// ──────────────────────────────────────────────────────────────────────────── */
// router.get("/me", requireAuth, async (req, res) => {
//   // Fire-and-forget: update lastSeen + mark online
//   User.findByIdAndUpdate(req.user._id, {
//     lastSeen: new Date(),
//     isOnline: true,
//   })
//     .exec()
//     .catch(() => {});

//   res.json({ status: 200, data: safeUser(req.user) });
// });

// /* ── POST /auth/signup ───────────────────────────────────────────────────── */
// router.post("/signup", async (req, res, next) => {
//   try {
//     const { Email, Password, Name, Phone } = req.body;
//     if (!Email || !Password)
//       return res
//         .status(400)
//         .json({ message: "Email and Password are required" });

//     // Type guard — must be plain strings
//     if (typeof Email !== "string" || typeof Password !== "string")
//       return res.status(400).json({ message: "Invalid credentials format" });

//     const exists = await User.findOne({
//       Email: Email.toLowerCase().trim(),
//     }).lean();
//     if (exists)
//       return res.status(409).json({ message: "Email already registered" });

//     const user = await User.create({
//       Email,
//       Password,
//       Name,
//       Phone,
//       lastLogin: new Date(),
//       lastSeen: new Date(),
//       isOnline: true,
//     });

//     res.cookie("_user", signToken(user._id), COOKIE_OPTS);
//     return res
//       .status(201)
//       .json({ message: "Registration successful", data: safeUser(user) });
//   } catch (err) {
//     next(err);
//   }
// });

// /* ── POST /auth/signin ───────────────────────────────────────────────────── */
// router.post("/signin", async (req, res, next) => {
//   try {
//     const { Email, Password } = req.body;
//     if (!Email || !Password)
//       return res
//         .status(400)
//         .json({ message: "Email and Password are required" });

//     // Type guard — Password must be a plain string
//     // Blocks NoSQL injection: { "Password": { "$gt": "" } }
//     if (typeof Email !== "string" || typeof Password !== "string")
//       return res.status(400).json({ message: "Invalid credentials format" });

//     const user = await User.findOne({ Email: Email.toLowerCase().trim() });
//     if (!user) return res.status(401).json({ message: "Email not registered" });

//     const match = user.checkPassword(Password);
//     if (!match) return res.status(401).json({ message: "Wrong password" });

//     user.lastLogin = new Date();
//     user.lastSeen = new Date();
//     user.isOnline = true;
//     await user.save({ validateBeforeSave: false });

//     res.cookie("_user", signToken(user._id), COOKIE_OPTS);
//     return res.json({ message: "Login successful", data: safeUser(user) });
//   } catch (err) {
//     next(err);
//   }
// });

// /* ── POST /auth/signout ──────────────────────────────────────────────────── */
// router.post("/signout", requireAuth, async (req, res) => {
//   // Mark offline
//   User.findByIdAndUpdate(req.user._id, {
//     isOnline: false,
//     lastSeen: new Date(),
//   })
//     .exec()
//     .catch(() => {});

//   res.clearCookie("_user", {
//     httpOnly: true,
//     secure: IS_PROD,
//     sameSite: IS_PROD ? "none" : "lax",
//     path: "/",
//   });
//   res.json({ message: "Signed out" });
// });

// /* ── Resend client (lazy-init so server starts even without the env var) ── */
// let _resend = null;
// function getResend() {
//   if (!_resend) {
//     const { Resend } = require("resend");
//     _resend = new Resend(process.env.RESEND_API_KEY);
//   }
//   return _resend;
// }

// /* ── POST /auth/forgot-password ──────────────────────────────────────────── */
// router.post("/forgot-password", async (req, res, next) => {
//   try {
//     const { Email } = req.body;
//     if (!Email) return res.status(400).json({ message: "Email is required" });

//     const user = await User.findOne({
//       Email: Email.toLowerCase().trim(),
//     });
//     if (!user) return res.status(404).json({ message: "Email not registered" });

//     const otp = Math.floor(100000 + Math.random() * 900000);
//     const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

//     // Store hashed OTP — raw value never leaves the server
//     const bcrypt = require("bcrypt");
//     user.passwordResetOtp = await bcrypt.hash(String(otp), 10);
//     user.passwordResetExpiry = otpExpiry;
//     await user.save({ validateBeforeSave: false });

//     // ── Send OTP via Resend ──────────────────────────────────────────────
//     if (process.env.RESEND_API_KEY) {
//       try {
//         await getResend().emails.send({
//           from:
//             process.env.RESEND_FROM_EMAIL || "Revision Karlo <noreply@revisionkarlo.in>",
//           to: Email,
//           subject: "Revision Karlo — Aapka Password Reset OTP",
//           html: `
// <!DOCTYPE html>
// <html>
// <head>
//   <meta charset="utf-8">
//   <meta name="viewport" content="width=device-width,initial-scale=1">
// </head>
// <body style="margin:0;padding:0;background:#f8fafc;font-family:'Segoe UI',sans-serif;">
//   <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 16px;">
//     <tr><td align="center">
//       <table width="100%" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 4px 24px rgba(15,30,58,0.08);">

//         <!-- Header -->
//         <tr>
//           <td style="background:linear-gradient(135deg,#0f1e3a,#2d5fa8);padding:28px 32px 24px;">
//             <p style="margin:0 0 16px;font-size:14px;font-weight:800;color:#fff;letter-spacing:-0.2px;">
//              Revision Karlo
//             </p>
//             <h1 style="margin:0 0 4px;font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.5px;">
//               Password Reset OTP
//             </h1>
//             <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.55);">
//               Aapne password reset request kiya hai
//             </p>
//           </td>
//         </tr>

//         <!-- Body -->
//         <tr>
//           <td style="padding:32px;">
//             <p style="margin:0 0 24px;font-size:14px;color:#374151;line-height:1.6;">
//               Namaste <strong>${user.Name || "User"}</strong>,<br>
//               Neeche diya gaya OTP use karke apna password reset karein.
//             </p>

//             <!-- OTP box -->
//             <div style="background:#f1f5f9;border:2px dashed #cbd5e1;border-radius:12px;padding:20px;text-align:center;margin:0 0 24px;">
//               <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:1px;">
//                 Your OTP
//               </p>
//               <p style="margin:0;font-size:40px;font-weight:900;color:#0f1e3a;letter-spacing:12px;font-family:monospace;">
//                 ${otp}
//               </p>
//             </div>

//             <!-- Expiry warning -->
//             <div style="background:#fef9c3;border:1px solid #fde68a;border-radius:8px;padding:12px 16px;margin:0 0 24px;display:flex;align-items:center;gap:8px;">
//               <p style="margin:0;font-size:13px;color:#92400e;font-weight:500;">
//                 ⏱ Yeh OTP sirf <strong>10 minutes</strong> ke liye valid hai.
//               </p>
//             </div>

//             <p style="margin:0 0 8px;font-size:13px;color:#94a3b8;line-height:1.6;">
//               Agar aapne yeh request nahi kiya, toh is email ko ignore karein. Aapka account safe hai.
//             </p>
//           </td>
//         </tr>

//         <!-- Footer -->
//         <tr>
//           <td style="padding:16px 32px 24px;border-top:1px solid #f1f5f9;">
//             <p style="margin:0;font-size:12px;color:#cbd5e1;text-align:center;">
//               © 2025 Revision Karlo · Yeh ek automated email hai, reply mat karein.
//             </p>
//           </td>
//         </tr>

//       </table>
//     </td></tr>
//   </table>
// </body>
// </html>`,
//         });
//       } catch (emailErr) {
//         // Email failed — log but don't expose to client. OTP is still valid in DB.
//         console.error("[Resend] Email send failed:", emailErr.message);
//         // In dev: fall through and log OTP to console so testing isn't blocked
//         if (process.env.NODE_ENV !== "production") {
//           console.log(`[DEV FALLBACK] OTP for ${Email}: ${otp}`);
//         }
//       }
//     } else {
//       // No RESEND_API_KEY set — dev mode, log to console only
//       console.log(`[DEV] RESEND_API_KEY not set. OTP for ${Email}: ${otp}`);
//     }

//     return res.json({
//       message: "OTP sent to your registered email",
//       userId: user._id,
//     });
//   } catch (err) {
//     next(err);
//   }
// });

// /* ── POST /auth/verify-otp ────────────────────────────────────────────────
//    Verifies the OTP the user received. Returns a short-lived reset token
//    (stored in a cookie) so /change-password can be called without exposing
//    the userId in the URL.
// ──────────────────────────────────────────────────────────────────────────── */
// router.post("/verify-otp", async (req, res, next) => {
//   try {
//     const { userId, otp } = req.body;
//     if (!userId || !otp)
//       return res.status(400).json({ message: "userId and otp are required" });

//     const user = await User.findById(userId);
//     if (!user) return res.status(404).json({ message: "User not found" });

//     if (!user.passwordResetOtp || !user.passwordResetExpiry)
//       return res.status(400).json({ message: "No OTP requested" });

//     if (new Date() > user.passwordResetExpiry)
//       return res.status(400).json({ message: "OTP has expired" });

//     const isMatch = await bcrypt.compare(String(otp), user.passwordResetOtp);
//     if (!isMatch) return res.status(400).json({ message: "Invalid OTP" });

//     // OTP valid — issue a short-lived reset token (5 min), clear stored OTP
//     const resetToken = jwt.sign(
//       { _id: user._id, purpose: "reset" },
//       JWT_SECRET,
//       {
//         expiresIn: "5m",
//       },
//     );

//     user.passwordResetOtp = null;
//     user.passwordResetExpiry = null;
//     await user.save({ validateBeforeSave: false });

//     res.cookie("_reset", resetToken, {
//       httpOnly: true,
//       secure: IS_PROD,
//       sameSite: IS_PROD ? "none" : "lax",
//       maxAge: 5 * 60 * 1000,
//       path: "/",
//     });

//     return res.json({ message: "OTP verified" });
//   } catch (err) {
//     next(err);
//   }
// });

// /* ── PATCH /auth/change-password ─────────────────────────────────────────────
//    Replaces the old /:id version. Requires the _reset cookie set by
//    /verify-otp — no userId exposed in the URL.
// ──────────────────────────────────────────────────────────────────────────── */
// router.patch("/change-password", async (req, res, next) => {
//   try {
//     const resetToken = req.cookies?._reset;
//     if (!resetToken)
//       return res
//         .status(401)
//         .json({ message: "OTP verification required first" });

//     let decoded;
//     try {
//       decoded = jwt.verify(resetToken, JWT_SECRET);
//     } catch {
//       return res
//         .status(401)
//         .json({ message: "Reset session expired, request a new OTP" });
//     }

//     if (decoded.purpose !== "reset")
//       return res.status(401).json({ message: "Invalid reset token" });

//     const { Password } = req.body;
//     if (!Password || Password.length < 8)
//       return res
//         .status(400)
//         .json({ message: "Password must be at least 8 characters" });

//     const hash = await bcrypt.hash(Password, 12);
//     await User.findByIdAndUpdate(decoded._id, { Password: hash });

//     res.clearCookie("_reset", {
//       httpOnly: true,
//       secure: IS_PROD,
//       sameSite: IS_PROD ? "none" : "lax",
//       path: "/",
//     });

//     return res.json({ message: "Password updated successfully" });
//   } catch (err) {
//     next(err);
//   }
// });

// /* ── PATCH /auth/profile ─────────────────────────────────────────────────── */
// router.patch("/profile", requireAuth, async (req, res, next) => {
//   try {
//     const allowed = ["Name", "Phone", "preferences"];
//     const update = {};
//     allowed.forEach((k) => {
//       if (req.body[k] !== undefined) update[k] = req.body[k];
//     });

//     const user = await User.findByIdAndUpdate(req.user._id, update, {
//       new: true,
//     }).lean();
//     return res.json({ message: "Profile updated", data: safeUser(user) });
//   } catch (err) {
//     next(err);
//   }
// });

// /* ── POST /auth/record-test-view ─────────────────────────────────────────────
//    Called by frontend when student first opens a test link.
//    Records auth state + days-since-login for admin visibility.
// ──────────────────────────────────────────────────────────────────────────── */
// router.post("/record-test-view", requireAuth, async (req, res, next) => {
//   try {
//     const { testId } = req.body;
//     if (!testId) return res.status(400).json({ message: "testId required" });

//     const user = await User.findById(req.user._id);
//     if (!user) return res.status(404).json({ message: "User not found" });

//     // Only record first view (avoid duplicates)
//     const alreadyViewed = user.testFirstViews.some(
//       (v) => v.testId.toString() === testId,
//     );
//     if (!alreadyViewed) {
//       const daysSinceLastLogin = user.lastLogin
//         ? Math.floor(
//             (Date.now() - new Date(user.lastLogin).getTime()) / 86400000,
//           )
//         : null;

//       user.testFirstViews.push({
//         testId,
//         viewedAt: new Date(),
//         wasLoggedIn: true,
//         daysSinceLastLogin,
//       });
//       await user.save({ validateBeforeSave: false });
//     }

//     return res.json({ message: "Recorded" });
//   } catch (err) {
//     next(err);
//   }
// });

// module.exports = router;








/**
 * src/controllers/auth.controller.js
 *
 * Changes from original:
 *  - forgot-password: OTP is stored in Redis (TTL = 10 min) instead of
 *    writing passwordResetOtp / passwordResetExpiry to MongoDB.
 *    Removes the need for those fields to ever touch the DB during a reset flow.
 *  - verify-otp: reads + deletes the OTP from Redis.
 *  - change-password: unchanged (still uses the _reset JWT cookie).
 *  - profile PATCH: calls invalidateUserCache so the next requireAuth
 *    re-fetches the updated document instead of serving stale cached data.
 *  - signout: invalidates the Redis user cache immediately.
 *
 * Everything else (signup, signin, /me, record-test-view) is identical
 * to the original — only the Redis integrations are new.
 */

const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const User = require("../models/User.model");
const { requireAuth } = require("../middlewares/auth.middleware");
const { invalidateUserCache } = require("../middlewares/auth.middleware");
const redis = require("../configs/redis");

const router = express.Router();
const JWT_SECRET =
  process.env.JWT_SECRET || "revisionkarlo_dev_secret_key_32chars";
const IS_PROD = process.env.NODE_ENV === "production";

const COOKIE_OPTS = {
  httpOnly: true,
  secure: IS_PROD,
  sameSite: IS_PROD ? "none" : "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/",
};

const signToken = (id) =>
  jwt.sign({ _id: id }, JWT_SECRET, { expiresIn: "7d" });

const safeUser = (u) => ({
  _id: u._id,
  Name: u.Name,
  Email: u.Email,
  Phone: u.Phone,
  isAdmin: u.isAdmin,
  coachingId: u.coachingId,
  lastLogin: u.lastLogin,
  lastSeen: u.lastSeen,
  daysSinceLogin: u.lastLogin
    ? Math.floor((Date.now() - new Date(u.lastLogin).getTime()) / 86400000)
    : null,
});

/* ── OTP Redis helpers ───────────────────────────────────────────────────── */

const OTP_TTL = 10 * 60; // 10 minutes (matches email copy)
const otpKey = (userId) => `otp:reset:${userId}`;

/**
 * Store a hashed OTP in Redis.
 * Key: "otp:reset:<userId>"  TTL: 10 min
 * We store the bcrypt hash — the raw OTP only ever exists in memory and email.
 */
async function storeOtp(userId, plainOtp) {
  const hash = await bcrypt.hash(String(plainOtp), 10);
  await redis.set(otpKey(userId), hash, OTP_TTL);
}

/**
 * Verify an OTP: fetch hash from Redis, compare, then delete (one-time use).
 * Returns true on match, false on miss/expired/mismatch.
 */
async function verifyAndConsumeOtp(userId, plainOtp) {
  const hash = await redis.get(otpKey(userId));
  if (!hash) return false; // expired or never set

  const isMatch = await bcrypt.compare(String(plainOtp), hash);
  if (isMatch) {
    // Consume immediately — prevents replay attacks
    await redis.del(otpKey(userId));
  }
  return isMatch;
}

/* ── Resend email client (lazy-init) ─────────────────────────────────────── */
let _resend = null;
function getResend() {
  if (!_resend) {
    const { Resend } = require("resend");
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

/* ── GET /auth/me ─────────────────────────────────────────────────────────
   Also updates lastSeen so admin can see "online" status.
──────────────────────────────────────────────────────────────────────────── */
router.get("/me", requireAuth, async (req, res) => {
  // Fire-and-forget: update lastSeen + mark online
  User.findByIdAndUpdate(req.user._id, {
    lastSeen: new Date(),
    isOnline: true,
  })
    .exec()
    .catch(() => {});

  res.json({ status: 200, data: safeUser(req.user) });
});

/* ── POST /auth/signup ───────────────────────────────────────────────────── */
router.post("/signup", async (req, res, next) => {
  try {
    const { Email, Password, Name, Phone } = req.body;
    if (!Email || !Password)
      return res
        .status(400)
        .json({ message: "Email and Password are required" });

    if (typeof Email !== "string" || typeof Password !== "string")
      return res.status(400).json({ message: "Invalid credentials format" });

    const exists = await User.findOne({
      Email: Email.toLowerCase().trim(),
    }).lean();
    if (exists)
      return res.status(409).json({ message: "Email already registered" });

    const user = await User.create({
      Email,
      Password,
      Name,
      Phone,
      lastLogin: new Date(),
      lastSeen: new Date(),
      isOnline: true,
    });

    res.cookie("_user", signToken(user._id), COOKIE_OPTS);
    return res
      .status(201)
      .json({ message: "Registration successful", data: safeUser(user) });
  } catch (err) {
    next(err);
  }
});

/* ── POST /auth/signin ───────────────────────────────────────────────────── */
router.post("/signin", async (req, res, next) => {
  try {
    const { Email, Password } = req.body;
    if (!Email || !Password)
      return res
        .status(400)
        .json({ message: "Email and Password are required" });

    if (typeof Email !== "string" || typeof Password !== "string")
      return res.status(400).json({ message: "Invalid credentials format" });

    const user = await User.findOne({ Email: Email.toLowerCase().trim() });
    if (!user) return res.status(401).json({ message: "Email not registered" });

    const match = user.checkPassword(Password);
    if (!match) return res.status(401).json({ message: "Wrong password" });

    user.lastLogin = new Date();
    user.lastSeen = new Date();
    user.isOnline = true;
    await user.save({ validateBeforeSave: false });

    // Bust cache — signin updates lastLogin/lastSeen
    await invalidateUserCache(user._id);

    res.cookie("_user", signToken(user._id), COOKIE_OPTS);
    return res.json({ message: "Login successful", data: safeUser(user) });
  } catch (err) {
    next(err);
  }
});

/* ── POST /auth/signout ──────────────────────────────────────────────────── */
router.post("/signout", requireAuth, async (req, res) => {
  // Invalidate cache immediately so stale isOnline:true is never served
  await invalidateUserCache(req.user._id).catch(() => {});

  User.findByIdAndUpdate(req.user._id, {
    isOnline: false,
    lastSeen: new Date(),
  })
    .exec()
    .catch(() => {});

  res.clearCookie("_user", {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: IS_PROD ? "none" : "lax",
    path: "/",
  });
  res.json({ message: "Signed out" });
});

/* ── POST /auth/forgot-password ──────────────────────────────────────────────
   OTP is now stored in Redis (TTL = 10 min) — NOT written to MongoDB.
   This avoids unnecessary DB writes and keeps the User document clean.
──────────────────────────────────────────────────────────────────────────── */
router.post("/forgot-password", async (req, res, next) => {
  try {
    const { Email } = req.body;
    if (!Email) return res.status(400).json({ message: "Email is required" });

    const user = await User.findOne({
      Email: Email.toLowerCase().trim(),
    }).lean();

    if (!user) return res.status(404).json({ message: "Email not registered" });

    const otp = Math.floor(100000 + Math.random() * 900000);

    // Store hashed OTP in Redis — expires automatically after OTP_TTL seconds
    await storeOtp(user._id, otp);

    // ── Send OTP via Resend ──────────────────────────────────────────────
    if (process.env.RESEND_API_KEY) {
      try {
        await getResend().emails.send({
          from:
            process.env.RESEND_FROM_EMAIL ||
            "Revision Karlo <noreply@revisionkarlo.in>",
          to: Email,
          subject: "Revision Karlo — Aapka Password Reset OTP",
          html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 4px 24px rgba(15,30,58,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#0f1e3a,#2d5fa8);padding:28px 32px 24px;">
            <p style="margin:0 0 16px;font-size:14px;font-weight:800;color:#fff;letter-spacing:-0.2px;">
             Revision Karlo
            </p>
            <h1 style="margin:0 0 4px;font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.5px;">
              Password Reset OTP
            </h1>
            <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.55);">
              Aapne password reset request kiya hai
            </p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 24px;font-size:14px;color:#374151;line-height:1.6;">
              Namaste <strong>${user.Name || "User"}</strong>,<br>
              Neeche diya gaya OTP use karke apna password reset karein.
            </p>

            <!-- OTP box -->
            <div style="background:#f1f5f9;border:2px dashed #cbd5e1;border-radius:12px;padding:20px;text-align:center;margin:0 0 24px;">
              <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:1px;">
                Your OTP
              </p>
              <p style="margin:0;font-size:40px;font-weight:900;color:#0f1e3a;letter-spacing:12px;font-family:monospace;">
                ${otp}
              </p>
            </div>

            <!-- Expiry warning -->
            <div style="background:#fef9c3;border:1px solid #fde68a;border-radius:8px;padding:12px 16px;margin:0 0 24px;">
              <p style="margin:0;font-size:13px;color:#92400e;font-weight:500;">
                ⏱ Yeh OTP sirf <strong>10 minutes</strong> ke liye valid hai.
              </p>
            </div>

            <p style="margin:0 0 8px;font-size:13px;color:#94a3b8;line-height:1.6;">
              Agar aapne yeh request nahi kiya, toh is email ko ignore karein. Aapka account safe hai.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:16px 32px 24px;border-top:1px solid #f1f5f9;">
            <p style="margin:0;font-size:12px;color:#cbd5e1;text-align:center;">
              © 2025 Revision Karlo · Yeh ek automated email hai, reply mat karein.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
        });
      } catch (emailErr) {
        console.error("[Resend] Email send failed:", emailErr.message);
        if (process.env.NODE_ENV !== "production") {
          console.log(`[DEV FALLBACK] OTP for ${Email}: ${otp}`);
        }
      }
    } else {
      console.log(`[DEV] RESEND_API_KEY not set. OTP for ${Email}: ${otp}`);
    }

    return res.json({
      message: "OTP sent to your registered email",
      userId: user._id,
    });
  } catch (err) {
    next(err);
  }
});

/* ── POST /auth/verify-otp ────────────────────────────────────────────────
   Reads OTP from Redis and consumes it (one-time use).
   No longer touches MongoDB at all.
──────────────────────────────────────────────────────────────────────────── */
router.post("/verify-otp", async (req, res, next) => {
  try {
    const { userId, otp } = req.body;
    if (!userId || !otp)
      return res.status(400).json({ message: "userId and otp are required" });

    // Redis handles expiry — if key is gone, OTP has expired
    const isMatch = await verifyAndConsumeOtp(userId, otp);
    if (!isMatch)
      return res
        .status(400)
        .json({ message: "Invalid or expired OTP" });

    // Issue a short-lived reset token (5 min) in a cookie
    const resetToken = jwt.sign(
      { _id: userId, purpose: "reset" },
      JWT_SECRET,
      { expiresIn: "5m" },
    );

    res.cookie("_reset", resetToken, {
      httpOnly: true,
      secure: IS_PROD,
      sameSite: IS_PROD ? "none" : "lax",
      maxAge: 5 * 60 * 1000,
      path: "/",
    });

    return res.json({ message: "OTP verified" });
  } catch (err) {
    next(err);
  }
});

/* ── PATCH /auth/change-password ─────────────────────────────────────────── */
router.patch("/change-password", async (req, res, next) => {
  try {
    const resetToken = req.cookies?._reset;
    if (!resetToken)
      return res
        .status(401)
        .json({ message: "OTP verification required first" });

    let decoded;
    try {
      decoded = jwt.verify(resetToken, JWT_SECRET);
    } catch {
      return res
        .status(401)
        .json({ message: "Reset session expired, request a new OTP" });
    }

    if (decoded.purpose !== "reset")
      return res.status(401).json({ message: "Invalid reset token" });

    const { Password } = req.body;
    if (!Password || Password.length < 8)
      return res
        .status(400)
        .json({ message: "Password must be at least 8 characters" });

    const hash = await bcrypt.hash(Password, 12);
    await User.findByIdAndUpdate(decoded._id, { Password: hash });

    // Invalidate user cache — password changed, force fresh DB read on next auth
    await invalidateUserCache(decoded._id).catch(() => {});

    res.clearCookie("_reset", {
      httpOnly: true,
      secure: IS_PROD,
      sameSite: IS_PROD ? "none" : "lax",
      path: "/",
    });

    return res.json({ message: "Password updated successfully" });
  } catch (err) {
    next(err);
  }
});

/* ── PATCH /auth/profile ─────────────────────────────────────────────────── */
router.patch("/profile", requireAuth, async (req, res, next) => {
  try {
    const allowed = ["Name", "Phone", "preferences"];
    const update = {};
    allowed.forEach((k) => {
      if (req.body[k] !== undefined) update[k] = req.body[k];
    });

    const user = await User.findByIdAndUpdate(req.user._id, update, {
      new: true,
    }).lean();

    // Bust cache so next requireAuth serves updated data
    await invalidateUserCache(req.user._id).catch(() => {});

    return res.json({ message: "Profile updated", data: safeUser(user) });
  } catch (err) {
    next(err);
  }
});

/* ── POST /auth/record-test-view ─────────────────────────────────────────── */
router.post("/record-test-view", requireAuth, async (req, res, next) => {
  try {
    const { testId } = req.body;
    if (!testId) return res.status(400).json({ message: "testId required" });

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const alreadyViewed = user.testFirstViews.some(
      (v) => v.testId.toString() === testId,
    );
    if (!alreadyViewed) {
      const daysSinceLastLogin = user.lastLogin
        ? Math.floor(
            (Date.now() - new Date(user.lastLogin).getTime()) / 86400000,
          )
        : null;

      user.testFirstViews.push({
        testId,
        viewedAt: new Date(),
        wasLoggedIn: true,
        daysSinceLastLogin,
      });
      await user.save({ validateBeforeSave: false });

      // Bust user cache — testFirstViews array changed
      await invalidateUserCache(user._id).catch(() => {});
    }

    return res.json({ message: "Recorded" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;