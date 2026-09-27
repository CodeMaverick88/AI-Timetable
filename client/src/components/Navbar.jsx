import { useState } from "react";
import {
  BrainCircuit,
  Menu,
  X,
} from "lucide-react";
import {
  Link,
  NavLink,
} from "react-router-dom";

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

  function closeMenu() {
    setOpen(false);
  }

  return (
    <header className="navbar">
      <div className="navbar-inner">

        <Link
          to="/"
          className="brand"
          onClick={closeMenu}
          aria-label="SmartTimetable AI home"
        >
          <div className="brand-mark">
            <BrainCircuit size={20} />
          </div>

          <div className="brand-copy">
            <strong>SmartTimetable</strong>
            <span>AI SCHEDULING SYSTEM</span>
          </div>
        </Link>

        <nav
          className={`nav ${open ? "open" : ""}`}
          aria-label="Primary navigation"
        >
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === "/"}
              onClick={closeMenu}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="navbar-actions">

          <span className="system-status">
            <i />
            System online
          </span>

          <Link
            className="nav-solve"
            to="/solver"
            onClick={closeMenu}
          >
            Run ORBIT
          </Link>

          <button
            className="menu-button"
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-label={
              open
                ? "Close navigation"
                : "Open navigation"
            }
            aria-expanded={open}
          >
            {open ? (
              <X size={20} />
            ) : (
              <Menu size={20} />
            )}
          </button>

        </div>

      </div>
    </header>
  );
}