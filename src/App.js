const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");

const app = express();

/* ── CORS ───────────────────────────────────────────────────────────────── */
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean)
  .concat(["http://localhost:3000", "http://localhost:5173"]);

app.use(
  cors({
    origin(origin, cb) {
      if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
      cb(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

/* ── Body / Cookie parsers ──────────────────────────────────────────────── */
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

/* ── Health check ───────────────────────────────────────────────────────── */
app.get("/health", (_req, res) => res.json({ ok: true }));

/* ── Routes ─────────────────────────────────────────────────────────────── */
app.use("/auth", require("./controllers/auth.controller"));
app.use("/coaching", require("./controllers/coaching.controller"));
app.use("/tests", require("./controllers/test.controller"));
app.use("/results", require("./controllers/result.controller"));
app.use("/questions", require("./controllers/question.controller"));

/* ── 404 catch-all ──────────────────────────────────────────────────────── */
app.use((_req, res) => res.status(404).json({ message: "Route not found" }));

/* ── Global error handler ───────────────────────────────────────────────── */
app.use((err, _req, res, _next) => {
  console.error(err);
  res
    .status(err.status || 500)
    .json({ message: err.message || "Server error" });
});

module.exports = app;
