import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  RefreshCw,
  BarChart3,
  Calendar,
} from "lucide-react";
import { Link } from "react-router-dom";

import Reveal from "../components/Reveal";
import GlassCard from "../components/GlassCard";
import TimetableBoard from "../components/TimetableBoard";
import { getConflicts, getTimetable } from "../services/api";

export default function Timetable() {
  const [entries, setEntries] = useState([]);
  const [conflicts, setConflicts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  async function load(showRefreshing = false) {
    if (showRefreshing) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const [timetable, conflictData] = await Promise.all([
        getTimetable(),
        getConflicts(),
      ]);

      setEntries(timetable.entries || []);
      setConflicts(conflictData.conflicts || []);
    } catch (requestError) {
      console.error(requestError);
      setError(requestError.message || "Unable to load the timetable.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const conflictCount = conflicts.length;
  const scheduledCount = entries.filter((e) => e.timeSlot).length;

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
    <Reveal className="timetable-page" data-page="timetable">
      <motion.div
        className="page-heading"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div>
          <span className="eyebrow-small">
            <Calendar size={14} /> TIMETABLE
          </span>
          <h1>Weekly schedule</h1>
        </div>

        <motion.div
          className="page-heading-actions"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={itemVariants}>
            <Link className="button-primary timetable-solve-button" to="/solver">
              <BrainCircuit size={16} />
              Solve clashes
              <ArrowRight size={15} />
            </Link>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Link className="button-secondary" to="/conflict-lab">
              Create conflict
            </Link>
          </motion.div>

          <motion.button
            className="button-secondary"
            type="button"
            onClick={() => load(true)}
            disabled={loading || refreshing}
            variants={itemVariants}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <RefreshCw
              size={15}
              className={refreshing ? "refresh-spinning" : ""}
            />
            {refreshing ? "Refreshing..." : "Refresh"}
          </motion.button>
        </motion.div>
      </motion.div>

      <AnimatePresence mode="wait">
        {error && (
          <Reveal>
            <motion.div
              className="page-error"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                <AlertTriangle size={18} />
              </motion.div>

              <div>
                <strong>Timetable unavailable</strong>
                <p>{error}</p>
              </div>

              <motion.button
                className="button-secondary"
                type="button"
                onClick={() => load(true)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Try again
              </motion.button>
            </motion.div>
          </Reveal>
        )}
      </AnimatePresence>

      <Reveal delay={0.04}>
        <motion.div
          className="timetable-status-strip"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div className="timetable-status-item" variants={itemVariants}>
            <motion.div
              className="status-icon scheduled"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <BarChart3 size={18} />
            </motion.div>

            <div>
              <motion.strong
                animate={{ color: loading ? "#999" : "#333" }}
                transition={{ duration: 0.5 }}
              >
                {loading ? "—" : scheduledCount}
              </motion.strong>
              <span>Scheduled</span>
            </div>
          </motion.div>

          <motion.div className="timetable-status-item" variants={itemVariants}>
            <motion.div
              className={`status-icon ${conflictCount > 0 ? "conflict" : "clear"}`}
              animate={{
                scale: conflictCount > 0 ? [1, 1.1, 1] : 1,
              }}
              transition={{
                duration: conflictCount > 0 ? 1.5 : 0.5,
                repeat: conflictCount > 0 ? Infinity : false,
              }}
            >
              {conflictCount > 0 ? (
                <AlertTriangle size={18} />
              ) : (
                <CheckCircle2 size={18} />
              )}
            </motion.div>

            <div>
              <motion.strong
                animate={{
                  color: conflictCount > 0 ? "#ef4444" : "#10b981",
                }}
                transition={{ duration: 0.5 }}
              >
                {loading ? "—" : conflictCount}
              </motion.strong>
              <span>Conflicts</span>
            </div>
          </motion.div>

          <motion.div className="timetable-status-item" variants={itemVariants}>
            <motion.div
              className={`status-icon ${conflictCount > 0 ? "conflict" : "clear"}`}
              animate={{
                rotate: conflictCount > 0 ? [0, 10, -10, 0] : 0,
              }}
              transition={{
                duration: 1,
                repeat: conflictCount > 0 ? Infinity : false,
              }}
            >
              {conflictCount > 0 ? (
                <AlertTriangle size={18} />
              ) : (
                <CheckCircle2 size={18} />
              )}
            </motion.div>

            <div>
              <motion.strong
                animate={{
                  color: conflictCount > 0 ? "#ef4444" : "#10b981",
                }}
                transition={{ duration: 0.5 }}
              >
                {loading ? "—" : conflictCount > 0 ? "Needs solving" : "Clear"}
              </motion.strong>
              <span>State</span>
            </div>
          </motion.div>
        </motion.div>
      </Reveal>

      <Reveal delay={0.08}>
        <GlassCard className="full-timetable">
          <motion.div
            className="section-header"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.12 }}
          >
            <div>
              <span className="eyebrow-small">WEEKLY BOARD</span>
              <h2>Current timetable</h2>
            </div>

            <motion.div
              className="board-note"
              animate={{
                boxShadow: conflictCount
                  ? "0 0 20px rgba(239, 68, 68, 0.2)"
                  : "0 0 20px rgba(16, 185, 129, 0.2)",
              }}
            >
              <motion.div
                animate={{
                  scale: conflictCount > 0 ? [1, 1.05, 1] : 1,
                }}
                transition={{
                  duration: 1,
                  repeat: conflictCount > 0 ? Infinity : false,
                }}
              >
                {conflictCount > 0 ? (
                  <AlertTriangle size={14} />
                ) : (
                  <CheckCircle2 size={14} />
                )}
              </motion.div>
              {conflictCount > 0 ? (
                <>
                  {conflictCount} conflict
                  {conflictCount === 1 ? "" : "s"} detected
                </>
              ) : (
                <>No active conflicts</>
              )}
            </motion.div>
          </motion.div>

          <TimetableBoard entries={entries} loading={loading} />
        </GlassCard>
      </Reveal>
    </Reveal>
  );
}