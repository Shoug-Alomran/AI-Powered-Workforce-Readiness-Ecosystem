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
  "nav.solutions": "الحلول",
  "nav.howItWorks": "آلية العمل",
  "nav.responsibleAi": "ذكاء اصطناعي مسؤول",
  "nav.impact": "الأثر الوطني",
  "nav.team": "الفريق",
  "nav.prototype": "النموذج الأولي",
  "nav.continue": "متابعة",
  "cta.explore": "استكشف النموذج الأولي",
  "cta.demo": "▷　شاهد العرض",
  "hero.vision": "●　متوافق مع رؤية السعودية 2030",
  "hero.title.a": "ربط التعليم بـ",
  "hero.title.b": "الجاهزية المهنية",
  "hero.title.c": " عبر ذكاء اصطناعي قابل للتفسير.",
  "hero.lead": "تربط فرصة الطلاب وأصحاب العمل والجامعات عبر محرك مطابقة شفاف قائم على الأدلة، لتمكين الجيل القادم من المواهب السعودية.",
  "preview.hub": "مركز المسار المهني للطالب",
  "preview.score": "درجة الجاهزية المهنية",
  "preview.verified": "مهارات موثقة",
  "preview.python": "بايثون",
  "preview.dataAnalysis": "تحليل البيانات",
  "preview.gap": "تحليل الفجوات",
  "preview.speaking": "مهارات الإلقاء",
  "preview.recommended": "فرصة مقترحة",
  "preview.role": "متدرب أبحاث ذكاء اصطناعي",
  "preview.employer": "أرامكو • الظهران",
  "preview.match": "تطابق 96%",
  "preview.explainable": "توصية قابلة للتفسير",
  "principle.explainable.title": "ذكاء اصطناعي قابل للتفسير",
  "principle.explainable.body": "لا صناديق سوداء. كل توصية تتضمن تفسيراً واضحاً مبنياً على مؤشرات وأدلة حقيقية.",
  "principle.oversight.title": "إشراف بشري",
  "principle.oversight.body": "الذكاء الاصطناعي مساعد وليس بديلاً. يراجع مرشدو الجامعات ومسؤولو التوظيف كل قرار ويعتمدونه.",
  "principle.privacy.title": "الخصوصية أولاً",
  "principle.privacy.body": "تعامل واعٍ مع البيانات. يملك الطلاب بياناتهم ويتحكمون بمن يطّلع على ملفهم المهني.",
  "solutions.title": "منظومة موحدة للقوى العاملة",
  "solutions.lead": "تبني فرصة حلقة تغذية راجعة تخدم جميع الأطراف في رحلة التوظيف.",
  "solutions.students": "للطلاب",
  "solutions.students.1": "✓　خرائط مهارات مخصصة",
  "solutions.students.2": "✓　شهادات رقمية موثقة",
  "solutions.students.3": "✓　مطابقات وظيفية شفافة",
  "solutions.employers": "لأصحاب العمل",
  "solutions.employers.1": "✓　استقطاب مواهب قائم على البيانات",
  "solutions.employers.2": "✓　تقليص زمن التوظيف",
  "solutions.employers.3": "✓　ترتيب مرشحين قابل للتفسير",
  "solutions.universities": "للجامعات",
  "solutions.universities.1": "✓　مواءمة المناهج مع سوق العمل",
  "solutions.universities.2": "✓　مؤشرات تتبع الخريجين",
  "solutions.universities.3": "✓　تقارير اعتماد آلية",
  "workflow.title": "سير عمل متكامل",
  "workflow.sync.title": "المزامنة والتحليل",
  "workflow.sync.body": "يزامن الطلاب سجلاتهم الأكاديمية ومشاريعهم، ويحلل ذكاء فرصة أكثر من 200 مؤشر مهاري.",
  "workflow.upskill.title": "تحديد الفجوات وتطويرها",
  "workflow.upskill.body": "احصل على درجة جاهزية وخارطة طريق مخصصة لسد الفجوات وفق احتياجات أصحاب العمل الفعلية.",
  "workflow.match.title": "المطابقة والتوظيف",
  "workflow.match.body": "تربط المطابقة الذكية المرشحين الجاهزين بالفرص المناسبة وتمنح أصحاب العمل تقرير تفسير لكل ترشيح.",
  "ethics.title": "الذكاء الاصطناعي القابل للتفسير: أساس الثقة",
  "ethics.lead": "بخلاف الخوارزميات التقليدية، تقدّم فرصة «بطاقات تفسير» لكل توصية. الذكاء الاصطناعي أداة للتمكين لا صندوق أسود للإقصاء.",
  "ethics.bias": "✓　الحد من التحيّز عبر بيانات مدققة",
  "ethics.logs": "✓　سجلات قرارات مقروءة للبشر",
  "ethics.audit": "✓　تدقيق مستمر للعدالة",
  "ethics.report": "▤　اقرأ تقرير الجاهزية للذكاء الاصطناعي (PDF)",
  "ethics.logic": "منطق توصية الذكاء الاصطناعي",
  "ethics.confidence": "الثقة: 94%",
  "ethics.candidate": "سارة العتيبي",
  "ethics.candidateId": "رقم المرشح: #88219",
  "ethics.why": "لماذا هذا الترشيح؟",
  "ethics.reason": "أظهرت المرشحة قدرة متقدمة على حل المشكلات من خلال مقرر CS401، وحققت المئين الثامن والتسعين في أولمبياد البرمجة 2024.",
  "ethics.alignment": "مواءمة المهارات",
  "ethics.skill": "هندسة برمجيات متكاملة",
  "ethics.high": "عالية",
  "metrics.students": "طلاب تجريبيون",
  "metrics.jobs": "فرص تجريبية",
  "metrics.employers": "أصحاب عمل تجريبيون",
  "metrics.accuracy": "دقة التوصيات",
  "final.title": "هل أنت مستعد لتغيير مستقبل الجاهزية المهنية؟",
  "final.lead": "ابدأ استكشاف نموذج فرصة اليوم وشاهد كيف يصنع الذكاء الاصطناعي القابل للتفسير فرقاً حقيقياً.",
  "final.start": "ابدأ الآن",
  "final.contact": "تواصل معنا",
  "footer.tagline": "منصة ذكاء اصطناعي مصممة خصيصاً لمنظومة القوى العاملة السعودية.",
  "footer.platform": "المنصة",
  "footer.workspace": "مساحة عملك",
  "footer.skillMapping": "خرائط المهارات",
  "footer.team": "فريقنا",
  "footer.solutions": "الحلول",
  "footer.account": "الحساب والمساعدة",
  "footer.support": "دعم العملاء",
  "footer.company": "الجهة",
  "footer.privacy": "سياسة الخصوصية",
  "footer.terms": "شروط الاستخدام",
  "footer.accessibility": "إمكانية الوصول",
  "footer.report": "تقرير الجاهزية للذكاء الاصطناعي (PDF)",
  "footer.contact": "تواصل",
  "footer.location": "الرياض، المملكة العربية السعودية",
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
