import { useEffect, useRef, useState, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { api } from "../api.js";
import useLang from "../hooks/useLang.js";

/* ── Panel type config ─────────────────────────────────────────────────────── */
const PANEL_CFG = {
  cover:       { label: "Cover",       color: "#f59e0b", border: "#fcd34d", bg: "from-amber-900/80 to-orange-900/80" },
  childhood:   { label: "Early Life",  color: "#10b981", border: "#6ee7b7", bg: "from-emerald-900/80 to-teal-900/80" },
  education:   { label: "Education",   color: "#3b82f6", border: "#93c5fd", bg: "from-blue-900/80 to-indigo-900/80" },
  challenge:   { label: "Challenge",   color: "#ef4444", border: "#fca5a5", bg: "from-red-900/80 to-rose-900/80" },
  achievement: { label: "Achievement", color: "#f59e0b", border: "#fcd34d", bg: "from-yellow-900/80 to-amber-900/80" },
  event:       { label: "Life Event",  color: "#8b5cf6", border: "#c4b5fd", bg: "from-violet-900/80 to-purple-900/80" },
  legacy:      { label: "Legacy",      color: "#0ea5e9", border: "#7dd3fc", bg: "from-sky-900/80 to-cyan-900/80" },
  lesson:      { label: "Lessons",     color: "#0f766e", border: "#5eead4", bg: "from-teal-900/80 to-green-900/80" },
};

/* Layout variants — 9 different compositions cycling through panels */
const LAYOUTS = [
  "full-bleed-portrait",    // 0: cover — full portrait, text overlay at bottom
  "split-left",             // 1: photo left 40%, text right 60%
  "split-right",            // 2: photo right 40%, text left 60%
  "banner-top",             // 3: wide photo top, text below
  "diagonal-cut",           // 4: diagonal split photo/text
  "text-center-overlay",    // 5: text centered over translucent photo
  "frame-portrait",         // 6: portrait framed with thick border
  "panorama-bottom",        // 7: narrow photo bottom strip
  "magazine-grid",          // 8: two-column grid variant
];

/* ── Quiz ─────────────────────────────────────────────────────────────────── */
function Quiz({ questions, lang }) {
  const [current, setCurrent]     = useState(0);
  const [selected, setSelected]   = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore]         = useState(0);

  if (!questions?.length) return null;
  const q = questions[current];

  function choose(opt) { if (!submitted) setSelected(s => ({ ...s, [current]: opt })); }
  function submit() {
    let s = 0; questions.forEach((q, i) => { if (selected[i] === q.correct) s++; });
    setScore(s); setSubmitted(true);
  }
  function restart() { setSelected({}); setSubmitted(false); setScore(0); setCurrent(0); }

  const optColor = key => {
    if (!submitted) return selected[current] === key
      ? "border-amber-400 bg-amber-900/40 text-amber-300 font-semibold"
      : "border-white/20 hover:border-amber-400/60 hover:bg-white/5 cursor-pointer";
    if (key === q.correct)        return "border-green-400 bg-green-900/40 text-green-300";
    if (selected[current] === key) return "border-red-400 bg-red-900/40 text-red-300";
    return "border-white/10 opacity-30";
  };

  return (
    <div className="rounded-3xl overflow-hidden border-2 border-saffron/40 bg-stone-900/90 mt-8 backdrop-blur-sm">
      {/* Header */}
      <div className="bg-gradient-to-r from-saffron/20 to-amber-600/20 px-6 py-4 border-b border-saffron/20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🎯</span>
          <h3 className="font-display text-xl font-bold text-white">Test Your Knowledge</h3>
        </div>
        <span className="text-sm text-white/50">{current + 1} / {questions.length}</span>
      </div>
      <div className="p-6">
        {submitted ? (
          <div className="text-center py-8">
            <div className="text-7xl mb-4">
              {score === questions.length ? "🏆" : score >= questions.length / 2 ? "⭐" : "📚"}
            </div>
            <p className="text-3xl font-bold text-white mb-2">{score}/{questions.length}</p>
            <p className="text-white/60 mb-6">
              {score === questions.length ? "Perfect! You know this legend well." : "Keep reading to learn more!"}
            </p>
            <button onClick={restart} className="btn">Try Again</button>
          </div>
        ) : (
          <>
            <div className="flex gap-1.5 mb-5">
              {questions.map((_, i) => (
                <button key={i} onClick={() => setCurrent(i)}
                  className={`h-1.5 rounded-full transition-all ${i === current ? "flex-1 bg-saffron" : selected[i] ? "w-6 bg-saffron/40" : "w-6 bg-white/20"}`} />
              ))}
            </div>
            <p className="text-white font-semibold text-lg mb-5 leading-snug">
              {lang === "hi" && q.question_hi ? q.question_hi : q.question}
            </p>
            <div className="space-y-2.5">
              {Object.entries(q.options).map(([key, val]) => (
                <button key={key} onClick={() => choose(key)}
                  className={`w-full text-left px-5 py-3.5 rounded-xl border text-sm transition-all ${optColor(key)}`}>
                  <span className="font-mono font-bold text-xs opacity-50 mr-2 uppercase">{key}.</span>
                  <span className="text-white/90">{val}</span>
                </button>
              ))}
            </div>
            {submitted && q.explanation && (
              <div className="mt-4 px-4 py-3 rounded-xl bg-blue-900/30 border border-blue-500/30 text-blue-300 text-sm">
                💡 {q.explanation}
              </div>
            )}
            <div className="flex justify-end mt-6">
              {current < questions.length - 1 ? (
                <button className="btn" disabled={!selected[current]} onClick={() => setCurrent(c => c + 1)}>
                  Next Question →
                </button>
              ) : (
                <button className="btn bg-saffron hover:bg-amber-600 text-stone-900 font-bold"
                  disabled={Object.keys(selected).length < questions.length} onClick={submit}>
                  Submit Quiz
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Halftone overlay SVG ─────────────────────────────────────────────────── */
function Halftone({ opacity = 0.07 }) {
  return (
    <div className="absolute inset-0 pointer-events-none" style={{ opacity }}>
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="dots" x="0" y="0" width="12" height="12" patternUnits="userSpaceOnUse">
            <circle cx="6" cy="6" r="1.5" fill="white" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dots)" />
      </svg>
    </div>
  );
}

/* ── Speech Bubble ─────────────────────────────────────────────────────────── */
function SpeechBubble({ text, color = "#f59e0b", side = "left" }) {
  if (!text) return null;
  return (
    <div className={`relative max-w-sm ${side === "right" ? "ml-auto" : ""}`}>
      <div className="rounded-2xl px-5 py-3.5 shadow-2xl"
        style={{ background: "rgba(255,255,255,0.97)", border: `3px solid ${color}` }}>
        <p className="text-sm font-medium leading-relaxed text-stone-800 italic">
          <span className="text-2xl not-italic font-black mr-1" style={{ color, lineHeight: 0.8 }}>"</span>
          {text}
          <span className="text-2xl not-italic font-black ml-1" style={{ color, lineHeight: 0.8 }}>"</span>
        </p>
      </div>
      {/* Bubble tail */}
      <div className={`absolute ${side === "right" ? "right-6" : "left-6"} -bottom-3`}>
        <div className="w-0 h-0"
          style={{ borderLeft: "10px solid transparent", borderRight: "10px solid transparent", borderTop: `14px solid ${color}` }} />
      </div>
      <div className={`absolute ${side === "right" ? "right-7" : "left-7"} -bottom-1.5`}>
        <div className="w-0 h-0"
          style={{ borderLeft: "9px solid transparent", borderRight: "9px solid transparent", borderTop: "13px solid rgba(255,255,255,0.97)" }} />
      </div>
    </div>
  );
}

/* ── Narration Box ─────────────────────────────────────────────────────────── */
function NarrationBox({ text, color = "#f59e0b", position = "bottom" }) {
  return (
    <div className="rounded-none px-5 py-4"
      style={{ background: "rgba(10,10,10,0.92)", borderLeft: `5px solid ${color}`, borderTop: position === "top" ? `2px solid ${color}30` : "none", borderBottom: position === "bottom" ? `2px solid ${color}30` : "none" }}>
      <p className="text-sm leading-relaxed text-white/90 font-medium">{text}</p>
    </div>
  );
}

/* ── Individual Comic Panel ────────────────────────────────────────────────── */
function ComicPanel({ panel, index, lang, isActive, isMini, onClick, legendPhoto }) {
  const cfg     = PANEL_CFG[panel.panel_type] || PANEL_CFG.event;
  const layout  = LAYOUTS[index % LAYOUTS.length];
  const title   = (lang === "hi" && panel.title_hi)     ? panel.title_hi     : panel.title;
  const narr    = (lang === "hi" && panel.narration_hi)  ? panel.narration_hi  : panel.narration;
  const bubble  = (lang === "hi" && panel.speech_bubble_hi) ? panel.speech_bubble_hi : panel.speech_bubble;
  const isCover = panel.panel_type === "cover";
  const photo   = legendPhoto;

  /* ── Mini thumbnail ─────────────────────────────────────────────────────── */
  if (isMini) {
    return (
      <div onClick={onClick}
        className={`relative rounded-xl overflow-hidden cursor-pointer transition-all duration-200 select-none
          ${isActive ? "ring-2 ring-offset-1 ring-leaf scale-105 shadow-lg" : "opacity-60 hover:opacity-100 hover:scale-102"}`}
        style={{ ringOffset: "2px" }}>
        <div className={`h-14 bg-gradient-to-br ${cfg.bg.replace("/80","")} relative overflow-hidden`}>
          {isCover && photo && (
            <img src={photo} alt="" className="w-full h-full object-cover object-top opacity-70" />
          )}
          <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${cfg.color}30, transparent)` }} />
          {/* Panel number */}
          <div className="absolute top-1 left-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center">
            <span className="text-white text-xs font-bold" style={{ fontSize: 9 }}>{index + 1}</span>
          </div>
        </div>
        <div className="bg-stone-900 px-2 py-1.5" style={{ borderTop: `2px solid ${cfg.color}` }}>
          <p className="text-white text-xs font-semibold leading-tight line-clamp-1">{title}</p>
        </div>
      </div>
    );
  }

  /* ── Full panel — different layout per index ───────────────────────────── */
  const panelBase = `rounded-2xl overflow-hidden border-3 transition-all duration-300 shadow-xl ${isActive ? "shadow-2xl" : ""}`;
  const borderStyle = { border: `3px solid ${cfg.border}40` };

  /* Layout 0 / cover panels: full-bleed portrait */
  if (isCover || layout === "full-bleed-portrait") {
    return (
      <div className={panelBase} style={borderStyle} onClick={onClick}>
        <div className="relative overflow-hidden" style={{ minHeight: 420 }}>
          {photo ? (
            <img src={photo} alt={title}
              className="w-full h-full object-cover object-top absolute inset-0"
              style={{ minHeight: 420, filter: "contrast(1.1) saturate(1.05)" }} />
          ) : (
            <div className={`absolute inset-0 bg-gradient-to-br ${cfg.bg.replace("/80","")}`} />
          )}
          {/* Deep gradient overlay */}
          <div className="absolute inset-0"
            style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.92) 100%)" }} />
          <Halftone opacity={0.05} />
          {/* Year + type badge */}
          <div className="absolute top-5 left-5 flex gap-2 z-10">
            <span className="text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full text-white"
              style={{ background: cfg.color }}>
              {cfg.label}
            </span>
            {panel.year_label && (
              <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-black/50 text-white backdrop-blur">
                {panel.year_label}
              </span>
            )}
          </div>
          {/* Bottom content */}
          <div className="absolute bottom-0 left-0 right-0 z-10 p-6 pt-16">
            {bubble && <SpeechBubble text={bubble} color={cfg.color} />}
            <div className="mt-4" style={{ borderLeft: `4px solid ${cfg.color}`, paddingLeft: 16 }}>
              <h3 className="font-display text-2xl font-extrabold text-white mb-2">{title}</h3>
              <p className="text-white/80 text-sm leading-relaxed">{narr}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* Layout 1: photo left, text right */
  if (layout === "split-left") {
    return (
      <div className={panelBase} style={borderStyle} onClick={onClick}>
        <div className="flex" style={{ minHeight: 320 }}>
          {/* Photo side */}
          <div className="w-5/12 relative overflow-hidden flex-shrink-0">
            {photo ? (
              <img src={photo} alt={title} className="w-full h-full object-cover object-top absolute inset-0" />
            ) : (
              <div className={`absolute inset-0 bg-gradient-to-br ${cfg.bg.replace("/80","")}`} />
            )}
            <div className="absolute inset-0"
              style={{ background: `linear-gradient(to right, transparent 60%, rgba(10,10,10,0.9) 100%)` }} />
            <Halftone opacity={0.06} />
            {panel.year_label && (
              <div className="absolute bottom-3 left-3 text-xs font-bold px-2.5 py-1 rounded-full text-white"
                style={{ background: cfg.color }}>
                {panel.year_label}
              </div>
            )}
          </div>
          {/* Text side */}
          <div className="flex-1 bg-stone-950 flex flex-col justify-between p-6"
            style={{ borderLeft: `4px solid ${cfg.color}` }}>
            <div>
              <span className="text-xs font-bold uppercase tracking-widest mb-3 block"
                style={{ color: cfg.color }}>{cfg.label}</span>
              <h3 className="font-display text-xl font-extrabold text-white mb-3 leading-snug">{title}</h3>
              <p className="text-white/75 text-sm leading-relaxed">{narr}</p>
            </div>
            {bubble && <SpeechBubble text={bubble} color={cfg.color} side="right" />}
          </div>
        </div>
      </div>
    );
  }

  /* Layout 2: text left, photo right */
  if (layout === "split-right") {
    return (
      <div className={panelBase} style={borderStyle} onClick={onClick}>
        <div className="flex" style={{ minHeight: 320 }}>
          {/* Text side */}
          <div className="flex-1 bg-stone-950 flex flex-col justify-between p-6"
            style={{ borderRight: `4px solid ${cfg.color}` }}>
            <div>
              <span className="text-xs font-bold uppercase tracking-widest mb-3 block"
                style={{ color: cfg.color }}>{cfg.label}</span>
              <h3 className="font-display text-xl font-extrabold text-white mb-3 leading-snug">{title}</h3>
              <p className="text-white/75 text-sm leading-relaxed">{narr}</p>
            </div>
            {bubble && <SpeechBubble text={bubble} color={cfg.color} />}
          </div>
          {/* Photo side */}
          <div className="w-5/12 relative overflow-hidden flex-shrink-0">
            {photo ? (
              <img src={photo} alt={title} className="w-full h-full object-cover object-top absolute inset-0" />
            ) : (
              <div className={`absolute inset-0 bg-gradient-to-br ${cfg.bg.replace("/80","")}`} />
            )}
            <div className="absolute inset-0"
              style={{ background: `linear-gradient(to left, transparent 60%, rgba(10,10,10,0.9) 100%)` }} />
            <Halftone opacity={0.06} />
            {panel.year_label && (
              <div className="absolute bottom-3 right-3 text-xs font-bold px-2.5 py-1 rounded-full text-white"
                style={{ background: cfg.color }}>
                {panel.year_label}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* Layout 3 / 7: banner-top / panorama-bottom */
  if (layout === "banner-top" || layout === "panorama-bottom") {
    const topPhoto = layout === "banner-top";
    return (
      <div className={panelBase} style={borderStyle} onClick={onClick}>
        {topPhoto && (
          <div className="relative overflow-hidden" style={{ height: 200 }}>
            {photo ? (
              <img src={photo} alt={title} className="w-full h-full object-cover object-top" />
            ) : (
              <div className={`w-full h-full bg-gradient-to-r ${cfg.bg.replace("/80","")}`} />
            )}
            <div className="absolute inset-0"
              style={{ background: `linear-gradient(to bottom, transparent 50%, rgba(10,10,10,1) 100%)` }} />
            <Halftone />
            {panel.year_label && (
              <div className="absolute top-4 right-4 text-xs font-bold px-2.5 py-1 rounded-full text-white"
                style={{ background: cfg.color }}>{panel.year_label}</div>
            )}
          </div>
        )}
        <div className="bg-stone-950 p-6">
          <span className="text-xs font-bold uppercase tracking-widest mb-2 block" style={{ color: cfg.color }}>{cfg.label}</span>
          <h3 className="font-display text-xl font-extrabold text-white mb-3 leading-snug">{title}</h3>
          {bubble && <div className="mb-4"><SpeechBubble text={bubble} color={cfg.color} /></div>}
          <NarrationBox text={narr} color={cfg.color} />
        </div>
        {!topPhoto && (
          <div className="relative overflow-hidden" style={{ height: 140 }}>
            {photo ? (
              <img src={photo} alt={title} className="w-full h-full object-cover object-center" />
            ) : (
              <div className={`w-full h-full bg-gradient-to-r ${cfg.bg.replace("/80","")}`} />
            )}
            <div className="absolute inset-0"
              style={{ background: `linear-gradient(to top, transparent 50%, rgba(10,10,10,1) 100%)` }} />
            <Halftone />
          </div>
        )}
      </div>
    );
  }

  /* Layout 4: diagonal cut */
  if (layout === "diagonal-cut") {
    return (
      <div className={panelBase} style={{ ...borderStyle, overflow: "hidden" }} onClick={onClick}>
        <div className="relative" style={{ minHeight: 340 }}>
          {/* Photo half */}
          <div className="absolute inset-0 overflow-hidden" style={{ clipPath: "polygon(0 0, 55% 0, 45% 100%, 0 100%)" }}>
            {photo ? (
              <img src={photo} alt={title} className="w-full h-full object-cover object-top" />
            ) : (
              <div className={`w-full h-full bg-gradient-to-br ${cfg.bg.replace("/80","")}`} />
            )}
            <Halftone opacity={0.08} />
          </div>
          {/* Text half */}
          <div className="absolute inset-0 flex flex-col justify-center"
            style={{ paddingLeft: "48%", background: "rgba(10,10,10,0.95)", clipPath: "polygon(45% 0, 100% 0, 100% 100%, 35% 100%)" }}>
            <div className="pl-6 pr-5 py-6">
              <span className="text-xs font-bold uppercase tracking-widest mb-3 block" style={{ color: cfg.color }}>{cfg.label}</span>
              {panel.year_label && <div className="text-xs mb-2 opacity-50 text-white">{panel.year_label}</div>}
              <h3 className="font-display text-lg font-extrabold text-white mb-3 leading-snug">{title}</h3>
              <p className="text-white/70 text-sm leading-relaxed">{narr}</p>
            </div>
          </div>
          {/* Diagonal stripe */}
          <div className="absolute top-0 bottom-0 w-1" style={{ left: "43%", background: cfg.color, opacity: 0.8 }} />
        </div>
        {bubble && (
          <div className="bg-stone-950 px-6 pb-5">
            <SpeechBubble text={bubble} color={cfg.color} />
          </div>
        )}
      </div>
    );
  }

  /* Layout 5: text center overlay over photo */
  if (layout === "text-center-overlay") {
    return (
      <div className={panelBase} style={borderStyle} onClick={onClick}>
        <div className="relative" style={{ minHeight: 360 }}>
          {photo ? (
            <img src={photo} alt={title}
              className="absolute inset-0 w-full h-full object-cover object-top"
              style={{ filter: "brightness(0.4) saturate(1.3)" }} />
          ) : (
            <div className={`absolute inset-0 bg-gradient-to-br ${cfg.bg.replace("/80","")}`} />
          )}
          <Halftone opacity={0.1} />
          {/* Centered content */}
          <div className="relative z-10 flex flex-col items-center justify-center h-full px-8 py-10 text-center" style={{ minHeight: 360 }}>
            <span className="text-xs font-bold uppercase tracking-widest mb-3 px-4 py-1.5 rounded-full text-white"
              style={{ background: cfg.color }}>{cfg.label}</span>
            {panel.year_label && (
              <span className="text-sm font-bold text-white/50 mb-2">{panel.year_label}</span>
            )}
            <h3 className="font-display text-2xl font-extrabold text-white mb-5 leading-snug">{title}</h3>
            {bubble && <div className="mb-5 max-w-md"><SpeechBubble text={bubble} color={cfg.color} /></div>}
            <div className="rounded-xl px-5 py-4 text-sm text-white/85 leading-relaxed max-w-lg text-left"
              style={{ background: "rgba(0,0,0,0.65)", borderLeft: `3px solid ${cfg.color}` }}>
              {narr}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* Layout 6: frame portrait */
  if (layout === "frame-portrait") {
    return (
      <div className={panelBase} style={{ ...borderStyle, background: "#0a0a0a" }} onClick={onClick}>
        <div className="p-5">
          <div className="flex gap-5 items-start">
            {/* Framed photo */}
            <div className="flex-shrink-0 rounded-xl overflow-hidden shadow-2xl"
              style={{ width: 140, height: 180, border: `3px solid ${cfg.color}`, boxShadow: `0 0 20px ${cfg.color}40` }}>
              {photo ? (
                <img src={photo} alt={title} className="w-full h-full object-cover object-top" />
              ) : (
                <div className={`w-full h-full bg-gradient-to-br ${cfg.bg.replace("/80","")}`} />
              )}
            </div>
            {/* Text */}
            <div className="flex-1">
              <span className="text-xs font-bold uppercase tracking-widest mb-2 block" style={{ color: cfg.color }}>{cfg.label}</span>
              {panel.year_label && <div className="text-xs mb-2 text-white/40">{panel.year_label}</div>}
              <h3 className="font-display text-lg font-extrabold text-white mb-3 leading-snug">{title}</h3>
              <p className="text-white/70 text-sm leading-relaxed">{narr}</p>
            </div>
          </div>
          {bubble && <div className="mt-5"><SpeechBubble text={bubble} color={cfg.color} /></div>}
        </div>
      </div>
    );
  }

  /* Layout 8 (magazine-grid) + fallback */
  return (
    <div className={panelBase} style={{ ...borderStyle, background: "#0a0a0a" }} onClick={onClick}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-3"
        style={{ background: `linear-gradient(90deg, ${cfg.color}20, transparent)`, borderBottom: `1px solid ${cfg.color}30` }}>
        <span className="text-xs font-bold uppercase tracking-widest" style={{ color: cfg.color }}>{cfg.label}</span>
        {panel.year_label && <span className="text-xs text-white/40 font-bold">{panel.year_label}</span>}
      </div>
      <div className="grid grid-cols-5" style={{ minHeight: 280 }}>
        {/* Text (3 cols) */}
        <div className="col-span-3 p-5 flex flex-col justify-between">
          <div>
            <h3 className="font-display text-lg font-extrabold text-white mb-3 leading-snug">{title}</h3>
            <p className="text-white/70 text-sm leading-relaxed">{narr}</p>
          </div>
          {bubble && <div className="mt-4"><SpeechBubble text={bubble} color={cfg.color} /></div>}
        </div>
        {/* Photo (2 cols) */}
        <div className="col-span-2 relative overflow-hidden" style={{ borderLeft: `3px solid ${cfg.color}40` }}>
          {photo ? (
            <img src={photo} alt={title} className="absolute inset-0 w-full h-full object-cover object-top" />
          ) : (
            <div className={`absolute inset-0 bg-gradient-to-br ${cfg.bg.replace("/80","")}`} />
          )}
          <Halftone opacity={0.08} />
        </div>
      </div>
    </div>
  );
}

/* ── Main Story Reader ────────────────────────────────────────────────────── */
export default function LegendStory({ user }) {
  const { slug }  = useParams();
  const navigate  = useNavigate();

  const [story, setStory]           = useState(null);
  const [loading, setLoading]       = useState(true);
  const [lang, setLang]             = useState("en");
  const [current, setCurrent]       = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [narrating, setNarrating]   = useState(false);
  const [showQuiz, setShowQuiz]     = useState(false);

  const panelRef = useRef(null);

  useEffect(() => {
    setLoading(true); setCurrent(0); setShowQuiz(false);
    api(`/legends/${slug}/`)
      .then(d => { setStory(d); setBookmarked(d.is_bookmarked); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [current]);

  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  function goPanel(i) { if (story) setCurrent(Math.max(0, Math.min(i, story.panels.length - 1))); }

  async function toggleBookmark() {
    if (!user) { navigate("/login"); return; }
    try { await api(`/legends/${slug}/bookmark/`, { method: bookmarked ? "DELETE" : "POST" }); setBookmarked(b => !b); }
    catch {}
  }

  function readAloud() {
    if (!story?.panels?.length) return;
    const p = story.panels[current];
    const text = (lang === "hi" && p.narration_hi) ? p.narration_hi : p.narration;
    if (!window.speechSynthesis) return;
    if (narrating) { window.speechSynthesis.cancel(); setNarrating(false); return; }
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = lang === "hi" ? "hi-IN" : "en-US"; utt.rate = 0.9;
    utt.onend = utt.onerror = () => setNarrating(false);
    window.speechSynthesis.speak(utt); setNarrating(true);
  }

  /* Loading */
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 bg-stone-950 text-white">
        <div className="animate-spin h-12 w-12 border-4 border-leaf border-t-transparent rounded-full" />
        <p className="text-white/40 text-sm">Loading story…</p>
      </div>
    );
  }

  if (!story) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] bg-stone-950 text-white text-center px-4">
        <p className="text-5xl mb-4">📖</p>
        <p className="text-xl font-semibold">Story not found.</p>
        <Link to="/legends" className="btn mt-6 inline-block">← Browse All Legends</Link>
      </div>
    );
  }

  const panels   = story.panels || [];
  const panel    = panels[current];
  const progress = panels.length > 0 ? Math.round(((current + 1) / panels.length) * 100) : 0;
  const cfg      = panel ? (PANEL_CFG[panel.panel_type] || PANEL_CFG.event) : PANEL_CFG.cover;

  /* Coming soon */
  if (panels.length === 0) {
    return (
      <div className="min-h-screen bg-stone-950 text-white flex items-center justify-center px-4">
        <div className="max-w-lg w-full text-center">
          <div className={`rounded-3xl overflow-hidden mb-8 relative`} style={{ minHeight: 300 }}>
            {story.photo_url && <img src={story.photo_url} alt={story.name} className="w-full h-full object-cover object-top absolute inset-0" style={{ filter: "brightness(0.5)" }} />}
            <div className="relative z-10 p-10">
              <h1 className="font-display text-4xl font-extrabold mb-3">{story.name}</h1>
              <p className="text-white/70">{story.tagline}</p>
            </div>
          </div>
          <div className="card bg-stone-900 border-stone-700">
            <p className="text-lg font-bold mb-2">🚧 Story Coming Soon</p>
            <p className="text-sm opacity-60 mb-5">Complete stories available for Gandhi, Kalam and Einstein.</p>
            <Link to="/legends" className="btn inline-block">← Browse Legends</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-stone-950 text-white ${fullscreen ? "fixed inset-0 z-50 overflow-y-auto" : ""}`}>

      {/* ── Cinematic hero cover ──────────────────────────────────────── */}
      <div className="relative overflow-hidden" style={{ minHeight: 320 }}>
        {/* Full bleed photo */}
        {story.photo_url && (
          <img src={story.photo_url} alt={story.name}
            className="absolute inset-0 w-full h-full object-cover object-top"
            style={{ filter: "brightness(0.4) contrast(1.15) saturate(1.1)" }} />
        )}
        {/* Comic gradient overlay */}
        <div className="absolute inset-0"
          style={{ background: "linear-gradient(135deg, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0.85) 100%)" }} />
        {/* Halftone */}
        <Halftone opacity={0.06} />
        {/* Colored edge accent */}
        <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ background: cfg.color }} />

        {/* Content */}
        <div className="relative z-10 max-w-5xl mx-auto px-6 py-10 flex items-end gap-8 flex-wrap" style={{ minHeight: 320 }}>
          {/* Large portrait circle */}
          {story.photo_url && (
            <div className="flex-shrink-0 rounded-2xl overflow-hidden shadow-2xl hidden md:block"
              style={{ width: 160, height: 200, border: `3px solid ${cfg.color}60`, boxShadow: `0 0 40px ${cfg.color}30` }}>
              <img src={story.photo_url} alt={story.name} className="w-full h-full object-cover object-top" />
            </div>
          )}
          {/* Text */}
          <div className="flex-1 min-w-0 pb-2">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full"
                style={{ background: cfg.color, color: "#000" }}>
                {story.category}
              </span>
              {story.born && (
                <span className="text-xs text-white/40 font-mono">
                  {story.born}{story.died ? ` — ${story.died}` : ""} · {story.nationality}
                </span>
              )}
            </div>
            <h1 className="font-display text-5xl md:text-6xl font-extrabold leading-none mb-3 tracking-tight">
              {lang === "hi" && story.name_hi ? story.name_hi : story.name}
            </h1>
            <p className="text-white/60 text-base leading-relaxed max-w-xl">
              {lang === "hi" && story.tagline_hi ? story.tagline_hi : story.tagline}
            </p>
          </div>
        </div>
      </div>

      {/* ── Controls toolbar ─────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 bg-stone-900/95 backdrop-blur border-b border-white/10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
          <Link to="/legends" className="text-sm text-white/50 hover:text-white transition flex items-center gap-1">
            ← Legends
          </Link>
          <div className="flex-1 max-w-xs">
            <div className="flex items-center gap-2 text-xs text-white/40 mb-1">
              <span>Panel {current + 1}/{panels.length}</span>
              <span className="ml-auto">{progress}%</span>
            </div>
            <div className="h-1 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: progress + "%", background: cfg.color }} />
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Language toggle */}
            <div className="flex bg-white/10 rounded-lg p-0.5 text-xs">
              {[["en","EN"],["hi","HI"]].map(([code, label]) => (
                <button key={code} onClick={() => setLang(code)}
                  className={`px-3 py-1 rounded-md transition font-bold ${lang === code ? "bg-white text-stone-900" : "text-white/60 hover:text-white"}`}>
                  {label}
                </button>
              ))}
            </div>
            <button onClick={readAloud}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${narrating ? "text-leaf border-leaf bg-leaf/10" : "text-white/60 border-white/20 hover:border-white/40"}`}>
              {narrating ? "⏹ Stop" : "🔊 Listen"}
            </button>
            <button onClick={toggleBookmark}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${bookmarked ? "text-yellow-400 border-yellow-400/40 bg-yellow-400/10" : "text-white/60 border-white/20 hover:border-yellow-400/40"}`}>
              {bookmarked ? "♥ Saved" : "♡ Save"}
            </button>
            <button onClick={() => setFullscreen(f => !f)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border border-white/20 text-white/60 hover:text-white hover:border-white/40 transition">
              {fullscreen ? "⊡" : "⛶"}
            </button>
          </div>
        </div>
      </div>

      {/* ── Main content ─────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* Panel dot nav */}
        <div className="flex flex-wrap gap-1.5 mb-8 justify-center">
          {panels.map((p, i) => {
            const c = PANEL_CFG[p.panel_type] || PANEL_CFG.event;
            return (
              <button key={i} onClick={() => goPanel(i)} title={p.title}
                className={`w-9 h-9 rounded-xl text-xs font-bold transition-all ${i === current ? "scale-110 shadow-lg" : i < current ? "opacity-70 hover:opacity-100" : "opacity-40 hover:opacity-70"}`}
                style={{ background: i <= current ? c.color : "#1c1c1c", color: i <= current ? "#000" : "#fff", border: `2px solid ${c.color}40` }}>
                {i + 1}
              </button>
            );
          })}
        </div>

        {/* Active panel */}
        {panel && (
          <div ref={panelRef} className="mb-8">
            <ComicPanel panel={panel} index={current} lang={lang} isActive
              legendPhoto={story.photo_url} onClick={() => {}} />
          </div>
        )}

        {/* Prev / Next */}
        <div className="flex gap-4 justify-between mb-10">
          <button disabled={current === 0} onClick={() => goPanel(current - 1)}
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm border border-white/20 disabled:opacity-20 hover:border-white/40 transition text-white">
            ← Previous
          </button>
          {current < panels.length - 1 ? (
            <button onClick={() => goPanel(current + 1)}
              className="flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-sm text-black transition"
              style={{ background: cfg.color }}>
              Next Panel →
            </button>
          ) : (
            <button onClick={() => setShowQuiz(true)}
              className="flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-sm bg-saffron hover:bg-amber-500 text-stone-900 transition">
              🎯 Take Quiz
            </button>
          )}
        </div>

        {/* Thumbnail strip */}
        <div className="mb-10">
          <h2 className="text-xs uppercase tracking-widest text-white/30 font-bold mb-3">All Panels</h2>
          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-9 gap-2">
            {panels.map((p, i) => (
              <ComicPanel key={p.id} panel={p} index={i} lang={lang}
                isActive={i === current} isMini legendPhoto={story.photo_url}
                onClick={() => goPanel(i)} />
            ))}
          </div>
        </div>

        {/* Overview */}
        {story.overview && (
          <div className="rounded-2xl overflow-hidden mb-8"
            style={{ border: `2px solid ${cfg.color}30`, background: "rgba(255,255,255,0.03)" }}>
            <div className="px-6 py-3 flex items-center gap-2"
              style={{ background: `${cfg.color}15`, borderBottom: `1px solid ${cfg.color}20` }}>
              <div className="w-1 h-5 rounded-full" style={{ background: cfg.color }} />
              <h2 className="font-display font-bold text-lg text-white">About {story.name}</h2>
            </div>
            <div className="px-6 py-5">
              <p className="text-white/70 text-sm leading-relaxed">
                {lang === "hi" && story.overview_hi ? story.overview_hi : story.overview}
              </p>
              {story.photo_attribution && (
                <p className="text-white/25 text-xs mt-3">{story.photo_attribution}</p>
              )}
            </div>
          </div>
        )}

        {/* Quiz */}
        {(showQuiz || current === panels.length - 1) && story.quiz?.length > 0 && (
          <Quiz questions={story.quiz} lang={lang} />
        )}
        {!showQuiz && story.quiz?.length > 0 && current < panels.length - 1 && (
          <div className="text-center mt-2 mb-6">
            <button onClick={() => setShowQuiz(true)}
              className="text-sm border border-white/20 px-5 py-2 rounded-xl text-white/50 hover:text-white hover:border-white/40 transition">
              🎯 Jump to Quiz
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
