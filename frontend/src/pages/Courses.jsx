import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { apiAll } from "../api.js";

const LEVELS = ["Beginner", "Intermediate", "Advanced"];

function CourseCard({ c }) {
  return (
    <div className="card-hover flex flex-col group">
      <Link to={`/courses/${c.id}`} className="block">
        <div className="relative overflow-hidden rounded-xl mb-3">
          <img
            src={c.thumbnail || `https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg`}
            alt={c.title}
            className="w-full h-44 object-cover group-hover:scale-105 transition-transform duration-300"
            onError={e => { e.target.src = "https://placehold.co/400x225/134e4a/fff?text=Course"; }}
          />
          <div className="absolute top-2 left-2 flex gap-1">
            <span className={`badge ${c.level === "Beginner" ? "badge-green" : c.level === "Intermediate" ? "badge-blue" : "badge-orange"}`}>
              {c.level}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 mb-2 text-sm opacity-60">
          {c.category_icon && <span className="text-base">{c.category_icon}</span>}
          <span>{c.category_name}</span>
        </div>
        <h3 className="font-semibold text-base leading-snug line-clamp-2 mb-1">{c.title}</h3>
        <p className="text-sm opacity-60 mb-3 line-clamp-2">{c.description}</p>
      </Link>
      <div className="mt-auto flex items-center justify-between pt-3 border-t border-stone-100 dark:border-teal-900/50">
        <div className="text-xs opacity-50">
          <span>{c.teacher_name}</span>
          <span className="mx-1.5">·</span>
          <span>{c.lesson_count} lessons</span>
          <span className="mx-1.5">·</span>
          <span>{c.student_count} students</span>
        </div>
        {/* Everyone can watch — no enrollment gate */}
        <Link to={`/courses/${c.id}`} className="btn-sm">View</Link>
      </div>
    </div>
  );
}

export default function Courses({ user }) {
  const [courses, setCourses]       = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [msg, setMsg]               = useState("");
  const [searchParams, setSearchParams] = useSearchParams();

  const q       = searchParams.get("q") || "";
  const catSlug = searchParams.get("category") || "";
  const level   = searchParams.get("level") || "";

  useEffect(() => {
    apiAll("/categories/").then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q)       params.set("q",        q);
    if (catSlug) params.set("category", catSlug);
    if (level)   params.set("level",    level);
    apiAll(`/courses/?${params}`)
      .then(setCourses)
      .catch(e => setMsg(e.message))
      .finally(() => setLoading(false));
  }, [q, catSlug, level]);

  const setParam = (key, val) =>
    setSearchParams(p => { const n = new URLSearchParams(p); val ? n.set(key, val) : n.delete(key); return n; });

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <h1 className="font-display text-4xl font-bold mb-2">Courses</h1>
      <p className="opacity-60 mb-8">Learn programming and computer science — in your language.</p>

      {msg && (
        <div className={`mb-6 px-4 py-3 rounded-xl text-sm border ${msg.startsWith("✓") ? "bg-green-50 border-green-200 text-green-700 dark:bg-green-950/40 dark:text-green-400 dark:border-green-800" : "bg-red-50 border-red-200 text-red-700 dark:bg-red-950/40 dark:text-red-400"}`}>
          {msg}
        </div>
      )}

      {/* ── Filters ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 mb-8">
        <input
          className="input max-w-xs"
          placeholder="🔍 Search courses…"
          value={q}
          onChange={e => setParam("q", e.target.value)}
        />

        <select className="input w-auto" value={level} onChange={e => setParam("level", e.target.value)}>
          <option value="">All levels</option>
          {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
        </select>

        <select className="input w-auto" value={catSlug} onChange={e => setParam("category", e.target.value)}>
          <option value="">All categories</option>
          {categories.map(c => <option key={c.slug} value={c.slug}>{c.icon} {c.name}</option>)}
        </select>

        {(q || catSlug || level) && (
          <button className="btn-alt text-sm" onClick={() => setSearchParams({})}>Clear filters</button>
        )}
      </div>

      {/* ── Category chips ───────────────────────────────────────────── */}
      {!q && !catSlug && !level && (
        <div className="flex flex-wrap gap-2 mb-8">
          {categories.map(c => (
            <button
              key={c.slug}
              onClick={() => setParam("category", c.slug)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-stone-200 dark:border-teal-800 text-sm hover:bg-leaf hover:text-white hover:border-leaf transition">
              <span>{c.icon}</span>
              <span>{c.name}</span>
              <span className="opacity-50 text-xs">({c.course_count})</span>
            </button>
          ))}
        </div>
      )}

      {/* ── Grid ─────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-stone-200 dark:border-teal-900 overflow-hidden">
              <div className="skeleton h-44" />
              <div className="p-4 space-y-2">
                <div className="skeleton h-4 w-20" />
                <div className="skeleton h-5 w-full" />
                <div className="skeleton h-4 w-3/4" />
              </div>
            </div>
          ))}
        </div>
      ) : courses.length === 0 ? (
        <div className="text-center py-24 opacity-50">
          <p className="text-5xl mb-4">🔍</p>
          <p className="text-xl font-semibold">No courses found</p>
          <p className="text-sm mt-2">Try different search terms or clear filters.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-5">
          {courses.map(c => (
            <CourseCard key={c.id} c={c} />
          ))}
        </div>
      )}
    </main>
  );
}
