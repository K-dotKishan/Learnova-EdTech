import { useEffect, useState } from "react";
import { Routes, Route, Link, Navigate, useNavigate, NavLink } from "react-router-dom";
import { api, token } from "./api.js";
import Landing   from "./pages/Landing.jsx";
import Auth      from "./pages/Auth.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Courses   from "./pages/Courses.jsx";
import Course    from "./pages/Course.jsx";
import Learn     from "./pages/Learn.jsx";
import Live      from "./pages/Live.jsx";
import Legends   from "./pages/Legends.jsx";
import LegendStory from "./pages/LegendStory.jsx";
import KnowledgeArena from "./pages/KnowledgeArena.jsx";
import CareerCompass  from "./pages/CareerCompass.jsx";

export default function App() {
  const [user, setUser]   = useState(null);
  const [ready, setReady] = useState(false);
  const [dark, setDark]   = useState(localStorage.dark === "1");
  const nav = useNavigate();

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.dark = dark ? "1" : "0";
  }, [dark]);

  useEffect(() => {
    (token()
      ? api("/auth/me/").then(setUser).catch(() => localStorage.removeItem("token"))
      : Promise.resolve()
    ).finally(() => setReady(true));
  }, []);

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
    nav("/");
  };

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin h-10 w-10 border-4 border-leaf border-t-transparent rounded-full" />
      </div>
    );
  }

  const guard = (el) => (user ? el : <Navigate to="/login" />);

  return (
    <>
      {/* ── Top Nav ───────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-3 border-b border-stone-200 dark:border-teal-900 bg-white/90 dark:bg-ink/90 backdrop-blur">
        <Link to="/" className="font-display text-2xl font-extrabold flex items-center gap-2">
          <span className="text-2xl">🌐</span>
          LinguaLearn <span className="text-saffron">AI</span>
        </Link>

        <nav className="flex items-center gap-1 text-sm">
          <NavLink to="/courses"
            className={({ isActive }) => `px-3 py-1.5 rounded-lg transition ${isActive ? "bg-leaf/10 text-leaf font-medium" : "hover:bg-stone-100 dark:hover:bg-teal-950"}`}>
            Courses
          </NavLink>
          <NavLink to="/legends"
            className={({ isActive }) => `px-3 py-1.5 rounded-lg transition ${isActive ? "bg-leaf/10 text-leaf font-medium" : "hover:bg-stone-100 dark:hover:bg-teal-950"}`}>
            📖 Legends
          </NavLink>
          <NavLink to="/arena"
            className={({ isActive }) => `px-3 py-1.5 rounded-lg transition ${isActive ? "bg-leaf/10 text-leaf font-medium" : "hover:bg-stone-100 dark:hover:bg-teal-950"}`}>
            ⚡ Arena
          </NavLink>
          <NavLink to="/careers"
            className={({ isActive }) => `px-3 py-1.5 rounded-lg transition ${isActive ? "bg-leaf/10 text-leaf font-medium" : "hover:bg-stone-100 dark:hover:bg-teal-950"}`}>
            🧭 Careers
          </NavLink>

          {user ? (
            <>
              <NavLink to="/dashboard"
                className={({ isActive }) => `px-3 py-1.5 rounded-lg transition ${isActive ? "bg-leaf/10 text-leaf font-medium" : "hover:bg-stone-100 dark:hover:bg-teal-950"}`}>
                Dashboard
              </NavLink>
              <span className="px-2 text-xs opacity-50">{user.username} ({user.role})</span>
              <button onClick={logout}
                className="px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 text-red-600 transition">
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="px-3 py-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-teal-950 transition">
                Log in
              </Link>
              <Link to="/register" className="btn ml-1">Get started</Link>
            </>
          )}

          <button
            aria-label="Toggle dark mode"
            onClick={() => setDark(!dark)}
            className="ml-2 p-2 rounded-lg hover:bg-stone-100 dark:hover:bg-teal-950 transition text-base">
            {dark ? "☀️" : "🌙"}
          </button>
        </nav>
      </header>

      {/* ── Routes ────────────────────────────────────────────────────── */}
      <Routes>
        <Route path="/"            element={<Landing user={user} />} />
        <Route path="/login"       element={<Auth mode="login" setUser={setUser} />} />
        <Route path="/register"    element={<Auth mode="register" setUser={setUser} />} />
        <Route path="/dashboard"   element={guard(<Dashboard user={user} setUser={setUser} />)} />
        <Route path="/courses"     element={<Courses user={user} />} />
        <Route path="/courses/:id" element={<Course user={user} />} />
        {/* Learn is open to everyone — guests use localStorage for progress */}
        <Route path="/learn/:courseId/:lessonId" element={<Learn user={user} />} />
        <Route path="/live/:id"    element={guard(<Live user={user} />)} />
        {/* Legends & Life Stories — public */}
        <Route path="/legends"     element={<Legends user={user} />} />
        <Route path="/legends/:slug" element={<LegendStory user={user} />} />
        {/* Knowledge Arena — public */}
        <Route path="/arena"       element={<KnowledgeArena user={user} />} />
        {/* Career Compass — public */}
        <Route path="/careers"     element={<CareerCompass user={user} />} />
        <Route path="*"            element={<Navigate to="/courses" />} />
      </Routes>
    </>
  );
}
