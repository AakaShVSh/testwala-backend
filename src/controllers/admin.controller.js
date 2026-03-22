// /**
//  * admin.controller.js
//  *
//  * All routes prefixed with /admin
//  * Every route requires: requireAuth + requireAdmin
//  *
//  * Sections:
//  *  1. Dashboard & Stats
//  *  2. User Management
//  *  3. Coaching Management
//  *  4. Test & Result Management
//  *  5. Subject / ExamType Registry
//  *  6. Broadcast Notifications
//  */

// const express = require("express");
// const mongoose = require("mongoose");

// const Coaching = require("../models/coaching.model");
// const User = require("../models/User.model");
// const Test = require("../models/test.model");
// const Result = require("../models/result.model");
// const TestRequest = require("../models/testRequest.model");
// const Notification = require("../models/notification.model");
// const TestLinkVisit = require("../models/testLinkVisit.model");
// const Question = require("../models/question.model");

// const { requireAuth, requireAdmin } = require("../middlewares/auth.middleware");

// const router = express.Router();

// // Apply auth to all admin routes
// router.use(requireAuth, requireAdmin);

// /* ═══════════════════════════════════════════════════════════════════════════
//    1. DASHBOARD & PLATFORM-WIDE STATS
// ═══════════════════════════════════════════════════════════════════════════ */

// /**
//  * GET /admin/dashboard
//  * Returns platform-wide counters for the admin dashboard.
//  */
// router.get("/dashboard", async (req, res, next) => {
//   try {
//     const [
//       totalUsers,
//       totalCoachings,
//       pendingCoachings,
//       totalTests,
//       totalResults,
//       totalRequests,
//       pendingRequests,
//       recentUsers,
//       recentResults,
//       onlineUsers,
//       totalVisits,
//     ] = await Promise.all([
//       User.countDocuments({ isAdmin: false }),
//       Coaching.countDocuments(),
//       Coaching.countDocuments({ status: "pending" }),
//       Test.countDocuments({ isActive: true }),
//       Result.countDocuments(),
//       TestRequest.countDocuments(),
//       TestRequest.countDocuments({ status: "pending" }),
//       // Users registered in last 7 days
//       User.countDocuments({
//         isAdmin: false,
//         createdAt: { $gte: new Date(Date.now() - 7 * 86400000) },
//       }),
//       // Results submitted in last 24h
//       Result.countDocuments({
//         createdAt: { $gte: new Date(Date.now() - 86400000) },
//       }),
//       // Users seen in last 5 minutes (online)
//       User.countDocuments({
//         lastSeen: { $gte: new Date(Date.now() - 5 * 60 * 1000) },
//       }),
//       TestLinkVisit.countDocuments(),
//     ]);

//     // Tests attempted per day (last 7 days)
//     const activityByDay = await Result.aggregate([
//       { $match: { createdAt: { $gte: new Date(Date.now() - 7 * 86400000) } } },
//       {
//         $group: {
//           _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
//           count: { $sum: 1 },
//         },
//       },
//       { $sort: { _id: 1 } },
//     ]);

//     // Top 5 most attempted tests
//     const topTests = await Result.aggregate([
//       { $group: { _id: "$testId", attempts: { $sum: 1 } } },
//       { $sort: { attempts: -1 } },
//       { $limit: 5 },
//       {
//         $lookup: {
//           from: "tests",
//           localField: "_id",
//           foreignField: "_id",
//           as: "test",
//         },
//       },
//       { $unwind: "$test" },
//       {
//         $project: {
//           testTitle: "$test.title",
//           examType: "$test.examType",
//           attempts: 1,
//         },
//       },
//     ]);

//     return res.json({
//       status: 200,
//       data: {
//         users: {
//           total: totalUsers,
//           newThisWeek: recentUsers,
//           online: onlineUsers,
//         },
//         coachings: { total: totalCoachings, pending: pendingCoachings },
//         tests: {
//           total: totalTests,
//           totalResults,
//           resultsLast24h: recentResults,
//         },
//         requests: { total: totalRequests, pending: pendingRequests },
//         visits: { total: totalVisits },
//         activityByDay,
//         topTests,
//       },
//     });
//   } catch (err) {
//     next(err);
//   }
// });

// /* ═══════════════════════════════════════════════════════════════════════════
//    2. USER MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════ */

// /**
//  * GET /admin/users
//  * List all non-admin users with activity info.
//  * Query: ?search=&page=&limit=&sort=lastLogin|createdAt|name
//  */
// router.get("/users", async (req, res, next) => {
//   try {
//     const { search, page = 1, limit = 30, sort = "createdAt" } = req.query;
//     const filter = { isAdmin: false };

//     if (search) {
//       filter.$or = [
//         { Name: new RegExp(search, "i") },
//         { Email: new RegExp(search, "i") },
//         { Phone: new RegExp(search, "i") },
//       ];
//     }

//     const sortMap = {
//       lastLogin: { lastLogin: -1 },
//       createdAt: { createdAt: -1 },
//       name: { Name: 1 },
//       lastSeen: { lastSeen: -1 },
//     };

//     const users = await User.find(filter)
//       .select("-Password")
//       .populate("coachingId", "name status")
//       .sort(sortMap[sort] || { createdAt: -1 })
//       .skip((+page - 1) * +limit)
//       .limit(+limit)
//       .lean();

//     const total = await User.countDocuments(filter);

//     // Enrich with computed fields
//     const now = Date.now();
//     const enriched = users.map((u) => ({
//       ...u,
//       daysSinceLastLogin: u.lastLogin
//         ? Math.floor((now - new Date(u.lastLogin).getTime()) / 86400000)
//         : null,
//       isOnlineNow: u.lastSeen
//         ? now - new Date(u.lastSeen).getTime() < 5 * 60 * 1000
//         : false,
//     }));

