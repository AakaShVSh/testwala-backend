// const express = require("express");
// const Result = require("../models/result.model");
// const Test = require("../models/test.model");
// const { requireAuth } = require("../middlewares/auth.middleware");
// const { getIO } = require("../socket");

// const router = express.Router();

// /* ── POST /results/submit ────────────────────────────────────────────────────
//    IMPORTANT: Client must send `shuffledQuestions` in the payload — the exact
//    array of question objects shown to the student during the test (post-shuffle).
//    This is stored so ResultPage can reconstruct the correct answer↔question
//    mapping even when questions were shuffled.

//    Socket emits ONLY on first attempt. totalAttempts counter on Test doc ONLY
//    increments on first attempt — retakes never affect stats or leaderboard.
// ──────────────────────────────────────────────────────────────────────────── */
// router.post("/submit", requireAuth, async (req, res, next) => {
//   try {
//     const { testId } = req.body;
//     if (!testId) return res.status(400).json({ message: "testId is required" });

//     const test = await Test.findById(testId).lean();
//     if (!test) return res.status(404).json({ message: "Test not found" });

//     const payload = {
//       ...req.body,
//       studentId: req.user._id,
//       coachingId: test.coachingId || null,
//       shuffledQuestions: Array.isArray(req.body.shuffledQuestions)
//         ? req.body.shuffledQuestions
//         : [],
//     };

//     // Check BEFORE saving whether this student has attempted before
//     const previousAttempts = await Result.countDocuments({
//       testId,
//       studentId: req.user._id,
//     });
//     const isFirstAttempt = previousAttempts === 0;

//     const result = await Result.create(payload);

//     // Percentile
//     const totalAttempts = await Result.countDocuments({ testId });
//     const below = await Result.countDocuments({
//       testId,
//       percentage: { $lt: result.percentage },
//     });
//     const percentile =
//       totalAttempts > 1 ? Math.round((below / (totalAttempts - 1)) * 100) : 100;
//     await Result.findByIdAndUpdate(result._id, { percentile });

//     // ── Only on first attempt: increment counter + emit socket ───────────
//     if (isFirstAttempt) {
//       Test.findByIdAndUpdate(testId, { $inc: { totalAttempts: 1 } })
//         .exec()
//         .catch(() => {});

//       if (test.coachingId) {
//         try {
//           const freshTestAttempts = await Result.countDocuments({ testId });
//           const freshStudents = await Result.distinct("studentId", {
//             coachingId: test.coachingId,
//           });
//           getIO()
//             .to(`coaching:${test.coachingId.toString()}`)
//             .emit("test:attempted", {
//               coachingId: test.coachingId.toString(),
//               testId: testId.toString(),
//               testTitle: test.title,
//               totalAttempts: freshTestAttempts,
//               totalStudents: freshStudents.length,
//               studentName: req.user.Name || "A student",
//             });
//         } catch (emitErr) {
//           console.error("[socket emit error]", emitErr.message);
//         }
//       }
//     }

//     const final = await Result.findById(result._id)
//       .populate("testId", "title examType timeLimitMin slug")
//       .lean();

//     return res
//       .status(201)
//       .json({ message: "Result saved", data: { ...final, percentile } });
//   } catch (err) {
//     next(err);
//   }
// });

// /* ── GET /results/student/me ─────────────────────────────────────────────────
//    All attempts by the currently signed-in student.
// ──────────────────────────────────────────────────────────────────────────── */
// router.get("/student/me", requireAuth, async (req, res, next) => {
//   try {
//     const filter = { studentId: req.user._id };
//     if (req.query.testId) filter.testId = req.query.testId;
//     const results = await Result.find(filter)
//       .sort({ createdAt: -1 })
//       .populate("testId", "title examType timeLimitMin slug")
//       .select("-allAnswers -shuffledQuestions")
//       .lean();
//     return res.json({ status: 200, data: results });
//   } catch (err) {
//     next(err);
//   }
// });

