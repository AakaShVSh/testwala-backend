const jwt = require("jsonwebtoken");
const User = require("../models/User.model");

const JWT_SECRET =
  process.env.JWT_SECRET || "revisionkarlo_dev_secret_key_32chars";

/**
 * requireAuth — attaches req.user or returns 401.
 * The token lives in an httpOnly cookie named _user.
 */
async function requireAuth(req, res, next) {
  try {
    const token = req.cookies._user;
    if (!token) return res.status(401).json({ message: "Not authenticated" });

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch {
      return res
        .status(401)
        .json({ message: "Session expired, please sign in again" });
    }

    const user = await User.findById(decoded._id).select("-Password").lean();
    if (!user) return res.status(401).json({ message: "User not found" });

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * requireAdmin — only users with isAdmin: true
 */
function requireAdmin(req, res, next) {
  if (!req.user?.isAdmin) {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
}

/**
 * optionalAuth — attaches req.user if cookie present, but never blocks.
 */
async function optionalAuth(req, res, next) {
  try {
    const token = req.cookies._user;
    if (!token) return next();

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch {
      return next(); // invalid token → treat as guest
    }

    const user = await User.findById(decoded._id).select("-Password").lean();
    if (user) req.user = user;
    next();
  } catch {
    next();
  }
}

module.exports = { requireAuth, requireAdmin, optionalAuth };
