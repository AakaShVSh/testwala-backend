
// const mongoose = require("mongoose");

// const TestRequestSchema = new mongoose.Schema(
//   {
//     coachingId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Coaching",
//       required: true,
//     },
//     requestedBy: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//       required: true,
//     },

//     title: { type: String, required: true, trim: true },
//     examType: {
//       type: String,
//       enum: ["SSC", "UPSC", "BANK", "RAILWAY", "STATE", "DEFENCE", "OTHER"],
//       required: true,
//     },
//     // Free-text exam type when examType is "OTHER"
//     customExamType: { type: String, default: "", trim: true },

//     subject: { type: String, default: "", trim: true },
//     totalQuestions: { type: Number, default: 20 },
//     timeLimitMin: { type: Number, default: 30 },
//     difficulty: {
//       type: String,
//       enum: ["easy", "medium", "hard", "mixed"],
//       default: "mixed",
//     },
//     visibility: {
//       type: String,
//       enum: ["public", "private"],
//       default: "public",
//     },
//     instructions: { type: String, default: "" },

//     attachments: [
//       {
//         fileName: String,
//         fileType: String,
//         fileData: String,
//         uploadedAt: { type: Date, default: Date.now },
//       },
//     ],

//     status: {
//       type: String,
//       enum: ["pending", "processing", "completed", "rejected"],
//       default: "pending",
//     },
//     adminNote: { type: String, default: "" },
//     reviewedBy: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//       default: null,
//     },
//     reviewedAt: { type: Date, default: null },

//     createdTestId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Test",
//       default: null,
//     },
//   },
//   { versionKey: false, timestamps: true },
// );

// TestRequestSchema.index({ coachingId: 1, status: 1 });
// TestRequestSchema.index({ status: 1, createdAt: -1 });

// module.exports = mongoose.model("TestRequest", TestRequestSchema);














const mongoose = require("mongoose");

const TestRequestSchema = new mongoose.Schema(
  {
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

    title: { type: String, required: true, trim: true },
    examType: {
      type: String,
      enum: ["SSC", "UPSC", "BANK", "RAILWAY", "STATE", "DEFENCE", "OTHER"],
      required: true,
    },

    // Add inside TestRequestSchema
    isSectioned: { type: Boolean, default: false },

    sections: [
      {
        subject: { type: String, required: true, trim: true },
        totalQuestions: { type: Number, default: 10 },
      },
    ],
    // Free-text exam type when examType is "OTHER"
    customExamType: { type: String, default: "", trim: true },

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
    instructions: { type: String, default: "" },

    attachments: [
      {
        fileName: String,
        fileType: String,
        fileData: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],

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


