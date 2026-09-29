const prisma = require("../lib/prisma");

const CONFLICT_SEVERITY = {
  LECTURER_DOUBLE_BOOKING: "CRITICAL",
  VENUE_DOUBLE_BOOKING: "CRITICAL",
  STUDENT_GROUP_CLASH: "CRITICAL",
  ONLINE_PHYSICAL_CLASH: "HIGH",
  LECTURER_UNAVAILABLE: "HIGH",
  VENUE_UNAVAILABLE: "HIGH",
  VENUE_CAPACITY: "HIGH",
  MODE_VENUE_MISMATCH: "HIGH",
};

function timeToMinutes(time) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function slotsOverlap(slotA, slotB) {
  if (slotA.dayOfWeek !== slotB.dayOfWeek) return false;

  const startA = timeToMinutes(slotA.startTime);
  const endA = timeToMinutes(slotA.endTime);
  const startB = timeToMinutes(slotB.startTime);
  const endB = timeToMinutes(slotB.endTime);

  return startA < endB && startB < endA;
}

function createConflict({
  timetableEntryId,
  type,
  title,
  description,
  metadata = null,
}) {
  return {
    timetableEntryId,
    type,
    severity: CONFLICT_SEVERITY[type] || "MEDIUM",
    title,
    description,
    detectedAutomatically: true,
    resolved: false,
    metadata,
  };
}

