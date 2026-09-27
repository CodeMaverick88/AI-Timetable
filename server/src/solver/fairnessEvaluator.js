const {
  timeToMinutes,
} = require("./constraintChecker");

/**
 * Count how many other classes belonging to the same
 * student group are already scheduled on the candidate day.
 */
function calculateEntryDayLoad({
  entry,
  candidateSlot,
  allEntries,
}) {
  if (!entry || !candidateSlot) {
    return 0;
  }

  return allEntries.filter(
    (other) =>
      other.id !== entry.id &&
      other.status === "ACTIVE" &&
      other.studentGroupId === entry.studentGroupId &&
      other.timeSlot?.dayOfWeek === candidateSlot.dayOfWeek
  ).length;
}

/**
 * Count how many other classes taught by the same
 * lecturer are already scheduled on the candidate day.
 */
function calculateLecturerDayLoad({
  entry,
  candidateSlot,
  allEntries,
}) {
  if (!entry || !candidateSlot) {
    return 0;
  }

  return allEntries.filter(
    (other) =>
      other.id !== entry.id &&
      other.status === "ACTIVE" &&
      other.lecturerId === entry.lecturerId &&
      other.timeSlot?.dayOfWeek === candidateSlot.dayOfWeek
  ).length;
}

/**
 * Calculate how concentrated the student's classes
 * become on the candidate day.
 */
function calculateStudentDayDistribution({
  entry,
  candidateSlot,
  allEntries,
}) {
  if (!entry || !candidateSlot) {
    return 0;
  }

  const dayCounts = {};

  for (const other of allEntries) {
    if (
      other.id === entry.id ||
      other.status !== "ACTIVE" ||
      other.studentGroupId !== entry.studentGroupId ||
      !other.timeSlot
    ) {
      continue;
    }

    const day = other.timeSlot.dayOfWeek;

    dayCounts[day] =
      (dayCounts[day] || 0) + 1;
  }

  return dayCounts[candidateSlot.dayOfWeek] || 0;
}

/**
 * Calculate how concentrated the lecturer's classes
 * become on the candidate day.
 */
function calculateLecturerDayDistribution({
  entry,
  candidateSlot,
  allEntries,
}) {
  if (!entry || !candidateSlot) {
    return 0;
  }

  const dayCounts = {};

  for (const other of allEntries) {
    if (
      other.id === entry.id ||
      other.status !== "ACTIVE" ||
      other.lecturerId !== entry.lecturerId ||
      !other.timeSlot
    ) {
      continue;
    }

    const day = other.timeSlot.dayOfWeek;

    dayCounts[day] =
      (dayCounts[day] || 0) + 1;
  }

  return dayCounts[candidateSlot.dayOfWeek] || 0;
}

/**
 * Penalize moving a class too far away from
 * its original time of day.
 */
function calculateTimeOfDayPenalty({
  entry,
  candidateSlot,
}) {
  if (!entry?.timeSlot || !candidateSlot) {
    return 0;
  }

  const originalStart =
    timeToMinutes(entry.timeSlot.startTime);

  const candidateStart =
    timeToMinutes(candidateSlot.startTime);

  const difference =
    Math.abs(
      candidateStart - originalStart
    );

  if (difference <= 60) {
    return 0;
  }

  if (difference <= 180) {
    return 1;
  }

  return 2;
}

/**
 * Calculate fairness penalty for one candidate assignment.
 *
 * Lower penalty = fairer timetable.
 */