// /* ── GET /results/test/:testId ───────────────────────────────────────────────
//    All results for one test — used by owner for allAttempts list.
// ──────────────────────────────────────────────────────────────────────────── */
// router.get("/test/:testId", requireAuth, async (req, res, next) => {
//   try {
//     const results = await Result.find({ testId: req.params.testId })
//       .sort({ percentage: -1, timeTaken: 1 })
//       .populate("studentId", "Name Email Phone")
//       .select("-allAnswers -shuffledQuestions")
//       .lean();
//     return res.json({ status: 200, data: results });
//   } catch (err) {
//     next(err);
//   }
// });

// /* ── GET /results/:id ────────────────────────────────────────────────────────
//    Full result — includes shuffledQuestions so ResultPage reconstructs
//    the correct answer↔question mapping.
// ──────────────────────────────────────────────────────────────────────────── */
// router.get("/:id", async (req, res, next) => {
//   try {
//     const result = await Result.findById(req.params.id)
//       .populate("testId", "title examType timeLimitMin slug questions")
//       .populate("studentId", "Name Email")
//       .lean();

//     if (!result) return res.status(404).json({ message: "Result not found" });

//     const token = req.cookies?._user;
//     if (token) {
//       try {
//         const jwt = require("jsonwebtoken");
//         const User = require("../models/User.model");
//         const JWT_SECRET =
//           process.env.JWT_SECRET || "revisionkarlo_dev_secret_key_32chars";
//         const decoded = jwt.verify(token, JWT_SECRET);
//         const user = await User.findById(decoded._id)
//           .select("-Password")
//           .lean();
//         if (user) {
//           const isOwn = result.studentId._id.toString() === user._id.toString();
//           const isAdmin = user.isAdmin;
//           let isCoach = false;
//           if (result.coachingId) {
//             const Coaching = require("../models/coaching.model");
//             const c = await Coaching.findById(result.coachingId).lean();
//             isCoach = c && c.owner.toString() === user._id.toString();
//           }
//           if (!isOwn && !isAdmin && !isCoach)
//             return res.status(403).json({ message: "Not authorised" });
//         }
//       } catch {
//         /* invalid token — allow via resultId */
//       }
//     }

//     return res.json({ status: 200, data: result });
//   } catch (err) {
//     next(err);
//   }
// });

// /* ── DELETE /results/:id ─────────────────────────────────────────────────── */
// router.delete("/:id", requireAuth, async (req, res, next) => {
//   try {
//     if (!req.user.isAdmin)
//       return res.status(403).json({ message: "Admin only" });
//     const deleted = await Result.findByIdAndDelete(req.params.id);
//     if (!deleted) return res.status(404).json({ message: "Not found" });
//     return res.json({ message: "Result deleted" });
//   } catch (err) {
//     next(err);
//   }
// });

// module.exports = router;

const express = require("express");
const Result = require("../models/result.model");
const Test = require("../models/test.model");
const TestLinkVisit = require("../models/testLinkVisit.model");
const { requireAuth } = require("../middlewares/auth.middleware");
const { getIO } = require("../socket");

const router = express.Router();

