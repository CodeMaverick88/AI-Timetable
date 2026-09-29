require("dotenv").config();

const express = require("express");
const cors = require("cors");

const prisma = require("./lib/prisma");
const conflictRoutes = require("./routes/conflictRoutes");
const solverRoutes = require("./routes/solverRoutes");
const timetableRoutes = require("./routes/timetableRoutes");
const errorHandler = require("./middleware/errorHandler");

const app = express();

const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "AI Timetable API is running",
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/health/database", async (req, res, next) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.json({
      success: true,
      database: "connected",
      message: "Neon PostgreSQL connection is working",
    });
  } catch (error) {
    next(error);
  }
});

app.use("/api/conflicts", conflictRoutes);
app.use("/api/solver", solverRoutes);
app.use("/api/solver", require("./routes/applyMoves"));
app.use("/api/timetable", timetableRoutes);
app.use("/api/demo", require("./routes/demoRoutes"));

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`AI Timetable API running on http://localhost:${PORT}`);
});
