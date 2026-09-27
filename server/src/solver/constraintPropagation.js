const {
  checkAssignment,
} = require("./constraintChecker");

function cloneCandidate(candidate) {
  return {
    timeSlot: candidate.timeSlot,
    venue: candidate.venue,
  };
}

function buildCandidateDomain({
  entry,
  timeSlots,
  venues,
  allEntries,
}) {
  const validCandidates = [];
  const rejectedCandidates = [];

  for (const timeSlot of timeSlots) {
    for (const venue of venues) {
      const result = checkAssignment({
        entry,
        proposedTimeSlot: timeSlot,
        proposedVenue: venue,
        allEntries,
      });

      const candidate = {
        timeSlot,
        venue,
      };

      if (result.valid) {
        validCandidates.push(candidate);
      } else {
        rejectedCandidates.push({
          ...candidate,
          violations: result.violations,
        });
      }
    }
  }

  return {
    validCandidates,
    rejectedCandidates,
  };
}

function sortCandidates(candidates, currentAssignment = null) {
  return [...candidates].sort((a, b) => {
    const aSameTime =
      currentAssignment &&
      a.timeSlot.id === currentAssignment.timeSlot?.id;

    const bSameTime =
      currentAssignment &&
      b.timeSlot.id === currentAssignment.timeSlot?.id;

    const aSameVenue =
      currentAssignment &&
      a.venue?.id === currentAssignment.venue?.id;

    const bSameVenue =
      currentAssignment &&
      b.venue?.id === currentAssignment.venue?.id;

    const aScore =
      (aSameTime ? 0 : 1) +
      (aSameVenue ? 0 : 1);

    const bScore =
      (bSameTime ? 0 : 1) +
      (bSameVenue ? 0 : 1);

    return aScore - bScore;
  });
}

function propagateEntry({
  entry,
  timeSlots,
  venues,
  allEntries,
}) {
  const currentAssignment = {
    timeSlot: entry.timeSlot,
    venue: entry.venue,
  };

  const domain = buildCandidateDomain({
    entry,
    timeSlots,
    venues,
    allEntries,
  });

  const sortedCandidates = sortCandidates(
    domain.validCandidates,
    currentAssignment
  );

  return {
    entryId: entry.id,
    domainSizeBeforePropagation:
      timeSlots.length * venues.length,
    domainSizeAfterPropagation:
      sortedCandidates.length,
    candidates: sortedCandidates.map(cloneCandidate),
    rejectedCandidates: domain.rejectedCandidates,
    eliminatedCount:
      domain.rejectedCandidates.length,
    hasSolution:
      sortedCandidates.length > 0,
  };
}

function propagateEntries({
  entries,
  timeSlots,
  venues,
}) {
  const results = [];

  for (const entry of entries) {
    results.push(
      propagateEntry({
        entry,
        timeSlots,
        venues,
        allEntries: entries,
      })
    );
  }

  return results;
}

function getMostConstrainedEntry(propagationResults) {
  const candidates = propagationResults.filter(
    (result) => result.hasSolution
  );

  if (candidates.length === 0) {
    return null;
  }

  return [...candidates].sort(
    (a, b) =>
      a.domainSizeAfterPropagation -
      b.domainSizeAfterPropagation
  )[0];
}

function summarizePropagation(propagationResults) {
  const totalBefore = propagationResults.reduce(
    (sum, result) =>
      sum + result.domainSizeBeforePropagation,
    0
  );

  const totalAfter = propagationResults.reduce(
    (sum, result) =>
      sum + result.domainSizeAfterPropagation,
    0
  );

  const totalEliminated =
    propagationResults.reduce(
      (sum, result) =>
        sum + result.eliminatedCount,
      0
    );

  return {
    entriesProcessed: propagationResults.length,
    totalCandidatesBefore: totalBefore,
    totalCandidatesAfter: totalAfter,
    totalCandidatesEliminated: totalEliminated,
    reductionPercentage:
      totalBefore === 0
        ? 0
        : Number(
            (
              ((totalBefore - totalAfter) /
                totalBefore) *
              100
            ).toFixed(2)
          ),
  };
}

module.exports = {
  buildCandidateDomain,
  sortCandidates,
  propagateEntry,
  propagateEntries,
  getMostConstrainedEntry,
  summarizePropagation,
};