/* ── POST /results/submit ─────────────────────────────────────────────────── */
router.post("/submit", requireAuth, async (req, res, next) => {
  try {
    const { testId } = req.body;
    if (!testId) return res.status(400).json({ message: "testId is required" });

    const test = await Test.findById(testId).lean();
    if (!test) return res.status(404).json({ message: "Test not found" });

    // ── Compute per-section scores ─────────────────────────────────────
    let sectionScores = [];
    if (
      test.isSectioned &&
      Array.isArray(test.sections) &&
      test.sections.length
    ) {
      const allAnswers = req.body.allAnswers || {};
      const sectionsToScore =
        Array.isArray(req.body.shuffledSections) &&
        req.body.shuffledSections.length === test.sections.length
          ? req.body.shuffledSections
          : test.sections;

      let offset = 0;
      sectionScores = sectionsToScore.map((sec, sIdx) => {
        const total = sec.questions.length;
        let score = 0;
        for (let i = 0; i < total; i++) {
          const flatIdx = offset + i;
          const chosen = allAnswers[flatIdx] ?? allAnswers[String(flatIdx)];
          if (chosen !== undefined && chosen === sec.questions[i].answer)
            score++;
        }
        offset += total;
        return {
          name: sec.name || test.sections[sIdx]?.name || `Section ${sIdx + 1}`,
          subject: sec.subject || test.sections[sIdx]?.subject || "",
          score,
          total,
          percentage: total > 0 ? Math.round((score / total) * 100) : 0,
        };
      });
    }

    // Whitelist only known safe fields — never spread req.body directly
    // This prevents a hacker injecting fields like isPassed:true, percentage:100
    const b = req.body;
    const payload = {
      studentId: req.user._id,
      testId: b.testId,
      coachingId: test.coachingId || null,
      score: Array.isArray(b.correctQus) ? b.correctQus.length : 0,
      totalQuestions: Number(b.totalQuestions) || 0,
      wrongAnswers: Array.isArray(b.wrongQus) ? b.wrongQus.length : 0,
      timeTaken: Number(b.timeTaken) || 0,
      allAnswers:
        b.allAnswers && typeof b.allAnswers === "object" ? b.allAnswers : {},
      questionTimes:
        b.questionTimes && typeof b.questionTimes === "object"
          ? b.questionTimes
          : {},
      correctQus: Array.isArray(b.correctQus) ? b.correctQus.map(Number) : [],
      wrongQus: Array.isArray(b.wrongQus) ? b.wrongQus.map(Number) : [],
      answeredQus: Array.isArray(b.answeredQus)
        ? b.answeredQus.map(Number)
        : [],
      notAnsweredQus: Array.isArray(b.notAnsweredQus)
        ? b.notAnsweredQus.map(Number)
        : [],
      markedAndAnswered: Array.isArray(b.markedAndAnswered)
        ? b.markedAndAnswered.map(Number)
        : [],
      markedNotAnswered: Array.isArray(b.markedNotAnswered)
        ? b.markedNotAnswered.map(Number)
        : [],
      shuffledQuestions: Array.isArray(b.shuffledQuestions)
        ? b.shuffledQuestions
        : [],
      sectionScores,
      passingMark: test.passingMark || 40,
    };

    const previousAttempts = await Result.countDocuments({
      testId,
      studentId: req.user._id,
    });
    const isFirstAttempt = previousAttempts === 0;

    const result = await Result.create(payload);

    // ── Percentile ─────────────────────────────────────────────────────
    const totalAttempts = await Result.countDocuments({ testId });
    const below = await Result.countDocuments({
      testId,
      percentage: { $lt: result.percentage },
    });
    const percentile =
      totalAttempts > 1 ? Math.round((below / (totalAttempts - 1)) * 100) : 100;
    await Result.findByIdAndUpdate(result._id, { percentile });

    // ── Mark link visit as completed ───────────────────────────────────
    TestLinkVisit.findOneAndUpdate(
      { testId, userId: req.user._id, completedTest: false },
      { completedTest: true, completedAt: new Date(), resultId: result._id },
      { sort: { createdAt: -1 } },
    ).catch(() => {});

    // ── First attempt: increment counter + socket + notification ───────
    if (isFirstAttempt) {
      Test.findByIdAndUpdate(testId, { $inc: { totalAttempts: 1 } })
        .exec()
        .catch(() => {});

      if (test.coachingId) {
        try {
          const freshTestAttempts = await Result.countDocuments({ testId });
          const freshStudents = await Result.distinct("studentId", {
            coachingId: test.coachingId,
          });

          getIO()
            .to(`coaching:${test.coachingId.toString()}`)
            .emit("test:attempted", {
              coachingId: test.coachingId.toString(),
              testId: testId.toString(),
              testTitle: test.title,
              totalAttempts: freshTestAttempts,
              totalStudents: freshStudents.length,
              studentName: req.user.Name || "A student",
              score: payload.score,
              totalQuestions: payload.totalQuestions,
              percentage: result.percentage,
              timeTaken: payload.timeTaken,
              submittedAt: new Date(),
            });

          // Also notify admin
          getIO()
            .to("room:admin")
            .emit("test:attempted", {
              testId: testId.toString(),
              testTitle: test.title,
              studentName: req.user.Name || "A student",
              percentage: result.percentage,
              coachingId: test.coachingId?.toString(),
            });
        } catch (emitErr) {
          console.error("[socket emit error]", emitErr.message);
        }
      }
    }

    const final = await Result.findById(result._id)
      .populate("testId", "title examType timeLimitMin slug isSectioned")
      .lean();

    return res
      .status(201)
      .json({ message: "Result saved", data: { ...final, percentile } });
  } catch (err) {
    next(err);
  }
});

