import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { Link } from "react-router-dom";

import GlassCard from "../components/GlassCard";
import Reveal from "../components/Reveal";
import TimetableBoard from "../components/TimetableBoard";
import { getConflicts, getTimetable } from "../services/api";

export default function Home() {
  const [entries, setEntries] = useState([]);
  const [conflicts, setConflicts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function loadDashboard(showRefresh = false) {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [timetable, conflictData] = await Promise.all([
        getTimetable(),
        getConflicts(),
      ]);
      setEntries(timetable.entries || []);
      setConflicts(conflictData.conflicts || []);
    } catch (error) {
      console.error("Failed to load dashboard:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const conflictCount = conflicts.length;
  const scheduleState = loading
    ? "Loading board"
    : conflictCount > 0
      ? "Needs attention"
      : "Schedule clear";
  const scheduleColor =
    conflictCount > 0 ? "#ef4444" : "#10b981";

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="home-page" data-page="home">
      {/* ============ INTRO ============ */}
      <Reveal>
        <motion.section className="orbit-intro">
          <motion.div
            className="orbit-intro-copy"
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <motion.span
              className="eyebrow-small"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <Sparkles size={13} />
              </motion.span>
              ORBIT SCHEDULING INTELLIGENCE
            </motion.span>

            <h1>
              Your timetable,{" "}
              <motion.em
                animate={{
                  backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                }}
                transition={{ duration: 4, repeat: Infinity }}
                style={{
                  backgroundImage:
                    "linear-gradient(90deg, #6366f1, #0ea5e9, #10b981, #6366f1)",
                  backgroundSize: "200% 200%",
                  backgroundClip: "text",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                in orbit.
              </motion.em>
            </h1>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              A live constraint workspace for balancing classes, lecturers,
              venues and student groups without losing sight of the whole week.
            </motion.p>

            <motion.div
              className="orbit-intro-actions"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              <motion.div variants={itemVariants}>
                <Link className="button-primary" to="/solver">
                  <BrainCircuit size={16} /> Run ORBIT <ArrowRight size={15} />
                </Link>
              </motion.div>
              <motion.div variants={itemVariants}>
                <Link className="button-secondary" to="/conflict-lab">
                  Create a test conflict
                </Link>
              </motion.div>
            </motion.div>
          </motion.div>

          <motion.div
            className="orbit-intro-signal"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <motion.span
              className="signal-ring signal-ring-one"
              animate={{
                scale: [1, 1.5],
                opacity: [1, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
              }}
            />
            <motion.span
              className="signal-ring signal-ring-two"
              animate={{
                scale: [1, 1.5],
                opacity: [1, 0],
              }}
              transition={{
                duration: 2,
                delay: 0.5,
                repeat: Infinity,
              }}
            />
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            >
              <BrainCircuit size={40} />
            </motion.div>
            <strong>ORBIT</strong>
            <span>LIVE ENGINE</span>
          </motion.div>
        </motion.section>
      </Reveal>

      {/* ============ STATS ============ */}
      <Reveal delay={0.06}>
        <motion.div
          className="home-command-stats"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div className="stat-item" variants={itemVariants}>
            <span>Units on board</span>
            <motion.strong
              animate={{ scale: loading ? [1, 1.05, 1] : 1 }}
              transition={{ duration: 0.5, repeat: loading ? Infinity : false }}
            >
              {loading ? "—" : entries.length}
            </motion.strong>
          </motion.div>

          <motion.div className="stat-item" variants={itemVariants}>
            <span>Active conflicts</span>
            <motion.strong
              className={conflictCount ? "has-conflicts" : "is-clear"}
              animate={{
                color: scheduleColor,
                scale: conflictCount > 0 ? [1, 1.05, 1] : 1,
              }}
              transition={{ duration: 0.8, repeat: conflictCount > 0 ? Infinity : false }}
            >
              {loading ? "—" : conflictCount}
            </motion.strong>
          </motion.div>

          <motion.div className="stat-item" variants={itemVariants}>
            <span>System state</span>
            <motion.strong
              animate={{ color: scheduleColor }}
              transition={{ duration: 0.5 }}
            >
              {scheduleState}
            </motion.strong>
          </motion.div>

          <motion.button
            className="button-secondary"
            type="button"
            onClick={() => loadDashboard(true)}
            disabled={refreshing}
            variants={itemVariants}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <RefreshCw
              size={15}
              className={refreshing ? "refresh-spinning" : ""}
            />
            {refreshing ? "Syncing..." : "Sync board"}
          </motion.button>
        </motion.div>
      </Reveal>

      {/* ============ TIMETABLE CARD ============ */}
      <Reveal delay={0.1}>
        <GlassCard className="mother-timetable-card">
          <motion.div
            className="mother-card-header"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
          >
            <div>
              <span className="eyebrow-small">THE ORBIT BOARD</span>
              <h2>Weekly timetable workspace</h2>
              <p>
                Every unit is a movable card. Click one to inspect its
                constraints.
              </p>
            </div>

            <motion.div
              className={`mother-card-state ${conflictCount ? "has-conflicts" : ""}`}
              animate={{
                boxShadow: conflictCount
                  ? "0 0 20px rgba(239, 68, 68, 0.3)"
                  : "0 0 20px rgba(16, 185, 129, 0.3)",
              }}
            >
              <motion.div
                animate={{ rotate: conflictCount > 0 ? [0, 10, -10, 0] : 0 }}
                transition={{ duration: 1, repeat: conflictCount > 0 ? Infinity : false }}
              >
                {conflictCount ? (
                  <AlertTriangle size={14} />
                ) : (
                  <CheckCircle2 size={14} />
                )}
              </motion.div>
              <span>
                {conflictCount
                  ? `${conflictCount} conflict${conflictCount === 1 ? "" : "s"}`
                  : "All constraints clear"}
              </span>
            </motion.div>
          </motion.div>

          <TimetableBoard entries={entries} loading={loading} />
        </GlassCard>
      </Reveal>

      {/* ============ QUICK ACTIONS ============ */}
      <Reveal delay={0.15}>
        <motion.section
          className="home-quick-actions"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={itemVariants}>
            <GlassCard className="action-card action-solver">
              <BrainCircuit size={24} />
              <h3>Run ORBIT</h3>
              <p>Execute the solver to find optimal timetable assignments.</p>
              <Link to="/solver">
                Go to solver <ArrowRight size={14} />
              </Link>
            </GlassCard>
          </motion.div>

          <motion.div variants={itemVariants}>
            <GlassCard className="action-card action-conflict">
              <AlertTriangle size={24} />
              <h3>Create Conflict</h3>
              <p>Introduce a test scheduling problem to demonstrate ORBIT.</p>
              <Link to="/conflict-lab">
                Open lab <ArrowRight size={14} />
              </Link>
            </GlassCard>
          </motion.div>

          <motion.div variants={itemVariants}>
            <GlassCard className="action-card action-view">
              <TrendingUp size={24} />
              <h3>View Full Schedule</h3>
              <p>See the complete timetable with all details and conflicts.</p>
              <Link to="/timetable">
                View timetable <ArrowRight size={14} />
              </Link>
            </GlassCard>
          </motion.div>
        </motion.section>
      </Reveal>
    </div>
  );
}