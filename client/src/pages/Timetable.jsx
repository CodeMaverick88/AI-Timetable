import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { Link } from "react-router-dom";

import Reveal from "../components/Reveal";
import GlassCard from "../components/GlassCard";
import TimetableBoard from "../components/TimetableBoard";

import {
  getConflicts,
  getTimetable,
} from "../services/api";

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
      const [
        timetable,
        conflictData,
      ] = await Promise.all([
        getTimetable(),
        getConflicts(),
      ]);

      setEntries(timetable.entries || []);
      setConflicts(
        conflictData.conflicts || [],
      );
    } catch (requestError) {
      console.error(requestError);

      setError(
        requestError.message ||
          "Unable to load the timetable.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const conflictCount = conflicts.length;

  return (
    <Reveal>

      <div className="page-heading">

        <div>
          <span className="eyebrow-small">
            TIMETABLE
          </span>

          <h1>
            The week at a glance.
          </h1>

          <p>
            A live view of the current timetable
            pulled directly from the scheduling database.
          </p>
        </div>

        <div className="page-heading-actions">

          <Link
            className="button-primary timetable-solve-button"
            to="/solver"
          >
            <BrainCircuit size={16} />
            Solve clashes
            <ArrowRight size={15} />
          </Link>

          <button
            className="button-secondary"
            type="button"
            onClick={() => load(true)}
            disabled={loading || refreshing}
          >
            <RefreshCw
              size={15}
              className={
                refreshing
                  ? "refresh-spinning"
                  : ""
              }
            />

            {refreshing
              ? "Refreshing..."
              : "Refresh"}
          </button>

        </div>

      </div>

      {error && (
        <Reveal>
          <div className="page-error">

            <AlertTriangle size={18} />

            <div>
              <strong>
                Timetable unavailable
              </strong>

              <p>
                {error}
              </p>
            </div>

            <button
              className="button-secondary"
              type="button"
              onClick={() => load(true)}
            >
              Try again
            </button>

          </div>
        </Reveal>
      )}

      <Reveal delay={0.05}>
        <div className="timetable-status-strip">

          <div className="timetable-status-item">

            <CalendarIcon />

            <div>
              <strong>
                {loading ? "—" : entries.length}
              </strong>

              <span>
                Classes scheduled
              </span>
            </div>

          </div>

          <div className="timetable-status-item">

            <AlertTriangle size={18} />

            <div>
              <strong>
                {loading ? "—" : conflictCount}
              </strong>

              <span>
                Active conflicts
              </span>
            </div>

          </div>

          <div className="timetable-status-item">

            {conflictCount === 0 ? (
              <CheckCircle2 size={18} />
            ) : (
              <BrainCircuit size={18} />
            )}

            <div>
              <strong>
                {conflictCount === 0
                  ? "Verified"
                  : "Needs solving"}
              </strong>

              <span>
                Current schedule state
              </span>
            </div>

          </div>

        </div>
      </Reveal>

      <Reveal delay={0.08}>
        <GlassCard className="full-timetable">

          <div className="section-header">

            <div>
              <span className="eyebrow-small">
                WEEKLY BOARD
              </span>

              <h2>
                Current schedule
              </h2>
            </div>

            <div className="board-note">
              {conflictCount > 0 ? (
                <>
                  <AlertTriangle size={14} />
                  {conflictCount} conflict
                  {conflictCount === 1
                    ? ""
                    : "s"} detected
                </>
              ) : (
                <>
                  <CheckCircle2 size={14} />
                  No active conflicts
                </>
              )}
            </div>

          </div>

          <TimetableBoard
            entries={entries}
            loading={loading}
          />

        </GlassCard>
      </Reveal>

      <Reveal delay={0.14}>
        <section className="timetable-footer-callout">

          <div className="timetable-footer-icon">
            <BrainCircuit size={24} />
          </div>

          <div>
            <span className="eyebrow-small">
              ORBIT
            </span>

            <h2>
              A conflict is not the end of the schedule.
            </h2>

            <p>
              ORBIT can analyse the current constraint
              space, make real scheduling decisions and
              verify the resulting timetable.
            </p>
          </div>

          <Link
            className="button-primary"
            to="/solver"
          >
            Open solver
            <ArrowRight size={16} />
          </Link>

        </section>
      </Reveal>

    </Reveal>
  );
}

function CalendarIcon() {
  return (
    <div className="status-calendar-icon">
      <span />
      <span />
      <span />
      <span />
    </div>
  );
}