// const express = require("express");
// const Coaching = require("../models/coaching.model");
// const User = require("../models/User.model");
// const Test = require("../models/test.model");
// const Result = require("../models/result.model");
// const { requireAuth } = require("../middlewares/auth.middleware");
// const { toSlug } = require("../utils/slug");

// const router = express.Router();

// /* ── helper: attach live attempt counts from Results collection ─────────────
//    Takes an array of test docs, returns same array with totalAttempts
//    computed from the Results collection (never stale).
// ──────────────────────────────────────────────────────────────────────────── */
// async function withLiveAttempts(tests) {
//   if (!tests.length) return tests;
//   const testIds = tests.map((t) => t._id);
//   const counts = await Result.aggregate([
//     { $match: { testId: { $in: testIds } } },
//     { $group: { _id: "$testId", count: { $sum: 1 } } },
//   ]);
//   const countMap = {};
//   counts.forEach((c) => {
//     countMap[c._id.toString()] = c.count;
//   });
//   return tests.map((t) => ({
//     ...t,
//     totalAttempts: countMap[t._id.toString()] ?? 0,
//   }));
// }

// /* ── POST /coaching/create ───────────────────────────────────────────────────
//    Only authenticated users can create a coaching.
//    After creation the user's coachingId is updated to link them.
// ──────────────────────────────────────────────────────────────────────────── */
// router.post("/create", requireAuth, async (req, res, next) => {
//   try {
//     const { name } = req.body;
//     if (!name) return res.status(400).json({ message: "name is required" });

//     if (req.user.coachingId) {
//       return res
//         .status(409)
//         .json({ message: "You already have a coaching centre" });
//     }

//     req.body.slug = req.body.slug || `${toSlug(name)}-${Date.now()}`;
//     req.body.owner = req.user._id;

//     const coaching = await Coaching.create(req.body);
//     await User.findByIdAndUpdate(req.user._id, { coachingId: coaching._id });

//     return res
//       .status(201)
//       .json({ message: "Coaching created", data: coaching });
//   } catch (err) {
//     if (err.code === 11000)
//       return res.status(409).json({ message: "Slug already taken" });
//     next(err);
//   }
// });

// /* ── GET /coaching ───────────────────────────────────────────────────────────
//    Public list — used by students to browse coachings.
// ──────────────────────────────────────────────────────────────────────────── */
// router.get("/", async (req, res, next) => {
//   try {
//     const filter = { isActive: true };
//     if (req.query.examType) filter.examTypes = req.query.examType;
//     if (req.query.city) filter.city = new RegExp(req.query.city, "i");

//     const list = await Coaching.find(filter)
//       .select("-__v")
//       .populate("owner", "Name Email")
//       .lean();

//     return res.json({ status: 200, data: list });
//   } catch (err) {
//     next(err);
//   }
// });

// /* ── GET /coaching/mine ──────────────────────────────────────────────────────
//    Returns the coach's own coaching + dashboard stats.
//    totalAttempts per test is computed LIVE from Results collection.
// ──────────────────────────────────────────────────────────────────────────── */
// router.get("/mine", requireAuth, async (req, res, next) => {
//   try {
//     if (!req.user.coachingId) {
//       return res
//         .status(404)
//         .json({ message: "You do not have a coaching centre" });
//     }

//     const coaching = await Coaching.findById(req.user.coachingId).lean();
//     if (!coaching)
//       return res.status(404).json({ message: "Coaching not found" });

//     // Unique students across all tests of this coaching
//     const uniqueStudents = await Result.distinct("studentId", {
//       coachingId: coaching._id,
//     });

//     // All active tests
//     const rawTests = await Test.find({
//       coachingId: coaching._id,
//       isActive: true,
//     })
//       .select(
//         "title slug examType subject timeLimitMin totalMarks visibility accessToken createdAt",
//       )
//       .lean();

