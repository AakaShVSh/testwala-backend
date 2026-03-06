/**
 * Convert any string to a URL-safe slug.
 * e.g. "Vision IAS 2024" → "vision-ias-2024"
 */
const toSlug = (str) =>
  str
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");

module.exports = { toSlug };
