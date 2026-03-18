const express = require("express");
const Coaching = require("../models/coaching.model");
const User = require("../models/User.model");
const { requireAuth } = require("../middlewares/auth.middleware");

const router = express.Router();

function requireAdmin(req, res, next) {
  if (!req.user?.isAdmin)
    return res.status(403).json({ message: "Admin only" });
  next();
}

/* ── GET /admin/coaching/requests ───────────────────────────────────────── */
router.get(
  "/coaching/requests",
  requireAuth,
  requireAdmin,
  async (req, res, next) => {
    try {
      const { status, search } = req.query;
      const filter = {};
      if (status && ["pending", "approved", "rejected"].includes(status)) {
        filter.status = status;
      }
      if (search) {
        filter.$or = [
          { name: new RegExp(search, "i") },
          { city: new RegExp(search, "i") },
          { email: new RegExp(search, "i") },
        ];
      }

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

/* ── PATCH /admin/coaching/:id/approve ──────────────────────────────────── */
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

      return res.json({
        message: `"${coaching.name}" approved and is now live.`,
        data: coaching,
      });
    } catch (err) {
      next(err);
    }
  },
);

/* ── PATCH /admin/coaching/:id/reject ───────────────────────────────────── */
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

      // Free up the user so they can reapply
      await User.findByIdAndUpdate(coaching.owner, {
        $unset: { coachingId: "" },
      });

      return res.json({
        message: `"${coaching.name}" rejected.`,
        data: coaching,
      });
    } catch (err) {
      next(err);
    }
  },
);

module.exports = router;
