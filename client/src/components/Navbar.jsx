import { motion } from "framer-motion";
import { BrainCircuit, Menu, X, Zap } from "lucide-react";
import { Link, NavLink } from "react-router-dom";
import { useState, useEffect } from "react";

const links = [
  {
    to: "/",
    label: "Home",
  },
  {
    to: "/timetable",
    label: "Timetable",
  },
  {
    to: "/solver",
    label: "ORBIT",
  },
  {
    to: "/conflict-lab",
    label: "Conflict Lab",
  },
  {
    to: "/about",
    label: "About",
  },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 10);
    }

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  function closeMenu() {
    setOpen(false);
  }

  const navVariants = {
    closed: {
      opacity: 0,
      y: -10,
      pointerEvents: "none",
    },
    open: {
      opacity: 1,
      y: 0,
      pointerEvents: "auto",
      transition: {
        duration: 0.3,
        staggerChildren: 0.05,
        delayChildren: 0.05,
      },
    },
  };

  const linkVariants = {
    closed: { opacity: 0, x: -10 },
    open: { opacity: 1, x: 0 },
  };

  return (
    <motion.header
      className={`navbar ${scrolled ? "scrolled" : ""}`}
      data-navigation="primary"
      initial={false}
      animate={{
        boxShadow: scrolled
          ? "0 4px 20px rgba(0, 0, 0, 0.1)"
          : "0 1px 3px rgba(0, 0, 0, 0.05)",
      }}
      transition={{ duration: 0.3 }}
    >
      <div className="navbar-inner">
        <Link
          to="/"
          className="brand"
          onClick={closeMenu}
          aria-label="SmartTimetable AI home"
        >
          <motion.div
            className="brand-mark"
            whileHover={{ scale: 1.1, rotate: 10 }}
            whileTap={{ scale: 0.95 }}
          >
            <BrainCircuit size={20} />
          </motion.div>

          <div className="brand-copy">
            <strong>SmartTimetable</strong>
            <span>AI SCHEDULING SYSTEM</span>
          </div>
        </Link>

        <motion.nav
          className={`nav ${open ? "open" : ""}`}
          aria-label="Primary navigation"
          variants={navVariants}
          initial="closed"
          animate={open ? "open" : "closed"}
        >
          {links.map((link) => (
            <motion.div key={link.to} variants={linkVariants}>
              <NavLink
                to={link.to}
                end={link.to === "/"}
                onClick={closeMenu}
                className={({ isActive }) => (isActive ? "active" : "")}
              >
                {link.label}
              </NavLink>
            </motion.div>
          ))}
        </motion.nav>

        <div className="navbar-actions">
          <motion.span
            className="system-status"
            aria-label="System online"
            animate={{
              opacity: [1, 0.6, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <i />
            System online
          </motion.span>

          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Link className="nav-solve" to="/solver" onClick={closeMenu}>
              <Zap size={14} />
              Run ORBIT
            </Link>
          </motion.div>

          <motion.button
            className="menu-button"
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-label={open ? "Close navigation" : "Open navigation"}
            aria-expanded={open}
            whileHover={{ backgroundColor: "rgba(99, 102, 241, 0.1)" }}
            whileTap={{ scale: 0.9 }}
          >
            <motion.div
              animate={{ rotate: open ? 90 : 0 }}
              transition={{ duration: 0.3 }}
            >
              {open ? <X size={20} /> : <Menu size={20} />}
            </motion.div>
          </motion.button>
        </div>
      </div>
    </motion.header>
  );
}