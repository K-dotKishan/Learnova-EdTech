/**
 * useLang – React hook for the Legends language toggle.
 * Persists selection in localStorage so it survives page refreshes.
 *
 * Usage:
 *   const { lang, setLang, t, story } = useLang(slug);
 *   t("legends.search_placeholder")  → string in current language
 *   story("mahatma-gandhi")          → story object (panels, quiz, name…)
 */
import { useState, useCallback } from "react";
import en from "../locales/en.json";
import hi from "../locales/hi.json";

const STORAGE_KEY = "legends_lang";

const DICTS = { en, hi };

/** Dot-path accessor: get(obj, "legends.search_placeholder") */
function get(obj, path) {
  return path.split(".").reduce((cur, k) => (cur && cur[k] !== undefined ? cur[k] : null), obj);
}

export default function useLang() {
  const [lang, setLangState] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "hi" ? "hi" : "en";
  });

  const setLang = useCallback((code) => {
    const c = code === "hi" ? "hi" : "en";
    localStorage.setItem(STORAGE_KEY, c);
    setLangState(c);
  }, []);

  /**
   * Translate a UI key, falling back to English if Hindi is missing.
   * e.g. t("legends.search_placeholder")
   */
  const t = useCallback((key) => {
    const dict = DICTS[lang] || en;
    return get(dict, key) ?? get(en, key) ?? key;
  }, [lang]);

  /**
   * Get the full story object for a slug, in the current language.
   * Falls back to English if Hindi story is missing.
   * e.g. story("mahatma-gandhi").panels[0].title
   */
  const story = useCallback((slug) => {
    const dict = DICTS[lang] || en;
    return get(dict, `stories.${slug}`) ?? get(en, `stories.${slug}`) ?? null;
  }, [lang]);

  return { lang, setLang, t, story, isHindi: lang === "hi" };
}