async function detectConflicts() {
  const entries = await prisma.timetableEntry.findMany({
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
  });

  const conflicts = [];

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];

    /*
     * 1. Lecturer availability check
     * FIXED: Only check if lecturer has availability data.
     * If no availability data exists, assume available.
     */
    if (entry.lecturer.availabilities.length > 0) {
      const lecturerAvailability = entry.lecturer.availabilities.filter(
        (availability) =>
          availability.dayOfWeek === entry.timeSlot.dayOfWeek
      );

      if (lecturerAvailability.length > 0) {
        // FIXED: Check if lecturer is NOT available during this slot
        const isAvailable = lecturerAvailability.some(
          (availability) =>
            availability.available &&
            timeToMinutes(availability.startTime) <=
              timeToMinutes(entry.timeSlot.startTime) &&
            timeToMinutes(availability.endTime) >=
              timeToMinutes(entry.timeSlot.endTime)
        );

        if (!isAvailable) {
          conflicts.push(
            createConflict({
              timetableEntryId: entry.id,
              type: "LECTURER_UNAVAILABLE",
              title: "Lecturer unavailable",
              description: `${entry.lecturer.name} is not available during ${entry.timeSlot.label}.`,
              metadata: {
                lecturerId: entry.lecturerId,
                timeSlotId: entry.timeSlotId,
              },
            })
          );
        }
      }
    }

    /*
     * 2. Venue constraints
     */
    if (entry.venue) {
      if (entry.expectedStudents > entry.venue.capacity) {
        conflicts.push(
          createConflict({
            timetableEntryId: entry.id,
            type: "VENUE_CAPACITY",
            title: "Venue capacity exceeded",
            description: `${entry.course.name} requires ${entry.expectedStudents} seats but ${entry.venue.name} only has capacity for ${entry.venue.capacity}.`,
            metadata: {
              expectedStudents: entry.expectedStudents,
              venueCapacity: entry.venue.capacity,
              venueId: entry.venueId,
            },
          })
        );
      }

      if (
        entry.requiresComputers &&
        !entry.venue.hasComputers
      ) {
        conflicts.push(
          createConflict({
            timetableEntryId: entry.id,
            type: "MODE_VENUE_MISMATCH",
            title: "Computer-equipped venue required",
            description: `${entry.course.name} requires computers, but ${entry.venue.name} does not have them.`,
            metadata: {
              requirement: "computers",
              venueId: entry.venueId,
            },
          })
        );
      }

      if (
        entry.requiresProjector &&
        !entry.venue.hasProjector
      ) {
        conflicts.push(
          createConflict({
            timetableEntryId: entry.id,
            type: "MODE_VENUE_MISMATCH",
            title: "Projector-equipped venue required",
            description: `${entry.course.name} requires a projector, but ${entry.venue.name} does not have one.`,
            metadata: {
              requirement: "projector",
              venueId: entry.venueId,
            },
          })
        );
      }

      // FIXED: Only check venue availability if availability data exists
      if (entry.venue.availabilities.length > 0) {
        const venueAvailability = entry.venue.availabilities.filter(
          (availability) =>
            availability.dayOfWeek === entry.timeSlot.dayOfWeek
        );

        if (venueAvailability.length > 0) {
          // FIXED: Check if venue is NOT available during this slot
          const isAvailable = venueAvailability.some(
            (availability) =>
              availability.available &&
              timeToMinutes(availability.startTime) <=
                timeToMinutes(entry.timeSlot.startTime) &&
              timeToMinutes(availability.endTime) >=
                timeToMinutes(entry.timeSlot.endTime)
          );

          if (!isAvailable) {
            conflicts.push(
              createConflict({
                timetableEntryId: entry.id,
                type: "VENUE_UNAVAILABLE",
                title: "Venue unavailable",
                description: `${entry.venue.name} is not available during ${entry.timeSlot.label}.`,
                metadata: {
                  venueId: entry.venueId,
                  timeSlotId: entry.timeSlotId,
                },
              })
            );
          }
        }
      }

      if (
        entry.deliveryMode === "ONLINE" &&
        !entry.venue.supportsOnline
      ) {
        conflicts.push(
          createConflict({
            timetableEntryId: entry.id,
            type: "ONLINE_PHYSICAL_CLASH",
            title: "Online class assigned to incompatible venue",
            description: `${entry.course.name} is online but ${entry.venue.name} does not support online delivery.`,
            metadata: {
              deliveryMode: entry.deliveryMode,
              venueId: entry.venueId,
            },
          })
        );
      }
    }

    /*
     * 3. Pairwise timetable conflicts
     */
    for (let j = i + 1; j < entries.length; j++) {
      const other = entries[j];

      if (!slotsOverlap(entry.timeSlot, other.timeSlot)) {
        continue;
      }

      // LECTURER DOUBLE-BOOKING
      if (entry.lecturerId === other.lecturerId) {
        conflicts.push(
          createConflict({
            timetableEntryId: entry.id,
            type: "LECTURER_DOUBLE_BOOKING",
            title: "Lecturer double-booked",
            description: `${entry.lecturer.name} is assigned to ${entry.course.code} and ${other.course.code} at the same time.`,
            metadata: {
              conflictingEntryId: other.id,
              otherCourseCode: other.course.code,
              overlappingSlot: entry.timeSlot.label,
            },
          })
        );
      }

      // VENUE DOUBLE-BOOKING
      if (
        entry.venueId &&
        other.venueId &&
        entry.venueId === other.venueId
      ) {
        conflicts.push(
          createConflict({
            timetableEntryId: entry.id,
            type: "VENUE_DOUBLE_BOOKING",
            title: "Venue double-booked",
            description: `${entry.venue.name} is assigned to ${entry.course.code} and ${other.course.code} at the same time.`,
            metadata: {
              conflictingEntryId: other.id,
              otherCourseCode: other.course.code,
              venueId: entry.venueId,
              overlappingSlot: entry.timeSlot.label,
            },
          })
        );
      }

      // STUDENT GROUP CLASH
      if (entry.studentGroupId === other.studentGroupId) {
        conflicts.push(
          createConflict({
            timetableEntryId: entry.id,
            type: "STUDENT_GROUP_CLASH",
            title: "Student group timetable clash",
            description: `${entry.studentGroup.name} is assigned to ${entry.course.code} and ${other.course.code} at the same time.`,
            metadata: {
              conflictingEntryId: other.id,
              otherCourseCode: other.course.code,
              studentGroupId: entry.studentGroupId,
              overlappingSlot: entry.timeSlot.label,
            },
          })
        );
      }
    }
  }

  return conflicts;
}

async function saveConflicts(conflicts) {
  await prisma.conflict.deleteMany({
    where: {
      resolved: false,
    },
  });

  if (conflicts.length === 0) {
    return [];
  }

  return prisma.conflict.createManyAndReturn({
    data: conflicts,
  });
}

async function detectAndSaveConflicts() {
  const conflicts = await detectConflicts();
  const savedConflicts = await saveConflicts(conflicts);

  return {
    conflictCount: savedConflicts.length,
    conflicts: savedConflicts,
  };
}

module.exports = {
  detectConflicts,
  saveConflicts,
  detectAndSaveConflicts,
  slotsOverlap,
  timeToMinutes,
};