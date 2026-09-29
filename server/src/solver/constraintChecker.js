// @ts-nocheck

function toMinutes(value) {
  if (value == null) return null;
  const match = String(value).match(/(\d{1,2}):(\d{2})/);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

function slotDay(slot) {
  const day = slot?.dayOfWeek ?? slot?.dayName ?? slot?.day ?? null;
  return day == null ? null : String(day).toLowerCase();
}

function slotLabel(slot) {
  if (!slot) return "no slot";
  const day = slot.dayName || slot.dayOfWeek || slot.day || "";
  const start = String(slot.startTime || "").match(/(\d{1,2}:\d{2})/);
  const end = String(slot.endTime || "").match(/(\d{1,2}:\d{2})/);
  return `${day} ${start ? start[1] : ""}-${end ? end[1] : ""}`.trim();
}

/* Two slots clash when they share an id or overlap in time on the same day. */
function slotsOverlap(a, b) {
  if (!a || !b) return false;
  if (a.id && b.id && a.id === b.id) return true;
  if (slotDay(a) !== slotDay(b)) return false;
  const startA = toMinutes(a.startTime);
  const endA = toMinutes(a.endTime);
  const startB = toMinutes(b.startTime);
  const endB = toMinutes(b.endTime);
  if ([startA, endA, startB, endB].some((v) => v == null)) return false;
  return startA < endB && startB < endA;
}

function isOnline(entry) {
  const mode = String(
    entry?.deliveryMode ?? entry?.mode ?? entry?.classMode ?? ""
  ).toUpperCase();
  return mode === "ONLINE";
}

function lecturerIdOf(entry) {
  return entry?.lecturerId ?? entry?.lecturer?.id ?? null;
}

function groupIdOf(entry) {
  return entry?.studentGroupId ?? entry?.studentGroup?.id ?? null;
}

function groupSizeOf(entry) {
  const value =
    entry?.studentGroup?.size ??
    entry?.studentGroup?.studentCount ??
    entry?.studentGroup?.headcount ??
    entry?.expectedStudents ??
    null;
  return Number.isFinite(Number(value)) && value !== null ? Number(value) : null;
}

function isBlocked(availabilities, slot) {
  if (!Array.isArray(availabilities) || !slot) return false;
  return availabilities.some((item) => {
    const flag = item.available ?? item.isAvailable;
    if (flag !== false) return false;
    if (item.timeSlotId) return item.timeSlotId === slot.id;
    const day = item.dayOfWeek ?? item.dayName ?? item.day;
    if (day == null) return false;
    if (String(day).toLowerCase() !== slotDay(slot)) return false;
    if (item.startTime == null || item.endTime == null) return true;
    return slotsOverlap(
      { dayOfWeek: day, startTime: item.startTime, endTime: item.endTime },
      slot
    );
  });
}

function describeEntry(entry, slot, venueId) {
  return {
    id: entry.id,
    lecturerId: lecturerIdOf(entry),
    groupId: groupIdOf(entry),
    venueId: isOnline(entry) ? null : venueId ?? null,
    slot,
  };
}

function currentDescriptor(entry) {
  return describeEntry(
    entry,
    entry.timeSlot,
    entry.venue?.id ?? entry.venueId ?? null
  );
}

function pairViolations(a, b) {
  if (!a || !b || a.id === b.id) return [];
  if (!slotsOverlap(a.slot, b.slot)) return [];
  const found = [];
  if (a.lecturerId && a.lecturerId === b.lecturerId) {
    found.push({
      type: "LECTURER_DOUBLE_BOOKING",
      reason: "The same lecturer is booked for two classes at overlapping times.",
      conflictingEntryId: b.id,
    });
  }
  if (a.groupId && a.groupId === b.groupId) {
    found.push({
      type: "STUDENT_GROUP_CLASH",
      reason: "The same student group has two classes at overlapping times.",
      conflictingEntryId: b.id,
    });
  }
  if (a.venueId && a.venueId === b.venueId) {
    found.push({
      type: "VENUE_DOUBLE_BOOKING",
      reason: "The same venue is booked for two classes at overlapping times.",
      conflictingEntryId: b.id,
    });
  }
  return found;
}

function unaryViolations(entry, slot, venue) {
  const violations = [];

  if (!isOnline(entry) && !venue) {
    violations.push({
      type: "MISSING_VENUE",
      reason: "This physical class has no venue assigned.",
    });
  }

  if (venue && !isOnline(entry)) {
    const size = groupSizeOf(entry);
    const capacity = Number(venue.capacity);
    if (size !== null && Number.isFinite(capacity) && capacity > 0 && size > capacity) {
      violations.push({
        type: "VENUE_CAPACITY",
        reason: `${venue.code || "The venue"} seats ${capacity} but the group has ${size}.`,
      });
    }
    if (isBlocked(venue.availabilities, slot)) {
      violations.push({
        type: "VENUE_UNAVAILABLE",
        reason: `${venue.code || "The venue"} is unavailable at ${slotLabel(slot)}.`,
      });
    }
  }

  const lecturer = entry.lecturer;
  if (lecturer && isBlocked(lecturer.availabilities, slot)) {
    violations.push({
      type: "LECTURER_UNAVAILABLE",
      reason: `The lecturer is unavailable at ${slotLabel(slot)}.`,
    });
  }

  return violations;
}

function checkUnaryConstraints(entry, timeSlot, venue) {
  const violations = unaryViolations(entry, timeSlot, venue);
  return { ok: violations.length === 0, violations };
}

function checkResourceConflicts({ entry, proposedTimeSlot, proposedVenue, allEntries }) {
  const mine = describeEntry(entry, proposedTimeSlot, proposedVenue?.id ?? null);
  const found = [];
  for (const other of allEntries || []) {
    if (!other || other.id === entry.id) continue;
    if (other.status && other.status !== "ACTIVE") continue;
    if (!other.timeSlot) continue;
    found.push(...pairViolations(mine, currentDescriptor(other)));
  }
  return found;
}

module.exports = {
  toMinutes,
  slotDay,
  slotLabel,
  slotsOverlap,
  isOnline,
  lecturerIdOf,
  groupIdOf,
  groupSizeOf,
  isBlocked,
  describeEntry,
  currentDescriptor,
  pairViolations,
  unaryViolations,
  checkUnaryConstraints,
  checkResourceConflicts,
};