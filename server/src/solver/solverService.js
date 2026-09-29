// @ts-nocheck
const prisma = require("../lib/prisma");
const { solveWithBacktracking } = require("./backtrackingSolver");
const { detectConflicts } = require("./conflictDetector");

function safeRequire(path, fallback) {
  try {
    return require(path);
  } catch (error) {
    console.warn(`[ORBIT] optional module ${path} unavailable:`, error.message);
    return fallback;
  }
}

const { calculateFairnessScore } = safeRequire("./fairnessEvaluator", {
  calculateFairnessScore: () => null,
});

const { propagateEntries, summarizePropagation } = safeRequire(
  "./constraintPropagation",
  {
    propagateEntries: () => [],
    summarizePropagation: () => null,
  }
);

async function loadSolverData() {
  const [entries, timeSlots, venues] = await Promise.all([
    prisma.timetableEntry.findMany({
      where: { status: "ACTIVE" },
      include: {
        course: true,
        lecturer: { include: { availabilities: true } },
        venue: { include: { availabilities: true } },
        studentGroup: true,
        timeSlot: true,
      },
      orderBy: { createdAt: "asc" },
    }),
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

  return { entries, timeSlots, venues };
}

async function calculateConflictCount() {
  return prisma.conflict.count({
    where: { resolved: false },
  });
}

async function runTimetableSolver({
  scenario = "Automatic conflict resolution",
  initialConflictCount = null,
} = {}) {
  const startedAt = Date.now();
  const data = await loadSolverData();
  const detected = detectConflicts(data.entries);

  /* Always trust a fresh scan over a stored count, so a stale count never hides real clashes. */
  const actualInitialConflictCount =
    initialConflictCount == null
      ? detected.length
      : Math.max(initialConflictCount, detected.length);

  let propagationSummary = null;
  try {
    const propagationResults = propagateEntries({
      entries: data.entries,
      timeSlots: data.timeSlots,
      venues: data.venues,
    });
    propagationSummary = summarizePropagation(propagationResults);
  } catch (error) {
    console.warn("[ORBIT] propagation skipped:", error.message);
  }

  const result = solveWithBacktracking({
    entries: data.entries,
    timeSlots: data.timeSlots,
    venues: data.venues,
    maxNodes: 25000,
    maxMillis: 8000,
  });

  const remaining = detectConflicts(result.entries);
  const solved = remaining.length === 0;
  const durationMs = Date.now() - startedAt;
  const totalCost = result.actions.reduce(
    (sum, action) => sum + Number(action.cost || 0),
    0
  );

  let fairnessScore = null;
  try {
    fairnessScore = calculateFairnessScore({ entries: result.entries });
  } catch (error) {
    console.warn("[ORBIT] fairness score skipped:", error.message);
  }

  return {
    success: solved,
    scenario,
    status: solved ? "COMPLETED" : "FAILED",
    initialConflictCount: actualInitialConflictCount,
    finalConflictCount: remaining.length,
    totalCost: Number(totalCost.toFixed(2)),
    fairnessScore,
    classesMoved: result.actions.length,
    durationMs,
    reasoning: {
      initialConflictCount: actualInitialConflictCount,
      strategy: result.stats.strategy,
      movableCount: result.stats.movableCount,
      propagation: propagationSummary,
      search: {
        solved,
        nodesVisited: result.stats.nodesVisited,
        backtracks: result.stats.backtracks,
        actionsCreated: result.stats.actionsCreated,
      },
    },
    entries: result.entries,
    actions: result.actions,
    stats: result.stats,
    remainingConflicts: remaining,
    timeSlots: data.timeSlots,
    venues: data.venues,
    propagation: propagationSummary,
  };
}

module.exports = {
  loadSolverData,
  calculateConflictCount,
  runTimetableSolver,
};