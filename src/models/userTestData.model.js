const mongoose = require("mongoose");

const UserTestSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    category: { type: String, required: true },

    difficultyLevel: {
      type: String,
      enum: ["easy", "medium", "hard"],
      // required: true,
    },
    tags: [
      {
        type: String,
      },
    ],
    score: {
      type: Number,
      required: true,
    },
    allAnswer: { type: Object, required: true },
    answeredQuestion: { type: Array, required: true },
    notAnswer: { type: Array, required: true },
    markedAndAnswer: { type: Array, required: true },
    markedNotAnswer: { type: Array, required: true },
    questions: [
      {
        qus: {
          type: String,
          required: true,
        },
        options: {
          type: [String],
          required: true,
        },
        answer: {
          type: Number,
          required: true,
        },
        explanation: {
          type: String,
          default: "",
        },
      },
    ],
  },
  {
    versionKey: false,
    timestamps: true,
  }
);

module.exports = mongoose.model("UserTestData", UserTestSchema);
