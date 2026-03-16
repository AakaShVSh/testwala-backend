// const express = require("express");
// const TestRequest = require("../models/testRequest.model");
// const Test = require("../models/test.model");
// const Coaching = require("../models/coaching.model");
// const Notification = require("../models/notification.model");
// const { requireAuth } = require("../middlewares/auth.middleware");
// const { toSlug } = require("../utils/slug");
// const { getIO } = require("../socket");

// const router = express.Router();

// function requireAdmin(req, res, next) {
//   if (!req.user?.isAdmin)
//     return res.status(403).json({ message: "Admin only" });
//   next();
// }

// async function ownsCoaching(userId, coachingId) {
//   const c = await Coaching.findById(coachingId).lean();
//   return c && c.owner.toString() === userId.toString();
// }

// router.post("/create", requireAuth, async (req, res, next) => {
//   try {
//     const {
//       coachingId,
//       title,
//       examType,
//       subject,
//       totalQuestions,
//       timeLimitMin,
//       difficulty,
//       visibility,
//       instructions,
//       attachments,
//     } = req.body;
//     if (!coachingId || !title || !examType)
//       return res
//         .status(400)
//         .json({ message: "coachingId, title, and examType are required" });
//     const isOwner = await ownsCoaching(req.user._id, coachingId);
//     if (!isOwner)
//       return res
//         .status(403)
//         .json({ message: "Not authorised for this coaching" });
//     const coaching = await Coaching.findById(coachingId).lean();
//     if (!coaching || coaching.status !== "approved")
//       return res
//         .status(400)
//         .json({ message: "Coaching must be approved before requesting tests" });
//     const request = await TestRequest.create({
//       coachingId,
//       requestedBy: req.user._id,
//       title,
//       examType,
//       subject: subject || "",
//       totalQuestions: totalQuestions || 20,
//       timeLimitMin: timeLimitMin || 30,
//       difficulty: difficulty || "mixed",
//       visibility: visibility || "public",
//       instructions: instructions || "",
//       attachments: attachments || [],
//       status: "pending",
//     });
//     return res.status(201).json({
//       message: "Test request submitted! Admin will create your test soon.",
//       data: request,
//     });
//   } catch (err) {
//     next(err);
//   }
// });

// router.get("/mine", requireAuth, async (req, res, next) => {
//   try {
//     const coaching = await Coaching.findOne({ owner: req.user._id }).lean();
//     if (!coaching) return res.json({ status: 200, data: [] });
//     const requests = await TestRequest.find({ coachingId: coaching._id })
//       .populate({
//         path: "createdTestId",
//         select:
//           "title slug accessToken totalMarks timeLimitMin visibility questions examType subject createdAt",
//       })
//       .sort({ createdAt: -1 })
//       .lean();
//     return res.json({ status: 200, data: requests });
//   } catch (err) {
//     next(err);
//   }
// });

// router.get("/admin/all", requireAuth, requireAdmin, async (req, res, next) => {
//   try {
//     const { status, search } = req.query;
//     const filter = {};
//     if (
//       status &&
//       ["pending", "processing", "completed", "rejected"].includes(status)
//     )
//       filter.status = status;
//     if (search)
//       filter.$or = [
//         { title: new RegExp(search, "i") },
//         { examType: new RegExp(search, "i") },
//       ];
//     const requests = await TestRequest.find(filter)
//       .populate("coachingId", "name city slug")
//       .populate("requestedBy", "Name Email Phone")
//       .populate("reviewedBy", "Name Email")
//       .populate("createdTestId", "title slug totalMarks")
//       .sort({ createdAt: -1 })
//       .lean();
//     const safe = requests.map(({ attachments, ...r }) => ({
//       ...r,
//       attachmentCount: attachments?.length || 0,
//     }));
//     return res.json({ status: 200, data: safe });
//   } catch (err) {
//     next(err);
//   }
// });

// router.get("/admin/:id", requireAuth, requireAdmin, async (req, res, next) => {
//   try {
//     const request = await TestRequest.findById(req.params.id)
//       .populate("coachingId", "name city slug owner examTypes")
//       .populate("requestedBy", "Name Email Phone")
//       .populate(
//         "createdTestId",
//         "title slug accessToken totalMarks timeLimitMin",
//       )
//       .lean();
//     if (!request) return res.status(404).json({ message: "Request not found" });
//     return res.json({ status: 200, data: request });
//   } catch (err) {
//     next(err);
//   }
// });

