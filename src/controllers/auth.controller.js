const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const User = require("../models/User.model");
const router = express.Router();
// const cookies = require("cookie-parser")
const generateToken = (user) => {
  return jwt.sign({ user }, "jakjsdgskasjbsabdjsd");
};
router.get("/", async (req, res) => {
  try {
    const Question = await User.find({}).lean().exec();
    return res.send({ status: 200, data: Question });
  } catch (error) {
    return res.send({ err: error });
  }
});
router.post("/signup", async (req, res) => {
  try {
    const { Email } = req.body;
    const alreadyuser = await User.findOne({ Email });
    // console.log("h", alreadyuser, Email);
    if (!alreadyuser && Email != null) {
      const user = await User.create(req.body);
      const token = generateToken(req.body);

      req.cookies.Token = token;
      return res.send({ message: "registration success", token });
    } else if (alreadyuser) {
      return res.send({ message: "Email is already register" });
    }
  } catch (error) {
    return res.send({ message: error.message });
  }
});

router.post("/signin", async (req, res) => {
  try {
    const { Email, Password } = req.body;
    const alreadyuser = await User.findOne({ Email });
    console.log(req.body);
    //because we are finding in already user variable and below we are checking its password
    const match = alreadyuser.checkPassword(Password);

    if (alreadyuser && Email != null) {
      if (!match) {
        return res.send({ message: "Wrong Email or Password" });
      } else if (match) {
        let token = generateToken(req.body);
        return res.send({ message: "login success", data: req.body, token });
      }
    }else if(!alreadyuser){
      return res.send({ message: "Email is not Register" });
    }
  } catch (error) {
    return res.send({ message: "Wrong Email or Password", err: error.message });
  }
});

router.patch("/change-password/:id", async (req, res) => {
  try {
    const hash = bcrypt.hashSync(req.body.Password, 10);
    req.body.Password = hash;
    const user = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    })
      .lean()
      .exec();
    return res.send({ message: "Password Updated Successfully", data: user });
  } catch (error) {
    return res.send({ message: error.message });
  }
});
module.exports = router;
