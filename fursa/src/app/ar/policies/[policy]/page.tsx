import Link from "next/link";
import { notFound } from "next/navigation";

const POLICIES = {
  privacy: { title: "سياسة الخصوصية", intro: "تجمع فرصة المعلومات الضرورية فقط لتقديم خدمات الجاهزية المهنية والمطابقة والتحقق والتحليلات المؤسسية.", sections: [["المعلومات التي نستخدمها", "بيانات الحساب والملف المهني والأدلة الموثقة ومتطلبات الفرص ونشاط التقديم والتغذية الراجعة المصرح بها."], ["حقوقك", "يمكنك إدارة الموافقات وطلب الوصول إلى بياناتك أو تنزيلها أو تصحيحها أو حذفها وطلب مراجعة بشرية."], ["الحماية والاحتفاظ", "تُحمى المعلومات بصلاحيات وصول مناسبة ولا تُحتفظ بها إلا لغرض موثق."]] },
  terms: { title: "شروط الاستخدام", intro: "فرصة منصة لدعم القرار، ولا تضمن نتائجها القبول أو التوظيف أو الأداء المهني.", sections: [["الاستخدام المسؤول", "يجب تقديم معلومات صحيحة وعدم التلاعب بالأدلة أو التقييمات أو التغذية الراجعة."], ["القرارات البشرية", "لا يجوز استخدام النتيجة الآلية سببًا وحيدًا لرفض المتقدم. يبقى الإنسان مسؤولًا عن القرار النهائي."], ["الخدمة التجريبية", "قد تتغير خصائص النموذج الأولي أو تتضمن بيانات غير مكتملة أثناء التقييم."]] },
  "responsible-ai": { title: "سياسة الذكاء الاصطناعي المسؤول", intro: "تستخدم فرصة أتمتة واضحة وقابلة للمراجعة لدعم الحكم البشري لا لاستبداله.", sections: [["قابلية التفسير", "توضح درجات الجاهزية والمطابقة المدخلات والفجوات والأوزان وإصدار النموذج المستخدم."], ["العدالة", "لا تُستخدم السمات المحمية في الترتيب، وتُراقب النتائج لاكتشاف التحيز أو عدم توازن البيانات."], ["الإشراف البشري", "تتطلب القرارات المؤثرة مسؤولًا بشريًا وتبريرًا مسجلًا ومسارًا للاعتراض."]] },
  accessibility: { title: "بيان إمكانية الوصول", intro: "تهدف فرصة إلى توفير تجربة شاملة لمختلف القدرات والأجهزة واللغات وسرعات الاتصال.", sections: [["نهجنا", "نسعى إلى دعم لوحة المفاتيح والتباين الواضح والتسميات المفهومة والتصميم المتجاوب."], ["الإبلاغ عن مشكلة", "إذا تعذر الوصول إلى ميزة، أرسل تذكرة دعم تتضمن الصفحة والجهاز والمساعدة المطلوبة."], ["التحسين المستمر", "تُعامل مشكلات إمكانية الوصول كعيوب في المنتج وتُرتب حسب تأثيرها على إكمال المهمة."]] },
} as const;

// Mirrors the English route: the policy set is fixed, so every page is
// prerendered at build time instead of rendered per request.
export function generateStaticParams() {
  return Object.keys(POLICIES).map(policy => ({ policy }));
}

export default async function ArabicPolicy({ params }: { params: Promise<{ policy: string }> }) {
  const { policy } = await params; const content = POLICIES[policy as keyof typeof POLICIES]; if (!content) notFound();
  return <main className="page-shell" style={{ maxWidth: 820, direction: "rtl", textAlign: "right" }} lang="ar"><span className="eyebrow">سياسات فرصة</span><h1 className="page-title">{content.title}</h1><p className="muted">آخر تحديث: ٤ أغسطس ٢٠٢٦</p><div className="notice" style={{ marginTop: 24 }}>{content.intro}</div>{content.sections.map(([title, body]) => <section className="card" style={{ marginTop: 18 }} key={title}><h2>{title}</h2><p className="muted">{body}</p></section>)}<p className="muted" style={{ marginTop: 24 }}>هذه سياسة أولية للنموذج التجريبي وستُراجع مع قاعدة المعرفة قبل الاستخدام الفعلي.</p><Link className="link" href={`/policies/${policy}`}>English</Link></main>;
}