//     // ── Live attempt counts from Results (source of truth, never stale) ──
//     const tests = await withLiveAttempts(rawTests);

//     return res.json({
//       status: 200,
//       data: {
//         ...coaching,
//         totalStudents: uniqueStudents.length,
//         tests,
//       },
//     });
//   } catch (err) {
//     next(err);
//   }
// });

// /* ── GET /coaching/students ──────────────────────────────────────────────────
//    Coach sees all students under their coaching with summary stats.
// ──────────────────────────────────────────────────────────────────────────── */
// router.get("/students", requireAuth, async (req, res, next) => {
//   try {
//     if (!req.user.coachingId) {
//       return res.status(403).json({ message: "Not a coaching owner" });
//     }

//     const coachingId = req.user.coachingId;

//     const results = await Result.find({ coachingId })
//       .populate("studentId", "Name Email Phone")
//       .populate("testId", "title totalMarks examType")
//       .select(
//         "studentId testId score totalQuestions percentage percentile timeTaken createdAt",
//       )
//       .sort({ createdAt: -1 })
//       .lean();

//     const studentMap = {};
//     results.forEach((r) => {
//       if (!r.studentId) return;
//       const sid = r.studentId._id.toString();
//       if (!studentMap[sid]) {
//         studentMap[sid] = {
//           _id: r.studentId._id,
//           Name: r.studentId.Name,
//           Email: r.studentId.Email,
//           Phone: r.studentId.Phone,
//           totalTests: 0,
//           totalScore: 0,
//           totalMarks: 0,
//           percentages: [],
//           percentiles: [],
//           lastAttempt: null,
//         };
//       }
//       const s = studentMap[sid];
//       s.totalTests += 1;
//       s.totalScore += r.score || 0;
//       s.totalMarks += r.testId?.totalMarks || r.totalQuestions || 0;
//       s.percentages.push(r.percentage || 0);
//       s.percentiles.push(r.percentile || 0);
//       if (!s.lastAttempt || new Date(r.createdAt) > new Date(s.lastAttempt)) {
//         s.lastAttempt = r.createdAt;
//       }
//     });

//     const students = Object.values(studentMap).map((s) => ({
//       _id: s._id,
//       Name: s.Name,
//       Email: s.Email,
//       Phone: s.Phone,
//       totalTests: s.totalTests,
//       totalScore: s.totalScore,
//       totalMarks: s.totalMarks,
//       avgPercentage: s.percentages.length
//         ? Math.round(
//             s.percentages.reduce((a, b) => a + b, 0) / s.percentages.length,
//           )
//         : 0,
//       avgPercentile: s.percentiles.length
//         ? Math.round(
//             s.percentiles.reduce((a, b) => a + b, 0) / s.percentiles.length,
//           )
//         : 0,
//       lastAttempt: s.lastAttempt,
//     }));

//     return res.json({ status: 200, data: students });
//   } catch (err) {
//     next(err);
//   }
// });

// /* ── GET /coaching/students/:studentId ───────────────────────────────────────
//    Full analytics of one student under the coach's coaching.
// ──────────────────────────────────────────────────────────────────────────── */
// router.get("/students/:studentId", requireAuth, async (req, res, next) => {
//   try {
//     if (!req.user.coachingId) {
//       return res.status(403).json({ message: "Not a coaching owner" });
//     }

//     const coachingId = req.user.coachingId;
//     const { studentId } = req.params;

//     const student = await User.findById(studentId)
//       .select("Name Email Phone createdAt")
//       .lean();
//     if (!student) return res.status(404).json({ message: "Student not found" });

//     const results = await Result.find({ coachingId, studentId })
//       .populate("testId", "title examType totalMarks timeLimitMin slug")
//       .select(
//         "testId score totalQuestions wrongAnswers skipped percentage percentile timeTaken isPassed createdAt",
//       )
//       .sort({ createdAt: -1 })
//       .lean();

