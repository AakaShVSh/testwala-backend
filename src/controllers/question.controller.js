const express = require("express");
const Question = require("../models/question.model");
const { requireAuth, requireAdmin } = require("../middlewares/auth.middleware");

const router = express.Router();

const buildFilter = (q) => {
  const f = {};
  if (q.subject) f.subject = q.subject.toLowerCase().trim();
  if (q.section) f.section = new RegExp(`^${q.section}$`, "i");
  if (q.topic) f.topic = new RegExp(`^${q.topic}$`, "i");
  if (q.difficultyLevel) f.difficultyLevel = q.difficultyLevel;
  return f;
};

/* ── GET /questions/subjects ─────────────────────────────────────────────────
   Returns full subject→section→topics tree.
   Used by frontend to build menus — NO local hardcoding needed.
──────────────────────────────────────────────────────────────────────────── */
router.get("/subjects", async (req, res, next) => {
  try {
    const raw = await Question.aggregate([
      {
        $group: {
          _id: { subject: "$subject", section: "$section", topic: "$topic" },
        },
      },
      { $sort: { "_id.subject": 1, "_id.section": 1, "_id.topic": 1 } },
    ]);

    const tree = {};
    for (const {
      _id: { subject, section, topic },
    } of raw) {
      if (!tree[subject]) tree[subject] = {};
      if (!tree[subject][section]) tree[subject][section] = [];
      tree[subject][section].push(topic);
    }

    return res.json({ status: 200, data: tree });
  } catch (err) {
    next(err);
  }
});

/* ── GET /questions ──────────────────────────────────────────────────────── */
router.get("/", async (req, res, next) => {
  try {
    const questions = await Question.find(buildFilter(req.query)).lean();
    return res.json({ status: 200, data: questions });
  } catch (err) {
    next(err);
  }
});

/* ── GET /questions/:id ──────────────────────────────────────────────────── */
router.get("/:id", async (req, res, next) => {
  try {
    const q = await Question.findById(req.params.id).lean();
    if (!q) return res.status(404).json({ message: "Not found" });
    return res.json({ status: 200, data: q });
  } catch (err) {
    next(err);
  }
});

/* ── POST /questions/create  (admin only) ────────────────────────────────── */
router.post("/create", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const q = await Question.create(req.body);
    return res.status(201).json({ message: "Questions added", data: q });
  } catch (err) {
    next(err);
  }
});

/* ── POST /questions/create-many  (admin only) ───────────────────────────── */
router.post(
  "/create-many",
  requireAuth,
  requireAdmin,
  async (req, res, next) => {
    try {
      if (!Array.isArray(req.body))
        return res.status(400).json({ message: "Body must be array" });
      const docs = await Question.insertMany(req.body, { ordered: false });
      return res
        .status(201)
        .json({ message: `${docs.length} documents inserted`, data: docs });
    } catch (err) {
      next(err);
    }
  },
);

/* ── PATCH /questions/:id  (admin only) ──────────────────────────────────── */
router.patch("/:id", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const q = await Question.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).lean();
    if (!q) return res.status(404).json({ message: "Not found" });
    return res.json({ message: "Updated", data: q });
  } catch (err) {
    next(err);
  }
});

/* ── PATCH /questions/:id/add-items  (admin only) ────────────────────────── */
router.patch(
  "/:id/add-items",
  requireAuth,
  requireAdmin,
  async (req, res, next) => {
    try {
      const { items } = req.body;
      if (!Array.isArray(items))
        return res.status(400).json({ message: "'items' must be array" });

      const q = await Question.findByIdAndUpdate(
        req.params.id,
        { $push: { question: { $each: items } } },
        { new: true },
      ).lean();
      if (!q) return res.status(404).json({ message: "Not found" });
      return res.json({ message: "Items added", data: q });
    } catch (err) {
      next(err);
    }
  },
);

/* ── DELETE /questions/:id  (admin only) ─────────────────────────────────── */
router.delete("/:id", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const d = await Question.findByIdAndDelete(req.params.id);
    if (!d) return res.status(404).json({ message: "Not found" });
    return res.json({ message: "Deleted" });
  } catch (err) {
    next(err);
  }
});

/* ── DELETE /questions/:id/items/:itemId  (admin only) ───────────────────── */
router.delete(
  "/:id/items/:itemId",
  requireAuth,
  requireAdmin,
  async (req, res, next) => {
    try {
      const q = await Question.findByIdAndUpdate(
        req.params.id,
        { $pull: { question: { _id: req.params.itemId } } },
        { new: true },
      ).lean();
      if (!q) return res.status(404).json({ message: "Not found" });
      return res.json({ message: "Item deleted", data: q });
    } catch (err) {
      next(err);
    }
  },
);

module.exports = router;
