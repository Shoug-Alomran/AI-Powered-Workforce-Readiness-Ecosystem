"use client";

import { useEffect, useState } from "react";
import { applyLanguage, type Language } from "@/lib/i18n/translate";

type Theme = "light" | "dark";

export default function PreferencesControls() {
  const [theme, setTheme] = useState<Theme>("light");
  const [language, setLanguage] = useState<Language>("en");

  useEffect(() => {
    const savedTheme = (localStorage.getItem("fursah-theme") as Theme | null) ?? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    // ?lang=ar makes a page shareable in Arabic and lets the language be set
    // before any user interaction; the choice is then remembered as usual.
    const requested = new URLSearchParams(location.search).get("lang");
    const savedLanguage = requested === "ar" || requested === "en"
      ? requested
      : (localStorage.getItem("fursah-language") as Language | null) ?? "en";
    document.documentElement.dataset.theme = savedTheme;
    localStorage.setItem("fursah-language", savedLanguage);
    applyLanguage(savedLanguage);
    const frame = requestAnimationFrame(() => {
      setTheme(savedTheme);
      setLanguage(savedLanguage);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  // React re-renders (navigation, server actions, client state) write English back
  // into the DOM, so re-run the pass whenever the tree changes. Translating never
  // produces a dictionary hit on its own output, so this settles after one pass.
  useEffect(() => {
    // Also applied directly: the first render still carries the default "en", so
    // without this the observer's own restore pass would undo the saved Arabic
    // before the state update lands.
    applyLanguage(language);
    let frame = 0;
    const observer = new MutationObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => applyLanguage(language));
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, [language]);

  function toggleTheme() {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem("fursah-theme", next);
    document.documentElement.dataset.theme = next;
  }

  function toggleLanguage() {
    const next = language === "en" ? "ar" : "en";
    setLanguage(next);
    localStorage.setItem("fursah-language", next);
    applyLanguage(next);
  }

  return <div className="preference-controls" aria-label="Display preferences">
    <button type="button" onClick={toggleTheme} aria-label={`Use ${theme === "light" ? "dark" : "light"} mode`} title="Toggle color theme"><span aria-hidden>{theme === "light" ? "☾" : "☀"}</span></button>
    <button type="button" onClick={toggleLanguage} aria-label={`Switch to ${language === "en" ? "Arabic" : "English"}`} title="Change language"><b>{language === "en" ? "AR" : "EN"}</b></button>
  </div>;
}
