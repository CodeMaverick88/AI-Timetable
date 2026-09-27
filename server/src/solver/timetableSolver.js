const prisma = require("../lib/prisma");

const {
  propagateEntries,
} = require("./constraintPropagation");

const {
  solveWithBacktracking,
} = require("./backtrackingSolver");

const {
  calculateFairnessScore,
} = require("./fairnessEvaluator");

async function loadSolverData() {
  const [
    entries,
    timeSlots,
    venues,
  ] = await Promise.all([
    prisma.timetableEntry.findMany({
      where: {
        status: "ACTIVE",
      },
      include: {
        course: true,
        lecturer: {
          include: {
            availabilities: true,
          },
        },
        venue: {
          include: {
            availabilities: true,
          },
        },
        studentGroup: true,
        timeSlot: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    }),

    prisma.timeSlot.findMany({
      where: {
        active: true,
      },
      orderBy: {
        sortOrder: "asc",
      },
    }),

    prisma.venue.findMany({
      where: {
        active: true,
      },
      orderBy: {
        code: "asc",
      },
      include: {
        availabilities: true,
      },
    }),
  ]);

  return {
    entries,
    timeSlots,
    venues,
  };
}

function buildSolverReasoning({
  propagation,
  result,
  initialConflictCount,
}) {
  return {
    initialConflictCount,
    propagation: {
      entriesProcessed:
        propagation.entriesProcessed,
      candidatesBefore:
        propagation.totalCandidatesBefore,
      candidatesAfter:
        propagation.totalCandidatesAfter,
      candidatesEliminated:
        propagation.totalCandidatesEliminated,
      reductionPercentage:
        propagation.reductionPercentage,
    },
    search: {
      solved: result.solved,
      nodesVisited:
        result.stats.nodesVisited,
      backtracks:
        result.stats.backtracks,
      actionsCreated:
        result.stats.actionsCreated,
    },
  };
}

async function calculateConflictCount() {
  return prisma.conflict.count({
    where: {
      resolved: false,
    },
  });
}

async function runTimetableSolver({
  scenario = "Automatic conflict resolution",
  initialConflictCount = null,
} = {}) {
  const startedAt = Date.now();

  const data =
    await loadSolverData();

  const actualInitialConflictCount =
    initialConflictCount ??
    (await calculateConflictCount());

  const propagationResults =
    propagateEntries({
      entries: data.entries,
      timeSlots: data.timeSlots,
      venues: data.venues,
    });

  const propagationSummary = {
    entriesProcessed:
      propagationResults.length,

    totalCandidatesBefore:
      propagationResults.reduce(
        (sum, item) =>
          sum +
          item.domainSizeBeforePropagation,
        0
      ),

    totalCandidatesAfter:
      propagationResults.reduce(
        (sum, item) =>
          sum +
          item.domainSizeAfterPropagation,
        0
      ),

    totalCandidatesEliminated:
      propagationResults.reduce(
        (sum, item) =>
          sum +
          item.eliminatedCount,
        0
      ),

    reductionPercentage: 0,
  };

  if (
    propagationSummary
      .totalCandidatesBefore > 0
  ) {
    propagationSummary.reductionPercentage =
      Number(
        (
          (
            (
              propagationSummary
                .totalCandidatesBefore -
              propagationSummary
                .totalCandidatesAfter
            ) /
            propagationSummary
              .totalCandidatesBefore
          ) *
          100
        ).toFixed(2)
      );
  }

  const result =
    solveWithBacktracking({
      entries: data.entries,
      domains: propagationResults,
      maxNodes: 5000,
    });

  const fairnessScore =
    calculateFairnessScore({
      entries: result.entries,
    });

  const durationMs =
    Date.now() - startedAt;

  const finalConflictCount =
    result.solved
      ? 0
      : actualInitialConflictCount;

  const classesMoved =
    result.actions.filter(
      (action) =>
        action.fromTimeSlotId !==
          action.toTimeSlotId ||
        action.fromVenueId !==
          action.toVenueId
    ).length;

  const totalCost =
    result.actions.reduce(
      (sum, action) =>
        sum +
        Number(action.cost || 0),
      0
    );

  const reasoning =
    buildSolverReasoning({
      propagation:
        propagationSummary,
      result,
      initialConflictCount:
        actualInitialConflictCount,
    });

  return {
    success: result.solved,
    scenario,
    status: result.solved
      ? "COMPLETED"
      : "FAILED",

    initialConflictCount:
      actualInitialConflictCount,

    finalConflictCount,

    totalCost: Number(
      totalCost.toFixed(2)
    ),

    fairnessScore,

    classesMoved,

    durationMs,

    reasoning,

    entries:
      result.entries,

    actions:
      result.actions,

    stats:
      result.stats,

    propagation:
      propagationSummary,
  };
}

module.exports = {
  loadSolverData,
  calculateConflictCount,
  runTimetableSolver,
};
