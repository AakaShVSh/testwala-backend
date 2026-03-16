// const mongoose = require("mongoose");
// const crypto = require("crypto");

// const EmbeddedQuestionSchema = new mongoose.Schema(
//   {
//     qus: { type: String, required: true },
//     qush: { type: String, default: "" },
//     options: { type: [String], required: true },
//     optionsh: { type: [String], default: [] },
//     answer: { type: Number, required: true },
//     explanation: { type: String, default: "" },
//     explanationh: { type: String, default: "" },
//     exam: { type: String, default: "" },
//     sourceId: { type: mongoose.Schema.Types.ObjectId, default: null },
//   },
//   { _id: true },
// );

// const TestSchema = new mongoose.Schema(
//   {
//     title: { type: String, required: true, trim: true },
//     slug: { type: String, unique: true, sparse: true },
//     coachingId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Coaching",
//       default: null,
//     },
//     createdBy: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//       required: true,
//     },

//     examType: {
//       type: String,
//       enum: [
//         "SSC",
//         "UPSC",
//         "BANK",
//         "RAILWAY",
//         "STATE",
//         "DEFENCE",
//         "GENERAL",
//         "OTHER",
//       ],
//       default: "GENERAL",
//     },
//     subject: { type: String, lowercase: true, trim: true, default: "" },

//     questions: [EmbeddedQuestionSchema],
//     totalMarks: { type: Number, default: 0 },
//     timeLimitMin: { type: Number, default: 30 },

//     visibility: {
//       type: String,
//       enum: ["public", "private"],
//       default: "public",
//     },
//     password: { type: String, default: "" },

//     // Unique token for WhatsApp share link — never changes after creation
//     accessToken: { type: String, unique: true, sparse: true },

//     totalAttempts: { type: Number, default: 0 },

//     startsAt: { type: Date, default: null },
//     endsAt: { type: Date, default: null },

//     isActive: { type: Boolean, default: true },
//   },
//   { versionKey: false, timestamps: true },
// );

// TestSchema.pre("save", function (next) {
//   this.totalMarks = this.questions.length;
//   if (!this.accessToken) {
//     this.accessToken = crypto.randomBytes(20).toString("hex");
//   }
//   next();
// });

// TestSchema.index({ coachingId: 1, isActive: 1 });
// TestSchema.index({ accessToken: 1 });
// TestSchema.index({ slug: 1 });

// module.exports = mongoose.model("Test", TestSchema);






