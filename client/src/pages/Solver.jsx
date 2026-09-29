import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

import * as api from "../services/api";
import { getConflicts, getTimetable } from "../services/api";
import {
  detectLocalConflicts,
  diagnoseUnit,
  setStrictTime,
  solveLocally,
  slotLabel,
} from "../utils/localSolver";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

const STAGES = ["detect", "propagate", "search", "verify"];

const TIME_SLOT_PATHS = [
  "/api/time-slots",
  "/api/timeslots",
  "/api/timetable/time-slots",
];
const VENUE_PATHS = ["/api/venues", "/api/timetable/venues"];

export default function Solver() {
  const [entries, setEntries] = useState([]);
  const [conflicts, setConflicts] = useState([]);

  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);

  const [stage, setStage] = useState("idle");
  const [status, setStatus] = useState("Ready");

  const [actions, setActions] = useState([]);
  const [currentActionIndex, setCurrentActionIndex] = useState(-1);

  const [activeEntryId, setActiveEntryId] = useState(null);
  const [movedEntryIds, setMovedEntryIds] = useState([]);

  const [reasoning, setReasoning] = useState("ORBIT is ready.");
  const [solverResult, setSolverResult] = useState(null);
  const [error, setError] = useState("");
  const [originalEntries, setOriginalEntries] = useState([]);

  const [strictTime, setStrictTimeState] = useState(true);
  const [reference, setReference] = useState({ timeSlots: [], venues: [] });
  const [notice, setNotice] = useState("");
  const [fixingId, setFixingId] = useState(null);

  const pausedRef = useRef(false);
  const stopRef = useRef(false);

  /* Keep the checker in step with the toggle before anything is computed. */
  setStrictTime(strictTime);

  const liveConflicts = useMemo(
    () => detectLocalConflicts(entries),
    [entries, strictTime],
  );

  const currentAction =
    currentActionIndex >= 0 ? actions[currentActionIndex] : null;

  const completedActions = currentActionIndex >= 0 ? currentActionIndex + 1 : 0;
  const totalActions = actions.length;
  const progress =
    totalActions > 0 ? Math.round((completedActions / totalActions) * 100) : 0;

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  const waitWhilePaused = useCallback(async () => {
    while (pausedRef.current && !stopRef.current) {
      await wait(120);
    }
  }, []);

  async function request(path, options = {}) {
    const response = await fetch(`${API}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || "ORBIT request failed.");
    }

    return data;
  }

  async function fetchFirstList(paths, keys) {
    for (const path of paths) {
      try {
        const data = await request(path);
        const list = Array.isArray(data)
          ? data
          : keys.map((key) => data[key]).find(Array.isArray);
        if (list && list.length > 0) return list;
      } catch {
        /* try the next path */
      }
    }
    return [];
  }

  const loadTimetable = useCallback(async () => {
    const [timetable, conflictData] = await Promise.all([
      getTimetable(),
      getConflicts().catch(() => ({ conflicts: [] })),
    ]);

    const loadedEntries = timetable.entries || [];
    const loadedConflicts = conflictData.conflicts || [];

    setEntries(loadedEntries);
    setConflicts(loadedConflicts);

    return {
      entries: loadedEntries,
      conflicts: loadedConflicts,
      timeSlots: timetable.timeSlots || [],
      venues: timetable.venues || [],
    };
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const loaded = await loadTimetable();
        setReference(await loadReferenceData(loaded));
      } catch (loadError) {
        console.error(loadError);
        setError(loadError.message || "Unable to load timetable.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [loadTimetable]);

  /*
   * Every time slot and venue the solver may use. The server list is
   * preferred; anything already used by a class is merged in so the
   * fallback solver always has something to work with.
   */
  async function discoverFromApi(pattern) {
    const blocked = /^(create|update|delete|add|remove|save|post|put|patch|reset|run|solve|apply)/i;

    for (const [name, fn] of Object.entries(api)) {
      if (typeof fn !== "function" || !pattern.test(name)) continue;
      if (blocked.test(name) || fn.length > 0) continue;

      try {
        const data = await fn();
        const list = Array.isArray(data)
          ? data
          : ["timeSlots", "slots", "venues", "data", "items"]
              .map((key) => data?.[key])
              .find(Array.isArray);
        if (list && list.length > 0) return list;
      } catch {
        /* try the next helper */
      }
    }

    return [];
  }

  /*
   * Every time slot and venue the solver may use, gathered from all
   * sources and merged, so free slots are never missed.
   */
  async function loadReferenceData(loaded) {
    let timeSlots = mergeById([], loaded.timeSlots);
    let venues = mergeById([], loaded.venues);

    timeSlots = mergeById(timeSlots, await discoverFromApi(/slot/i));
    venues = mergeById(venues, await discoverFromApi(/venue/i));

    try {
      const data = await request("/api/solver/reference");
      timeSlots = mergeById(timeSlots, data.timeSlots);
      venues = mergeById(venues, data.venues);
    } catch {
      /* route not mounted yet */
    }

    if (timeSlots.length < 2) {
      timeSlots = mergeById(
        timeSlots,
        await fetchFirstList(TIME_SLOT_PATHS, ["timeSlots", "slots"]),
      );
    }
    if (venues.length < 2) {
      venues = mergeById(
        venues,
        await fetchFirstList(VENUE_PATHS, ["venues"]),
      );
    }

    loaded.entries.forEach((entry) => {
      if (entry.timeSlot?.id) {
        timeSlots = mergeById(timeSlots, [entry.timeSlot]);
      }
      if (entry.venue?.id) {
        venues = mergeById(venues, [entry.venue]);
      }
    });

    return { timeSlots, venues };
  }

  async function persistMoves(moves) {
    if (moves.length === 0) return true;

    try {
      await request("/api/solver/apply", {
        method: "POST",
        body: JSON.stringify({
          moves: moves.map((move) => ({
            timetableEntryId: move.timetableEntryId,
            timeSlotId: move.toTimeSlotId,
            venueId: move.toVenueId ?? null,
          })),
        }),
      });
      return true;
    } catch (applyError) {
      console.warn("Bulk save failed, trying per-class save:", applyError);
    }

    for (const move of moves) {
      const body = JSON.stringify({
        timeSlotId: move.toTimeSlotId,
        venueId: move.toVenueId ?? null,
      });
      let saved = false;

      for (const method of ["PATCH", "PUT"]) {
        try {
          await request(`/api/timetable/${move.timetableEntryId}`, {
            method,
            body,
          });
          saved = true;
          break;
        } catch {
          /* try the next method */
        }
      }

      if (!saved) return false;
    }
    return true;
  }

  async function solveUnit(entryId) {
    if (running || !entryId) return;

    setError("");
    setNotice("");
    setFixingId(entryId);
    setRunning(true);
    setPaused(false);
    pausedRef.current = false;
    stopRef.current = false;

    setSolverResult(null);
    setActions([]);
    setCurrentActionIndex(-1);
    setActiveEntryId(null);
    setMovedEntryIds([]);

    try {
      const before = cloneEntries(entries);
      setOriginalEntries(before);

      const ref = await loadReferenceData({
        entries: before,
        timeSlots: [],
        venues: [],
      });
      setReference(ref);

      const unitCode =
        before.find((item) => item.id === entryId)?.course?.code || "This unit";

      setStage("search");
      setStatus("Solving unit");
      setReasoning("Finding a free slot where this unit clashes with nothing.");

      const result = solveLocally({
        entries: before,
        timeSlots: ref.timeSlots,
        venues: ref.venues,
        focusIds: [entryId],
        maxNodes: 25000,
        maxMillis: 8000,
      });

      if (result.actions.length === 0) {
        setStage("warning");
        setStatus("No free place found");
        const detail = diagnoseUnit({
          entries: before,
          entryId,
          timeSlots: ref.timeSlots,
          venues: ref.venues,
        });
        const message = `No free place found for ${unitCode}. ${detail}`;
        setReasoning(message);
        setNotice(message);
        return;
      }

      setActions(result.actions);

      const working = await replayRealActions(result.actions, before, ref, 0);
      if (stopRef.current) {
        setStatus("Run stopped");
        return;
      }

      const saved = await persistMoves(result.actions);

      let finalEntries = working;
      if (saved) {
        request("/api/conflicts/detect", { method: "POST" }).catch(() => {});
        try {
          finalEntries = (await loadTimetable()).entries;
        } catch (reloadError) {
          console.warn("Reload after solve failed:", reloadError);
        }
      }

      setEntries(cloneEntries(finalEntries));

      const remaining = detectLocalConflicts(finalEntries);
      setSolverResult({
        initialConflictCount: liveConflicts.length,
        finalConflictCount: remaining.length,
        classesMoved: result.actions.length,
        stats: { nodesVisited: result.stats.nodesVisited },
      });

      setStage(remaining.length === 0 ? "verified" : "warning");
      setStatus(remaining.length === 0 ? "Unit solved" : "Unit moved");
      setReasoning(
        saved
          ? result.actions[0].reasoning
          : "The unit was moved on screen but the server did not accept the change.",
      );
      if (!saved) {
        setError(
          "The move could not be saved. Add the /api/solver/apply route to the server.",
        );
      }
      setNotice(
        saved
          ? result.actions[0].reasoning
          : `${result.actions[0].reasoning} It was not saved to the server.`,
      );
    } catch (unitError) {
      console.error(unitError);
      setStage("error");
      setStatus("Solver error");
      setError(unitError.message || "Could not solve this unit.");
      setNotice(unitError.message || "Could not solve this unit.");
    } finally {
      setFixingId(null);
      setRunning(false);
      setPaused(false);
      pausedRef.current = false;
      stopRef.current = false;
    }
  }

  async function runSolver() {
    if (running) {
      return;
    }

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

    try {
      /*
       * Capture the timetable before anything changes it.
       */
      const initialData = await loadTimetable();
      const snapshot = cloneEntries(initialData.entries);
      setOriginalEntries(snapshot);

      const reference = await loadReferenceData(initialData);

      /*
       * 1. DETECT
       * The browser scan is the source of truth, so a server that
       * misses a clash cannot hide it.
       */
      setStage("detect");
      setStatus("Detecting conflicts");
      setReasoning(
        "Scanning the timetable for lecturer, venue and student-group clashes.",
      );

      const localBefore = detectLocalConflicts(snapshot);

      let serverConflicts = [];
      try {
        const data = await request("/api/conflicts/detect", { method: "POST" });
        serverConflicts = data.conflicts || [];
      } catch (detectError) {
        console.warn("Server conflict scan failed:", detectError);
      }

      const initialCount = Math.max(localBefore.length, serverConflicts.length);
      setConflicts(
        localBefore.length >= serverConflicts.length
          ? localBefore
          : serverConflicts,
      );

      await wait(600);
      if (stopRef.current) return;

      /*
       * 2. PROPAGATE
       */
      setStage("propagate");
      setStatus("Propagating constraints");
      setReasoning(
        "Eliminating timetable choices that cannot satisfy the scheduling constraints.",
      );

      await wait(900);
      if (stopRef.current) return;

      /*
       * 3. SEARCH
       * Server solver first. If it fails, or leaves clashes behind,
       * the same solver runs in the browser.
       */
      setStage("search");
      setStatus("ORBIT is solving");
      setReasoning(
        "Searching the constraint space for valid timetable assignments.",
      );

      let serverResult = null;
      let serverActions = [];

      try {
        const result = await request("/api/solver/run", { method: "POST" });
        if (result.status === "COMPLETED") {
          serverResult = result;
          serverActions = result.actions || [];
        } else {
          console.warn("Server solver did not complete:", result.status);
        }
      } catch (serverError) {
        console.warn("Server solver failed:", serverError);
      }

      let working = snapshot;
      let allActions = [];

      if (serverActions.length > 0) {
        setSolverResult(serverResult);
        setActions(serverActions);

        const merged = {
          timeSlots: mergeById(reference.timeSlots, serverResult?.timeSlots),
          venues: mergeById(reference.venues, serverResult?.venues),
        };
        reference.timeSlots = merged.timeSlots;
        reference.venues = merged.venues;

        working = await replayRealActions(serverActions, working, reference, 0);
        allActions = serverActions;
      }

      if (stopRef.current) {
        setStatus("Run stopped");
        return;
      }

      let localResult = null;
      let saved = true;

      const leftover = detectLocalConflicts(working);

      if (leftover.length > 0) {
        setStage("search");
        setStatus("ORBIT is solving");
        setReasoning(
          serverActions.length > 0
            ? "The server left clashes behind. ORBIT is resolving them directly."
            : "The server solver could not resolve the clashes. ORBIT is solving directly.",
        );

        await wait(500);

        localResult = solveLocally({
          entries: working,
          timeSlots: reference.timeSlots,
          venues: reference.venues,
          maxNodes: 25000,
          maxMillis: 8000,
        });

        if (localResult.actions.length > 0) {
          const combined = [...allActions, ...localResult.actions];
          setActions(combined);

          working = await replayRealActions(
            localResult.actions,
            working,
            reference,
            allActions.length,
          );

          allActions = combined;

          if (!stopRef.current) {
            saved = await persistMoves(localResult.actions);
          }
        }
      }

      if (stopRef.current) {
        setStatus("Run stopped");
        return;
      }

      /*
       * 4. VERIFY
       */
      setStage("verify");
      setStatus("Verifying timetable");
      setReasoning("Checking the solved timetable for remaining conflicts.");

      await wait(700);

      let finalEntries = working;

      if (saved) {
        request("/api/conflicts/detect", { method: "POST" }).catch(() => {});
        try {
          const finalData = await loadTimetable();
          finalEntries = finalData.entries;
        } catch (reloadError) {
          console.warn("Reload after solve failed:", reloadError);
        }
      }

      const remaining = detectLocalConflicts(finalEntries);

      setEntries(cloneEntries(finalEntries));
      setConflicts(remaining);

      setSolverResult({
        ...(serverResult || {}),
        initialConflictCount: initialCount,
        finalConflictCount: remaining.length,
        classesMoved: allActions.length,
        stats: {
          nodesVisited:
            (serverResult?.stats?.nodesVisited || 0) +
            (localResult?.stats?.nodesVisited || 0),
        },
      });

      if (remaining.length === 0) {
        setStage("verified");
        setStatus("Verified");
        setReasoning(
          initialCount === 0
            ? "The timetable was already conflict-free."
            : saved
              ? "0 active conflicts. No class shares a lecturer, venue or student group at the same time."
              : "0 active conflicts on screen, but the changes could not be saved to the server.",
        );
        if (!saved) {
          setError(
            "The new timetable is conflict-free but the server did not accept the saved changes.",
          );
        }
      } else {
        setStage("warning");
        setStatus(
          `${remaining.length} conflict${remaining.length === 1 ? "" : "s"} remain`,
        );
        setReasoning(
          "No arrangement fits every rule with the current lecturers, venues and time slots. Add a venue or free a time slot and run again.",
        );
      }
    } catch (solverError) {
      console.error(solverError);

      setStage("error");
      setStatus("Solver error");
      setError(solverError.message || "ORBIT could not complete the solve.");
      setReasoning("The solver stopped before verification.");
    } finally {
      setRunning(false);
      setPaused(false);

      pausedRef.current = false;
      stopRef.current = false;
    }
  }

  async function replayRealActions(solverActions, beforeEntries, reference, offset) {
    const slotMap = new Map();
    const venueMap = new Map();
    const lecturerMap = new Map();

    (reference?.timeSlots || []).forEach((slot) => slotMap.set(slot.id, slot));
    (reference?.venues || []).forEach((venue) => venueMap.set(venue.id, venue));

    beforeEntries.forEach((entry) => {
      if (entry.timeSlot?.id && !slotMap.has(entry.timeSlot.id)) {
        slotMap.set(entry.timeSlot.id, entry.timeSlot);
      }
      if (entry.venue?.id && !venueMap.has(entry.venue.id)) {
        venueMap.set(entry.venue.id, entry.venue);
      }
      if (entry.lecturer?.id) {
        lecturerMap.set(entry.lecturer.id, entry.lecturer);
      }
    });

    let projectedEntries = cloneEntries(beforeEntries);
    setEntries(cloneEntries(projectedEntries));

    for (let index = 0; index < solverActions.length; index += 1) {
      if (stopRef.current) return projectedEntries;

      await waitWhilePaused();
      if (stopRef.current) return projectedEntries;

      const action = solverActions[index];
      const entryId = action?.timetableEntryId || action?.entryId;

      setCurrentActionIndex(offset + index);
      setActiveEntryId(entryId || null);

      if (entryId) {
        setMovedEntryIds((current) =>
          current.includes(entryId) ? current : [...current, entryId],
        );
      }

      setStatus(getActionStatus(action?.actionType));
      setReasoning(action?.reasoning || buildActionReasoning(action));

      await wait(550);
      if (stopRef.current) return projectedEntries;

      projectedEntries = applySolverAction(
        projectedEntries,
        action,
        slotMap,
        venueMap,
        lecturerMap,
      );

      setEntries(cloneEntries(projectedEntries));

      await waitWhilePaused();
      if (stopRef.current) return projectedEntries;

      await wait(1100);
    }

    setActiveEntryId(null);
    return projectedEntries;
  }

  async function resetDemo() {
    stopRef.current = true;
    pausedRef.current = false;

    setRunning(false);
    setPaused(false);

    setError("");
    setStage("reset");
    setStatus("Resetting");
    setReasoning("Restoring the original timetable.");

    try {
      await request("/api/demo/reset", { method: "POST" });

      setActions([]);
      setCurrentActionIndex(-1);
      setActiveEntryId(null);
      setMovedEntryIds([]);
      setSolverResult(null);
      setOriginalEntries([]);

      await loadTimetable();

      setStage("idle");
      setStatus("Ready");
      setReasoning("Timetable restored. Create a conflict or run ORBIT.");
    } catch (resetError) {
      console.error(resetError);

      setStage("error");
      setStatus("Reset failed");
      setError(resetError.message || "Unable to reset the demo.");
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
    setReasoning("ORBIT run stopped.");
  }

  async function replayActions() {
    if (running) {
      return;
    }

    try {
      await request("/api/demo/reset", { method: "POST" });
    } catch (resetError) {
      console.error(resetError);
      setError("Could not restore the original timetable for the replay.");
      return;
    }

    await runSolver();
  }

  const stageLabel =
    stage === "detect"
      ? "Conflict detection"
      : stage === "propagate"
        ? "Constraint propagation"
        : stage === "search"
          ? "Constraint search"
          : stage === "verify" || stage === "verified"
            ? "Verification"
            : stage === "warning"
              ? "Conflicts remaining"
              : stage === "error"
                ? "Solver error"
                : "System ready";

  const stageDescription =
    stage === "detect"
      ? "Scanning venues, lecturers, student groups and timetable constraints."
      : stage === "propagate"
        ? "Removing assignments that cannot satisfy the university schedule."
        : stage === "search"
          ? "Comparing valid alternatives and applying the solver decisions."
          : stage === "verify" || stage === "verified"
            ? "Checking the resulting timetable for remaining conflicts."
            : stage === "warning"
              ? "Some classes could not be placed without a clash."
              : "Run ORBIT to visualize each real solver decision.";

  return (
    <div className="solver-page" data-page="solver">
      <Reveal>
        <div className="page-heading solver-heading">
          <div>
            <span className="eyebrow-small">ORBIT</span>

            <h1>Timetable solver</h1>

            <p aria-live="polite">{status}</p>
          </div>

          <div className="solver-heading-actions">
            <button
              className="button-secondary"
              type="button"
              onClick={resetDemo}
              disabled={running}
              title="Reset the timetable to its original state"
            >
              <RotateCcw size={15} />
              Reset
            </button>

            {actions.length > 0 && !running && (
              <button
                className="button-secondary"
                type="button"
                onClick={replayActions}
                title="Replay the solver decisions"
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
              <strong>ORBIT error</strong>

              <p>{error}</p>
            </div>
          </div>
        </Reveal>
      )}

      <Reveal delay={0.04}>
        <div className="solver-stage-strip" aria-label="Solver progress">
          {STAGES.map((item, index) => {
            const currentIndex = STAGES.indexOf(stage);

            const completed = stage === "verified" || currentIndex > index;

            const active = stage === item;

            return (
              <div
                className={`solver-stage ${active ? "active" : ""} ${
                  completed ? "completed" : ""
                }`}
                key={item}
              >
                <span className="solver-stage-number">
                  {completed ? <CheckCircle2 size={14} /> : `0${index + 1}`}
                </span>

                <div>
                  <strong>{getStageName(item)}</strong>
                </div>
              </div>
            );
          })}
        </div>
      </Reveal>

      <Reveal delay={0.06}>
        <div className="solver-stage-context" aria-live="polite">
          <span className="solver-context-icon">
            <BrainCircuit size={16} />
          </span>
          <div>
            <strong>{stageLabel}</strong>
            <span>{stageDescription}</span>
          </div>
          <span
            className={`solver-context-status ${running ? "is-running" : ""}`}
          >
            {running ? "Processing" : "Ready"}
          </span>
        </div>
      </Reveal>

      <div className="solver-layout">
        <Reveal delay={0.08}>
          <GlassCard className="solver-board-card">
            <div className="section-header">
              <div>
                <span className="eyebrow-small">LIVE SCHEDULE</span>

                <h2>ORBIT workspace</h2>
              </div>

              <div className="solver-board-state">
                <span className="orbit-live-dot" />
                {stageLabel}
              </div>
            </div>

            <TimetableBoard
              entries={entries}
              loading={loading}
              movedEntryIds={movedEntryIds}
              activeEntryId={activeEntryId}
              actionEntryId={currentAction?.timetableEntryId || null}
              onEntryClick={(entry) => solveUnit(entry?.id || entry)}
              onSelectEntry={(entry) => solveUnit(entry?.id || entry)}
            />
          </GlassCard>
        </Reveal>

        <Reveal delay={0.12}>
          <aside className="solver-panel">
            <GlassCard className="orbit-control-card">
              <div className="orbit-control-header">
                <div className="orbit-control-icon">
                  <BrainCircuit size={22} />
                </div>

                <div>
                  <span className="eyebrow-small">ORBIT ENGINE</span>

                  <h2>{status}</h2>
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

                  <strong>{progress}%</strong>
                </div>

                <div className="orbit-progress-track">
                  <div
                    className="orbit-progress-fill"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              <div className="orbit-reasoning">
                <div className="reasoning-icon">
                  <Zap size={17} />
                </div>

                <div>
                  <span>ORBIT ACTIVITY</span>

                  <p>{reasoning}</p>
                </div>
              </div>

              <div className={`orbit-telemetry ${running ? "is-running" : ""}`}>
                <span className="telemetry-pulse" />
                <div>
                  <strong>
                    {running ? "LIVE SOLVER STREAM" : "SOLVER STANDBY"}
                  </strong>
                  <span>
                    {running
                      ? "Projecting real decisions onto the timetable."
                      : "Ready for a solver run."}
                  </span>
                </div>
              </div>

              {currentAction && (
                <div className="solver-action">
                  <div className="solver-action-top">
                    <span>CURRENT MOVE</span>

                    <strong>
                      {formatActionType(currentAction.actionType)}
                    </strong>
                  </div>

                  <div className="solver-action-line">
                    <span>Class</span>

                    <strong>
                      {getActionEntryLabel(currentAction, originalEntries)}
                    </strong>
                  </div>

                  <div className="solver-action-line">
                    <span>Change</span>

                    <strong>
                      {getActionChangeLabel(currentAction, originalEntries)}
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
                    title="Start the ORBIT solver"
                  >
                    <Play size={16} />
                    Run ORBIT
                    <ArrowRight size={15} />
                  </button>
                ) : (
                  <>
                    <button
                      className="button-primary solver-run-button"
                      type="button"
                      onClick={() => {
                        const next = !paused;

                        pausedRef.current = next;
                        setPaused(next);
                        setStatus(next ? "ORBIT paused" : "ORBIT is solving");
                      }}
                      title={paused ? "Resume solver" : "Pause solver"}
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
                      onClick={stopSolver}
                      title="Stop the solver"
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
                <span className="eyebrow-small">RESULTS</span>

                <Zap size={17} />
              </div>

              <div className="solver-stats">
                <SolverMetric
                  label="Conflicts"
                  value={solverResult?.initialConflictCount ?? liveConflicts.length}
                />

                <SolverMetric
                  label="Remaining"
                  value={solverResult?.finalConflictCount ?? "—"}
                />

                <SolverMetric
                  label="Moved"
                  value={solverResult?.classesMoved ?? "—"}
                />

                <SolverMetric
                  label="Nodes"
                  value={solverResult?.stats?.nodesVisited ?? "—"}
                />
              </div>
            </GlassCard>

            <GlassCard className="solver-verification-card">
              <div className="verification-icon">
                {liveConflicts.length === 0 ? (
                  <CheckCircle2 size={20} />
                ) : (
                  <AlertTriangle size={20} />
                )}
              </div>

              <div>
                <span>VERIFICATION</span>

                <strong>
                  {liveConflicts.length === 0
                    ? "0 conflicts"
                    : `${liveConflicts.length} active`}
                </strong>
              </div>
            </GlassCard>

            <GlassCard className="solver-clash-card">
              <div className="solver-stats-heading">
                <span className="eyebrow-small">CLASHES</span>

                <AlertTriangle size={17} />
              </div>

              <label
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  margin: "8px 0 12px",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={strictTime}
                  onChange={(event) => setStrictTimeState(event.target.checked)}
                />
                <span>One unit per time slot</span>
              </label>

              <p style={{ opacity: 0.7, fontSize: 13, margin: "0 0 10px" }}>
                {entries.length} classes · {reference.timeSlots.length} time
                slots · {reference.venues.length} venues
              </p>

              <style>{`
                .orbit-fix-btn {
                  border: 0;
                  border-radius: 999px;
                  padding: 7px 18px;
                  font-size: 13px;
                  font-weight: 700;
                  letter-spacing: 0.02em;
                  color: #fff;
                  cursor: pointer;
                  background: linear-gradient(135deg, #6366f1, #8b5cf6);
                  box-shadow: 0 6px 16px rgba(99, 102, 241, 0.35);
                  transition: transform 0.15s ease, box-shadow 0.15s ease,
                    filter 0.15s ease;
                  white-space: nowrap;
                }
                .orbit-fix-btn:hover:not(:disabled) {
                  transform: translateY(-1px);
                  filter: brightness(1.1);
                  box-shadow: 0 10px 22px rgba(99, 102, 241, 0.45);
                }
                .orbit-fix-btn:active:not(:disabled) {
                  transform: translateY(0);
                }
                .orbit-fix-btn:disabled {
                  opacity: 0.55;
                  cursor: not-allowed;
                  box-shadow: none;
                }
                .orbit-notice {
                  margin: 0 0 12px;
                  padding: 10px 12px;
                  border-radius: 12px;
                  font-size: 13px;
                  line-height: 1.45;
                  border: 1px solid rgba(139, 92, 246, 0.35);
                  background: rgba(99, 102, 241, 0.12);
                }
              `}</style>

              {notice && <div className="orbit-notice">{notice}</div>}

              {liveConflicts.length === 0 ? (
                <p style={{ margin: 0 }}>No clashes right now.</p>
              ) : (
                <div style={{ display: "grid", gap: 8 }}>
                  {liveConflicts.slice(0, 8).map((item, index) => (
                    <div
                      key={`${item.type}-${item.timetableEntryId}-${index}`}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 10,
                        alignItems: "center",
                      }}
                    >
                      <span style={{ fontSize: 13 }}>
                        {describeClash(item, entries)}
                      </span>

                      <button
                        className="orbit-fix-btn"
                        type="button"
                        disabled={running}
                        onClick={() => solveUnit(item.timetableEntryId)}
                      >
                        {fixingId === item.timetableEntryId ? "Fixing…" : "Fix"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>
          </aside>
        </Reveal>
      </div>

      <Reveal delay={0.16}>
        <section className="solver-bottom">
          <div>
            <span className="eyebrow-small">TEST</span>

            <h2>Create a conflict</h2>
          </div>

          <Link className="button-secondary" to="/conflict-lab">
            Open Conflict Lab
            <ArrowRight size={15} />
          </Link>
        </section>
      </Reveal>
    </div>
  );
}

function describeClash(conflict, entries) {
  const first = entries.find((item) => item.id === conflict.timetableEntryId);
  const otherId = conflict.metadata?.conflictingEntryId;
  const second = otherId ? entries.find((item) => item.id === otherId) : null;

  const a = first?.course?.code || "Unit";
  const b = second?.course?.code;
  const when = first?.timeSlot ? slotLabel(first.timeSlot) : "";

  return b ? `${a} and ${b} · ${when}` : `${a} · ${conflict.title || conflict.type}`;
}

function mergeById(base = [], extra = []) {
  const map = new Map(base.map((item) => [item.id, item]));
  (extra || []).forEach((item) => {
    if (item?.id) map.set(item.id, item);
  });
  return [...map.values()];
}

function applySolverAction(entries, action, slotMap, venueMap, lecturerMap) {
  const entryId = action?.timetableEntryId || action?.entryId;

  if (!entryId) {
    return entries;
  }

  const toTimeId = action.toTimeSlotId ?? action.toSlotId;
  const toVenueId = action.toVenueId;
  const toLecturerId = action.toLecturerId;

  const nextSlot =
    action.toTimeSlot || (toTimeId ? slotMap.get(toTimeId) : null);
  const nextVenue =
    action.toVenue || (toVenueId ? venueMap.get(toVenueId) : null);

  return entries.map((entry) => {
    if (entry.id !== entryId) {
      return entry;
    }

    const nextEntry = { ...entry };

    if (nextSlot) {
      nextEntry.timeSlot = cloneObject(nextSlot);
      nextEntry.timeSlotId = nextSlot.id;
    }

    if (toVenueId === null && action.actionType) {
      nextEntry.venue = null;
      nextEntry.venueId = null;
    } else if (nextVenue) {
      nextEntry.venue = cloneObject(nextVenue);
      nextEntry.venueId = nextVenue.id;
    }

    if (toLecturerId && lecturerMap.has(toLecturerId)) {
      nextEntry.lecturer = cloneObject(lecturerMap.get(toLecturerId));
      nextEntry.lecturerId = toLecturerId;
    }

    return nextEntry;
  });
}

function cloneEntries(entries = []) {
  return entries.map((entry) => ({
    ...entry,
    course: entry.course ? { ...entry.course } : entry.course,
    lecturer: entry.lecturer ? { ...entry.lecturer } : entry.lecturer,
    venue: entry.venue ? { ...entry.venue } : entry.venue,
    studentGroup: entry.studentGroup
      ? { ...entry.studentGroup }
      : entry.studentGroup,
    timeSlot: entry.timeSlot ? { ...entry.timeSlot } : entry.timeSlot,
  }));
}

function cloneObject(value) {
  return value ? { ...value } : value;
}

function SolverMetric({ label, value }) {
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
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getActionStatus(type) {
  const labels = {
    ASSIGN: "Assigning class",
    REASSIGN: "Reassigning class",
    SWAP: "Swapping classes",
    MOVE_TIME: "Moving class",
    MOVE_VENUE: "Moving class",
    CHANGE_LECTURER: "Changing lecturer",
    CHANGE_MODE: "Changing delivery mode",
    COMBINATION: "Applying combined move",
  };

  return labels[type] || "Applying solver decision";
}

function buildActionReasoning(action) {
  const explanations = {
    ASSIGN: "A valid timetable position was selected.",
    REASSIGN: "The conflicting assignment was replaced.",
    SWAP: "Two timetable positions were exchanged.",
    MOVE_TIME: "The class was moved to a valid time slot.",
    MOVE_VENUE: "The class was moved to a compatible venue.",
    CHANGE_LECTURER: "The lecturer assignment was changed.",
    CHANGE_MODE: "The delivery mode was changed.",
    COMBINATION: "Multiple constraints were resolved together.",
  };

  return (
    explanations[action?.actionType] || "A valid solver decision was applied."
  );
}

function getActionEntryLabel(action, originalEntries) {
  const id = action?.timetableEntryId || action?.entryId;

  const entry = originalEntries.find((item) => item.id === id);

  return entry?.course?.code || entry?.course?.name || id || "Current class";
}

function getActionChangeLabel(action, originalEntries) {
  if (!action) {
    return "—";
  }

  const entryId = action?.timetableEntryId || action?.entryId;
  const original = originalEntries.find((entry) => entry.id === entryId);

  const fromTimeId = action.fromTimeSlotId ?? action.fromSlotId;
  const toTimeId = action.toTimeSlotId ?? action.toSlotId;

  const parts = [];

  if (toTimeId && toTimeId !== fromTimeId) {
    const fromLabel = original?.timeSlot
      ? slotLabel(original.timeSlot)
      : "current slot";
    const toLabel = action.toTimeSlot
      ? slotLabel(action.toTimeSlot)
      : "new slot";

    parts.push(`${fromLabel} → ${toLabel}`);
  }

  if (action.toVenueId !== undefined && action.toVenueId !== action.fromVenueId) {
    const fromVenue = original?.venue?.code || "no venue";
    const toVenue = action.toVenue?.code || "online";

    parts.push(`${fromVenue} → ${toVenue}`);
  }

  if (parts.length > 0) {
    return parts.join(" • ");
  }

  return formatActionType(action.actionType);
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}