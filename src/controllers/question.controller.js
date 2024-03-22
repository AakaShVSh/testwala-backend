const express = require("express");
const router = express.Router();
const questionSchema = require("../models/question.model");


router.get("/",async (req,res) => {
    try {
        const Question = await questionSchema.find({}).lean().exec();
        return res.send({status:200,data:Question}) 
    } catch (error) {
        return res.send({err:error});
    }
});

router.post("/create-Question",  async (req, res) => {
  try{
        const Question = await questionSchema.create(req.body);
        return res.status(200).send({message:"Product created successfully",data:Question});
       
  } catch (error) {
    return res.send({ createing_error: error.message });
  }
});

router.patch("/updating-Question/:id",  async (req, res) => {
  try {
    const Question = await questionSchema.findByIdAndUpdate(req.params.id, req.body, { new: true }).lean().exec();
    return res.status(200).send({message:"Question Updated successfully",data:Question});
  } catch (error) {
    return res.send({ updating_error: error });
  }
});
router.delete("/delete-Question/:id",  async (req, res) => {
  try {
    await questionSchema.findByIdAndDelete(req.params.id);
    return res.status(200).send("Question delete successfully");
  } catch (error) {
    return res.send({ deleting_error: error });
  }
});
 
module.exports = router;