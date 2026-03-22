// const express = require("express");
// const Test = require("../models/test.model");
// const Result = require("../models/result.model");
// const Question = require("../models/question.model");
// const Coaching = require("../models/coaching.model");
// const { requireAuth, optionalAuth } = require("../middlewares/auth.middleware");
// const { toSlug } = require("../utils/slug");

// const router = express.Router();

// /* ── helpers ─────────────────────────────────────────────────────────────── */
// const stripPassword = ({ password: _p, ...rest }) => rest;

// /**
//  * ownsCoaching — checks the test's coachingId belongs to req.user
//  */
// async function ownsCoaching(userId, coachingId) {
//   const coaching = await Coaching.findById(coachingId).lean();
//   return coaching && coaching.owner.toString() === userId.toString();
// }

// /* ═══════════════════════════════════════════════════════════════════════════
//    CREATE
// ═══════════════════════════════════════════════════════════════════════════ */

// /* ── POST /tests/create ──────────────────────────────────────────────────────
//    Create a test manually (from questionDocIds or inlineQuestions).
// ──────────────────────────────────────────────────────────────────────────── */
// router.post("/create", requireAuth, async (req, res, next) => {
//   try {
//     const { title, questionDocIds, inlineQuestions, coachingId, ...rest } =
//       req.body;
//     if (!title) return res.status(400).json({ message: "title is required" });

//     // Verify the requesting user owns the coaching they're attaching to
//     if (
//       coachingId &&
//       !(await ownsCoaching(req.user._id, coachingId)) &&
//       !req.user.isAdmin
//     ) {
//       return res
//         .status(403)
//         .json({ message: "Not authorised for this coaching" });
//     }

//     rest.slug = `${toSlug(title)}-${Date.now()}`;
//     rest.createdBy = req.user._id;
//     rest.coachingId = coachingId || null;

//     let questions = [];

//     // Pull from question library
//     if (Array.isArray(questionDocIds) && questionDocIds.length > 0) {
//       const docs = await Question.find({ _id: { $in: questionDocIds } }).lean();
//       docs.forEach((doc) =>
//         doc.question.forEach((item) =>
//           questions.push({ sourceId: item._id, ...item }),
//         ),
//       );
//     }

//     // Inline questions (e.g. typed in by coach)
//     if (Array.isArray(inlineQuestions) && inlineQuestions.length > 0) {
//       questions = [...questions, ...inlineQuestions];
//     }

//     const test = await Test.create({ title, questions, ...rest });
//     return res.status(201).json({ message: "Test created", data: test });
//   } catch (err) {
//     next(err);
//   }
// });

// /* ═══════════════════════════════════════════════════════════════════════════
//    READ — specific named routes MUST come before the /:slug wildcard
// ═══════════════════════════════════════════════════════════════════════════ */

// /* ── GET /tests ──────────────────────────────────────────────────────────────
//    Public list (no questions, no passwords).
// ──────────────────────────────────────────────────────────────────────────── */
// // router.get("/", async (req, res, next) => {
// //   try {
// //     const filter = { isActive: true, visibility: "public" };
// //     if (req.query.coachingId) filter.coachingId = req.query.coachingId;
// //     if (req.query.examType) filter.examType = req.query.examType;
// //     if (req.query.subject) filter.subject = req.query.subject.toLowerCase();

// //     const tests = await Test.find(filter).select("-questions -password").lean();
// //     return res.json({ status: 200, data: tests });
// //   } catch (err) {
// //     next(err);
// //   }
// // });

// // In GET / — add customExamType to filter support
// router.get("/", async (req, res, next) => {
//   try {
//     const filter = { isActive: true, visibility: "public" };
//     if (req.query.coachingId) filter.coachingId = req.query.coachingId;
//     if (req.query.examType) {
//       // Match either the standard enum field OR the custom free-text field
//       filter.$or = [
//         { examType: req.query.examType },
//         { customExamType: new RegExp(`^${req.query.examType}$`, "i") },
//       ];
//     }
//     if (req.query.subject) filter.subject = req.query.subject.toLowerCase();

//     const tests = await Test.find(filter).select("-questions -password").lean();
//     return res.json({ status: 200, data: tests });
//   } catch (err) {
//     next(err);
//   }
// });

// /* ── GET /tests/id/:id ───────────────────────────────────────────────────────
//    Full test by Mongo _id. Coach / admin use — also returns parse status.
// ──────────────────────────────────────────────────────────────────────────── */
// router.get("/id/:id", requireAuth, async (req, res, next) => {
//   try {
//     const test = await Test.findById(req.params.id).lean();
//     if (!test) return res.status(404).json({ message: "Test not found" });

//     // Only owner or admin
//     const isOwner =
//       test.coachingId && (await ownsCoaching(req.user._id, test.coachingId));
//     if (!isOwner && !req.user.isAdmin) {
//       return res.status(403).json({ message: "Not authorised" });
//     }

//     return res.json({ status: 200, data: stripPassword(test) });
//   } catch (err) {
//     next(err);
//   }
// });

// /* ── GET /tests/token/:token ─────────────────────────────────────────────────
//    WhatsApp share-link access — returns full test (student view).
// ──────────────────────────────────────────────────────────────────────────── */
// router.get("/token/:token", optionalAuth, async (req, res, next) => {
//   try {
//     const test = await Test.findOne({
//       accessToken: req.params.token,
//       isActive: true,
//     }).lean();
//     if (!test)
//       return res
//         .status(404)
//         .json({ message: "Test not found or link expired" });

//     const { password: _p, accessToken: _t, ...safeTest } = test;
//     return res.json({ status: 200, data: safeTest });
//   } catch (err) {
//     next(err);
//   }
// });

// /* ── GET /tests/:id/leaderboard ──────────────────────────────────────────────
//    Top 50 results for coach view (must be before /:slug)
// ──────────────────────────────────────────────────────────────────────────── */
// router.get("/:id/leaderboard", requireAuth, async (req, res, next) => {
//   try {
//     const test = await Test.findById(req.params.id).lean();
//     if (!test) return res.status(404).json({ message: "Test not found" });

