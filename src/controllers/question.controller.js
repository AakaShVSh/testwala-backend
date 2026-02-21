const express = require("express");
const router = express.Router();
const Question = require("../models/question.model");

router.get("/:subject?", async (req, res) => {
  try {
    const { subject } = req.params;
    const { section, topic, difficultyLevel } = req.query;

    const filter = {};
    if (subject) filter.subject = subject;
    if (section) filter.section = section;
    if (topic) filter.topic = topic;
    if (difficultyLevel) filter.difficultyLevel = difficultyLevel;

    const questions = await Question.find(filter).lean().exec();
    return res.send({ status: 200, data: questions });
  } catch (error) {
    return res.status(500).send({ err: error.message });
  }
});

router.post("/create", async (req, res) => {
  try {
    const question = await Question.create(req.body);
    return res
      .status(200)
      .send({ message: "Question added successfully", data: question });
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const question = await Question.findByIdAndUpdate(
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
    const question = await Question.findByIdAndDelete(req.params.id);

    if (!question) {
      return res.status(404).send({ message: "Question not found" });
    }

    return res.status(200).send({ message: "Question deleted successfully" });
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

module.exports = router;
