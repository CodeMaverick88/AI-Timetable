const express = require("express");

const {
  detectConflicts,
  getConflicts,
} = require("../controllers/conflictController");

const router = express.Router();

router.post("/detect", detectConflicts);
router.get("/", getConflicts);

module.exports = router;
