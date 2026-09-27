const express = require("express");

const {
  runSolver,
  getSolverRun,
  getSolverActions,
} = require("../controllers/solverController");

const router = express.Router();

router.post("/run", runSolver);

router.get(
  "/runs/:id",
  getSolverRun
);

router.get(
  "/runs/:id/actions",
  getSolverActions
);

module.exports = router;

