const express = require("express");
const Notification = require("../models/notification.model");
const { requireAuth } = require("../middlewares/auth.middleware");

const router = express.Router();

/* ── GET /notifications/mine ─────────────────────────────────────────────────
   Returns last 30 notifications for the logged-in user, newest first.
──────────────────────────────────────────────────────────────────────────── */
router.get("/mine", requireAuth, async (req, res, next) => {
  try {
    const notifications = await Notification.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(30)
      .populate(
        "testId",
        "title slug timeLimitMin totalMarks visibility accessToken",
      )
      .lean();

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    return res.json({ status: 200, data: notifications, unreadCount });
  } catch (err) {
    next(err);
  }
});

/* ── PATCH /notifications/:id/read ──────────────────────────────────────────
   Mark a single notification as read.
──────────────────────────────────────────────────────────────────────────── */
router.patch("/:id/read", requireAuth, async (req, res, next) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { isRead: true, readAt: new Date() },
    );
    return res.json({ message: "Marked as read" });
  } catch (err) {
    next(err);
  }
});

/* ── PATCH /notifications/read-all ─────────────────────────────────────────
   Mark ALL unread notifications for this user as read.
──────────────────────────────────────────────────────────────────────────── */
router.patch("/read-all", requireAuth, async (req, res, next) => {
  try {
    await Notification.updateMany(
      { userId: req.user._id, isRead: false },
      { isRead: true, readAt: new Date() },
    );
    return res.json({ message: "All marked as read" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
