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

    // If this user owns a coaching centre, store its ref here
    coachingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Coaching",
      default: null,
    },

    lastLogin: { type: Date },
    preferences: {
      theme: { type: String, enum: ["light", "dark"], default: "light" },
    },
  },
  { versionKey: false, timestamps: true },
);

/* Hash password before first save only */
UserSchema.pre("save", async function (next) {
  if (!this.isModified("Password")) return next();
  this.Password = await bcrypt.hash(this.Password, 12);
  next();
});

UserSchema.methods.checkPassword = function (plain) {
  return bcrypt.compareSync(plain, this.Password);
};

module.exports = mongoose.model("User", UserSchema);
