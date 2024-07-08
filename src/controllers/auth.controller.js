const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const User = require("../models/User.model");
const router = express.Router();
// const cookies = require("cookie-parser")
const mailjet = require("node-mailjet").apiConnect(
  "daeaed556b3ccf5afdfdac33268e3f8d",
  "f8d1e680a42bb498eec9e19aa9e6a379"
);

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
    console.log("h", alreadyuser, Email);
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
    // console.log(req.body);
    //because we are finding in already user variable and below we are checking its password
    const match = alreadyuser.checkPassword(Password);
  console.log("h", alreadyuser, Email);
    if (alreadyuser && Email != null) {
      if (!match) {
        return res.send({ message: "Wrong Email or Password" });
      } else if (match) {
        let token = generateToken(req.body);
        return res.send({ message: "login success", data: alreadyuser, token });
      }
    }else if(!alreadyuser){
      return res.send({ message: "Email is not Register" });
    }
  } catch (error) {
    return res.send({ message: "Wrong Email or Password", err: error.message });
  }
});

router.post("/forgot-password", async (req, res) => {
  const { Email } = req.body;
  try {
    // if (email == "" && phone == null) {
    //   console.log("emaildfgfdgdfgdf");
    //   return res.send("Email or Phone number is required");
    // }
    // if (phone != null && email == null) {
    //   const userPhone = await User.findOne({ phone });
    //   if (!userPhone) {
    //     console.log("number");
    //     return res.status(400).send({ message: "number is not register" });
    //   }
    //   return res.status(200).send({
    //     Status: "OTP on number sent successfully",
    //     // Otp: randomOtp,
    //     method: "phone",
    //   });
    // }
    // if (phone == null && email != null) {
      const userEmail = await User.findOne({ Email });
      if (!userEmail) {
        console.log("email");
        return res.send({ message: "email is not register" });
      }
      const randomOtp = Math.floor(Math.random() * 9000 + 1000);
      const request = mailjet.post("send", { version: "v3.1" }).request({
        Messages: [
          {
            From: {
              Email: "akvish052@gmail.com",
              Name: "Revision Karle",
            },
            To: [
              {
                Email: Email,
                Name: "aakash",
              },
            ],
            Subject: "OTP for Password Reset",
            TextPart: `Dear user do not send this OTP to anyone. Your Otp is ${randomOtp}`,
            HTMLPart: `<h3>Dear user do not send this OTP to anyone. Your Otp is <b>${randomOtp}<b/><h3/>`,
          },
        ],
      });
      request
        .then((result) => {
          console.log(result);
          return res.status(200).send({
            Status: "Email sended successfully",
            user:userEmail,
            Otp: randomOtp,
            method: "email",
          });
        })
        .catch((err) => {
          console.log(err);
          return res.status(400).send({ "Sending Email failed": err });
        });
    // }
  } catch (error) {
         console.log(error);
    return res.status(400).send({ error: error.message });
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
