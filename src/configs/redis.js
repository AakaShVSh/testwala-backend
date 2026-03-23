/**
 * src/configs/redis.js
 *
 * Single Redis client shared across the entire app (ioredis).
 *
 * Design goals:
 *  1. Graceful degradation — if Redis is not configured or is down, the app
 *     continues working. Cache misses just hit MongoDB as normal.
 *  2. One connection — never create more than one ioredis client per process.
 *  3. Safe helpers — get/set/del/flush wrappers that catch errors silently so
 *     a Redis blip never crashes a route handler.
 *
 * Usage:
 *   const redis = require("../configs/redis");
 *   await redis.set("key", value, 60);   // TTL in seconds
 *   const val = await redis.get("key");  // null on miss or error
 *   await redis.del("key");
 *   await redis.delByPattern("user:*");  // scan + delete
 */

const Redis = require("ioredis");

/* ── Connection ──────────────────────────────────────────────────────────── */

let client = null;
let _connected = false;

function createClient() {
  if (!process.env.REDIS_URL) {
    console.warn(
      "[Redis] REDIS_URL not set — running without cache. " +
        "Set REDIS_URL in .env to enable Redis.",
    );
    return null;
  }

  const ioredis = new Redis(process.env.REDIS_URL, {
    // Reconnect with exponential back-off, max 30 s
    retryStrategy(times) {
      const delay = Math.min(times * 200, 30_000);
      return delay;
    },
    // Don't throw on connection failure — just emit "error"
    lazyConnect: false,
    maxRetriesPerRequest: 1,
    enableReadyCheck: true,
    connectTimeout: 5_000,
    // Keep the connection alive through NAT / load-balancers
    keepAlive: 10_000,
  });

  ioredis.on("connect", () => {
    _connected = true;
    console.log("[Redis] Connected ✅");
  });

  ioredis.on("ready", () => {
    _connected = true;
  });

  ioredis.on("error", (err) => {
    // Log once — ioredis will keep retrying silently
    if (_connected) {
      console.error("[Redis] Connection error:", err.message);
    }
    _connected = false;
  });

  ioredis.on("close", () => {
    _connected = false;
  });

  ioredis.on("reconnecting", () => {
    console.log("[Redis] Reconnecting…");
  });

  return ioredis;
}

/* ── Lazy singleton ──────────────────────────────────────────────────────── */

function getClient() {
  if (!client) {
    client = createClient();
  }
  return client;
}

/* ── Safe helpers ────────────────────────────────────────────────────────── */

/**
 * Get a cached value.
 * Returns parsed JSON, or null on miss/error.
 */
async function get(key) {
  const c = getClient();
  if (!c) return null;
  try {
    const raw = await c.get(key);
    if (raw === null) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.error(`[Redis] get("${key}") failed:`, err.message);
    return null;
  }
}

/**
 * Set a value with optional TTL (seconds).
 * ttl defaults to 5 minutes.
 */
async function set(key, value, ttlSeconds = 300) {
  const c = getClient();
  if (!c) return;
  try {
    const serialised = JSON.stringify(value);
    if (ttlSeconds > 0) {
      await c.set(key, serialised, "EX", ttlSeconds);
    } else {
      await c.set(key, serialised);
    }
  } catch (err) {
    console.error(`[Redis] set("${key}") failed:`, err.message);
  }
}

/**
 * Delete one or more keys.
 */
async function del(...keys) {
  const c = getClient();
  if (!c || keys.length === 0) return;
  try {
    await c.del(...keys);
  } catch (err) {
    console.error(`[Redis] del(${keys.join(", ")}) failed:`, err.message);
  }
}

/**
 * Delete all keys matching a glob pattern using SCAN (non-blocking).
 * e.g. await redis.delByPattern("test:*")
 */
async function delByPattern(pattern) {
  const c = getClient();
  if (!c) return;
  try {
    let cursor = "0";
    do {
      const [nextCursor, keys] = await c.scan(
        cursor,
        "MATCH",
        pattern,
        "COUNT",
        100,
      );
      cursor = nextCursor;
      if (keys.length > 0) {
        await c.del(...keys);
      }
    } while (cursor !== "0");
  } catch (err) {
    console.error(`[Redis] delByPattern("${pattern}") failed:`, err.message);
  }
}

/**
 * Check if Redis is currently reachable.
 */
function isConnected() {
  return _connected;
}

/**
 * Graceful shutdown — call from server.js on SIGTERM.
 */
async function quit() {
  if (client) {
    await client.quit().catch(() => {});
    client = null;
    _connected = false;
    console.log("[Redis] Connection closed");
  }
}

module.exports = { get, set, del, delByPattern, isConnected, getClient, quit };
