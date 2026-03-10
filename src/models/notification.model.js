const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema(
  {
    // Who gets this notification
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

    // Content
    type: {
      type: String,
      enum: [
        "test_ready", // admin created test from request
        "request_rejected", // admin rejected test request
        "request_processing", // admin started working
        "coaching_approved", // coaching approved by admin
        "coaching_rejected", // coaching rejected by admin
        "general",
      ],
      required: true,
    },
    title: { type: String, required: true },
    body: { type: String, default: "" },

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
