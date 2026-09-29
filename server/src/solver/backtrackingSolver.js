// @ts-nocheck
const { detectConflicts, collectConflictedIds } = require("./conflictDetector");
const {
  slotsOverlap,
  slotDay,
  slotLabel,
  isOnline,
  lecturerIdOf,
  groupIdOf,
  groupSizeOf,
  isBlocked,
  describeEntry,
  currentDescriptor,
} = require("./constraintChecker");

const REASON_TEXT = {
  LECTURER_DOUBLE_BOOKING: "a lecturer double-booking",
  STUDENT_GROUP_CLASH: "a student group clash",
  VENUE_DOUBLE_BOOKING: "a venue double-booking",
  VENUE_CAPACITY: "a venue capacity problem",
  VENUE_UNAVAILABLE: "a venue availability problem",
  LECTURER_UNAVAILABLE: "a lecturer availability problem",
  MISSING_VENUE: "a missing venue",
  MISSING_TIME_SLOT: "a missing time slot",
};

class Occupancy {
  constructor(overlaps) {
    this.overlaps = overlaps;
    this.counts = new Map();
  }

  keysOf(desc) {
    const keys = [];
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

  const conflictedIds = collectConflictedIds(initialConflicts);
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

module.exports = { solveWithBacktracking };