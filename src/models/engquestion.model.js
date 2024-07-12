const mongoose = require("mongoose");

const QuestionEngSchema = mongoose.Schema(
  {
    section: { type: String, required: true },
    topic: { type: String, required: true },
    difficultyLevel: {
      type: String,
      enum: ["easy", "medium", "hard"],
      required: true,
      default: "easy",
    },
    question: [
      {
        qus: { type: String, required: true },
        options: { type: Array, required: true },
        answer: { type: Number, required: true },
        explanation: { type: String, default: "" },
      },
    ],
  },
  {
    versionKey: false,
    timestamps: true,
  }
);

module.exports = mongoose.model("QuestionEngData", QuestionEngSchema);
