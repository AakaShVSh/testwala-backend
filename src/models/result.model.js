const mongoose = require("mongoose");

/**
 * Result = one student's attempt at one Test.
 */
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
    timeTaken: { type: Number, default: 0 }, // seconds

    // Full answer map: { "0": 2, "1": 0 }  →  questionIndex: chosenOptionIndex
    allAnswers: { type: Map, of: Number, default: {} },

    // Question index arrays (mirrors your existing TakeTest state)
    correctQus: { type: [Number], default: [] },
    wrongQus: { type: [Number], default: [] },
    answeredQus: { type: [Number], default: [] },
    notAnsweredQus: { type: [Number], default: [] },
    markedAndAnswered: { type: [Number], default: [] },
    markedNotAnswered: { type: [Number], default: [] },

    rank: { type: Number, default: 0 }, // populated later via leaderboard calc
    isPassed: { type: Boolean, default: false },
    passingMark: { type: Number, default: 40 }, // minimum % to pass
  },
  { versionKey: false, timestamps: true },
);

// Auto-compute percentage + isPassed
ResultSchema.pre("save", function (next) {
  if (this.totalQuestions > 0) {
    this.percentage = Math.round((this.score / this.totalQuestions) * 100);
    this.isPassed = this.percentage >= this.passingMark;
    this.skipped =
      this.totalQuestions -
      this.answeredQus.length -
      this.notAnsweredQus.length;
  }
  next();
});

ResultSchema.index({ studentId: 1, testId: 1 });
ResultSchema.index({ testId: 1, score: -1 }); // for leaderboard sort

module.exports = mongoose.model("Result", ResultSchema);