/* ── GET /results/student/me ──────────────────────────────────────────────── */
router.get("/student/me", requireAuth, async (req, res, next) => {
  try {
    const filter = { studentId: req.user._id };
    if (req.query.testId) filter.testId = req.query.testId;
    const results = await Result.find(filter)
      .sort({ createdAt: -1 })
      .populate("testId", "title examType timeLimitMin slug isSectioned")
      .select("-allAnswers -shuffledQuestions")
      .lean();
    return res.json({ status: 200, data: results });
  } catch (err) {
    next(err);
  }
});

/* ── GET /results/test/:testId ────────────────────────────────────────────── */
router.get("/test/:testId", requireAuth, async (req, res, next) => {
  try {
    const results = await Result.find({ testId: req.params.testId })
      .sort({ percentage: -1, timeTaken: 1 })
      .populate("studentId", "Name Email Phone lastLogin daysSinceLogin")
      .select("-allAnswers -shuffledQuestions")
      .lean();
    return res.json({ status: 200, data: results });
  } catch (err) {
    next(err);
  }
});

/* ── GET /results/:id ─────────────────────────────────────────────────────── */
router.get("/:id", async (req, res, next) => {
  try {
    const result = await Result.findById(req.params.id)
      .populate(
        "testId",
        "title examType timeLimitMin slug questions sections isSectioned",
      )
      .populate("studentId", "Name Email")
      .lean();

    if (!result) return res.status(404).json({ message: "Result not found" });

    const token = req.cookies?._user;
    if (!token)
      return res
        .status(401)
        .json({ message: "Please sign in to view results" });


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
          if (!isOwn && !isAdmin && !isCoach)
            return res.status(403).json({ message: "Not authorised" });
        }
      } catch {
        /* invalid token */
      }
    }

    return res.json({ status: 200, data: result });
  } catch (err) {
    next(err);
  }
});

/* ── DELETE /results/:id ──────────────────────────────────────────────────── */
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

// const express = require("express");
// const Result = require("../models/result.model");
// const Test = require("../models/test.model");
// const TestLinkVisit = require("../models/testLinkVisit.model");
// const { requireAuth } = require("../middlewares/auth.middleware");
// const { getIO } = require("../socket");

// const router = express.Router();

// /* ── POST /results/submit ─────────────────────────────────────────────────── */
// router.post("/submit", requireAuth, async (req, res, next) => {
//   try {
//     const { testId } = req.body;
//     if (!testId) return res.status(400).json({ message: "testId is required" });

//     const test = await Test.findById(testId).lean();
//     if (!test) return res.status(404).json({ message: "Test not found" });

//     // ── Compute per-section scores ─────────────────────────────────────
//     let sectionScores = [];
//     if (
//       test.isSectioned &&
//       Array.isArray(test.sections) &&
//       test.sections.length
//     ) {
//       const allAnswers = req.body.allAnswers || {};
//       const sectionsToScore =
//         Array.isArray(req.body.shuffledSections) &&
//         req.body.shuffledSections.length === test.sections.length
//           ? req.body.shuffledSections
//           : test.sections;

