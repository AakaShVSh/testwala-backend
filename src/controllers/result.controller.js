const express = require("express");
const Result = require("../models/result.model");
const Test = require("../models/test.model");
const { requireAuth } = require("../middlewares/auth.middleware");
const { getIO } = require("../socket");

const router = express.Router();

/* ── POST /results/submit ────────────────────────────────────────────────────
   Called when student finishes / time runs out.
   Computes percentile + emits socket event to coach's page instantly.
──────────────────────────────────────────────────────────────────────────── */
router.post("/submit", requireAuth, async (req, res, next) => {
  try {
    const { testId } = req.body;
    if (!testId) return res.status(400).json({ message: "testId is required" });

    const test = await Test.findById(testId).lean();
    if (!test) return res.status(404).json({ message: "Test not found" });

    // Always use the authenticated user — ignore any client-sent studentId
    const payload = {
      ...req.body,
      studentId: req.user._id,
      coachingId: test.coachingId || null,
    };

    const result = await Result.create(payload);

    // Compute percentile: % of attempts scoring BELOW this student
    const totalAttempts = await Result.countDocuments({ testId });
    const below = await Result.countDocuments({
      testId,
      percentage: { $lt: result.percentage },
    });
    const percentile =
      totalAttempts > 1 ? Math.round((below / (totalAttempts - 1)) * 100) : 100;

    await Result.findByIdAndUpdate(result._id, { percentile });

    // Increment attempt counter on Test doc (non-blocking, best-effort)
    Test.findByIdAndUpdate(testId, { $inc: { totalAttempts: 1 } })
      .exec()
      .catch(() => {});

    // ── Emit real-time event to the coach's CoachingPage ─────────────────────
    // Coach has joined socket room `coaching:{coachingId}` when page loaded.
    // We send fresh counts so the page updates without any refresh.
    if (test.coachingId) {
      try {
        // Fresh attempt count for THIS test from Results (source of truth)
        const freshTestAttempts = await Result.countDocuments({ testId });

        // Fresh unique student count for the whole coaching
        const freshStudents = await Result.distinct("studentId", {
          coachingId: test.coachingId,
        });

        getIO()
          .to(`coaching:${test.coachingId.toString()}`)
          .emit("test:attempted", {
            coachingId: test.coachingId.toString(),
            testId: testId.toString(),
            testTitle: test.title,
            totalAttempts: freshTestAttempts, // for updating this specific test row
            totalStudents: freshStudents.length, // for updating the stats bar
            studentName: req.user.Name || "A student",
          });
      } catch (emitErr) {
        // Never let a socket error break the HTTP response
        console.error("[socket emit error]", emitErr.message);
      }
    }

    const final = await Result.findById(result._id)
      .populate("testId", "title examType timeLimitMin slug")
      .lean();

    return res
      .status(201)
      .json({ message: "Result saved", data: { ...final, percentile } });
  } catch (err) {
    next(err);
  }
});

/* ── GET /results/student/me ─────────────────────────────────────────────────
   All attempts by the currently signed-in student.
──────────────────────────────────────────────────────────────────────────── */
router.get("/student/me", requireAuth, async (req, res, next) => {
  try {
    const filter = { studentId: req.user._id };
    if (req.query.testId) filter.testId = req.query.testId;

    const results = await Result.find(filter)
      .sort({ createdAt: -1 })
      .populate("testId", "title examType timeLimitMin slug")
      .select("-allAnswers")
      .lean();

    return res.json({ status: 200, data: results });
  } catch (err) {
    next(err);
  }
});

/* ── GET /results/test/:testId ───────────────────────────────────────────────
   All results for one test — leaderboard for coaches.
──────────────────────────────────────────────────────────────────────────── */
router.get("/test/:testId", requireAuth, async (req, res, next) => {
  try {
    const results = await Result.find({ testId: req.params.testId })
      .sort({ percentage: -1, timeTaken: 1 })
      .populate("studentId", "Name Email Phone")
      .select("-allAnswers")
      .lean();

    return res.json({ status: 200, data: results });
  } catch (err) {
    next(err);
  }
});

/* ── GET /results/:id ────────────────────────────────────────────────────────
   Full result for the review page.
   Access: the student who took it, the coaching owner, or admin.
   resultId itself acts as the access key for unauthenticated review links.
──────────────────────────────────────────────────────────────────────────── */
router.get("/:id", async (req, res, next) => {
  try {
    const result = await Result.findById(req.params.id)
      .populate("testId", "title examType timeLimitMin slug questions")
      .populate("studentId", "Name Email")
      .lean();

    if (!result) return res.status(404).json({ message: "Result not found" });

    // If a cookie token is present, verify ownership
    const token = req.cookies?._user;
    if (token) {
      try {
        const jwt = require("jsonwebtoken");
        const User = require("../models/User.model");
        const JWT_SECRET =
          process.env.JWT_SECRET || "revisionkarlo_dev_secret_key_32chars";
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded._id)
          .select("-Password")
          .lean();

        if (user) {
          const isOwn = result.studentId._id.toString() === user._id.toString();
          const isAdmin = user.isAdmin;
          let isCoach = false;
          if (result.coachingId) {
            const Coaching = require("../models/coaching.model");
            const c = await Coaching.findById(result.coachingId).lean();
            isCoach = c && c.owner.toString() === user._id.toString();
          }
          if (!isOwn && !isAdmin && !isCoach) {
            return res.status(403).json({ message: "Not authorised" });
          }
        }
      } catch {
        // Invalid token — treat as guest, allow access via resultId
      }
    }
    // No token = unauthenticated review via shared resultId link — allow

    return res.json({ status: 200, data: result });
  } catch (err) {
    next(err);
  }
});

/* ── DELETE /results/:id ─────────────────────────────────────────────────── */
router.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    if (!req.user.isAdmin)
      return res.status(403).json({ message: "Admin only" });

    const deleted = await Result.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Not found" });

    return res.json({ message: "Result deleted" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
