// const jwt = require("jsonwebtoken");
// const User = require("../models/User.model");

// const JWT_SECRET =
//   process.env.JWT_SECRET || "revisionkarlo_dev_secret_key_32chars";

// /**
//  * requireAuth — attaches req.user or returns 401.
//  * The token lives in an httpOnly cookie named _user.
//  */
// async function requireAuth(req, res, next) {
//   try {
//     const token = req.cookies._user;
//     if (!token) return res.status(401).json({ message: "Not authenticated" });

//     let decoded;
//     try {
//       decoded = jwt.verify(token, JWT_SECRET);
//     } catch {
//       return res
//         .status(401)
//         .json({ message: "Session expired, please sign in again" });
//     }

//     const user = await User.findById(decoded._id).select("-Password").lean();
//     if (!user) return res.status(401).json({ message: "User not found" });

//     req.user = user;
//     next();
//   } catch (err) {
//     next(err);
//   }
// }

// /**
//  * requireAdmin — only users with isAdmin: true
//  */
// function requireAdmin(req, res, next) {
//   if (!req.user?.isAdmin) {
//     return res.status(403).json({ message: "Admin access required" });
//   }
//   next();
// }

// /**
//  * optionalAuth — attaches req.user if cookie present, but never blocks.
//  */
// async function optionalAuth(req, res, next) {
//   try {
//     const token = req.cookies._user;
//     if (!token) return next();

//     let decoded;
//     try {
//       decoded = jwt.verify(token, JWT_SECRET);
//     } catch {
//       return next(); // invalid token → treat as guest
//     }

//     const user = await User.findById(decoded._id).select("-Password").lean();
//     if (user) req.user = user;
//     next();
//   } catch {
//     next();
//   }
// }

// module.exports = { requireAuth, requireAdmin, optionalAuth };







/**
 * src/middlewares/auth.middleware.js
 *
 * Changes from original:
 *  - requireAuth now caches the User document in Redis (TTL: 5 min).
 *    Every authenticated request was hitting MongoDB — this eliminates that.
 *  - Cache is keyed by userId: "user:<_id>"
 *  - Cache is invalidated on profile update (call invalidateUserCache from controllers).
 *  - Gracefully falls back to MongoDB if Redis is unavailable.
 */

const jwt = require("jsonwebtoken");
const User = require("../models/User.model");
const redis = require("../configs/redis");

const JWT_SECRET =
  process.env.JWT_SECRET || "revisionkarlo_dev_secret_key_32chars";

/* ── Cache helpers (exported so controllers can invalidate on mutation) ─── */

const USER_CACHE_TTL = 5 * 60; // 5 minutes
const userCacheKey = (id) => `user:${id}`;

/**
 * Call this in any route that mutates the user document
 * (profile update, password change, admin toggle, etc.)
 */
async function invalidateUserCache(userId) {
  await redis.del(userCacheKey(String(userId)));
}

/* ── requireAuth ─────────────────────────────────────────────────────────── */

/**
 * requireAuth — attaches req.user or returns 401.
 * Token lives in an httpOnly cookie named _user.
 * User document is cached in Redis to avoid a DB hit on every request.
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

    const cacheKey = userCacheKey(decoded._id);

    // 1. Try Redis first
    let user = await redis.get(cacheKey);

    // 2. Cache miss — hit MongoDB and populate cache
    if (!user) {
      user = await User.findById(decoded._id).select("-Password").lean();
      if (!user) return res.status(401).json({ message: "User not found" });
      // Store in Redis (fire-and-forget — don't await in hot path)
      redis.set(cacheKey, user, USER_CACHE_TTL).catch(() => {});
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

/* ── requireAdmin ────────────────────────────────────────────────────────── */

function requireAdmin(req, res, next) {
  if (!req.user?.isAdmin) {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
}

/* ── optionalAuth ────────────────────────────────────────────────────────── */

/**
 * optionalAuth — attaches req.user if cookie present, but never blocks.
 * Also uses Redis cache for consistency.
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

    const cacheKey = userCacheKey(decoded._id);

    let user = await redis.get(cacheKey);
    if (!user) {
      user = await User.findById(decoded._id).select("-Password").lean();
      if (user) {
        redis.set(cacheKey, user, USER_CACHE_TTL).catch(() => {});
      }
    }

    if (user) req.user = user;
    next();
  } catch {
    next();
  }
}

module.exports = {
  requireAuth,
  requireAdmin,
  optionalAuth,
  invalidateUserCache,
};