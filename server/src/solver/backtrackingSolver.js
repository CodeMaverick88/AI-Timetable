const {
  checkAssignment,
} = require("./constraintChecker");

const {
  rankCandidates,
} = require("./costFunction");

const {
  rankCandidatesByFairness,
} = require("./fairnessEvaluator");

/**
 * Create a safe copy of an assignment.
 */
function cloneAssignment(assignment) {
  return {
    timeSlot: assignment.timeSlot,
    venue: assignment.venue,
  };
}

/**
 * Apply a candidate assignment to an entry.
 */
function applyAssignment(
  entry,
  candidate
) {
  return {
    ...entry,
    timeSlot: candidate.timeSlot,
    venue: candidate.venue,
    timeSlotId: candidate.timeSlot.id,
    venueId: candidate.venue?.id || null,
  };
}

/**
 * Check whether a candidate remains valid
 * against the current working timetable.
 */
function isCandidateValid({
  entry,
  candidate,
  workingEntries,
}) {
  const result = checkAssignment({
    entry,
    proposedTimeSlot: candidate.timeSlot,
    proposedVenue: candidate.venue,
    allEntries: workingEntries,
  });

  return result;
}

/**
 * Build candidate list for one entry.
 *
 * Candidates are:
 * 1. filtered by hard constraints
 * 2. ranked by cost
 * 3. ranked again using fairness
 */
function buildRankedCandidates({
  entry,
  domains,
  workingEntries,
}) {
  const domain =
    domains.find(
      (item) =>
        item.entryId === entry.id
    );

  if (!domain || !domain.candidates) {
    return [];
  }

  const validCandidates = [];

  for (const candidate of domain.candidates) {
    const validation =
      isCandidateValid({
        entry,
        candidate,
        workingEntries,
      });

    if (validation.valid) {
      validCandidates.push(candidate);
    }
  }

  if (validCandidates.length === 0) {
    return [];
  }

  const costRanked =
    rankCandidates({
      entry,
      candidates: validCandidates,
      allEntries: workingEntries,
    });

  return rankCandidatesByFairness({
    entry,
    candidates: costRanked,
    allEntries: workingEntries,
  }).sort((a, b) => {
    const aScore =
      a.cost +
      a.fairnessPenalty;

    const bScore =
      b.cost +
      b.fairnessPenalty;

    return aScore - bScore;
  });
}

/**
 * Choose the entry with the smallest remaining
 * candidate domain.
 *
 * This is the Minimum Remaining Values heuristic.
 */
function selectMostConstrainedEntry({
  entries,
  assignments,
  domains,
}) {
  const unassigned = entries.filter(
    (entry) =>
      !assignments.has(entry.id)
  );

  if (unassigned.length === 0) {
    return null;
  }

  let selected = null;
  let smallestDomain = Infinity;

  for (const entry of unassigned) {
    const domain =
      domains.find(
        (item) =>
          item.entryId === entry.id
      );

    const size =
      domain?.candidates?.length || 0;

    if (size < smallestDomain) {
      smallestDomain = size;
      selected = entry;
    }
  }

  return selected;
}

/**
 * Calculate how much the candidate changes
 * the original timetable.
 */
function calculateMovementCost(
  entry,
  candidate
) {
  let cost = 0;

  if (
    entry.timeSlotId !==
    candidate.timeSlot?.id
  ) {
    cost += 1;
  }

  if (
    entry.venueId !==
    (candidate.venue?.id || null)
  ) {
    cost += 1;
  }

  return cost;
}

/**
 * Create a solver action describing a move.
 */
function createAction({
  entry,
  candidate,
  previousAssignment,
  actionOrder,
  cost,
  fairnessPenalty,
  reasoning,
}) {
  const timeChanged =
    previousAssignment?.timeSlot?.id !==
    candidate.timeSlot?.id;

  const venueChanged =
    previousAssignment?.venue?.id !==
    candidate.venue?.id;

  let actionType = "REASSIGN";

  if (
    timeChanged &&
    !venueChanged
  ) {
    actionType = "MOVE_TIME";
  } else if (
    !timeChanged &&
    venueChanged
  ) {
    actionType = "MOVE_VENUE";
  } else if (
    timeChanged &&
    venueChanged
  ) {
    actionType = "COMBINATION";
  }

  return {
    timetableEntryId: entry.id,
    actionType,
    fromTimeSlotId:
      previousAssignment?.timeSlot?.id || null,
    toTimeSlotId:
      candidate.timeSlot?.id || null,
    fromVenueId:
      previousAssignment?.venue?.id || null,
    toVenueId:
      candidate.venue?.id || null,
    cost: Number(
      cost.toFixed(2)
    ),
    fairnessPenalty: Number(
      fairnessPenalty.toFixed(2)
    ),
    valid: true,
    rejectionReason: null,
    reasoning,
    actionOrder,
  };
}

