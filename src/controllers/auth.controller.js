const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const User = require("../models/User.model");
const { requireAuth } = require("../middlewares/auth.middleware");

const router = express.Router();
const JWT_SECRET =
  process.env.JWT_SECRET || "revisionkarlo_dev_secret_key_32chars";
const IS_PROD = process.env.NODE_ENV === "production";

const COOKIE_OPTS = {
  httpOnly: true,
  secure: IS_PROD,
  sameSite: IS_PROD ? "none" : "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
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
});

/* ── GET /auth/me ─────────────────────────────────────────────────────────
   Returns the currently logged-in user (cookie-based).
   Used by frontend on every page load to check auth state.
──────────────────────────────────────────────────────────────────────────── */
router.get("/me", requireAuth, (req, res) => {
  res.json({ status: 200, data: safeUser(req.user) });
});

/* ── POST /auth/signup ───────────────────────────────────────────────────── */
router.post("/signup", async (req, res, next) => {
  try {
    const { Email, Password, Name, Phone } = req.body;
    if (!Email || !Password) {
      return res
        .status(400)
        .json({ message: "Email and Password are required" });
    }

    const exists = await User.findOne({
      Email: Email.toLowerCase().trim(),
    }).lean();
    if (exists)
      return res.status(409).json({ message: "Email already registered" });

    const user = await User.create({ Email, Password, Name, Phone });

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
    if (!Email || !Password) {
      return res
        .status(400)
        .json({ message: "Email and Password are required" });
    }

    const user = await User.findOne({ Email: Email.toLowerCase().trim() });
    if (!user) return res.status(401).json({ message: "Email not registered" });

    const match = user.checkPassword(Password);
    if (!match) return res.status(401).json({ message: "Wrong password" });

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    res.cookie("_user", signToken(user._id), COOKIE_OPTS);
    return res.json({ message: "Login successful", data: safeUser(user) });
  } catch (err) {
    next(err);
  }
});

/* ── POST /auth/signout ──────────────────────────────────────────────────── */
router.post("/signout", (req, res) => {
  res.clearCookie("_user", {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: IS_PROD ? "none" : "lax",
    path: "/",
  });
  res.json({ message: "Signed out" });
});

/* ── POST /auth/forgot-password
   Returns OTP in response (for now — swap for email delivery in prod).
──────────────────────────────────────────────────────────────────────────── */
router.post("/forgot-password", async (req, res, next) => {
  try {
    const { Email } = req.body;
    if (!Email) return res.status(400).json({ message: "Email is required" });

    const user = await User.findOne({
      Email: Email.toLowerCase().trim(),
    }).lean();
    if (!user) return res.status(404).json({ message: "Email not registered" });

    const otp = Math.floor(100000 + Math.random() * 900000); // 6-digit OTP

    // TODO: send via email / SMS — returning in response for dev only
    return res.json({ message: "OTP generated", otp, userId: user._id });
  } catch (err) {
    next(err);
  }
});

/* ── PATCH /auth/change-password/:id ─────────────────────────────────────── */
router.patch("/change-password/:id", async (req, res, next) => {
  try {
    const { Password } = req.body;
    if (!Password)
      return res.status(400).json({ message: "Password is required" });

    const hash = await bcrypt.hash(Password, 12);
    await User.findByIdAndUpdate(req.params.id, { Password: hash });
    return res.json({ message: "Password updated" });
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
    return res.json({ message: "Profile updated", data: safeUser(user) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
