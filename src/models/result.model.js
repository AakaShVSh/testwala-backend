// const mongoose = require("mongoose");

// const ResultSchema = new mongoose.Schema(
//   {
//     studentId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//       required: true,
//     },
//     testId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Test",
//       required: true,
//     },
//     coachingId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Coaching",
//       default: null,
//     },

//     score: { type: Number, default: 0 }, // correct answer count
//     totalQuestions: { type: Number, default: 0 },
//     wrongAnswers: { type: Number, default: 0 },
//     skipped: { type: Number, default: 0 },
//     percentage: { type: Number, default: 0 }, // auto-computed
//     timeTaken: { type: Number, default: 0 }, // seconds

//     // Map: questionIndex → chosen option index  e.g. { "0": 2, "3": 1 }
//     allAnswers: { type: Map, of: Number, default: {} },

//     correctQus: { type: [Number], default: [] },
//     wrongQus: { type: [Number], default: [] },
//     answeredQus: { type: [Number], default: [] },
//     notAnsweredQus: { type: [Number], default: [] },
//     markedAndAnswered: { type: [Number], default: [] },
//     markedNotAnswered: { type: [Number], default: [] },

//     isPassed: { type: Boolean, default: false },
//     passingMark: { type: Number, default: 40 }, // % required to pass

//     // Percentile is computed on-the-fly via leaderboard query, stored for caching
//     percentile: { type: Number, default: null },
//   },
//   { versionKey: false, timestamps: true },
// );

// /* Auto-compute percentage + isPassed + skipped before first save */
// ResultSchema.pre("save", function (next) {
//   if (this.totalQuestions > 0) {
//     this.percentage = Math.round((this.score / this.totalQuestions) * 100);
//     this.isPassed = this.percentage >= this.passingMark;
//     this.skipped =
//       this.totalQuestions -
//       (this.answeredQus?.length || 0) -
//       (this.notAnsweredQus?.length || 0);
//     if (this.skipped < 0) this.skipped = 0;
//   }
//   next();
// });

// ResultSchema.index({ studentId: 1, testId: 1 });
// ResultSchema.index({ testId: 1, percentage: -1, timeTaken: 1 }); // leaderboard

// module.exports = mongoose.model("Result", ResultSchema);

const mongoose = require("mongoose");

const ResultSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    testId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Test",
      required: true,
    },
    coachingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Coaching",
      default: null,
    },

    score: { type: Number, default: 0 }, // correct answer count
    totalQuestions: { type: Number, default: 0 },
    wrongAnswers: { type: Number, default: 0 },
    skipped: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 }, // auto-computed
    timeTaken: { type: Number, default: 0 }, // total seconds

    // ── Per-question time (seconds spent on each question) ──────────────────
    // Map: questionIndex (string) → seconds spent   e.g. { "0": 45, "1": 12 }
    // Questions the student never opened will have no entry (or 0).
    questionTimes: {
      type: Map,
      of: Number,
      default: {},
    },

    // Map: questionIndex → chosen option index  e.g. { "0": 2, "3": 1 }
    allAnswers: { type: Map, of: Number, default: {} },

    correctQus: { type: [Number], default: [] },
    wrongQus: { type: [Number], default: [] },
    answeredQus: { type: [Number], default: [] },
    notAnsweredQus: { type: [Number], default: [] },
    markedAndAnswered: { type: [Number], default: [] },
    markedNotAnswered: { type: [Number], default: [] },

    isPassed: { type: Boolean, default: false },
    passingMark: { type: Number, default: 40 }, // % required to pass

    // Computed on-the-fly via leaderboard query, stored for caching
    percentile: { type: Number, default: null },
  },
  { versionKey: false, timestamps: true },
);

/* ── Auto-compute percentage + isPassed + skipped before first save ── */
ResultSchema.pre("save", function (next) {
  if (this.totalQuestions > 0) {
    this.percentage = Math.round((this.score / this.totalQuestions) * 100);
    this.isPassed = this.percentage >= this.passingMark;
    this.skipped =
      this.totalQuestions -
      (this.answeredQus?.length || 0) -
      (this.notAnsweredQus?.length || 0);
    if (this.skipped < 0) this.skipped = 0;
  }
  next();
});

ResultSchema.index({ studentId: 1, testId: 1 });
ResultSchema.index({ testId: 1, percentage: -1, timeTaken: 1 }); // leaderboard

module.exports = mongoose.model("Result", ResultSchema);