// router.post(
//   "/admin/:id/create-test",
//   requireAuth,
//   requireAdmin,
//   async (req, res, next) => {
//     try {
//       const request = await TestRequest.findById(req.params.id)
//         .populate("coachingId")
//         .lean();
//       if (!request)
//         return res.status(404).json({ message: "Request not found" });
//       if (request.status === "completed")
//         return res
//           .status(409)
//           .json({ message: "Test already created for this request" });
//       const { questions, adminNote } = req.body;
//       if (!Array.isArray(questions) || questions.length === 0)
//         return res.status(400).json({ message: "questions array is required" });

//       const slug = `${toSlug(request.title)}-${Date.now()}`;
//       const test = await Test.create({
//         title: request.title,
//         slug,
//         coachingId: request.coachingId._id,
//         createdBy: req.user._id,
//         examType: request.examType,
//         subject: request.subject || "",
//         timeLimitMin: request.timeLimitMin || 30,
//         visibility: request.visibility || "public",
//         questions,
//         isActive: true,
//       });

//       await TestRequest.findByIdAndUpdate(req.params.id, {
//         status: "completed",
//         createdTestId: test._id,
//         reviewedBy: req.user._id,
//         reviewedAt: new Date(),
//         adminNote: adminNote || "",
//       });

//       const notification = await Notification.create({
//         userId: request.requestedBy,
//         coachingId: request.coachingId._id,
//         type: "test_ready",
//         title: "Your test is ready! 🎉",
//         body: `"${test.title}" has been created with ${questions.length} questions. Share the link with your students.`,
//         testRequestId: request._id,
//         testId: test._id,
//       });

//       try {
//         const io = getIO();
//         const populatedTest = await Test.findById(test._id)
//           .select(
//             "title slug accessToken totalMarks timeLimitMin visibility examType subject questions",
//           )
//           .lean();
//         io.to(`user:${request.requestedBy.toString()}`).emit(
//           "notification:new",
//           {
//             notification: { ...notification.toObject(), testId: populatedTest },
//           },
//         );
//         io.to(`coaching:${request.coachingId._id.toString()}`).emit(
//           "test:created",
//           { testRequestId: request._id, test: populatedTest },
//         );
//       } catch (socketErr) {
//         console.warn("[socket] emit failed:", socketErr.message);
//       }

//       return res.status(201).json({
//         message: `Test "${test.title}" created and sent to ${request.coachingId.name}!`,
//         data: { test, requestId: request._id },
//       });
//     } catch (err) {
//       next(err);
//     }
//   },
// );

// router.patch(
//   "/admin/:id/reject",
//   requireAuth,
//   requireAdmin,
//   async (req, res, next) => {
//     try {
//       const request = await TestRequest.findById(req.params.id)
//         .populate("coachingId", "name")
//         .lean();
//       if (!request)
//         return res.status(404).json({ message: "Request not found" });
//       const { adminNote } = req.body;
//       if (!adminNote?.trim())
//         return res
//           .status(400)
//           .json({ message: "Please provide a reason for rejection" });
//       await TestRequest.findByIdAndUpdate(req.params.id, {
//         status: "rejected",
//         adminNote,
//         reviewedBy: req.user._id,
//         reviewedAt: new Date(),
//       });
//       const notification = await Notification.create({
//         userId: request.requestedBy,
//         coachingId: request.coachingId?._id,
//         type: "request_rejected",
//         title: "Test request rejected",
//         body: `Your request for "${request.title}" was rejected. Reason: ${adminNote}`,
//         testRequestId: request._id,
//       });
//       try {
//         const io = getIO();
//         io.to(`user:${request.requestedBy.toString()}`).emit(
//           "notification:new",
//           { notification },
//         );
//       } catch (_) {}
//       return res.json({ message: "Request rejected." });
//     } catch (err) {
//       next(err);
//     }
//   },
// );

// router.patch(
//   "/admin/:id/processing",
//   requireAuth,
//   requireAdmin,
//   async (req, res, next) => {
//     try {
//       const request = await TestRequest.findById(req.params.id).lean();
//       if (!request) return res.status(404).json({ message: "Not found" });
//       await TestRequest.findByIdAndUpdate(req.params.id, {
//         status: "processing",
//         reviewedBy: req.user._id,
//       });
//       await Notification.create({
//         userId: request.requestedBy,
//         coachingId: request.coachingId,
//         type: "request_processing",
//         title: "Test request in progress ⚙️",
//         body: `Admin is now working on your request for "${request.title}". You'll be notified when it's ready.`,
//         testRequestId: request._id,
//       });
//       try {
//         const io = getIO();
//         io.to(`user:${request.requestedBy.toString()}`).emit(
//           "notification:new",
//           {
//             notification: {
//               type: "request_processing",
//               title: "Test request in progress ⚙️",
//             },
//           },
//         );
//       } catch (_) {}
//       return res.json({ message: "Marked as processing." });
//     } catch (err) {
//       next(err);
//     }
//   },
// );

