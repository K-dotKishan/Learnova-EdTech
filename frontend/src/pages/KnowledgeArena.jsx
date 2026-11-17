import { useEffect, useRef, useState } from "react";
import { api } from "../api.js";

const TIMER_SECONDS = 20;

function XPCelebration({ xp, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 2500); return () => clearTimeout(t); }, []);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div className="animate-bounce text-center">
        <div className="text-7xl mb-2">🎉</div>
        <div className="text-4xl font-black text-saffron">+{xp} XP</div>
        <div className="text-white/70 text-lg mt-1">Earned!</div>
      </div>
    </div>
  );
}

function TopicCard({ topic, onSelect }) {
  return (
    <button onClick={() => onSelect(topic)}
      className={`group relative overflow-hidden rounded-2xl p-6 text-left hover:-translate-y-1 transition-all duration-300 shadow-lg hover:shadow-2xl bg-gradient-to-br ${topic.color}`}>
      <div className="absolute inset-0 opacity-10"
        style={{ backgroundImage: "radial-gradient(circle at 20% 50%, rgba(255,255,255,0.4) 0%, transparent 40%)" }} />
      <div className="relative">
        <div className="text-5xl mb-3">{topic.icon}</div>
        <h3 className="font-display font-bold text-xl text-white mb-1">{topic.name}</h3>
        <p className="text-white/70 text-sm">{topic.question_count} questions</p>
        <div className="mt-4 inline-flex items-center gap-1 bg-black/20 text-white text-xs font-semibold px-3 py-1.5 rounded-full">
          Play Quiz →
        </div>
      </div>
    </button>
  );
}

