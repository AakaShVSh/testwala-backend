/**
 * src/controllers/admin.controller.js  — COMPLETE FILE
 *
 * Existing routes:
 *   GET    /admin/coaching/requests
 *   PATCH  /admin/coaching/:id/approve
 *   PATCH  /admin/coaching/:id/reject
 *
 * New routes added:
 *   PATCH  /admin/coaching/:id           → generic update (status, fields)
 *   DELETE /admin/coaching/:id           → deactivate coaching + its tests
 *   GET    /admin/tests                  → all tests, filterable
 *   GET    /admin/tests/:id              → full test detail + stats
 *   GET    /admin/tests/:id/submissions  → all results for one test
 *   PATCH  /admin/tests/:id             → update test settings
 *   DELETE /admin/tests/:id             → soft-delete test
 *   GET    /admin/users                  → all users
 *   PATCH  /admin/users/:id             → toggle isAdmin
 *   GET    /admin/stats                  → platform-wide counts
 */

const express = require("express");
const Coaching = require("../models/coaching.model");
const User = require("../models/User.model");
const Test = require("../models/test.model");
const Result = require("../models/result.model");
const { requireAuth } = require("../middlewares/auth.middleware");
const { getIO } = require("../socket");

const router = express.Router();

function requireAdmin(req, res, next) {
  if (!req.user?.isAdmin)
    return res.status(403).json({ message: "Admin only" });
  next();
}

/* ══════════════════════════════════════════════════════════════════════════
   COACHING
══════════════════════════════════════════════════════════════════════════ */

/* GET /admin/coaching/requests ─────────────────────────────────────────── */
router.get(
  "/coaching/requests",
  requireAuth,
  requireAdmin,
  async (req, res, next) => {
    try {
      const { status, search } = req.query;
      const filter = {};
      if (status && ["pending", "approved", "rejected"].includes(status))
        filter.status = status;
      if (search)
        filter.$or = [
          { name: new RegExp(search, "i") },
          { city: new RegExp(search, "i") },
          { email: new RegExp(search, "i") },
        ];

      const requests = await Coaching.find(filter)
        .populate("owner", "Name Email Phone createdAt")
        .populate("reviewedBy", "Name Email")
        .sort({ createdAt: -1 })
        .lean();

      return res.json({ status: 200, data: requests });
    } catch (err) {
      next(err);
    }
  },
);

/* PATCH /admin/coaching/:id/approve ────────────────────────────────────── */
router.patch(
  "/coaching/:id/approve",
  requireAuth,
  requireAdmin,
  async (req, res, next) => {
    try {
      const coaching = await Coaching.findById(req.params.id);
      if (!coaching)
        return res.status(404).json({ message: "Coaching not found" });

      coaching.status = "approved";
      coaching.isActive = true;
      coaching.adminNote = req.body.adminNote || "";
      coaching.reviewedBy = req.user._id;
      coaching.reviewedAt = new Date();
      await coaching.save();

      try {
        getIO()
          .to(`user:${coaching.owner.toString()}`)
          .emit("coaching:status-changed", {
            coachingId: coaching._id,
            status: "approved",
            message: `"${coaching.name}" has been approved and is now live! 🎉`,
          });
      } catch (e) {
        console.warn("[socket]", e.message);
      }

      return res.json({
        message: `"${coaching.name}" approved and is now live.`,
        data: coaching,
      });
    } catch (err) {
      next(err);
    }
  },
);

/* PATCH /admin/coaching/:id/reject ─────────────────────────────────────── */
router.patch(
  "/coaching/:id/reject",
  requireAuth,
  requireAdmin,
  async (req, res, next) => {
    try {
      const coaching = await Coaching.findById(req.params.id);
      if (!coaching)
        return res.status(404).json({ message: "Coaching not found" });

      coaching.status = "rejected";
      coaching.isActive = false;
      coaching.adminNote =
        req.body.adminNote || "Does not meet verification criteria.";
      coaching.reviewedBy = req.user._id;
      coaching.reviewedAt = new Date();
      await coaching.save();

      await User.findByIdAndUpdate(coaching.owner, {
        $unset: { coachingId: "" },
      });

      try {
        getIO()
          .to(`user:${coaching.owner.toString()}`)
          .emit("coaching:status-changed", {
            coachingId: coaching._id,
            status: "rejected",
            message: `Your coaching application was rejected. Reason: ${coaching.adminNote}`,
          });
      } catch (e) {
        console.warn("[socket]", e.message);
      }

      return res.json({
        message: `"${coaching.name}" rejected.`,
        data: coaching,
      });
    } catch (err) {
      next(err);
    }
  },
);

