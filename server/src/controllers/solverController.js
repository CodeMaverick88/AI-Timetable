// @ts-nocheck
const prisma = require("../lib/prisma");
const { runTimetableSolver } = require("../solver/timetableSolver");
const { detectAndSaveConflicts } = require("../services/conflictService");

function toActionRow(solverRunId, action) {
  return {
    solverRunId,
    timetableEntryId: action.timetableEntryId,
    actionType: action.actionType,
    fromTimeSlotId: action.fromTimeSlotId,
    toTimeSlotId: action.toTimeSlotId,
    fromVenueId: action.fromVenueId,
    toVenueId: action.toVenueId,
    cost: action.cost,
    fairnessPenalty: action.fairnessPenalty,
    valid: action.valid,
    rejectionReason: action.rejectionReason,
    reasoning: action.reasoning,
    actionOrder: action.actionOrder,
  };
}

async function runSolver(req, res, next) {
  try {
    const scenario =
      req.body?.scenario || "Automatic conflict resolution";

    const initialConflictCount = await prisma.conflict.count({
      where: { resolved: false },
    });

    const result = await runTimetableSolver({
      scenario,
      initialConflictCount,
    });

    const solverRun = await prisma.solverRun.create({
      data: {
        scenario: result.scenario,
        status: result.status,
        initialConflictCount: result.initialConflictCount,
        finalConflictCount: result.finalConflictCount,
        totalCost: result.totalCost,
        fairnessScore: result.fairnessScore,
        classesMoved: result.classesMoved,
        durationMs: result.durationMs,
        reasoning: result.reasoning,
      },
    });

    if (result.success) {
      for (const entry of result.entries) {
        await prisma.timetableEntry.update({
          where: { id: entry.id },
          data: {
            timeSlotId: entry.timeSlot ? entry.timeSlot.id : entry.timeSlotId,
            venueId: entry.venue ? entry.venue.id : entry.venueId,
          },
        });
      }
    }

    if (result.actions.length > 0) {
      await prisma.solverAction.createMany({
        data: result.actions.map((action) =>
          toActionRow(solverRun.id, action)
        ),
      });
    }

    const verification = await detectAndSaveConflicts();

    res.json({
      ...result,
      solverRunId: solverRun.id,
      persisted: result.success,
      finalConflictCount: verification.conflictCount,
      success: verification.conflictCount === 0 && result.success,
      status:
        verification.conflictCount === 0 && result.success
          ? "COMPLETED"
          : result.status,
      timeSlots: result.timeSlots,
      venues: result.venues,
    });
  } catch (error) {
    next(error);
  }
}

async function getSolverRun(req, res, next) {
  try {
    const solverRun = await prisma.solverRun.findUnique({
      where: { id: req.params.id },
      include: {
        actions: { orderBy: { actionOrder: "asc" } },
      },
    });

    if (!solverRun) {
      return res.status(404).json({
        success: false,
        message: "Solver run not found.",
      });
    }

    res.json({ success: true, solverRun });
  } catch (error) {
    next(error);
  }
}

async function getSolverActions(req, res, next) {
  try {
    const actions = await prisma.solverAction.findMany({
      where: { solverRunId: req.params.id },
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
      orderBy: { actionOrder: "asc" },
    });

    res.json({ success: true, count: actions.length, actions });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  runSolver,
  getSolverRun,
  getSolverActions,
};