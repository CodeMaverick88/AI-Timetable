// @ts-nocheck
function calculateFairnessPenalty({ entry, candidate, allEntries }) {
  const studentDayLoad = allEntries.filter(
    (other) =>
      other.id !== entry.id &&
      other.studentGroupId === entry.studentGroupId &&
      other.timeSlot &&
      String(other.timeSlot.dayOfWeek) === String(candidate.timeSlot.dayOfWeek)
  ).length;

  const lecturerDayLoad = allEntries.filter(
    (other) =>
      other.id !== entry.id &&
      other.lecturerId === entry.lecturerId &&
      other.timeSlot &&
      String(other.timeSlot.dayOfWeek) === String(candidate.timeSlot.dayOfWeek)
  ).length;

  const penalty = studentDayLoad * 2 + lecturerDayLoad;
  return {
    penalty: Number(penalty.toFixed(2)),
    breakdown: { studentDayLoad, lecturerDayLoad },
  };
}

function calculateFairnessScore({ entries }) {
  const active = (entries || []).filter(
    (entry) => !entry.status || entry.status === "ACTIVE"
  );
  if (active.length === 0) return 100;

  const studentDayLoads = {};
  const lecturerDayLoads = {};
  for (const entry of active) {
    if (!entry.timeSlot) continue;
    const day = String(entry.timeSlot.dayOfWeek);
    const studentKey = `${entry.studentGroupId}-${day}`;
    const lecturerKey = `${entry.lecturerId}-${day}`;
    studentDayLoads[studentKey] = (studentDayLoads[studentKey] || 0) + 1;
    lecturerDayLoads[lecturerKey] = (lecturerDayLoads[lecturerKey] || 0) + 1;
  }

  const studentLoads = Object.values(studentDayLoads);
  const lecturerLoads = Object.values(lecturerDayLoads);
  if (studentLoads.length === 0) return 100;

  const studentMax = Math.max(...studentLoads);
  const lecturerMax = lecturerLoads.length ? Math.max(...lecturerLoads) : 0;
  const studentAverage = active.length / Math.max(studentLoads.length, 1);
  const lecturerAverage = active.length / Math.max(lecturerLoads.length, 1);
  const penalty =
    Math.max(0, studentMax - studentAverage) * 5 +
    Math.max(0, lecturerMax - lecturerAverage) * 5;

  return Number(Math.max(0, Math.min(100, 100 - penalty * 5)).toFixed(2));
}

function rankCandidatesByFairness({ entry, candidates, allEntries }) {
  return candidates
    .map((candidate) => {
      const fairness = calculateFairnessPenalty({
        entry,
        candidate,
        allEntries,
      });
      return {
        ...candidate,
        fairnessPenalty: fairness.penalty,
        fairnessBreakdown: fairness.breakdown,
      };
    })
    .sort((a, b) => a.fairnessPenalty - b.fairnessPenalty);
}

module.exports = {
  calculateFairnessPenalty,
  calculateFairnessScore,
  rankCandidatesByFairness,
};