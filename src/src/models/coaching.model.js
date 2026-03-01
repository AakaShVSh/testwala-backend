const mongoose = require("mongoose");

const CoachingSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    // URL slug e.g. "abc-coaching" → accessed via /abc-coaching
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: /^[a-z0-9-]+$/,
    },
    examTypes: {
      type: [String],
      enum: ["SSC", "UPSC", "BANK", "RAILWAY", "STATE", "DEFENCE", "OTHER"],
      default: [],
    },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    description: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
  },
  { versionKey: false, timestamps: true },
);

module.exports = mongoose.model("Coaching", CoachingSchema);
