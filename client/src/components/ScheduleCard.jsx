import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  BrainCircuit,
  Building2,
  CalendarDays,
  ChevronDown,
  Clock3,
  MapPin,
  Users,
  Zap,
} from "lucide-react";
import { useState } from "react";

const ICONS = [BookOpen, BrainCircuit, Building2, CalendarDays];
const TONES = ["blue", "teal", "violet", "amber"];
const TONE_COLORS = {
  blue: { bg: "rgba(59, 130, 246, 0.08)", border: "rgb(59, 130, 246)" },
  teal: { bg: "rgba(20, 184, 166, 0.08)", border: "rgb(20, 184, 166)" },
  violet: { bg: "rgba(139, 92, 246, 0.08)", border: "rgb(139, 92, 246)" },
  amber: { bg: "rgba(245, 158, 11, 0.08)", border: "rgb(245, 158, 11)" },
};

export default function ScheduleCard({
  entry,
  moved = false,
  active = false,
  expanded = false,
  onToggle,
}) {
  const [hovered, setHovered] = useState(false);

  const code = entry.course?.code || "UNIT";
  const name = entry.course?.name || "Untitled unit";
  const group = entry.studentGroup?.code || "Group";
  const venue = entry.venue?.code || entry.venue?.name || "Online";
  const campus =
    entry.campus?.code || entry.campus?.name || entry.venue?.campus || "Campus";
  const lecturer = entry.lecturer?.name || "Unassigned";
  const start = entry.timeSlot?.startTime || "";
  const end = entry.timeSlot?.endTime || "";
  const day =
    entry.timeSlot?.dayName || entry.timeSlot?.dayOfWeek || "Day not set";
  const mode = entry.deliveryMode || "Regular / day";
  
  const numericCode = [...code].reduce(
    (sum, character) => sum + character.charCodeAt(0),
    0,
  );
  const Icon = ICONS[numericCode % ICONS.length];
  const tone = TONES[numericCode % TONES.length];
  const toneColor = TONE_COLORS[tone];

  return (
    <motion.article
      layout
      layoutId={`entry-${entry.id}`}
      className={`unit-card unit-card-${tone} ${
        moved ? "unit-card-moved" : ""
      } ${active ? "unit-card-active" : ""} ${expanded ? "unit-card-expanded" : ""}`}
      aria-expanded={expanded}
      aria-label={`${code}: ${name}`}
      onClick={onToggle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      whileHover={{ y: -8, scale: 1.018 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 350, damping: 25 }}
      style={{
        background: hovered || active || expanded ? toneColor.bg : "white",
        borderColor: active ? toneColor.border : "rgba(0, 0, 0, 0.08)",
      }}
    >
      <motion.div
        className="unit-card-header"
        animate={{
          gap: expanded ? 12 : 8,
        }}
      >
        <motion.span
          className="unit-card-icon"
          animate={{
            scale: active ? 1.2 : 1,
            color: active ? toneColor.border : "currentColor",
          }}
        >
          <Icon size={15} />
        </motion.span>

        <span className="unit-card-code">{code}</span>

        <motion.span
          className="unit-card-chevron"
          animate={{
            rotate: expanded ? 180 : 0,
          }}
          transition={{ duration: 0.3 }}
        >
          <ChevronDown size={14} />
        </motion.span>
      </motion.div>

      <h3>{name}</h3>
      <p className="unit-card-lecturer">{lecturer}</p>

      <div className="unit-card-meta">
        <span>
          <Clock3 size={11} />
          {start && end ? `${start} – ${end}` : "Time pending"}
        </span>
        <span>
          <MapPin size={11} />
          {venue}
        </span>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            className="unit-card-details"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <div className="unit-card-divider" />
            <div className="unit-detail-grid">
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 }}
              >
                <CalendarDays size={12} />
                <b>Day</b>
                <em>{day}</em>
              </motion.span>

              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Building2 size={12} />
                <b>Campus</b>
                <em>{campus}</em>
              </motion.span>

              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 }}
              >
                <Users size={12} />
                <b>Group</b>
                <em>{group}</em>
              </motion.span>

              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <BookOpen size={12} />
                <b>Mode</b>
                <em>{mode}</em>
              </motion.span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {active && (
        <motion.div
          className="unit-card-scan"
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: [0, 1, 0], opacity: [0, 1, 0] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      <AnimatePresence>
        {(active || moved) && (
          <motion.span
            className={`unit-card-state ${active ? "active" : "moved"}`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
          >
            {active ? (
              <>
                <Zap size={11} />
                ORBIT
              </>
            ) : (
              "Moved"
            )}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.article>
  );
}