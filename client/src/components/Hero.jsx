import { motion } from "framer-motion";
import {
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  GitBranch,
  ShieldCheck,
  Workflow,
} from "lucide-react";
import { Link } from "react-router-dom";

export default function Hero() {
  return (
    <section className="hero">

      <div className="hero-copy">

        <motion.div
          className="hero-label"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <span />
          AI timetable optimisation
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: 0.08,
            duration: 0.55,
          }}
        >
          Build a timetable
          <em> that makes sense.</em>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: 0.16,
            duration: 0.55,
          }}
        >
          SmartTimetable AI detects scheduling conflicts,
          searches the constraint space, moves real classes,
          and verifies the resulting timetable.
        </motion.p>

        <motion.div
          className="hero-actions"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: 0.24,
            duration: 0.5,
          }}
        >
          <Link
            className="button-primary"
            to="/solver"
          >
            Run ORBIT
            <ArrowRight size={16} />
          </Link>

          <Link
            className="button-secondary"
            to="/timetable"
          >
            View timetable
          </Link>
        </motion.div>

        <motion.div
          className="hero-proof"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{
            delay: 0.4,
            duration: 0.5,
          }}
        >
          <CheckCircle2 size={15} />
          Real timetable data · Real constraints · Real verification
        </motion.div>

      </div>

      <motion.div
        className="hero-orbit"
        initial={{
          opacity: 0,
          scale: 0.85,
        }}
        animate={{
          opacity: 1,
          scale: 1,
        }}
        transition={{
          duration: 0.8,
          ease: [0.22, 1, 0.36, 1],
        }}
      >

        <div className="orbit-circle orbit-circle-one" />
        <div className="orbit-circle orbit-circle-two" />

        {/* Decorative mechanism */}
        <motion.div
          className="orbit-mechanism"
          animate={{ rotate: 360 }}
          transition={{
            duration: 28,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          <div className="gear gear-one">
            <GitBranch size={15} />
          </div>

          <div className="gear gear-two">
            <Workflow size={14} />
          </div>

          <div className="gear gear-three">
            <ShieldCheck size={14} />
          </div>
        </motion.div>

        <motion.div
          className="orbit-core"
          animate={{
            y: [0, -7, 0],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <BrainCircuit size={40} />

          <strong>ORBIT</strong>

          <span>AI SOLVER</span>
        </motion.div>

        <motion.div
          className="orbit-point point-one"
          animate={{
            rotate: 360,
          }}
          transition={{
            duration: 9,
            repeat: Infinity,
            ease: "linear",
          }}
        />

        <motion.div
          className="orbit-point point-two"
          animate={{
            rotate: -360,
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "linear",
          }}
        />

        <div className="orbit-point point-three" />

      </motion.div>

    </section>
  );
}