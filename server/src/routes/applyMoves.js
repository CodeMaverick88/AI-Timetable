// @ts-nocheck
const express = require("express");
const prisma = require("../lib/prisma");

const router = express.Router();

router.get("/reference", async (req, res) => {
  try {
    const [timeSlots, venues] = await Promise.all([
      prisma.timeSlot.findMany({
        where: { active: true },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.venue.findMany({
        where: { active: true },
        orderBy: { code: "asc" },
        include: { availabilities: true },
      }),
    ]);

    return res.json({ timeSlots, venues });
  } catch (error) {
    console.error("[ORBIT] reference load failed:", error);
    return res
      .status(500)
      .json({ message: error.message || "Could not load reference data." });
  }
});

router.post("/apply", async (req, res) => {
  const moves = Array.isArray(req.body && req.body.moves) ? req.body.moves : [];

  if (moves.length === 0) {
    return res.status(400).json({ message: "No moves were supplied." });
  }

  try {
    await prisma.$transaction(
      moves.map((move) =>
        prisma.timetableEntry.update({
          where: { id: move.timetableEntryId },
          data: {
            ...(move.timeSlotId ? { timeSlotId: move.timeSlotId } : {}),
            ...(move.venueId !== undefined ? { venueId: move.venueId } : {}),
          },
        })
      )
    );

    return res.json({ success: true, updated: moves.length });
  } catch (error) {
    console.error("[ORBIT] apply moves failed:", error);
    return res
      .status(500)
      .json({ message: error.message || "Could not save the moves." });
  }
});

module.exports = router;