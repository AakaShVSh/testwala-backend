const mongoose = require("mongoose");
const crypto = require("crypto");

/**
 * Test = a set of questions created by a coaching (or admin).
 * Questions are embedded (copied) so the test is immutable
 * even if the source Question document changes later.
 */
const TestSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, sparse: true }, // ADD THIS
    coachingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Coaching",
      default: null,
    },
    examType: {
      type: String,
      enum: [
        "SSC",
        "UPSC",
        "BANK",
        "BANKING",
        "RAILWAY",
        "STATE",
        "STATE_PSC",
        "DEFENCE",
        "OTHER",
        "GENERAL",
      ],
      default: "GENERAL",
    },
    subject: { type: String, lowercase: true, trim: true, default: "" },

    questions: [
      {
        qus: { type: String, required: true },
        qush: { type: String, default: "" },
        options: { type: [String], required: true },
        optionsh: { type: [String], default: [] },
        answer: { type: Number, required: true },
        explanation: { type: String, default: "" },
        explanationh: { type: String, default: "" },
        exam: { type: String, default: "" },
        sourceId: { type: mongoose.Schema.Types.ObjectId, default: null },
      },
    ],

    // Support BOTH field names for compatibility
    timeLimitMin: { type: Number, default: 30 }, // used by controller
    timeLimit: { type: Number, default: 30 }, // alias
    totalMarks: { type: Number, default: 0 },
    totalAttempts: { type: Number, default: 0 },

    // Support BOTH visibility field names
    visibility: {
      type: String,
      enum: ["public", "private"],
      default: "public",
    }, // used by controller
    accessType: {
      type: String,
      enum: ["public", "private"],
      default: "public",
    }, // alias

    password: { type: String, default: "" },
    accessToken: { type: String, default: "" },

    // Scheduled test fields
    startsAt: { type: Date, default: null }, // null = available immediately
    endsAt: { type: Date, default: null }, // null = no expiry

    isActive: { type: Boolean, default: true },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { versionKey: false, timestamps: true },
);

TestSchema.pre("save", function (next) {
  this.totalMarks = this.questions.length;
  // Sync alias fields
  this.timeLimit = this.timeLimitMin || this.timeLimit || 30;
  this.accessType = this.visibility || this.accessType || "public";
  if (!this.accessToken) {
    this.accessToken = crypto.randomBytes(16).toString("hex");
  }
  next();
});

TestSchema.index({ coachingId: 1, examType: 1 });
TestSchema.index({ accessToken: 1 });
TestSchema.index({ slug: 1 });

module.exports = mongoose.model("Test", TestSchema);
