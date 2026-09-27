import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BrainCircuit,
  CalendarDays,
  CheckCircle2,
  RefreshCw,
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
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const [timetableResponse, conflictResponse] = await Promise.all([
        getTimetable(),
        getConflicts(),
      ]);

      setEntries(timetableResponse?.entries || []);
      setConflicts(conflictResponse?.conflicts || []);
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
  const scheduleValid = conflictCount === 0;

  return (
    <div className="home">
      {/* HEADER */}
      <Reveal>
        <section className="home-dashboard-head">
          <div>
            <span className="eyebrow-small">CONTROL CENTER</span>

            <h1>Timetable System</h1>
          </div>

          <div
            className={`system-pill ${
              scheduleValid ? "system-pill-ok" : "system-pill-warning"
            }`}
          >
            {scheduleValid ? (
              <>
                <CheckCircle2 size={16} />
                Schedule valid
              </>
            ) : (
              <>
                <AlertTriangle size={16} />
                {conflictCount} conflicts
              </>
            )}
          </div>
        </section>
      </Reveal>

      {/* SUMMARY */}
      <Reveal delay={0.05}>
        <section className="home-summary">
          <GlassCard className="home-stat">
            <div className="home-stat-icon">
              <CalendarDays size={20} />
            </div>

            <div>
              <span>Classes</span>
              <strong>{entries.length}</strong>
            </div>
          </GlassCard>

          <GlassCard
            className={`home-stat ${
              conflictCount > 0 ? "home-stat-warning" : ""
            }`}
          >
            <div className="home-stat-icon">
              {conflictCount > 0 ? (
                <AlertTriangle size={20} />
              ) : (
                <CheckCircle2 size={20} />
              )}
            </div>

            <div>
              <span>Conflicts</span>
              <strong>{conflictCount}</strong>
            </div>
          </GlassCard>

          <GlassCard className="home-stat">
            <div className="home-stat-icon orbit-stat-icon">
              <BrainCircuit size={20} />
            </div>

            <div>
              <span>ORBIT</span>
              <strong>{conflictCount > 0 ? "Ready" : "Idle"}</strong>
            </div>
          </GlassCard>
        </section>
      </Reveal>

      {/* TIMETABLE */}
      <Reveal delay={0.1}>
        <GlassCard className="home-timetable-card">
          <div className="home-section-header">
            <div>
              <span className="eyebrow-small">LIVE SCHEDULE</span>
              <h2>Current timetable</h2>
            </div>

            <button
              type="button"
              className="home-refresh"
              onClick={() => loadDashboard(true)}
              disabled={refreshing}
              aria-label="Refresh timetable"
            >
              <RefreshCw
                size={16}
                className={refreshing ? "spin" : ""}
              />
            </button>
          </div>

          <TimetableBoard
            entries={entries}
            loading={loading}
          />
        </GlassCard>
      </Reveal>

      {/* ACTIONS */}
      <Reveal delay={0.15}>
        <section className="home-actions">
          <Link to="/solver" className="button-primary home-main-action">
            <BrainCircuit size={18} />
            Solve clashes
            <ArrowRight size={17} />
          </Link>

          <Link to="/conflict-lab" className="button-secondary">
            Create conflict
          </Link>

          <Link to="/timetable" className="home-open-link">
            Open full timetable
            <ArrowRight size={16} />
          </Link>
        </section>
      </Reveal>
    </div>
  );
}