import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api, apiAll, token } from "../api.js";

export default function Live({ user }) {
  const { id } = useParams();
  const wsRef        = useRef(null);
  const audioQueueRef  = useRef([]);
  const playingRef   = useRef(false);
  const stopMicRef   = useRef(null);
  const soundRef     = useRef(true);

  const [langs, setLangs]     = useState([]);
  const [lang, setLang]       = useState(user.preferred_language?.code || "hi");
  const [captions, setCaptions] = useState([]);
  const [showSubs, setShowSubs] = useState(true);
  const [sound, setSound]     = useState(true);
  const [mic, setMic]         = useState(false);
  const [err, setErr]         = useState("");
  const [connected, setConnected] = useState(false);

  soundRef.current = sound;

  useEffect(() => {
    apiAll("/languages/").then(setLangs).catch(() => {});

    const proto = location.protocol === "https:" ? "wss" : "ws";
    const ws = new WebSocket(`${proto}://${location.hostname}:8000/ws/live/${id}/?token=${token()}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      ws.send(JSON.stringify({ type: "set_language", code: lang }));
    };
    ws.onclose = () => { setConnected(false); setErr("Disconnected from the class."); };
    ws.onerror = () => setErr("WebSocket connection failed.");
    ws.onmessage = (e) => {
      const m = JSON.parse(e.data);
      if (m.type === "error")   { setErr(m.message); return; }
      if (m.type === "language_set") return;
      if (m.warning) setErr(m.warning);
      if (m.type === "caption") {
        setCaptions(c => [...c.slice(-50), m]);
        if (m.audio && soundRef.current) {
          audioQueueRef.current.push(m.audio);
          playNext();
        }
      }
    };

    return () => { ws.close(); stopMicRef.current?.(); };
  }, [id]);

  useEffect(() => {
    if (wsRef.current?.readyState === 1) {
      wsRef.current.send(JSON.stringify({ type: "set_language", code: lang }));
    }
  }, [lang]);

  function playNext() {
    if (playingRef.current || !audioQueueRef.current.length) return;
    playingRef.current = true;
    const audio = new Audio("data:audio/mp3;base64," + audioQueueRef.current.shift());
    audio.onended = audio.onerror = () => { playingRef.current = false; playNext(); };
    audio.play().catch(() => { playingRef.current = false; });
  }

  async function startMic() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx    = new AudioContext();
      const src    = ctx.createMediaStreamSource(stream);
      const proc   = ctx.createScriptProcessor(4096, 1, 1);
      let buf = [], len = 0;
      const need = ctx.sampleRate * 3; // 3-second chunks

      proc.onaudioprocess = (e) => {
        const d = new Float32Array(e.inputBuffer.getChannelData(0));
        buf.push(d); len += d.length;
        if (len >= need) {
          const all = new Float32Array(len);
          let o = 0; buf.forEach(b => { all.set(b, o); o += b.length; });
          buf = []; len = 0;
          // Downsample to 16 kHz PCM-16
          const ratio = ctx.sampleRate / 16000;
          const out   = new Int16Array(Math.floor(all.length / ratio));
          for (let i = 0; i < out.length; i++) {
            out[i] = Math.max(-1, Math.min(1, all[Math.floor(i * ratio)])) * 32767;
          }
          let bin = "";
          new Uint8Array(out.buffer).forEach(b => (bin += String.fromCharCode(b)));
          wsRef.current?.send(JSON.stringify({ type: "audio", data: btoa(bin) }));
        }
      };

      src.connect(proc);
      proc.connect(ctx.destination);
      stopMicRef.current = () => {
        stream.getTracks().forEach(t => t.stop());
        proc.disconnect();
        ctx.close();
      };
      setMic(true);
    } catch {
      setErr("Microphone access denied or unavailable.");
    }
  }

  function stopMic() {
    stopMicRef.current?.();
    stopMicRef.current = null;
    setMic(false);
  }

  const lastCaption = captions[captions.length - 1];
  const selectedLang = langs.find(l => l.code === lang);

  return (
    <main className="mx-auto max-w-3xl px-6 py-10 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold">🎙️ Live Class</h1>
        <span className={`flex items-center gap-1.5 text-sm px-3 py-1 rounded-full ${connected ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"}`}>
          <span className={`w-2 h-2 rounded-full ${connected ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
          {connected ? "Connected" : "Disconnected"}
        </span>
      </div>

      {err && (
        <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
          ⚠️ {err}
        </div>
      )}

      {/* ── Teacher Controls ─────────────────────────────────────────── */}
      {user.role === "teacher" && (
        <div className="card space-y-4">
          <h2 className="font-semibold">Teacher Panel</h2>
          <p className="text-sm opacity-70">
            Speak into your microphone. Your words will be transcribed and broadcast
            to all students in their chosen language.
          </p>
          <div className="flex gap-3">
            {mic ? (
              <button onClick={stopMic}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-red-600 text-white hover:bg-red-700 transition">
                <span className="w-3 h-3 rounded-full bg-white animate-pulse" />
                Stop broadcasting
              </button>
            ) : (
              <button onClick={startMic}
                className="btn flex items-center gap-2">
                🎙️ Start broadcasting
              </button>
            )}
          </div>

          {/* Teacher: view own captions */}
          <div className="card bg-stone-50 dark:bg-teal-950/30 max-h-48 overflow-y-auto space-y-1">
            <p className="text-xs opacity-40 mb-2">Live transcript (what you said):</p>
            {captions.length === 0
              ? <p className="text-sm opacity-30 italic">Nothing yet…</p>
              : captions.map((c, i) => <p key={i} className="text-sm">{c.original}</p>)
            }
          </div>
        </div>
      )}

      {/* ── Student Controls ─────────────────────────────────────────── */}
      {user.role === "student" && (
        <div className="card space-y-4">
          <h2 className="font-semibold">Your Preferences</h2>
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <span className="text-sm opacity-60">🌐</span>
              <select
                className="input w-auto"
                value={lang}
                onChange={e => setLang(e.target.value)}>
                {langs.map(l => <option key={l.code} value={l.code}>{l.flag} {l.name}</option>)}
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={showSubs} onChange={e => setShowSubs(e.target.checked)} className="w-4 h-4" />
              Subtitles
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={sound} onChange={e => { setSound(e.target.checked); soundRef.current = e.target.checked; }} className="w-4 h-4" />
              Translated audio
            </label>
          </div>
        </div>
      )}

      {/* ── Live Caption Display ─────────────────────────────────────── */}
      {user.role === "student" && showSubs && (
        <div className="min-h-36 flex items-center justify-center">
          {lastCaption?.text ? (
            <div className="subtitle-overlay">{lastCaption.text}</div>
          ) : (
            <p className="text-center opacity-30">
              {connected ? "Waiting for the teacher to start speaking…" : "Connecting…"}
            </p>
          )}
        </div>
      )}

      {/* ── Caption history ───────────────────────────────────────────── */}
      {user.role === "student" && captions.length > 1 && (
        <details className="card">
          <summary className="cursor-pointer text-sm opacity-60 hover:opacity-100">
            Caption history ({captions.length})
          </summary>
          <div className="mt-3 max-h-48 overflow-y-auto space-y-2">
            {captions.map((c, i) => (
              <div key={i} className="text-sm">
                <span className="opacity-40 mr-2">{selectedLang?.name}:</span>
                {c.text}
              </div>
            ))}
          </div>
        </details>
      )}
    </main>
  );
}
