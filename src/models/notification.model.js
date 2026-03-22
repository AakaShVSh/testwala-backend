const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    coachingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Coaching",
      default: null,
    },

    type: {
      type: String,
      enum: [
        "test_ready", // Admin created test from request
        "request_rejected", // Admin rejected test request
        "request_processing", // Admin started working on request
        "coaching_approved", // Coaching approved by admin
        "coaching_rejected", // Coaching rejected by admin
        "coaching_deleted", // Admin deleted coaching
        "user_deleted", // Admin deleted user account
        "subject_added", // Admin added new subject/examtype
        "test_link_shared", // Coach shared test link
        "student_joined", // New student attempted test
        "admin_message", // Generic admin → user message
        "general",
      ],
      required: true,
    },
    title: { type: String, required: true },
    body: { type: String, default: "" },

    // Action URL (frontend deep-link)
    actionUrl: { type: String, default: "" },

    // Related resources
    testRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TestRequest",
      default: null,
    },
    testId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Test",
      default: null,
    },

    // State
    isRead: { type: Boolean, default: false },
    readAt: { type: Date, default: null },
  },
  { versionKey: false, timestamps: true },
);

NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", NotificationSchema);