//     const isOwner =
//       test.coachingId && (await ownsCoaching(req.user._id, test.coachingId));
//     if (!isOwner && !req.user.isAdmin) {
//       return res.status(403).json({ message: "Not authorised" });
//     }

//     const results = await Result.find({ testId: req.params.id })
//       .sort({ percentage: -1, timeTaken: 1 })
//       .limit(50)
//       .populate("studentId", "Name Email Phone")
//       .select(
//         "-allAnswers -correctQus -wrongQus -answeredQus -notAnsweredQus -markedAndAnswered -markedNotAnswered",
//       )
//       .lean();

//     return res.json({ status: 200, data: results });
//   } catch (err) {
//     next(err);
//   }
// });

// /* ── GET /tests/:id/stats ────────────────────────────────────────────────────
//    Aggregate stats — coach dashboard (must be before /:slug)
// ──────────────────────────────────────────────────────────────────────────── */
// router.get("/:id/stats", requireAuth, async (req, res, next) => {
//   try {
//     const test = await Test.findById(req.params.id).lean();
//     if (!test) return res.status(404).json({ message: "Test not found" });

//     const isOwner =
//       test.coachingId && (await ownsCoaching(req.user._id, test.coachingId));
//     if (!isOwner && !req.user.isAdmin) {
//       return res.status(403).json({ message: "Not authorised" });
//     }

//     const results = await Result.find({ testId: req.params.id }).lean();
//     if (!results.length) {
//       return res.json({
//         status: 200,
//         data: {
//           totalAttempts: 0,
//           avgPercentage: 0,
//           passCount: 0,
//           passRate: 0,
//           highestScore: 0,
//           lowestScore: 0,
//         },
//       });
//     }

//     const scores = results.map((r) => r.percentage || 0);
//     const totalAttempts = results.length;
//     const avgPercentage = Math.round(
//       scores.reduce((a, b) => a + b, 0) / totalAttempts,
//     );
//     const passCount = results.filter((r) => r.isPassed).length;

//     return res.json({
//       status: 200,
//       data: {
//         totalAttempts,
//         avgPercentage,
//         passCount,
//         passRate: Math.round((passCount / totalAttempts) * 100),
//         highestScore: Math.max(...scores),
//         lowestScore: Math.min(...scores),
//       },
//     });
//   } catch (err) {
//     next(err);
//   }
// });

// /* ── PATCH /tests/:id ────────────────────────────────────────────────────────
//    Update test fields. Owner only.
// ──────────────────────────────────────────────────────────────────────────── */
// router.patch("/:id", requireAuth, async (req, res, next) => {
//   try {
//     const test = await Test.findById(req.params.id).lean();
//     if (!test) return res.status(404).json({ message: "Not found" });

//     const isOwner =
//       test.coachingId && (await ownsCoaching(req.user._id, test.coachingId));
//     if (!isOwner && !req.user.isAdmin) {
//       return res.status(403).json({ message: "Not authorised" });
//     }

//     // Never let clients overwrite sensitive fields this way
//     delete req.body.createdBy;
//     delete req.body.accessToken;
//     delete req.body.totalAttempts;

//     const updated = await Test.findByIdAndUpdate(req.params.id, req.body, {
//       new: true,
//       runValidators: true,
//     }).lean();

//     return res.json({ message: "Test updated", data: stripPassword(updated) });
//   } catch (err) {
//     next(err);
//   }
// });

// /* ── DELETE /tests/:id  (soft delete) ────────────────────────────────────── */
// router.delete("/:id", requireAuth, async (req, res, next) => {
//   try {
//     const test = await Test.findById(req.params.id).lean();
//     if (!test) return res.status(404).json({ message: "Not found" });

//     const isOwner =
//       test.coachingId && (await ownsCoaching(req.user._id, test.coachingId));
//     if (!isOwner && !req.user.isAdmin) {
//       return res.status(403).json({ message: "Not authorised" });
//     }

//     await Test.findByIdAndUpdate(req.params.id, { isActive: false });
//     return res.json({ message: "Test deactivated" });
//   } catch (err) {
//     next(err);
//   }
// });

// /* ── GET /tests/:slug ────────────────────────────────────────────────────────
//    Public test page by slug — MUST be last route.
//    Private tests require ?password=xxx
// ──────────────────────────────────────────────────────────────────────────── */
// router.get("/:slug", optionalAuth, async (req, res, next) => {
//   try {
//     const test = await Test.findOne({
//       slug: req.params.slug,
//       isActive: true,
//     }).lean();
//     if (!test) return res.status(404).json({ message: "Test not found" });

//     if (test.visibility === "private") {
//       if (!req.query.password || req.query.password !== test.password) {
//         return res.status(403).json({ message: "Invalid or missing password" });
//       }
//     }

//     const { password: _p, ...safeTest } = test;
//     return res.json({ status: 200, data: safeTest });
//   } catch (err) {
//     next(err);
//   }
// });

// module.exports = router;

// const express = require("express");
// const Test = require("../models/test.model");
// const Result = require("../models/result.model");
// const Question = require("../models/question.model");
// const Coaching = require("../models/coaching.model");
// const { requireAuth, optionalAuth } = require("../middlewares/auth.middleware");
// const { toSlug } = require("../utils/slug");

// const router = express.Router();

// /* ── helpers ─────────────────────────────────────────────────────────────── */
// const stripPassword = ({ password: _p, ...rest }) => rest;

// /**
//  * ownsCoaching — checks the test's coachingId belongs to req.user
//  */
// async function ownsCoaching(userId, coachingId) {
//   const coaching = await Coaching.findById(coachingId).lean();
//   return coaching && coaching.owner.toString() === userId.toString();
// }

// /* ═══════════════════════════════════════════════════════════════════════════
//    CREATE
// ═══════════════════════════════════════════════════════════════════════════ */

// /* ── POST /tests/create ──────────────────────────────────────────────────────
//    Create a test manually (from questionDocIds or inlineQuestions).
// ──────────────────────────────────────────────────────────────────────────── */
// router.post("/create", requireAuth, async (req, res, next) => {
//   try {
//     const { title, questionDocIds, inlineQuestions, coachingId, ...rest } =
//       req.body;
//     if (!title) return res.status(400).json({ message: "title is required" });