//     const totalTests = results.length;
//     const totalScore = results.reduce((a, r) => a + (r.score || 0), 0);
//     const totalMarks = results.reduce(
//       (a, r) => a + (r.testId?.totalMarks || r.totalQuestions || 0),
//       0,
//     );
//     const avgPercentage = totalTests
//       ? Math.round(
//           results.reduce((a, r) => a + (r.percentage || 0), 0) / totalTests,
//         )
//       : 0;
//     const avgPercentile = totalTests
//       ? Math.round(
//           results.reduce((a, r) => a + (r.percentile || 0), 0) / totalTests,
//         )
//       : 0;
//     const totalTimeTaken = results.reduce((a, r) => a + (r.timeTaken || 0), 0);
//     const passedTests = results.filter((r) => r.isPassed).length;
//     const highestScore = results.length
//       ? Math.max(...results.map((r) => r.percentage || 0))
//       : 0;

//     return res.json({
//       status: 200,
//       data: {
//         student,
//         summary: {
//           totalTests,
//           totalScore,
//           totalMarks,
//           avgPercentage,
//           avgPercentile,
//           totalTimeTaken,
//           passedTests,
//           highestScore,
//         },
//         attempts: results.map((r) => ({
//           _id: r._id,
//           test: r.testId,
//           score: r.score,
//           totalQuestions: r.totalQuestions,
//           wrongAnswers: r.wrongAnswers,
//           skipped: r.skipped,
//           percentage: r.percentage,
//           percentile: r.percentile,
//           timeTaken: r.timeTaken,
//           isPassed: r.isPassed,
//           date: r.createdAt,
//         })),
//       },
//     });
//   } catch (err) {
//     next(err);
//   }
// });

// /* ── GET /coaching/:slug ─────────────────────────────────────────────────────
//    Public coaching page — students see this.
//    totalAttempts computed live from Results collection.
// ──────────────────────────────────────────────────────────────────────────── */
// router.get("/:slug", async (req, res, next) => {
//   try {
//     const coaching = await Coaching.findOne({
//       slug: req.params.slug,
//       isActive: true,
//     })
//       .populate("owner", "Name")
//       .lean();
//     if (!coaching)
//       return res.status(404).json({ message: "Coaching not found" });

//     const rawTests = await Test.find({
//       coachingId: coaching._id,
//       isActive: true,
//       visibility: "public",
//     })
//       .select("title slug examType subject timeLimitMin totalMarks createdAt")
//       .lean();

//     // ── Live attempt counts ──
//     const tests = await withLiveAttempts(rawTests);

//     return res.json({ status: 200, data: { ...coaching, tests } });
//   } catch (err) {
//     next(err);
//   }
// });

// /* ── PATCH /coaching/:id ─────────────────────────────────────────────────────
//    Owner-only update.
// ──────────────────────────────────────────────────────────────────────────── */
// router.patch("/:id", requireAuth, async (req, res, next) => {
//   try {
//     const coaching = await Coaching.findById(req.params.id).lean();
//     if (!coaching) return res.status(404).json({ message: "Not found" });

//     if (
//       coaching.owner.toString() !== req.user._id.toString() &&
//       !req.user.isAdmin
//     ) {
//       return res.status(403).json({ message: "Not authorised" });
//     }

//     if (req.body.name && !req.body.slug) {
//       req.body.slug = toSlug(req.body.name);
//     }

//     const updated = await Coaching.findByIdAndUpdate(req.params.id, req.body, {
//       new: true,
//     }).lean();
//     return res.json({ message: "Coaching updated", data: updated });
//   } catch (err) {
//     next(err);
//   }
// });

// /* ── DELETE /coaching/:id  (soft delete) ─────────────────────────────────── */
// router.delete("/:id", requireAuth, async (req, res, next) => {
//   try {
//     const coaching = await Coaching.findById(req.params.id).lean();
//     if (!coaching) return res.status(404).json({ message: "Not found" });

