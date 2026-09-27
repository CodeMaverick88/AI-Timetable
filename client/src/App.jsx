import {
  BrowserRouter,
  Route,
  Routes,
} from "react-router-dom";

import Navbar from "./components/Navbar";

import Home from "./pages/Home";
import Timetable from "./pages/Timetable";
import Solver from "./pages/Solver";
import ConflictLab from "./pages/ConflictLab";
import About from "./pages/About";

export default function App() {
  return (
    <BrowserRouter>

      <Navbar />

      <main className="main">
        <Routes>

          <Route
            path="/"
            element={<Home />}
          />

          <Route
            path="/timetable"
            element={<Timetable />}
          />

          <Route
            path="/solver"
            element={<Solver />}
          />

          <Route
            path="/conflict-lab"
            element={<ConflictLab />}
          />

          <Route
            path="/about"
            element={<About />}
          />

        </Routes>
      </main>

    </BrowserRouter>
  );
}