// const mongoose = require("mongoose");

// const CoachingSchema = new mongoose.Schema(
//   {
//     name: { type: String, required: true, trim: true },
//     slug: {
//       type: String,
//       required: true,
//       unique: true,
//       lowercase: true,
//       trim: true,
//       match: /^[a-z0-9-]+$/,
//     },
//     description: { type: String, default: "" },
//     city: { type: String, default: "", trim: true },
//     email: { type: String, default: "", trim: true, lowercase: true },
//     phone: { type: String, default: "", trim: true },
//     website: { type: String, default: "", trim: true },
//     logoUrl: { type: String, default: "" },

//     examTypes: {
//       type: [String],
//       enum: ["SSC", "UPSC", "BANK", "RAILWAY", "STATE", "DEFENCE", "OTHER"],
//       default: [],
//     },

//     // The user who owns / manages this coaching
//     owner: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//       required: true,
//     },

//     isActive: { type: Boolean, default: true },
//   },
//   { versionKey: false, timestamps: true },
// );

// module.exports = mongoose.model("Coaching", CoachingSchema);








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

    // ── Location / Contact ─────────────────────────────────────────────────
    city: { type: String, default: "", trim: true },
    state: { type: String, default: "", trim: true },
    pincode: { type: String, default: "", trim: true },
    fullAddress: { type: String, default: "", trim: true }, // Street address
    landmark: { type: String, default: "", trim: true },
    email: { type: String, default: "", trim: true, lowercase: true },
    phone: { type: String, default: "", trim: true },
    whatsapp: { type: String, default: "", trim: true },
    website: { type: String, default: "", trim: true },
    logoUrl: { type: String, default: "" },

    // ── Verification proof ─────────────────────────────────────────────────
    // Coach submits these so admin can verify the coaching is real
    establishedYear: { type: Number, default: null },
    studentCount: { type: String, default: "" }, // e.g. "200-500"
    googleMapsUrl: { type: String, default: "" },
    registrationNumber: { type: String, default: "" }, // Govt reg. if any
    additionalInfo: { type: String, default: "" }, // Anything else

    examTypes: {
      type: [String],
      enum: ["SSC", "UPSC", "BANK", "RAILWAY", "STATE", "DEFENCE", "OTHER"],
      default: [],
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // ── Admin approval flow ────────────────────────────────────────────────
    // pending → approved (isActive=true) | rejected
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    adminNote: { type: String, default: "" }, // Reason for rejection etc.
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewedAt: { type: Date, default: null },

    isActive: { type: Boolean, default: false }, // true only after approval
  },
  { versionKey: false, timestamps: true },
);

module.exports = mongoose.model("Coaching", CoachingSchema);