/* PATCH /admin/coaching/:id  — generic field update ─────────────────────── */
router.patch(
  "/coaching/:id",
  requireAuth,
  requireAdmin,
  async (req, res, next) => {
    try {
      const coaching = await Coaching.findById(req.params.id);
      if (!coaching)
        return res.status(404).json({ message: "Coaching not found" });

      // Handle status side-effects
      if (req.body.status === "approved" && coaching.status !== "approved") {
        coaching.isActive = true;
        coaching.reviewedBy = req.user._id;
        coaching.reviewedAt = new Date();
        try {
          getIO()
            .to(`user:${coaching.owner.toString()}`)
            .emit("coaching:status-changed", {
              coachingId: coaching._id,
              status: "approved",
              message: `"${coaching.name}" has been approved! 🎉`,
            });
        } catch (_) {}
      }
      if (req.body.status === "rejected" && coaching.status !== "rejected") {
        coaching.isActive = false;
        coaching.reviewedBy = req.user._id;
        coaching.reviewedAt = new Date();
        await User.findByIdAndUpdate(coaching.owner, {
          $unset: { coachingId: "" },
        });
        try {
          getIO()
            .to(`user:${coaching.owner.toString()}`)
            .emit("coaching:status-changed", {
              coachingId: coaching._id,
              status: "rejected",
              message: `Your coaching application was rejected. Reason: ${req.body.adminNote || ""}`,
            });
        } catch (_) {}
      }

      const allowed = [
        "status",
        "adminNote",
        "isActive",
        "name",
        "description",
        "city",
        "state",
        "pincode",
        "fullAddress",
        "landmark",
        "email",
        "phone",
        "whatsapp",
        "website",
        "examTypes",
        "customExamTypes",
        "establishedYear",
        "studentCount",
        "registrationNumber",
        "additionalInfo",
        "googleMapsUrl",
      ];
      allowed.forEach((k) => {
        if (req.body[k] !== undefined) coaching[k] = req.body[k];
      });

      await coaching.save();
      return res.json({ message: "Coaching updated", data: coaching });
    } catch (err) {
      next(err);
    }
  },
);

/* DELETE /admin/coaching/:id — deactivate coaching + all its tests ──────── */
router.delete(
  "/coaching/:id",
  requireAuth,
  requireAdmin,
  async (req, res, next) => {
    try {
      const coaching = await Coaching.findById(req.params.id);
      if (!coaching)
        return res.status(404).json({ message: "Coaching not found" });

      coaching.isActive = false;
      await coaching.save();

      await Test.updateMany({ coachingId: coaching._id }, { isActive: false });
      await User.findByIdAndUpdate(coaching.owner, {
        $unset: { coachingId: "" },
      });

      return res.json({
        message: `"${coaching.name}" has been deactivated along with all its tests.`,
      });
    } catch (err) {
      next(err);
    }
  },
);

/* ══════════════════════════════════════════════════════════════════════════
   TESTS
══════════════════════════════════════════════════════════════════════════ */

/* GET /admin/tests — all tests with filters + live attempt counts ─────────
   Query params: search, coachingId, examType, subject, isActive            */
router.get("/tests", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { search, coachingId, examType, subject, isActive } = req.query;
    const filter = {};

    if (coachingId) filter.coachingId = coachingId;
    if (examType) filter.examType = examType;
    if (subject) filter.subject = new RegExp(subject, "i");
    if (isActive !== undefined) filter.isActive = isActive === "true";
    if (search)
      filter.$or = [
        { title: new RegExp(search, "i") },
        { examType: new RegExp(search, "i") },
        { subject: new RegExp(search, "i") },
        { customExamType: new RegExp(search, "i") },
      ];

    const tests = await Test.find(filter)
      .select("-questions -sections -password")
      .populate("coachingId", "name city slug status")
      .populate("createdBy", "Name Email")
      .sort({ createdAt: -1 })
      .lean();

    // Attach attempt counts + avg score in a single aggregate
    if (tests.length) {
      const ids = tests.map((t) => t._id);
      const counts = await Result.aggregate([
        { $match: { testId: { $in: ids } } },
        {
          $group: {
            _id: "$testId",
            count: { $sum: 1 },
            avgPct: { $avg: "$percentage" },
          },
        },
      ]);
      const cMap = {};
      counts.forEach((c) => {
        cMap[c._id.toString()] = {
          count: c.count,
          avgPct: Math.round(c.avgPct || 0),
        };
      });
      tests.forEach((t) => {
        const s = cMap[t._id.toString()] || {};
        t.totalAttempts = s.count ?? 0;
        t.avgPercentage = s.avgPct ?? 0;
      });
    }

    return res.json({ status: 200, data: tests });
  } catch (err) {
    next(err);
  }
});

