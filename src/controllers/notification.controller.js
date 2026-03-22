// const express = require("express");
// const Notification = require("../models/notification.model");
// const { requireAuth } = require("../middlewares/auth.middleware");

// const router = express.Router();

// /* ── GET /notifications/mine ─────────────────────────────────────────────────
//    Returns last 50 notifications for the logged-in user, newest first.
// ──────────────────────────────────────────────────────────────────────────── */
// router.get("/mine", requireAuth, async (req, res, next) => {
//   try {
//     const notifications = await Notification.find({ userId: req.user._id })
//       .sort({ createdAt: -1 })
//       .limit(50)
//       .populate(
//         "testId",
//         "title slug timeLimitMin totalMarks visibility accessToken",
//       )
//       .lean();

//     const unreadCount = notifications.filter((n) => !n.isRead).length;

//     return res.json({ status: 200, data: notifications, unreadCount });
//   } catch (err) {
//     next(err);
//   }
// });

// /* ── PATCH /notifications/:id/read ──────────────────────────────────────────
//    Mark a single notification as read.
// ──────────────────────────────────────────────────────────────────────────── */
// router.patch("/:id/read", requireAuth, async (req, res, next) => {
//   try {
//     await Notification.findOneAndUpdate(
//       { _id: req.params.id, userId: req.user._id },
//       { isRead: true, readAt: new Date() },
//     );
//     return res.json({ message: "Marked as read" });
//   } catch (err) {
//     next(err);
//   }
// });

// /* ── PATCH /notifications/read-all ─────────────────────────────────────────
//    Mark ALL unread notifications for this user as read.
// ──────────────────────────────────────────────────────────────────────────── */
// router.patch("/read-all", requireAuth, async (req, res, next) => {
//   try {
//     await Notification.updateMany(
//       { userId: req.user._id, isRead: false },
//       { isRead: true, readAt: new Date() },
//     );
//     return res.json({ message: "All marked as read" });
//   } catch (err) {
//     next(err);
//   }
// });

// /* ── DELETE /notifications/:id ───────────────────────────────────────────────
//    Delete a single notification.
// ──────────────────────────────────────────────────────────────────────────── */
// router.delete("/:id", requireAuth, async (req, res, next) => {
//   try {
//     await Notification.findOneAndDelete({
//       _id: req.params.id,
//       userId: req.user._id,
//     });
//     return res.json({ message: "Notification deleted" });
//   } catch (err) {
//     next(err);
//   }
// });

// /* ── DELETE /notifications/clear-all ─────────────────────────────────────────
//    Delete ALL notifications for this user.
// ──────────────────────────────────────────────────────────────────────────── */
// router.delete("/clear-all", requireAuth, async (req, res, next) => {
//   try {
//     await Notification.deleteMany({ userId: req.user._id });
//     return res.json({ message: "All notifications cleared" });
//   } catch (err) {
//     next(err);
//   }
// });

// module.exports = router;

const express = require("express");
const Notification = require("../models/notification.model");
const { requireAuth } = require("../middlewares/auth.middleware");

const router = express.Router();

/* ── GET /notifications/mine ─────────────────────────────────────────────────
   Returns last 50 notifications for the logged-in user, newest first.
──────────────────────────────────────────────────────────────────────────── */
router.get("/mine", requireAuth, async (req, res, next) => {
  try {
    const notifications = await Notification.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50)
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

/* ── DELETE /notifications/clear-all ─────────────────────────────────────────
   MUST be registered BEFORE /:id — otherwise Express matches "clear-all"
   as an id param and tries to delete a notification with id "clear-all".
──────────────────────────────────────────────────────────────────────────── */
router.delete("/clear-all", requireAuth, async (req, res, next) => {
  try {
    await Notification.deleteMany({ userId: req.user._id });
    return res.json({ message: "All notifications cleared" });
  } catch (err) {
    next(err);
  }
});

/* ── PATCH /notifications/read-all ─────────────────────────────────────────
   MUST be registered BEFORE /:id/read for the same reason.
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

/* ── DELETE /notifications/:id ───────────────────────────────────────────────
   Delete a single notification.
──────────────────────────────────────────────────────────────────────────── */
router.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    await Notification.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });
    return res.json({ message: "Notification deleted" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;