/**
 * Create a readable explanation for the move.
 */
function createReasoning({
  entry,
  candidate,
  cost,
  fairnessPenalty,
}) {
  const reasons = [];

  if (
    entry.timeSlotId !==
    candidate.timeSlot?.id
  ) {
    reasons.push(
      `moved to ${candidate.timeSlot.label}`
    );
  }

  if (
    entry.venueId !==
    (candidate.venue?.id || null)
  ) {
    if (candidate.venue) {
      reasons.push(
        `assigned ${candidate.venue.name}`
      );
    } else {
      reasons.push(
        "removed the physical venue requirement"
      );
    }
  }

  if (reasons.length === 0) {
    reasons.push(
      "kept the existing assignment"
    );
  }

  return (
    `AI selected this assignment because it satisfies ` +
    `all hard constraints while minimizing timetable disruption. ` +
    `${reasons.join(" and ")}. ` +
    `Candidate cost: ${cost.toFixed(2)}. ` +
    `Fairness penalty: ${fairnessPenalty.toFixed(2)}.`
  );
}

/**
 * Main recursive CSP backtracking algorithm.
 *
 * The solver:
 * - selects the most constrained class
 * - evaluates its candidate domain
 * - assigns the best valid candidate
 * - recursively continues
 * - backtracks when a dead end is reached
 */
function solveWithBacktracking({
  entries,
  domains,
  maxNodes = 5000,
}) {
  const assignments =
    new Map();

  const workingEntries =
    entries.map((entry) => ({
      ...entry,
    }));

  const actions = [];

  let nodesVisited = 0;
  let backtracks = 0;
  let actionOrder = 0;

  function search() {
    nodesVisited += 1;

    if (nodesVisited > maxNodes) {
      return false;
    }

    const entry =
      selectMostConstrainedEntry({
        entries: workingEntries,
        assignments,
        domains,
      });

    if (!entry) {
      return true;
    }

    const rankedCandidates =
      buildRankedCandidates({
        entry,
        domains,
        workingEntries,
      });

    if (
      rankedCandidates.length === 0
    ) {
      return false;
    }

    const previousAssignment =
      cloneAssignment({
        timeSlot: entry.timeSlot,
        venue: entry.venue,
      });

    for (const candidate of rankedCandidates) {
      const validation =
        isCandidateValid({
          entry,
          candidate,
          workingEntries,
        });

      if (!validation.valid) {
        continue;
      }

      const updatedEntry =
        applyAssignment(
          entry,
          candidate
        );

      const entryIndex =
        workingEntries.findIndex(
          (item) =>
            item.id === entry.id
        );

      workingEntries[entryIndex] =
        updatedEntry;

      assignments.set(
        entry.id,
        candidate
      );

      const movementCost =
        calculateMovementCost(
          entry,
          candidate
        );

      const fairnessPenalty =
        candidate.fairnessPenalty || 0;

      const reasoning =
        createReasoning({
          entry,
          candidate,
          cost:
            candidate.cost || 0,
          fairnessPenalty,
        });

      const action =
        createAction({
          entry,
          candidate,
          previousAssignment,
          actionOrder:
            actionOrder + 1,
          cost:
            candidate.cost || 0,
          fairnessPenalty,
          reasoning,
        });

      action._movementCost =
        movementCost;

      actions.push(action);

      actionOrder += 1;

      if (search()) {
        return true;
      }

      /**
       * Backtrack:
       * restore the original assignment
       * and remove the attempted action.
       */
      backtracks += 1;

      workingEntries[entryIndex] =
        entry;

      assignments.delete(
        entry.id
      );

      actions.pop();

      actionOrder -= 1;
    }

    return false;
  }

  const solved =
    search();

  return {
    solved,
    entries:
      workingEntries,
    assignments:
      Object.fromEntries(
        assignments
      ),
    actions,
    stats: {
      nodesVisited,
      backtracks,
      maxNodes,
      actionsCreated:
        actions.length,
    },
  };
}

module.exports = {
  cloneAssignment,
  applyAssignment,
  isCandidateValid,
  buildRankedCandidates,
  selectMostConstrainedEntry,
  calculateMovementCost,
  createAction,
  createReasoning,
  solveWithBacktracking,
};  