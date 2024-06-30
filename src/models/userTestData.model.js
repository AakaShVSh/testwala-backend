const mongoose = require("mongoose");

const UserTestSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User",required:true },
    section: { type: String, required: true },

   
    difficultyLevel: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      required: true
    },
    tags: [{
      type: String
    }],
    questions: [{
      questionText: {
        type: String,
        required: true
      },
      options: {
        type: [String],
        required: true
      },
      answer: {
        type: Number,
        required: true
      },
      explanation: {
        type: String
      },
    
      
    }]},
  {
    versionKey: false,
    timestamps: true,
  }
);

module.exports = mongoose.model("UserTestData", UserTestSchema);