//     return res.json({
//       status: 200,
//       data: enriched,
//       total,
//       page: +page,
//       limit: +limit,
//     });
//   } catch (err) {
//     next(err);
//   }
// });

// /**
//  * GET /admin/users/:id
//  * Full profile for one user — includes test history & activity.
//  */
// router.get("/users/:id", async (req, res, next) => {
//   try {
//     const user = await User.findById(req.params.id)
//       .select("-Password")
//       .populate("coachingId", "name status slug")
//       .lean();
//     if (!user) return res.status(404).json({ message: "User not found" });

//     // Their test results
//     const results = await Result.find({ studentId: req.params.id })
//       .populate("testId", "title examType totalMarks slug")
//       .select(
//         "testId score totalQuestions percentage timeTaken isPassed createdAt",
//       )
//       .sort({ createdAt: -1 })
//       .limit(20)
//       .lean();

//     // Tests they viewed via link
//     const visits = await TestLinkVisit.find({ userId: req.params.id })
//       .populate("testId", "title examType")
//       .sort({ createdAt: -1 })
//       .limit(20)
//       .lean();

//     const now = Date.now();
//     const enriched = {
//       ...user,
//       daysSinceLastLogin: user.lastLogin
//         ? Math.floor((now - new Date(user.lastLogin).getTime()) / 86400000)
//         : null,
//       isOnlineNow: user.lastSeen
//         ? now - new Date(user.lastSeen).getTime() < 5 * 60 * 1000
//         : false,
//     };

//     return res.json({ status: 200, data: { user: enriched, results, visits } });
//   } catch (err) {
//     next(err);
//   }
// });

// /**
//  * PATCH /admin/users/:id
//  * Update user fields (e.g. make admin, update name/phone).
//  */
// router.patch("/users/:id", async (req, res, next) => {
//   try {
//     const allowed = ["Name", "Phone", "isAdmin", "preferences"];
//     const update = {};
//     allowed.forEach((k) => {
//       if (req.body[k] !== undefined) update[k] = req.body[k];
//     });

//     const user = await User.findByIdAndUpdate(req.params.id, update, {
//       new: true,
//     })
//       .select("-Password")
//       .lean();
//     if (!user) return res.status(404).json({ message: "User not found" });

//     return res.json({ message: "User updated", data: user });
//   } catch (err) {
//     next(err);
//   }
// });

// /**
//  * DELETE /admin/users/:id
//  * Hard-delete a user and clean up their data.
//  */
// router.delete("/users/:id", async (req, res, next) => {
//   try {
//     const user = await User.findById(req.params.id).lean();
//     if (!user) return res.status(404).json({ message: "User not found" });
//     if (user.isAdmin)
//       return res.status(400).json({ message: "Cannot delete an admin user" });

//     // If they own a coaching, deactivate it
//     if (user.coachingId) {
//       await Coaching.findByIdAndUpdate(user.coachingId, {
//         isActive: false,
//         status: "rejected",
//         adminNote: "Owner account deleted by admin",
//       });
//     }

//     await User.findByIdAndDelete(req.params.id);
//     await Result.deleteMany({ studentId: req.params.id });
//     await Notification.deleteMany({ userId: req.params.id });
//     await TestLinkVisit.deleteMany({ userId: req.params.id });

//     return res.json({ message: "User and associated data deleted" });
//   } catch (err) {
//     next(err);
//   }
// });

// /* ═══════════════════════════════════════════════════════════════════════════
//    3. COACHING MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════ */

// /**
//  * GET /admin/coaching/requests
//  * All coaching registrations with filters.
//  */
// router.get("/coaching/requests", async (req, res, next) => {
//   try {
//     const { status, search } = req.query;
//     const filter = {};
//     if (status && ["pending", "approved", "rejected"].includes(status))
//       filter.status = status;
//     if (search) {
//       filter.$or = [
//         { name: new RegExp(search, "i") },
//         { city: new RegExp(search, "i") },
//         { email: new RegExp(search, "i") },
//       ];
//     }

//     const requests = await Coaching.find(filter)
//       .populate("owner", "Name Email Phone createdAt lastLogin lastSeen")
//       .populate("reviewedBy", "Name Email")
//       .sort({ createdAt: -1 })
//       .lean();

//     return res.json({ status: 200, data: requests });
//   } catch (err) {
//     next(err);
//   }
// });

// /**
//  * PATCH /admin/coaching/:id/approve
//  */
// router.patch("/coaching/:id/approve", async (req, res, next) => {
//   try {
//     const coaching = await Coaching.findById(req.params.id);
//     if (!coaching)
//       return res.status(404).json({ message: "Coaching not found" });

//     coaching.status = "approved";
//     coaching.isActive = true;
//     coaching.adminNote = req.body.adminNote || "";
//     coaching.reviewedBy = req.user._id;
//     coaching.reviewedAt = new Date();
//     await coaching.save();

//     // Notify owner
//     await Notification.create({
//       userId: coaching.owner,
//       coachingId: coaching._id,
//       type: "coaching_approved",
//       title: "🎉 Your coaching centre is approved!",
//       body: `"${coaching.name}" has been verified and is now live on the platform.`,
//       actionUrl: "/dashboard/coaching",
//     });

//     try {
//       const { getIO } = require("../socket");
//       getIO()
//         .to(`user:${coaching.owner.toString()}`)
//         .emit("coaching:status-changed", {
//           coachingId: coaching._id,
//           status: "approved",
//           message: `"${coaching.name}" approved and is now live! 🎉`,
//         });
//     } catch (_e) {}

