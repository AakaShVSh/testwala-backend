const express = require("express");
const router = express.Router();
const Coaching = require("../models/Coaching.model");

const toSlug = (str) =>
  str
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");

/* ─────────────────────────────────────────────
   POST /coaching/create
   Body: { name, examTypes[], email?, phone?, city?, website?, ownerId?, slug? }
   slug auto-generated from name if not provided.
   examTypes: "SSC" | "UPSC" | "BANKING" | "RAILWAY" | "STATE_PSC" | "OTHER"
───────────────────────────────────────────── */
router.post("/create", async (req, res) => {
  try {
    const { name, slug } = req.body;
    if (!name) return res.status(400).send({ message: "name is required" });

    req.body.slug = slug || toSlug(name);

    const coaching = await Coaching.create(req.body);
    return res
      .status(201)
      .send({ message: "Coaching created", data: coaching });
  } catch (error) {
    if (error.code === 11000)
      return res
        .status(409)
        .send({
          message:
            "Slug already exists. Try a different name or pass a custom slug.",
        });
    return res.status(400).send({ message: error.message });
  }
});

/* ─────────────────────────────────────────────
   GET /coaching
   Returns all active coachings.
   Examples:
     GET /coaching
     GET /coaching?examType=SSC
     GET /coaching?city=Delhi
───────────────────────────────────────────── */
router.get("/", async (req, res) => {
  try {
    const filter = { isActive: true };
    if (req.query.examType) filter.examTypes = req.query.examType;
    if (req.query.city) filter.city = new RegExp(req.query.city, "i");

    const list = await Coaching.find(filter).lean().exec();
    return res.status(200).send({ status: 200, data: list });
  } catch (error) {
    return res.status(500).send({ message: error.message });
  }
});

/* ─────────────────────────────────────────────
   GET /coaching/:slug
   Get one coaching by its URL slug e.g. "vision-ias".
───────────────────────────────────────────── */
router.get("/:slug", async (req, res) => {
  try {
    const coaching = await Coaching.findOne({
      slug: req.params.slug,
      isActive: true,
    })
      .lean()
      .exec();
    if (!coaching)
      return res.status(404).send({ message: "Coaching not found" });
    return res.status(200).send({ status: 200, data: coaching });
  } catch (error) {
    return res.status(500).send({ message: error.message });
  }
});

/* ─────────────────────────────────────────────
   PATCH /coaching/:id
   Update any field. If name changes, slug is auto-regenerated
   unless a custom slug is also passed in the body.
───────────────────────────────────────────── */
router.patch("/:id", async (req, res) => {
  try {
    if (req.body.name && !req.body.slug) {
      req.body.slug = toSlug(req.body.name);
    }
    const coaching = await Coaching.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    })
      .lean()
      .exec();
    if (!coaching) return res.status(404).send({ message: "Not found" });
    return res
      .status(200)
      .send({ message: "Coaching updated", data: coaching });
  } catch (error) {
    return res.status(400).send({ message: error.message });
  }
});

/* ─────────────────────────────────────────────
   DELETE /coaching/:id
   Soft delete — sets isActive: false so data is preserved.
───────────────────────────────────────────── */
router.delete("/:id", async (req, res) => {
  try {
    const coaching = await Coaching.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true },
    )
      .lean()
      .exec();
    if (!coaching) return res.status(404).send({ message: "Not found" });
    return res.status(200).send({ message: "Coaching deactivated" });
  } catch (error) {
    return res.status(500).send({ message: error.message });
  }
});

module.exports = router;
