const express = require("express");
const router = express.Router();
const Result = require("../models/Result.model");
const Test = require("../models/Test.model");

/* ─────────────────────────────────────────────
   POST /results/submit
   Called by TakeTest (frontend) when a student finishes a test.

   Expected body — field names match Result.model exactly:
   {
     studentId,           required  (ObjectId)
     testId,              required  (ObjectId)
     coachingId?,                   (ObjectId | null)

     score,               correct answer count
     totalQuestions,
     wrongAnswers,        wrong answer count
     percentage,          0-100 (also auto-computed by pre-save hook)
     timeTaken,           seconds elapsed

     allAnswers,          { "0": 2, "1": 0 }  → questionIndex: chosenOptionIndex

     correctQus,          [number]
     wrongQus,            [number]
     answeredQus,         [number]
     notAnsweredQus,      [number]
     markedAndAnswered,   [number]
     markedNotAnswered,   [number]
   }
───────────────────────────────────────────── */
router.post("/submit", async (req, res) => {
  try {
    const { studentId, testId } = req.body;

    if (!studentId)
      return res.status(400).send({ message: "studentId is required" });
    if (!testId) return res.status(400).send({ message: "testId is required" });

    const test = await Test.findById(testId).lean().exec();
    if (!test) return res.status(404).send({ message: "Test not found" });

    // Result.create passes the body straight through to the model.
    // The pre-save hook will auto-compute: percentage, isPassed, skipped.
    const result = await Result.create(req.body);

    // Increment attempt counter — fire-and-forget, don't block response
    Test.findByIdAndUpdate(testId, { $inc: { totalAttempts: 1 } })
      .exec()
      .catch(() => {});

    return res.status(201).send({ message: "Result saved", data: result });
  } catch (error) {
    return res.status(400).send({ message: error.message });
  }
});

/* ─────────────────────────────────────────────
   GET /results/student/:studentId
   All attempts by one student.
   Omits questions + allAnswers for a lighter payload.

   Query params:
     ?testId=xxx   → filter to one test
───────────────────────────────────────────── */
router.get("/student/:studentId", async (req, res) => {
  try {
    const filter = { studentId: req.params.studentId };
    if (req.query.testId) filter.testId = req.query.testId;

    const results = await Result.find(filter)
      .sort({ createdAt: -1 })
      .populate("testId", "title examType timeLimitMin slug")
      .select("-allAnswers")
      .lean()
      .exec();

    return res.status(200).send({ status: 200, data: results });
  } catch (error) {
    return res.status(500).send({ error: error.message });
  }
});

/* ─────────────────────────────────────────────
   GET /results/test/:testId
   All results for a test — coach / admin leaderboard view.
   Sorted best score first, fastest time as tiebreaker.
───────────────────────────────────────────── */
router.get("/test/:testId", async (req, res) => {
  try {
    const results = await Result.find({ testId: req.params.testId })
      .sort({ percentage: -1, timeTaken: 1 })
      .populate("studentId", "Name Email Phone")
      .select("-allAnswers")
      .lean()
      .exec();

    return res.status(200).send({ status: 200, data: results });
  } catch (error) {
    return res.status(500).send({ error: error.message });
  }
});

/* ─────────────────────────────────────────────
   GET /results/:id
   Single result with full detail — used by ResultPage / ReviewTest.
───────────────────────────────────────────── */
router.get("/:id", async (req, res) => {
  try {
    const result = await Result.findById(req.params.id)
      .populate("testId", "title examType timeLimitMin slug")
      .populate("studentId", "Name Email")
      .lean()
      .exec();

    if (!result) return res.status(404).send({ message: "Result not found" });

    return res.status(200).send({ status: 200, data: result });
  } catch (error) {
    return res.status(500).send({ error: error.message });
  }
});

/* ─────────────────────────────────────────────
   DELETE /results/:id
───────────────────────────────────────────── */
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Result.findByIdAndDelete(req.params.id).exec();
    if (!deleted) return res.status(404).send({ message: "Not found" });

    return res.status(200).send({ message: "Result deleted successfully" });
  } catch (error) {
    return res.status(500).send({ error: error.message });
  }
});

module.exports = router;