//     return res.json({
//       message: `"${coaching.name}" approved and is now live.`,
//       data: coaching,
//     });
//   } catch (err) {
//     next(err);
//   }
// });

// /**
//  * PATCH /admin/coaching/:id/reject
//  */
// router.patch("/coaching/:id/reject", async (req, res, next) => {
//   try {
//     const coaching = await Coaching.findById(req.params.id);
//     if (!coaching)
//       return res.status(404).json({ message: "Coaching not found" });

//     coaching.status = "rejected";
//     coaching.isActive = false;
//     coaching.adminNote =
//       req.body.adminNote || "Does not meet verification criteria.";
//     coaching.reviewedBy = req.user._id;
//     coaching.reviewedAt = new Date();
//     await coaching.save();

//     await User.findByIdAndUpdate(coaching.owner, {
//       $unset: { coachingId: "" },
//     });

//     await Notification.create({
//       userId: coaching.owner,
//       coachingId: coaching._id,
//       type: "coaching_rejected",
//       title: "Coaching application rejected",
//       body: `Reason: ${coaching.adminNote}. You may re-apply after addressing the issue.`,
//       actionUrl: "/coaching/register",
//     });

//     try {
//       const { getIO } = require("../socket");
//       getIO()
//         .to(`user:${coaching.owner.toString()}`)
//         .emit("coaching:status-changed", {
//           coachingId: coaching._id,
//           status: "rejected",
//           message: `Application rejected: ${coaching.adminNote}`,
//         });
//     } catch (_e) {}

//     return res.json({
//       message: `"${coaching.name}" rejected.`,
//       data: coaching,
//     });
//   } catch (err) {
//     next(err);
//   }
// });

// /**
//  * DELETE /admin/coaching/:id
//  * Hard-delete a coaching and notify the owner.
//  */
// router.delete("/coaching/:id", async (req, res, next) => {
//   try {
//     const coaching = await Coaching.findById(req.params.id).lean();
//     if (!coaching)
//       return res.status(404).json({ message: "Coaching not found" });

//     const reason = req.body.reason || "Removed by admin";

//     // Soft-delete all tests under this coaching
//     await Test.updateMany({ coachingId: coaching._id }, { isActive: false });

//     // Remove coachingId from owner user
//     await User.findByIdAndUpdate(coaching.owner, {
//       $unset: { coachingId: "" },
//     });

//     await Coaching.findByIdAndDelete(req.params.id);

//     await Notification.create({
//       userId: coaching.owner,
//       type: "coaching_deleted",
//       title: "Your coaching centre has been removed",
//       body: `"${coaching.name}" was removed by admin. Reason: ${reason}`,
//       actionUrl: "/coaching/register",
//     });

//     return res.json({ message: `"${coaching.name}" deleted successfully` });
//   } catch (err) {
//     next(err);
//   }
// });

// /* ═══════════════════════════════════════════════════════════════════════════
//    4. TEST & RESULT MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════ */

// /**
//  * GET /admin/tests
//  * All tests platform-wide with filters.
//  */
// router.get("/tests", async (req, res, next) => {
//   try {
//     const { coachingId, examType, search, page = 1, limit = 30 } = req.query;
//     const filter = {};
//     if (coachingId) filter.coachingId = coachingId;
//     if (examType) filter.examType = examType;
//     if (search) filter.title = new RegExp(search, "i");

//     const tests = await Test.find(filter)
//       .select("-questions -sections -password")
//       .populate("coachingId", "name slug")
//       .populate("createdBy", "Name Email")
//       .sort({ createdAt: -1 })
//       .skip((+page - 1) * +limit)
//       .limit(+limit)
//       .lean();

//     const total = await Test.countDocuments(filter);
//     return res.json({ status: 200, data: tests, total });
//   } catch (err) {
//     next(err);
//   }
// });

// /**
//  * GET /admin/tests/:testId/students
//  * All students who attempted a test + their link-visit data.
//  */
// router.get("/tests/:testId/students", async (req, res, next) => {
//   try {
//     const { testId } = req.params;

//     const [results, visits] = await Promise.all([
//       Result.find({ testId })
//         .populate("studentId", "Name Email Phone lastLogin lastSeen createdAt")
//         .select(
//           "studentId score totalQuestions percentage timeTaken isPassed createdAt sectionScores",
//         )
//         .sort({ createdAt: -1 })
//         .lean(),
//       TestLinkVisit.find({ testId })
//         .populate("userId", "Name Email Phone lastLogin lastSeen")
//         .sort({ createdAt: -1 })
//         .lean(),
//     ]);

//     const now = Date.now();

//     // Merge results + visits into student-centric view
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
//           lastLogin: r.studentId.lastLogin,
//           daysSinceLastLogin: r.studentId.lastLogin
//             ? Math.floor(
//                 (now - new Date(r.studentId.lastLogin).getTime()) / 86400000,
//               )
//             : null,
//           isOnlineNow: r.studentId.lastSeen
//             ? now - new Date(r.studentId.lastSeen).getTime() < 5 * 60 * 1000
//             : false,
//           attempts: [],
//           visitInfo: null,
//         };
//       }
//       studentMap[sid].attempts.push({
//         score: r.score,
//         totalQuestions: r.totalQuestions,
//         percentage: r.percentage,
//         timeTaken: r.timeTaken,
//         isPassed: r.isPassed,
//         submittedAt: r.createdAt,
//         sectionScores: r.sectionScores,
//       });
//     });

//     // Attach visit info
//     visits.forEach((v) => {
//       if (!v.userId) return;
//       const sid = v.userId._id.toString();
//       if (studentMap[sid] && !studentMap[sid].visitInfo) {
//         studentMap[sid].visitInfo = {
//           firstViewedAt: v.createdAt,
//           wasLoggedIn: v.wasLoggedIn,
//           daysSinceLastLoginAtView: v.daysSinceLastLogin,
//           startedTest: v.startedTest,
//           startedAt: v.startedAt,
//         };
//       }
//     });