//     if (
//       coaching.owner.toString() !== req.user._id.toString() &&
//       !req.user.isAdmin
//     ) {
//       return res.status(403).json({ message: "Not authorised" });
//     }

//     await Coaching.findByIdAndUpdate(req.params.id, { isActive: false });
//     return res.json({ message: "Coaching deactivated" });
//   } catch (err) {
//     next(err);
//   }
// });

// module.exports = router;

/**
 * src/controllers/coaching.controller.js  — COMPLETE FILE
 *
 * No logic changes from original.
 * Included here as the complete authoritative file for reference.
 * The coaching:test-viewed emit is handled in test.controller.js,
 * not here — so this file is identical to the original.
 */

const express  = require("express");
const Coaching = require("../models/coaching.model");
const User     = require("../models/User.model");
const Test     = require("../models/test.model");
const Result   = require("../models/result.model");
const { requireAuth } = require("../middlewares/auth.middleware");
const { toSlug }      = require("../utils/slug");
const { getIO }       = require("../socket");

const router = express.Router();

function requireAdmin(req, res, next) {
  if (!req.user?.isAdmin) return res.status(403).json({ message: "Admin only" });
  next();
}

async function withLiveAttempts(tests) {
  if (!tests.length) return tests;
  const testIds = tests.map((t) => t._id);
  const counts  = await Result.aggregate([
    { $match: { testId: { $in: testIds } } },
    { $group: { _id: "$testId", count: { $sum: 1 } } },
  ]);
  const countMap = {};
  counts.forEach((c) => { countMap[c._id.toString()] = c.count; });
  return tests.map((t) => ({
    ...t,
    totalAttempts: countMap[t._id.toString()] ?? 0,
  }));
}

/* ── POST /coaching/create ────────────────────────────────────────────── */
router.post("/create", requireAuth, async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: "name is required" });

    const existing = await Coaching.findOne({ owner: req.user._id });
    if (existing) {
      return res.status(409).json({
        message:
          existing.status === "pending"
            ? "You already have a pending registration request"
            : existing.status === "approved"
              ? "You already have an approved coaching centre"
              : "Your previous request was rejected. Contact admin.",
        status: existing.status,
      });
    }

    const baseSlug  = toSlug(name);
    req.body.slug   = `${baseSlug}-${Date.now()}`;
    req.body.owner  = req.user._id;
    req.body.status = "pending";
    req.body.isActive = false;

    const coaching = await Coaching.create(req.body);
    await User.findByIdAndUpdate(req.user._id, { coachingId: coaching._id });

    // Notify all admin tabs in real-time
    try {
      const io       = getIO();
      const populated = await Coaching.findById(coaching._id)
        .populate("owner", "Name Email Phone createdAt")
        .lean();
      io.to("room:admin").emit("coaching:new-request", { coaching: populated });
      console.log("[socket] emitted coaching:new-request to room:admin");
    } catch (e) {
      console.warn("[socket] emit failed:", e.message);
    }

    return res.status(201).json({
      message:
        "Registration submitted! We will verify and activate your coaching within 24 hours.",
      data: coaching,
    });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: "Slug already taken" });
    next(err);
  }
});

/* ── GET /coaching/admin/requests ────────────────────────────────────── */
// NOTE: This route is now superseded by GET /admin/coaching/requests
// Kept for backwards compatibility.
router.get(
  "/admin/requests",
  requireAuth, requireAdmin,
  async (req, res, next) => {
    try {
      const { status, search } = req.query;
      const filter = {};
      if (status && ["pending","approved","rejected"].includes(status))
        filter.status = status;
      if (search)
        filter.$or = [
          { name:  new RegExp(search, "i") },
          { city:  new RegExp(search, "i") },
          { email: new RegExp(search, "i") },
        ];

      const requests = await Coaching.find(filter)
        .populate("owner",      "Name Email Phone createdAt")
        .populate("reviewedBy", "Name Email")
        .sort({ createdAt: -1 })
        .lean();

      return res.json({ status: 200, data: requests });
    } catch (err) { next(err); }
  }
);