//     // Verify the requesting user owns the coaching they're attaching to
//     if (
//       coachingId &&
//       !(await ownsCoaching(req.user._id, coachingId)) &&
//       !req.user.isAdmin
//     ) {
//       return res
//         .status(403)
//         .json({ message: "Not authorised for this coaching" });
//     }

//     rest.slug = `${toSlug(title)}-${Date.now()}`;
//     rest.createdBy = req.user._id;
//     rest.coachingId = coachingId || null;

//     let questions = [];

//     // Pull from question library
//     if (Array.isArray(questionDocIds) && questionDocIds.length > 0) {
//       const docs = await Question.find({ _id: { $in: questionDocIds } }).lean();
//       docs.forEach((doc) =>
//         doc.question.forEach((item) =>
//           questions.push({ sourceId: item._id, ...item }),
//         ),
//       );
//     }

//     // Inline questions (e.g. typed in by coach)
//     if (Array.isArray(inlineQuestions) && inlineQuestions.length > 0) {
//       questions = [...questions, ...inlineQuestions];
//     }

//     const test = await Test.create({ title, questions, ...rest });
//     return res.status(201).json({ message: "Test created", data: test });
//   } catch (err) {
//     next(err);
//   }
// });

// /* ═══════════════════════════════════════════════════════════════════════════
//    READ — specific named routes MUST come before the /:slug wildcard
// ═══════════════════════════════════════════════════════════════════════════ */

// /* ── GET /tests ──────────────────────────────────────────────────────────────
//    Public list (no questions, no passwords).
// ──────────────────────────────────────────────────────────────────────────── */
// // router.get("/", async (req, res, next) => {
// //   try {
// //     const filter = { isActive: true, visibility: "public" };
// //     if (req.query.coachingId) filter.coachingId = req.query.coachingId;
// //     if (req.query.examType) filter.examType = req.query.examType;
// //     if (req.query.subject) filter.subject = req.query.subject.toLowerCase();

// //     const tests = await Test.find(filter).select("-questions -password").lean();
// //     return res.json({ status: 200, data: tests });
// //   } catch (err) {
// //     next(err);
// //   }
// // });

// // In GET / — add customExamType to filter support
// router.get("/", async (req, res, next) => {
//   try {
//     const filter = { isActive: true, visibility: "public" };
//     if (req.query.coachingId) filter.coachingId = req.query.coachingId;
//     if (req.query.examType) {
//       // Match either the standard enum field OR the custom free-text field
//       filter.$or = [
//         { examType: req.query.examType },
//         { customExamType: new RegExp(`^${req.query.examType}$`, "i") },
//       ];
//     }
//     if (req.query.subject) filter.subject = req.query.subject.toLowerCase();

//     const tests = await Test.find(filter).select("-questions -password").lean();
//     return res.json({ status: 200, data: tests });
//   } catch (err) {
//     next(err);
//   }
// });

// /* ── GET /tests/id/:id ───────────────────────────────────────────────────────
//    Full test by Mongo _id. Coach / admin use — also returns parse status.
// ──────────────────────────────────────────────────────────────────────────── */
// router.get("/id/:id", requireAuth, async (req, res, next) => {
//   try {
//     const test = await Test.findById(req.params.id).lean();
//     if (!test) return res.status(404).json({ message: "Test not found" });

//     // Only owner or admin
//     const isOwner =
//       test.coachingId && (await ownsCoaching(req.user._id, test.coachingId));
//     if (!isOwner && !req.user.isAdmin) {
//       return res.status(403).json({ message: "Not authorised" });
//     }

//     return res.json({ status: 200, data: stripPassword(test) });
//   } catch (err) {
//     next(err);
//   }
// });

// /* ── GET /tests/token/:token ─────────────────────────────────────────────────
//    WhatsApp share-link access — returns full test (student view).
// ──────────────────────────────────────────────────────────────────────────── */
// router.get("/token/:token", optionalAuth, async (req, res, next) => {
//   try {
//     const test = await Test.findOne({
//       accessToken: req.params.token,
//       isActive: true,
//     }).lean();
//     if (!test)
//       return res
//         .status(404)
//         .json({ message: "Test not found or link expired" });

//     const { password: _p, accessToken: _t, ...safeTest } = test;
//     return res.json({ status: 200, data: safeTest });
//   } catch (err) {
//     next(err);
//   }
// });

// /* ── GET /tests/:id/leaderboard ──────────────────────────────────────────────
//    Top 50 results for coach view (must be before /:slug)
// ──────────────────────────────────────────────────────────────────────────── */
// router.get("/:id/leaderboard", requireAuth, async (req, res, next) => {
//   try {
//     const test = await Test.findById(req.params.id).lean();
//     if (!test) return res.status(404).json({ message: "Test not found" });

//     const isOwner =
//       test.coachingId && (await ownsCoaching(req.user._id, test.coachingId));
//     if (!isOwner && !req.user.isAdmin) {
//       return res.status(403).json({ message: "Not authorised" });
//     }

//     const results = await Result.find({ testId: req.params.id })
//       .sort({ percentage: -1, timeTaken: 1 })
//       .limit(50)
//       .populate("studentId", "Name Email Phone")
//       .select(
//         "-allAnswers -correctQus -wrongQus -answeredQus -notAnsweredQus -markedAndAnswered -markedNotAnswered",
//       )
//       .lean();

//     return res.json({ status: 200, data: results });
//   } catch (err) {
//     next(err);
//   }
// });

// /* ── GET /tests/:id/stats ────────────────────────────────────────────────────
//    Aggregate stats — coach dashboard (must be before /:slug)
// ──────────────────────────────────────────────────────────────────────────── */
// router.get("/:id/stats", requireAuth, async (req, res, next) => {
//   try {
//     const test = await Test.findById(req.params.id).lean();
//     if (!test) return res.status(404).json({ message: "Test not found" });

//     const isOwner =
//       test.coachingId && (await ownsCoaching(req.user._id, test.coachingId));
//     if (!isOwner && !req.user.isAdmin) {
//       return res.status(403).json({ message: "Not authorised" });
//     }

