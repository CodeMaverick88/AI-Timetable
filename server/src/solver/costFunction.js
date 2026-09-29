// @ts-nocheck
const { timeToMinutes } = require("./constraintChecker");

function calculateTimeSlotCost(originalSlot, candidateSlot) {
  if (!originalSlot || !candidateSlot) return 0;
  const minutes = Math.abs(
    timeToMinutes(candidateSlot.startTime) - timeToMinutes(originalSlot.startTime)
  );
  const dayDistance = Math.abs(
    Number(originalSlot.dayOfWeek !== candidateSlot.dayOfWeek)
  );
  return minutes * 0.01 + (originalSlot.dayOfWeek === candidateSlot.dayOfWeek ? 0 : 2) + dayDistance * 0;
}

function calculateVenueCost(originalVenue, candidateVenue) {
  if (!originalVenue || !candidateVenue) {
    return originalVenue || candidateVenue ? 2 : 0;
  }
  return originalVenue.id === candidateVenue.id ? 0 : 5;
}

function calculateCandidateCost({ entry, candidate }) {
  const timeCost = calculateTimeSlotCost(entry.timeSlot, candidate.timeSlot);
  const venueCost = calculateVenueCost(entry.venue, candidate.venue);
  const totalCost = timeCost + venueCost;
  return {
    totalCost: Number(totalCost.toFixed(2)),
    breakdown: {
      timeCost: Number(timeCost.toFixed(2)),
      venueCost,
    },
  };
}

function rankCandidates({ entry, candidates, allEntries }) {
  return candidates
    .map((candidate) => {
      const cost = calculateCandidateCost({ entry, candidate, allEntries });
      return {
        ...candidate,
        cost: cost.totalCost,
        costBreakdown: cost.breakdown,
      };
    })
    .sort((a, b) => a.cost - b.cost);
}

module.exports = {
  calculateCandidateCost,
  rankCandidates,
};