const mongoose = require("mongoose");

const TestRequestSchema = new mongoose.Schema(
  {
    // Who requested
    coachingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Coaching",
      required: true,
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // What they want
    title: { type: String, required: true, trim: true },
    examType: {
      type: String,
      enum: ["SSC", "UPSC", "BANK", "RAILWAY", "STATE", "DEFENCE", "OTHER"],
      required: true,
    },
    subject: { type: String, default: "", trim: true },
    totalQuestions: { type: Number, default: 20 },
    timeLimitMin: { type: Number, default: 30 },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard", "mixed"],
      default: "mixed",
    },
    visibility: {
      type: String,
      enum: ["public", "private"],
      default: "public",
    },
    instructions: { type: String, default: "" }, // Additional notes from coaching

    // Uploaded files (stored as base64 or URLs — use Cloudinary/S3 in prod)
    // For now we store file metadata; actual file processing happens via AI
    attachments: [
      {
        fileName: String,
        fileType: String, // "excel" | "pdf" | "image"
        fileData: String, // base64 string
        uploadedAt: { type: Date, default: Date.now },
      },
    ],

    // Admin workflow
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "rejected"],
      default: "pending",
    },
    adminNote: { type: String, default: "" },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewedAt: { type: Date, default: null },

    // The test that admin created in response
    createdTestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Test",
      default: null,
    },
  },
  { versionKey: false, timestamps: true },
);

TestRequestSchema.index({ coachingId: 1, status: 1 });
TestRequestSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model("TestRequest", TestRequestSchema);
