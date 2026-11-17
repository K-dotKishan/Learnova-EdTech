import { useEffect, useState } from "react";
import { api } from "../api.js";

const STAGE_COLORS = {
  beginner:     { bg: "from-green-500 to-emerald-600", badge: "bg-green-900/40 text-green-300 border-green-500/30" },
  intermediate: { bg: "from-blue-500 to-indigo-600",  badge: "bg-blue-900/40 text-blue-300 border-blue-500/30" },
  advanced:     { bg: "from-purple-500 to-pink-600",  badge: "bg-purple-900/40 text-purple-300 border-purple-500/30" },
};

function ProgressRing({ percent, size = 80, stroke = 8, color = "#0f766e" }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (percent / 100) * circ;
  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color}
        strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 0.6s ease" }} />
      <text x={size / 2} y={size / 2} dominantBaseline="middle" textAnchor="middle"
        fill="white" fontSize={size / 5} fontWeight="bold" className="rotate-90"
        style={{ transform: `rotate(90deg) translate(0, -${size / 2}px)` }}>
      </text>
    </svg>
  );
}

function PathCard({ path, progress, onClick }) {
  const pct = progress?.percent || 0;
  return (
    <button onClick={() => onClick(path)}
      className="group relative overflow-hidden rounded-2xl text-left hover:-translate-y-1 transition-all duration-300 shadow-lg hover:shadow-2xl">
      <div className={`bg-gradient-to-br ${path.color} p-6 relative`} style={{ minHeight: 160 }}>
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "radial-gradient(circle at 80% 20%, white 0%, transparent 50%)" }} />
        <div className="relative">
          <div className="text-5xl mb-3">{path.icon}</div>
          <h3 className="font-display font-bold text-xl text-white leading-tight">{path.title}</h3>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-white/70 bg-black/20 px-2 py-0.5 rounded-full">
              🔥 {path.demand} demand
            </span>
            {path.avg_salary && (
              <span className="text-xs text-white/70 bg-black/20 px-2 py-0.5 rounded-full">
                💰 {path.avg_salary}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="bg-stone-900 px-5 py-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-white/50">Roadmap Progress</span>
          <span className="text-xs font-bold" style={{ color: pct > 0 ? "#10b981" : "#ffffff40" }}>{pct}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full rounded-full bg-leaf transition-all duration-700"
            style={{ width: pct + "%" }} />
        </div>
        <p className="text-white/50 text-xs mt-3 line-clamp-2 leading-relaxed">{path.overview?.slice(0, 90)}…</p>
        <div className="mt-3 inline-flex items-center gap-1 text-leaf text-sm font-semibold group-hover:gap-2 transition-all">
          View Roadmap <span>→</span>
        </div>
      </div>
    </button>
  );
}