//     return res.json({ status: 200, data: Object.values(studentMap) });
//   } catch (err) {
//     next(err);
//   }
// });

// /**
//  * DELETE /admin/tests/:id
//  * Hard-delete a test and all its results.
//  */
// router.delete("/tests/:id", async (req, res, next) => {
//   try {
//     const test = await Test.findByIdAndDelete(req.params.id).lean();
//     if (!test) return res.status(404).json({ message: "Test not found" });

//     await Result.deleteMany({ testId: req.params.id });
//     await TestLinkVisit.deleteMany({ testId: req.params.id });

//     return res.json({ message: "Test and all results deleted" });
//   } catch (err) {
//     next(err);
//   }
// });

// /* ═══════════════════════════════════════════════════════════════════════════
//    5. SUBJECT / EXAM TYPE REGISTRY
//    (Stored in a dedicated SubjectRegistry model — created below)
// ═══════════════════════════════════════════════════════════════════════════ */

// // Lazy-require to avoid circular deps
// const getSubjectRegistry = () => require("../models/subjectRegistry.model");

// /**
//  * GET /admin/subjects
//  * Returns all registered subjects with their sections and exam types.
//  */
// router.get("/subjects", async (req, res, next) => {
//   try {
//     const SubjectRegistry = getSubjectRegistry();
//     const subjects = await SubjectRegistry.find().sort({ name: 1 }).lean();
//     return res.json({ status: 200, data: subjects });
//   } catch (err) {
//     next(err);
//   }
// });

// /**
//  * POST /admin/subjects
//  * Add a new subject (and optional sections, examTypes).
//  * Body: { name, sections: [], examTypes: [], description }
//  */
// router.post("/subjects", async (req, res, next) => {
//   try {
//     const SubjectRegistry = getSubjectRegistry();
//     const { name, sections, examTypes, description } = req.body;
//     if (!name) return res.status(400).json({ message: "name is required" });

//     const exists = await SubjectRegistry.findOne({
//       name: name.toLowerCase().trim(),
//     });
//     if (exists)
//       return res.status(409).json({ message: "Subject already exists" });

//     const subject = await SubjectRegistry.create({
//       name: name.toLowerCase().trim(),
//       sections: sections || [],
//       examTypes: examTypes || [],
//       description: description || "",
//       createdBy: req.user._id,
//     });

//     return res.status(201).json({ message: "Subject added", data: subject });
//   } catch (err) {
//     next(err);
//   }
// });

// /**
//  * PATCH /admin/subjects/:id
//  * Update a subject — add sections, exam types, rename, etc.
//  */
// router.patch("/subjects/:id", async (req, res, next) => {
//   try {
//     const SubjectRegistry = getSubjectRegistry();
//     const allowed = [
//       "name",
//       "sections",
//       "examTypes",
//       "description",
//       "isActive",
//     ];
//     const update = {};
//     allowed.forEach((k) => {
//       if (req.body[k] !== undefined) update[k] = req.body[k];
//     });

//     const subject = await SubjectRegistry.findByIdAndUpdate(
//       req.params.id,
//       update,
//       {
//         new: true,
//       },
//     ).lean();
//     if (!subject) return res.status(404).json({ message: "Subject not found" });

//     return res.json({ message: "Subject updated", data: subject });
//   } catch (err) {
//     next(err);
//   }
// });

// /**
//  * DELETE /admin/subjects/:id
//  */
// router.delete("/subjects/:id", async (req, res, next) => {
//   try {
//     const SubjectRegistry = getSubjectRegistry();
//     const subject = await SubjectRegistry.findByIdAndDelete(req.params.id);
//     if (!subject) return res.status(404).json({ message: "Subject not found" });
//     return res.json({ message: "Subject deleted" });
//   } catch (err) {
//     next(err);
//   }
// });

// /* ═══════════════════════════════════════════════════════════════════════════
//    6. BROADCAST NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════ */

// /**
//  * POST /admin/notify/all
//  * Send a notification to ALL users (or filtered subset).
//  * Body: { title, body, actionUrl, targetRole: 'all'|'coaching_owners'|'students' }
//  */
// router.post("/notify/all", async (req, res, next) => {
//   try {
//     const { title, body, actionUrl, targetRole = "all" } = req.body;
//     if (!title) return res.status(400).json({ message: "title is required" });

//     let userFilter = { isAdmin: false };
//     if (targetRole === "coaching_owners") userFilter.coachingId = { $ne: null };
//     if (targetRole === "students") userFilter.coachingId = null;

//     const users = await User.find(userFilter).select("_id").lean();
//     if (!users.length)
//       return res.json({ message: "No users matched filter", sent: 0 });

//     const notifs = users.map((u) => ({
//       userId: u._id,
//       type: "admin_message",
//       title,
//       body: body || "",
//       actionUrl: actionUrl || "",
//     }));

//     await Notification.insertMany(notifs, { ordered: false });

//     // Real-time push via socket
//     try {
//       const { getIO } = require("../socket");
//       const io = getIO();
//       users.forEach((u) => {
//         io.to(`user:${u._id.toString()}`).emit("notification:new", {
//           type: "admin_message",
//           title,
//           body,
//         });
//       });
//     } catch (_e) {}

//     return res.json({
//       message: `Notification sent to ${users.length} users`,
//       sent: users.length,
//     });
//   } catch (err) {
//     next(err);
//   }
// });

