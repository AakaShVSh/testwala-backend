// const mongoose = require("mongoose");
// const bcrypt = require("bcrypt");

// const UserSchema = new mongoose.Schema(
//   {
//     Name: { type: String, trim: true, default: "User" },
//     Email: {
//       type: String,
//       trim: true,
//       lowercase: true,
//       unique: true,
//       required: true,
//       match: /.+@.+\..+/,
//     },
//     Password: { type: String, required: true },
//     Phone: { type: String, default: "" },
//     isAdmin: { type: Boolean, default: false },

//     coachingId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Coaching",
//       default: null,
//     },

//     // ── Activity Tracking ──────────────────────────────────────────────────
//     lastLogin: { type: Date, default: null },
//     lastSeen: { type: Date, default: null }, // updated on every /auth/me call
//     isOnline: { type: Boolean, default: false },

//     // Track first-view of a test (when student opens test link for the first time)
//     testFirstViews: [
//       {
//         testId: { type: mongoose.Schema.Types.ObjectId, ref: "Test" },
//         viewedAt: { type: Date, default: Date.now },
//         // Auth state at time of first view
//         wasLoggedIn: { type: Boolean, default: false },
//         // How many days since last login when they viewed (null if was online)
//         daysSinceLastLogin: { type: Number, default: null },
//       },
//     ],

//     // ── Preferences ────────────────────────────────────────────────────────
//     preferences: {
//       theme: { type: String, enum: ["light", "dark"], default: "light" },
//     },
//   },
//   { versionKey: false, timestamps: true },
// );

// /* Hash password before first save only */
// UserSchema.pre("save", async function (next) {
//   if (!this.isModified("Password")) return next();
//   this.Password = await bcrypt.hash(this.Password, 12);
//   next();
// });

// UserSchema.methods.checkPassword = function (plain) {
//   return bcrypt.compareSync(plain, this.Password);
// };

// /* Helper: days since last login */
// UserSchema.methods.daysSinceLogin = function () {
//   if (!this.lastLogin) return null;
//   const diff = Date.now() - new Date(this.lastLogin).getTime();
//   return Math.floor(diff / (1000 * 60 * 60 * 24));
// };

// module.exports = mongoose.model("User", UserSchema);

const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const UserSchema = new mongoose.Schema(
  {
    Name: { type: String, trim: true, default: "User" },
    Email: {
      type: String,
      trim: true,
      lowercase: true,
      unique: true,
      required: true,
      match: /.+@.+\..+/,
    },
    Password: { type: String, required: true },
    Phone: { type: String, default: "" },
    isAdmin: { type: Boolean, default: false },

    coachingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Coaching",
      default: null,
    },

    // ── Activity Tracking ──────────────────────────────────────────────────
    lastLogin: { type: Date, default: null },
    lastSeen: { type: Date, default: null }, // updated on every /auth/me call
    isOnline: { type: Boolean, default: false },

    // Track first-view of a test (when student opens test link for the first time)
    testFirstViews: [
      {
        testId: { type: mongoose.Schema.Types.ObjectId, ref: "Test" },
        viewedAt: { type: Date, default: Date.now },
        // Auth state at time of first view
        wasLoggedIn: { type: Boolean, default: false },
        // How many days since last login when they viewed (null if was online)
        daysSinceLastLogin: { type: Number, default: null },
      },
    ],

    // ── Preferences ────────────────────────────────────────────────────────
    preferences: {
      theme: { type: String, enum: ["light", "dark"], default: "light" },
    },

    // ── Password Reset ─────────────────────────────────────────────────────
    // OTP is stored hashed — raw value is never returned to the client.
    // Expiry allows the server to reject stale OTPs without extra state.
    passwordResetOtp: { type: String, default: null },
    passwordResetExpiry: { type: Date, default: null },
  },
  { versionKey: false, timestamps: true },
);

// Admin dashboard query: isAdmin + lastSeen used together
UserSchema.index({ isAdmin: 1, lastSeen: -1 });
// Fast coaching owner lookups
UserSchema.index({ coachingId: 1 });

UserSchema.pre("save", async function (next) {
  if (!this.isModified("Password")) return next();
  this.Password = await bcrypt.hash(this.Password, 12);
  next();
});

UserSchema.methods.checkPassword = function (plain) {
  return bcrypt.compareSync(plain, this.Password);
};

/* Helper: days since last login */
UserSchema.methods.daysSinceLogin = function () {
  if (!this.lastLogin) return null;
  const diff = Date.now() - new Date(this.lastLogin).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
};

module.exports = mongoose.model("User", UserSchema);