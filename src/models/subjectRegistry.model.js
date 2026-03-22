/**
 * subjectRegistry.model.js
 *
 * Admin-managed registry of subjects, sections, and exam types.
 * Used by frontend to build menus dynamically instead of hardcoding.
 */
const mongoose = require("mongoose");

const SubjectRegistrySchema = new mongoose.Schema(
  {
    // e.g. "mathematics", "general knowledge", "english"
    name: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    // Display label (title-case)
    displayName: { type: String, trim: true, default: "" },

    description: { type: String, default: "" },

    // Sections under this subject e.g. ["Algebra", "Geometry"]
    sections: [{ type: String, trim: true }],

    // Which exam types commonly use this subject
    examTypes: [
      {
        type: String,
        enum: [
          "SSC",
          "UPSC",
          "BANK",
          "RAILWAY",
          "STATE",
          "DEFENCE",
          "GENERAL",
          "OTHER",
        ],
      },
    ],

    // Icon name (optional, for frontend display)
    icon: { type: String, default: "" },

    isActive: { type: Boolean, default: true },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { versionKey: false, timestamps: true },
);

SubjectRegistrySchema.index({ name: 1 });
SubjectRegistrySchema.index({ examTypes: 1 });

module.exports = mongoose.model("SubjectRegistry", SubjectRegistrySchema);