//     const results = await Result.find({ testId: req.params.id }).lean();
//     if (!results.length) {
//       return res.json({
//         status: 200,
//         data: {
//           totalAttempts: 0,
//           avgPercentage: 0,
//           passCount: 0,
//           passRate: 0,
//           highestScore: 0,
//           lowestScore: 0,
//         },
//       });
//     }

//     const scores = results.map((r) => r.percentage || 0);
//     const totalAttempts = results.length;
//     const avgPercentage = Math.round(
//       scores.reduce((a, b) => a + b, 0) / totalAttempts,
//     );
//     const passCount = results.filter((r) => r.isPassed).length;

//     return res.json({
//       status: 200,
//       data: {
//         totalAttempts,
//         avgPercentage,
//         passCount,
//         passRate: Math.round((passCount / totalAttempts) * 100),
//         highestScore: Math.max(...scores),
//         lowestScore: Math.min(...scores),
//       },
//     });
//   } catch (err) {
//     next(err);
//   }
// });

// /* ── PATCH /tests/:id ────────────────────────────────────────────────────────
//    Update test fields. Owner only.
// ──────────────────────────────────────────────────────────────────────────── */
// router.patch("/:id", requireAuth, async (req, res, next) => {
//   try {
//     const test = await Test.findById(req.params.id).lean();
//     if (!test) return res.status(404).json({ message: "Not found" });

//     const isOwner =
//       test.coachingId && (await ownsCoaching(req.user._id, test.coachingId));
//     if (!isOwner && !req.user.isAdmin) {
//       return res.status(403).json({ message: "Not authorised" });
//     }

//     // Never let clients overwrite sensitive fields this way
//     delete req.body.createdBy;
//     delete req.body.accessToken;
//     delete req.body.totalAttempts;

//     const updated = await Test.findByIdAndUpdate(req.params.id, req.body, {
//       new: true,
//       runValidators: true,
//     }).lean();

//     return res.json({ message: "Test updated", data: stripPassword(updated) });
//   } catch (err) {
//     next(err);
//   }
// });

// /* ── DELETE /tests/:id  (soft delete) ────────────────────────────────────── */
// router.delete("/:id", requireAuth, async (req, res, next) => {
//   try {
//     const test = await Test.findById(req.params.id).lean();
//     if (!test) return res.status(404).json({ message: "Not found" });

//     const isOwner =
//       test.coachingId && (await ownsCoaching(req.user._id, test.coachingId));
//     if (!isOwner && !req.user.isAdmin) {
//       return res.status(403).json({ message: "Not authorised" });
//     }

//     await Test.findByIdAndUpdate(req.params.id, { isActive: false });
//     return res.json({ message: "Test deactivated" });
//   } catch (err) {
//     next(err);
//   }
// });

// /* ── GET /tests/:slug ────────────────────────────────────────────────────────
//    Public test page by slug — MUST be last route.
//    Private tests require ?password=xxx
// ──────────────────────────────────────────────────────────────────────────── */
// router.get("/:slug", optionalAuth, async (req, res, next) => {
//   try {
//     const test = await Test.findOne({
//       slug: req.params.slug,
//       isActive: true,
//     }).lean();
//     if (!test) return res.status(404).json({ message: "Test not found" });

//     if (test.visibility === "private") {
//       if (!req.query.password || req.query.password !== test.password) {
//         return res.status(403).json({ message: "Invalid or missing password" });
//       }
//     }

//     const { password: _p, ...safeTest } = test;
//     return res.json({ status: 200, data: safeTest });
//   } catch (err) {
//     next(err);
//   }
// });

// module.exports = router;

const express = require("express");
const Test = require("../models/test.model");
const Result = require("../models/result.model");
const Question = require("../models/question.model");
const Coaching = require("../models/coaching.model");
const TestLinkVisit = require("../models/testLinkVisit.model");
const { requireAuth, optionalAuth } = require("../middlewares/auth.middleware");
const { toSlug } = require("../utils/slug");

const router = express.Router();

const stripPassword = ({ password: _p, ...rest }) => rest;

async function ownsCoaching(userId, coachingId) {
  const coaching = await Coaching.findById(coachingId).lean();
  return coaching && coaching.owner.toString() === userId.toString();
}

/* ── POST /tests/create ───────────────────────────────────────────────────── */
router.post("/create", requireAuth, async (req, res, next) => {
  try {
    const {
      title,
      questionDocIds,
      inlineQuestions,
      coachingId,
      sections,
      ...rest
    } = req.body;

    if (!title) return res.status(400).json({ message: "title is required" });

    if (
      coachingId &&
      !(await ownsCoaching(req.user._id, coachingId)) &&
      !req.user.isAdmin
    )
      return res
        .status(403)
        .json({ message: "Not authorised for this coaching" });

    rest.slug = `${toSlug(title)}-${Date.now()}`;
    rest.createdBy = req.user._id;
    rest.coachingId = coachingId || null;

    const isSectioned = Array.isArray(sections) && sections.length > 1;
    rest.isSectioned = isSectioned;

    if (isSectioned) {
      rest.sections = sections;
      rest.questions = [];
    } else {
      let questions = [];
      if (Array.isArray(questionDocIds) && questionDocIds.length > 0) {
        const docs = await Question.find({
          _id: { $in: questionDocIds },
        }).lean();
        docs.forEach((doc) =>
          doc.question.forEach((item) =>
            questions.push({ sourceId: item._id, ...item }),
          ),
        );
      }
      if (Array.isArray(inlineQuestions) && inlineQuestions.length > 0)
        questions = [...questions, ...inlineQuestions];

      rest.questions = questions;
      rest.sections = [];
    }

    // Explicitly build the create payload — never spread unknown rest fields
    const createPayload = {
      title,
      createdBy: req.user._id,
      coachingId: coachingId || null,
      slug: rest.slug,
      examType: rest.examType,
      customExamType: rest.customExamType || "",
      subject: rest.subject || "",
      timeLimitMin: rest.timeLimitMin || 30,
      visibility: rest.visibility || "public",
      password: rest.password || "",
      startsAt: rest.startsAt || null,
      endsAt: rest.endsAt || null,
      isActive: rest.isActive !== undefined ? rest.isActive : true,
      isSectioned: rest.isSectioned || false,
      sections: rest.sections || [],
      questions: rest.questions || [],
    };
    const test = await Test.create(createPayload);
    return res.status(201).json({ message: "Test created", data: test });
  } catch (err) {
    next(err);
  }
});

