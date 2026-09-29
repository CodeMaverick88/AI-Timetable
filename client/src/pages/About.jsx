import { motion } from "framer-motion";
import {
  BrainCircuit,
  Database,
  GitBranch,
  GraduationCap,
  ShieldCheck,
  Users,
  Workflow,
  Zap,
  ArrowRight,
  Mail,
} from "lucide-react";

const workflow = [
  [
    "01",
    Database,
    "Load",
    "Bring courses, venues, lecturers, groups and available university timeslots into one model.",
  ],
  [
    "02",
    GitBranch,
    "Detect",
    "Find venue, lecturer, student-group and timetable conflicts before they spread.",
  ],
  [
    "03",
    BrainCircuit,
    "Solve",
    "Search valid alternatives while respecting Monday–Friday, 08:00–18:00 scheduling rules.",
  ],
  [
    "04",
    ShieldCheck,
    "Verify",
    "Run conflict detection again so the final timetable is explainable and defensible.",
  ],
];

const team = [
  [
    "MN",
    "Meison Njonjo",
    "Developer / ORBIT lead",
    "Product direction, frontend experience and solver demonstration.",
    "#6366f1",
  ],
  [
    "RM",
    "Rose Momanyi",
    "Project team",
    "Research, requirements and timetable problem framing.",
    "#0ea5e9",
  ],
  [
    "MW",
    "Morris Wambugu",
    "Project team",
    "System collaboration, review and delivery support.",
    "#10b981",
  ],
];

export default function About() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6 },
    },
  };

  return (
    <div className="about-page" data-page="about">
      {/* ============ HERO ============ */}
      <motion.section
        className="about-hero"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
      >
        <motion.div
          className="about-hero-label"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <BrainCircuit size={16} />
          ORBIT DOCUMENTATION
        </motion.div>

        <h1>
          Make scheduling problems{" "}
          <motion.em
            initial={{ backgroundPosition: "0% 50%" }}
            animate={{ backgroundPosition: "100% 50%" }}
            transition={{
              duration: 3,
              repeat: Infinity,
              repeatType: "reverse",
            }}
            style={{
              backgroundImage:
                "linear-gradient(90deg, #6366f1, #0ea5e9, #10b981, #6366f1)",
              backgroundSize: "200% 200%",
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            visible, solvable and trusted.
          </motion.em>
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          ORBIT is the intelligence layer behind SmartTimetable: it turns a
          crowded university timetable into a constraint model, works through
          valid alternatives and verifies the result.
        </motion.p>
      </motion.section>

      {/* ============ HOW IT WORKS ============ */}
      <section className="about-explain-grid">
        <motion.div
          className="about-orbit-visual glass-card"
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="about-orbit-core">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{
                duration: 20,
                repeat: Infinity,
                ease: "linear",
              }}
            >
              <BrainCircuit size={40} />
            </motion.div>
            <strong>ORBIT</strong>
            <span>CONSTRAINT ENGINE</span>
          </div>

          <motion.span
            className="about-orbit-node node-a"
            animate={{
              y: [0, -8, 0],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <GraduationCap size={16} />
          </motion.span>

          <motion.span
            className="about-orbit-node node-b"
            animate={{
              y: [0, -8, 0],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              delay: 0.5,
              ease: "easeInOut",
            }}
          >
            <Users size={16} />
          </motion.span>

          <motion.span
            className="about-orbit-node node-c"
            animate={{
              y: [0, -8, 0],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              delay: 1,
              ease: "easeInOut",
            }}
          >
            <ShieldCheck size={16} />
          </motion.span>
        </motion.div>

        <motion.div
          className="about-explain-copy"
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <span className="eyebrow-small">HOW THE AI THINKS</span>
          <h2>It does not move classes randomly.</h2>
          <p>
            ORBIT evaluates each possible assignment against the rules of the
            university. It protects the student group, checks lecturer
            availability, checks venue capacity and keeps every class within
            the permitted teaching day and time window.
          </p>

          <motion.div
            className="constraint-chips"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {[
              "Mon–Fri",
              "08:00–18:00",
              "Venue aware",
              "Lecturer aware",
              "Group aware",
            ].map((chip) => (
              <motion.span key={chip} variants={itemVariants}>
                {chip}
              </motion.span>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* ============ WORKFLOW ============ */}
      <section className="about-workflow-section">
        <motion.div
          className="section-heading"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div>
            <span className="eyebrow">THE PIPELINE</span>
            <h2>From conflict to confidence.</h2>
          </div>

          <p>
            Each stage is exposed in the interface so your demonstration can
            show what is happening rather than hiding the process behind a
            button.
          </p>
        </motion.div>

        <motion.div
          className="about-workflow-grid"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {workflow.map(([number, Icon, title, text]) => (
            <motion.article
              className="workflow-card glass-card"
              key={title}
              variants={itemVariants}
              whileHover={{
                y: -8,
                boxShadow: "0 20px 48px rgba(99, 102, 241, 0.2)",
              }}
            >
              <motion.span
                className="workflow-number"
                whileHover={{ scale: 1.1 }}
              >
                {number}
              </motion.span>

              <motion.div
                className="workflow-icon"
                whileHover={{ scale: 1.15, rotate: 10 }}
              >
                <Icon size={24} />
              </motion.div>

              <h3>{title}</h3>
              <p>{text}</p>

              <motion.div
                className="workflow-arrow"
                initial={{ opacity: 0, x: -10 }}
                whileHover={{ opacity: 1, x: 0 }}
              >
                <ArrowRight size={16} />
              </motion.div>
            </motion.article>
          ))}
        </motion.div>
      </section>

      {/* ============ TEAM ============ */}
      <section className="about-team-section">
        <motion.div
          className="section-heading"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div>
            <span className="eyebrow">THE TEAM</span>
            <h2>People behind the system.</h2>
          </div>
        </motion.div>

        <motion.div
          className="team-grid"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {team.map(([initials, name, role, text, color]) => (
            <motion.article
              className="team-card glass-card"
              key={name}
              variants={itemVariants}
              whileHover={{ y: -8 }}
            >
              <motion.div
                className="team-avatar"
                style={{ background: color }}
                whileHover={{ scale: 1.1 }}
              >
                {initials}
              </motion.div>

              <span className="team-role">{role}</span>
              <h3>{name}</h3>
              <p>{text}</p>

              <div className="team-social">
                <motion.a
                  href="#"
                  title="GitHub"
                  aria-label="GitHub"
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <GitBranch size={14} />
                </motion.a>

                <motion.a
                  href="#"
                  title="Email"
                  aria-label="Email"
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Mail size={14} />
                </motion.a>
              </div>
            </motion.article>
          ))}
        </motion.div>
      </section>

      {/* ============ CTA ============ */}
      <motion.section
        className="about-documentation-panel"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <div>
          <span className="eyebrow">DOCUMENTATION & PRESENTATION</span>
          <h2>Ready for a technical demonstration.</h2>
          <p>
            Use the live board to introduce a conflict, open ORBIT, watch
            decisions move unit cards through the timetable, and finish on
            verification.
          </p>
        </div>

        <motion.div
          className="documentation-actions"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.a
            className="button-secondary"
            href="#workflow"
            variants={itemVariants}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Workflow size={15} /> View workflow
          </motion.a>

          <motion.a
            className="button-primary"
            href="#team"
            variants={itemVariants}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Zap size={15} /> Meet the team
          </motion.a>
        </motion.div>
      </motion.section>
    </div>
  );
}