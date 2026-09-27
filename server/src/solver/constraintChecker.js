const { DeliveryMode } = require("@prisma/client");

function timeToMinutes(time) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function slotsOverlap(slotA, slotB) {
  if (!slotA || !slotB) return false;

  if (slotA.dayOfWeek !== slotB.dayOfWeek) {
    return false;
  }

  const startA = timeToMinutes(slotA.startTime);
  const endA = timeToMinutes(slotA.endTime);

  const startB = timeToMinutes(slotB.startTime);
  const endB = timeToMinutes(slotB.endTime);

  return startA < endB && startB < endA;
}

function availabilityCoversSlot(availability, timeSlot) {
  if (!availability || !timeSlot) {
    return false;
  }

  return (
    availability.available &&
    availability.dayOfWeek === timeSlot.dayOfWeek &&
    timeToMinutes(availability.startTime) <=
      timeToMinutes(timeSlot.startTime) &&
    timeToMinutes(availability.endTime) >=
      timeToMinutes(timeSlot.endTime)
  );
}

function checkLecturerAvailability(lecturer, timeSlot) {
  const availabilities = lecturer?.availabilities || [];

  const dayAvailabilities = availabilities.filter(
    (availability) =>
      availability.dayOfWeek === timeSlot.dayOfWeek
  );

  if (dayAvailabilities.length === 0) {
    return {
      valid: true,
      reason: null,
    };
  }

  const available = dayAvailabilities.some((availability) =>
    availabilityCoversSlot(availability, timeSlot)
  );

  return {
    valid: available,
    reason: available
      ? null
      : `${lecturer.name} is unavailable during ${timeSlot.label}.`,
  };
}

function checkVenueAvailability(venue, timeSlot) {
  if (!venue) {
    return {
      valid: true,
      reason: null,
    };
  }

  const availabilities = venue.availabilities || [];

  const dayAvailabilities = availabilities.filter(
    (availability) =>
      availability.dayOfWeek === timeSlot.dayOfWeek
  );

  if (dayAvailabilities.length === 0) {
    return {
      valid: true,
      reason: null,
    };
  }

  const available = dayAvailabilities.some((availability) =>
    availabilityCoversSlot(availability, timeSlot)
  );

  return {
    valid: available,
    reason: available
      ? null
      : `${venue.name} is unavailable during ${timeSlot.label}.`,
  };
}

function checkVenueRequirements(entry, venue) {
  if (!venue) {
    if (entry.deliveryMode === DeliveryMode.ONLINE) {
      return {
        valid: true,
        reason: null,
      };
    }

    return {
      valid: false,
      reason: "A physical class requires a venue.",
    };
  }

  if (
    entry.expectedStudents > venue.capacity
  ) {
    return {
      valid: false,
      reason: `${venue.name} has capacity for ${venue.capacity}, but ${entry.expectedStudents} students are expected.`,
    };
  }

  if (
    entry.requiresComputers &&
    !venue.hasComputers
  ) {
    return {
      valid: false,
      reason: `${entry.course?.name || "This class"} requires computers, but ${venue.name} does not have them.`,
    };
  }

  if (
    entry.requiresProjector &&
    !venue.hasProjector
  ) {
    return {
      valid: false,
      reason: `${entry.course?.name || "This class"} requires a projector, but ${venue.name} does not have one.`,
    };
  }

  if (
    entry.deliveryMode === DeliveryMode.ONLINE &&
    !venue.supportsOnline
  ) {
    return {
      valid: false,
      reason: `${entry.course?.name || "This class"} is online, but ${venue.name} does not support online delivery.`,
    };
  }

  return {
    valid: true,
    reason: null,
  };
}

function checkResourceConflicts({
  entry,
  proposedTimeSlot,
  proposedVenue,
  allEntries,
}) {
  const conflicts = [];

  for (const other of allEntries) {
    if (other.id === entry.id) {
      continue;
    }

    if (
      other.status &&
      other.status !== "ACTIVE"
    ) {
      continue;
    }

    if (
      !slotsOverlap(
        proposedTimeSlot,
        other.timeSlot
      )
    ) {
      continue;
    }

    if (
      entry.lecturerId === other.lecturerId
    ) {
      conflicts.push({
        type: "LECTURER_DOUBLE_BOOKING",
        reason:
          `${entry.lecturer?.name || "Lecturer"} is already assigned to ` +
          `${other.course?.code || other.courseId} ` +
          `during ${other.timeSlot?.label || "this time"}.`,
        conflictingEntryId: other.id,
      });
    }

    if (
      proposedVenue &&
      other.venueId &&
      proposedVenue.id === other.venueId
    ) {
      conflicts.push({
        type: "VENUE_DOUBLE_BOOKING",
        reason:
          `${proposedVenue.name} is already assigned to ` +
          `${other.course?.code || other.courseId} ` +
          `during ${other.timeSlot?.label || "this time"}.`,
        conflictingEntryId: other.id,
      });
    }

    if (
      entry.studentGroupId ===
      other.studentGroupId
    ) {
      conflicts.push({
        type: "STUDENT_GROUP_CLASH",
        reason:
          `${entry.studentGroup?.name || "Student group"} ` +
          `already has ${other.course?.code || other.courseId} ` +
          `during ${other.timeSlot?.label || "this time"}.`,
        conflictingEntryId: other.id,
      });
    }
  }

  return conflicts;
}

function checkAssignment({
  entry,
  proposedTimeSlot,
  proposedVenue,
  allEntries,
}) {
  const violations = [];

  if (!entry) {
    return {
      valid: false,
      violations: [
        {
          type: "INVALID_ENTRY",
          reason: "Timetable entry was not provided.",
        },
      ],
    };
  }

  if (!proposedTimeSlot) {
    return {
      valid: false,
      violations: [
        {
          type: "INVALID_TIME_SLOT",
          reason: "A time slot must be provided.",
        },
      ],
    };
  }

  const lecturerAvailability =
    checkLecturerAvailability(
      entry.lecturer,
      proposedTimeSlot
    );

  if (!lecturerAvailability.valid) {
    violations.push({
      type: "LECTURER_UNAVAILABLE",
      reason: lecturerAvailability.reason,
    });
  }

  const venueAvailability =
    checkVenueAvailability(
      proposedVenue,
      proposedTimeSlot
    );

  if (!venueAvailability.valid) {
    violations.push({
      type: "VENUE_UNAVAILABLE",
      reason: venueAvailability.reason,
    });
  }

  const venueRequirements =
    checkVenueRequirements(
      entry,
      proposedVenue
    );

  if (!venueRequirements.valid) {
    violations.push({
      type:
        entry.deliveryMode === DeliveryMode.ONLINE &&
        proposedVenue &&
        !proposedVenue.supportsOnline
          ? "ONLINE_PHYSICAL_CLASH"
          : "MODE_VENUE_MISMATCH",
      reason: venueRequirements.reason,
    });
  }

  const resourceConflicts =
    checkResourceConflicts({
      entry,
      proposedTimeSlot,
      proposedVenue,
      allEntries,
    });

  violations.push(...resourceConflicts);

  return {
    valid: violations.length === 0,
    violations,
  };
}

module.exports = {
  timeToMinutes,
  slotsOverlap,
  availabilityCoversSlot,
  checkLecturerAvailability,
  checkVenueAvailability,
  checkVenueRequirements,
  checkResourceConflicts,
  checkAssignment,
};