// /**
//  * POST /admin/notify/user/:userId
//  * Send a direct notification to one specific user.
//  */
// router.post("/notify/user/:userId", async (req, res, next) => {
//   try {
//     const { title, body, actionUrl } = req.body;
//     if (!title) return res.status(400).json({ message: "title is required" });

//     const user = await User.findById(req.params.userId).lean();
//     if (!user) return res.status(404).json({ message: "User not found" });

//     const notif = await Notification.create({
//       userId: req.params.userId,
//       type: "admin_message",
//       title,
//       body: body || "",
//       actionUrl: actionUrl || "",
//     });

//     try {
//       const { getIO } = require("../socket");
//       getIO().to(`user:${req.params.userId}`).emit("notification:new", {
//         type: "admin_message",
//         title,
//         body,
//       });
//     } catch (_e) {}

//     return res.json({ message: "Notification sent", data: notif });
//   } catch (err) {
//     next(err);
//   }
// });

// /* ═══════════════════════════════════════════════════════════════════════════
//    7. TEST REQUESTS (admin view)
// ═══════════════════════════════════════════════════════════════════════════ */

// /**
//  * GET /admin/test-requests
//  */
// router.get("/test-requests", async (req, res, next) => {
//   try {
//     const { status, search, page = 1, limit = 30 } = req.query;
//     const filter = {};
//     if (status) filter.status = status;
//     if (search) filter.title = new RegExp(search, "i");

//     const requests = await TestRequest.find(filter)
//       .populate("coachingId", "name slug city")
//       .populate("requestedBy", "Name Email")
//       .populate("reviewedBy", "Name Email")
//       .populate("createdTestId", "title slug accessToken")
//       .sort({ createdAt: -1 })
//       .skip((+page - 1) * +limit)
//       .limit(+limit)
//       .lean();

//     const total = await TestRequest.countDocuments(filter);
//     return res.json({ status: 200, data: requests, total });
//   } catch (err) {
//     next(err);
//   }
// });

// module.exports = router;










/**
 * admin.controller.js
 *
 * All routes prefixed with /admin
 * Every route requires: requireAuth + requireAdmin
 *
 * Sections:
 *  1. Dashboard & Stats
 *  2. User Management
 *  3. Coaching Management
 *  4. Test & Result Management
 *  5. Subject / ExamType Registry
 *  6. Broadcast Notifications
 */

const express = require("express");
const mongoose = require("mongoose");

const Coaching = require("../models/coaching.model");
const User = require("../models/User.model");
const Test = require("../models/test.model");
const Result = require("../models/result.model");
const TestRequest = require("../models/testRequest.model");
const Notification = require("../models/notification.model");
const TestLinkVisit = require("../models/testLinkVisit.model");
const Question = require("../models/question.model");

const { requireAuth, requireAdmin } = require("../middlewares/auth.middleware");

const router = express.Router();

// Apply auth to all admin routes
router.use(requireAuth, requireAdmin);

/* ═══════════════════════════════════════════════════════════════════════════
   1. DASHBOARD & PLATFORM-WIDE STATS
═══════════════════════════════════════════════════════════════════════════ */

/**
 * GET /admin/dashboard
 * Returns platform-wide counters for the admin dashboard.
 */