/* GET /admin/tests/:id — full test detail including questions/sections ───── */
router.get("/tests/:id", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const test = await Test.findById(req.params.id)
      .populate("coachingId", "name city slug owner status")
      .populate("createdBy", "Name Email")
      .lean();

    if (!test) return res.status(404).json({ message: "Test not found" });

    // Attach aggregate stats
    const agg = await Result.aggregate([
      { $match: { testId: test._id } },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          avgPct: { $avg: "$percentage" },
          topPct: { $max: "$percentage" },
          avgTime: { $avg: "$timeTaken" },
        },
      },
    ]);
    const s = agg[0] || {};
    test.totalAttempts = s.count ?? 0;
    test.avgPercentage = Math.round(s.avgPct || 0);
    test.topPercentage = Math.round(s.topPct || 0);
    test.avgTimeTaken = Math.round(s.avgTime || 0);

    delete test.password;

    return res.json({ status: 200, data: test });
  } catch (err) {
    next(err);
  }
});

/* GET /admin/tests/:id/submissions — all results for one test ────────────── */
router.get(
  "/tests/:id/submissions",
  requireAuth,
  requireAdmin,
  async (req, res, next) => {
    try {
      const results = await Result.find({ testId: req.params.id })
        .sort({ percentage: -1, timeTaken: 1 })
        .populate("studentId", "Name Email Phone createdAt")
        .select(
          "-allAnswers -shuffledQuestions -correctQus -wrongQus " +
            "-answeredQus -notAnsweredQus -markedAndAnswered -markedNotAnswered",
        )
        .lean();

      return res.json({ status: 200, data: results });
    } catch (err) {
      next(err);
    }
  },
);

/* PATCH /admin/tests/:id — update test settings ─────────────────────────── */
router.patch(
  "/tests/:id",
  requireAuth,
  requireAdmin,
  async (req, res, next) => {
    try {
      // Strip fields that must not be changed via this route
      const {
        createdBy: _c,
        accessToken: _a,
        totalAttempts: _t,
        isSectioned: _s,
        questions: _q,
        sections: _sec,
        ...body
      } = req.body;

      const updated = await Test.findByIdAndUpdate(req.params.id, body, {
        new: true,
        runValidators: true,
      })
        .select("-questions -sections -password")
        .lean();

      if (!updated) return res.status(404).json({ message: "Test not found" });
      return res.json({ message: "Test updated", data: updated });
    } catch (err) {
      next(err);
    }
  },
);

/* DELETE /admin/tests/:id — soft-delete (isActive = false) ──────────────── */
router.delete(
  "/tests/:id",
  requireAuth,
  requireAdmin,
  async (req, res, next) => {
    try {
      const test = await Test.findById(req.params.id);
      if (!test) return res.status(404).json({ message: "Test not found" });

      test.isActive = false;
      await test.save();
      return res.json({ message: `"${test.title}" has been deactivated.` });
    } catch (err) {
      next(err);
    }
  },
);

/* ══════════════════════════════════════════════════════════════════════════
   USERS
══════════════════════════════════════════════════════════════════════════ */

/* GET /admin/users ─────────────────────────────────────────────────────── */
router.get("/users", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { search, isAdmin } = req.query;
    const filter = {};
    if (isAdmin !== undefined) filter.isAdmin = isAdmin === "true";
    if (search)
      filter.$or = [
        { Name: new RegExp(search, "i") },
        { Email: new RegExp(search, "i") },
      ];

    const users = await User.find(filter)
      .select("-Password")
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ status: 200, data: users });
  } catch (err) {
    next(err);
  }
});

/* PATCH /admin/users/:id — toggle isAdmin ──────────────────────────────── */
router.patch(
  "/users/:id",
  requireAuth,
  requireAdmin,
  async (req, res, next) => {
    try {
      const user = await User.findByIdAndUpdate(
        req.params.id,
        { isAdmin: !!req.body.isAdmin },
        { new: true },
      )
        .select("-Password")
        .lean();
      if (!user) return res.status(404).json({ message: "User not found" });
      return res.json({ message: "User updated", data: user });
    } catch (err) {
      next(err);
    }
  },
);

/* ══════════════════════════════════════════════════════════════════════════
   PLATFORM STATS
══════════════════════════════════════════════════════════════════════════ */

/* GET /admin/stats ─────────────────────────────────────────────────────── */
router.get("/stats", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      totalCoachings,
      pendingCoachings,
      approvedCoachings,
      totalTests,
      activeTests,
      totalResults,
      newUsers,
      newResults,
      newCoachings,
    ] = await Promise.all([
      User.countDocuments(),
      Coaching.countDocuments(),
      Coaching.countDocuments({ status: "pending" }),
      Coaching.countDocuments({ status: "approved", isActive: true }),
      Test.countDocuments(),
      Test.countDocuments({ isActive: true }),
      Result.countDocuments(),
      User.countDocuments({ createdAt: { $gte: since } }),
      Result.countDocuments({ createdAt: { $gte: since } }),
      Coaching.countDocuments({ createdAt: { $gte: since } }),
    ]);

    return res.json({
      status: 200,
      data: {
        totalUsers,
        totalCoachings,
        pendingCoachings,
        approvedCoachings,
        totalTests,
        activeTests,
        totalResults,
        last7Days: { newUsers, newResults, newCoachings },
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
