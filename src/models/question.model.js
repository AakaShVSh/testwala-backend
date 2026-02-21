const mongoose = require("mongoose");

const QuestionSchema = mongoose.Schema(
  {
    subject: {
      type: String,
      required: true,
      enum: ["math", "english", "gs", "reasoning", "vocabulary", "mathtwo"],
    },
    section: { type: String, required: true },
    topic: { type: String, required: true },
    difficultyLevel: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "easy",
    },
    question: [
      {
        qus: { type: String, required: true },
        qush: { type: String, default: "" },
        options: { type: Array, required: true },
        optionsh: { type: Array, default: [] },
        answer: { type: Number, required: true },
        explanation: { type: String, default: "" },
        explanationh: { type: String, default: "" },
        exam: { type: String, default: "" },
      },
    ],
  },
  {
    versionKey: false,
    timestamps: true,
  }
);

QuestionSchema.index({ subject: 1, section: 1, topic: 1 });

module.exports = mongoose.model("Question", QuestionSchema);