function QuizSession({ topic, questions, lang, onComplete }) {
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [correctAnswer, setCorrectAnswer] = useState(null); // set after answer submitted
  const [explanation, setExplanation] = useState("");
  const [results, setResults] = useState([]);
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);
  const [startTime] = useState(Date.now());
  const timerRef = useRef(null);
  const answeredRef = useRef(false);

  const q = questions[current];

  // Reset per question
  useEffect(() => {
    answeredRef.current = false;
    setAnswered(false);
    setSelected(null);
    setCorrectAnswer(null);
    setExplanation("");
    setTimeLeft(TIMER_SECONDS);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          if (!answeredRef.current) {
            answeredRef.current = true;
            setAnswered(true);
            setResults(r => [...r, { question_id: questions[current]?.id, answer: "x" }]);
          }
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [current]);

  async function handleAnswer(opt) {
    if (answeredRef.current) return;
    answeredRef.current = true;
    clearInterval(timerRef.current);
    setSelected(opt);
    setAnswered(true);
    const newResult = { question_id: q.id, answer: opt || "x" };
    setResults(r => [...r, newResult]);

    // Ask backend for the correct answer immediately
    try {
      const res = await api("/arena/submit/", {
        method: "POST",
        body: { topic_slug: topic.slug, answers: [newResult], time_taken_seconds: 0, guest_id: "" }
      });
      const ca = res.correct_answers?.[0];
      if (ca) {
        setCorrectAnswer(ca.correct);
        setExplanation(ca.explanation || "");
      }
    } catch {
      // If single-question check fails, we still show feedback on final submit
    }
  }

  function next() {
    if (current < questions.length - 1) {
      setCurrent(c => c + 1);
    } else {
      const timeTaken = Math.round((Date.now() - startTime) / 1000);
      setResults(prevResults => {
        const alreadyHasCurrent = prevResults.some(r => r.question_id === q.id);
        const finalList = alreadyHasCurrent
          ? prevResults
          : [...prevResults, { question_id: q.id, answer: selected || "x" }];
        setTimeout(() => onComplete(finalList, timeTaken), 0);
        return finalList;
      });
    }
  }

  const progress = ((current + 1) / questions.length) * 100;
  const timePercent = (timeLeft / TIMER_SECONDS) * 100;
  const timerColor = timeLeft > 10 ? "#10b981" : timeLeft > 5 ? "#f59e0b" : "#ef4444";
  const qText = lang === "hi" && q.text_hi ? q.text_hi : q.text;

  const optionStyle = (key) => {
    if (!answered) return selected === key
      ? "border-saffron bg-saffron/20 text-white scale-[1.02]"
      : "border-white/20 text-white/80 hover:border-white/50 hover:bg-white/5 cursor-pointer";
    // After answered — show correct/incorrect using server-confirmed correct answer
    if (correctAnswer && key === correctAnswer) return "border-green-400 bg-green-900/40 text-green-300";
    if (key === selected && selected !== correctAnswer) return "border-red-400 bg-red-900/40 text-red-300";
    // If we don't have correctAnswer yet (pending), just highlight selection
    if (!correctAnswer && key === selected) return "border-saffron bg-saffron/10 text-saffron";
    return "border-white/10 text-white/30";
  };

  const isCorrect = answered && correctAnswer && selected === correctAnswer;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{topic.icon}</span>
          <span className="font-bold text-white">{topic.name}</span>
        </div>
        <span className="text-white/50 text-sm">{current + 1}/{questions.length}</span>
      </div>

      {/* Progress bar */}
      <div className="h-2 rounded-full bg-white/10 mb-2 overflow-hidden">
        <div className="h-full rounded-full bg-leaf transition-all duration-500" style={{ width: progress + "%" }} />
      </div>

      {/* Timer */}
      <div className="flex items-center gap-3 mb-6">
        <div className="h-1.5 flex-1 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full rounded-full transition-all duration-1000"
            style={{ width: timePercent + "%", background: timerColor }} />
        </div>
        <span className="text-sm font-bold tabular-nums" style={{ color: timerColor }}>{timeLeft}s</span>
      </div>

      {/* Question card */}
      <div className="rounded-3xl overflow-hidden shadow-2xl mb-6"
        style={{ background: "linear-gradient(135deg, #1e1e2e, #16213e)" }}>
        <div className="p-8">
          <div className="inline-flex items-center gap-1.5 bg-white/10 text-white/60 text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full mb-4">
            {q.difficulty} · Q{current + 1}
          </div>
          <p className="text-white text-xl font-semibold leading-relaxed">{qText}</p>
        </div>
        <div className="px-8 pb-8 space-y-3">
          {Object.entries(q.options).map(([key, val]) => (
            <button key={key} onClick={() => handleAnswer(key)} disabled={answered}
              className={`w-full text-left px-5 py-4 rounded-xl border-2 font-medium text-sm transition-all duration-200 ${optionStyle(key)}`}>
              <span className="font-mono font-black mr-3 opacity-60 uppercase">{key}.</span>{val}
            </button>
          ))}
        </div>
      </div>

      {/* Explanation */}
      {answered && (
        <div className={`rounded-2xl px-5 py-4 mb-5 text-sm border ${
          !correctAnswer ? "bg-white/5 border-white/10 text-white/60 animate-pulse" :
          isCorrect ? "bg-green-900/30 border-green-500/40 text-green-300" : "bg-red-900/30 border-red-500/40 text-red-300"}`}>
          {!correctAnswer ? (
            <p>Checking answer…</p>
          ) : (
            <>
              <p className="font-bold mb-1">
                {isCorrect ? "✓ Correct!" : `✗ Correct answer: ${correctAnswer.toUpperCase()}`}
              </p>
              {explanation && <p className="opacity-80">{explanation}</p>}
            </>
          )}
        </div>
      )}

      {answered && (
        <button onClick={next} disabled={!correctAnswer}
          className="w-full btn py-4 text-base font-bold disabled:opacity-50">
          {!correctAnswer ? "Verifying…" : current < questions.length - 1 ? "Next Question →" : "See Results 🏆"}
        </button>
      )}
    </div>
  );
}