function calculateFairnessPenalty({
  entry,
  candidate,
  allEntries,
}) {
  if (!entry || !candidate) {
    return {
      penalty: 0,
      breakdown: {},
    };
  }

  const studentDayLoad =
    calculateEntryDayLoad({
      entry,
      candidateSlot: candidate.timeSlot,
      allEntries,
    });

  const lecturerDayLoad =
    calculateLecturerDayLoad({
      entry,
      candidateSlot: candidate.timeSlot,
      allEntries,
    });

  const studentDistribution =
    calculateStudentDayDistribution({
      entry,
      candidateSlot: candidate.timeSlot,
      allEntries,
    });

  const lecturerDistribution =
    calculateLecturerDayDistribution({
      entry,
      candidateSlot: candidate.timeSlot,
      allEntries,
    });

  const timeOfDayPenalty =
    calculateTimeOfDayPenalty({
      entry,
      candidateSlot: candidate.timeSlot,
    });

  const studentPenalty =
    studentDayLoad * 2 +
    studentDistribution;

  const lecturerPenalty =
    lecturerDayLoad * 2 +
    lecturerDistribution;

  const totalPenalty =
    studentPenalty +
    lecturerPenalty +
    timeOfDayPenalty;

  return {
    penalty: Number(
      totalPenalty.toFixed(2)
    ),
    breakdown: {
      studentDayLoad,
      lecturerDayLoad,
      studentDistribution,
      lecturerDistribution,
      timeOfDayPenalty,
      studentPenalty,
      lecturerPenalty,
    },
  };
}

/**
 * Calculate an overall timetable fairness score.
 *
 * 100 = highly balanced
 * 0   = highly imbalanced
 */
function calculateFairnessScore({
  entries,
}) {
  if (!entries || entries.length === 0) {
    return 100;
  }

  const activeEntries =
    entries.filter(
      (entry) =>
        entry.status === "ACTIVE"
    );

  if (activeEntries.length === 0) {
    return 100;
  }

  const studentDayLoads = {};
  const lecturerDayLoads = {};

  for (const entry of activeEntries) {
    const day =
      entry.timeSlot?.dayOfWeek;

    if (day == null) {
      continue;
    }

    const studentKey =
      `${entry.studentGroupId}-${day}`;

    const lecturerKey =
      `${entry.lecturerId}-${day}`;

    studentDayLoads[studentKey] =
      (studentDayLoads[studentKey] || 0) + 1;

    lecturerDayLoads[lecturerKey] =
      (lecturerDayLoads[lecturerKey] || 0) + 1;
  }

  const studentLoads =
    Object.values(studentDayLoads);

  const lecturerLoads =
    Object.values(lecturerDayLoads);

  if (
    studentLoads.length === 0 &&
    lecturerLoads.length === 0
  ) {
    return 100;
  }

  const studentMax =
    studentLoads.length > 0
      ? Math.max(...studentLoads)
      : 0;

  const lecturerMax =
    lecturerLoads.length > 0
      ? Math.max(...lecturerLoads)
      : 0;

  const studentAverage =
    studentLoads.length > 0
      ? activeEntries.length /
        Math.max(
          Object.keys(studentDayLoads).length,
          1
        )
      : 0;

  const lecturerAverage =
    lecturerLoads.length > 0
      ? activeEntries.length /
        Math.max(
          Object.keys(lecturerDayLoads).length,
          1
        )
      : 0;

  const studentImbalance =
    Math.max(
      0,
      studentMax - studentAverage
    );

  const lecturerImbalance =
    Math.max(
      0,
      lecturerMax - lecturerAverage
    );

  const penalty =
    studentImbalance * 5 +
    lecturerImbalance * 5;

  const score =
    Math.max(
      0,
      Math.min(
        100,
        100 - penalty * 5
      )
    );

  return Number(
    score.toFixed(2)
  );
}

/**
 * Add fairness information to every candidate
 * and rank candidates from fairest to least fair.
 */
function rankCandidatesByFairness({
  entry,
  candidates,
  allEntries,
}) {
  return candidates
    .map((candidate) => {
      const fairness =
        calculateFairnessPenalty({
          entry,
          candidate,
          allEntries,
        });

      return {
        ...candidate,
        fairnessPenalty:
          fairness.penalty,
        fairnessBreakdown:
          fairness.breakdown,
      };
    })
    .sort(
      (a, b) =>
        a.fairnessPenalty -
        b.fairnessPenalty
    );
}

module.exports = {
  calculateEntryDayLoad,
  calculateLecturerDayLoad,
  calculateStudentDayDistribution,
  calculateLecturerDayDistribution,
  calculateTimeOfDayPenalty,
  calculateFairnessPenalty,
  calculateFairnessScore,
  rankCandidatesByFairness,
};