const { execFile } = require("child_process");
const path = require("path");
const prisma = require("../lib/prisma");

function runSeed() {
  return new Promise((resolve, reject) => {
    const seedPath = path.join(process.cwd(), "prisma", "seed.js");

    execFile(process.execPath, [seedPath], { cwd: process.cwd() }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr || error.message));
        return;
      }

      resolve(stdout);
    });
  });
}

async function resetDemo(req, res, next) {
  try {
    await runSeed();

    res.json({
      success: true,
      message: "Demo timetable restored to its original conflict scenario.",
    });
  } catch (error) {
    next(error);
  }
}

async function injectConflict(req, res, next) {
  try {
    const { type, firstEntryId, secondEntryId } = req.body;

    if (!type || !firstEntryId || !secondEntryId) {
      return res.status(400).json({
        success: false,
        message: "Conflict type and two timetable entries are required.",
      });
    }

    if (firstEntryId === secondEntryId) {
      return res.status(400).json({
        success: false,
        message: "Choose two different classes.",
      });
    }

    const first = await prisma.timetableEntry.findUnique({
      where: { id: firstEntryId },
      include: {
        course: true,
        lecturer: true,
        venue: true,
        studentGroup: true,
        timeSlot: true,
      },
    });

    const second = await prisma.timetableEntry.findUnique({
      where: { id: secondEntryId },
      include: {
        course: true,
        lecturer: true,
        venue: true,
        studentGroup: true,
        timeSlot: true,
      },
    });

    if (!first || !second) {
      return res.status(404).json({
        success: false,
        message: "One or both timetable entries were not found.",
      });
    }

    const data = {};

    if (type === "VENUE") {
      if (!first.venueId) {
        return res.status(400).json({
          success: false,
          message: "The first class needs a physical venue for a venue clash.",
        });
      }

      data.timeSlotId = first.timeSlotId;
      data.venueId = first.venueId;
    }

    if (type === "LECTURER") {
      data.timeSlotId = first.timeSlotId;
      data.lecturerId = first.lecturerId;
    }

    if (type === "STUDENT_GROUP") {
      data.timeSlotId = first.timeSlotId;
      data.studentGroupId = first.studentGroupId;
    }

    if (type === "TIME") {
      data.timeSlotId = first.timeSlotId;
    }

    if (!Object.keys(data).length) {
      return res.status(400).json({
        success: false,
        message: "Unsupported conflict type.",
      });
    }

    await prisma.timetableEntry.update({
      where: { id: secondEntryId },
      data,
    });

    res.json({
      success: true,
      message: `${type.replace("_", " ").toLowerCase()} conflict intentionally created.`,
      firstEntry: first,
      secondEntryId,
    });
  } catch (error) {
    next(error);
  }
}

async function getDemoEntries(req, res, next) {
  try {
    const entries = await prisma.timetableEntry.findMany({
      where: { status: "ACTIVE" },
      include: {
        course: true,
        lecturer: true,
        venue: true,
        studentGroup: true,
        timeSlot: true,
      },
      orderBy: [
        { course: { code: "asc" } },
      ],
    });

    res.json({
      success: true,
      entries,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  resetDemo,
  injectConflict,
  getDemoEntries,
};
