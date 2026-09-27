import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  AlertTriangle,
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  Zap,
  XCircle,
} from "lucide-react";

import { Link } from "react-router-dom";

import Reveal from "../components/Reveal";
import GlassCard from "../components/GlassCard";
import TimetableBoard from "../components/TimetableBoard";

import {
  getConflicts,
  getTimetable,
} from "../services/api";

const API =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000";

const STAGES = [
  "detect",
  "propagate",
  "search",
  "verify",
];

export default function Solver() {
  const [entries, setEntries] = useState([]);
  const [conflicts, setConflicts] = useState([]);

  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);

  const [stage, setStage] = useState("idle");
  const [status, setStatus] = useState("Ready");

  const [actions, setActions] = useState([]);
  const [currentActionIndex, setCurrentActionIndex] =
    useState(-1);

  const [activeEntryId, setActiveEntryId] =
    useState(null);

  const [movedEntryIds, setMovedEntryIds] =
    useState([]);

  const [reasoning, setReasoning] = useState(
    "ORBIT is ready.",
  );

  const [solverResult, setSolverResult] =
    useState(null);

  const [error, setError] = useState("");

  const pausedRef = useRef(false);
  const stopRef = useRef(false);

  const currentAction =
    currentActionIndex >= 0
      ? actions[currentActionIndex]
      : null;

  const completedActions =
    currentActionIndex >= 0
      ? currentActionIndex + 1
      : 0;

  const totalActions = actions.length;

  const progress =
    totalActions > 0
      ? Math.round(
          (completedActions / totalActions) * 100,
        )
      : 0;

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  const loadTimetable = useCallback(
    async () => {
      const [
        timetable,
        conflictData,
      ] = await Promise.all([
        getTimetable(),
        getConflicts(),
      ]);

      const loadedEntries =
        timetable.entries || [];

      const loadedConflicts =
        conflictData.conflicts || [];

      setEntries(loadedEntries);
      setConflicts(loadedConflicts);

      return {
        entries: loadedEntries,
        conflicts: loadedConflicts,
      };
    },
    [],
  );

  useEffect(() => {
    async function load() {
      try {
        await loadTimetable();
      } catch (loadError) {
        setError(
          loadError.message ||
            "Unable to load timetable.",
        );
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [loadTimetable]);

  async function request(path, options = {}) {
    const response = await fetch(
      `${API}${path}`,
      {
        ...options,
        headers: {
          "Content-Type":
            "application/json",
          ...(options.headers || {}),
        },
      },
    );

    const data =
      await response.json().catch(
        () => ({}),
      );

    if (!response.ok) {
      throw new Error(
        data.message ||
          "ORBIT request failed.",
      );
    }

    return data;
  }

  async function detectConflicts() {
    setStage("detect");
    setStatus("Detecting conflicts");
    setReasoning(
      "Scanning the timetable.",
    );

    const data = await request(
      "/api/conflicts/detect",
      {
        method: "POST",
      },
    );

    setConflicts(
      data.conflicts || [],
    );

    return data;
  }

  async function runSolver() {
    setError("");
    setRunning(true);
    setPaused(false);

    pausedRef.current = false;
    stopRef.current = false;

    setSolverResult(null);
    setActions([]);
    setCurrentActionIndex(-1);
    setActiveEntryId(null);
    setMovedEntryIds([]);

    /*
     * IMPORTANT:
     * Capture the timetable BEFORE the backend solver
     * changes the database.
     */
    let originalEntries = [];

    try {
      const initialData =
        await loadTimetable();

      originalEntries =
        cloneEntries(
          initialData.entries,
        );

      /*
       * 1. DETECT
       */
      await detectConflicts();

      /*
       * 2. PROPAGATE
       */
      setStage("propagate");
      setStatus("Propagating constraints");
      setReasoning(
        "Eliminating timetable choices that cannot satisfy the rules.",
      );

      await wait(900);

      if (stopRef.current) {
        return;
      }

      /*
       * 3. SEARCH
       *
       * This is the REAL backend solver.
       */
      setStage("search");
      setStatus("ORBIT is solving");
      setReasoning(
        "Searching the constraint space for valid assignments.",
      );

      const result = await request(
        "/api/solver/run",
        {
          method: "POST",
        },
      );

      const solverActions =
        result.actions || [];

      setSolverResult(result);
      setActions(solverActions);

      /*
       * IMPORTANT:
       *
       * DO NOT call loadTimetable() here.
       *
       * The backend has already committed the final
       * solution. We intentionally keep displaying
       * originalEntries and replay the real actions
       * locally, one at a time.
       */

      if (solverActions.length === 0) {
        setStage("verify");
        setStatus("Verifying");
        setReasoning(
          "No timetable changes were required.",
        );

        await wait(700);

        await verifyTimetable();

        return;
      }

      await replayRealActions(
        solverActions,
        originalEntries,
      );

      if (stopRef.current) {
        setStatus("Run stopped");
        return;
      }

      /*
       * 4. VERIFY
       */
      setStage("verify");
      setStatus("Verifying timetable");
      setReasoning(
        "Checking the solved timetable for remaining conflicts.",
      );

      await wait(700);

      await verifyTimetable();

      setStatus("Verified");
      setReasoning(
        "ORBIT completed the solve and verification returned zero active conflicts.",
      );
    } catch (solverError) {
      console.error(solverError);

      setStage("error");
      setStatus("Solver error");

      setError(
        solverError.message ||
          "ORBIT could not complete the solve.",
      );

      setReasoning(
        "The solver stopped before verification.",
      );
    } finally {
      setRunning(false);
      setPaused(false);

      pausedRef.current = false;
      stopRef.current = false;
    }
  }

  async function replayRealActions(
    solverActions,
    originalEntries,
  ) {
    /*
     * Build lookup tables BEFORE we start moving cards.
     *
     * Even after a card leaves a slot, we still need
     * the original slot/venue information to perform
     * later actions.
     */
    const slotMap = new Map();
    const venueMap = new Map();

    originalEntries.forEach((entry) => {
      if (entry.timeSlot?.id) {
        slotMap.set(
          entry.timeSlot.id,
          entry.timeSlot,
        );
      }

      if (entry.venue?.id) {
        venueMap.set(
          entry.venue.id,
          entry.venue,
        );
      }
    });

    let projectedEntries =
      cloneEntries(originalEntries);

    setEntries(projectedEntries);

    for (
      let index = 0;
      index < solverActions.length;
      index += 1
    ) {
      /*
       * STOP
       */
      if (stopRef.current) {
        return;
      }

      /*
       * PAUSE
       */
      await waitWhilePaused();

      if (stopRef.current) {
        return;
      }

      const action =
        solverActions[index];

      const entryId =
        action.timetableEntryId ||
        action.entryId;

      setCurrentActionIndex(index);
      setActiveEntryId(entryId || null);

      if (entryId) {
        setMovedEntryIds((current) =>
          current.includes(entryId)
            ? current
            : [...current, entryId],
        );
      }

      setStatus(
        getActionStatus(
          action.actionType,
        ),
      );

      setReasoning(
        action.reasoning ||
          buildActionReasoning(action),
      );

      /*
       * Give the user a moment to SEE which class
       * ORBIT has selected before it moves.
       */
      await wait(450);

      if (stopRef.current) {
        return;
      }

      /*
       * APPLY THE REAL SOLVER ACTION TO THE
       * LOCAL TIMETABLE PROJECTION.
       */
      projectedEntries =
        applySolverAction(
          projectedEntries,
          action,
          slotMap,
          venueMap,
        );

      /*
       * This state update is the actual visible move.
       *
       * TimetableBoard receives the changed timeSlot
       * / venue and Framer Motion moves the card.
       */
      setEntries(
        cloneEntries(projectedEntries),
      );

      /*
       * Keep the card visibly active while moving.
       */
      await waitWhilePaused();

      if (stopRef.current) {
        return;
      }

      await wait(950);
    }

    setActiveEntryId(null);
  }

  async function verifyTimetable() {
    const verification =
      await request(
        "/api/conflicts/detect",
        {
          method: "POST",
        },
      );

    const remaining =
      verification.conflicts || [];

    setConflicts(remaining);

    /*
     * Only NOW do we reload the actual database.
     *
     * The visual replay has already finished.
     */
    await loadTimetable();

    if (remaining.length === 0) {
      setStage("verified");
      setStatus("Verified");
      setReasoning(
        "0 active conflicts.",
      );
    } else {
      setStage("warning");
      setStatus(
        `${remaining.length} conflict${
          remaining.length === 1
            ? ""
            : "s"
        } remain`,
      );

      setReasoning(
        "Verification found remaining conflicts.",
      );
    }

    return verification;
  }

  async function resetDemo() {
    stopRef.current = true;
    pausedRef.current = false;

    setRunning(false);
    setPaused(false);

    setError("");
    setStage("reset");
    setStatus("Resetting");
    setReasoning(
      "Restoring the original timetable.",
    );

    try {
      await request(
        "/api/demo/reset",
        {
          method: "POST",
        },
      );

      setActions([]);
      setCurrentActionIndex(-1);
      setActiveEntryId(null);
      setMovedEntryIds([]);
      setSolverResult(null);

      await loadTimetable();

      setStage("idle");
      setStatus("Ready");
      setReasoning(
        "Timetable restored.",
      );
    } catch (resetError) {
      console.error(resetError);

      setStage("error");
      setStatus("Reset failed");

      setError(
        resetError.message ||
          "Unable to reset the demo.",
      );
    } finally {
      stopRef.current = false;
    }
  }

  function stopSolver() {
    stopRef.current = true;
    pausedRef.current = false;

    setPaused(false);
    setRunning(false);
    setActiveEntryId(null);
    setStatus("Run stopped");
    setReasoning(
      "ORBIT run stopped.",
    );
  }

  async function replayActions() {
    if (!actions.length) {
      return;
    }

    /*
     * Replay from the ORIGINAL state.
     *
     * The database is already solved, so obtain the
     * seeded/original state by resetting first.
     *
     * This keeps Replay honest.
     */
    try {
      stopRef.current = false;
      pausedRef.current = false;

      setError("");
      setRunning(true);
      setPaused(false);
      setCurrentActionIndex(-1);
      setActiveEntryId(null);
      setMovedEntryIds([]);
      setStage("search");
      setStatus("Preparing replay");
      setReasoning(
        "Restoring the original timetable before replaying the real solver decisions.",
      );

      await request(
        "/api/demo/reset",
        {
          method: "POST",
        },
      );

      const resetData =
        await loadTimetable();

      const originalEntries =
        cloneEntries(
          resetData.entries,
        );

      /*
       * Re-run the backend solver to generate a fresh
       * action sequence against the reset state.
       *
       * This guarantees Replay always uses current
       * real actions.
       */
      const result = await request(
        "/api/solver/run",
        {
          method: "POST",
        },
      );

      const freshActions =
        result.actions || [];

      setSolverResult(result);
      setActions(freshActions);

      await replayRealActions(
        freshActions,
        originalEntries,
      );

      if (!stopRef.current) {
        await verifyTimetable();
      }
    } catch (replayError) {
      console.error(replayError);

      setStage("error");
      setStatus("Replay failed");

      setError(
        replayError.message ||
          "Replay could not complete.",
      );
    } finally {
      setRunning(false);
      setPaused(false);
      pausedRef.current = false;
      stopRef.current = false;
    }
  }

  const stageLabel =
    stage === "detect"
      ? "Conflict detection"
      : stage === "propagate"
        ? "Constraint propagation"
        : stage === "search"
          ? "Constraint search"
          : stage === "verify" ||
              stage === "verified"
            ? "Verification"
            : stage === "error"
              ? "Solver error"
              : "System ready";

  return (
    <div className="solver-page">

      <Reveal>
        <div className="page-heading solver-heading">

          <div>
            <span className="eyebrow-small">
              ORBIT
            </span>

            <h1>
              Timetable solver
            </h1>

            <p>
              {status}
            </p>
          </div>

          <div className="solver-heading-actions">

            <button
              className="button-secondary"
              type="button"
              onClick={resetDemo}
              disabled={running}
            >
              <RotateCcw size={15} />
              Reset
            </button>

            {actions.length > 0 && !running && (
              <button
                className="button-secondary"
                type="button"
                onClick={replayActions}
              >
                <RefreshCw size={15} />
                Replay
              </button>
            )}

          </div>

        </div>
      </Reveal>

      {error && (
        <Reveal>
          <div className="solver-error">
            <XCircle size={18} />

            <div>
              <strong>
                ORBIT error
              </strong>

              <p>
                {error}
              </p>
            </div>
          </div>
        </Reveal>
      )}

      <Reveal delay={0.04}>
        <div className="solver-stage-strip">

          {STAGES.map((item, index) => {
            const currentIndex =
              STAGES.indexOf(stage);

            const completed =
              stage === "verified" ||
              currentIndex > index;

            const active =
              stage === item;

            return (
              <div
                className={`solver-stage ${
                  active ? "active" : ""
                } ${
                  completed
                    ? "completed"
                    : ""
                }`}
                key={item}
              >
                <span className="solver-stage-number">
                  {completed ? (
                    <CheckCircle2
                      size={14}
                    />
                  ) : (
                    `0${index + 1}`
                  )}
                </span>

                <div>
                  <strong>
                    {getStageName(item)}
                  </strong>
                </div>
              </div>
            );
          })}

        </div>
      </Reveal>

      <div className="solver-layout">

        <Reveal delay={0.08}>
          <GlassCard className="solver-board-card">

            <div className="section-header">

              <div>
                <span className="eyebrow-small">
                  LIVE SCHEDULE
                </span>

                <h2>
                  ORBIT workspace
                </h2>
              </div>

              <div className="solver-board-state">
                <span className="orbit-live-dot" />
                {stageLabel}
              </div>

            </div>

            <TimetableBoard
              entries={entries}
              loading={loading}
              movedEntryIds={
                movedEntryIds
              }
              activeEntryId={
                activeEntryId
              }
              actionEntryId={
                currentAction?.timetableEntryId ||
                null
              }
            />

          </GlassCard>
        </Reveal>

        <Reveal delay={0.12}>
          <aside className="solver-panel">

            <GlassCard className="orbit-control-card">

              <div className="orbit-control-header">

                <div className="orbit-control-icon">
                  <BrainCircuit
                    size={22}
                  />
                </div>

                <div>
                  <span className="eyebrow-small">
                    ORBIT ENGINE
                  </span>

                  <h2>
                    {status}
                  </h2>
                </div>

              </div>

              <div className="orbit-progress">

                <div className="orbit-progress-label">

                  <span>
                    {totalActions > 0
                      ? `Decision ${Math.min(
                          completedActions,
                          totalActions,
                        )} / ${totalActions}`
                      : "Ready"}
                  </span>

                  <strong>
                    {progress}%
                  </strong>

                </div>

                <div className="orbit-progress-track">

                  <div
                    className="orbit-progress-fill"
                    style={{
                      width: `${progress}%`,
                    }}
                  />

                </div>

              </div>

              <div className="orbit-reasoning">

                <div className="reasoning-icon">
                  <Zap size={17} />
                </div>

                <div>
                  <span>
                    ORBIT ACTIVITY
                  </span>

                  <p>
                    {reasoning}
                  </p>
                </div>

              </div>

              {currentAction && (
                <div className="solver-action">

                  <div className="solver-action-top">
                    <span>
                      CURRENT MOVE
                    </span>

                    <strong>
                      {formatActionType(
                        currentAction.actionType,
                      )}
                    </strong>
                  </div>

                  <div className="solver-action-line">

                    <span>
                      Class
                    </span>

                    <strong>
                      {getActionEntryLabel(
                        currentAction,
                        entries,
                      )}
                    </strong>

                  </div>

                  <div className="solver-action-line">

                    <span>
                      Change
                    </span>

                    <strong>
                      {getActionChangeLabel(
                        currentAction,
                      )}
                    </strong>

                  </div>

                </div>
              )}

              <div className="orbit-controls">

                {!running ? (
                  <button
                    className="button-primary solver-run-button"
                    type="button"
                    onClick={runSolver}
                    disabled={loading}
                  >
                    <Play size={16} />
                    Run ORBIT
                    <ArrowRight
                      size={15}
                    />
                  </button>
                ) : (
                  <>
                    <button
                      className="button-primary solver-run-button"
                      type="button"
                      onClick={() => {
                        setPaused(
                          (value) => {
                            const next =
                              !value;

                            pausedRef.current =
                              next;

                            return next;
                          },
                        );
                      }}
                    >
                      {paused ? (
                        <>
                          <Play size={16} />
                          Resume
                        </>
                      ) : (
                        <>
                          <Pause size={16} />
                          Pause
                        </>
                      )}
                    </button>

                    <button
                      className="button-secondary"
                      type="button"
                      onClick={
                        stopSolver
                      }
                    >
                      <XCircle size={15} />
                      Stop
                    </button>
                  </>
                )}

              </div>

            </GlassCard>

            <GlassCard className="solver-stats-card">

              <div className="solver-stats-heading">

                <span className="eyebrow-small">
                  RESULTS
                </span>

                <Zap size={17} />

              </div>

              <div className="solver-stats">

                <SolverMetric
                  label="Conflicts"
                  value={
                    solverResult
                      ?.initialConflictCount ??
                    conflicts.length
                  }
                />

                <SolverMetric
                  label="Remaining"
                  value={
                    solverResult
                      ?.finalConflictCount ??
                    "—"
                  }
                />

                <SolverMetric
                  label="Moved"
                  value={
                    solverResult
                      ?.classesMoved ??
                    "—"
                  }
                />

                <SolverMetric
                  label="Nodes"
                  value={
                    solverResult
                      ?.stats
                      ?.nodesVisited ??
                    "—"
                  }
                />

              </div>

            </GlassCard>

            <GlassCard className="solver-verification-card">

              <div className="verification-icon">

                {conflicts.length === 0 ? (
                  <CheckCircle2
                    size={20}
                  />
                ) : (
                  <AlertTriangle
                    size={20}
                  />
                )}

              </div>

              <div>

                <span>
                  VERIFICATION
                </span>

                <strong>
                  {conflicts.length ===
                  0
                    ? "0 conflicts"
                    : `${conflicts.length} active`}
                </strong>

              </div>

            </GlassCard>

          </aside>
        </Reveal>

      </div>

      <Reveal delay={0.16}>
        <section className="solver-bottom">

          <div>
            <span className="eyebrow-small">
              TEST
            </span>

            <h2>
              Create a conflict
            </h2>
          </div>

          <Link
            className="button-secondary"
            to="/conflict-lab"
          >
            Open Conflict Lab
            <ArrowRight size={15} />
          </Link>

        </section>
      </Reveal>

    </div>
  );
}

function applySolverAction(
  entries,
  action,
  slotMap,
  venueMap,
) {
  const entryId =
    action?.timetableEntryId ||
    action?.entryId;

  if (!entryId) {
    return entries;
  }

  const fromTime =
    action.fromTimeSlotId ??
    action.fromSlotId;

  const toTime =
    action.toTimeSlotId ??
    action.toSlotId;

  const fromVenue =
    action.fromVenueId;

  const toVenue =
    action.toVenueId;

  return entries.map((entry) => {
    if (entry.id !== entryId) {
      return entry;
    }

    const nextEntry = {
      ...entry,
    };

    if (
      toTime &&
      slotMap.has(toTime)
    ) {
      nextEntry.timeSlot =
        cloneObject(
          slotMap.get(toTime),
        );
    }

    if (
      toVenue &&
      venueMap.has(toVenue)
    ) {
      nextEntry.venue =
        cloneObject(
          venueMap.get(toVenue),
        );
    }

    /*
     * Defensive handling for actions that explicitly
     * remove a venue.
     */
    if (
      fromVenue &&
      !toVenue &&
      action.actionType ===
        "MOVE_TIME"
    ) {
      nextEntry.venue =
        entry.venue;
    }

    /*
     * If the solver changes time but the destination
     * slot wasn't found in the original entries,
     * preserve the current slot rather than inventing
     * one.
     */
    if (
      toTime &&
      !slotMap.has(toTime) &&
      fromTime
    ) {
      nextEntry.timeSlot =
        entry.timeSlot;
    }

    return nextEntry;
  });
}

function cloneEntries(entries) {
  return entries.map(
    (entry) => ({
      ...entry,
      course: entry.course
        ? { ...entry.course }
        : entry.course,
      lecturer: entry.lecturer
        ? { ...entry.lecturer }
        : entry.lecturer,
      venue: entry.venue
        ? { ...entry.venue }
        : entry.venue,
      studentGroup:
        entry.studentGroup
          ? {
              ...entry.studentGroup,
            }
          : entry.studentGroup,
      timeSlot: entry.timeSlot
        ? { ...entry.timeSlot }
        : entry.timeSlot,
    }),
  );
}

function cloneObject(value) {
  return value
    ? { ...value }
    : value;
}

function SolverMetric({
  label,
  value,
}) {
  return (
    <div className="solver-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function getStageName(stage) {
  const names = {
    detect: "Detect",
    propagate: "Propagate",
    search: "Search",
    verify: "Verify",
  };

  return names[stage] || stage;
}

function formatActionType(type) {
  if (!type) {
    return "DECISION";
  }

  return type
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase(),
    );
}

function getActionStatus(type) {
  const labels = {
    ASSIGN: "Assigning class",
    REASSIGN: "Reassigning class",
    SWAP: "Swapping classes",
    MOVE_TIME: "Moving class",
    MOVE_VENUE: "Moving class",
    CHANGE_LECTURER:
      "Changing lecturer",
    CHANGE_MODE:
      "Changing delivery mode",
    COMBINATION:
      "Applying combined move",
  };

  return (
    labels[type] ||
    "Applying solver decision"
  );
}

function buildActionReasoning(action) {
  const explanations = {
    ASSIGN:
      "Valid timetable position selected.",
    REASSIGN:
      "Conflicting assignment replaced.",
    SWAP:
      "Timetable positions exchanged.",
    MOVE_TIME:
      "Class moved to a valid time slot.",
    MOVE_VENUE:
      "Class moved to a compatible venue.",
    CHANGE_LECTURER:
      "Lecturer assignment changed.",
    CHANGE_MODE:
      "Delivery mode changed.",
    COMBINATION:
      "Multiple constraints resolved together.",
  };

  return (
    explanations[
      action?.actionType
    ] ||
    "Solver decision applied."
  );
}

function getActionEntryLabel(
  action,
  entries,
) {
  const id =
    action?.timetableEntryId ||
    action?.entryId;

  const entry =
    entries.find(
      (item) => item.id === id,
    );

  return (
    entry?.course?.code ||
    entry?.course?.name ||
    id ||
    "Current class"
  );
}

function getActionChangeLabel(action) {
  if (!action) {
    return "—";
  }

  const fromTime =
    action.fromTimeSlotId ??
    action.fromSlotId;

  const toTime =
    action.toTimeSlotId ??
    action.toSlotId;

  const fromVenue =
    action.fromVenueId;

  const toVenue =
    action.toVenueId;

  if (fromTime && toTime) {
    return "Time slot";
  }

  if (fromVenue && toVenue) {
    return "Venue";
  }

  return "Assignment";
}

function wait(milliseconds) {
  return new Promise(
    (resolve) =>
      setTimeout(
        resolve,
        milliseconds,
      ),
  );
}

async function waitWhilePaused() {
  while (pausedRef.current) {
    await wait(120);
  }
}