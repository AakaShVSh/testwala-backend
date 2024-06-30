const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const UserSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      trim: true,
      unique: true,
      match: /.+\@.+\..+/,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    firstName: {
      type: String,
      trim: true,
      required: true,
    },
    registeredAt: {
      type: Date,
      default: Date.now,
    },
    lastLogin: {
      type: Date,
    },
    // profilePicture: {
    //   type: String, // URL to the profile picture
    // },
    // address: {
    //   street: {
    //     type: String,
    //   },
    //   city: {
    //     type: String,
    //   },
    //   state: {
    //     type: String,
    //   },
    //   country: {
    //     type: String,
    //   },
    //   zipCode: {
    //     type: String,
    //   },
    // },
    phone: {
      type: String,
    },
    // testTaken: [
    //   {
    //     testId: {
    //       type: mongoose.Schema.Types.ObjectId,
    //       ref: "Test",
    //     },
    //     score: {
    //       type: Number,
    //     },
    //     takenAt: {
    //       type: Date,
    //       default: Date.now,
    //     },
    //   },
    // ],
    rank: {
      type: Number,
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    preferences: {
      // notifications: {
        // email: {
        //   type: Boolean,
        //   default: true,
        // },
        // sms: {
        //   type: Boolean,
        //   default: false,
        // },
      // },
      theme: {
        type: String,
        enum: ["light", "dark"],
        default: "light",
      },
    },
  },
  {
    versionKey: false,
    timestamps: true,
  }
);


UserSchema.pre("save",function (next){
  const hash = bcrypt.hashSync(this.Password,10);
  this.Password = hash;
  next();
})

UserSchema.methods.checkPassword = function(password){
  return bcrypt.compareSync(password,this.Password);
}

module.exports = mongoose.model("User",UserSchema);