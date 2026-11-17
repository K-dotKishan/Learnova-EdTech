import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api, apiAll, apiWithTimeout } from "../api.js";

const YT_API_SRC = "https://www.youtube.com/iframe_api";

function loadYTAPI() {
  return new Promise(resolve => {
    if (window.YT?.Player) { resolve(window.YT); return; }
    const existing = document.querySelector(`script[src="${YT_API_SRC}"]`);
    if (!existing) {
      const s = document.createElement("script");
      s.src = YT_API_SRC;
      document.head.appendChild(s);
    }
    window.onYouTubeIframeAPIReady = () => resolve(window.YT);
  });
}

function fmtDur(secs) {
  if (!secs) return "";
  const m = Math.floor(secs / 60), s = Math.floor(secs % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function Learn({ user }) {
  const { courseId, lessonId } = useParams();
  const nav = useNavigate();

  // Data
  const [course, setCourse]     = useState(null);
  const [lesson, setLesson]     = useState(null);
  const [langs, setLangs]       = useState([]);
  const [progress, setProgress] = useState({});

  // UI state
  const [lang, setLang]           = useState(() => {
    return user?.preferred_language?.code || localStorage.getItem("learnLang") || "en";
  });
  const [showSubs, setShowSubs]     = useState(true);
  const [subText, setSubText]       = useState("");
  const [subSegments, setSubSegments] = useState([]);   // [{start, dur, text}]
  const [subLoading, setSubLoading]   = useState(false);
  const [subErr, setSubErr]           = useState("");
  const [subStatus, setSubStatus]     = useState("");   // "loading" | "translating" | "ready" | "unavailable" | "error"
  const [audioMode, setAudioMode]     = useState("original");
  const [audioUrl, setAudioUrl]       = useState("");
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioErr, setAudioErr]       = useState("");
  const [audioStatus, setAudioStatus] = useState("");  // "loading" | "generating" | "ready" | "unavailable" | "error"
  const [msg, setMsg]                 = useState("");
  const [completed, setCompleted]     = useState(false);
  const [activeSegment, setActiveSegment] = useState(null);

  // Refs
  const playerContainerRef = useRef(null);
  const ytPlayerRef        = useRef(null);
  const translatedAudioRef  = useRef(null);
  const watchSecondsRef    = useRef(0);
  const watchIntervalRef   = useRef(null);
  const subSyncRef         = useRef(null);
  const subAbortRef        = useRef(null);  // AbortController for in-flight subtitle requests
  const segmentsRef        = useRef([]);    // mirror of subSegments for sync loop
  segmentsRef.current      = subSegments;

  // ── Load course + lesson ────────────────────────────────────────────────
  useEffect(() => {
    const localProgress = JSON.parse(localStorage.getItem(`progress_${courseId}`) || "{}");
    Promise.all([
      api(`/courses/${courseId}/`),
      apiAll("/languages/"),
      user ? api(`/courses/${courseId}/progress/`).catch(() => ({})) : Promise.resolve({}),
    ]).then(([c, l, p]) => {
      setCourse(c);
      setLangs(l);
      const serverLessons = p.lessons || {};
      const merged = { ...localProgress };
      Object.entries(serverLessons).forEach(([id, v]) => { merged[id] = v; });
      setProgress(merged);
      const found = c.lessons?.find(x => String(x.id) === String(lessonId));
      setLesson(found || c.lessons?.[0]);
    }).catch(e => setMsg(e.message));
  }, [courseId]);

  useEffect(() => {
    if (!lesson) return;
    // Cancel any in-flight subtitle request for the previous lesson
    if (subAbortRef.current) {
      subAbortRef.current.abort();
      subAbortRef.current = null;
    }
    setSubText(""); setSubSegments([]); setSubErr(""); setSubStatus("");
    setAudioUrl(""); setAudioErr(""); setAudioStatus("");
    setActiveSegment(null);
    const prog = progress[lesson.id];
    setCompleted(prog?.completed || false);
    watchSecondsRef.current = prog?.watch_seconds || 0;
  }, [lesson]);

  // ── YouTube Player ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!lesson?.youtube_id) return;
    let player;

    loadYTAPI().then(YT => {
      if (ytPlayerRef.current) {
        try { ytPlayerRef.current.destroy(); } catch {}
      }
      player = new YT.Player("yt-player", {
        videoId: lesson.youtube_id,
        playerVars: { rel: 0, modestbranding: 1, controls: 1 },
        events: {
          onStateChange: (e) => {
            if (e.data === YT.PlayerState.PLAYING) {
              watchIntervalRef.current = setInterval(() => {
                watchSecondsRef.current += 5;
                const dur = player.getDuration?.() || 0;
                if (dur > 0 && watchSecondsRef.current / dur >= 0.9 && !completed) {
                  markComplete();
                }
              }, 5000);
            } else {
              clearInterval(watchIntervalRef.current);
            }
          },
          onReady: () => {},
        },
      });
      ytPlayerRef.current = player;
    });

    return () => {
      clearInterval(watchIntervalRef.current);
      clearInterval(subSyncRef.current);
      try { ytPlayerRef.current?.destroy(); } catch {}
    };
  }, [lesson?.youtube_id]);

  // ── Subtitle sync loop ──────────────────────────────────────────────────
  // Polls YouTube player currentTime and finds the matching segment
  useEffect(() => {
    if (!showSubs || segmentsRef.current.length === 0) {
      setActiveSegment(null);
      return;
    }
    subSyncRef.current = setInterval(() => {
      const p = ytPlayerRef.current;
      if (!p || !p.getCurrentTime) return;
      const t = p.getCurrentTime();
      const segs = segmentsRef.current;
      // Find segment where t is within [start, start+dur]
      for (let i = 0; i < segs.length; i++) {
        const s = segs[i];
        if (t >= s.start && t < s.start + (s.dur || 3) + 0.5) {
          setActiveSegment(s);
          return;
        }
      }
      // If no exact match, find closest upcoming segment
      for (let i = 0; i < segs.length; i++) {
        if (segs[i].start > t) {
          setActiveSegment(null);
          return;
        }
      }
    }, 500);

    return () => clearInterval(subSyncRef.current);
  }, [showSubs, subSegments]);

  // ── Load subtitles ──────────────────────────────────────────────────────
  const loadSubtitles = useCallback(async (langCode) => {
    if (!lesson) return;

    // Cancel any in-flight subtitle request for a previous language
    if (subAbortRef.current) {
      subAbortRef.current.abort();
    }
    const controller = new AbortController();
    subAbortRef.current = controller;

    setSubLoading(true); setSubErr(""); setSubText(""); setSubSegments([]);
    setSubStatus(langCode === "en" ? "loading" : "translating");

    // 60s timeout — translation can be slow on first request
    const timer = setTimeout(() => controller.abort(), 60000);

    try {
      const r = await api(`/lessons/${lesson.id}/transcript/?lang=${langCode}`, {
        signal: controller.signal,
      });
      setSubText(r.text || "");
      setSubSegments(r.segments || []);
      setSubStatus("ready");
    } catch (e) {
      if (e.name === "AbortError") {
        // Aborted because language was changed — don't update state for stale request
        return;
      }
      let errMsg = e.message;
      if (errMsg.includes("timed out") || errMsg.includes("timeout")) {
        errMsg = "Translation is taking too long. Please try again or use English.";
      } else if (errMsg.includes("no_transcript") || errMsg.includes("No transcript")) {
        errMsg = "No captions available for this video. A teacher can add a transcript manually.";
        setSubStatus("unavailable");
      } else {
        setSubStatus("error");
      }
      setSubErr(errMsg);
      setSubStatus(prev => prev !== "unavailable" ? "error" : prev);
    } finally {
      clearTimeout(timer);
      setSubLoading(false);
    }
  }, [lesson]);

  useEffect(() => {
    if (!lesson || !showSubs) return;
    loadSubtitles(lang);
    localStorage.setItem("learnLang", lang);
  }, [lang, lesson, showSubs]);

  // ── Load translated audio ───────────────────────────────────────────────
  const loadTranslatedAudio = useCallback(async (langCode) => {
    if (!lesson) return;
    setAudioLoading(true); setAudioErr(""); setAudioUrl("");
    setAudioStatus("generating");

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);

    try {
      const r = await api(`/lessons/${lesson.id}/translated_audio/?lang=${langCode}`, {
        signal: controller.signal,
      });
      setAudioUrl(r.audio_url);
      setAudioStatus("ready");
    } catch (e) {
      if (e.name === "AbortError") {
        setAudioErr("Audio generation timed out. This requires Google Cloud TTS credentials.");
        setAudioStatus("tts_unconfigured");
        return;
      }
      let errMsg = e.message;
      if (errMsg.includes("tts_not_configured") || errMsg.includes("Text-to-Speech") || errMsg.includes("Dubbed audio requires")) {
        errMsg = "Dubbed audio needs Google Cloud TTS. Subtitles still work above.";
        setAudioStatus("tts_unconfigured");
      } else if (errMsg.includes("no_transcript") || errMsg.includes("No transcript")) {
        errMsg = "Cannot generate audio: no transcript available.";
        setAudioStatus("unavailable");
      } else {
        setAudioStatus("error");
      }
      setAudioErr(errMsg);
    } finally {
      clearTimeout(timer);
      setAudioLoading(false);
    }
  }, [lesson]);

  useEffect(() => {
    if (audioMode === "translated" && lang !== "en") {
      loadTranslatedAudio(lang);
    }
  }, [audioMode, lang, lesson]);

  // ── Mark complete ────────────────────────────────────────────────────────
  async function markComplete() {
    if (completed) return;
    setCompleted(true);
    const watchSeconds = watchSecondsRef.current;
    setProgress(p => ({ ...p, [lesson.id]: { completed: true, watch_seconds: watchSeconds } }));
    const localKey = `progress_${courseId}`;
    const existing = JSON.parse(localStorage.getItem(localKey) || "{}");
    existing[lesson.id] = { completed: true, watch_seconds: watchSeconds };
    localStorage.setItem(localKey, JSON.stringify(existing));
    if (!user) {
      setMsg("✓ Complete! Sign up to sync progress across devices.");
      return;
    }
    try {
      await api(`/lessons/${lesson.id}/complete/`, {
        method: "POST",
        body: { watch_seconds: watchSeconds },
      });
      setMsg("✓ Lesson marked as complete!");
    } catch (err) {
      console.warn("Server progress save failed:", err.message);
    }
  }

  // ── Navigate lessons ────────────────────────────────────────────────────
  const goLesson = (l) => {
    setLesson(l);
    nav(`/learn/${courseId}/${l.id}`, { replace: true });
  };

  const currentIdx = course?.lessons?.findIndex(l => String(l.id) === String(lesson?.id)) ?? -1;
  const prevLesson = currentIdx > 0 ? course.lessons[currentIdx - 1] : null;
  const nextLesson = currentIdx >= 0 && currentIdx < (course?.lessons?.length - 1) ? course.lessons[currentIdx + 1] : null;

  if (!course || !lesson) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin h-10 w-10 border-4 border-leaf border-t-transparent rounded-full" />
      </div>
    );
  }

  const selectedLang = langs.find(l => l.code === lang);

  // Status indicator for subtitles
  const subStatusBadge = () => {
    if (subStatus === "loading")     return <span className="text-xs text-blue-400 animate-pulse">⏳ Fetching captions…</span>;
    if (subStatus === "translating") return <span className="text-xs text-saffron animate-pulse">⏳ Translating to {selectedLang?.name}…</span>;
    if (subStatus === "ready")       return <span className="text-xs text-green-400">✓ {selectedLang?.name} subtitles ready</span>;
    if (subStatus === "unavailable") return <span className="text-xs text-amber-400">⚠️ No captions</span>;
    if (subStatus === "error")       return <span className="text-xs text-red-400">⚠️ Error</span>;
    return null;
  };

  const audioStatusBadge = () => {
    if (audioMode !== "translated") return null;
    if (audioStatus === "generating")       return <span className="text-xs text-blue-400 animate-pulse">⏳ Generating…</span>;
    if (audioStatus === "ready")            return <span className="text-xs text-green-400">✓ Audio ready</span>;
    if (audioStatus === "tts_unconfigured") return <span className="text-xs text-amber-400">🔑 TTS needs setup</span>;
    if (audioStatus === "unavailable")      return <span className="text-xs text-amber-400">⚠️ No audio</span>;
    if (audioStatus === "error")            return <span className="text-xs text-red-400">⚠️ Audio error</span>;
    return null;
  };

  return (
    <div className="min-h-screen bg-stone-950 text-white">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-stone-900">
        <Link to={`/courses/${courseId}`} className="text-sm opacity-70 hover:opacity-100 transition flex items-center gap-1">
          ← {course.title}
        </Link>
        <div className="text-sm opacity-50 hidden md:block">{lesson.title}</div>
        <div className="flex items-center gap-2">
          <span className="text-xs opacity-40">{currentIdx + 1}/{course.lessons?.length}</span>
        </div>
      </div>

      <div className="flex h-[calc(100vh-45px)]">
        {/* Sidebar: lesson list */}
        <aside className="hidden lg:flex flex-col w-72 border-r border-white/10 bg-stone-900 overflow-y-auto">
          <div className="px-4 py-3 border-b border-white/10">
            <p className="text-xs uppercase tracking-widest opacity-40 mb-1">Course lessons</p>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${Math.round(Object.values(progress).filter(v => v.completed).length / (course.lessons?.length || 1) * 100)}%` }} />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto py-2">
            {course.lessons?.map((l, i) => {
              const done = progress[l.id]?.completed;
              const active = String(l.id) === String(lesson.id);
              return (
                <button key={l.id} onClick={() => goLesson(l)}
                  className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition ${active ? "bg-leaf/20 border-r-2 border-leaf" : ""}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${done ? "bg-leaf text-white" : active ? "bg-leaf/30 text-white" : "bg-white/10"}`}>
                    {done ? "✓" : i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-snug line-clamp-2 ${active ? "text-white font-medium" : "opacity-70"}`}>{l.title}</p>
                    {l.duration_seconds > 0 && <p className="text-xs opacity-40">{fmtDur(l.duration_seconds)}</p>}
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Main: player + controls */}
        <main className="flex-1 flex flex-col overflow-y-auto">
          {/* Video */}
          <div className="relative w-full bg-black" style={{ paddingBottom: "56.25%" }}>
            {lesson.youtube_id ? (
              <div id="yt-player" className="absolute inset-0 w-full h-full" ref={playerContainerRef} />
            ) : lesson.video_url ? (
              <video className="absolute inset-0 w-full h-full" controls src={lesson.video_url} onEnded={markComplete} />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center opacity-30">
                <span className="text-6xl">🎬</span>
              </div>
            )}
          </div>

          {/* Translated Audio Player */}
          {audioMode === "translated" && (
            <div className="bg-teal-900/40 border-b border-teal-800/50 px-4 py-3 flex items-center gap-3 flex-wrap">
              <span className="text-sm opacity-70">🔊 Dubbed audio ({selectedLang?.name || lang}):</span>
              {audioStatus === "generating" && <span className="text-xs opacity-50 animate-pulse">Generating audio… (this may take 10–30 seconds)</span>}
              {audioStatus === "tts_unconfigured" && (
                <span className="text-xs text-amber-400">
                  ⚠️ Dubbed audio needs Google Cloud TTS credentials.
                  <a href="/api/translation-status/" target="_blank" rel="noopener" className="ml-1 underline opacity-70">Setup guide</a>
                </span>
              )}
              {audioStatus === "unavailable" && <span className="text-xs text-amber-400">{audioErr}</span>}
              {audioStatus === "error" && <span className="text-xs text-red-400">{audioErr}</span>}
              {audioStatus === "ready" && audioUrl && !audioLoading && (
                <>
                  <audio ref={translatedAudioRef} controls src={audioUrl} className="flex-1 max-w-sm h-8" />
                  <span className="text-xs text-green-400">✓ Ready</span>
                </>
              )}
            </div>
          )}

          {/* Synchronized Subtitles */}
          {showSubs && (
            <div className="px-4 pt-3 pb-1 min-h-[80px] flex items-center justify-center">
              {subStatus === "loading" && (
                <p className="text-sm opacity-40 animate-pulse flex items-center gap-2">
                  <span className="animate-spin h-3 w-3 border-2 border-white/40 border-t-white rounded-full inline-block" />
                  Fetching English captions…
                </p>
              )}
              {subStatus === "translating" && (
                <p className="text-sm opacity-40 animate-pulse flex items-center gap-2">
                  <span className="animate-spin h-3 w-3 border-2 border-saffron/40 border-t-saffron rounded-full inline-block" />
                  Translating to {selectedLang?.name || lang}…
                </p>
              )}
              {subStatus === "unavailable" && (
                <p className="text-xs text-amber-400 text-center max-w-xl">{subErr}</p>
              )}
              {subStatus === "error" && (
                <p className="text-xs text-red-400 text-center max-w-xl">{subErr}</p>
              )}
              {subStatus === "ready" && activeSegment && (
                <div className="subtitle-overlay">
                  {lang !== "en" && (
                    <span className="block text-xs opacity-60 mb-1">{selectedLang?.flag} {selectedLang?.name}</span>
                  )}
                  {activeSegment.text}
                </div>
              )}
              {subStatus === "ready" && !activeSegment && subSegments.length > 0 && (
                <p className="text-xs opacity-30">Waiting for speech…</p>
              )}
              {subStatus === "ready" && subSegments.length === 0 && subText && (
                <div className="subtitle-overlay">
                  {lang !== "en" && (
                    <span className="block text-xs opacity-60 mb-1">{selectedLang?.flag} {selectedLang?.name}</span>
                  )}
                  {subText.slice(0, 400)}{subText.length > 400 ? "…" : ""}
                </div>
              )}
            </div>
          )}

          {/* Controls bar */}
          <div className="px-4 py-4 border-t border-white/10 space-y-3">
            {/* Row 1: Language + CC + Audio + Speed + Fullscreen + Status */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-xs opacity-40">🌐</span>
                <select
                  className="rounded-lg border border-white/20 bg-white/5 px-2 py-1.5 text-sm focus:ring-2 focus:ring-leaf/40"
                  value={lang}
                  onChange={e => setLang(e.target.value)}>
                  {langs.map(l => (
                    <option key={l.code} value={l.code}>{l.flag} {l.name}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => setShowSubs(!showSubs)}
                title="Toggle subtitles"
                className={`px-2.5 py-1.5 rounded-lg text-sm border transition font-mono ${showSubs ? "border-leaf bg-leaf/20 text-leaf" : "border-white/20 opacity-50 hover:opacity-80"}`}>
                CC
              </button>

              <div className="flex items-center gap-0.5 bg-white/5 rounded-lg p-0.5 text-sm">
                <button
                  onClick={() => setAudioMode("original")}
                  className={`px-2.5 py-1 rounded-md transition ${audioMode === "original" ? "bg-leaf text-white" : "opacity-60 hover:opacity-100"}`}>
                  🔊 Original
                </button>
                <button
                  onClick={() => setAudioMode("translated")}
                  className={`px-2.5 py-1 rounded-md transition ${audioMode === "translated" ? "bg-leaf text-white" : "opacity-60 hover:opacity-100"}`}>
                  🌐 Dubbed
                </button>
              </div>

              <select
                title="Playback speed"
                className="rounded-lg border border-white/20 bg-white/5 px-2 py-1.5 text-sm"
                defaultValue="1"
                onChange={e => {
                  const rate = parseFloat(e.target.value);
                  try { ytPlayerRef.current?.setPlaybackRate(rate); } catch {}
                }}>
                {[0.5, 0.75, 1, 1.25, 1.5, 2].map(r => (
                  <option key={r} value={r}>{r}×</option>
                ))}
              </select>

              <button
                title="Fullscreen"
                onClick={() => {
                  const el = playerContainerRef.current?.closest(".relative");
                  if (el) {
                    if (!document.fullscreenElement) el.requestFullscreen?.();
                    else document.exitFullscreen?.();
                  }
                }}
                className="px-2.5 py-1.5 rounded-lg border border-white/20 opacity-60 hover:opacity-100 transition text-sm">
                ⛶
              </button>

              {subStatusBadge()}
              {audioStatusBadge()}

              <button
                onClick={markComplete}
                disabled={completed}
                className={`ml-auto px-3 py-1.5 rounded-lg text-sm font-medium transition ${completed ? "bg-leaf/20 text-leaf border border-leaf/40" : "bg-leaf text-white hover:bg-teal-700"}`}>
                {completed ? "✓ Done" : "Mark done"}
              </button>
            </div>

            {/* Row 2: Prev / Next */}
            <div className="flex justify-between">
              {prevLesson ? (
                <button onClick={() => goLesson(prevLesson)} className="btn-ghost flex items-center gap-1.5 text-sm opacity-70 hover:opacity-100">
                  ← <span className="max-w-[160px] truncate">{prevLesson.title}</span>
                </button>
              ) : <div />}
              {nextLesson && (
                <button onClick={() => goLesson(nextLesson)} className="btn flex items-center gap-1.5 text-sm">
                  <span className="max-w-[160px] truncate">{nextLesson.title}</span> →
                </button>
              )}
            </div>
          </div>

          {/* Lesson info + transcript panel */}
          <div className="px-4 pb-6 border-t border-white/10 pt-4 space-y-4">
            <div>
              <h1 className="font-display text-xl font-bold mb-1">{lesson.title}</h1>
              {lesson.description && <p className="text-sm opacity-60">{lesson.description}</p>}
            </div>

            {msg && (
              <div className="px-4 py-2 rounded-xl bg-green-900/30 border border-green-700 text-green-400 text-sm">
                {msg}
              </div>
            )}

            {!user && (
              <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-saffron/10 border border-saffron/30 text-sm">
                <span className="opacity-80">Sign up to save your progress across devices</span>
                <Link to="/register" className="btn-sm bg-saffron hover:bg-amber-600 text-white ml-3 flex-shrink-0">
                  Sign up free
                </Link>
              </div>
            )}

            {/* Full transcript panel */}
            {showSubs && subText && (
              <details className="border border-white/10 rounded-xl overflow-hidden">
                <summary className="px-4 py-3 text-sm opacity-50 cursor-pointer hover:opacity-80 hover:bg-white/5">
                  📄 Full transcript ({selectedLang?.name || "English"}) — {subSegments.length} segments
                </summary>
                <div className="px-4 py-3 bg-stone-900/60 text-sm leading-relaxed max-h-64 overflow-y-auto opacity-80">
                  {subSegments.length > 0 ? (
                    subSegments.map((seg, i) => (
                      <div key={i} className={`mb-2 pb-2 border-b border-white/5 ${activeSegment === seg ? "text-leaf font-medium" : ""}`}>
                        <span className="opacity-40 text-xs mr-2">{fmtDur(seg.start)}</span>
                        {seg.text}
                      </div>
                    ))
                  ) : (
                    <p className="whitespace-pre-wrap">{subText}</p>
                  )}
                </div>
              </details>
            )}

            {/* Teacher transcript upload */}
            {user?.role === "teacher" && (
              <TeacherTranscriptPanel lessonId={lesson.id} onSaved={() => loadSubtitles(lang)} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

// ── Teacher transcript upload panel ──────────────────────────────────────────
function TeacherTranscriptPanel({ lessonId, onSaved }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  async function save() {
    setSaving(true); setMsg("");
    try {
      await api(`/lessons/${lessonId}/transcript/`, { method: "POST", body: { text } });
      setMsg("✓ Transcript saved. Translations will regenerate on next request.");
      setText("");
      setOpen(false);
      onSaved?.();
    } catch (e) {
      setMsg("Error: " + e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="border border-white/10 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm opacity-60 hover:opacity-90 hover:bg-white/5 transition">
        <span>🎓 Teacher: Add / replace English transcript</span>
        <span>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3 bg-stone-900/40">
          <p className="text-xs opacity-50 leading-relaxed">
            Paste the English lecture transcript below. This will be used to auto-generate
            translated subtitles and dubbed audio for all languages.
          </p>
          <textarea
            className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm resize-y min-h-[120px] focus:ring-2 focus:ring-leaf/40 focus:outline-none"
            placeholder="Paste the English transcript text here…"
            value={text}
            onChange={e => setText(e.target.value)}
          />
          {msg && <p className="text-xs text-green-400">{msg}</p>}
          <button
            className="btn text-sm"
            onClick={save}
            disabled={saving || !text.trim()}>
            {saving ? "Saving…" : "Save transcript"}
          </button>
        </div>
      )}
    </div>
  );
}
