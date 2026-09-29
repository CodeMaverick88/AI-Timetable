const { execFile } = require("child_process");
const path = require("path");

const prisma = require("../lib/prisma");
const {
  detectAndSaveConflicts,
} = require("../services/conflictService");

let seedRunning = false;

function runSeed() {
  return new Promise((resolve, reject) => {
    if (seedRunning) {
      reject(
        new Error(
          "A timetable reset is already running. Please wait for it to finish."
        )
      );
      return;
    }

    seedRunning = true;

    const seedPath = path.join(
      process.cwd(),
      "prisma",
      "seed.js"
    );

    execFile(
      process.execPath,
      [seedPath],
      {
        cwd: process.cwd(),
        windowsHide: true,
      },
      (error, stdout, stderr) => {
        seedRunning = false;

        if (error) {
          reject(
            new Error(
              stderr?.trim() ||
                stdout?.trim() ||
                error.message
            )
          );
          return;
        }

        resolve(stdout);
      }
    );
  });
}

async function resetDemo(req, res, next) {
  if (seedRunning) {
    return res.status(409).json({
      success: false,
      message:
        "ORBIT demo reset is already running. Please wait a moment and try again.",
    });
  }

  try {
    await runSeed();

    // Rebuild the conflict table from the freshly seeded timetable.
    const conflictResult =
      await detectAndSaveConflicts();

    res.json({
      success: true,
      message:
        "Demo timetable restored to its original conflict scenario.",
      conflictCount: conflictResult.conflictCount,
      conflicts:
        conflictResult.conflicts || [],
    });
  } catch (error) {
    next(error);
  }
}

async function injectConflict(req, res, next) {
  try {
    const {
      type,
      firstEntryId,
      secondEntryId,
    } = req.body;

    if (!type || !firstEntryId || !secondEntryId) {
      return res.status(400).json({
        success: false,
        message:
          "Conflict type and two timetable entries are required.",
      });
    }

    if (firstEntryId === secondEntryId) {
      return res.status(400).json({
        success: false,
        message:
          "Choose two different classes.",
      });
    }

    const first =
      await prisma.timetableEntry.findUnique({
        where: {
          id: firstEntryId,
        },
        include: {
          course: true,
          lecturer: true,
          venue: true,
          studentGroup: true,
          timeSlot: true,
        },
      });

    const second =
      await prisma.timetableEntry.findUnique({
        where: {
          id: secondEntryId,
        },
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
        message:
          "One or both timetable entries were not found.",
      });
    }

    const data = {};

    switch (type) {
      case "VENUE":
        if (!first.venueId) {
          return res.status(400).json({
            success: false,
            message:
              "The first class needs a physical venue for a venue clash.",
          });
        }

        data.timeSlotId = first.timeSlotId;
        data.venueId = first.venueId;
        break;

      case "LECTURER":
        data.timeSlotId = first.timeSlotId;
        data.lecturerId = first.lecturerId;
        break;

      case "STUDENT_GROUP":
        data.timeSlotId = first.timeSlotId;
        data.studentGroupId =
          first.studentGroupId;
        break;

      case "TIME":
        data.timeSlotId = first.timeSlotId;
        break;

      default:
        return res.status(400).json({
          success: false,
          message:
            "Unsupported conflict type.",
        });
    }

    const updatedSecond =
      await prisma.timetableEntry.update({
        where: {
          id: secondEntryId,
        },
        data,
        include: {
          course: true,
          lecturer: true,
          venue: true,
          studentGroup: true,
          timeSlot: true,
        },
      });

    // Immediately recalculate conflicts.
    const conflictResult =
      await detectAndSaveConflicts();

    res.json({
      success: true,
      message:
        `${type
          .replace("_", " ")
          .toLowerCase()} conflict intentionally created.`,
      firstEntry: first,
      secondEntry: updatedSecond,
      conflictCount:
        conflictResult.conflictCount,
      conflicts:
        conflictResult.conflicts || [],
    });
  } catch (error) {
    next(error);
  }
}

async function getDemoEntries(req, res, next) {
  try {
    const entries =
      await prisma.timetableEntry.findMany({
        where: {
          status: "ACTIVE",
        },
        include: {
          course: true,
          lecturer: true,
          venue: true,
          studentGroup: true,
          timeSlot: true,
        },
        orderBy: [
          {
            course: {
              code: "asc",
            },
          },
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