function ResultScreen({ topic, results, timeTaken, lang, onRetry, onHome }) {
  const score = results.filter(r => r.is_correct).length;
  const total = results.length;
  const accuracy = total ? Math.round(score / total * 100) : 0;
  const xp = score * 20 + (score === total && total > 0 ? 50 : 0);

  const grade = accuracy >= 90 ? { label: "Expert!", color: "#f59e0b", emoji: "🏆" }
    : accuracy >= 70 ? { label: "Great!", color: "#10b981", emoji: "⭐" }
    : accuracy >= 50 ? { label: "Good Try!", color: "#3b82f6", emoji: "👍" }
    : { label: "Keep Practicing", color: "#8b5cf6", emoji: "📚" };

  return (
    <div className="max-w-lg mx-auto text-center">
      <div className="text-7xl mb-4">{grade.emoji}</div>
      <h2 className="font-display text-4xl font-extrabold text-white mb-1">{grade.label}</h2>
      <p className="text-white/50 mb-8">{topic.name} Quiz Complete</p>

      <div className="grid grid-cols-3 gap-4 mb-8">
        {[["Score", `${score}/${total}`, "#10b981"], ["Accuracy", `${accuracy}%`, "#3b82f6"], ["XP Earned", `+${xp}`, "#f59e0b"]].map(([label, val, color]) => (
          <div key={label} className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${color}30` }}>
            <div className="text-2xl font-black" style={{ color }}>{val}</div>
            <div className="text-white/50 text-xs mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Per-question breakdown */}
      <div className="rounded-2xl overflow-hidden mb-8 text-left" style={{ background: "rgba(255,255,255,0.03)" }}>
        {results.map((r, i) => (
          <div key={i} className={`flex items-center gap-3 px-4 py-3 border-b border-white/5 last:border-0 ${r.is_correct ? "text-green-400" : "text-red-400"}`}>
            <span className="text-lg">{r.is_correct ? "✓" : "✗"}</span>
            <span className="text-sm opacity-80 flex-1 line-clamp-1">Q{i + 1}</span>
            <span className="text-xs font-bold uppercase">{r.is_correct ? "Correct" : `Ans: ${r.correct?.toUpperCase()}`}</span>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <button onClick={onRetry} className="flex-1 btn-alt border-white/20 text-white hover:bg-white/10">
          Try Again
        </button>
        <button onClick={onHome} className="flex-1 btn">
          More Quizzes
        </button>
      </div>
    </div>
  );
}

export default function KnowledgeArena({ user }) {
  const [topics, setTopics]         = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [myStats, setMyStats]       = useState(null);
  const [phase, setPhase]           = useState("home");  // home | quiz | result
  const [activeTopic, setActiveTopic] = useState(null);
  const [questions, setQuestions]   = useState([]);
  const [results, setResults]       = useState([]);
  const [timeTaken, setTimeTaken]   = useState(0);
  const [loading, setLoading]       = useState(true);
  const [quizLoading, setQuizLoading] = useState(false);
  const [showXP, setShowXP]         = useState(false);
  const [earnedXP, setEarnedXP]     = useState(0);
  const [lang, setLang]             = useState("en");
  const [guestId]                   = useState(() => localStorage.getItem("arena_guest_id") || (() => {
    const id = Math.random().toString(36).slice(2);
    localStorage.setItem("arena_guest_id", id);
    return id;
  })());

  useEffect(() => {
    Promise.all([
      api("/arena/topics/"),
      api("/arena/leaderboard/"),
      user ? api("/arena/stats/").catch(() => null) : Promise.resolve(null),
    ]).then(([t, lb, s]) => {
      setTopics(t);
      setLeaderboard(lb);
      setMyStats(s);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [user]);

  async function startQuiz(topic) {
    setQuizLoading(true);
    setActiveTopic(topic);
    try {
      const r = await api(`/arena/topics/${topic.slug}/questions/`);
      // Shuffle and take 5
      const shuffled = r.questions.sort(() => Math.random() - 0.5).slice(0, 5);
      setQuestions(shuffled);
      setPhase("quiz");
    } catch (e) {
      alert("Failed to load questions: " + e.message);
    } finally {
      setQuizLoading(false);
    }
  }

  async function completeQuiz(answers, taken) {
    setTimeTaken(taken);
    try {
      const payload = {
        topic_slug: activeTopic.slug,
        answers,
        time_taken_seconds: taken,
        guest_id: guestId,
      };
      const res = await api("/arena/submit/", { method: "POST", body: payload });
      // Enrich results with correct answer & is_correct from server
      const enriched = answers.map((a, i) => {
        const ca = res.correct_answers?.find(c => c.id === a.question_id) || {};
        return { ...a, correct: ca.correct, is_correct: ca.is_correct, explanation: ca.explanation };
      });
      setResults(enriched);
      setEarnedXP(res.xp_earned);
      if (res.xp_earned > 0) setShowXP(true);
      // Refresh stats
      if (user) api("/arena/stats/").then(setMyStats).catch(() => {});
      api("/arena/leaderboard/").then(setLeaderboard).catch(() => {});
    } catch (e) {
      setResults(answers.map(a => ({ ...a, is_correct: false })));
    }
    setPhase("result");
  }

  return (
    <div className="min-h-screen bg-stone-950 text-white">
      {showXP && <XPCelebration xp={earnedXP} onDone={() => setShowXP(false)} />}

      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0"
          style={{ background: "linear-gradient(135deg, #0f0c29, #302b63, #24243e)" }} />
        <div className="absolute inset-0 opacity-20"
          style={{ backgroundImage: "radial-gradient(circle at 20% 30%, #7c3aed 0%, transparent 40%), radial-gradient(circle at 80% 70%, #0f766e 0%, transparent 40%)" }} />
        <div className="relative z-10 max-w-6xl mx-auto px-6 py-12 text-center">
          <div className="text-6xl mb-4">⚡</div>
          <h1 className="font-display text-5xl md:text-6xl font-extrabold mb-3">
            Knowledge <span className="text-saffron">Arena</span>
          </h1>
          <p className="text-white/70 text-lg max-w-xl mx-auto mb-6">
            Test your skills with timed quizzes, earn XP, and climb the leaderboard.
          </p>
          <div className="flex justify-center gap-3 flex-wrap">
            {myStats && (
              <div className="flex items-center gap-2 bg-white/10 rounded-xl px-4 py-2 text-sm">
                <span className="text-saffron font-bold">⚡ {myStats.total_xp} XP</span>
                <span className="opacity-40">|</span>
                <span className="opacity-70">Lv {myStats.level}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-10">
        {phase === "home" && (
          <>
            {/* Stats row */}
            {myStats && (
              <div className="grid grid-cols-3 gap-4 mb-10">
                {[
                  ["🎯", "Accuracy", myStats.accuracy + "%"],
                  ["📝", "Attempts", myStats.total_attempts],
                  ["✅", "Correct", myStats.total_correct],
                ].map(([icon, label, val]) => (
                  <div key={label} className="rounded-2xl p-4 text-center"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <div className="text-2xl mb-1">{icon}</div>
                    <div className="text-xl font-bold text-white">{val}</div>
                    <div className="text-white/40 text-xs">{label}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Topics grid */}
            <h2 className="font-display text-2xl font-bold text-white mb-5">Choose a Topic</h2>
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {Array(8).fill(0).map((_, i) => <div key={i} className="skeleton h-40 rounded-2xl" />)}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-12">
                {topics.map(t => (
                  <TopicCard key={t.slug} topic={t} onSelect={startQuiz} />
                ))}
              </div>
            )}

            {/* Leaderboard */}
            <h2 className="font-display text-2xl font-bold text-white mb-5">🏆 Leaderboard</h2>
            <div className="rounded-3xl overflow-hidden"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
              {leaderboard.length === 0 ? (
                <p className="text-center py-10 text-white/30">No scores yet — be the first!</p>
              ) : (
                leaderboard.slice(0, 10).map((entry, i) => (
                  <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-white/5 last:border-0">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black
                      ${i === 0 ? "bg-yellow-400 text-stone-900" : i === 1 ? "bg-gray-300 text-stone-900" : i === 2 ? "bg-amber-700 text-white" : "bg-white/10 text-white/50"}`}>
                      {i + 1}
                    </span>
                    <span className="flex-1 font-semibold text-white">{entry.username}</span>
                    <span className="text-saffron font-bold">⚡ {entry.total_xp} XP</span>
                    <span className="text-white/30 text-xs">Lv {entry.level}</span>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {phase === "quiz" && (
          quizLoading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin h-12 w-12 border-4 border-saffron border-t-transparent rounded-full" />
            </div>
          ) : (
            <QuizSession topic={activeTopic} questions={questions} lang={lang} onComplete={completeQuiz} />
          )
        )}

        {phase === "result" && (
          <ResultScreen topic={activeTopic} results={results} timeTaken={timeTaken}
            lang={lang}
            onRetry={() => startQuiz(activeTopic)}
            onHome={() => setPhase("home")} />
        )}
      </div>
    </div>
  );
}