//       let offset = 0;
//       sectionScores = sectionsToScore.map((sec, sIdx) => {
//         const total = sec.questions.length;
//         let score = 0;
//         for (let i = 0; i < total; i++) {
//           const flatIdx = offset + i;
//           const chosen = allAnswers[flatIdx] ?? allAnswers[String(flatIdx)];
//           if (chosen !== undefined && chosen === sec.questions[i].answer)
//             score++;
//         }
//         offset += total;
//         return {
//           name: sec.name || test.sections[sIdx]?.name || `Section ${sIdx + 1}`,
//           subject: sec.subject || test.sections[sIdx]?.subject || "",
//           score,
//           total,
//           percentage: total > 0 ? Math.round((score / total) * 100) : 0,
//         };
//       });
//     }

//     const payload = {
//       ...req.body,
//       studentId: req.user._id,
//       coachingId: test.coachingId || null,
//       sectionScores,
//       shuffledQuestions: Array.isArray(req.body.shuffledQuestions)
//         ? req.body.shuffledQuestions
//         : [],
//     };

//     const previousAttempts = await Result.countDocuments({
//       testId,
//       studentId: req.user._id,
//     });
//     const isFirstAttempt = previousAttempts === 0;

//     const result = await Result.create(payload);

//     // ── Percentile (parallel queries — was sequential) ─────────────────
//     const [totalAttempts, below] = await Promise.all([
//       Result.countDocuments({ testId }),
//       Result.countDocuments({ testId, percentage: { $lt: result.percentage } }),
//     ]);
//     const percentile =
//       totalAttempts > 1 ? Math.round((below / (totalAttempts - 1)) * 100) : 100;
//     await Result.findByIdAndUpdate(result._id, { percentile });

//     // ── Mark link visit as completed ───────────────────────────────────
//     TestLinkVisit.findOneAndUpdate(
//       { testId, userId: req.user._id, completedTest: false },
//       { completedTest: true, completedAt: new Date(), resultId: result._id },
//       { sort: { createdAt: -1 } },
//     ).catch(() => {});

//     // ── First attempt: increment counter + socket + notification ───────
//     if (isFirstAttempt) {
//       Test.findByIdAndUpdate(testId, { $inc: { totalAttempts: 1 } })
//         .exec()
//         .catch(() => {});

//       if (test.coachingId) {
//         try {
//           const freshTestAttempts = await Result.countDocuments({ testId });
//           const freshStudents = await Result.distinct("studentId", {
//             coachingId: test.coachingId,
//           });

//           getIO()
//             .to(`coaching:${test.coachingId.toString()}`)
//             .emit("test:attempted", {
//               coachingId: test.coachingId.toString(),
//               testId: testId.toString(),
//               testTitle: test.title,
//               totalAttempts: freshTestAttempts,
//               totalStudents: freshStudents.length,
//               studentName: req.user.Name || "A student",
//               score: payload.score,
//               totalQuestions: payload.totalQuestions,
//               percentage: result.percentage,
//               timeTaken: payload.timeTaken,
//               submittedAt: new Date(),
//             });

//           // Also notify admin
//           getIO()
//             .to("room:admin")
//             .emit("test:attempted", {
//               testId: testId.toString(),
//               testTitle: test.title,
//               studentName: req.user.Name || "A student",
//               percentage: result.percentage,
//               coachingId: test.coachingId?.toString(),
//             });
//         } catch (emitErr) {
//           console.error("[socket emit error]", emitErr.message);
//         }
//       }
//     }

//     const final = await Result.findById(result._id)
//       .populate("testId", "title examType timeLimitMin slug isSectioned")
//       .lean();

