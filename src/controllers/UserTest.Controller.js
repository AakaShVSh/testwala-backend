const express = require("express");
const router = express.Router();
const UserTestSchema = require("../models/userTestData.model");

router.get("/", async (req, res) => {
  try {
    const userTestData = await UserTestSchema.find({}).lean().exec();
    return res.send({ status: 200, data: userTestData });
  } catch (error) {
    return res.send({ err: error });
  }
});

router.post("/AddNew-userTestData", async (req, res) => {
  try {
    console.log(req);
    const userTestData = await UserTestSchema.create(req.body);
    return res
      .status(200)
      .send({ message: "Product created successfully", data: userTestData });
  } catch (error) {
    return res.send({ createing_error: error.message });
  }
});

router.patch("/updating-userTestData/:id", async (req, res) => {
  try {
    const userTestData = await UserTestSchema.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    )
      .lean()
      .exec();
    return res
      .status(200)
      .send({
        message: "userTestData Updated successfully",
        data: userTestData,
      });
  } catch (error) {
    return res.send({ updating_error: error });
  }
});
router.delete("/delete-userTestData/:id", async (req, res) => {
  try {
    await UserTestSchema.findByIdAndDelete(req.params.id);
    return res.status(200).send("userTestData delete successfully");
  } catch (error) {
    return res.send({ deleting_error: error });
  }
});

module.exports = router;
