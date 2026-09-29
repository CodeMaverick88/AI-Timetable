import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  FlaskConical,
  RefreshCw,
  Users,
  UserRound,
  MapPin,
  Zap,
} from "lucide-react";
import { Link } from "react-router-dom";

import Reveal from "../components/Reveal";
import GlassCard from "../components/GlassCard";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

const CONFLICT_TYPES = [
  {
    value: "VENUE",
    label: "Venue conflict",
    description: "Place two classes in the same venue and time slot.",
    icon: MapPin,
    color: "#0ea5e9",
  },
  {
    value: "LECTURER",
    label: "Lecturer conflict",
    description: "Assign two classes to the same lecturer at the same time.",
    icon: UserRound,
    color: "#f59e0b",
  },
  {
    value: "STUDENT_GROUP",
    label: "Student group conflict",
    description:
      "Schedule two classes for the same student group at the same time.",
    icon: Users,
    color: "#10b981",
  },
];

export default function ConflictLab() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const [conflictType, setConflictType] = useState("VENUE");
  const [firstEntryId, setFirstEntryId] = useState("");
  const [secondEntryId, setSecondEntryId] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [created, setCreated] = useState(false);

  async function loadEntries() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API}/api/timetable`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to load timetable entries.");
      }

      const timetableEntries = data.entries || [];
      setEntries(timetableEntries);

      if (timetableEntries.length >= 2) {
        setFirstEntryId((current) => current || timetableEntries[0].id);
        setSecondEntryId((current) => current || timetableEntries[1].id);
      }
    } catch (loadError) {
      console.error(loadError);
      setError(loadError.message || "Unable to load timetable entries.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEntries();
  }, []);

  const selectedType = useMemo(
    () => CONFLICT_TYPES.find((item) => item.value === conflictType),
    [conflictType],
  );

  async function createConflict() {
    setError("");
    setMessage("");
    setCreated(false);

    if (!firstEntryId || !secondEntryId) {
      setError("Select two timetable classes first.");
      return;
    }

    if (firstEntryId === secondEntryId) {
      setError("Choose two different timetable classes.");
      return;
    }

    setCreating(true);

    try {
      const response = await fetch(`${API}/api/demo/inject-conflict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conflictType,
          firstEntryId,
          secondEntryId,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Unable to create the conflict.");
      }

      setCreated(true);
      setMessage(data.message || "A real timetable conflict has been created.");
      await loadEntries();
    } catch (createError) {
      console.error(createError);
      setError(createError.message || "Unable to create the conflict.");
    } finally {
      setCreating(false);
    }
  }

  function entryLabel(entry) {
    const code = entry.course?.code || "UNIT";
    const name = entry.course?.name || "Untitled unit";
    const day = entry.timeSlot?.dayName || entry.timeSlot?.dayOfWeek || "";
    const time =
      entry.timeSlot?.startTime && entry.timeSlot?.endTime
        ? `${entry.timeSlot.startTime} – ${entry.timeSlot.endTime}`
        : "";

    return `${code} · ${name} · ${day} ${time}`;
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="conflict-lab-page" data-page="conflict-lab">
      <Reveal>
        <div className="page-heading">
          <div>
            <span className="eyebrow-small">CONFLICT LAB</span>
            <h1>Create a real timetable conflict.</h1>
            <p>
              Deliberately introduce a scheduling problem into the database,
              then send the timetable to ORBIT to solve it.
            </p>
          </div>

          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Link className="button-secondary" to="/solver">
              <BrainCircuit size={16} />
              Open ORBIT
            </Link>
          </motion.div>
        </div>
      </Reveal>

      <div className="conflict-lab-layout">
        <Reveal delay={0.06}>
          <GlassCard className="conflict-builder">
            <motion.div
              className="lab-card-heading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <motion.div
                className="lab-icon"
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity }}
              >
                <FlaskConical size={24} />
              </motion.div>

              <div>
                <span className="eyebrow-small">SCENARIO BUILDER</span>
                <h2>Choose the conflict.</h2>
              </div>
            </motion.div>

            <motion.div
              className="conflict-types"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {CONFLICT_TYPES.map((type) => {
                const Icon = type.icon;
                const selected = conflictType === type.value;

                return (
                  <motion.button
                    key={type.value}
                    type="button"
                    aria-pressed={selected}
                    className={`conflict-type ${selected ? "selected" : ""}`}
                    onClick={() => {
                      setConflictType(type.value);
                      setCreated(false);
                      setMessage("");
                      setError("");
                    }}
                    variants={itemVariants}
                    whileHover={{ x: 6, boxShadow: `0 8px 20px ${type.color}20` }}
                    whileTap={{ scale: 0.98 }}
                    style={{
                      borderColor: selected ? type.color : "rgba(0, 0, 0, 0.08)",
                    }}
                  >
                    <motion.div
                      className="conflict-type-icon"
                      style={{ background: `${type.color}15`, color: type.color }}
                      animate={{ scale: selected ? 1.1 : 1 }}
                    >
                      <Icon size={18} />
                    </motion.div>

                    <div>
                      <strong>{type.label}</strong>
                      <span>{type.description}</span>
                    </div>

                    <AnimatePresence>
                      {selected && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                        >
                          <CheckCircle2 size={17} color={type.color} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.button>
                );
              })}
            </motion.div>

            <motion.div
              className="lab-form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <label>
                <span>First class</span>
                <select
                  value={firstEntryId}
                  onChange={(event) => setFirstEntryId(event.target.value)}
                  disabled={loading || creating}
                >
                  <option value="">Select a class</option>
                  {entries.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entryLabel(entry)}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Second class</span>
                <select
                  value={secondEntryId}
                  onChange={(event) => setSecondEntryId(event.target.value)}
                  disabled={loading || creating}
                >
                  <option value="">Select a class</option>
                  {entries.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entryLabel(entry)}
                    </option>
                  ))}
                </select>
              </label>
            </motion.div>

            <motion.div
              className="lab-action"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <motion.div
                animate={{
                  boxShadow: selectedType
                    ? `0 0 0 2px ${selectedType.color}30`
                    : "0 0 0 0px rgba(0,0,0,0)",
                }}
              >
                <span>Selected scenario</span>
                <strong style={{ color: selectedType?.color }}>
                  {selectedType?.label}
                </strong>
              </motion.div>

              <motion.button
                className="button-primary"
                type="button"
                onClick={createConflict}
                disabled={loading || creating || entries.length < 2}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {creating ? (
                  <>
                    <RefreshCw size={15} className="refresh-spinning" />
                    Creating...
                  </>
                ) : (
                  <>
                    Create conflict
                    <ArrowRight size={15} />
                  </>
                )}
              </motion.button>
            </motion.div>
          </GlassCard>
        </Reveal>

        <Reveal delay={0.1}>
          <aside className="conflict-lab-side">
            <GlassCard className="lab-explanation">
              <motion.div
                className="lab-side-icon"
                animate={{ rotate: [0, 10, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <AlertTriangle size={20} />
              </motion.div>

              <span className="eyebrow-small">CONTROLLED FAILURE</span>
              <h2>Break it deliberately.</h2>
              <p>
                This lab is connected to the timetable data. The selected
                conflict is injected into the scheduling scenario so ORBIT has
                something real to solve.
              </p>

              <motion.div
                className="lab-flow"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                {[
                  { number: "01", text: "Choose a conflict type" },
                  { number: "02", text: "Select two timetable classes" },
                  { number: "03", text: "Inject the conflict" },
                  { number: "04", text: "Send it to ORBIT" },
                ].map((step, index) => (
                  <FlowStep key={step.number} {...step} variants={itemVariants} />
                ))}
              </motion.div>
            </GlassCard>

            <AnimatePresence mode="wait">
              {created && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                >
                  <GlassCard className="lab-success">
                    <motion.div
                      className="lab-success-icon"
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    >
                      <CheckCircle2 size={20} />
                    </motion.div>

                    <div>
                      <span>CONFLICT CREATED</span>
                      <strong>The timetable is ready for ORBIT.</strong>
                      <p>{message}</p>
                    </div>

                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Link className="button-primary" to="/solver">
                        Solve with ORBIT
                        <ArrowRight size={15} />
                      </Link>
                    </motion.div>
                  </GlassCard>
                </motion.div>
              )}

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                >
                  <GlassCard className="lab-error">
                    <AlertTriangle size={19} />

                    <div>
                      <strong>Conflict creation failed</strong>
                      <p>{error}</p>
                    </div>
                  </GlassCard>
                </motion.div>
              )}
            </AnimatePresence>
          </aside>
        </Reveal>
      </div>

      <Reveal delay={0.15}>
        <section className="lab-bottom">
          <div>
            <span className="eyebrow-small">NEXT STEP</span>
            <h2>Once the conflict exists, watch ORBIT work.</h2>
            <p>
              The solver page uses the real timetable, the real backend solver
              and the real solver decisions.
            </p>
          </div>

          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Link className="button-secondary" to="/solver">
              Open solver
              <ArrowRight size={15} />
            </Link>
          </motion.div>
        </section>
      </Reveal>
    </div>
  );
}

function FlowStep({ number, text, variants }) {
  return (
    <motion.div className="lab-flow-step" variants={variants}>
      <span>{number}</span>
      <p>{text}</p>
    </motion.div>
  );
}