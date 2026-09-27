import { motion } from "framer-motion";
import {
  BrainCircuit,
  Database,
  GitBranch,
  ShieldCheck,
  Workflow,
  Zap,
} from "lucide-react";

const sections = [
  {
    icon: BrainCircuit,
    title: "The problem",
    text: "University timetables become difficult to manage when courses, lecturers, venues, student groups and availability constraints interact. A change in one slot can create several new conflicts.",
  },
  {
    icon: Workflow,
    title: "The approach",
    text: "ORBIT models timetable scheduling as a constraint satisfaction problem. It detects conflicts, removes impossible candidates, searches for valid assignments and verifies the resulting timetable.",
  },
  {
    icon: GitBranch,
    title: "Constraint solving",
    text: "The solver uses constraint propagation and backtracking rather than simply moving classes randomly. Each decision is evaluated against the timetable's rules.",
  },
  {
    icon: ShieldCheck,
    title: "Verification",
    text: "After optimisation, the system runs conflict detection again. A solution is only considered complete when the resulting timetable passes the active validation rules.",
  },
];

const stack = [
  ["Frontend", "React + Vite"],
  ["Animation", "Framer Motion"],
  ["Backend", "Node.js + Express"],
  ["Database", "Prisma + PostgreSQL"],
  ["Solver", "Constraint propagation + backtracking"],
  ["Interface", "Responsive web application"],
];

export default function About() {
  return (
    <div className="page">
      <section className="page-hero">
        <div className="container narrow">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="eyebrow">PROJECT DOCUMENTATION</span>

            <h1>How SmartTimetable AI works.</h1>

            <p className="page-lead">
              SmartTimetable AI is a timetable optimisation system designed
              to make scheduling conflicts visible, explainable and
              solvable.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-heading">
            <div>
              <span className="eyebrow">SYSTEM OVERVIEW</span>
              <h2>From conflict to verified timetable.</h2>
            </div>

            <p>
              The system combines a web interface, timetable database,
              conflict detector and constraint-based solver into one workflow.
            </p>
          </div>

          <div className="about-grid">
            {sections.map((section, index) => {
              const Icon = section.icon;

              return (
                <motion.article
                  className="glass-card about-card"
                  key={section.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{
                    duration: 0.45,
                    delay: index * 0.06,
                  }}
                >
                  <div className="icon-box">
                    <Icon size={20} strokeWidth={1.8} />
                  </div>

                  <h3>{section.title}</h3>
                  <p>{section.text}</p>
                </motion.article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section section-muted">
        <div className="container">
          <div className="section-heading">
            <div>
              <span className="eyebrow">ORBIT PIPELINE</span>
              <h2>The optimisation workflow.</h2>
            </div>
          </div>

          <div className="pipeline">
            <PipelineStep
              number="01"
              icon={Database}
              title="Load"
              text="Read courses, lecturers, venues, groups and timetable slots."
            />

            <PipelineStep
              number="02"
              icon={Zap}
              title="Detect"
              text="Identify clashes and rule violations in the current timetable."
            />

            <PipelineStep
              number="03"
              icon={BrainCircuit}
              title="Solve"
              text="Propagate constraints and search through valid alternatives."
            />

            <PipelineStep
              number="04"
              icon={ShieldCheck}
              title="Verify"
              text="Run conflict detection again and confirm the final state."
            />
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-heading">
            <div>
              <span className="eyebrow">TECHNICAL FOUNDATION</span>
              <h2>Built as a real full-stack system.</h2>
            </div>
          </div>

          <div className="stack-list">
            {stack.map(([label, value]) => (
              <div className="stack-row" key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="documentation-card">
            <div>
              <span className="eyebrow">DOCUMENTATION</span>
              <h2>Designed for demonstration and analysis.</h2>
              <p>
                The interface makes the scheduling process observable:
                conflicts can be introduced, ORBIT can process them, solver
                decisions can be replayed, and the final timetable can be
                verified against the same constraints.
              </p>
            </div>

            <div className="documentation-mark">
              <BrainCircuit size={42} strokeWidth={1.4} />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function PipelineStep({ number, icon: Icon, title, text }) {
  return (
    <motion.div
      className="pipeline-step"
      initial={{ opacity: 0, x: -15 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
    >
      <span className="pipeline-number">{number}</span>

      <div className="pipeline-icon">
        <Icon size={20} strokeWidth={1.8} />
      </div>

      <h3>{title}</h3>
      <p>{text}</p>
    </motion.div>
  );
}
