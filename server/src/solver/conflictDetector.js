// @ts-nocheck
const {
  checkUnaryConstraints,
  checkResourceConflicts,
} = require("./constraintChecker");

const CONFLICT_SEVERITY = {
  LECTURER_DOUBLE_BOOKING: "CRITICAL",
  VENUE_DOUBLE_BOOKING: "CRITICAL",
  STUDENT_GROUP_CLASH: "CRITICAL",
  MISSING_TIME_SLOT: "CRITICAL",
  ONLINE_PHYSICAL_CLASH: "HIGH",
  LECTURER_UNAVAILABLE: "HIGH",
  VENUE_UNAVAILABLE: "HIGH",
  VENUE_CAPACITY: "HIGH",
  MODE_VENUE_MISMATCH: "HIGH",
  OUTSIDE_UNIVERSITY_HOURS: "HIGH",
  MISSING_VENUE: "HIGH",
};

const TITLES = {
  LECTURER_DOUBLE_BOOKING: "Lecturer double-booked",
  VENUE_DOUBLE_BOOKING: "Venue double-booked",
  STUDENT_GROUP_CLASH: "Student group timetable clash",
  MISSING_TIME_SLOT: "Class has no time slot",
  ONLINE_PHYSICAL_CLASH: "Online class on incompatible venue",
  LECTURER_UNAVAILABLE: "Lecturer unavailable",
  VENUE_UNAVAILABLE: "Venue unavailable",
  VENUE_CAPACITY: "Venue capacity exceeded",
  MODE_VENUE_MISMATCH: "Venue does not match class needs",
  OUTSIDE_UNIVERSITY_HOURS: "Outside university hours",
  MISSING_VENUE: "Physical class missing a venue",
};

function createConflict({ timetableEntryId, type, description, metadata = null }) {
  return {
    timetableEntryId,
    type,
    severity: CONFLICT_SEVERITY[type] || "MEDIUM",
    title: TITLES[type] || type,
    description,
    detectedAutomatically: true,
    resolved: false,
    metadata,
  };
}

function detectConflicts(entries) {
  const active = (entries || []).filter(
    (entry) => !entry.status || entry.status === "ACTIVE"
  );
  const conflicts = [];
  const seen = new Set();

  function push(conflict) {
    const otherId =
      (conflict.metadata && conflict.metadata.conflictingEntryId) || "";
    const key = `${conflict.type}|${[conflict.timetableEntryId, otherId]
      .sort()
      .join(":")}`;
    if (seen.has(key)) return;
    seen.add(key);
    conflicts.push(conflict);
  }

  for (let i = 0; i < active.length; i += 1) {
    const entry = active[i];

    if (!entry.timeSlot) {
      push(
        createConflict({
          timetableEntryId: entry.id,
          type: "MISSING_TIME_SLOT",
          description: `${entry.course?.code || "A class"} has no time slot assigned.`,
        })
      );
      continue;
    }

    const unary = checkUnaryConstraints(entry, entry.timeSlot, entry.venue || null);
    for (const violation of unary.violations) {
      push(
        createConflict({
          timetableEntryId: entry.id,
          type: violation.type,
          description: violation.reason,
          metadata: {
            lecturerId: entry.lecturerId,
            venueId: entry.venueId,
            timeSlotId: entry.timeSlotId,
          },
        })
      );
    }

    const pairwise = checkResourceConflicts({
      entry,
      proposedTimeSlot: entry.timeSlot,
      proposedVenue: entry.venue || null,
      allEntries: active.slice(i + 1),
    });

    for (const violation of pairwise) {
      push(
        createConflict({
          timetableEntryId: entry.id,
          type: violation.type,
          description: `${entry.course?.code || "A class"}: ${violation.reason}`,
          metadata: { conflictingEntryId: violation.conflictingEntryId },
        })
      );
    }
  }

  return conflicts;
}

function collectConflictedIds(conflicts) {
  const ids = new Set();
  for (const conflict of conflicts) {
    ids.add(conflict.timetableEntryId);
    if (conflict.metadata && conflict.metadata.conflictingEntryId) {
      ids.add(conflict.metadata.conflictingEntryId);
    }
  }
  return ids;
}

module.exports = {
  detectConflicts,
  collectConflictedIds,
};