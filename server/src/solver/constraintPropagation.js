// @ts-nocheck
const {
  checkUnaryConstraints,
  isUniversitySlot,
} = require("./constraintChecker");

function cloneCandidate(candidate) {
  return {
    timeSlot: candidate.timeSlot,
    venue: candidate.venue,
  };
}

function venueOptions(entry, venues) {
  if (entry.deliveryMode === "ONLINE") {
    return venues.filter((venue) => venue.supportsOnline).concat([null]);
  }
  return venues.filter((venue) => venue.active !== false);
}

function buildUnaryDomain({ entry, timeSlots, venues }) {
  const slots = timeSlots.filter(isUniversitySlot);
  const options = venueOptions(entry, venues);
  const candidates = [];

  for (const timeSlot of slots) {
    for (const venue of options) {
      const result = checkUnaryConstraints(entry, timeSlot, venue);
      if (result.valid) candidates.push({ timeSlot, venue });
    }
  }

  return candidates;
}

function sortCandidates(candidates, currentAssignment) {
  return candidates.slice().sort((a, b) => {
    const aSameTime =
      currentAssignment && a.timeSlot.id === currentAssignment.timeSlot?.id;
    const bSameTime =
      currentAssignment && b.timeSlot.id === currentAssignment.timeSlot?.id;
    const aSameVenue =
      currentAssignment && a.venue?.id === currentAssignment.venue?.id;
    const bSameVenue =
      currentAssignment && b.venue?.id === currentAssignment.venue?.id;
    const aScore = (aSameTime ? 0 : 1) + (aSameVenue ? 0 : 1);
    const bScore = (bSameTime ? 0 : 1) + (bSameVenue ? 0 : 1);
    return aScore - bScore;
  });
}

function propagateEntry({ entry, timeSlots, venues }) {
  const legalSlots = timeSlots.filter(isUniversitySlot);
  const options = venueOptions(entry, venues);
  const before = legalSlots.length * Math.max(options.length, 1);
  const candidates = sortCandidates(
    buildUnaryDomain({ entry, timeSlots, venues }),
    { timeSlot: entry.timeSlot, venue: entry.venue }
  );

  return {
    entryId: entry.id,
    domainSizeBeforePropagation: before,
    domainSizeAfterPropagation: candidates.length,
    candidates: candidates.map(cloneCandidate),
    eliminatedCount: Math.max(0, before - candidates.length),
    hasSolution: candidates.length > 0,
  };
}

function propagateEntries({ entries, timeSlots, venues }) {
  return entries.map((entry) =>
    propagateEntry({ entry, timeSlots, venues })
  );
}

function summarizePropagation(propagationResults) {
  const totalBefore = propagationResults.reduce(
    (sum, result) => sum + result.domainSizeBeforePropagation,
    0
  );
  const totalAfter = propagationResults.reduce(
    (sum, result) => sum + result.domainSizeAfterPropagation,
    0
  );
  const totalEliminated = propagationResults.reduce(
    (sum, result) => sum + result.eliminatedCount,
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
        : Number((((totalBefore - totalAfter) / totalBefore) * 100).toFixed(2)),
  };
}

module.exports = {
  buildUnaryDomain,
  sortCandidates,
  propagateEntry,
  propagateEntries,
  summarizePropagation,
};