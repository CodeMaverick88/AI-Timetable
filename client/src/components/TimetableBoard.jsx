import { AnimatePresence, motion } from "framer-motion";
import { Clock3 } from "lucide-react";

import ScheduleCard from "./ScheduleCard";

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
];

const SLOTS = [
  {
    start: "08:00",
    end: "10:00",
  },
  {
    start: "10:00",
    end: "12:00",
  },
  {
    start: "12:00",
    end: "14:00",
  },
  {
    start: "14:00",
    end: "16:00",
  },
];

function matchesDay(entry, day) {
  const dayOfWeek = entry.timeSlot?.dayOfWeek;
  const dayName = entry.timeSlot?.dayName;

  return (
    dayOfWeek === day.toUpperCase() ||
    dayName === day
  );
}

function getEntryKey(entry) {
  return `${entry.id}-${entry.timeSlot?.id || "time"}-${
    entry.venue?.id || "venue"
  }`;
}

export default function TimetableBoard({
  entries = [],
  loading = false,
  movedEntryIds = [],
  activeEntryId = null,
  actionEntryId = null,
}) {
  if (loading) {
    return (
      <div className="timetable-loading">
        <motion.div
          animate={{ opacity: [0.45, 1, 0.45] }}
          transition={{
            duration: 1.4,
            repeat: Infinity,
          }}
        >
          Loading timetable...
        </motion.div>
      </div>
    );
  }

  return (
    <div className="timetable-scroll">
      <div className="timetable-grid">

        <div className="timetable-head time-head">
          <Clock3 size={14} />
          Time
        </div>

        {DAYS.map((day) => (
          <div
            className="timetable-head"
            key={day}
          >
            <strong>{day.slice(0, 3)}</strong>
            <span>{day}</span>
          </div>
        ))}

        {SLOTS.map((slot) => (
          <div
            className="timetable-row"
            key={slot.start}
          >
            <div className="time-slot">
              <strong>{slot.start}</strong>
              <span>{slot.end}</span>
            </div>

            {DAYS.map((day) => {
              const classes = entries.filter(
                (entry) =>
                  entry.timeSlot?.startTime?.slice(0, 5) ===
                    slot.start &&
                  matchesDay(entry, day),
              );

              return (
                <div
                  className={`timetable-cell ${
                    classes.length > 0
                      ? "has-classes"
                      : ""
                  }`}
                  key={`${day}-${slot.start}`}
                >
                  <AnimatePresence
                    mode="popLayout"
                    initial={false}
                  >
                    {classes.map((entry) => {
                      const isMoved =
                        movedEntryIds.includes(entry.id);

                      const isActive =
                        activeEntryId === entry.id ||
                        actionEntryId === entry.id;

                      return (
                        <motion.div
                          key={getEntryKey(entry)}
                          layout
                          layoutId={`schedule-${entry.id}`}
                          transition={{
                            layout: {
                              type: "spring",
                              stiffness: 320,
                              damping: 28,
                            },
                          }}
                          initial={{
                            opacity: 0,
                            scale: 0.96,
                          }}
                          animate={{
                            opacity: 1,
                            scale: 1,
                          }}
                          exit={{
                            opacity: 0,
                            scale: 0.94,
                          }}
                          className={`schedule-motion-wrap ${
                            isMoved
                              ? "schedule-moved"
                              : ""
                          } ${
                            isActive
                              ? "schedule-active"
                              : ""
                          }`}
                        >
                          <ScheduleCard
                            entry={entry}
                            moved={isMoved}
                            active={isActive}
                          />
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>

                  {classes.length === 0 && (
                    <span className="available">
                      Available
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}