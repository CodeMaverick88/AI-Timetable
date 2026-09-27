const express = require("express");
const { getTimetable } = require("../controllers/timetableController");

const router = express.Router();

router.get("/", getTimetable);

module.exports = router;