// module.exports = router;

const express = require("express");
const TestRequest = require("../models/testRequest.model");
const Test = require("../models/test.model");
const Coaching = require("../models/coaching.model");
const Notification = require("../models/notification.model");
const { requireAuth } = require("../middlewares/auth.middleware");
const { toSlug } = require("../utils/slug");
const { getIO } = require("../socket");

const router = express.Router();

function requireAdmin(req, res, next) {
  if (!req.user?.isAdmin)
    return res.status(403).json({ message: "Admin only" });
  next();
}

async function ownsCoaching(userId, coachingId) {
  const c = await Coaching.findById(coachingId).lean();
  return c && c.owner.toString() === userId.toString();
}

router.post("/create", requireAuth, async (req, res, next) => {
  try {
    const {
      coachingId,
      title,
      examType,
      customExamType,
      subject,
      totalQuestions,
      timeLimitMin,
      difficulty,
      visibility,
      instructions,
      attachments,
    } = req.body;

    if (!coachingId || !title || !examType)
      return res
        .status(400)
        .json({ message: "coachingId, title, and examType are required" });

    const isOwner = await ownsCoaching(req.user._id, coachingId);
    if (!isOwner)
      return res
        .status(403)
        .json({ message: "Not authorised for this coaching" });

    const coaching = await Coaching.findById(coachingId).lean();
    if (!coaching || coaching.status !== "approved")
      return res
        .status(400)
        .json({ message: "Coaching must be approved before requesting tests" });

    const request = await TestRequest.create({
      coachingId,
      requestedBy: req.user._id,
      title,
      examType,
      customExamType: examType === "OTHER" ? (customExamType || "").trim() : "",
      subject: subject || "",
      totalQuestions: totalQuestions || 20,
      timeLimitMin: timeLimitMin || 30,
      difficulty: difficulty || "mixed",
      visibility: visibility || "public",
      instructions: instructions || "",
      attachments: attachments || [],
      status: "pending",
    });

    return res.status(201).json({
      message: "Test request submitted! Admin will create your test soon.",
      data: request,
    });
  } catch (err) {
    next(err);
  }
});

router.get("/mine", requireAuth, async (req, res, next) => {
  try {
    const coaching = await Coaching.findOne({ owner: req.user._id }).lean();
    if (!coaching) return res.json({ status: 200, data: [] });
    const requests = await TestRequest.find({ coachingId: coaching._id })
      .populate({
        path: "createdTestId",
        select:
          "title slug accessToken totalMarks timeLimitMin visibility questions examType customExamType subject createdAt",
      })
      .sort({ createdAt: -1 })
      .lean();
    return res.json({ status: 200, data: requests });
  } catch (err) {
    next(err);
  }
});

router.get("/admin/all", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { status, search } = req.query;
    const filter = {};
    if (
      status &&
      ["pending", "processing", "completed", "rejected"].includes(status)
    )
      filter.status = status;
    if (search)
      filter.$or = [
        { title: new RegExp(search, "i") },
        { examType: new RegExp(search, "i") },
        { customExamType: new RegExp(search, "i") },
      ];
    const requests = await TestRequest.find(filter)
      .populate("coachingId", "name city slug")
      .populate("requestedBy", "Name Email Phone")
      .populate("reviewedBy", "Name Email")
      .populate("createdTestId", "title slug totalMarks")
      .sort({ createdAt: -1 })
      .lean();
    const safe = requests.map(({ attachments, ...r }) => ({
      ...r,
      attachmentCount: attachments?.length || 0,
    }));
    return res.json({ status: 200, data: safe });
  } catch (err) {
    next(err);
  }
});

router.get("/admin/:id", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const request = await TestRequest.findById(req.params.id)
      .populate("coachingId", "name city slug owner examTypes customExamTypes")
      .populate("requestedBy", "Name Email Phone")
      .populate(
        "createdTestId",
        "title slug accessToken totalMarks timeLimitMin",
      )
      .lean();
    if (!request) return res.status(404).json({ message: "Request not found" });
    return res.json({ status: 200, data: request });
  } catch (err) {
    next(err);
  }
});

