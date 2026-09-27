import { motion } from "framer-motion";
import {
  ArrowRight,
  Clock3,
  Users,
  MapPin,
} from "lucide-react";

export default function ScheduleCard({
  entry,
  moved = false,
  active = false,
}) {
  const code =
    entry.course?.code || "UNIT";

  const name =
    entry.course?.name ||
    "Untitled unit";

  const group =
    entry.studentGroup?.code ||
    "Group";

  const venue =
    entry.venue?.code ||
    entry.venue?.name ||
    "Online";

  const lecturer =
    entry.lecturer?.name ||
    "Unassigned";

  const start =
    entry.timeSlot?.startTime || "";

  const end =
    entry.timeSlot?.endTime || "";

  const time =
    start && end
      ? `${start} – ${end}`
      : "";

  const deliveryMode =
    entry.deliveryMode || "";

  return (
    <motion.article
      layout
      layoutId={`entry-${entry.id}`}
      className={`schedule-card ${
        moved
          ? "schedule-card-moved"
          : ""
      } ${
        active
          ? "schedule-card-active"
          : ""
      }`}
      initial={{
        opacity: 0,
        y: 10,
        scale: 0.97,
      }}
      animate={{
        opacity: 1,
        y: 0,
        scale: active ? 1.015 : 1,
      }}
      exit={{
        opacity: 0,
        scale: 0.96,
      }}
      whileHover={{
        y: -3,
      }}
      transition={{
        layout: {
          type: "spring",
          stiffness: 320,
          damping: 28,
        },
        opacity: {
          duration: 0.25,
        },
        scale: {
          duration: 0.25,
        },
        y: {
          duration: 0.25,
        },
      }}
    >

      <div className="schedule-card-top">

        <span>
          {code}
        </span>

        {active && (
          <motion.b
            initial={{
              opacity: 0,
              scale: 0.85,
            }}
            animate={{
              opacity: 1,
              scale: 1,
            }}
          >
            ORBIT
          </motion.b>
        )}

        {!active && moved && (
          <b>
            Moved
          </b>
        )}

      </div>

      <h3>
        {name}
      </h3>

      <p>
        {lecturer}
      </p>

      <div className="schedule-meta">

        <span>
          <Users size={11} />
          {group}
        </span>

        <span>
          <MapPin size={11} />
          {venue}
        </span>

      </div>

      {(time || deliveryMode) && (
        <div className="schedule-extra">

          {time && (
            <span>
              <Clock3 size={11} />
              {time}
            </span>
          )}

          {deliveryMode && (
            <span>
              <ArrowRight size={10} />
              {deliveryMode}
            </span>
          )}

        </div>
      )}

      {active && (
        <motion.div
          className="schedule-card-scan"
          initial={{
            scaleX: 0,
            opacity: 0,
          }}
          animate={{
            scaleX: [0, 1, 0],
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: 1.4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      )}

    </motion.article>
  );
}