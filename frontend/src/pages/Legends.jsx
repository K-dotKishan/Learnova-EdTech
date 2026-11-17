import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api.js";
import useLang from "../hooks/useLang.js";

// ── Personality card with real photo ─────────────────────────────────────────
function LegendCard({ legend }) {
  const [imgErr, setImgErr] = useState(false);

  return (
    <Link
      to={`/legends/${legend.slug}`}
      className="group relative overflow-hidden rounded-2xl cursor-pointer
                 shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-300
                 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800">

      {/* Photo / gradient header */}
      <div className={`relative h-56 overflow-hidden bg-gradient-to-br ${legend.cover_color}`}>
        {legend.photo_url && !imgErr ? (
          <>
            {/* Gradient overlay so text is readable over photo */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent z-10" />
            <img
              src={legend.photo_url}
              alt={legend.name}
              onError={() => setImgErr(true)}
              className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
            />
          </>
        ) : (
          /* Fallback: emoji on gradient */
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-8xl drop-shadow-2xl">{legend.cover_emoji}</span>
          </div>
        )}

        {/* Category badge — top left */}
        <div className="absolute top-3 left-3 z-20">
          <span className="text-xs font-semibold uppercase tracking-widest text-white bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-full">
            {legend.category_icon} {legend.category}
          </span>
        </div>

        {/* Bookmark indicator */}
        {legend.is_bookmarked && (
          <div className="absolute top-3 right-3 z-20 text-yellow-400 text-lg drop-shadow">♥</div>
        )}

        {/* Name over photo at bottom */}
        <div className="absolute bottom-0 left-0 right-0 z-20 px-4 pb-3 pt-8"
          style={{ background: "linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%)" }}>
          <h3 className="font-display font-extrabold text-white text-lg leading-tight drop-shadow">
            {legend.name}
          </h3>
          <p className="text-white/60 text-xs mt-0.5">
            {legend.born}{legend.died ? ` – ${legend.died}` : ""} · {legend.nationality}
          </p>
        </div>
      </div>

      {/* Bottom card strip */}
      <div className="px-4 py-3">
        <p className="text-sm opacity-70 leading-snug line-clamp-2">{legend.tagline}</p>
        <div className="mt-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs opacity-50">
            {legend.panel_count > 0 && <span>📖 {legend.panel_count} panels</span>}
            {legend.has_quiz && <span>🎯 Quiz</span>}
          </div>
          <span className="text-xs font-semibold text-leaf group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
            Read <span>→</span>
          </span>
        </div>
      </div>
    </Link>
  );
}

function CategoryChip({ cat, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border transition-all duration-200
        ${active
          ? "bg-leaf text-white border-leaf shadow-md scale-105"
          : "border-stone-200 dark:border-teal-800 hover:border-leaf hover:text-leaf"}`}>
      <span>{cat.icon}</span>
      <span>{cat.name}</span>
      <span className={`text-xs ${active ? "text-white/70" : "opacity-40"}`}>({cat.legend_count})</span>
    </button>
  );
}

export default function Legends({ user }) {
  const { lang, setLang, t } = useLang();
  const [legends, setLegends]       = useState([]);
  const [categories, setCategories] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [searchParams, setSearchParams] = useSearchParams();

  const q       = searchParams.get("q") || "";
  const catSlug = searchParams.get("category") || "";

  useEffect(() => {
    api("/legends/categories/").then(cats => {
      setCategories(cats);
      setTotalCount(cats.reduce((acc, c) => acc + (c.legend_count || 0), 0));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (catSlug) params.set("category", catSlug);
    api(`/legends/?${params}`)
      .then(data => {
        setLegends(data);
        if (!q && !catSlug) setTotalCount(data.length);
      })
      .catch(err => {
        console.error("Failed to load legends:", err);
        setError("Could not load legends. Make sure the Django server is running.");
      })
      .finally(() => setLoading(false));
  }, [q, catSlug]);

  const setParam = (key, val) =>
    setSearchParams(p => { const n = new URLSearchParams(p); val ? n.set(key, val) : n.delete(key); return n; });

  return (
    <main className="mx-auto max-w-7xl px-4 py-10">

      {/* ── Cinematic hero banner ──────────────────────────────────────── */}
      <div className="relative rounded-3xl overflow-hidden mb-10 shadow-2xl" style={{ minHeight: 220 }}>
        <div className="absolute inset-0 flex">
          {["/personalities/gandhi.png", "/personalities/apj_kalam.png",
            "/personalities/albert_einstein.png", "/personalities/bhagat_singh.png",
            "/personalities/marie_curie.png"].map((src, i) => (
            <div key={i} className="flex-1 overflow-hidden opacity-30"
              style={{ filter: "grayscale(60%) contrast(1.2)" }}>
              <img src={src} alt="" className="w-full h-full object-cover object-top" />
            </div>
          ))}
        </div>
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/95 via-purple-900/90 to-pink-900/85" />
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
        <div className="relative z-10 p-10 text-white text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest mb-4">
            {t("legends.category_comics")}
          </div>
          <h1 className="font-display text-5xl md:text-6xl font-extrabold mb-3 leading-tight">
            {t("legends.page_title")}
          </h1>
          <p className="text-white/80 text-lg max-w-2xl mx-auto mb-5">
            {t("legends.page_subtitle")}
          </p>
          {/* Language toggle on the listing page too */}
          <div className="flex justify-center">
            <div className="flex bg-white/10 rounded-xl p-1 text-sm gap-0.5">
              <button onClick={() => setLang("en")}
                className={`px-5 py-1.5 rounded-lg transition font-semibold ${lang === "en" ? "bg-white text-stone-900" : "text-white/70 hover:text-white"}`}>
                🇬🇧 English
              </button>
              <button onClick={() => setLang("hi")}
                className={`px-5 py-1.5 rounded-lg transition font-semibold ${lang === "hi" ? "bg-white text-stone-900" : "text-white/70 hover:text-white"}`}>
                🇮🇳 हिंदी
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Search + filters ───────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40 text-sm">🔍</span>
          <input
            className="input pl-9"
            placeholder="Search legends…"
            value={q}
            onChange={e => setParam("q", e.target.value)}
          />
        </div>
        {(q || catSlug) && (
          <button className="btn-alt text-sm" onClick={() => setSearchParams({})}>
            ✕ Clear
          </button>
        )}
      </div>

      {/* ── Category chips ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 mb-8">
        <CategoryChip
          cat={{ icon: "🌟", name: "All", legend_count: totalCount }}
          active={!catSlug}
          onClick={() => setParam("category", "")}
        />
        {categories.map(cat => (
          <CategoryChip key={cat.slug} cat={cat}
            active={catSlug === cat.slug}
            onClick={() => setParam("category", catSlug === cat.slug ? "" : cat.slug)}
          />
        ))}
      </div>

      {/* ── Error ─────────────────────────────────────────────────────── */}
      {error && (
        <div className="mb-6 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 dark:bg-red-950/40 dark:border-red-800 dark:text-red-400 text-sm">
          ⚠️ {error}
        </div>
      )}

      {/* ── Grid ──────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="rounded-2xl overflow-hidden shadow border border-stone-200 dark:border-stone-800">
              <div className="skeleton h-56" />
              <div className="p-3 space-y-2 bg-white dark:bg-stone-900">
                <div className="skeleton h-4 w-3/4" />
                <div className="skeleton h-3 w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : legends.length === 0 ? (
        <div className="text-center py-24 opacity-50">
          <p className="text-5xl mb-4">🔍</p>
          <p className="text-xl font-semibold">No legends found</p>
          <p className="text-sm mt-2">Try a different search or category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
          {legends.map(l => <LegendCard key={l.slug} legend={l} />)}
        </div>
      )}

      <p className="text-center text-xs opacity-30 mt-10">
        Full comic stories for Gandhi, Dr. APJ Abdul Kalam and Einstein. More stories coming soon.
      </p>
    </main>
  );
}
