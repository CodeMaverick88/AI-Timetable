// @ts-nocheck
/* Browser-side copy of the ORBIT constraint checker, conflict detector and solver. */

let STRICT_TIME = false;

/* When on, no two classes may overlap in time at all, whoever teaches them. */
function setStrictTime(value) {
  STRICT_TIME = Boolean(value);
}

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
  if (STRICT_TIME) {
    found.push({
      type: "TIME_CLASH",
      reason: "Two units are scheduled at overlapping times.",
      conflictingEntryId: b.id,
    });
  }
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

const CONFLICT_SEVERITY = {
  LECTURER_DOUBLE_BOOKING: "CRITICAL",
  VENUE_DOUBLE_BOOKING: "CRITICAL",
  STUDENT_GROUP_CLASH: "CRITICAL",
  MISSING_TIME_SLOT: "CRITICAL",
  TIME_CLASH: "CRITICAL",
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
  TIME_CLASH: "Two units at the same time",
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

const REASON_TEXT = {
  LECTURER_DOUBLE_BOOKING: "a lecturer double-booking",
  STUDENT_GROUP_CLASH: "a student group clash",
  VENUE_DOUBLE_BOOKING: "a venue double-booking",
  VENUE_CAPACITY: "a venue capacity problem",
  VENUE_UNAVAILABLE: "a venue availability problem",
  LECTURER_UNAVAILABLE: "a lecturer availability problem",
  MISSING_VENUE: "a missing venue",
  MISSING_TIME_SLOT: "a missing time slot",
  TIME_CLASH: "two units at the same time",
};

class Occupancy {
  constructor(overlaps) {
    this.overlaps = overlaps;
    this.counts = new Map();
  }

  keysOf(desc) {
    const keys = [];
    if (STRICT_TIME) keys.push("T");
    if (desc.lecturerId) keys.push(`L${desc.lecturerId}`);
    if (desc.groupId) keys.push(`G${desc.groupId}`);
    if (desc.venueId) keys.push(`V${desc.venueId}`);
    return keys;
  }

  add(desc) {
    for (const key of this.keysOf(desc)) {
      const k = `${key}@${desc.slot.id}`;
      this.counts.set(k, (this.counts.get(k) || 0) + 1);
    }
  }

  remove(desc) {
    for (const key of this.keysOf(desc)) {
      const k = `${key}@${desc.slot.id}`;
      const next = (this.counts.get(k) || 0) - 1;
      if (next <= 0) this.counts.delete(k);
      else this.counts.set(k, next);
    }
  }

  clashes(desc) {
    const overlapping = this.overlaps.get(desc.slot.id) || [desc.slot.id];
    for (const key of this.keysOf(desc)) {
      for (const slotId of overlapping) {
        if (this.counts.get(`${key}@${slotId}`) > 0) return true;
      }
    }
    return false;
  }
}

function buildOverlapIndex(slots) {
  const index = new Map();
  for (const a of slots) {
    index.set(
      a.id,
      slots.filter((b) => slotsOverlap(a, b)).map((b) => b.id)
    );
  }
  return index;
}

function buildCandidates(entry, timeSlots, venues, occupancy) {
  const online = isOnline(entry);
  const size = groupSizeOf(entry);
  const currentSlot = entry.timeSlot || null;
  const currentVenueId = entry.venue?.id ?? entry.venueId ?? null;
  const currentType = entry.venue?.type ?? entry.venue?.venueType ?? null;

  let pool = [null];
  if (!online) {
    pool = venues.filter((venue) => {
      const capacity = Number(venue.capacity);
      return size == null || !Number.isFinite(capacity) || capacity <= 0 || capacity >= size;
    });
    if (entry.venue && !pool.some((venue) => venue.id === entry.venue.id)) {
      pool = [entry.venue, ...pool];
    }
  }

  const candidates = [];

  for (const slot of timeSlots) {
    if (isBlocked(entry.lecturer?.availabilities, slot)) continue;

    for (const venue of pool) {
      if (venue && isBlocked(venue.availabilities, slot)) continue;

      const venueId = venue ? venue.id : null;
      const desc = describeEntry(entry, slot, venueId);
      if (occupancy.clashes(desc)) continue;

      const sameSlot = currentSlot && slot.id === currentSlot.id;
      const sameVenue = venueId === (online ? null : currentVenueId);
      let cost = 0;

      if (!sameSlot) {
        cost += 1;
        if (currentSlot && slotDay(slot) !== slotDay(currentSlot)) cost += 1;
      }
      if (!sameVenue) {
        cost += 0.5;
        const nextType = venue?.type ?? venue?.venueType ?? null;
        if (currentType && nextType && currentType !== nextType) cost += 2;
      }

      candidates.push({ slot, venue, venueId, desc, cost });
    }
  }

  candidates.sort(
    (a, b) =>
      a.cost - b.cost ||
      Number(a.slot.sortOrder ?? 0) - Number(b.slot.sortOrder ?? 0)
  );

  return candidates;
}

function searchLevel({ movable, others, overlaps, timeSlots, venues, budget, stats }) {
  const occupancy = new Occupancy(overlaps);
  for (const entry of others) {
    if (entry.timeSlot) occupancy.add(currentDescriptor(entry));
  }

  const pending = movable.map((entry) => ({
    entry,
    candidates: buildCandidates(entry, timeSlots, venues, occupancy),
  }));

  if (pending.some((item) => item.candidates.length === 0)) {
    return null;
  }

  const unassigned = new Set(pending);
  const chosen = new Map();
  let aborted = false;

  function dfs() {
    if (unassigned.size === 0) return true;

    stats.nodesVisited += 1;
    if (stats.nodesVisited > budget.maxNodes || Date.now() > budget.deadline) {
      aborted = true;
      return false;
    }

    let bestItem = null;
    let bestValid = null;

    for (const item of unassigned) {
      const valid = [];
      for (const candidate of item.candidates) {
        if (!occupancy.clashes(candidate.desc)) valid.push(candidate);
      }
      if (valid.length === 0) return false;
      if (!bestValid || valid.length < bestValid.length) {
        bestItem = item;
        bestValid = valid;
        if (valid.length === 1) break;
      }
    }

    unassigned.delete(bestItem);

    for (const candidate of bestValid) {
      occupancy.add(candidate.desc);
      chosen.set(bestItem.entry.id, candidate);

      if (dfs()) return true;

      occupancy.remove(candidate.desc);
      chosen.delete(bestItem.entry.id);
      stats.backtracks += 1;

      if (aborted) break;
    }

    unassigned.add(bestItem);
    return false;
  }

  return dfs() ? chosen : null;
}

function expandNeighbours(active, seedIds) {
  const lecturers = new Set();
  const groups = new Set();
  const venuesUsed = new Set();

  for (const entry of active) {
    if (!seedIds.has(entry.id)) continue;
    if (lecturerIdOf(entry)) lecturers.add(lecturerIdOf(entry));
    if (groupIdOf(entry)) groups.add(groupIdOf(entry));
    if (entry.venue?.id ?? entry.venueId) venuesUsed.add(entry.venue?.id ?? entry.venueId);
  }

  const expanded = new Set(seedIds);
  for (const entry of active) {
    if (
      lecturers.has(lecturerIdOf(entry)) ||
      groups.has(groupIdOf(entry)) ||
      venuesUsed.has(entry.venue?.id ?? entry.venueId)
    ) {
      expanded.add(entry.id);
    }
  }
  return expanded;
}

function describeMove(entry, candidate, reasonTypes) {
  const code = entry.course?.code || "Class";
  const fromSlot = slotLabel(entry.timeSlot);
  const toSlot = slotLabel(candidate.slot);
  const fromVenue = entry.venue?.code || "no venue";
  const toVenue = candidate.venue?.code || "online";
  const reasons = [...reasonTypes].map((type) => REASON_TEXT[type]).filter(Boolean);
  const because = reasons.length
    ? `to remove ${reasons.join(" and ")}`
    : "to make room for other classes that had to move";

  const timeChanged = candidate.slot.id !== entry.timeSlot?.id;
  const venueChanged = candidate.venueId !== (entry.venue?.id ?? entry.venueId ?? null);

  if (timeChanged && venueChanged) {
    return `${code} moved from ${fromSlot} in ${fromVenue} to ${toSlot} in ${toVenue} ${because}.`;
  }
  if (timeChanged) {
    return `${code} moved from ${fromSlot} to ${toSlot} ${because}.`;
  }
  return `${code} moved from ${fromVenue} to ${toVenue} ${because}.`;
}

function solveWithBacktracking({
  entries,
  timeSlots,
  venues,
  maxNodes = 25000,
  maxMillis = 8000,
  focusIds = null,
}) {
  const active = (entries || []).filter(
    (entry) => !entry.status || entry.status === "ACTIVE"
  );
  const slotPool = (timeSlots || []).filter((slot) => slot.active !== false);
  const venuePool = (venues || []).filter((venue) => venue.active !== false);

  const stats = {
    strategy: "MRV backtracking with widening search",
    movableCount: 0,
    nodesVisited: 0,
    backtracks: 0,
    actionsCreated: 0,
    level: 0,
    solved: false,
  };

  const initialConflicts = detectConflicts(active);
  if (initialConflicts.length === 0) {
    stats.solved = true;
    return { entries, actions: [], stats };
  }

  const reasonsById = new Map();
  for (const conflict of initialConflicts) {
    const ids = [conflict.timetableEntryId];
    if (conflict.metadata?.conflictingEntryId) ids.push(conflict.metadata.conflictingEntryId);
    for (const id of ids) {
      if (!reasonsById.has(id)) reasonsById.set(id, new Set());
      reasonsById.get(id).add(conflict.type);
    }
  }

  const slotUniverse = new Map();
  for (const slot of slotPool) slotUniverse.set(slot.id, slot);
  for (const entry of active) {
    if (entry.timeSlot && !slotUniverse.has(entry.timeSlot.id)) {
      slotUniverse.set(entry.timeSlot.id, entry.timeSlot);
    }
  }
  const overlaps = buildOverlapIndex([...slotUniverse.values()]);

  const conflictedIds =
    focusIds && focusIds.length
      ? new Set(focusIds)
      : collectConflictedIds(initialConflicts);
  const levels = [
    conflictedIds,
    expandNeighbours(active, conflictedIds),
    new Set(active.map((entry) => entry.id)),
  ];

  const deadline = Date.now() + maxMillis;
  let chosen = null;
  let movableEntries = [];

  for (let level = 0; level < levels.length && !chosen; level += 1) {
    if (Date.now() > deadline) break;

    const ids = levels[level];
    if (level > 0 && ids.size === levels[level - 1].size) continue;

    movableEntries = active.filter((entry) => ids.has(entry.id));
    const others = active.filter((entry) => !ids.has(entry.id));

    stats.level = level + 1;
    stats.movableCount = movableEntries.length;

    chosen = searchLevel({
      movable: movableEntries,
      others,
      overlaps,
      timeSlots: slotPool,
      venues: venuePool,
      budget: { maxNodes, deadline },
      stats,
    });
  }

  if (!chosen) {
    return { entries, actions: [], stats };
  }

  const actions = [];
  const nextEntries = (entries || []).map((entry) => {
    const candidate = chosen.get(entry.id);
    if (!candidate) return entry;

    const fromSlotId = entry.timeSlot?.id ?? entry.timeSlotId ?? null;
    const fromVenueId = entry.venue?.id ?? entry.venueId ?? null;
    const timeChanged = candidate.slot.id !== fromSlotId;
    const venueChanged = candidate.venueId !== (isOnline(entry) ? null : fromVenueId);

    if (!timeChanged && !venueChanged) return entry;

    const { availabilities, ...venueLite } = candidate.venue || {};

    actions.push({
      timetableEntryId: entry.id,
      actionType:
        timeChanged && venueChanged ? "COMBINATION" : timeChanged ? "MOVE_TIME" : "MOVE_VENUE",
      fromTimeSlotId: fromSlotId,
      toTimeSlotId: candidate.slot.id,
      fromVenueId,
      toVenueId: candidate.venueId,
      toTimeSlot: candidate.slot,
      toVenue: candidate.venue ? venueLite : null,
      cost: Number(candidate.cost.toFixed(2)),
      reasoning: describeMove(entry, candidate, reasonsById.get(entry.id) || []),
    });

    return {
      ...entry,
      timeSlotId: candidate.slot.id,
      timeSlot: candidate.slot,
      venueId: candidate.venueId,
      venue: candidate.venue,
    };
  });

  stats.actionsCreated = actions.length;
  stats.solved = detectConflicts(nextEntries).length === 0;

  return { entries: nextEntries, actions, stats };
}

function diagnoseUnit({ entries, entryId, timeSlots, venues }) {
  const active = (entries || []).filter(
    (item) => !item.status || item.status === "ACTIVE"
  );
  const entry = active.find((item) => item.id === entryId);
  if (!entry) return "";

  const slotPool = (timeSlots || []).filter((slot) => slot.active !== false);
  const venuePool = (venues || []).filter((venue) => venue.active !== false);

  const universe = new Map();
  for (const slot of slotPool) universe.set(slot.id, slot);
  for (const item of active) {
    if (item.timeSlot && !universe.has(item.timeSlot.id)) {
      universe.set(item.timeSlot.id, item.timeSlot);
    }
  }

  const occupancy = new Occupancy(buildOverlapIndex([...universe.values()]));
  for (const item of active) {
    if (item.id !== entryId && item.timeSlot) occupancy.add(currentDescriptor(item));
  }

  const size = groupSizeOf(entry);
  const usable = venuePool.filter((venue) => {
    const capacity = Number(venue.capacity);
    return size == null || !Number.isFinite(capacity) || capacity <= 0 || capacity >= size;
  });

  let open = 0;
  let taken = 0;
  let lecturer = 0;
  let noVenue = 0;

  for (const slot of slotPool) {
    if (isBlocked(entry.lecturer?.availabilities, slot)) {
      lecturer += 1;
      continue;
    }
    const options = isOnline(entry)
      ? [null]
      : usable.filter((venue) => !isBlocked(venue.availabilities, slot));
    if (options.length === 0) {
      noVenue += 1;
      continue;
    }
    const free = options.some(
      (venue) => !occupancy.clashes(describeEntry(entry, slot, venue ? venue.id : null))
    );
    if (free) open += 1;
    else taken += 1;
  }

  return `Checked ${slotPool.length} time slots: ${open} open, ${taken} already taken, ${lecturer} lecturer unavailable, ${noVenue} with no usable venue (${usable.length} of ${venuePool.length} venues fit the group).`;
}

export {
  diagnoseUnit,
  setStrictTime,
  detectConflicts as detectLocalConflicts,
  solveWithBacktracking as solveLocally,
  slotLabel,
};