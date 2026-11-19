import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { apiAll } from "../api.js";

const STATS = [
  { value: "17+",  label: "Courses" },
  { value: "78+",  label: "Lessons" },
  { value: "15",   label: "Languages" },
  { value: "100%", label: "Free to explore" },
];

const FEATURES = [
  { icon: "🎙️", title: "Real-time Speech Translation", desc: "Live classes broadcast in English; every student hears their own language via Google STT + TTS." },
  { icon: "📺", title: "YouTube-powered Lessons",      desc: "Curated lectures from top educators — freeCodeCamp, CS50, Traversy Media — embedded right inside the platform." },
  { icon: "📝", title: "Translated Subtitles",         desc: "On-demand captions translated into Hindi, Spanish, Tamil, Telugu, Bengali, French and more." },
  { icon: "🔊", title: "Dubbed Audio",                 desc: "Full TTS dubbing into your preferred language — generated on demand, cached for instant replay." },
  { icon: "📈", title: "Progress Tracking",            desc: "Track completed lessons, watch time, and overall course progress from your personal dashboard." },
  { icon: "🎓", title: "Teacher Tools",                desc: "Create courses, upload lessons, schedule live classes and monitor student statistics." },
];

export default function Landing({ user }) {
  const [courses, setCourses] = useState([]);
  useEffect(() => { apiAll("/courses/?page_size=6").then(c => setCourses(c.slice(0, 6))).catch(() => {}); }, []);

  return (
    <main>
      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-950 via-ink to-teal-900 dark:from-ink dark:via-ink text-white">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "radial-gradient(circle at 20% 50%, #0f766e 0%, transparent 50%), radial-gradient(circle at 80% 20%, #f59e0b 0%, transparent 40%)" }} />
        <div className="relative mx-auto max-w-6xl px-6 py-24 md:py-36">
          <div className="flex items-end gap-1 h-10 mb-8" aria-hidden>
            {[0, .2, .4, .1, .3, .5, .15, .35, .05, .25].map((d, i) => (
              <span key={i} className="bar" style={{ animationDelay: d + "s" }} />
            ))}
          </div>
          <h1 className="font-display text-5xl md:text-7xl font-extrabold leading-tight max-w-4xl">
            Learn. Explore.<br />
            <span className="text-saffron">Grow.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-white/80">
            Learnova gives you live classes, translated subtitles, AI-dubbed audio, comic life
            stories, quizzes, and career roadmaps — all in one place, in your language.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            {user ? (
              <Link className="btn text-base px-7 py-3" to="/dashboard">Go to Dashboard</Link>
            ) : (
              <>
                <Link className="btn text-base px-7 py-3" to="/register">Start learning free</Link>
                <Link className="btn-alt text-base px-7 py-3 border-white/30 text-white hover:bg-white/10" to="/courses">
                  Browse courses
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ── Stats ─────────────────────────────────────────────────────── */}
      <section className="bg-leaf/5 dark:bg-teal-950/40 border-y border-leaf/20">
        <div className="mx-auto max-w-5xl px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {STATS.map(s => (
            <div key={s.label}>
              <p className="font-display text-4xl font-extrabold text-leaf">{s.value}</p>
              <p className="text-sm opacity-70 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="font-display text-4xl font-bold text-center mb-12">
          Everything you need to <span className="text-leaf">learn, explore & grow</span>
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          {FEATURES.map(f => (
            <div key={f.title} className="card hover:shadow-md transition-shadow">
              <div className="text-4xl mb-3">{f.icon}</div>
              <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
              <p className="text-sm opacity-70 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Sample Courses ────────────────────────────────────────────── */}
      {courses.length > 0 && (
        <section className="bg-stone-50 dark:bg-teal-950/30 border-y border-stone-200 dark:border-teal-900">
          <div className="mx-auto max-w-6xl px-6 py-20">
            <div className="flex items-center justify-between mb-8">
              <h2 className="font-display text-3xl font-bold">Featured courses</h2>
              <Link to="/courses" className="btn-alt text-sm">View all →</Link>
            </div>
            <div className="grid md:grid-cols-3 gap-5">
              {courses.map(c => (
                <Link key={c.id} to={`/courses/${c.id}`} className="card-hover group">
                  <img
                    src={c.thumbnail || `https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg`}
                    alt={c.title}
                    className="w-full h-40 object-cover rounded-xl mb-3 group-hover:opacity-90 transition"
                  />
                  <div className="flex items-center gap-2 mb-2">
                    {c.category_icon && <span>{c.category_icon}</span>}
                    <span className="badge-green">{c.level}</span>
                    <span className="text-xs opacity-50">{c.lesson_count} lessons</span>
                  </div>
                  <h3 className="font-semibold leading-snug line-clamp-2">{c.title}</h3>
                  <p className="text-xs opacity-60 mt-1">by {c.teacher_name}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── CTA ───────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-3xl px-6 py-24 text-center">
        <h2 className="font-display text-4xl font-bold mb-4">Ready to start your journey?</h2>
        <p className="opacity-70 mb-8">Create a free Learnova account and start learning in Hindi, Spanish, Tamil, French and more.</p>
        {!user && <Link className="btn text-lg px-10 py-4" to="/register">Create free account</Link>}
        {user && <Link className="btn text-lg px-10 py-4" to="/courses">Browse all courses</Link>}
      </section>
    </main>
  );
}
