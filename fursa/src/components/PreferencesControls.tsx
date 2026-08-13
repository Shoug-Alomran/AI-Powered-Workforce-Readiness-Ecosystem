"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";
type Language = "en" | "ar";

const arabic: Record<string, string> = {
  "brand.tagline": "الاستعداد للقوى العاملة بالذكاء الاصطناعي",
  "nav.intelligence": "ذكاء سوق العمل",
  "nav.signin": "تسجيل الدخول",
  "nav.dashboard": "لوحة التحكم",
  "nav.jobs": "الفرص",
  "nav.profile": "الملف الشخصي",
  "nav.postJob": "نشر فرصة",
  "nav.university": "لوحة الجامعة",
  "nav.admin": "إدارة التحقق",
  "nav.signout": "تسجيل الخروج",
  "home.eyebrow": "مصمم لرؤية السعودية 2030",
  "home.title": "حوّل طموحك إلى مسار مهني جاهز.",
  "home.lead": "تربط فرصة الطلاب وأصحاب العمل والجامعات بذكاء اصطناعي قابل للتفسير، لتوضح لكل متعلم خطوته التالية ولكل صاحب عمل سبب ملاءمة المرشح.",
  "home.explore": "استكشف النموذج الأولي",
  "home.insights": "استعرض مؤشرات سوق العمل",
  "home.human": "إشراف بشري",
  "home.explainable": "درجات قابلة للتفسير",
  "home.privacy": "الخصوصية أولاً",
  "home.ecosystem": "منظومة واحدة مترابطة",
  "home.ecosystemTitle": "من التعلم إلى التوظيف، ثم العودة للتطوير.",
  "home.students": "الطلاب",
  "home.employers": "أصحاب العمل",
  "home.universities": "الجامعات",
  "home.prototype": "نموذج أولي فعّال",
  "home.realData": "بيانات حقيقية. منطق شفاف. ملاحظات فورية.",
  "auth.eyebrow": "وصول آمن للحساب",
  "auth.title": "ابنِ مسارك نحو الجاهزية المهنية.",
  "auth.lead": "سجّل الدخول أو أنشئ حساباً كطالب أو صاحب عمل أو ممثل جامعة.",
  "auth.demo": "هل ترغب بالاستكشاف أولاً؟ اضغط هنا لعرض المستخدمين الجاهزين.",
  "auth.signin": "تسجيل الدخول",
  "auth.signup": "إنشاء حساب",
  "auth.welcome": "مرحباً بعودتك",
  "auth.create": "أنشئ حساب فرصة",
  "auth.reset": "إعادة تعيين كلمة المرور",
  "auth.secure": "مصادقة آمنة بالبريد الإلكتروني وكلمة المرور عبر Firebase.",
  "auth.forgot": "نسيت كلمة المرور؟",
  "auth.back": "العودة لتسجيل الدخول ←",
  "demo.eyebrow": "مستخدمو النموذج الأولي",
  "demo.title": "اختر حساباً تجريبياً",
};

function applyLanguage(language: Language) {
  document.documentElement.lang = language;
  document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
  document.querySelectorAll<HTMLElement>("[data-i18n]").forEach((element) => {
    const key = element.dataset.i18n;
    const english = element.dataset.i18nEn ?? element.textContent ?? "";
    if (!element.dataset.i18nEn) element.dataset.i18nEn = english;
    const translated = language === "ar" && key ? arabic[key] ?? english : english;
    if (element.textContent !== translated) element.textContent = translated;
  });
}

export default function PreferencesControls() {
  const [theme, setTheme] = useState<Theme>("light");
  const [language, setLanguage] = useState<Language>("en");

  useEffect(() => {
    const savedTheme = (localStorage.getItem("fursah-theme") as Theme | null) ?? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    const savedLanguage = (localStorage.getItem("fursah-language") as Language | null) ?? "en";
    document.documentElement.dataset.theme = savedTheme;
    applyLanguage(savedLanguage);
    const frame = requestAnimationFrame(() => {
      setTheme(savedTheme);
      setLanguage(savedLanguage);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const observer = new MutationObserver(() => applyLanguage(language));
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
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
