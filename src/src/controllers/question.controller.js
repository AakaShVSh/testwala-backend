const express = require("express");
const router = express.Router();
const Question = require("../models/Question.model");

/* ─────────────────────────────────────────────
   HELPER – build a filter object from query params
   Supported params: subject, section, topic, difficultyLevel
   All are optional so you can filter as broadly or narrowly as needed.
───────────────────────────────────────────── */
const buildFilter = (query) => {
  const filter = {};
  if (query.subject) filter.subject = query.subject.toLowerCase().trim();
  if (query.section) filter.section = new RegExp(`^${query.section}$`, "i");
  if (query.topic) filter.topic = new RegExp(`^${query.topic}$`, "i");
  if (query.difficultyLevel) filter.difficultyLevel = query.difficultyLevel;
  return filter;
};

/* ─────────────────────────────────────────────
   GET /questions
   Returns all questions, or filtered by query params.

   Examples:
     GET /questions                              → all
     GET /questions?subject=math                 → all math
     GET /questions?subject=english&section=Verbal
     GET /questions?subject=gs&topic=History&difficultyLevel=hard
───────────────────────────────────────────── */
router.get("/", async (req, res) => {
  try {
    const filter = buildFilter(req.query);
    const questions = await Question.find(filter).lean().exec();
    return res.status(200).send({ status: 200, data: questions });
  } catch (error) {
    return res.status(500).send({ error: error.message });
  }
});

/* ─────────────────────────────────────────────
   GET /questions/subjects
   Returns a structured tree of all subjects → sections → topics
   so the frontend can build menus without hardcoding anything.

   Response shape:
   {
     "math": {
       "Quantitative Aptitude": ["Profit & Loss", "Time & Work", ...]
     },
     "english": { ... },
     ...
   }
───────────────────────────────────────────── */
router.get("/subjects", async (req, res) => {
  try {
    const pipeline = [
      {
        $group: {
          _id: {
            subject: "$subject",
            section: "$section",
            topic: "$topic",
          },
        },
      },
      { $sort: { "_id.subject": 1, "_id.section": 1, "_id.topic": 1 } },
    ];

    const raw = await Question.aggregate(pipeline).exec();

    // Build nested object: { subject: { section: [topics] } }
    const tree = {};
    for (const row of raw) {
      const { subject, section, topic } = row._id;
      if (!tree[subject]) tree[subject] = {};
      if (!tree[subject][section]) tree[subject][section] = [];
      tree[subject][section].push(topic);
    }

    return res.status(200).send({ status: 200, data: tree });
  } catch (error) {
    return res.status(500).send({ error: error.message });
  }
});

/* ─────────────────────────────────────────────
   GET /questions/:id
   Returns a single question document by its _id.
───────────────────────────────────────────── */
router.get("/:id", async (req, res) => {
  try {
    const question = await Question.findById(req.params.id).lean().exec();
    if (!question) return res.status(404).send({ message: "Not found" });
    return res.status(200).send({ status: 200, data: question });
  } catch (error) {
    return res.status(500).send({ error: error.message });
  }
});

/* ─────────────────────────────────────────────
   POST /questions/create
   Create one question document (one subject/section/topic group).

   Body example:
   {
     "subject": "math",
     "section": "Quantitative Aptitude",
     "topic": "Profit & Loss",
     "difficultyLevel": "medium",
     "question": [
       {
         "qus": "A sells a bike at 20% profit...",
         "options": ["Rs 100", "Rs 200", "Rs 300", "Rs 400"],
         "answer": 1,
         "explanation": "Explanation here"
       }
     ]
   }
───────────────────────────────────────────── */
router.post("/create", async (req, res) => {
  try {
    const question = await Question.create(req.body);
    return res
      .status(201)
      .send({ message: "Questions added successfully", data: question });
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

/* ─────────────────────────────────────────────
   POST /questions/create-many
   Bulk insert multiple question documents at once.

   Body: Array of question documents (same shape as /create body).
───────────────────────────────────────────── */
router.post("/create-many", async (req, res) => {
  try {
    if (!Array.isArray(req.body)) {
      return res.status(400).send({ error: "Body must be an array" });
    }
    const questions = await Question.insertMany(req.body, { ordered: false });
    return res
      .status(201)
      .send({
        message: `${questions.length} documents inserted`,
        data: questions,
      });
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

/* ─────────────────────────────────────────────
   PATCH /questions/:id
   Update a question document (any field).

   Body: partial question document fields to update.
   Pass { "question": [...] } to replace the questions array,
   or any other top-level fields (subject, section, topic, etc.)
───────────────────────────────────────────── */
router.patch("/:id", async (req, res) => {
  try {
    const question = await Question.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    })
      .lean()
      .exec();
    if (!question) return res.status(404).send({ message: "Not found" });
    return res
      .status(200)
      .send({ message: "Question updated successfully", data: question });
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

/* ─────────────────────────────────────────────
   PATCH /questions/:id/add-items
   Push new question items into the `question` array
   without replacing the whole document.

   Body: { "items": [ { qus, options, answer, ... } ] }
───────────────────────────────────────────── */
router.patch("/:id/add-items", async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).send({ error: "'items' must be an array" });
    }
    const question = await Question.findByIdAndUpdate(
      req.params.id,
      { $push: { question: { $each: items } } },
      { new: true },
    )
      .lean()
      .exec();
    if (!question) return res.status(404).send({ message: "Not found" });
    return res
      .status(200)
      .send({ message: "Items added successfully", data: question });
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

/* ─────────────────────────────────────────────
   DELETE /questions/:id
   Delete an entire question document.
───────────────────────────────────────────── */
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Question.findByIdAndDelete(req.params.id).exec();
    if (!deleted) return res.status(404).send({ message: "Not found" });
    return res.status(200).send({ message: "Question deleted successfully" });
  } catch (error) {
    return res.status(500).send({ error: error.message });
  }
});

/* ─────────────────────────────────────────────
   DELETE /questions/:id/items/:itemId
   Delete a single question item from the `question` array.
───────────────────────────────────────────── */
router.delete("/:id/items/:itemId", async (req, res) => {
  try {
    const question = await Question.findByIdAndUpdate(
      req.params.id,
      { $pull: { question: { _id: req.params.itemId } } },
      { new: true },
    )
      .lean()
      .exec();
    if (!question) return res.status(404).send({ message: "Not found" });
    return res
      .status(200)
      .send({ message: "Question item deleted successfully", data: question });
  } catch (error) {
    return res.status(500).send({ error: error.message });
  }
});

module.exports = router;
