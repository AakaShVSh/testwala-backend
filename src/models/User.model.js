const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const UserSchema = new mongoose.Schema(
  {
    Email: { type: String, trim: true, unique: true, match: /.+\@.+\..+/,required:true },
    Password: { type: String, required: true },
    // TestTaken: [{ type: [Object], required: true }],
    // Rank: { type: Number, required: true },
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