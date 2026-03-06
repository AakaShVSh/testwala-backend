const mongoose = require("mongoose");

const QuestionItemSchema = new mongoose.Schema(
  {
    qus: { type: String, required: true },
    qush: { type: String, default: "" }, // Hindi
    options: { type: [String], required: true },
    optionsh: { type: [String], default: [] }, // Hindi options
    answer: { type: Number, required: true }, // index of correct option
    explanation: { type: String, default: "" },
    explanationh: { type: String, default: "" },
    exam: { type: String, default: "" }, // tag e.g. SSC, UPSC
  },
  { _id: true },
);

const QuestionSchema = new mongoose.Schema(
  {
    subject: { type: String, required: true, lowercase: true, trim: true },
    section: { type: String, required: true, trim: true },
    topic: { type: String, required: true, trim: true },
    difficultyLevel: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "easy",
    },
    question: [QuestionItemSchema],
  },
  { versionKey: false, timestamps: true },
);

QuestionSchema.index({ subject: 1, section: 1, topic: 1, difficultyLevel: 1 });

module.exports = mongoose.model("Question", QuestionSchema);