/* ── GET /tests ───────────────────────────────────────────────────────────── */
router.get("/", async (req, res, next) => {
  try {
    const filter = { isActive: true, visibility: "public" };
    if (req.query.coachingId) filter.coachingId = req.query.coachingId;
    if (req.query.examType) {
      filter.$or = [
        { examType: req.query.examType },
        { customExamType: new RegExp(`^${req.query.examType}$`, "i") },
      ];
    }
    if (req.query.subject) filter.subject = req.query.subject.toLowerCase();

    const tests = await Test.find(filter)
      .select("-questions -sections -password")
      .lean();
    return res.json({ status: 200, data: tests });
  } catch (err) {
    next(err);
  }
});

/* ── GET /tests/id/:id ────────────────────────────────────────────────────── */
router.get("/id/:id", requireAuth, async (req, res, next) => {
  try {
    const test = await Test.findById(req.params.id).lean();
    if (!test) return res.status(404).json({ message: "Test not found" });

    const isOwner =
      test.coachingId && (await ownsCoaching(req.user._id, test.coachingId));
    if (!isOwner && !req.user.isAdmin)
      return res.status(403).json({ message: "Not authorised" });

    return res.json({ status: 200, data: stripPassword(test) });
  } catch (err) {
    next(err);
  }
});

/* ── GET /tests/token/:token ──────────────────────────────────────────────────
   WhatsApp share-link access. Records a TestLinkVisit every time.
──────────────────────────────────────────────────────────────────────────── */
router.get("/token/:token", optionalAuth, async (req, res, next) => {
  try {
    const test = await Test.findOne({
      accessToken: req.params.token,
      isActive: true,
    }).lean();
    if (!test)
      return res
        .status(404)
        .json({ message: "Test not found or link expired" });

    // ── Record link visit (async, non-blocking) ────────────────────────
    const userId = req.user?._id || null;
    const wasLoggedIn = !!req.user;
    let daysSinceLastLogin = null;

    if (req.user?.lastLogin) {
      daysSinceLastLogin = Math.floor(
        (Date.now() - new Date(req.user.lastLogin).getTime()) / 86400000,
      );
    }

    TestLinkVisit.create({
      testId: test._id,
      coachingId: test.coachingId || null,
      userId,
      wasLoggedIn,
      daysSinceLastLogin,
      accessVia: "token",
      userAgent: req.headers["user-agent"] || "",
      ipAddress: req.ip || "",
    }).catch((e) => console.warn("[visit-track]", e.message));

    const { password: _p, accessToken: _t, ...safeTest } = test;
    return res.json({ status: 200, data: safeTest });
  } catch (err) {
    next(err);
  }
});

/* ── POST /tests/token/:token/start ──────────────────────────────────────────
   Student pressed "Start Test". Updates the existing visit record.
──────────────────────────────────────────────────────────────────────────── */
router.post("/token/:token/start", optionalAuth, async (req, res, next) => {
  try {
    const test = await Test.findOne({
      accessToken: req.params.token,
      isActive: true,
    }).lean();
    if (!test) return res.status(404).json({ message: "Test not found" });

    const userId = req.user?._id || null;
    const now = new Date();

    // Update most-recent visit for this user+test combo (set startedAt)
    if (userId) {
      await TestLinkVisit.findOneAndUpdate(
        { testId: test._id, userId, startedTest: false },
        { startedTest: true, startedAt: now },
        { sort: { createdAt: -1 } },
      );
    }

    return res.json({ message: "Test started", testId: test._id });
  } catch (err) {
    next(err);
  }
});

/* ── GET /tests/:id/visits ───────────────────────────────────────────────────
   Admin only: see all link visits for a test (who opened, started, finished).
──────────────────────────────────────────────────────────────────────────── */
router.get("/:id/visits", requireAuth, async (req, res, next) => {
  try {
    if (!req.user.isAdmin)
      return res.status(403).json({ message: "Admin only" });

    const test = await Test.findById(req.params.id).lean();
    if (!test) return res.status(404).json({ message: "Test not found" });

    const visits = await TestLinkVisit.find({ testId: req.params.id })
      .populate("userId", "Name Email Phone lastLogin lastSeen isOnline")
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ status: 200, data: visits });
  } catch (err) {
    next(err);
  }
});

/* ── GET /tests/:id/leaderboard ───────────────────────────────────────────── */
router.get("/:id/leaderboard", requireAuth, async (req, res, next) => {
  try {
    const test = await Test.findById(req.params.id).lean();
    if (!test) return res.status(404).json({ message: "Test not found" });

    const isOwner =
      test.coachingId && (await ownsCoaching(req.user._id, test.coachingId));
    if (!isOwner && !req.user.isAdmin)
      return res.status(403).json({ message: "Not authorised" });

    const results = await Result.find({ testId: req.params.id })
      .sort({ percentage: -1, timeTaken: 1 })
      .limit(50)
      .populate("studentId", "Name Email Phone lastLogin")
      .select(
        "-allAnswers -correctQus -wrongQus -answeredQus -notAnsweredQus -markedAndAnswered -markedNotAnswered",
      )
      .lean();

    return res.json({ status: 200, data: results });
  } catch (err) {
    next(err);
  }
});

