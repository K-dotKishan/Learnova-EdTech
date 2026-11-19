import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../api.js";

export default function Auth({ mode, setUser }) {
  const [form, setForm] = useState({ username: "", email: "", password: "", role: "student" });
  const [err, setErr]   = useState("");
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      if (mode === "register") {
        await api("/auth/register/", { method: "POST", body: form });
      }
      const t = await api("/auth/login/", {
        method: "POST",
        body: { username: form.username, password: form.password },
      });
      localStorage.setItem("token", t.access);
      const me = await api("/auth/me/");
      setUser(me);
      nav("/dashboard");
    } catch (x) {
      setErr(x.message);
    } finally {
      setLoading(false);
    }
  }

  const isLogin = mode === "login";

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-stone-50 to-teal-50 dark:from-ink dark:to-teal-950">
      <form onSubmit={submit} className="card w-full max-w-sm space-y-4">
        <div className="text-center mb-2">
          <span className="text-4xl">🌿</span>
          <h2 className="font-display text-2xl font-bold mt-2">
            {isLogin ? "Welcome back to Learnova" : "Join Learnova"}
          </h2>
          <p className="text-sm opacity-60 mt-1">
            {isLogin ? "Sign in to continue learning" : "Start your learning journey today"}
          </p>
        </div>

        {err && (
          <div role="alert" className="rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
            {err}
          </div>
        )}

        <div className="space-y-3">
          <input
            className="input"
            placeholder="Username"
            value={form.username}
            onChange={set("username")}
            autoFocus
            required
          />

          {!isLogin && (
            <input
              className="input"
              type="email"
              placeholder="Email (optional)"
              value={form.email}
              onChange={set("email")}
            />
          )}

          <input
            className="input"
            type="password"
            placeholder="Password (6+ characters)"
            value={form.password}
            onChange={set("password")}
            required
          />

          {!isLogin && (
            <select className="input" value={form.role} onChange={set("role")}>
              <option value="student">I am a student</option>
              <option value="teacher">I am a teacher</option>
            </select>
          )}
        </div>

        <button className="btn w-full" disabled={loading}>
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
              {isLogin ? "Signing in…" : "Creating account…"}
            </span>
          ) : isLogin ? "Sign in" : "Create account"}
        </button>

        <p className="text-sm text-center opacity-70">
          {isLogin ? (
            <>New here? <Link className="text-leaf font-medium hover:underline" to="/register">Create account</Link></>
          ) : (
            <>Already have an account? <Link className="text-leaf font-medium hover:underline" to="/login">Sign in</Link></>
          )}
        </p>

        {isLogin && (
          <div className="border-t border-stone-200 dark:border-teal-900 pt-3 text-xs opacity-60 text-center space-y-1">
            <p>Demo accounts:</p>
            <p>student / demo123 &nbsp;·&nbsp; teacher / demo123</p>
          </div>
        )}
      </form>
    </div>
  );
}
