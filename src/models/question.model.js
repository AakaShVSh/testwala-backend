const mongoose = require("mongoose");

const QuestionSchema = mongoose.Schema({
  section: { type: String, required: true },

  question: [
    {
      qus: { type: String, required: true },
      options: { type: Array, required: true },
      answer: { type: Number, required: true },
    },
  ],
},
{
    versionKey: false,
    timestamps: true,
  
});

module.exports = mongoose.model("QuestionData", QuestionSchema);