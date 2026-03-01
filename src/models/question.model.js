const mongoose = require("mongoose");

/**
 * UNIFIED QUESTION MODEL
 * Replaces: engquestion.model, mathquestion.model, MathTwoModel,
 *           gs.model, Vocabulary.model, reasoning.model
 *
 * subject examples : "math" | "mathtwo" | "english" | "gs" | "vocabulary" | "reasoning"
 * section  example : "Quantitative Aptitude" / "Verbal" / etc.
 * topic    example : "Profit & Loss" / "Synonyms" / etc.
 */

const QuestionItemSchema = new mongoose.Schema(
  {
    qus: { type: String, required: true }, // question (English)
    qush: { type: String, default: "" }, // question (Hindi)
    options: { type: Array, required: true }, // options (English)
    optionsh: { type: Array, default: [] }, // options (Hindi)
    answer: { type: Number, required: true }, // index of correct option
    explanation: { type: String, default: "" }, // explanation (English)
    explanationh: { type: String, default: "" }, // explanation (Hindi)
    exam: { type: String, default: "" }, // exam tag e.g. "SSC", "UPSC"
  },
  { _id: true },
);

const QuestionSchema = new mongoose.Schema(
  {
    subject: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      // e.g. "math", "mathtwo", "english", "gs", "vocabulary", "reasoning"
    },
    section: {
      type: String,
      required: true,
      trim: true,
    },
    topic: {
      type: String,
      required: true,
      trim: true,
    },
    difficultyLevel: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "easy",
    },
    question: [QuestionItemSchema],
  },
  {
    versionKey: false,
    timestamps: true,
  },
);

// Compound index for fast lookups by subject/section/topic/difficulty
QuestionSchema.index({ subject: 1, section: 1, topic: 1, difficultyLevel: 1 });

module.exports = mongoose.model("Question", QuestionSchema);
