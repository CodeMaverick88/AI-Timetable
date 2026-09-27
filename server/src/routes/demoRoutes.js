const express = require("express");

const {
  resetDemo,
  injectConflict,
  getDemoEntries,
} = require("../controllers/demoController");

const router = express.Router();

router.get("/entries", getDemoEntries);
router.post("/reset", resetDemo);
router.post("/inject-conflict", injectConflict);

module.exports = router;
