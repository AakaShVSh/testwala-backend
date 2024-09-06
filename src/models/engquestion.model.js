const mongoose = require("mongoose");

const QuestionEngSchema = mongoose.Schema(
  {
    topic: { type: String, required: true },
    type: { type: String, required: true },
    difficultyLevel: {
      type: String,
      enum: ["easy", "medium", "hard"],
      required: true,
      default: "easy",p85
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