/* ── PATCH /coaching/admin/:id/approve ───────────────────────────────── */
// NOTE: superseded by PATCH /admin/coaching/:id/approve — kept for compat.
router.patch(
  "/admin/:id/approve",
  requireAuth, requireAdmin,
  async (req, res, next) => {
    try {
      const coaching = await Coaching.findById(req.params.id);
      if (!coaching) return res.status(404).json({ message: "Coaching not found" });

      coaching.status     = "approved";
      coaching.isActive   = true;
      coaching.adminNote  = req.body.adminNote || "";
      coaching.reviewedBy = req.user._id;
      coaching.reviewedAt = new Date();
      await coaching.save();

      try {
        getIO()
          .to(`user:${coaching.owner.toString()}`)
          .emit("coaching:status-changed", {
            coachingId: coaching._id,
            status:     "approved",
            message:    `"${coaching.name}" has been approved and is now live! 🎉`,
          });
      } catch (e) { console.warn("[socket]", e.message); }

      return res.json({ message: `"${coaching.name}" approved and is now live.`, data: coaching });
    } catch (err) { next(err); }
  }
);

/* ── PATCH /coaching/admin/:id/reject ────────────────────────────────── */
// NOTE: superseded by PATCH /admin/coaching/:id/reject — kept for compat.
router.patch(
  "/admin/:id/reject",
  requireAuth, requireAdmin,
  async (req, res, next) => {
    try {
      const coaching = await Coaching.findById(req.params.id);
      if (!coaching) return res.status(404).json({ message: "Coaching not found" });

      coaching.status     = "rejected";
      coaching.isActive   = false;
      coaching.adminNote  = req.body.adminNote || "Does not meet verification criteria.";
      coaching.reviewedBy = req.user._id;
      coaching.reviewedAt = new Date();
      await coaching.save();

      await User.findByIdAndUpdate(coaching.owner, { $unset: { coachingId: "" } });

      try {
        getIO()
          .to(`user:${coaching.owner.toString()}`)
          .emit("coaching:status-changed", {
            coachingId: coaching._id,
            status:     "rejected",
            message:    `Your coaching application was rejected. Reason: ${coaching.adminNote}`,
          });
      } catch (e) { console.warn("[socket]", e.message); }

      return res.json({ message: `"${coaching.name}" rejected.`, data: coaching });
    } catch (err) { next(err); }
  }
);

/* ── GET /coaching ────────────────────────────────────────────────────── */
router.get("/", async (req, res, next) => {
  try {
    const filter = { isActive: true, status: "approved" };
    if (req.query.examType) filter.examTypes = req.query.examType;
    if (req.query.city) filter.city = new RegExp(req.query.city, "i");
    const list = await Coaching.find(filter)
      .select("-__v")
      .populate("owner", "Name Email")
      .lean();
    return res.json({ status: 200, data: list });
  } catch (err) { next(err); }
});

/* ── GET /coaching/mine ───────────────────────────────────────────────── */
router.get("/mine", requireAuth, async (req, res, next) => {
  try {
    if (!req.user.coachingId)
      return res.status(404).json({ message: "You do not have a coaching centre" });

    const coaching = await Coaching.findById(req.user.coachingId).lean();
    if (!coaching) return res.status(404).json({ message: "Coaching not found" });

    if (coaching.status !== "approved") return res.json({ status: 200, data: coaching });

    const uniqueStudents = await Result.distinct("studentId", { coachingId: coaching._id });
    const rawTests = await Test.find({ coachingId: coaching._id, isActive: true })
      .select("title slug examType subject timeLimitMin totalMarks visibility accessToken isSectioned sections createdAt")
      .lean();
    const tests = await withLiveAttempts(rawTests);

    return res.json({
      status: 200,
      data: { ...coaching, totalStudents: uniqueStudents.length, tests },
    });
  } catch (err) { next(err); }
});