//     return res
//       .status(201)
//       .json({ message: "Result saved", data: { ...final, percentile } });
//   } catch (err) {
//     next(err);
//   }
// });

// /* ── GET /results/student/me ──────────────────────────────────────────────── */
// router.get("/student/me", requireAuth, async (req, res, next) => {
//   try {
//     const filter = { studentId: req.user._id };
//     if (req.query.testId) filter.testId = req.query.testId;
//     const results = await Result.find(filter)
//       .sort({ createdAt: -1 })
//       .populate("testId", "title examType timeLimitMin slug isSectioned")
//       .select("-allAnswers -shuffledQuestions")
//       .lean();
//     return res.json({ status: 200, data: results });
//   } catch (err) {
//     next(err);
//   }
// });

// /* ── GET /results/test/:testId ────────────────────────────────────────────── */
// router.get("/test/:testId", requireAuth, async (req, res, next) => {
//   try {
//     const results = await Result.find({ testId: req.params.testId })
//       .sort({ percentage: -1, timeTaken: 1 })
//       .populate("studentId", "Name Email Phone lastLogin daysSinceLogin")
//       .select("-allAnswers -shuffledQuestions")
//       .lean();
//     return res.json({ status: 200, data: results });
//   } catch (err) {
//     next(err);
//   }
// });

// /* ── GET /results/:id ─────────────────────────────────────────────────────── */
// router.get("/:id", async (req, res, next) => {
//   try {
//     const result = await Result.findById(req.params.id)
//       .populate(
//         "testId",
//         "title examType timeLimitMin slug questions sections isSectioned",
//       )
//       .populate("studentId", "Name Email")
//       .lean();

//     if (!result) return res.status(404).json({ message: "Result not found" });

//     /* ── Auth check ────────────────────────────────────────────────────────
//        Rules:
//          • Student can see their own result.
//          • Admin can see any result.
//          • Coaching owner can see results for their own tests.
//          • Everyone else gets 401/403 — no silent pass-through.
//     ──────────────────────────────────────────────────────────────────────── */
//     const token = req.cookies?._user;

//     // No token at all → block immediately
//     if (!token)
//       return res.status(401).json({ message: "Please sign in to view results" });

//     try {
//       const jwt = require("jsonwebtoken");
//       const User = require("../models/User.model");
//       const JWT_SECRET =
//         process.env.JWT_SECRET || "revisionkarlo_dev_secret_key_32chars";

//       const decoded = jwt.verify(token, JWT_SECRET);
//       const user = await User.findById(decoded._id).select("-Password").lean();

//       // Token valid but user deleted
//       if (!user)
//         return res.status(401).json({ message: "Account not found" });

//       const isOwn =
//         result.studentId?._id?.toString() === user._id.toString();
//       const isAdmin = user.isAdmin;
//       let isCoach = false;

//       if (!isOwn && !isAdmin && result.coachingId) {
//         const Coaching = require("../models/coaching.model");
//         const c = await Coaching.findById(result.coachingId).lean();
//         isCoach = c && c.owner.toString() === user._id.toString();
//       }

//       if (!isOwn && !isAdmin && !isCoach)
//         return res.status(403).json({ message: "Not authorised" });
//     } catch {
//       // Invalid or expired token → treat as unauthenticated
//       return res.status(401).json({ message: "Session expired, please sign in again" });
//     }

//     return res.json({ status: 200, data: result });
//   } catch (err) {
//     next(err);
//   }
// });

// /* ── DELETE /results/:id ──────────────────────────────────────────────────── */
// router.delete("/:id", requireAuth, async (req, res, next) => {
//   try {
//     if (!req.user.isAdmin)
//       return res.status(403).json({ message: "Admin only" });
//     const deleted = await Result.findByIdAndDelete(req.params.id);
//     if (!deleted) return res.status(404).json({ message: "Not found" });
//     return res.json({ message: "Result deleted" });
//   } catch (err) {
//     next(err);
//   }
// });

// module.exports = router;