/* ── GET /tests/:id/stats ─────────────────────────────────────────────────── */
router.get("/:id/stats", requireAuth, async (req, res, next) => {
  try {
    const test = await Test.findById(req.params.id).lean();
    if (!test) return res.status(404).json({ message: "Test not found" });

    const isOwner =
      test.coachingId && (await ownsCoaching(req.user._id, test.coachingId));
    if (!isOwner && !req.user.isAdmin)
      return res.status(403).json({ message: "Not authorised" });

    const results = await Result.find({ testId: req.params.id }).lean();

    const visitStats = await TestLinkVisit.aggregate([
      { $match: { testId: test._id } },
      {
        $group: {
          _id: null,
          totalViews: { $sum: 1 },
          loggedInViews: { $sum: { $cond: ["$wasLoggedIn", 1, 0] } },
          guestViews: { $sum: { $cond: ["$wasLoggedIn", 0, 1] } },
          started: { $sum: { $cond: ["$startedTest", 1, 0] } },
          completed: { $sum: { $cond: ["$completedTest", 1, 0] } },
        },
      },
    ]);
    const vStats = visitStats[0] || {
      totalViews: 0,
      loggedInViews: 0,
      guestViews: 0,
      started: 0,
      completed: 0,
    };

    if (!results.length) {
      return res.json({
        status: 200,
        data: {
          totalAttempts: 0,
          avgPercentage: 0,
          passCount: 0,
          passRate: 0,
          highestScore: 0,
          lowestScore: 0,
          sectionStats: test.isSectioned
            ? test.sections.map((s) => ({
                name: s.name,
                subject: s.subject,
                avgPercentage: 0,
              }))
            : [],
          visitStats: vStats,
        },
      });
    }

    const scores = results.map((r) => r.percentage || 0);
    const totalAttempts = results.length;
    const avgPercentage = Math.round(
      scores.reduce((a, b) => a + b, 0) / totalAttempts,
    );
    const passCount = results.filter((r) => r.isPassed).length;

    let sectionStats = [];
    if (test.isSectioned && test.sections?.length) {
      sectionStats = test.sections.map((sec) => {
        const secPcts = results
          .flatMap((r) => r.sectionScores || [])
          .filter((ss) => ss.name === sec.name)
          .map((ss) => ss.percentage || 0);
        return {
          name: sec.name,
          subject: sec.subject,
          totalQuestions: sec.questions.length,
          avgPercentage: secPcts.length
            ? Math.round(secPcts.reduce((a, b) => a + b, 0) / secPcts.length)
            : 0,
        };
      });
    }

    return res.json({
      status: 200,
      data: {
        totalAttempts,
        avgPercentage,
        passCount,
        passRate: Math.round((passCount / totalAttempts) * 100),
        highestScore: Math.max(...scores),
        lowestScore: Math.min(...scores),
        sectionStats,
        visitStats: vStats,
      },
    });
  } catch (err) {
    next(err);
  }
});

/* ── PATCH /tests/:id ─────────────────────────────────────────────────────── */
router.patch("/:id", requireAuth, async (req, res, next) => {
  try {
    const test = await Test.findById(req.params.id).lean();
    if (!test) return res.status(404).json({ message: "Not found" });

    const isOwner =
      test.coachingId && (await ownsCoaching(req.user._id, test.coachingId));
    if (!isOwner && !req.user.isAdmin)
      return res.status(403).json({ message: "Not authorised" });

    // Whitelist updatable fields — never pass raw req.body to DB update
    const b = req.body;
    const allowedUpdate = {};
    const updatableFields = [
      "title","examType","customExamType","subject","questions","sections",
      "timeLimitMin","visibility","password","startsAt","endsAt","isActive",
    ];
    updatableFields.forEach((k) => { if (b[k] !== undefined) allowedUpdate[k] = b[k]; });
    // Recalculate totalMarks server-side — never trust client value
    if (allowedUpdate.questions) allowedUpdate.totalMarks = allowedUpdate.questions.length;

    const updated = await Test.findByIdAndUpdate(req.params.id, allowedUpdate, {
      new: true,
      runValidators: true,
    }).lean();

    return res.json({ message: "Test updated", data: stripPassword(updated) });
  } catch (err) {
    next(err);
  }
});

/* ── DELETE /tests/:id ────────────────────────────────────────────────────── */
router.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    const test = await Test.findById(req.params.id).lean();
    if (!test) return res.status(404).json({ message: "Not found" });

    const isOwner =
      test.coachingId && (await ownsCoaching(req.user._id, test.coachingId));
    if (!isOwner && !req.user.isAdmin)
      return res.status(403).json({ message: "Not authorised" });

    await Test.findByIdAndUpdate(req.params.id, { isActive: false });
    return res.json({ message: "Test deactivated" });
  } catch (err) {
    next(err);
  }
});

