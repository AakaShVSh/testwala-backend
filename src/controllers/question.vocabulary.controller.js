const express = require("express");
const router = express.Router();
const QuestionVocabularyData = require("../models/question.model");
const { body, validationResult } = require("express-validator");

router.get("/", async (req, res) => {
  try {
    const data = await QuestionVocabularyData.find({}).lean().exec();
    return res.send({ status: 200, data });
  } catch (error) {
    return res.status(500).send({ err: error.message });
  }
});

router.post(
  "/create",
  [
    body("subject").notEmpty().withMessage("subject required"),
    body("section").notEmpty().withMessage("section required"),
    body("topic").notEmpty().withMessage("topic required"),
  ],
  async (req, res) => {
    try {
      const result = validationResult(req);
      if (!result.isEmpty()) {
        return res.status(422).json({ errors: result.array() });
      }

      const question = await QuestionVocabularyData.create(req.body);
      return res
        .status(200)
        .send({ message: "Question added successfully", data: question });
    } catch (error) {
      return res.status(400).send({ error: error.message });
    }
  }
);

router.patch("/:id", async (req, res) => {
  try {
    const question = await QuestionVocabularyData.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    )
      .lean()
      .exec();

    if (!question) {
      return res.status(404).send({ message: "Question not found" });
    }

    return res
      .status(200)
      .send({ message: "Question updated successfully", data: question });
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const question = await QuestionVocabularyData.findByIdAndDelete(req.params.id);

    if (!question) {
      return res.status(404).send({ message: "Question not found" });
    }

    return res.status(200).send({ message: "Question deleted successfully" });
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

module.exports = router;
