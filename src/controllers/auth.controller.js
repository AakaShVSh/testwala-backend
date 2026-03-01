const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const User = require("../models/User.model");
const router = express.Router();
const mailjet = require("node-mailjet").apiConnect(
  "daeaed556b3ccf5afdfdac33268e3f8d",
  "f8d1e680a42bb498eec9e19aa9e6a379",
);

const JWT_SECRET = process.env.JWT_SECRET || "jakjsdgskasjbsabdjsd";
const IS_PROD = process.env.NODE_ENV === "production";

// Cookie options — httpOnly means JS on the browser can NEVER read this cookie
const COOKIE_OPTIONS = {
  httpOnly: true, // JS cannot access it — protects against XSS
  secure: IS_PROD, // HTTPS only in production, HTTP allowed in dev
  sameSite: IS_PROD ? "none" : "lax", // "none" needed for cross-origin in prod (Render + Vercel)
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
  path: "/",
};

const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
};

/* ─────────────────────────────────────────────
   GET /auth/users  (admin / debug only)
───────────────────────────────────────────── */
router.get("/", async (req, res) => {
  try {
    const users = await User.find({}).lean().exec();
    return res.send({ status: 200, data: users });
  } catch (error) {
    return res.send({ err: error });
  }
});

/* ─────────────────────────────────────────────
   GET /auth/me
   Frontend calls this to check if the user is
   currently signed in. The browser automatically
   sends the httpOnly cookie — JS never reads it.
   Returns: { data: { _id, Name, Email } } or 401
───────────────────────────────────────────── */
router.get("/me", async (req, res) => {
  try {
    const token = req.cookies._user; // cookie-parser puts cookies on req.cookies
    if (!token) {
      return res.status(401).send({ message: "Not authenticated" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch {
      return res.status(401).send({ message: "Invalid or expired session" });
    }

    // decoded contains whatever was passed to generateToken
    // We stored { _id, Email } — look up fresh user data
    const user = await User.findById(decoded._id).lean().exec();
    if (!user) {
      return res.status(401).send({ message: "User not found" });
    }

    return res.status(200).send({
      status: 200,
      data: {
        _id: user._id,
        Name: user.Name,
        Email: user.Email,
        isAdmin: user.isAdmin,
      },
    });
  } catch (error) {
    return res.status(500).send({ message: error.message });
  }
});

/* ─────────────────────────────────────────────
   POST /auth/signup
   Creates user, sets httpOnly cookie, returns
   non-sensitive user data (no token in body).
───────────────────────────────────────────── */
router.post("/signup", async (req, res) => {
  try {
    const { Email } = req.body;
    if (!Email) return res.status(400).send({ message: "Email is required" });

    const existing = await User.findOne({ Email });
    if (existing) {
      return res.status(409).send({ message: "Email is already registered" });
    }

    const user = await User.create(req.body);

    // Generate token with just the user id
    const token = generateToken({ _id: user._id });

    // Set httpOnly cookie — browser stores it, JS never sees it
    res.cookie("_user", token, COOKIE_OPTIONS);

    return res.status(201).send({
      message: "Registration successful",
      data: {
        _id: user._id,
        Name: user.Name,
        Email: user.Email,
      },
    });
  } catch (error) {
    return res.status(400).send({ message: error.message });
  }
});

/* ─────────────────────────────────────────────
   POST /auth/signin
   Verifies credentials, sets httpOnly cookie,
   returns non-sensitive user data (no token in body).
───────────────────────────────────────────── */
router.post("/signin", async (req, res) => {
  try {
    const { Email, Password } = req.body;
    if (!Email || !Password) {
      return res
        .status(400)
        .send({ message: "Email and Password are required" });
    }

    const user = await User.findOne({ Email });
    if (!user) {
      return res.status(401).send({ message: "Email is not registered" });
    }

    const match = user.checkPassword(Password);
    if (!match) {
      return res.status(401).send({ message: "Wrong Email or Password" });
    }

    // Update last login
    await User.findByIdAndUpdate(user._id, { lastLogin: new Date() });

    // Generate token with just the user id
    const token = generateToken({ _id: user._id });

    // Set httpOnly cookie — JS on the browser never touches this
    res.cookie("_user", token, COOKIE_OPTIONS);

    return res.status(200).send({
      message: "Login successful",
      data: {
        _id: user._id,
        Name: user.Name,
        Email: user.Email,
        isAdmin: user.isAdmin,
      },
    });
  } catch (error) {
    return res
      .status(500)
      .send({ message: "Wrong Email or Password", err: error.message });
  }
});

/* ─────────────────────────────────────────────
   POST /auth/signout
   Clears the httpOnly cookie server-side.
───────────────────────────────────────────── */
router.post("/signout", (req, res) => {
  res.clearCookie("_user", {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: IS_PROD ? "none" : "lax",
    path: "/",
  });
  return res.status(200).send({ message: "Signed out successfully" });
});

/* ─────────────────────────────────────────────
   POST /auth/forgot-password
───────────────────────────────────────────── */
router.post("/forgot-password", async (req, res) => {
  try {
    const { Email } = req.body;
    if (!Email) return res.status(400).send({ message: "Email is required" });

    const user = await User.findOne({ Email });
    if (!user)
      return res.status(404).send({ message: "Email is not registered" });

    const randomOtp = Math.floor(1000 + Math.random() * 9000);

    await mailjet.post("send", { version: "v3.1" }).request({
      Messages: [
        {
          From: { Email: "akvish052@gmail.com", Name: "Revision Karlo" },
          To: [{ Email: Email, Name: user.Name || "User" }],
          Subject: "OTP for Password Reset",
          TextPart: `Your OTP is ${randomOtp}. Do not share it with anyone.`,
          HTMLPart: `<h3>Your OTP for password reset is <b>${randomOtp}</b></h3>`,
        },
      ],
    });

    // ⚠️ Remove otp from response in production
    return res.status(200).send({
      status: "OTP sent successfully",
      otp: randomOtp,
      user: { id: user._id, email: user.Email },
    });
  } catch (error) {
    return res
      .status(500)
      .send({ message: "Something went wrong", error: error.message });
  }
});

/* ─────────────────────────────────────────────
   PATCH /auth/change-password/:id
───────────────────────────────────────────── */
router.patch("/change-password/:id", async (req, res) => {
  try {
    const hash = bcrypt.hashSync(req.body.Password, 10);
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { Password: hash },
      { new: true },
    )
      .lean()
      .exec();
    return res.send({ message: "Password updated successfully", data: user });
  } catch (error) {
    return res.send({ message: error.message });
  }
});

module.exports = router;
