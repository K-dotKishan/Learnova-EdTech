import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, apiAll } from "../api.js";

function StatCard({ icon, label, value, color = "bg-leaf" }) {
  return (
    <div className="card flex items-center gap-4">
      <div className={`${color} rounded-xl p-3 text-white text-2xl flex-shrink-0`}>{icon}</div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm opacity-60">{label}</p>
      </div>
    </div>
  );
}

export default function Dashboard({ user, setUser }) {
  const [data, setData]       = useState(null);
  const [langs, setLangs]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg]         = useState("");

  // Teacher: create course
  const [courseForm, setCourseForm] = useState({ title: "", description: "", level: "Beginner" });
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api("/dashboard/"),
      apiAll("/languages/"),
      apiAll("/categories/"),
    ]).then(([d, l, cats]) => {
      setData(d);
      setLangs(l);
      setCategories(cats);
    }).catch(e => setMsg(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function setLang(code) {
    try {
      const updated = await api("/auth/me/", { method: "PATCH", body: { preferred_language: code } });
      setUser(updated);
      setMsg("✓ Language preference saved.");
    } catch (e) { setMsg(e.message); }
  }

  async function createCourse() {
    try {
      await api("/courses/", { method: "POST", body: courseForm });
      setCourseForm({ title: "", description: "", level: "Beginner" });
      const d = await api("/dashboard/");
      setData(d);
      setMsg("✓ Course created!");
    } catch (e) { setMsg(e.message); }
  }

  async function deleteCourse(id) {
    if (!confirm("Delete this course and all its lessons?")) return;
    try {
      await api(`/courses/${id}/`, { method: "DELETE" });
      const d = await api("/dashboard/");
      setData(d);
    } catch (e) { setMsg(e.message); }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-10 space-y-6">
        <div className="skeleton h-10 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="skeleton h-24" />)}
        </div>
        <div className="skeleton h-64" />
      </div>
    );
  }

  const isTeacher = user.role === "teacher";

  return (
    <main className="mx-auto max-w-6xl px-6 py-10 space-y-8">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div>
        <h1 className="font-display text-4xl font-bold">
          Welcome back, {user.first_name || user.username} 👋
        </h1>
        <p className="opacity-60 mt-1 text-sm">
          {isTeacher ? "Manage your courses and track student progress." : "Pick up where you left off."}
        </p>
      </div>

      {msg && (
        <div className={`px-4 py-3 rounded-xl text-sm border ${msg.startsWith("✓") ? "bg-green-50 border-green-200 text-green-700 dark:bg-green-950/40 dark:text-green-400" : "bg-red-50 border-red-200 text-red-700"}`}>
          {msg}
        </div>
      )}

      {/* ── Stats ───────────────────────────────────────────────────── */}
      {isTeacher ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatCard icon="📚" label="Courses" value={data?.courses_count ?? 0} />
          <StatCard icon="👥" label="Total students" value={data?.total_students ?? 0} color="bg-blue-600" />
          <StatCard icon="🌐" label="Languages supported" value="15" color="bg-purple-600" />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon="📚" label="Enrolled courses" value={data?.enrolled_courses ?? 0} />
          <StatCard icon="⏱️" label="Watch time (min)" value={data?.total_watch_minutes ?? 0} color="bg-blue-600" />
          <StatCard icon="✅" label="Completed lessons"
            value={data?.courses?.reduce((a, c) => a + (c.completed_lessons || 0), 0) ?? 0}
            color="bg-green-600" />
          <StatCard icon="🌐" label="Preferred language"
            value={user.preferred_language?.flag || "🌐"}
            color="bg-purple-600" />
        </div>
      )}

      {/* ── Student: Language preference ─────────────────────────── */}
      {!isTeacher && (
        <section className="card">
          <h2 className="font-semibold mb-3">🌐 Preferred Learning Language</h2>
          <p className="text-sm opacity-60 mb-3">
            All video subtitles and translated audio will default to this language.
          </p>
          <div className="flex flex-wrap gap-2">
            {langs.map(l => (
              <button
                key={l.code}
                onClick={() => setLang(l.code)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition ${user.preferred_language?.code === l.code ? "border-leaf bg-leaf/10 text-leaf font-medium" : "border-stone-200 dark:border-teal-800 hover:border-leaf"}`}>
                {l.flag} {l.name}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ── Student: Recent lessons ──────────────────────────────── */}
      {!isTeacher && data?.recent_lessons?.length > 0 && (
        <section>
          <h2 className="section-title">▶ Continue Learning</h2>
          <div className="space-y-3">
            {data.recent_lessons.map(r => (
              <div key={r.lesson_id} className="card flex items-center justify-between">
                <div>
                  <p className="font-medium">{r.lesson_title}</p>
                  <p className="text-xs opacity-50">{r.course_title}</p>
                </div>
                <Link className="btn-sm" to={`/learn/${r.course_id}/${r.lesson_id}`}>
                  {r.completed ? "Rewatch" : "Resume"}
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Courses ─────────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title mb-0">
            {isTeacher ? "Your Courses" : "Enrolled Courses"}
          </h2>
          {!isTeacher && (
            <Link to="/courses" className="btn-alt text-sm">Browse more</Link>
          )}
        </div>

        {data?.courses?.length === 0 ? (
          <div className="card text-center py-12 opacity-60">
            {isTeacher ? (
              <p>You haven't created any courses yet. Create your first one below.</p>
            ) : (
              <p>You're not enrolled in any courses yet. <Link className="text-leaf underline" to="/courses">Browse courses</Link></p>
            )}
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-5">
            {data?.courses?.map(c => (
              <div key={c.id} className="card flex flex-col">
                {c.thumbnail && (
                  <img src={c.thumbnail} alt={c.title}
                    className="w-full h-36 object-cover rounded-xl mb-3"
                    onError={e => { e.target.style.display="none"; }} />
                )}
                <div className="flex-1">
                  <Link to={`/courses/${c.id}`} className="font-semibold hover:text-leaf transition leading-snug block mb-1">
                    {c.title}
                  </Link>
                  <p className="text-xs opacity-50">{c.lesson_count} lessons · {c.student_count} students</p>

                  {/* Progress for student */}
                  {!isTeacher && (
                    <div className="mt-3">
                      <div className="flex justify-between text-xs mb-1 opacity-50">
                        <span>{c.completed_lessons}/{c.lesson_count} done</span>
                        <span>{c.progress_percent}%</span>
                      </div>
                      <div className="progress-bar"><div className="progress-fill" style={{ width: c.progress_percent + "%" }} /></div>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 mt-3 pt-3 border-t border-stone-100 dark:border-teal-900/50">
                  {!isTeacher && c.lessons?.[0] && (
                    <Link to={`/courses/${c.id}`} className="btn-sm flex-1 text-center">View</Link>
                  )}
                  {isTeacher && (
                    <>
                      <Link to={`/courses/${c.id}`} className="btn-sm flex-1 text-center">Manage</Link>
                      <button onClick={() => deleteCourse(c.id)} className="btn-ghost text-red-500 text-sm px-2">Delete</button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Teacher: Create Course ───────────────────────────────────── */}
      {isTeacher && (
        <section className="card space-y-4">
          <h2 className="font-display text-xl font-bold">➕ Create New Course</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <input className="input" placeholder="Course title" value={courseForm.title}
              onChange={e => setCourseForm({ ...courseForm, title: e.target.value })} />
            <select className="input" value={courseForm.level}
              onChange={e => setCourseForm({ ...courseForm, level: e.target.value })}>
              <option>Beginner</option>
              <option>Intermediate</option>
              <option>Advanced</option>
            </select>
          </div>
          <select className="input" value={courseForm.category || ""}
            onChange={e => setCourseForm({ ...courseForm, category: e.target.value || undefined })}>
            <option value="">Select category…</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>
          <textarea className="input h-24 resize-none" placeholder="Course description"
            value={courseForm.description}
            onChange={e => setCourseForm({ ...courseForm, description: e.target.value })} />
          <input className="input" placeholder="Thumbnail URL (optional)"
            value={courseForm.thumbnail || ""}
            onChange={e => setCourseForm({ ...courseForm, thumbnail: e.target.value })} />
          <button className="btn" onClick={createCourse} disabled={!courseForm.title || !courseForm.description}>
            Create Course
          </button>
        </section>
      )}
    </main>
  );
}
