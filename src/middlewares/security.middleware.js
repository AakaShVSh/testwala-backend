/**
 * src/middlewares/security.middleware.js
 *
 * Reusable security middleware functions.
 * Import and apply these on specific routes that need extra protection.
 *
 * Covers:
 *  1. File upload validation  (bypass attack prevention)
 *  2. CSRF double-submit      (CSRF protection for state-changing routes)
 *  3. Request size guard      (per-route body size limits)
 *  4. Suspicious pattern      (LFI / path traversal detection)
 *  5. JSON field depth limit  (prototype pollution via deep nesting)
 */

/* ═══════════════════════════════════════════════════════════════════════════
   1. FILE UPLOAD VALIDATION
   Defends against:
   - File upload bypass (e.g. renaming shell.php as shell.jpg)
   - Polyglot files (files that are valid in two formats simultaneously)
   - Oversized file DoS

   How it works:
   - Checks MIME type from Content-Type (easily faked — not enough alone)
   - Checks magic bytes (first bytes of file content) — cannot be faked
   - Enforces per-type size limits
   - Blocks known dangerous extensions

   Usage:
     router.post("/upload", validateFileUpload(["image/jpeg","image/png"], 2), handler)
═══════════════════════════════════════════════════════════════════════════ */
const MAGIC_BYTES = {
  "image/jpeg": [[0xff, 0xd8, 0xff]],
  "image/png": [[0x89, 0x50, 0x4e, 0x47]],
  "image/gif": [[0x47, 0x49, 0x46, 0x38]],
  "image/webp": [[0x52, 0x49, 0x46, 0x46]],
  "application/pdf": [[0x25, 0x50, 0x44, 0x46]],
};

const DANGEROUS_EXTENSIONS = [
  ".php",
  ".php3",
  ".php4",
  ".php5",
  ".phtml",
  ".asp",
  ".aspx",
  ".jsp",
  ".jspx",
  ".sh",
  ".bash",
  ".zsh",
  ".py",
  ".rb",
  ".pl",
  ".exe",
  ".bat",
  ".cmd",
  ".com",
  ".msi",
  ".htaccess",
  ".htpasswd",
];

