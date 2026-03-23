/**
 * src/middlewares/cache.middleware.js
 *
 * Route-level response caching backed by Redis.
 * Falls back to no-op when Redis is unavailable — routes still work normally.
 *
 * ── Usage ─────────────────────────────────────────────────────────────────
 *
 * 1. Cache a GET route (auto key from URL):
 *      router.get("/", cache(60), handler)            // 60-second TTL
 *      router.get("/:id", cache(120), handler)
 *
 * 2. Cache with a custom key (for user-scoped data):
 *      router.get("/mine", requireAuth, cacheKey((req) => `notif:${req.user._id}`, 30), handler)
 *
 * 3. Invalidate on mutation (call inside a write handler):
 *      const { invalidate } = require("../middlewares/cache.middleware");
 *      await invalidate("tests:*");           // glob pattern
 *      await invalidate(`test:${id}`);        // exact key
 *
 * ── Key Namespaces (keep consistent) ──────────────────────────────────────
 *   tests:list:*          Public test listings
 *   test:<id>             Single test by id / token / slug
 *   leaderboard:<testId>  Leaderboard for a test
 *   subjects:tree         Full subject→section→topic tree
 *   coaching:<id>         Single coaching document
 *   notif:<userId>        User notifications list
 */

const redis = require("../configs/redis");

/* ── Core cache middleware factory ─────────────────────────────────────── */

/**
 * cache(ttlSeconds?)
 * Uses `req.originalUrl` as the cache key (includes query string).
 * Only caches 200 responses.
 */
function cache(ttlSeconds = 300) {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== "GET") return next();

    const key = `route:${req.originalUrl}`;

    const cached = await redis.get(key);
    if (cached !== null) {
      // Serve from cache — mark header so you can verify in dev tools
      res.setHeader("X-Cache", "HIT");
      return res.json(cached);
    }

    res.setHeader("X-Cache", "MISS");

    // Intercept res.json to store the response body in Redis
    const originalJson = res.json.bind(res);
    res.json = async (body) => {
      // Only cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        await redis.set(key, body, ttlSeconds);
      }
      return originalJson(body);
    };

    next();
  };
}

/**
 * cacheKey(keyFn, ttlSeconds?)
 * Same as cache() but lets you provide a dynamic key from the request.
 *
 * Example:
 *   cacheKey((req) => `notif:${req.user._id}`, 30)
 */
function cacheKey(keyFn, ttlSeconds = 300) {
  return async (req, res, next) => {
    if (req.method !== "GET") return next();

    const key = keyFn(req);

    const cached = await redis.get(key);
    if (cached !== null) {
      res.setHeader("X-Cache", "HIT");
      return res.json(cached);
    }

    res.setHeader("X-Cache", "MISS");

    const originalJson = res.json.bind(res);
    res.json = async (body) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        await redis.set(key, body, ttlSeconds);
      }
      return originalJson(body);
    };

    next();
  };
}

/**
 * invalidate(pattern)
 * Call inside write handlers (POST/PATCH/DELETE) to bust related cache entries.
 * Accepts exact keys or glob patterns (e.g. "tests:list:*").
 */
async function invalidate(pattern) {
  if (pattern.includes("*")) {
    await redis.delByPattern(pattern);
  } else {
    await redis.del(pattern);
  }
}

/**
 * invalidateMany(...patterns)
 * Convenience wrapper for busting multiple patterns at once.
 */
async function invalidateMany(...patterns) {
  await Promise.all(patterns.map(invalidate));
}

module.exports = { cache, cacheKey, invalidate, invalidateMany };