function SkillChip({ skill, completed, onToggle }) {
  return (
    <button onClick={() => onToggle(skill.id)}
      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border transition-all
        ${completed
          ? "bg-leaf/20 border-leaf/40 text-leaf line-through opacity-80"
          : "border-white/15 text-white/70 hover:border-white/30 hover:text-white"
        }`}>
      <span className={`w-4 h-4 rounded-full border flex-shrink-0 flex items-center justify-center text-xs
        ${completed ? "bg-leaf border-leaf" : "border-white/30"}`}>
        {completed && "✓"}
      </span>
      <span>{skill.name}</span>
      {skill.is_core && <span className="text-xs opacity-40">★</span>}
    </button>
  );
}

function RoadmapDetail({ path, user, onBack }) {
  const [stages, setStages]       = useState(path.stages || []);
  const [progress, setProgress]   = useState({ total: 0, completed: 0, percent: 0 });
  const [localDone, setLocalDone] = useState(() => {
    try { return JSON.parse(localStorage.getItem(`career_${path.slug}`) || "[]"); } catch { return []; }
  });

  useEffect(() => {
    // Fetch with auth (progress per user) or use local
    api(`/careers/${path.slug}/`).then(d => {
      setStages(d.stages || []);
    }).catch(() => {});
    api(`/careers/${path.slug}/progress/`).then(p => setProgress(p)).catch(() => {});
  }, [path.slug]);

  function isCompleted(skillId) {
    if (user) return stages.flatMap(s => s.skills).find(sk => sk.id === skillId)?.completed || false;
    return localDone.includes(skillId);
  }

  async function toggleSkill(skillId) {
    if (!user) {
      // Guest: toggle in localStorage
      const next = localDone.includes(skillId)
        ? localDone.filter(id => id !== skillId)
        : [...localDone, skillId];
      setLocalDone(next);
      localStorage.setItem(`career_${path.slug}`, JSON.stringify(next));
      // Recompute progress locally
      const totalSkills = stages.flatMap(s => s.skills).length;
      const doneCount = next.length;
      setProgress({ total: totalSkills, completed: doneCount, percent: totalSkills ? Math.round(doneCount / totalSkills * 100) : 0 });
      return;
    }
    try {
      const r = await api(`/careers/skills/${skillId}/toggle/`, { method: "POST" });
      // Update skill in stages
      setStages(prev => prev.map(st => ({
        ...st,
        skills: st.skills.map(sk => sk.id === skillId ? { ...sk, completed: r.completed } : sk)
      })));
      // Refresh progress
      api(`/careers/${path.slug}/progress/`).then(p => setProgress(p)).catch(() => {});
    } catch {}
  }

  const totalStages = stages.length;

  return (
    <div>
      {/* Back + header */}
      <button onClick={onBack} className="flex items-center gap-2 text-white/50 hover:text-white text-sm mb-6 transition">
        ← All Careers
      </button>

      {/* Hero */}
      <div className={`rounded-3xl overflow-hidden mb-8 relative bg-gradient-to-br ${path.color}`} style={{ minHeight: 200 }}>
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "radial-gradient(circle at 10% 50%, rgba(255,255,255,0.4) 0%, transparent 40%)" }} />
        <div className="relative p-8 flex items-center gap-6 flex-wrap">
          <div className="relative">
            <ProgressRing percent={progress.percent} size={90} stroke={7} />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-3xl">{path.icon}</span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-4xl font-extrabold text-white mb-1">{path.title}</h1>
            <div className="flex items-center gap-3 flex-wrap mb-3">
              <span className="text-white/60 text-sm">🔥 {path.demand} demand</span>
              {path.avg_salary && <span className="text-white/60 text-sm">💰 {path.avg_salary}</span>}
              <span className="text-white/60 text-sm">✅ {progress.completed}/{progress.total} skills done</span>
            </div>
            <p className="text-white/80 text-sm leading-relaxed max-w-xl">{path.overview}</p>
          </div>
          <div className="text-right hidden md:block">
            <div className="text-3xl font-black text-white">{progress.percent}%</div>
            <div className="text-white/50 text-xs">Complete</div>
          </div>
        </div>
      </div>

      {/* Guest notice */}
      {!user && (
        <div className="rounded-2xl px-5 py-3 mb-6 bg-saffron/10 border border-saffron/30 text-saffron text-sm">
          💡 Sign in to sync your progress across devices. Guest progress is saved in your browser.
        </div>
      )}

      {/* Roadmap stages */}
      <div className="relative">
        {/* Vertical timeline line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-white/10 hidden md:block" />

        {stages.map((stage, idx) => {
          const cfg = STAGE_COLORS[stage.stage] || STAGE_COLORS.beginner;
          const stageSkills = stage.skills || [];
          const doneInStage = stageSkills.filter(sk => isCompleted(sk.id)).length;
          const stagePct = stageSkills.length ? Math.round(doneInStage / stageSkills.length * 100) : 0;

          return (
            <div key={stage.id} className="relative md:pl-16 mb-8">
              {/* Timeline dot */}
              <div className={`absolute left-0 top-6 w-12 h-12 rounded-full bg-gradient-to-br ${cfg.bg} hidden md:flex items-center justify-center text-white font-bold text-lg shadow-lg z-10`}>
                {idx + 1}
              </div>

              <div className="rounded-2xl overflow-hidden"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                {/* Stage header */}
                <div className={`px-6 py-4 flex items-center justify-between gap-4 border-b border-white/5`}>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className={`text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full border ${cfg.badge}`}>
                      {stage.stage}
                    </span>
                    <h3 className="font-display font-bold text-lg text-white">{stage.title}</h3>
                    {stage.duration && (
                      <span className="text-xs text-white/40 bg-white/5 px-2 py-0.5 rounded-full">
                        ⏱ {stage.duration}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-white/40">{doneInStage}/{stageSkills.length}</span>
                    <div className="w-16 h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full rounded-full bg-leaf transition-all"
                        style={{ width: stagePct + "%" }} />
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  {stage.description && (
                    <p className="text-white/50 text-sm mb-4 leading-relaxed">{stage.description}</p>
                  )}
                  {/* Skills */}
                  <div className="flex flex-wrap gap-2">
                    {stageSkills.map(skill => (
                      <SkillChip key={skill.id} skill={skill}
                        completed={isCompleted(skill.id)}
                        onToggle={toggleSkill} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Career tips */}
      <div className="rounded-2xl p-6 mt-4"
        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <h3 className="font-display text-lg font-bold text-white mb-4">💡 Career Tips</h3>
        <div className="grid md:grid-cols-2 gap-3 text-sm text-white/60 leading-relaxed">
          <div className="flex gap-2"><span>🏗️</span><span>Build 2-3 portfolio projects at each stage before moving to the next.</span></div>
          <div className="flex gap-2"><span>📝</span><span>Contribute to open source projects to demonstrate real-world experience.</span></div>
          <div className="flex gap-2"><span>🤝</span><span>Network on LinkedIn and GitHub. Connections lead to opportunities.</span></div>
          <div className="flex gap-2"><span>📚</span><span>Stay current — technology evolves fast. Follow official docs and blogs.</span></div>
          <div className="flex gap-2"><span>🎯</span><span>Focus on core skills first (starred ★) before optional ones.</span></div>
          <div className="flex gap-2"><span>⚡</span><span>Practice on LeetCode/HackerRank daily to sharpen problem-solving.</span></div>
        </div>
      </div>
    </div>
  );
}

export default function CareerCompass({ user }) {
  const [paths, setPaths]         = useState([]);
  const [progressMap, setProgressMap] = useState({});
  const [selected, setSelected]   = useState(null);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    setLoading(true);
    api("/careers/").then(async data => {
      setPaths(data);
      // Fetch progress for each path
      const progEntries = await Promise.all(
        data.map(p => api(`/careers/${p.slug}/progress/`).then(r => [p.slug, r]).catch(() => [p.slug, {}]))
      );
      setProgressMap(Object.fromEntries(progEntries));
    }).catch(() => {}).finally(() => setLoading(false));
  }, [user]);

  if (selected) {
    return (
      <div className="min-h-screen bg-stone-950 text-white">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <RoadmapDetail path={selected} user={user} onBack={() => setSelected(null)} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-950 text-white">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0"
          style={{ background: "linear-gradient(135deg, #0a0a1a, #0f1f3d, #0a0a1a)" }} />
        <div className="absolute inset-0 opacity-20"
          style={{ backgroundImage: "radial-gradient(circle at 30% 40%, #0f766e 0%, transparent 40%), radial-gradient(circle at 70% 60%, #7c3aed 0%, transparent 40%)" }} />
        <div className="relative z-10 max-w-6xl mx-auto px-6 py-12 text-center">
          <div className="text-6xl mb-4">🧭</div>
          <h1 className="font-display text-5xl md:text-6xl font-extrabold mb-3">
            Career <span className="text-leaf">Compass</span>
          </h1>
          <p className="text-white/70 text-lg max-w-xl mx-auto">
            Explore structured learning roadmaps for 8 high-demand tech careers.
            Track your skills and measure your progress.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-10">
        {/* Stats summary */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          {[["8", "Career Paths"], ["128", "Skills Covered"], ["3", "Difficulty Stages"]].map(([v, l]) => (
            <div key={l} className="rounded-2xl p-4 text-center"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="text-3xl font-black text-leaf">{v}</div>
              <div className="text-white/40 text-xs mt-1">{l}</div>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array(8).fill(0).map((_, i) => <div key={i} className="skeleton h-72 rounded-2xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {paths.map(p => (
              <PathCard key={p.slug} path={p} progress={progressMap[p.slug]} onClick={setSelected} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
