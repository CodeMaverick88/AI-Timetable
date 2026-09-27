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
} from "lucide-react";
import { Link } from "react-router-dom";

import Reveal from "../components/Reveal";
import GlassCard from "../components/GlassCard";

const API =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000";

const CONFLICT_TYPES = [
  {
    value: "VENUE",
    label: "Venue conflict",
    description:
      "Place two classes in the same venue and time slot.",
    icon: MapPin,
  },
  {
    value: "LECTURER",
    label: "Lecturer conflict",
    description:
      "Assign two classes to the same lecturer at the same time.",
    icon: UserRound,
  },
  {
    value: "STUDENT_GROUP",
    label: "Student group conflict",
    description:
      "Schedule two classes for the same student group at the same time.",
    icon: Users,
  },
];

export default function ConflictLab() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const [conflictType, setConflictType] =
    useState("VENUE");

  const [firstEntryId, setFirstEntryId] =
    useState("");

  const [secondEntryId, setSecondEntryId] =
    useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [created, setCreated] = useState(false);

  async function loadEntries() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API}/api/timetable`,
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Unable to load timetable entries.",
        );
      }

      const timetableEntries =
        data.entries || [];

      setEntries(timetableEntries);

      if (timetableEntries.length >= 2) {
        setFirstEntryId(
          (current) =>
            current || timetableEntries[0].id,
        );

        setSecondEntryId(
          (current) =>
            current ||
            timetableEntries[1].id,
        );
      }
    } catch (loadError) {
      console.error(loadError);

      setError(
        loadError.message ||
          "Unable to load timetable entries.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEntries();
  }, []);

  const selectedType = useMemo(
    () =>
      CONFLICT_TYPES.find(
        (item) =>
          item.value === conflictType,
      ),
    [conflictType],
  );

  async function createConflict() {
    setError("");
    setMessage("");
    setCreated(false);

    if (!firstEntryId || !secondEntryId) {
      setError(
        "Select two timetable classes first.",
      );
      return;
    }

    if (firstEntryId === secondEntryId) {
      setError(
        "Choose two different timetable classes.",
      );
      return;
    }

    setCreating(true);

    try {
      const response = await fetch(
        `${API}/api/demo/inject-conflict`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            conflictType,
            firstEntryId,
            secondEntryId,
          }),
        },
      );

      const data =
        await response.json().catch(
          () => ({}),
        );

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Unable to create the conflict.",
        );
      }

      setCreated(true);

      setMessage(
        data.message ||
          "A real timetable conflict has been created.",
      );

      await loadEntries();
    } catch (createError) {
      console.error(createError);

      setError(
        createError.message ||
          "Unable to create the conflict.",
      );
    } finally {
      setCreating(false);
    }
  }

  function entryLabel(entry) {
    const code =
      entry.course?.code || "UNIT";

    const name =
      entry.course?.name ||
      "Untitled unit";

    const day =
      entry.timeSlot?.dayName ||
      entry.timeSlot?.dayOfWeek ||
      "";

    const time =
      entry.timeSlot?.startTime &&
      entry.timeSlot?.endTime
        ? `${entry.timeSlot.startTime} – ${entry.timeSlot.endTime}`
        : "";

    return `${code} · ${name} · ${day} ${time}`;
  }

  return (
    <div className="conflict-lab-page">

      <Reveal>
        <div className="page-heading">

          <div>
            <span className="eyebrow-small">
              CONFLICT LAB
            </span>

            <h1>
              Create a real timetable conflict.
            </h1>

            <p>
              Deliberately introduce a scheduling
              problem into the database, then send
              the timetable to ORBIT to solve it.
            </p>
          </div>

          <Link
            className="button-secondary"
            to="/solver"
          >
            <BrainCircuit size={16} />
            Open ORBIT
          </Link>

        </div>
      </Reveal>

      <div className="conflict-lab-layout">

        <Reveal delay={0.06}>
          <GlassCard className="conflict-builder">

            <div className="lab-card-heading">

              <div className="lab-icon">
                <FlaskConical size={21} />
              </div>

              <div>
                <span className="eyebrow-small">
                  SCENARIO BUILDER
                </span>

                <h2>
                  Choose the conflict.
                </h2>
              </div>

            </div>

            <div className="conflict-types">

              {CONFLICT_TYPES.map(
                (type) => {
                  const Icon = type.icon;

                  const selected =
                    conflictType ===
                    type.value;

                  return (
                    <button
                      key={type.value}
                      type="button"
                      className={`conflict-type ${
                        selected
                          ? "selected"
                          : ""
                      }`}
                      onClick={() => {
                        setConflictType(
                          type.value,
                        );
                        setCreated(false);
                        setMessage("");
                        setError("");
                      }}
                    >

                      <div className="conflict-type-icon">
                        <Icon size={18} />
                      </div>

                      <div>
                        <strong>
                          {type.label}
                        </strong>

                        <span>
                          {type.description}
                        </span>
                      </div>

                      {selected && (
                        <CheckCircle2
                          size={17}
                        />
                      )}

                    </button>
                  );
                },
              )}

            </div>

            <div className="lab-form">

              <label>
                <span>
                  First class
                </span>

                <select
                  value={firstEntryId}
                  onChange={(event) =>
                    setFirstEntryId(
                      event.target.value,
                    )
                  }
                  disabled={
                    loading ||
                    creating
                  }
                >
                  <option value="">
                    Select a class
                  </option>

                  {entries.map(
                    (entry) => (
                      <option
                        key={entry.id}
                        value={entry.id}
                      >
                        {entryLabel(entry)}
                      </option>
                    ),
                  )}
                </select>
              </label>

              <label>
                <span>
                  Second class
                </span>

                <select
                  value={secondEntryId}
                  onChange={(event) =>
                    setSecondEntryId(
                      event.target.value,
                    )
                  }
                  disabled={
                    loading ||
                    creating
                  }
                >
                  <option value="">
                    Select a class
                  </option>

                  {entries.map(
                    (entry) => (
                      <option
                        key={entry.id}
                        value={entry.id}
                      >
                        {entryLabel(entry)}
                      </option>
                    ),
                  )}
                </select>
              </label>

            </div>

            <div className="lab-action">

              <div>
                <span>
                  Selected scenario
                </span>

                <strong>
                  {selectedType?.label}
                </strong>
              </div>

              <button
                className="button-primary"
                type="button"
                onClick={createConflict}
                disabled={
                  loading ||
                  creating ||
                  entries.length < 2
                }
              >
                {creating ? (
                  <>
                    <RefreshCw
                      size={15}
                      className="refresh-spinning"
                    />
                    Creating...
                  </>
                ) : (
                  <>
                    Create conflict
                    <ArrowRight size={15} />
                  </>
                )}
              </button>

            </div>

          </GlassCard>
        </Reveal>

        <Reveal delay={0.1}>
          <aside className="conflict-lab-side">

            <GlassCard className="lab-explanation">

              <div className="lab-side-icon">
                <AlertTriangle size={20} />
              </div>

              <span className="eyebrow-small">
                CONTROLLED FAILURE
              </span>

              <h2>
                Break it deliberately.
              </h2>

              <p>
                This lab is connected to the
                timetable data. The selected conflict
                is injected into the scheduling
                scenario so ORBIT has something real
                to solve.
              </p>

              <div className="lab-flow">

                <FlowStep
                  number="01"
                  text="Choose a conflict type"
                />

                <FlowStep
                  number="02"
                  text="Select two timetable classes"
                />

                <FlowStep
                  number="03"
                  text="Inject the conflict"
                />

                <FlowStep
                  number="04"
                  text="Send it to ORBIT"
                />

              </div>

            </GlassCard>

            {created && (
              <GlassCard className="lab-success">

                <div className="lab-success-icon">
                  <CheckCircle2 size={20} />
                </div>

                <div>
                  <span>
                    CONFLICT CREATED
                  </span>

                  <strong>
                    The timetable is ready for ORBIT.
                  </strong>

                  <p>
                    {message}
                  </p>
                </div>

                <Link
                  className="button-primary"
                  to="/solver"
                >
                  Solve with ORBIT
                  <ArrowRight size={15} />
                </Link>

              </GlassCard>
            )}

            {error && (
              <GlassCard className="lab-error">

                <AlertTriangle size={19} />

                <div>
                  <strong>
                    Conflict creation failed
                  </strong>

                  <p>
                    {error}
                  </p>
                </div>

              </GlassCard>
            )}

          </aside>
        </Reveal>

      </div>

      <Reveal delay={0.15}>
        <section className="lab-bottom">

          <div>
            <span className="eyebrow-small">
              NEXT STEP
            </span>

            <h2>
              Once the conflict exists, watch ORBIT work.
            </h2>

            <p>
              The solver page uses the real timetable,
              the real backend solver and the real
              solver decisions.
            </p>
          </div>

          <Link
            className="button-secondary"
            to="/solver"
          >
            Open solver
            <ArrowRight size={15} />
          </Link>

        </section>
      </Reveal>

    </div>
  );
}

function FlowStep({
  number,
  text,
}) {
  return (
    <div className="lab-flow-step">

      <span>
        {number}
      </span>

      <p>
        {text}
      </p>

    </div>
  );
}