import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { api, apiAll } from "../api.js";

function fmtDur(secs) {
  if (!secs) return "";
  const m = Math.floor(secs / 60), s = secs % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function Course({ user }) {
  const { id } = useParams();
  const nav = useNavigate();
  const [course, setCourse]     = useState(null);
  const [progress, setProgress] = useState(null);
  const [enrolled, setEnrolled] = useState(false);
  const [loading, setLoading]   = useState(true);
  const [msg, setMsg]           = useState("");
  // Teacher: add lesson form
  const [lessonForm, setLessonForm] = useState({ title: "", youtube_id: "", description: "" });
  const [liveForm, setLiveForm]     = useState({ title: "", scheduled_at: "" });
  const [showAdd, setShowAdd]       = useState(false);

  const isOwner = user?.role === "teacher" && course && user.username === course.teacher_name;

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api(`/courses/${id}/`),
      user ? api(`/courses/${id}/progress/`).catch(() => null) : Promise.resolve(null),
    ]).then(([c, p]) => {
      setCourse(c);
      setProgress(p);
      if (p && user) setEnrolled(true);
    }).catch(e => setMsg(e.message))
      .finally(() => setLoading(false));
  }, [id, user]);

  async function enroll() {
    try {
      await api(`/courses/${id}/enroll/`, { method: "POST" });
      setEnrolled(true);
      setMsg("✓ Enrolled successfully!");
      const p = await api(`/courses/${id}/progress/`);
      setProgress(p);
    } catch (e) { setMsg(e.message); }
  }

  async function addLesson() {
    try {
      const payload = { course: id, ...lessonForm, order: (course.lessons?.length || 0) + 1 };
      await api("/lessons/", { method: "POST", body: payload });
      setMsg("✓ Lesson added!");
      setLessonForm({ title: "", youtube_id: "", description: "" });
      const updated = await api(`/courses/${id}/`);
      setCourse(updated);
    } catch (e) { setMsg(e.message); }
  }

  async function addLive() {
    try {
      await api("/live-classes/", { method: "POST", body: { course: id, ...liveForm } });
      setMsg("✓ Live class scheduled!");
      setLiveForm({ title: "", scheduled_at: "" });
      const updated = await api(`/courses/${id}/`);
      setCourse(updated);
    } catch (e) { setMsg(e.message); }
  }

  async function deleteLesson(lid) {
    if (!confirm("Delete this lesson?")) return;
    try {
      await api(`/lessons/${lid}/`, { method: "DELETE" });
      const updated = await api(`/courses/${id}/`);
      setCourse(updated);
    } catch (e) { setMsg(e.message); }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-10 space-y-4">
        <div className="skeleton h-8 w-1/2" />
        <div className="skeleton h-48 w-full" />
        <div className="grid md:grid-cols-2 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="skeleton h-20" />)}
        </div>
      </div>
    );
  }
  if (!course) return <p className="p-10 text-center opacity-60">Course not found.</p>;

  const totalLessons = course.lessons?.length || 0;
  const doneLessons  = progress?.completed_lessons || 0;
  const pct          = progress?.percent || 0;

  return (
    <main className="mx-auto max-w-5xl px-6 py-10 space-y-8">
      {/* ── Hero ────────────────────────────────────────────────────── */}
      <div className="card md:flex gap-6 items-start">
        {course.thumbnail && (
          <img src={course.thumbnail} alt={course.title}
            className="w-full md:w-64 h-40 object-cover rounded-xl flex-shrink-0"
            onError={e => { e.target.style.display = "none"; }} />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap gap-2 mb-3">
            {course.category_icon && <span className="text-xl">{course.category_icon}</span>}
            <span className={`badge ${course.level === "Beginner" ? "badge-green" : course.level === "Intermediate" ? "badge-blue" : "badge-orange"}`}>
              {course.level}
            </span>
            {course.category_name && <span className="badge-purple">{course.category_name}</span>}
          </div>
          <h1 className="font-display text-3xl font-bold mb-2">{course.title}</h1>
          <p className="opacity-70 mb-4 leading-relaxed">{course.description}</p>
          <div className="flex flex-wrap gap-4 text-sm opacity-60">
            <span>👨‍🏫 {course.teacher_name}</span>
            <span>📚 {totalLessons} lessons</span>
            <span>👥 {course.student_count} students</span>
          </div>

          {/* Progress bar */}
          {enrolled && progress && (
            <div className="mt-4">
              <div className="flex justify-between text-xs mb-1 opacity-60">
                <span>{doneLessons}/{totalLessons} lessons completed</span>
                <span>{pct}%</span>
              </div>
              <div className="progress-bar"><div className="progress-fill" style={{ width: pct + "%" }} /></div>
            </div>
          )}

          {/* CTA */}
          <div className="mt-5 flex flex-wrap gap-3">
            {/* Primary: start/continue learning — open to everyone */}
            {course.lessons?.length > 0 && (
              <Link
                className="btn"
                to={`/learn/${id}/${course.lessons[0].id}`}>
                {doneLessons > 0 ? "Continue learning" : "Start learning"}
              </Link>
            )}
            {/* Optional enroll for logged-in students (saves progress to account) */}
            {user && !isOwner && !enrolled && (
              <button className="btn-alt" onClick={enroll}>Save to my courses</button>
            )}
            {!user && (
              <Link className="btn-alt" to="/register">
                Sign up to track progress
              </Link>
            )}
          </div>
        </div>
      </div>

      {msg && (
        <div className={`px-4 py-3 rounded-xl text-sm border ${msg.startsWith("✓") ? "bg-green-50 border-green-200 text-green-700 dark:bg-green-950/40 dark:text-green-400" : "bg-red-50 border-red-200 text-red-700 dark:bg-red-950/40 dark:text-red-400"}`}>
          {msg}
        </div>
      )}

      {/* ── Lessons ─────────────────────────────────────────────────── */}
      <section>
        <h2 className="section-title">📚 Lessons</h2>
        {course.lessons?.length === 0 ? (
          <p className="opacity-50">No lessons added yet.</p>
        ) : (
          <div className="space-y-2">
            {course.lessons.map((l, idx) => {
              const done = progress?.lessons?.[l.id]?.completed;
              return (
                <div key={l.id}
                  className={`flex items-center gap-4 p-4 rounded-xl border transition ${done ? "border-leaf/30 bg-leaf/5" : "border-stone-200 dark:border-teal-900"} hover:shadow-sm`}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold bg-stone-100 dark:bg-teal-900">
                    {done ? "✓" : idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium leading-snug ${done ? "line-through opacity-60" : ""}`}>{l.title}</p>
                    {l.duration_seconds > 0 && (
                      <p className="text-xs opacity-50 mt-0.5">🕐 {fmtDur(l.duration_seconds)}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {l.youtube_id && (
                      <span className="badge-blue text-xs">YouTube</span>
                    )}
                    {/* Everyone can watch lessons — no enrollment required */}
                    <Link className="btn-sm" to={`/learn/${id}/${l.id}`}>
                      {done ? "Rewatch" : "Watch"}
                    </Link>
                    {isOwner && (
                      <button className="btn-ghost text-red-500 text-xs" onClick={() => deleteLesson(l.id)}>✕</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Live Classes ─────────────────────────────────────────────── */}
      {course.live_classes?.length > 0 && (
        <section>
          <h2 className="section-title">🎙️ Live Classes</h2>
          <div className="space-y-3">
            {course.live_classes.map(l => (
              <div key={l.id} className="card flex items-center justify-between">
                <div>
                  <p className="font-medium">{l.title}</p>
                  <p className="text-xs opacity-50 mt-0.5">{new Date(l.scheduled_at).toLocaleString()}</p>
                </div>
                {user && (
                  <Link className="btn-sm" to={`/live/${l.id}`}>
                    {isOwner ? "Start class" : "Join"}
                  </Link>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Teacher Controls ─────────────────────────────────────────── */}
      {isOwner && (
        <section className="card space-y-6">
          <h2 className="font-display text-xl font-bold">Teacher Controls</h2>

          <div>
            <button className="btn-alt text-sm mb-4" onClick={() => setShowAdd(!showAdd)}>
              {showAdd ? "▲ Hide" : "▼ Add Lesson / Live Class"}
            </button>

            {showAdd && (
              <div className="grid md:grid-cols-2 gap-6">
                {/* Add lesson */}
                <div className="space-y-3">
                  <h3 className="font-semibold">Add Lesson</h3>
                  <input className="input" placeholder="Lesson title" value={lessonForm.title}
                    onChange={e => setLessonForm({ ...lessonForm, title: e.target.value })} />
                  <input className="input" placeholder="YouTube Video ID (e.g. dQw4w9WgXcQ)"
                    value={lessonForm.youtube_id}
                    onChange={e => setLessonForm({ ...lessonForm, youtube_id: e.target.value })} />
                  <textarea className="input h-20 resize-none" placeholder="Description (optional)"
                    value={lessonForm.description}
                    onChange={e => setLessonForm({ ...lessonForm, description: e.target.value })} />
                  <button className="btn" onClick={addLesson} disabled={!lessonForm.title}>Add Lesson</button>
                </div>

                {/* Schedule live class */}
                <div className="space-y-3">
                  <h3 className="font-semibold">Schedule Live Class</h3>
                  <input className="input" placeholder="Class title" value={liveForm.title}
                    onChange={e => setLiveForm({ ...liveForm, title: e.target.value })} />
                  <input className="input" type="datetime-local" value={liveForm.scheduled_at}
                    onChange={e => setLiveForm({ ...liveForm, scheduled_at: e.target.value })} />
                  <button className="btn" onClick={addLive} disabled={!liveForm.title || !liveForm.scheduled_at}>
                    Schedule
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      )}
    </main>
  );
}
