const mongoose = require("mongoose");

const CoachingSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: /^[a-z0-9-]+$/,
    },
    description: { type: String, default: "" },
    city: { type: String, default: "", trim: true },
    email: { type: String, default: "", trim: true, lowercase: true },
    phone: { type: String, default: "", trim: true },
    website: { type: String, default: "", trim: true },
    logoUrl: { type: String, default: "" },

    examTypes: {
      type: [String],
      enum: ["SSC", "UPSC", "BANK", "RAILWAY", "STATE", "DEFENCE", "OTHER"],
      default: [],
    },

    // The user who owns / manages this coaching
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    isActive: { type: Boolean, default: true },
  },
  { versionKey: false, timestamps: true },
);

module.exports = mongoose.model("Coaching", CoachingSchema);