router.post(
  "/admin/:id/create-test",
  requireAuth,
  requireAdmin,
  async (req, res, next) => {
    try {
      const request = await TestRequest.findById(req.params.id)
        .populate("coachingId")
        .lean();
      if (!request)
        return res.status(404).json({ message: "Request not found" });
      if (request.status === "completed")
        return res
          .status(409)
          .json({ message: "Test already created for this request" });

      const { questions, adminNote } = req.body;
      if (!Array.isArray(questions) || questions.length === 0)
        return res.status(400).json({ message: "questions array is required" });

      const slug = `${toSlug(request.title)}-${Date.now()}`;
      const test = await Test.create({
        title: request.title,
        slug,
        coachingId: request.coachingId._id,
        createdBy: req.user._id,
        examType: request.examType,
        // Forward the custom exam type from the request
        customExamType: request.customExamType || "",
        subject: request.subject || "",
        timeLimitMin: request.timeLimitMin || 30,
        visibility: request.visibility || "public",
        questions,
        isActive: true,
      });

      await TestRequest.findByIdAndUpdate(req.params.id, {
        status: "completed",
        createdTestId: test._id,
        reviewedBy: req.user._id,
        reviewedAt: new Date(),
        adminNote: adminNote || "",
      });

      const notification = await Notification.create({
        userId: request.requestedBy,
        coachingId: request.coachingId._id,
        type: "test_ready",
        title: "Your test is ready! 🎉",
        body: `"${test.title}" has been created with ${questions.length} questions. Share the link with your students.`,
        testRequestId: request._id,
        testId: test._id,
      });

      try {
        const io = getIO();
        const populatedTest = await Test.findById(test._id)
          .select(
            "title slug accessToken totalMarks timeLimitMin visibility examType customExamType subject questions",
          )
          .lean();
        io.to(`user:${request.requestedBy.toString()}`).emit(
          "notification:new",
          {
            notification: { ...notification.toObject(), testId: populatedTest },
          },
        );
        io.to(`coaching:${request.coachingId._id.toString()}`).emit(
          "test:created",
          {
            testRequestId: request._id,
            test: populatedTest,
          },
        );
      } catch (socketErr) {
        console.warn("[socket] emit failed:", socketErr.message);
      }

      return res.status(201).json({
        message: `Test "${test.title}" created and sent to ${request.coachingId.name}!`,
        data: { test, requestId: request._id },
      });
    } catch (err) {
      next(err);
    }
  },
);

router.patch(
  "/admin/:id/reject",
  requireAuth,
  requireAdmin,
  async (req, res, next) => {
    try {
      const request = await TestRequest.findById(req.params.id)
        .populate("coachingId", "name")
        .lean();
      if (!request)
        return res.status(404).json({ message: "Request not found" });
      const { adminNote } = req.body;
      if (!adminNote?.trim())
        return res
          .status(400)
          .json({ message: "Please provide a reason for rejection" });
      await TestRequest.findByIdAndUpdate(req.params.id, {
        status: "rejected",
        adminNote,
        reviewedBy: req.user._id,
        reviewedAt: new Date(),
      });
      const notification = await Notification.create({
        userId: request.requestedBy,
        coachingId: request.coachingId?._id,
        type: "request_rejected",
        title: "Test request rejected",
        body: `Your request for "${request.title}" was rejected. Reason: ${adminNote}`,
        testRequestId: request._id,
      });
      try {
        const io = getIO();
        io.to(`user:${request.requestedBy.toString()}`).emit(
          "notification:new",
          { notification },
        );
      } catch (_) {}
      return res.json({ message: "Request rejected." });
    } catch (err) {
      next(err);
    }
  },
);

router.patch(
  "/admin/:id/processing",
  requireAuth,
  requireAdmin,
  async (req, res, next) => {
    try {
      const request = await TestRequest.findById(req.params.id).lean();
      if (!request) return res.status(404).json({ message: "Not found" });
      await TestRequest.findByIdAndUpdate(req.params.id, {
        status: "processing",
        reviewedBy: req.user._id,
      });
      await Notification.create({
        userId: request.requestedBy,
        coachingId: request.coachingId,
        type: "request_processing",
        title: "Test request in progress ⚙️",
        body: `Admin is now working on your request for "${request.title}". You'll be notified when it's ready.`,
        testRequestId: request._id,
      });
      try {
        const io = getIO();
        io.to(`user:${request.requestedBy.toString()}`).emit(
          "notification:new",
          {
            notification: {
              type: "request_processing",
              title: "Test request in progress ⚙️",
            },
          },
        );
      } catch (_) {}
      return res.json({ message: "Marked as processing." });
    } catch (err) {
      next(err);
    }
  },
);

module.exports = router;