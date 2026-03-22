// /**
//  * testLinkVisit.model.js
//  *
//  * Created whenever a student opens a test via shared link (WhatsApp etc.).
//  * Captures auth state, timing, and device info for admin analytics.
//  */
// const mongoose = require("mongoose");

// const TestLinkVisitSchema = new mongoose.Schema(
//   {
//     testId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Test",
//       required: true,
//       index: true,
//     },
//     coachingId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Coaching",
//       default: null,
//       index: true,
//     },

//     // Who visited — null if guest (not logged in)
//     userId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//       default: null,
//       index: true,
//     },

//     // Auth state at time of visit
//     wasLoggedIn: { type: Boolean, default: false },

//     // If logged in: days since their last login before this visit
//     // 0 = same day, 1 = 1 day ago, null = first time login / never logged out
//     daysSinceLastLogin: { type: Number, default: null },

//     // Did they actually start the test after viewing?
//     startedTest: { type: Boolean, default: false },
//     startedAt: { type: Date, default: null },

//     // Did they complete / submit the test?
//     completedTest: { type: Boolean, default: false },
//     completedAt: { type: Date, default: null },
//     resultId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Result",
//       default: null,
//     },

//     // Access method
//     accessVia: {
//       type: String,
//       enum: ["token", "slug", "direct"],
//       default: "token",
//     },

//     // Basic device/browser fingerprint (from User-Agent)
//     userAgent: { type: String, default: "" },
//     ipAddress: { type: String, default: "" },
//   },
//   { versionKey: false, timestamps: true },
// );

// TestLinkVisitSchema.index({ testId: 1, createdAt: -1 });
// TestLinkVisitSchema.index({ coachingId: 1, createdAt: -1 });

// module.exports = mongoose.model("TestLinkVisit", TestLinkVisitSchema);












/**
 * testLinkVisit.model.js
 *
 * Created whenever a student opens a test via shared link (WhatsApp etc.).
 * Captures auth state, timing, and device info for admin analytics.
 */
const mongoose = require("mongoose");

const TestLinkVisitSchema = new mongoose.Schema(
  {
    testId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Test",
      required: true,
      index: true,
    },
    coachingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Coaching",
      default: null,
      index: true,
    },

    // Who visited — null if guest (not logged in)
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    // Auth state at time of visit
    wasLoggedIn: { type: Boolean, default: false },

    // If logged in: days since their last login before this visit
    // 0 = same day, 1 = 1 day ago, null = first time login / never logged out
    daysSinceLastLogin: { type: Number, default: null },

    // Did they actually start the test after viewing?
    startedTest: { type: Boolean, default: false },
    startedAt: { type: Date, default: null },

    // Did they complete / submit the test?
    completedTest: { type: Boolean, default: false },
    completedAt: { type: Date, default: null },
    resultId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Result",
      default: null,
    },

    // Access method
    accessVia: {
      type: String,
      enum: ["token", "slug", "direct"],
      default: "token",
    },

    // Basic device/browser fingerprint (from User-Agent)
    userAgent: { type: String, default: "" },
    ipAddress: { type: String, default: "" },
  },
  { versionKey: false, timestamps: true },
);

TestLinkVisitSchema.index({ testId: 1, createdAt: -1 });
TestLinkVisitSchema.index({ coachingId: 1, createdAt: -1 });
// Used by result_controller when marking a visit as completed after submit
TestLinkVisitSchema.index({ testId: 1, userId: 1 });

module.exports = mongoose.model("TestLinkVisit", TestLinkVisitSchema);