function validateFileUpload(allowedMimeTypes = [], maxSizeMB = 5) {
  return (req, res, next) => {
    const attachments = req.body?.attachments;
    if (!attachments || !Array.isArray(attachments)) return next();

    for (const file of attachments) {
      // Must have required fields
      if (!file.fileName || !file.fileType || !file.fileData) {
        return res.status(400).json({ message: "Invalid file format" });
      }

      // Block dangerous extensions
      const ext = ("." + file.fileName.split(".").pop()).toLowerCase();
      if (DANGEROUS_EXTENSIONS.includes(ext)) {
        return res
          .status(400)
          .json({ message: `File type .${ext} not allowed` });
      }

      // Check MIME type against whitelist
      if (
        allowedMimeTypes.length &&
        !allowedMimeTypes.includes(file.fileType)
      ) {
        return res.status(400).json({
          message: `File type ${file.fileType} not allowed. Allowed: ${allowedMimeTypes.join(", ")}`,
        });
      }

      // Check size (base64 is ~33% larger than binary)
      const base64Data = file.fileData.replace(/^data:[^;]+;base64,/, "");
      const fileSizeBytes = Math.ceil(base64Data.length * 0.75);
      const maxBytes = maxSizeMB * 1024 * 1024;
      if (fileSizeBytes > maxBytes) {
        return res.status(400).json({
          message: `File too large. Max size: ${maxSizeMB}MB`,
        });
      }

      // Magic byte check — verify actual file content matches claimed type
      if (MAGIC_BYTES[file.fileType]) {
        try {
          const buffer = Buffer.from(base64Data, "base64");
          const validSignatures = MAGIC_BYTES[file.fileType];
          const isValid = validSignatures.some((sig) =>
            sig.every((byte, i) => buffer[i] === byte),
          );
          if (!isValid) {
            return res.status(400).json({
              message: `File content does not match declared type ${file.fileType}`,
            });
          }
        } catch {
          return res.status(400).json({ message: "Invalid file data" });
        }
      }
    }
    next();
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   2. CSRF PROTECTION (Double Submit Cookie Pattern)
   Defends against Cross-Site Request Forgery.

   How it works:
   - On login, backend sets a non-httpOnly `_csrf` cookie with a random token
   - Every state-changing request (POST/PATCH/DELETE) must include that token
     in the `X-CSRF-Token` header
   - An attacker's site cannot read the cookie value (same-origin policy)
     so they cannot forge the header

   Note: sameSite:"lax" on the session cookie already provides strong CSRF
   protection for most cases. This adds a second layer for high-value routes.

   Usage:
     router.post("/sensitive", csrfCheck, handler)
═══════════════════════════════════════════════════════════════════════════ */
function csrfCheck(req, res, next) {
  // Skip in development (makes testing easier)
  if (process.env.NODE_ENV !== "production") return next();
  // Skip GET/HEAD/OPTIONS (safe methods)
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();

  const cookieToken = req.cookies?._csrf;
  const headerToken = req.headers["x-csrf-token"];

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({ message: "CSRF validation failed" });
  }
  next();
}

/* ═══════════════════════════════════════════════════════════════════════════
   3. STRICT BODY SIZE GUARD (per-route override)
   Use this when a route should only accept tiny payloads.

   Usage:
     router.post("/verify-otp", strictBodySize(1), handler) // 1kb max
═══════════════════════════════════════════════════════════════════════════ */
function strictBodySize(maxKB = 10) {
  return (req, res, next) => {
    const contentLength = parseInt(req.headers["content-length"] || "0", 10);
    if (contentLength > maxKB * 1024) {
      return res.status(413).json({
        message: `Request too large. Max: ${maxKB}KB`,
      });
    }
    next();
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   4. LFI / PATH TRAVERSAL DETECTION
   Defends against Local File Inclusion attacks like:
   - GET /tests/../../etc/passwd
   - req.body.path = "../../../../etc/shadow"

   Usage: apply globally in App.js or on specific routes
═══════════════════════════════════════════════════════════════════════════ */
const LFI_PATTERNS = [
  /\.\.[/\\]/, // ../  or ..\
  /\.\.[/\\]\.\.[/\\]/, // ../../
  /%2e%2e[/\\%]/i, // URL-encoded ../
  /%252e%252e/i, // Double URL-encoded
  /\/etc\/passwd/i,
  /\/etc\/shadow/i,
  /\/proc\/self/i,
  /\/windows\/system32/i,
  /\0/, // Null byte injection
];

function lfiGuard(req, res, next) {
  const checkString = (str) => {
    if (typeof str !== "string") return false;
    return LFI_PATTERNS.some((p) => p.test(str));
  };

  // Check URL
  if (checkString(req.url) || checkString(decodeURIComponent(req.url))) {
    console.warn(`[LFI] Blocked: ${req.method} ${req.url} from ${req.ip}`);
    return res.status(400).json({ message: "Invalid request" });
  }

  // Check all string values in body recursively
  const scanObject = (obj, depth = 0) => {
    if (depth > 5) return false; // max recursion depth
    if (typeof obj === "string") return checkString(obj);
    if (Array.isArray(obj)) return obj.some((v) => scanObject(v, depth + 1));
    if (obj && typeof obj === "object") {
      return Object.values(obj).some((v) => scanObject(v, depth + 1));
    }
    return false;
  };

  if (req.body && scanObject(req.body)) {
    console.warn(`[LFI] Blocked body: ${req.method} ${req.url} from ${req.ip}`);
    return res.status(400).json({ message: "Invalid request" });
  }

  next();
}

/* ═══════════════════════════════════════════════════════════════════════════
   5. JSON DEPTH LIMIT
   Defends against prototype pollution via deeply nested JSON:
   { "__proto__": { "isAdmin": true } }
   { "constructor": { "prototype": { "isAdmin": true } } }

   Usage: apply globally in App.js before body parser
   (but after express.json since we need the parsed body)
═══════════════════════════════════════════════════════════════════════════ */
const DANGEROUS_KEYS = ["__proto__", "constructor", "prototype"];

function protoGuard(req, res, next) {
  const scan = (obj, depth = 0) => {
    if (!obj || typeof obj !== "object" || depth > 10) return false;
    return Object.keys(obj).some(
      (k) => DANGEROUS_KEYS.includes(k) || scan(obj[k], depth + 1),
    );
  };

  if (req.body && scan(req.body)) {
    console.warn(`[PROTO] Prototype pollution attempt: ${req.ip}`);
    return res.status(400).json({ message: "Invalid request" });
  }
  next();
}

/* ═══════════════════════════════════════════════════════════════════════════
   6. ACCOUNT ENUMERATION PROTECTION
   Prevents timing attacks that reveal whether an email is registered.
   Both "user found" and "user not found" paths take the same time.

   Usage: wrap your auth route handlers
═══════════════════════════════════════════════════════════════════════════ */
const bcrypt = require("bcrypt");
const DUMMY_HASH = "$2b$12$dummy.hash.to.prevent.timing.attacks.xxxxxxxxxx";

async function preventEnumeration(userExists, password) {
  if (!userExists) {
    // Run a dummy bcrypt compare so response time is identical
    await bcrypt.compare(password || "dummy", DUMMY_HASH);
    return false;
  }
  return true;
}

module.exports = {
  validateFileUpload,
  csrfCheck,
  strictBodySize,
  lfiGuard,
  protoGuard,
  preventEnumeration,
};
