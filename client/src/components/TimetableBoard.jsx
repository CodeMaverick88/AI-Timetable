import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { Clock3, AlertCircle, CheckCircle2 } from "lucide-react";
import { useState } from "react";

import ScheduleCard from "./ScheduleCard";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const SLOTS = [
  ["08:00", "10:00"],
  ["10:00", "12:00"],
  ["12:00", "14:00"],
  ["14:00", "16:00"],
  ["16:00", "18:00"],
];

function matchesDay(entry, day) {
  const dayOfWeek = String(entry.timeSlot?.dayOfWeek || "").toUpperCase();
  const dayName = entry.timeSlot?.dayName || "";
  return dayOfWeek === day.toUpperCase() || dayName === day;
}

function matchesSlot(entry, start) {
  return entry.timeSlot?.startTime?.slice(0, 5) === start;
}

export default function TimetableBoard({
  entries = [],
  loading = false,
  movedEntryIds = [],
  activeEntryId = null,
  actionEntryId = null,
}) {
  const [expandedEntryId, setExpandedEntryId] = useState(null);
  const movingEntryId = activeEntryId || actionEntryId;

  const validSchedules = entries.filter((e) => e.timeSlot);
  const unscheduledCount = entries.length - validSchedules.length;

  if (loading) {
    return (
      <div className="timetable-loading" role="status" aria-live="polite">
        <motion.div
          className="loading-container"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <motion.div className="loading-spinner" />
          <p>ORBIT is loading the timetable...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="timetable-board-shell" aria-label="ORBIT weekly timetable">
      <motion.div
        className="timetable-toolbar"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="timetable-live-note">
          <motion.span
            className="timetable-live-dot"
            animate={{
              scale: [1, 1.2, 1],
              boxShadow: [
                "0 0 0 0 rgba(16, 185, 129, 0.7)",
                "0 0 0 10px rgba(16, 185, 129, 0)",
              ],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
            }}
          />
          <span>Live timetable board</span>
        </div>

        <span className="timetable-board-hint">
          Click a unit to inspect its constraints
        </span>

        <div className="timetable-stats">
          <div className="stat-badge scheduled">
            <CheckCircle2 size={13} />
            <span>{validSchedules.length} scheduled</span>
          </div>
          {unscheduledCount > 0 && (
            <div className="stat-badge unscheduled">
              <AlertCircle size={13} />
              <span>{unscheduledCount} pending</span>
            </div>
          )}
        </div>
      </motion.div>

      <LayoutGroup>
        <div className="timetable-board-grid">
          <motion.div
            className="timetable-board-corner"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <Clock3 size={16} />
            <span>Time / day</span>
          </motion.div>

          <AnimatePresence>
            {DAYS.map((day, dayIndex) => (
              <motion.div
                className="timetable-day-heading"
                key={day}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: dayIndex * 0.05 }}
              >
                <strong>{day.slice(0, 3)}</strong>
                <span>{day}</span>
              </motion.div>
            ))}
          </AnimatePresence>

          {SLOTS.map(([start, end], slotIndex) => (
            <motion.div
              className="timetable-board-row"
              key={start}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: slotIndex * 0.05 }}
            >
              <div className="timetable-time-heading">
                <strong>{start}</strong>
                <span>{end}</span>
              </div>

              {DAYS.map((day) => {
                const slotEntries = entries.filter(
                  (entry) =>
                    matchesSlot(entry, start) && matchesDay(entry, day),
                );

                return (
                  <motion.div
                    className={`timetable-day-cell ${
                      slotEntries.length ? "has-entries" : ""
                    }`}
                    key={`${day}-${start}`}
                    layout
                    layoutId={`cell-${day}-${start}`}
                  >
                    <AnimatePresence initial={false} mode="popLayout">
                      {slotEntries.map((entry, index) => {
                        const active =
                          activeEntryId === entry.id ||
                          actionEntryId === entry.id;
                        const moved = movedEntryIds.includes(entry.id);
                        const expanded = expandedEntryId === entry.id;

                        return (
                          <motion.div
                            className={`unit-card-motion-wrap ${
                              active ? "is-orbit-moving" : ""
                            }`}
                            key={entry.id}
                            layout
                            layoutId={`unit-card-${entry.id}`}
                            initial={{ opacity: 0, y: 16, scale: 0.94 }}
                            animate={{
                              opacity: 1,
                              y: 0,
                              scale: active ? 1.04 : 1,
                            }}
                            exit={{ opacity: 0, y: -14, scale: 0.92 }}
                            transition={{
                              layout: {
                                type: "spring",
                                stiffness: 280,
                                damping: 24,
                              },
                              opacity: { duration: 0.25 },
                              scale: { duration: 0.25 },
                            }}
                          >
                            <ScheduleCard
                              entry={entry}
                              active={active}
                              moved={moved}
                              expanded={expanded}
                              onToggle={() =>
                                setExpandedEntryId((current) =>
                                  current === entry.id ? null : entry.id,
                                )
                              }
                            />
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>

                    {!slotEntries.length && (
                      <motion.span
                        className="timetable-open-slot"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.5 }}
                        transition={{ delay: 0.2 }}
                      >
                        Open
                      </motion.span>
                    )}
                  </motion.div>
                );
              })}
            </motion.div>
          ))}
        </div>
      </LayoutGroup>

      <AnimatePresence>
        {movingEntryId && (
          <motion.div
            className="orbit-movement-banner"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.3 }}
          >
            <motion.span
              className="orbit-movement-pulse"
              animate={{
                scale: [1, 1.5],
                opacity: [1, 0],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
              }}
            />
            <span>ORBIT is optimizing unit assignments through the constraint board</span>
          </motion.div>
        )}
      </AnimatePresence>

      {!entries.length && (
        <motion.div
          className="timetable-empty"
          role="status"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <AlertCircle size={32} />
          <p>No timetable records found.</p>
          <span>Create or import timetable entries to get started.</span>
        </motion.div>
      )}
    </div>
  );
}