router.get("/dashboard", async (req, res, next) => {
  try {
    const [
      totalUsers,
      totalCoachings,
      pendingCoachings,
      totalTests,
      totalResults,
      totalRequests,
      pendingRequests,
      recentUsers,
      recentResults,
      onlineUsers,
      totalVisits,
    ] = await Promise.all([
      User.countDocuments({ isAdmin: false }),
      Coaching.countDocuments(),
      Coaching.countDocuments({ status: "pending" }),
      Test.countDocuments({ isActive: true }),
      Result.countDocuments(),
      TestRequest.countDocuments(),
      TestRequest.countDocuments({ status: "pending" }),
      // Users registered in last 7 days
      User.countDocuments({
        isAdmin: false,
        createdAt: { $gte: new Date(Date.now() - 7 * 86400000) },
      }),
      // Results submitted in last 24h
      Result.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 86400000) },
      }),
      // Users seen in last 5 minutes (online)
      User.countDocuments({
        lastSeen: { $gte: new Date(Date.now() - 5 * 60 * 1000) },
      }),
      TestLinkVisit.countDocuments(),
    ]);

    // Tests attempted per day (last 7 days)
    const activityByDay = await Result.aggregate([
      { $match: { createdAt: { $gte: new Date(Date.now() - 7 * 86400000) } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Top 5 most attempted tests
    const topTests = await Result.aggregate([
      { $group: { _id: "$testId", attempts: { $sum: 1 } } },
      { $sort: { attempts: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "tests",
          localField: "_id",
          foreignField: "_id",
          as: "test",
        },
      },
      { $unwind: "$test" },
      {
        $project: {
          testTitle: "$test.title",
          examType: "$test.examType",
          attempts: 1,
        },
      },
    ]);

    return res.json({
      status: 200,
      data: {
        users: {
          total: totalUsers,
          newThisWeek: recentUsers,
          online: onlineUsers,
        },
        coachings: { total: totalCoachings, pending: pendingCoachings },
        tests: {
          total: totalTests,
          totalResults,
          resultsLast24h: recentResults,
        },
        requests: { total: totalRequests, pending: pendingRequests },
        visits: { total: totalVisits },
        activityByDay,
        topTests,
      },
    });
  } catch (err) {
    next(err);
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
   2. USER MANAGEMENT
═══════════════════════════════════════════════════════════════════════════ */

/**
 * GET /admin/users
 * List all non-admin users with activity info.
 * Query: ?search=&page=&limit=&sort=lastLogin|createdAt|name
 */
router.get("/users", async (req, res, next) => {
  try {
    const { search, page = 1, limit = 30, sort = "createdAt" } = req.query;
    const filter = { isAdmin: false };

    if (search) {
      filter.$or = [
        { Name: new RegExp(search, "i") },
        { Email: new RegExp(search, "i") },
        { Phone: new RegExp(search, "i") },
      ];
    }

    const sortMap = {
      lastLogin: { lastLogin: -1 },
      createdAt: { createdAt: -1 },
      name: { Name: 1 },
      lastSeen: { lastSeen: -1 },
    };

    const users = await User.find(filter)
      .select("-Password")
      .populate("coachingId", "name status")
      .sort(sortMap[sort] || { createdAt: -1 })
      .skip((+page - 1) * +limit)
      .limit(+limit)
      .lean();

    const total = await User.countDocuments(filter);

    // Enrich with computed fields
    const now = Date.now();
    const enriched = users.map((u) => ({
      ...u,
      daysSinceLastLogin: u.lastLogin
        ? Math.floor((now - new Date(u.lastLogin).getTime()) / 86400000)
        : null,
      isOnlineNow: u.lastSeen
        ? now - new Date(u.lastSeen).getTime() < 5 * 60 * 1000
        : false,
    }));

    return res.json({
      status: 200,
      data: enriched,
      total,
      page: +page,
      limit: +limit,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /admin/users/:id
 * Full profile for one user — includes test history & activity.
 */
router.get("/users/:id", async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .select("-Password")
      .populate("coachingId", "name status slug")
      .lean();
    if (!user) return res.status(404).json({ message: "User not found" });

    // Their test results
    const results = await Result.find({ studentId: req.params.id })
      .populate("testId", "title examType totalMarks slug")
      .select(
        "testId score totalQuestions percentage timeTaken isPassed createdAt",
      )
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    // Tests they viewed via link
    const visits = await TestLinkVisit.find({ userId: req.params.id })
      .populate("testId", "title examType")
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    const now = Date.now();
    const enriched = {
      ...user,
      daysSinceLastLogin: user.lastLogin
        ? Math.floor((now - new Date(user.lastLogin).getTime()) / 86400000)
        : null,
      isOnlineNow: user.lastSeen
        ? now - new Date(user.lastSeen).getTime() < 5 * 60 * 1000
        : false,
    };

    return res.json({ status: 200, data: { user: enriched, results, visits } });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /admin/users/:id
 * Update user fields (e.g. make admin, update name/phone).
 */
router.patch("/users/:id", async (req, res, next) => {
  try {
    const allowed = ["Name", "Phone", "isAdmin", "preferences"];
    const update = {};
    allowed.forEach((k) => {
      if (req.body[k] !== undefined) update[k] = req.body[k];
    });

    const user = await User.findByIdAndUpdate(req.params.id, update, {
      new: true,
    })
      .select("-Password")
      .lean();
    if (!user) return res.status(404).json({ message: "User not found" });

    return res.json({ message: "User updated", data: user });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /admin/users/:id
 * Hard-delete a user and clean up their data.
 */
router.delete("/users/:id", async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).lean();
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.isAdmin)
      return res.status(400).json({ message: "Cannot delete an admin user" });

    // If they own a coaching, deactivate it
    if (user.coachingId) {
      await Coaching.findByIdAndUpdate(user.coachingId, {
        isActive: false,
        status: "rejected",
        adminNote: "Owner account deleted by admin",
      });
    }

    await User.findByIdAndDelete(req.params.id);
    await Result.deleteMany({ studentId: req.params.id });
    await Notification.deleteMany({ userId: req.params.id });
    await TestLinkVisit.deleteMany({ userId: req.params.id });

    return res.json({ message: "User and associated data deleted" });
  } catch (err) {
    next(err);
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
   3. COACHING MANAGEMENT
═══════════════════════════════════════════════════════════════════════════ */

/**
 * GET /admin/coaching/requests
 * All coaching registrations with filters.
 */
router.get("/coaching/requests", async (req, res, next) => {
  try {
    const { status, search } = req.query;
    const filter = {};
    if (status && ["pending", "approved", "rejected"].includes(status))
      filter.status = status;
    if (search) {
      filter.$or = [
        { name: new RegExp(search, "i") },
        { city: new RegExp(search, "i") },
        { email: new RegExp(search, "i") },
      ];
    }

    const requests = await Coaching.find(filter)
      .populate("owner", "Name Email Phone createdAt lastLogin lastSeen")
      .populate("reviewedBy", "Name Email")
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ status: 200, data: requests });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /admin/coaching/:id/approve
 */
router.patch("/coaching/:id/approve", async (req, res, next) => {
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

    // Notify owner
    await Notification.create({
      userId: coaching.owner,
      coachingId: coaching._id,
      type: "coaching_approved",
      title: "🎉 Your coaching centre is approved!",
      body: `"${coaching.name}" has been verified and is now live on the platform.`,
      actionUrl: "/dashboard/coaching",
    });

    try {
      const { getIO } = require("../socket");
      getIO()
        .to(`user:${coaching.owner.toString()}`)
        .emit("coaching:status-changed", {
          coachingId: coaching._id,
          status: "approved",
          message: `"${coaching.name}" approved and is now live! 🎉`,
        });
    } catch (_e) {}

    return res.json({
      message: `"${coaching.name}" approved and is now live.`,
      data: coaching,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /admin/coaching/:id/reject
 */
router.patch("/coaching/:id/reject", async (req, res, next) => {
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

    await Notification.create({
      userId: coaching.owner,
      coachingId: coaching._id,
      type: "coaching_rejected",
      title: "Coaching application rejected",
      body: `Reason: ${coaching.adminNote}. You may re-apply after addressing the issue.`,
      actionUrl: "/coaching/register",
    });

    try {
      const { getIO } = require("../socket");
      getIO()
        .to(`user:${coaching.owner.toString()}`)
        .emit("coaching:status-changed", {
          coachingId: coaching._id,
          status: "rejected",
          message: `Application rejected: ${coaching.adminNote}`,
        });
    } catch (_e) {}

    return res.json({
      message: `"${coaching.name}" rejected.`,
      data: coaching,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /admin/coaching/:id
 * Hard-delete a coaching and notify the owner.
 */
router.delete("/coaching/:id", async (req, res, next) => {
  try {
    const coaching = await Coaching.findById(req.params.id).lean();
    if (!coaching)
      return res.status(404).json({ message: "Coaching not found" });

    const reason = req.body.reason || "Removed by admin";

    // Soft-delete all tests under this coaching
    await Test.updateMany({ coachingId: coaching._id }, { isActive: false });

    // Remove coachingId from owner user
    await User.findByIdAndUpdate(coaching.owner, {
      $unset: { coachingId: "" },
    });

    await Coaching.findByIdAndDelete(req.params.id);

    await Notification.create({
      userId: coaching.owner,
      type: "coaching_deleted",
      title: "Your coaching centre has been removed",
      body: `"${coaching.name}" was removed by admin. Reason: ${reason}`,
      actionUrl: "/coaching/register",
    });

    return res.json({ message: `"${coaching.name}" deleted successfully` });
  } catch (err) {
    next(err);
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
   4. TEST & RESULT MANAGEMENT
═══════════════════════════════════════════════════════════════════════════ */

/**
 * GET /admin/tests
 * All tests platform-wide with filters.
 */
router.get("/tests", async (req, res, next) => {
  try {
    const { coachingId, examType, search, page = 1, limit = 30 } = req.query;
    const filter = {};
    if (coachingId) filter.coachingId = coachingId;
    if (examType) filter.examType = examType;
    if (search) filter.title = new RegExp(search, "i");

    const tests = await Test.find(filter)
      .select("-questions -sections -password")
      .populate("coachingId", "name slug")
      .populate("createdBy", "Name Email")
      .sort({ createdAt: -1 })
      .skip((+page - 1) * +limit)
      .limit(+limit)
      .lean();

    const total = await Test.countDocuments(filter);
    return res.json({ status: 200, data: tests, total });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /admin/tests/:testId/students
 * All students who attempted a test + their link-visit data.
 */
router.get("/tests/:testId/students", async (req, res, next) => {
  try {
    const { testId } = req.params;

    const [results, visits] = await Promise.all([
      Result.find({ testId })
        .populate("studentId", "Name Email Phone lastLogin lastSeen createdAt")
        .select(
          "studentId score totalQuestions percentage timeTaken isPassed createdAt sectionScores",
        )
        .sort({ createdAt: -1 })
        .lean(),
      TestLinkVisit.find({ testId })
        .populate("userId", "Name Email Phone lastLogin lastSeen")
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    const now = Date.now();

    // Merge results + visits into student-centric view
    const studentMap = {};

    results.forEach((r) => {
      if (!r.studentId) return;
      const sid = r.studentId._id.toString();
      if (!studentMap[sid]) {
        studentMap[sid] = {
          _id: r.studentId._id,
          Name: r.studentId.Name,
          Email: r.studentId.Email,
          Phone: r.studentId.Phone,
          lastLogin: r.studentId.lastLogin,
          daysSinceLastLogin: r.studentId.lastLogin
            ? Math.floor(
                (now - new Date(r.studentId.lastLogin).getTime()) / 86400000,
              )
            : null,
          isOnlineNow: r.studentId.lastSeen
            ? now - new Date(r.studentId.lastSeen).getTime() < 5 * 60 * 1000
            : false,
          attempts: [],
          visitInfo: null,
        };
      }
      studentMap[sid].attempts.push({
        score: r.score,
        totalQuestions: r.totalQuestions,
        percentage: r.percentage,
        timeTaken: r.timeTaken,
        isPassed: r.isPassed,
        submittedAt: r.createdAt,
        sectionScores: r.sectionScores,
      });
    });

    // Attach visit info
    visits.forEach((v) => {
      if (!v.userId) return;
      const sid = v.userId._id.toString();
      if (studentMap[sid] && !studentMap[sid].visitInfo) {
        studentMap[sid].visitInfo = {
          firstViewedAt: v.createdAt,
          wasLoggedIn: v.wasLoggedIn,
          daysSinceLastLoginAtView: v.daysSinceLastLogin,
          startedTest: v.startedTest,
          startedAt: v.startedAt,
        };
      }
    });

    return res.json({ status: 200, data: Object.values(studentMap) });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /admin/tests/:id
 * Hard-delete a test and all its results.
 */
router.delete("/tests/:id", async (req, res, next) => {
  try {
    const test = await Test.findByIdAndDelete(req.params.id).lean();
    if (!test) return res.status(404).json({ message: "Test not found" });

    await Result.deleteMany({ testId: req.params.id });
    await TestLinkVisit.deleteMany({ testId: req.params.id });

    return res.json({ message: "Test and all results deleted" });
  } catch (err) {
    next(err);
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
   5. SUBJECT / EXAM TYPE REGISTRY
   (Stored in a dedicated SubjectRegistry model — created below)
═══════════════════════════════════════════════════════════════════════════ */

// Lazy-require to avoid circular deps
const getSubjectRegistry = () => require("../models/subjectRegistry.model");

/**
 * GET /admin/subjects
 * Returns all registered subjects with their sections and exam types.
 */
router.get("/subjects", async (req, res, next) => {
  try {
    const SubjectRegistry = getSubjectRegistry();
    const subjects = await SubjectRegistry.find().sort({ name: 1 }).lean();
    return res.json({ status: 200, data: subjects });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /admin/subjects
 * Add a new subject (and optional sections, examTypes).
 * Body: { name, sections: [], examTypes: [], description }
 */
router.post("/subjects", async (req, res, next) => {
  try {
    const SubjectRegistry = getSubjectRegistry();
    const { name, sections, examTypes, description } = req.body;
    if (!name) return res.status(400).json({ message: "name is required" });

    const exists = await SubjectRegistry.findOne({
      name: name.toLowerCase().trim(),
    });
    if (exists)
      return res.status(409).json({ message: "Subject already exists" });

    const subject = await SubjectRegistry.create({
      name: name.toLowerCase().trim(),
      sections: sections || [],
      examTypes: examTypes || [],
      description: description || "",
      createdBy: req.user._id,
    });

    return res.status(201).json({ message: "Subject added", data: subject });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /admin/subjects/:id
 * Update a subject — add sections, exam types, rename, etc.
 */
router.patch("/subjects/:id", async (req, res, next) => {
  try {
    const SubjectRegistry = getSubjectRegistry();
    const allowed = [
      "name",
      "sections",
      "examTypes",
      "description",
      "isActive",
    ];
    const update = {};
    allowed.forEach((k) => {
      if (req.body[k] !== undefined) update[k] = req.body[k];
    });

    const subject = await SubjectRegistry.findByIdAndUpdate(
      req.params.id,
      update,
      {
        new: true,
      },
    ).lean();
    if (!subject) return res.status(404).json({ message: "Subject not found" });

    return res.json({ message: "Subject updated", data: subject });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /admin/subjects/:id
 */
router.delete("/subjects/:id", async (req, res, next) => {
  try {
    const SubjectRegistry = getSubjectRegistry();
    const subject = await SubjectRegistry.findByIdAndDelete(req.params.id);
    if (!subject) return res.status(404).json({ message: "Subject not found" });
    return res.json({ message: "Subject deleted" });
  } catch (err) {
    next(err);
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
   6. BROADCAST NOTIFICATIONS
═══════════════════════════════════════════════════════════════════════════ */

/**
 * POST /admin/notify/all
 * Send a notification to ALL users (or filtered subset).
 * Body: { title, body, actionUrl, targetRole: 'all'|'coaching_owners'|'students' }
 *
 * Uses a Mongoose cursor to stream user IDs in batches of 500 so we never
 * load thousands of documents into memory at once (was a memory bomb before).
 */
router.post("/notify/all", async (req, res, next) => {
  try {
    const { title, body, actionUrl, targetRole = "all" } = req.body;
    if (!title) return res.status(400).json({ message: "title is required" });

    let userFilter = { isAdmin: false };
    if (targetRole === "coaching_owners") userFilter.coachingId = { $ne: null };
    if (targetRole === "students") userFilter.coachingId = null;

    // Stream users in batches of 500 — never loads all into memory at once
    const BATCH = 500;
    const cursor = User.find(userFilter).select("_id").lean().cursor();

    let batch = [];
    let sent = 0;

    const flush = async () => {
      if (!batch.length) return;
      const notifs = batch.map((u) => ({
        userId: u._id,
        type: "admin_message",
        title,
        body: body || "",
        actionUrl: actionUrl || "",
      }));
      await Notification.insertMany(notifs, { ordered: false });
      sent += batch.length;
      batch = [];
    };

    for await (const u of cursor) {
      batch.push(u);
      if (batch.length >= BATCH) await flush();
    }
    await flush();

    if (!sent)
      return res.json({ message: "No users matched filter", sent: 0 });

    // Single broadcast emit per role room — avoids N individual socket calls
    try {
      const { getIO } = require("../socket");
      const io = getIO();
      const roomMap = {
        all: "room:users",
        coaching_owners: "room:coaching_owners",
        students: "room:students",
      };
      const room = roomMap[targetRole] || "room:users";
      io.to(room).emit("notification:new", { type: "admin_message", title, body });
    } catch (_e) {}

    return res.json({ message: `Notification sent to ${sent} users`, sent });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /admin/notify/user/:userId
 * Send a direct notification to one specific user.
 */
router.post("/notify/user/:userId", async (req, res, next) => {
  try {
    const { title, body, actionUrl } = req.body;
    if (!title) return res.status(400).json({ message: "title is required" });

    const user = await User.findById(req.params.userId).lean();
    if (!user) return res.status(404).json({ message: "User not found" });

    const notif = await Notification.create({
      userId: req.params.userId,
      type: "admin_message",
      title,
      body: body || "",
      actionUrl: actionUrl || "",
    });

    try {
      const { getIO } = require("../socket");
      getIO().to(`user:${req.params.userId}`).emit("notification:new", {
        type: "admin_message",
        title,
        body,
      });
    } catch (_e) {}

    return res.json({ message: "Notification sent", data: notif });
  } catch (err) {
    next(err);
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
   7. TEST REQUESTS (admin view)
═══════════════════════════════════════════════════════════════════════════ */

/**
 * GET /admin/test-requests
 */
router.get("/test-requests", async (req, res, next) => {
  try {
    const { status, search, page = 1, limit = 30 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (search) filter.title = new RegExp(search, "i");

    const requests = await TestRequest.find(filter)
      .populate("coachingId", "name slug city")
      .populate("requestedBy", "Name Email")
      .populate("reviewedBy", "Name Email")
      .populate("createdTestId", "title slug accessToken")
      .sort({ createdAt: -1 })
      .skip((+page - 1) * +limit)
      .limit(+limit)
      .lean();

    const total = await TestRequest.countDocuments(filter);
    return res.json({ status: 200, data: requests, total });
  } catch (err) {
    next(err);
  }
});

module.exports = router;