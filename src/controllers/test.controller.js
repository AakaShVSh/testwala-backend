const express = require("express");
const router = express.Router();
const Test = require("../models/Test.model");
const Result = require("../models/Result.model");
const Question = require("../models/Question.model");

const toSlug = (str) =>
  str
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");

/* ─────────────────────────────────────────────
   POST /tests/create
───────────────────────────────────────────── */
router.post("/create", async (req, res) => {
  try {
    const { title, questionDocIds, inlineQuestions, ...rest } = req.body;
    if (!title) return res.status(400).send({ message: "title is required" });
    if (!rest.createdBy)
      return res
        .status(400)
        .send({ message: "createdBy (userId) is required" });

    // Always generate a unique slug (title + timestamp)
    rest.slug = `${toSlug(title)}-${Date.now()}`;

    let questions = [];

    if (Array.isArray(questionDocIds) && questionDocIds.length > 0) {
      const docs = await Question.find({ _id: { $in: questionDocIds } })
        .lean()
        .exec();
      docs.forEach((doc) => {
        doc.question.forEach((item) => {
          questions.push({ sourceId: item._id, ...item });
        });
      });
    }

    if (Array.isArray(inlineQuestions) && inlineQuestions.length > 0) {
      questions = [...questions, ...inlineQuestions];
    }

    // Sync visibility → accessType
    if (rest.visibility && !rest.accessType) rest.accessType = rest.visibility;

    const test = await Test.create({ title, questions, ...rest });
    return res.status(201).send({ message: "Test created", data: test });
  } catch (error) {
    console.error("Create test error:", error);
    return res.status(400).send({ message: error.message });
  }
});

/* ─────────────────────────────────────────────
   GET /tests
   Returns test metadata only (no questions, no password).
───────────────────────────────────────────── */
router.get("/", async (req, res) => {
  try {
    const filter = { isActive: true };
    if (req.query.coachingId) filter.coachingId = req.query.coachingId;
    if (req.query.examType) filter.examType = req.query.examType;
    if (req.query.subject) filter.subject = req.query.subject.toLowerCase();
    if (req.query.visibility) filter.visibility = req.query.visibility;

    const tests = await Test.find(filter)
      .select("-questions -password")
      .lean()
      .exec();
    return res.status(200).send({ status: 200, data: tests });
  } catch (error) {
    return res.status(500).send({ message: error.message });
  }
});

/* ─────────────────────────────────────────────
   GET /tests/id/:id
   Get full test by mongo _id (admin / coach use).
───────────────────────────────────────────── */
router.get("/id/:id", async (req, res) => {
  try {
    const test = await Test.findById(req.params.id).lean().exec();
    if (!test) return res.status(404).send({ message: "Not found" });
    const { password: _p, ...safeTest } = test;
    return res.status(200).send({ status: 200, data: safeTest });
  } catch (error) {
    return res.status(500).send({ error: error.message });
  }
});

/* ─────────────────────────────────────────────
   GET /tests/:id/leaderboard
───────────────────────────────────────────── */
router.get("/:id/leaderboard", async (req, res) => {
  try {
    const results = await Result.find({ testId: req.params.id })
      .sort({ scorePercentage: -1, timeTakenSec: 1 })
      .limit(20)
      .populate("studentId", "Name Email")
      .select("-questions -allAnswer")
      .lean()
      .exec();
    return res.status(200).send({ status: 200, data: results });
  } catch (error) {
    return res.status(500).send({ error: error.message });
  }
});

/* ─────────────────────────────────────────────
   GET /tests/:id/stats
   Aggregate stats for a test (for coach detail view)
───────────────────────────────────────────── */
router.get("/:id/stats", async (req, res) => {
  try {
    const testId = req.params.id;
    const results = await Result.find({ testId }).lean().exec();

    if (!results.length) {
      return res.status(200).send({
        status: 200,
        data: {
          totalAttempts: 0,
          avgScore: 0,
          avgPercentage: 0,
          passCount: 0,
          passRate: 0,
          highestScore: 0,
          lowestScore: 0,
        },
      });
    }

    const totalAttempts = results.length;
    const scores = results.map((r) => r.scorePercentage || r.percentage || 0);
    const avgPercentage = scores.reduce((a, b) => a + b, 0) / totalAttempts;
    const passCount = results.filter(
      (r) => (r.scorePercentage || r.percentage || 0) >= 40,
    ).length;

    return res.status(200).send({
      status: 200,
      data: {
        totalAttempts,
        avgPercentage: Math.round(avgPercentage),
        passCount,
        passRate: Math.round((passCount / totalAttempts) * 100),
        highestScore: Math.max(...scores),
        lowestScore: Math.min(...scores),
      },
    });
  } catch (error) {
    return res.status(500).send({ error: error.message });
  }
});

/* ─────────────────────────────────────────────
   GET /tests/token/:token
   Access a private test via access token (share link)
───────────────────────────────────────────── */
router.get("/token/:token", async (req, res) => {
  try {
    const test = await Test.findOne({
      accessToken: req.params.token,
      isActive: true,
    })
      .lean()
      .exec();
    if (!test)
      return res
        .status(404)
        .send({ message: "Test not found or link expired" });
    const { password: _p, accessToken: _t, ...safeTest } = test;
    return res.status(200).send({ status: 200, data: safeTest });
  } catch (error) {
    return res.status(500).send({ error: error.message });
  }
});

/* ─────────────────────────────────────────────
   GET /tests/:slug
   Public test page by URL slug.
───────────────────────────────────────────── */
router.get("/:slug", async (req, res) => {
  try {
    const test = await Test.findOne({ slug: req.params.slug, isActive: true })
      .lean()
      .exec();
    if (!test) return res.status(404).send({ message: "Test not found" });

    if (test.visibility === "private" || test.accessType === "private") {
      if (!req.query.password || req.query.password !== test.password) {
        return res
          .status(403)
          .send({
            message: "Invalid or missing password for this private test",
          });
      }
    }

    const { password: _p, ...safeTest } = test;
    return res.status(200).send({ status: 200, data: safeTest });
  } catch (error) {
    return res.status(500).send({ error: error.message });
  }
});

/* ─────────────────────────────────────────────
   PATCH /tests/:id
───────────────────────────────────────────── */
router.patch("/:id", async (req, res) => {
  try {
    if (req.body.visibility) req.body.accessType = req.body.visibility;
    const test = await Test.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    })
      .lean()
      .exec();
    if (!test) return res.status(404).send({ message: "Not found" });
    return res
      .status(200)
      .send({ message: "Test updated successfully", data: test });
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

/* ─────────────────────────────────────────────
   DELETE /tests/:id  (soft delete)
───────────────────────────────────────────── */
router.delete("/:id", async (req, res) => {
  try {
    const test = await Test.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true },
    )
      .lean()
      .exec();
    if (!test) return res.status(404).send({ message: "Not found" });
    return res.status(200).send({ message: "Test deactivated" });
  } catch (error) {
    return res.status(500).send({ error: error.message });
  }
});

module.exports = router;