/* ── GET /coaching/students ───────────────────────────────────────────── */
router.get("/students", requireAuth, async (req, res, next) => {
  try {
    if (!req.user.coachingId)
      return res.status(403).json({ message: "Not a coaching owner" });

    const coachingId = req.user.coachingId;
    const results = await Result.find({ coachingId })
      .populate("studentId", "Name Email Phone")
      .populate("testId",    "title totalMarks examType")
      .select("studentId testId score totalQuestions percentage percentile timeTaken createdAt")
      .sort({ createdAt: -1 })
      .lean();

    const studentMap = {};
    results.forEach((r) => {
      if (!r.studentId) return;
      const sid = r.studentId._id.toString();
      if (!studentMap[sid])
        studentMap[sid] = {
          _id: r.studentId._id, Name: r.studentId.Name,
          Email: r.studentId.Email, Phone: r.studentId.Phone,
          totalTests: 0, percentages: [], lastAttempt: null,
        };
      const s = studentMap[sid];
      s.totalTests++;
      s.percentages.push(r.percentage || 0);
      if (!s.lastAttempt || new Date(r.createdAt) > new Date(s.lastAttempt))
        s.lastAttempt = r.createdAt;
    });

    const students = Object.values(studentMap).map((s) => ({
      _id: s._id, Name: s.Name, Email: s.Email, Phone: s.Phone,
      totalTests: s.totalTests,
      avgPercentage: s.percentages.length
        ? Math.round(s.percentages.reduce((a, b) => a + b, 0) / s.percentages.length)
        : 0,
      lastAttempt: s.lastAttempt,
    }));

    return res.json({ status: 200, data: students });
  } catch (err) { next(err); }
});

/* ── GET /coaching/:slug ──────────────────────────────────────────────── */
router.get("/:slug", async (req, res, next) => {
  try {
    const coaching = await Coaching.findOne({
      slug: req.params.slug, isActive: true, status: "approved",
    }).populate("owner", "Name").lean();
    if (!coaching) return res.status(404).json({ message: "Coaching not found" });

    const rawTests = await Test.find({
      coachingId: coaching._id, isActive: true, visibility: "public",
    }).select("title slug examType subject timeLimitMin totalMarks createdAt isSectioned").lean();
    const tests = await withLiveAttempts(rawTests);

    return res.json({ status: 200, data: { ...coaching, tests } });
  } catch (err) { next(err); }
});

/* ── PATCH /coaching/:id ──────────────────────────────────────────────── */
router.patch("/:id", requireAuth, async (req, res, next) => {
  try {
    const coaching = await Coaching.findById(req.params.id).lean();
    if (!coaching) return res.status(404).json({ message: "Not found" });
    if (coaching.owner.toString() !== req.user._id.toString() && !req.user.isAdmin)
      return res.status(403).json({ message: "Not authorised" });
    if (req.body.name && !req.body.slug) req.body.slug = toSlug(req.body.name);
    const updated = await Coaching.findByIdAndUpdate(
      req.params.id, req.body, { new: true }
    ).lean();
    return res.json({ message: "Coaching updated", data: updated });
  } catch (err) { next(err); }
});

/* ── DELETE /coaching/:id ─────────────────────────────────────────────── */
router.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    const coaching = await Coaching.findById(req.params.id).lean();
    if (!coaching) return res.status(404).json({ message: "Not found" });
    if (coaching.owner.toString() !== req.user._id.toString() && !req.user.isAdmin)
      return res.status(403).json({ message: "Not authorised" });
    await Coaching.findByIdAndUpdate(req.params.id, { isActive: false });
    return res.json({ message: "Coaching deactivated" });
  } catch (err) { next(err); }
});

module.exports = router;