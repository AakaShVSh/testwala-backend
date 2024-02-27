const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema({
  section: {type:String,required:true},
  question:{type:String,required:true},
  options: {type:[String],required:true},
  answer: {type:Number,required:true},
},{
    versionKey:false,
    timestamps:true,
});

module.exports = mongoose.model("question",questionSchema);