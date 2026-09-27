const {
  detectAndSaveConflicts,
} = require("../services/conflictService");

async function detectConflicts(req, res, next) {
  try {
    const result = await detectAndSaveConflicts();

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
}

async function getConflicts(req, res, next) {
  try {
    const prisma = require("../lib/prisma");

    const conflicts = await prisma.conflict.findMany({
      include: {
        timetableEntry: {
          include: {
            course: true,
            lecturer: true,
            venue: true,
            studentGroup: true,
            timeSlot: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json({
      success: true,
      count: conflicts.length,
      conflicts,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  detectConflicts,
  getConflicts,
};