/* ── GET /tests/:slug — MUST be last ─────────────────────────────────────── */
router.get("/:slug", optionalAuth, async (req, res, next) => {
  try {
    const test = await Test.findOne({
      slug: req.params.slug,
      isActive: true,
    }).lean();
    if (!test) return res.status(404).json({ message: "Test not found" });

    if (test.visibility === "private") {
      if (!req.query.password || req.query.password !== test.password)
        return res.status(403).json({ message: "Invalid or missing password" });
    }

    const { password: _p, ...safeTest } = test;
    return res.json({ status: 200, data: safeTest });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
// const express = require("express");
// const Test = require("../models/test.model");
// const Result = require("../models/result.model");
// const Question = require("../models/question.model");
// const Coaching = require("../models/coaching.model");
// const TestLinkVisit = require("../models/testLinkVisit.model");
// const { requireAuth, optionalAuth } = require("../middlewares/auth.middleware");
// const { toSlug } = require("../utils/slug");

// const router = express.Router();

// const stripPassword = ({ password: _p, ...rest }) => rest;

// async function ownsCoaching(userId, coachingId) {
//   const coaching = await Coaching.findById(coachingId).lean();
//   return coaching && coaching.owner.toString() === userId.toString();
// }

// /* ── POST /tests/create ───────────────────────────────────────────────────── */
// router.post("/create", requireAuth, async (req, res, next) => {
//   try {
//     const {
//       title,
//       questionDocIds,
//       inlineQuestions,
//       coachingId,
//       sections,
//       ...rest
//     } = req.body;

//     if (!title) return res.status(400).json({ message: "title is required" });

//     if (
//       coachingId &&
//       !(await ownsCoaching(req.user._id, coachingId)) &&
//       !req.user.isAdmin
//     )
//       return res
//         .status(403)
//         .json({ message: "Not authorised for this coaching" });

//     rest.slug = `${toSlug(title)}-${Date.now()}`;
//     rest.createdBy = req.user._id;
//     rest.coachingId = coachingId || null;

//     const isSectioned = Array.isArray(sections) && sections.length > 1;
//     rest.isSectioned = isSectioned;

//     if (isSectioned) {
//       rest.sections = sections;
//       rest.questions = [];
//     } else {
//       let questions = [];
//       if (Array.isArray(questionDocIds) && questionDocIds.length > 0) {
//         const docs = await Question.find({
//           _id: { $in: questionDocIds },
//         }).lean();
//         docs.forEach((doc) =>
//           doc.question.forEach((item) =>
//             questions.push({ sourceId: item._id, ...item }),
//           ),
//         );
//       }
//       if (Array.isArray(inlineQuestions) && inlineQuestions.length > 0)
//         questions = [...questions, ...inlineQuestions];

//       rest.questions = questions;
//       rest.sections = [];
//     }

//     const test = await Test.create({ title, ...rest });
//     return res.status(201).json({ message: "Test created", data: test });
//   } catch (err) {
//     next(err);
//   }
// });

// /* ── GET /tests ───────────────────────────────────────────────────────────── */
// router.get("/", async (req, res, next) => {
//   try {
//     const filter = { isActive: true, visibility: "public" };
//     if (req.query.coachingId) filter.coachingId = req.query.coachingId;
//     if (req.query.examType) {
//       filter.$or = [
//         { examType: req.query.examType },
//         { customExamType: new RegExp(`^${req.query.examType}$`, "i") },
//       ];
//     }
//     if (req.query.subject) filter.subject = req.query.subject.toLowerCase();

//     const tests = await Test.find(filter)
//       .select("-questions -sections -password")
//       .lean();
//     return res.json({ status: 200, data: tests });
//   } catch (err) {
//     next(err);
//   }
// });

// /* ── GET /tests/id/:id ────────────────────────────────────────────────────── */
// router.get("/id/:id", requireAuth, async (req, res, next) => {
//   try {
//     const test = await Test.findById(req.params.id).lean();
//     if (!test) return res.status(404).json({ message: "Test not found" });

//     const isOwner =
//       test.coachingId && (await ownsCoaching(req.user._id, test.coachingId));
//     if (!isOwner && !req.user.isAdmin)
//       return res.status(403).json({ message: "Not authorised" });

//     return res.json({ status: 200, data: stripPassword(test) });
//   } catch (err) {
//     next(err);
//   }
// });

// /* ── GET /tests/token/:token ──────────────────────────────────────────────────
//    WhatsApp share-link access. Records a TestLinkVisit every time.
// ──────────────────────────────────────────────────────────────────────────── */
// router.get("/token/:token", optionalAuth, async (req, res, next) => {
//   try {
//     const test = await Test.findOne({
//       accessToken: req.params.token,
//       isActive: true,
//     }).lean();
//     if (!test)
//       return res
//         .status(404)
//         .json({ message: "Test not found or link expired" });

//     // ── Record link visit (async, non-blocking) ────────────────────────
//     const userId = req.user?._id || null;
//     const wasLoggedIn = !!req.user;
//     let daysSinceLastLogin = null;

//     if (req.user?.lastLogin) {
//       daysSinceLastLogin = Math.floor(
//         (Date.now() - new Date(req.user.lastLogin).getTime()) / 86400000,
//       );
//     }

//     TestLinkVisit.create({
//       testId: test._id,
//       coachingId: test.coachingId || null,
//       userId,
//       wasLoggedIn,
//       daysSinceLastLogin,
//       accessVia: "token",
//       userAgent: req.headers["user-agent"] || "",
//       ipAddress: req.ip || "",
//     }).catch((e) => console.warn("[visit-track]", e.message));

//     const { password: _p, accessToken: _t, ...safeTest } = test;
//     return res.json({ status: 200, data: safeTest });
//   } catch (err) {
//     next(err);
//   }
// });

// /* ── POST /tests/token/:token/start ──────────────────────────────────────────
//    Student pressed "Start Test". Updates the existing visit record.
// ──────────────────────────────────────────────────────────────────────────── */
// router.post("/token/:token/start", optionalAuth, async (req, res, next) => {
//   try {
//     const test = await Test.findOne({
//       accessToken: req.params.token,
//       isActive: true,
//     }).lean();
//     if (!test) return res.status(404).json({ message: "Test not found" });

//     const userId = req.user?._id || null;
//     const now = new Date();

//     // Update most-recent visit for this user+test combo (set startedAt)
//     if (userId) {
//       await TestLinkVisit.findOneAndUpdate(
//         { testId: test._id, userId, startedTest: false },
//         { startedTest: true, startedAt: now },
//         { sort: { createdAt: -1 } },
//       );
//     }

//     return res.json({ message: "Test started", testId: test._id });
//   } catch (err) {
//     next(err);
//   }
// });

// /* ── GET /tests/:id/visits ───────────────────────────────────────────────────
//    Admin only: see all link visits for a test (who opened, started, finished).
// ──────────────────────────────────────────────────────────────────────────── */
// router.get("/:id/visits", requireAuth, async (req, res, next) => {
//   try {
//     if (!req.user.isAdmin)
//       return res.status(403).json({ message: "Admin only" });

//     const test = await Test.findById(req.params.id).lean();
//     if (!test) return res.status(404).json({ message: "Test not found" });

//     const visits = await TestLinkVisit.find({ testId: req.params.id })
//       .populate("userId", "Name Email Phone lastLogin lastSeen isOnline")
//       .sort({ createdAt: -1 })
//       .lean();

//     return res.json({ status: 200, data: visits });
//   } catch (err) {
//     next(err);
//   }
// });

// /* ── GET /tests/:id/leaderboard ───────────────────────────────────────────── */
// router.get("/:id/leaderboard", requireAuth, async (req, res, next) => {
//   try {
//     const test = await Test.findById(req.params.id).lean();
//     if (!test) return res.status(404).json({ message: "Test not found" });

//     const isOwner =
//       test.coachingId && (await ownsCoaching(req.user._id, test.coachingId));
//     if (!isOwner && !req.user.isAdmin)
//       return res.status(403).json({ message: "Not authorised" });

//     const results = await Result.find({ testId: req.params.id })
//       .sort({ percentage: -1, timeTaken: 1 })
//       .limit(50)
//       .populate("studentId", "Name Email Phone lastLogin")
//       .select(
//         "-allAnswers -correctQus -wrongQus -answeredQus -notAnsweredQus -markedAndAnswered -markedNotAnswered",
//       )
//       .lean();

//     return res.json({ status: 200, data: results });
//   } catch (err) {
//     next(err);
//   }
// });

// /* ── GET /tests/:id/stats ─────────────────────────────────────────────────── */
// router.get("/:id/stats", requireAuth, async (req, res, next) => {
//   try {
//     const test = await Test.findById(req.params.id).lean();
//     if (!test) return res.status(404).json({ message: "Test not found" });

//     const isOwner =
//       test.coachingId && (await ownsCoaching(req.user._id, test.coachingId));
//     if (!isOwner && !req.user.isAdmin)
//       return res.status(403).json({ message: "Not authorised" });

//     const results = await Result.find({ testId: req.params.id }).lean();

//     const visitStats = await TestLinkVisit.aggregate([
//       { $match: { testId: test._id } },
//       {
//         $group: {
//           _id: null,
//           totalViews: { $sum: 1 },
//           loggedInViews: { $sum: { $cond: ["$wasLoggedIn", 1, 0] } },
//           guestViews: { $sum: { $cond: ["$wasLoggedIn", 0, 1] } },
//           started: { $sum: { $cond: ["$startedTest", 1, 0] } },
//           completed: { $sum: { $cond: ["$completedTest", 1, 0] } },
//         },
//       },
//     ]);
//     const vStats = visitStats[0] || {
//       totalViews: 0,
//       loggedInViews: 0,
//       guestViews: 0,
//       started: 0,
//       completed: 0,
//     };

//     if (!results.length) {
//       return res.json({
//         status: 200,
//         data: {
//           totalAttempts: 0,
//           avgPercentage: 0,
//           passCount: 0,
//           passRate: 0,
//           highestScore: 0,
//           lowestScore: 0,
//           sectionStats: test.isSectioned
//             ? test.sections.map((s) => ({
//                 name: s.name,
//                 subject: s.subject,
//                 avgPercentage: 0,
//               }))
//             : [],
//           visitStats: vStats,
//         },
//       });
//     }

//     const scores = results.map((r) => r.percentage || 0);
//     const totalAttempts = results.length;
//     const avgPercentage = Math.round(
//       scores.reduce((a, b) => a + b, 0) / totalAttempts,
//     );
//     const passCount = results.filter((r) => r.isPassed).length;

//     let sectionStats = [];
//     if (test.isSectioned && test.sections?.length) {
//       sectionStats = test.sections.map((sec) => {
//         const secPcts = results
//           .flatMap((r) => r.sectionScores || [])
//           .filter((ss) => ss.name === sec.name)
//           .map((ss) => ss.percentage || 0);
//         return {
//           name: sec.name,
//           subject: sec.subject,
//           totalQuestions: sec.questions.length,
//           avgPercentage: secPcts.length
//             ? Math.round(secPcts.reduce((a, b) => a + b, 0) / secPcts.length)
//             : 0,
//         };
//       });
//     }

//     return res.json({
//       status: 200,
//       data: {
//         totalAttempts,
//         avgPercentage,
//         passCount,
//         passRate: Math.round((passCount / totalAttempts) * 100),
//         highestScore: Math.max(...scores),
//         lowestScore: Math.min(...scores),
//         sectionStats,
//         visitStats: vStats,
//       },
//     });
//   } catch (err) {
//     next(err);
//   }
// });

// /* ── PATCH /tests/:id ─────────────────────────────────────────────────────── */
// router.patch("/:id", requireAuth, async (req, res, next) => {
//   try {
//     const test = await Test.findById(req.params.id).lean();
//     if (!test) return res.status(404).json({ message: "Not found" });

//     const isOwner =
//       test.coachingId && (await ownsCoaching(req.user._id, test.coachingId));
//     if (!isOwner && !req.user.isAdmin)
//       return res.status(403).json({ message: "Not authorised" });

//     delete req.body.createdBy;
//     delete req.body.accessToken;
//     delete req.body.totalAttempts;
//     delete req.body.isSectioned;

//     const updated = await Test.findByIdAndUpdate(req.params.id, req.body, {
//       new: true,
//       runValidators: true,
//     }).lean();

//     return res.json({ message: "Test updated", data: stripPassword(updated) });
//   } catch (err) {
//     next(err);
//   }
// });

// /* ── DELETE /tests/:id ────────────────────────────────────────────────────── */
// router.delete("/:id", requireAuth, async (req, res, next) => {
//   try {
//     const test = await Test.findById(req.params.id).lean();
//     if (!test) return res.status(404).json({ message: "Not found" });

//     const isOwner =
//       test.coachingId && (await ownsCoaching(req.user._id, test.coachingId));
//     if (!isOwner && !req.user.isAdmin)
//       return res.status(403).json({ message: "Not authorised" });

//     await Test.findByIdAndUpdate(req.params.id, { isActive: false });
//     return res.json({ message: "Test deactivated" });
//   } catch (err) {
//     next(err);
//   }
// });

// /* ── GET /tests/:slug — MUST be last ─────────────────────────────────────── */
// router.get("/:slug", optionalAuth, async (req, res, next) => {
//   try {
//     const test = await Test.findOne({
//       slug: req.params.slug,
//       isActive: true,
//     }).lean();
//     if (!test) return res.status(404).json({ message: "Test not found" });

//     if (test.visibility === "private") {
//       if (!req.query.password || req.query.password !== test.password)
//         return res.status(403).json({ message: "Invalid or missing password" });
//     }

//     const { password: _p, ...safeTest } = test;
//     return res.json({ status: 200, data: safeTest });
//   } catch (err) {
//     next(err);
//   }
// });

// module.exports = router;
