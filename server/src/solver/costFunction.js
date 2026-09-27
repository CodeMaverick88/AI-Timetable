const {
  timeToMinutes,
} = require("./constraintChecker");

function calculateTimeDistance(
  originalSlot,
  candidateSlot
) {
  if (!originalSlot || !candidateSlot) {
    return 0;
  }

  const originalDay =
    originalSlot.dayOfWeek;

  const candidateDay =
    candidateSlot.dayOfWeek;

  const originalMinutes =
    timeToMinutes(originalSlot.startTime);

  const candidateMinutes =
    timeToMinutes(candidateSlot.startTime);

  const originalPosition =
    originalDay * 24 * 60 +
    originalMinutes;

  const candidatePosition =
    candidateDay * 24 * 60 +
    candidateMinutes;

  return Math.abs(
    candidatePosition - originalPosition
  );
}

function calculateDayDistance(
  originalSlot,
  candidateSlot
) {
  if (!originalSlot || !candidateSlot) {
    return 0;
  }

  return Math.abs(
    originalSlot.dayOfWeek -
      candidateSlot.dayOfWeek
  );
}

function calculateTimeSlotCost(
  originalSlot,
  candidateSlot
) {
  const minutes =
    calculateTimeDistance(
      originalSlot,
      candidateSlot
    );

  const dayDistance =
    calculateDayDistance(
      originalSlot,
      candidateSlot
    );

  return (
    minutes * 0.01 +
    dayDistance * 2
  );
}

function calculateVenueCost(
  originalVenue,
  candidateVenue
) {
  if (!originalVenue || !candidateVenue) {
    return 0;
  }

  if (
    originalVenue.id ===
    candidateVenue.id
  ) {
    return 0;
  }

  return 5;
}

function calculateLecturerCost(
  originalLecturer,
  candidateLecturer
) {
  if (!originalLecturer || !candidateLecturer) {
    return 0;
  }

  if (
    originalLecturer.id ===
    candidateLecturer.id
  ) {
    return 0;
  }

  return 15;
}

function calculateStudentScheduleCost({
  entry,
  candidateSlot,
  allEntries,
}) {
  if (!entry || !candidateSlot) {
    return 0;
  }

  const groupEntries = allEntries.filter(
    (other) =>
      other.id !== entry.id &&
      other.studentGroupId ===
        entry.studentGroupId &&
      other.status === "ACTIVE"
  );

  let cost = 0;

  for (const other of groupEntries) {
    if (
      other.timeSlot?.dayOfWeek ===
      candidateSlot.dayOfWeek
    ) {
      cost += 1;
    }
  }

  return cost;
}

function calculateLecturerGapCost({
  entry,
  candidateSlot,
  allEntries,
}) {
  if (!entry || !candidateSlot) {
    return 0;
  }

  const lecturerEntries =
    allEntries.filter(
      (other) =>
        other.id !== entry.id &&
        other.lecturerId ===
          entry.lecturerId &&
        other.status === "ACTIVE" &&
        other.timeSlot?.dayOfWeek ===
          candidateSlot.dayOfWeek
    );

  if (lecturerEntries.length === 0) {
    return 0;
  }

  const candidateStart =
    timeToMinutes(
      candidateSlot.startTime
    );

  const candidateEnd =
    timeToMinutes(
      candidateSlot.endTime
    );

  let nearestDistance = Infinity;

  for (const other of lecturerEntries) {
    const otherStart =
      timeToMinutes(
        other.timeSlot.startTime
      );

    const otherEnd =
      timeToMinutes(
        other.timeSlot.endTime
      );

    const before =
      Math.abs(candidateStart - otherEnd);

    const after =
      Math.abs(otherStart - candidateEnd);

    nearestDistance =
      Math.min(
        nearestDistance,
        before,
        after
      );
  }

  if (nearestDistance === Infinity) {
    return 0;
  }

  /*
   * Small gaps are preferred.
   * Extremely large gaps receive a modest penalty
   * because they create inefficient lecturer schedules.
   */
  if (nearestDistance <= 30) {
    return 0;
  }

  if (nearestDistance <= 120) {
    return 1;
  }

  return 2;
}

function calculateCandidateCost({
  entry,
  candidate,
  allEntries,
}) {
  const timeCost =
    calculateTimeSlotCost(
      entry.timeSlot,
      candidate.timeSlot
    );

  const venueCost =
    calculateVenueCost(
      entry.venue,
      candidate.venue
    );

  const lecturerCost =
    calculateLecturerCost(
      entry.lecturer,
      entry.lecturer
    );

  const studentScheduleCost =
    calculateStudentScheduleCost({
      entry,
      candidateSlot:
        candidate.timeSlot,
      allEntries,
    });

  const lecturerGapCost =
    calculateLecturerGapCost({
      entry,
      candidateSlot:
        candidate.timeSlot,
      allEntries,
    });

  const totalCost =
    timeCost +
    venueCost +
    lecturerCost +
    studentScheduleCost +
    lecturerGapCost;

  return {
    totalCost: Number(
      totalCost.toFixed(2)
    ),
    breakdown: {
      timeCost: Number(
        timeCost.toFixed(2)
      ),
      venueCost,
      lecturerCost,
      studentScheduleCost,
      lecturerGapCost,
    },
  };
}

function rankCandidates({
  entry,
  candidates,
  allEntries,
}) {
  return candidates
    .map((candidate) => {
      const cost =
        calculateCandidateCost({
          entry,
          candidate,
          allEntries,
        });

      return {
        ...candidate,
        cost: cost.totalCost,
        costBreakdown:
          cost.breakdown,
      };
    })
    .sort(
      (a, b) => a.cost - b.cost
    );
}

module.exports = {
  calculateTimeDistance,
  calculateDayDistance,
  calculateTimeSlotCost,
  calculateVenueCost,
  calculateLecturerCost,
  calculateStudentScheduleCost,
  calculateLecturerGapCost,
  calculateCandidateCost,
  rankCandidates,
};
