/**
 * Arabic layer for /standards and /knowledge-base.
 *
 * Keys are the exact rendered English string, as everywhere else in this
 * dictionary. Two conventions specific to these pages:
 *
 *   - Standard designations (ITU-T Y.3172, ISO/IEC 42001, WCAG 2.1 AA) stay in
 *     Latin script. They are identifiers, and an Arabic reader looking one up
 *     needs the form that appears on the ITU and ISO catalogues.
 *   - The seven clause 8.1 node names are not repeated here; they live in
 *     ar.admin.ts, which the governance page shares, so there is exactly one
 *     Arabic name per node across the platform.
 */
export const standards: Record<string, string> = {
  // --- /standards: hero and navigation ------------------------------------
  "Standards conformance": "المطابقة للمعايير",
  "Built to a standard, node by node.": "مبني على معيار، عقدةً بعقدة.",
  "Clause 8.1 pipeline nodes implemented and mapped to source":
    "عقد المسار في البند 8.1 منفَّذة ومربوطة بملفاتها المصدرية",
  "AI Readiness dimensions addressed, with the rest partial or out of scope":
    "من أبعاد الجاهزية للذكاء الاصطناعي مُعالَجة، والبقية جزئية أو خارج النطاق",
  "Governed by": "تحكمها",
  "Policy gaps identified, including one blocking for production":
    "فجوات سياساتية مُحدَّدة، إحداها مانعة للتشغيل الإنتاجي",
  "Y.3172 clause 8.1": "البند 8.1 من Y.3172",
  "Extensions": "الامتدادات",
  "13 dimensions": "الأبعاد الثلاثة عشر",
  "Policy gaps": "الفجوات السياساتية",

  // --- /standards: pipeline section ---------------------------------------
  "The ML pipeline, in the standard's own terms": "مسار تعلُّم الآلة بمصطلحات المعيار نفسه",
  "What Fursah runs here": "ما تُشغّله فرصة هنا",
  "Read Y.3172 ↗": "اطّلع على Y.3172 ↗",

  // Clause 8.1 node functions, paraphrased from the Recommendation.
  "Supplies the data used as input to the ML pipeline.":
    "يوفّر البيانات المستخدَمة مدخلاً لمسار تعلُّم الآلة.",
  "Collects data from one or more source nodes.": "يجمع البيانات من عقدة مصدر واحدة أو أكثر.",
  "Cleans, aggregates and otherwise prepares collected data before it reaches the model.":
    "ينظّف البيانات المجموعة ويجمّعها ويهيّئها قبل وصولها إلى النموذج.",
  "Hosts the machine learning models that produce the pipeline's output.":
    "يستضيف نماذج تعلُّم الآلة التي تنتج مخرجات المسار.",
  "Carries the policies that constrain how the pipeline may operate.":
    "يحمل السياسات التي تقيّد طريقة عمل المسار.",
  "Distributes the model's output results to their destinations.":
    "يوزّع نتائج مخرجات النموذج إلى جهاتها.",
  "Receives the distributed output and acts on it.": "يستقبل المخرجات الموزَّعة ويتصرّف بناءً عليها.",

  // --- /standards: extensions ---------------------------------------------
  "Beyond clause 8.1": "خارج نطاق البند 8.1",
  "Two nodes the pipeline definition does not contain": "عقدتان لا يتضمّنهما تعريف المسار",
  "ITU-T Y.3181, architectural framework for ML sandbox":
    "ITU-T Y.3181، الإطار المعماري للبيئة المعزولة لتعلُّم الآلة",
  "ITU-T Y.3176, ML marketplace integration and orchestration":
    "ITU-T Y.3176، تكامل سوق نماذج تعلُّم الآلة وتنسيقها",
  "Implemented": "منفَّذ",

  // --- /standards: dimensions ---------------------------------------------
  "AI Ready Report 2.0 · January 2026": "تقرير الجاهزية للذكاء الاصطناعي 2.0 · يناير 2026",
  "Self-assessment against the 13 dimensions": "تقييم ذاتي مقابل الأبعاد الثلاثة عشر",
  "Addressed": "مُعالَج",
  "Partial": "جزئي",
  "Out of scope": "خارج النطاق",

  "Data/model Marketplace": "سوق البيانات والنماذج",
  "Generated Content Marketplace": "سوق المحتوى المولَّد",
  "Cross-domain correlation analysis": "تحليل الارتباط عبر المجالات",
  "Contextualization and Regional Impact": "المواءمة السياقية والأثر الإقليمي",
  "Level of Integration of AI in Workflows": "مستوى دمج الذكاء الاصطناعي في سير العمل",
  "Human Interface": "الواجهة البشرية",
  "Strategy Alignment": "مواءمة الاستراتيجية",
  "Collaboration with AI": "التعاون مع الذكاء الاصطناعي",
  "Impacts of Humans in AI Integration": "أثر البشر في دمج الذكاء الاصطناعي",
  "AI & Policies": "الذكاء الاصطناعي والسياسات",
  "AI for Inclusion": "الذكاء الاصطناعي من أجل الشمول",
  "Granular Priorities": "الأولويات التفصيلية",
  "Digital Infrastructure": "البنية التحتية الرقمية",

  // --- /standards: policy gaps --------------------------------------------
  "Chapter 4 gap taxonomy": "تصنيف الفجوات في الفصل الرابع",
  "Policy gaps this project ran into": "فجوات سياساتية واجهها هذا المشروع",
  "International standards": "المعايير الدولية",
  "National policy": "السياسات الوطنية",
  "What we observed": "ما لاحظناه",
  "Why it is not ours to fix": "لماذا لا يمكننا معالجتها وحدنا",
  "What would close it": "ما الذي يسدّها",
  "Blocking for production": "مانعة للتشغيل الإنتاجي",

  "Fairness cannot be measured without collecting what fairness law forbids collecting":
    "لا يمكن قياس الإنصاف دون جمع ما تمنع قواعد الإنصاف جمعه",
  "No in-Kingdom inference path for a prototype at this scale":
    "لا يوجد مسار استدلال داخل المملكة لنموذج أولي بهذا الحجم",
  "No standard skill taxonomy for education-to-employment interoperability":
    "لا يوجد تصنيف معياري للمهارات يتيح التشغيل البيني بين التعليم والتوظيف",
  "Verified credentials are not portable between systems":
    "الشهادات المُوثَّقة غير قابلة للنقل بين الأنظمة",
  "No public longitudinal series to validate workforce signals against":
    "لا توجد سلسلة زمنية عامة للتحقّق من مؤشرات سوق العمل مقابلها",
  "No defined threshold for when employment decision support becomes an automated decision":
    "لا يوجد حدّ معرَّف يتحوّل عنده دعم قرار التوظيف إلى قرار آلي",

  // --- /knowledge-base ----------------------------------------------------
  "Knowledge base": "قاعدة المعرفة",
  "Knowledge Base": "قاعدة المعرفة",
  "The documents this is built on.": "الوثائق التي بُني عليها هذا العمل.",
  "Public documents, each linked to its publisher": "وثيقة عامة، كلٌّ منها مرتبطة بجهة نشرها",
  "Traced to the specific file in this repository that depends on them":
    "مرتبطة بالملف المحدَّد في هذا المستودع الذي يعتمد عليها",
  "Published in Arabic or bilingually by the issuing authority":
    "منشورة بالعربية أو بلغتين من الجهة المُصدِرة",
  "What it is": "ما هي",
  "What depends on it": "ما الذي يعتمد عليها",
  "Open original ↗": "افتح الأصل ↗",

  "ITU standards and reports": "معايير وتقارير الاتحاد الدولي للاتصالات",
  "Saudi regulatory instruments": "الأدوات التنظيمية السعودية",
  "National strategy and statistics": "الاستراتيجية الوطنية والإحصاءات",
  "International frameworks": "الأطر الدولية",

  "A note on sourcing": "ملاحظة حول التوثيق",
  "Where a figure came through a second party, both are named":
    "حين يصل الرقم عبر طرف ثانٍ، تُذكر الجهتان معاً",

  // --- Shared calls to action ---------------------------------------------
  "Every document behind this page is public.": "كل وثيقة خلف هذه الصفحة وثيقة عامة.",
  "Open the knowledge base": "افتح قاعدة المعرفة",
  "Responsible AI policy": "سياسة الذكاء الاصطناعي المسؤول",
  "See how these documents shaped the build.": "اطّلع على كيفية تشكيل هذه الوثائق للمنتج.",
  "National impact": "الأثر الوطني",
  "Standards": "المعايير",
  "Standards Conformance": "المطابقة للمعايير",

  // --- /standards: body prose ---------------------------------------------
  "Fursah is described in the vocabulary of ITU-T Y.3172 clause 8.1, self-assessed against the 13 dimensions of the ITU AI Ready Report 2.0, and honest about what it does not cover. Every node below names the source file that implements it, so the claim can be checked rather than taken.":
    "تُوصَف فرصة بمفردات البند 8.1 من ITU-T Y.3172، وتُقيَّم ذاتياً مقابل الأبعاد الثلاثة عشر في تقرير الاتحاد للجاهزية للذكاء الاصطناعي 2.0، وتصرّح بما لا تغطّيه. وكل عقدة أدناه تذكر الملف المصدري الذي ينفّذها، حتى يمكن التحقّق من الادّعاء لا مجرّد تصديقه.",
  "Clause 8.1 defines the pipeline as seven nodes. The left column of each row is what the Recommendation says the node is for; the right is what Fursah runs there. Keeping those two apart matters: describing our implementation in place of the standard's function would be a different taxonomy wearing the same identifiers.":
    "يعرّف البند 8.1 المسار بسبع عقد. العمود الأيمن في كل صف هو ما تقول التوصية إن العقدة تؤدّيه، والآخر هو ما تُشغّله فرصة عندها. والفصل بينهما مهم: فوصف تنفيذنا مكان وظيفة المعيار يجعله تصنيفاً مختلفاً يرتدي المعرّفات نفسها.",
  "The M node is split deliberately. The deterministic engine produces every score that affects a person; the language model only reads documents and explains results already produced. Human review carried at the P node overrides any output of M, and the override is logged.":
    "عقدة النموذج منقسمة عن قصد. فالمحرك الحتمي ينتج كل درجة تؤثر في شخص، أما النموذج اللغوي فيقرأ المستندات ويشرح نتائج أُنتجت سلفاً. والمراجعة البشرية عند عقدة السياسة تتجاوز أي مخرج من عقدة النموذج، ويُسجَّل التجاوز.",
  "Fursah runs two components that clause 8.1 does not define. They are listed separately rather than folded into the seven, because presenting a non-8.1 node as an 8.1 node is exactly the error this page exists to avoid.":
    "تُشغّل فرصة مكوّنين لا يعرّفهما البند 8.1. وقد أُدرجا منفصلين بدل دمجهما ضمن السبع، لأن تقديم عقدة خارج البند 8.1 على أنها منه هو بالضبط الخطأ الذي وُجدت هذه الصفحة لتفاديه.",
  "The report derives its dimensions bottom-up from Plugfest projects, so partial coverage is the expected result for any single application. Each row below is marked addressed, partial or out of scope, and a dimension Fursah does not reach states the reason rather than claiming credit. Dimension 9 is the one to read first — the report names skills gap analysis as a desired output of the framework, and that is precisely what Fursah computes.":
    "يشتقّ التقرير أبعاده من مشاريع Plugfest من الأسفل إلى الأعلى، ولذلك فالتغطية الجزئية هي النتيجة المتوقّعة لأي تطبيق منفرد. وكل صف أدناه موسوم بـ«مُعالَج» أو «جزئي» أو «خارج النطاق»، والبُعد الذي لا تبلغه فرصة يذكر السبب بدل ادّعاء الإنجاز. والبُعد التاسع هو الأجدر بالقراءة أولاً، إذ يسمّي التقرير تحليل فجوة المهارات مخرجاً منشوداً للإطار، وهو تحديداً ما تحسبه فرصة.",
  "Structured on the three gap types the AI Ready Report sets out. These are constraints encountered while building Fursah, not a literature survey — each one is a thing the platform cannot resolve on its own, with what would close it.":
    "مُنظَّمة وفق أنواع الفجوات الثلاثة التي يحدّدها تقرير الجاهزية. وهذه قيود واجهناها أثناء بناء فرصة، لا مسحاً مرجعياً — كل واحدة منها أمر لا تستطيع المنصة حلّه وحدها، مع ما يسدّه.",
  "The knowledge base lists each instrument cited here with its publisher, a link to the original, and the file in this repository that depends on it.":
    "تُدرج قاعدة المعرفة كل أداة مُستشهد بها هنا مع جهة نشرها، ورابط الأصل، والملف في هذا المستودع الذي يعتمد عليها.",

  // --- Dimension descriptions (what the report measures) -------------------
  "Creation of an environment where data, expert knowledge and models are exchanged and turned into business value.":
    "إيجاد بيئة تُتبادَل فيها البيانات ومعرفة الخبراء والنماذج وتُحوَّل إلى قيمة تجارية.",
  "Ease of creating new datasets, models and services by plugging existing materials together.":
    "سهولة إنشاء مجموعات بيانات ونماذج وخدمات جديدة بتركيب المواد القائمة معاً.",
  "Similarities and patterns across domain workflows, and opportunities to integrate AI across them.":
    "أوجه التشابه والأنماط عبر سير العمل في المجالات المختلفة، وفرص دمج الذكاء الاصطناعي بينها.",
  "Adaptation of solutions to regional context: locally collected data, regional guidelines, indigenous solutions.":
    "مواءمة الحلول مع السياق الإقليمي: بيانات مجموعة محلياً، وأدلة إرشادية إقليمية، وحلول محلية المنشأ.",
  "How well AI is integrated into a domain workflow and what benefit it delivers; interoperability of the interfaces involved.":
    "مدى جودة دمج الذكاء الاصطناعي في سير عمل المجال وما يقدّمه من فائدة، والتشغيل البيني للواجهات المعنية.",
  "Accessibility of interfaces, multi-modal content, local language availability, ease of interaction for people with special needs.":
    "إتاحة الواجهات، والمحتوى متعدد الوسائط، وتوافر اللغات المحلية، ويسر التفاعل لذوي الاحتياجات الخاصة.",
  "Coordination of AI integration strategy across distributed entities — industry, academia, government.":
    "تنسيق استراتيجية دمج الذكاء الاصطناعي عبر جهات موزّعة: الصناعة والأوساط الأكاديمية والحكومة.",
  "The degree to which humans dynamically interact with and shape AI output, rather than only consuming it.":
    "درجة تفاعل البشر ديناميكياً مع مخرجات الذكاء الاصطناعي وتشكيلها، لا استهلاكها فحسب.",
  "Skill distribution and levels, ecosystem ability to develop AI talent, and — named explicitly in the report — skills gap analysis identifying what skills are currently lacking.":
    "توزيع المهارات ومستوياتها، وقدرة المنظومة على تنمية مواهب الذكاء الاصطناعي، وتحليل فجوة المهارات لتحديد المهارات الناقصة حالياً، وهو ما يسمّيه التقرير صراحةً.",
  "The ability of decision makers to experiment with and review policy impact using AI, and the readiness of policy to enable AI integration.":
    "قدرة صنّاع القرار على تجريب أثر السياسات ومراجعته باستخدام الذكاء الاصطناعي، وجاهزية السياسات لتمكين دمجه.",
  "Use of AI techniques to bridge access gaps for underserved groups.":
    "استخدام تقنيات الذكاء الاصطناعي لسدّ فجوات الوصول لدى الفئات الأقل خدمة.",
  "Availability of granular user priorities that map onto broader solutions, and customisation of the model to local context.":
    "توافر أولويات تفصيلية للمستخدمين يمكن ربطها بحلول أوسع، وتخصيص النموذج للسياق المحلي.",
  "Availability of devices, computing capability, connectivity and energy, including the nodes identified in ITU-T Y.3172.":
    "توافر الأجهزة والقدرة الحاسوبية والاتصال والطاقة، بما في ذلك العقد المحدَّدة في ITU-T Y.3172.",

  // --- Dimension self-assessment (how Fursah addresses each) ---------------
  "The skill taxonomy is a shared reference that employers, universities and students all write against, which is the precondition for exchange. No marketplace or monetisation layer exists in the prototype.":
    "تصنيف المهارات مرجع مشترك يكتب مقابله أصحاب العمل والجامعات والطلاب جميعاً، وهو شرط سابق للتبادل. ولا توجد في النموذج الأولي طبقة سوق أو تحصيل مالي.",
  "Fursah generates no tradeable content. The language model reads documents and explains results; it produces no dataset or model asset intended for reuse or exchange.":
    "لا تولّد فرصة محتوى قابلاً للتداول. فالنموذج اللغوي يقرأ المستندات ويشرح النتائج، ولا ينتج مجموعة بيانات أو أصلاً نموذجياً معدّاً لإعادة الاستخدام أو التبادل.",
  "The platform correlates two domains that are normally measured separately — higher education and labour demand — and publishes the coverage gap between them as a single figure.":
    "تربط المنصة مجالين يُقاسان عادةً منفصلين — التعليم العالي وطلب سوق العمل — وتنشر فجوة التغطية بينهما رقماً واحداً.",
  "Built for the Saudi context rather than localised into it: the taxonomy, the evidence types, the Arabic interface layer, and the governance mapping to PDPL, SDAIA, NDMO and NCA instruments are all regional inputs, not translations of a foreign design.":
    "بُنيت للسياق السعودي لا عُرِّبت إليه: فالتصنيف وأنواع الأدلة وطبقة الواجهة العربية وربط الحوكمة بأدوات نظام حماية البيانات الشخصية وسدايا ومكتب إدارة البيانات الوطنية والهيئة الوطنية للأمن السيبراني كلها مدخلات إقليمية، لا ترجمة لتصميم أجنبي.",
  "AI sits at four defined points in the education-to-employment workflow — evidence extraction, readiness scoring, role matching, curriculum alignment — rather than as a single bolt-on feature. Each point has a named input, a named output and a human decision downstream of it.":
    "يقع الذكاء الاصطناعي عند أربع نقاط محدَّدة في مسار التعليم إلى التوظيف — استخراج الأدلة، وتقييم الجاهزية، ومطابقة الوظائف، ومواءمة المناهج — لا كخاصية ملحقة واحدة. ولكل نقطة مدخل مسمّى ومخرج مسمّى وقرار بشري بعدها.",
  "Arabic runs as a full runtime layer across every portal rather than a separate site, targets WCAG 2.1 AA, and the role-scoped assistant provides a conversational route to the same figures the dashboards show. The accessibility conformance claim is internal review, not an independent audit.":
    "تعمل العربية طبقةً كاملة في وقت التشغيل عبر كل البوابات لا كموقع منفصل، وتستهدف WCAG 2.1 AA، ويتيح المساعد المحصور بالدور طريقاً حوارياً إلى الأرقام نفسها التي تعرضها لوحات المعلومات. وادّعاء مطابقة الإتاحة مبني على مراجعة داخلية لا تدقيق مستقل.",
  "The three stakeholder groups the report names are the platform's three portals, and the intelligence layer is the coordination mechanism between them. Alignment to the Human Capability Development Program is stated against specific commitments.":
    "فئات المستفيدين الثلاث التي يسمّيها التقرير هي بوابات المنصة الثلاث، وطبقة التحليل هي آلية التنسيق بينها. والمواءمة مع برنامج تنمية القدرات البشرية مذكورة مقابل التزامات محدَّدة.",
  "Every extraction is a proposal a human accepts or rejects, and the rejection is retained. Students may dismiss a suggested career direction, and appeals against any automated result route to a named reviewer whose decision supersedes the model.":
    "كل استخراج اقتراحٌ يقبله إنسان أو يرفضه، ويُحتفظ بالرفض. وللطلاب رفض أي توجّه مهني مقترح، وتُحال الاعتراضات على أي نتيجة آلية إلى مراجع مسمّى يعلو قراره على النموذج.",
  "This is the platform's primary output. Fursah computes the skills gap at three resolutions: per student against a target role, per institution against employer demand, and per ecosystem as the set of requested skills no university offering covers.":
    "هذا هو المخرج الأساسي للمنصة. تحسب فرصة فجوة المهارات على ثلاثة مستويات: لكل طالب مقابل وظيفة مستهدفة، ولكل مؤسسة مقابل طلب أصحاب العمل، وللمنظومة ككل بوصفها مجموعة المهارات المطلوبة التي لا يغطّيها أي برنامج جامعي.",
  "The governance sandbox lets an operator state a proposed control, see which safeguards it breaches, and record the human decision. The workforce-intelligence surface is the evidence base a policymaker would review between statistical releases.":
    "تتيح البيئة المعزولة للحوكمة أن يعرض المشغّل ضابطاً مقترحاً، ويرى أي الضمانات يخرقها، ويسجّل القرار البشري. وواجهة تحليلات سوق العمل هي قاعدة الأدلة التي يراجعها صانع السياسات بين الإصدارات الإحصائية.",
  "Fursah collects no gender, nationality, age or GPA field, so none can enter a ranking. Assessment is against published criteria identical for every institution, which is the mechanism by which a student from a less prestigious university is scored on evidence rather than on provenance.":
    "لا تجمع فرصة أي حقل للجنس أو الجنسية أو العمر أو المعدل التراكمي، فلا يمكن لأيٍّ منها دخول ترتيب. والتقييم يجري مقابل معايير منشورة متطابقة لكل مؤسسة، وهي الآلية التي يُقيَّم بها طالب جامعة أقل شهرة على أدلته لا على منشئه.",
  "Career tracks carry per-skill weights, and universities set their own offerings, so priorities are expressible at institution level. There is no mechanism yet for a region or sector to set its own weighting over the national taxonomy.":
    "تحمل المسارات المهنية أوزاناً لكل مهارة، وتحدّد الجامعات برامجها بنفسها، فتُعبَّر الأولويات على مستوى المؤسسة. ولا توجد بعد آلية تتيح لمنطقة أو قطاع تحديد ترجيحه الخاص فوق التصنيف الوطني.",
  "The Y.3172 nodes are identified and mapped above. Infrastructure readiness itself is a national measure rather than an application one, and the prototype's own hosting is a declared gap — see the implementation gaps below.":
    "عقد Y.3172 محدَّدة ومربوطة أعلاه. وجاهزية البنية التحتية نفسها مقياس وطني لا مقياس تطبيق، واستضافة النموذج الأولي نفسها فجوة معلنة — انظر فجوات التنفيذ أدناه.",

  // --- Policy gap bodies ---------------------------------------------------
  "Fursah deliberately collects no gender, nationality, age or GPA, so no protected characteristic can enter a score. The same decision makes disparate-impact testing impossible: there is no attribute to disaggregate outcomes by.":
    "لا تجمع فرصة عمداً أي بيان عن الجنس أو الجنسية أو العمر أو المعدل التراكمي، فلا يمكن لأي خاصية محمية دخول أي درجة. والقرار نفسه يجعل اختبار الأثر التمييزي مستحيلاً: إذ لا توجد سمة تُفصَّل النتائج بحسبها.",
  "Data minimisation and demonstrable non-discrimination pull in opposite directions, and no instrument we could find resolves which takes precedence for an employment-adjacent system. Proxies remain: institution, region and career interruption can each stand in for a protected class.":
    "يتجاذب تقليل البيانات وإثبات عدم التمييز في اتجاهين متعاكسين، ولم نجد أداة تحسم أيهما يُقدَّم في نظام متّصل بالتوظيف. وتبقى المتغيرات البديلة قائمة: فالمؤسسة والمنطقة وانقطاع المسار المهني قد ينوب كلٌّ منها عن فئة محمية.",
  "A lawful basis for holding protected attributes strictly for fairness auditing, held separately from the scoring path and accessible only to an auditor. Without it, every minimising system in this category is structurally unauditable.":
    "أساس نظامي للاحتفاظ بالسمات المحمية لغرض تدقيق الإنصاف حصراً، محفوظة بمعزل عن مسار التقييم ومتاحة للمدقّق وحده. وبدونه يبقى كل نظام مُقلِّل للبيانات في هذه الفئة غير قابل للتدقيق بنيوياً.",
  "Application hosting, object storage and model inference all currently run outside the Kingdom. The DPIA records this as risk R5 and marks it blocking for production.":
    "تعمل استضافة التطبيق وتخزين الكائنات واستدلال النموذج حالياً خارج المملكة. ويسجّل تقييم أثر حماية البيانات ذلك بوصفه الخطر R5 ويصفه بأنه مانع للتشغيل الإنتاجي.",
  "PDPL transfer conditions are clear about the obligation, but a small project has no accessible compliant inference option: the affordable model-serving platforms are all extraterritorial, and the in-Kingdom alternatives are procurement relationships rather than services one can sign up for.":
    "شروط النقل في نظام حماية البيانات الشخصية واضحة في الالتزام، لكن لا يجد مشروع صغير خياراً متاحاً ومتوافقاً للاستدلال: فمنصات تشغيل النماذج الميسورة كلها خارج الحدود، والبدائل داخل المملكة علاقات شرائية لا خدمات يمكن الاشتراك فيها.",
  "A published tier of in-Kingdom inference reachable by research and prototype workloads, or a defined sandbox basis under which pre-production systems may use extraterritorial inference on non-production data with disclosure.":
    "فئة منشورة من الاستدلال داخل المملكة تصلها أحمال البحث والنماذج الأولية، أو أساس معرَّف لبيئة معزولة تستطيع فيه الأنظمة قبل الإنتاج استخدام استدلال خارج الحدود على بيانات غير إنتاجية مع الإفصاح.",
  "Matching a course outcome to an employer requirement requires both to name the same skill. No national or international taxonomy is authoritative here, so Fursah carries its own seeded reference table.":
    "تتطلّب مطابقة مخرج مقرر دراسي بمتطلب صاحب عمل أن يسمّي كلاهما المهارة نفسها. ولا يوجد تصنيف وطني أو دولي مرجعي هنا، فتحمل فرصة جدولاً مرجعياً مُهيّأً خاصاً بها.",
  "This is a data-harmonisation gap of the kind chapter 4 names directly. Every platform in this category invents its own taxonomy, which makes results incomparable between platforms and prevents an institution from carrying its mapping to another system.":
    "هذه فجوة مواءمة بيانات من النوع الذي يسمّيه الفصل الرابع مباشرةً. فكل منصة في هذه الفئة تبتكر تصنيفها الخاص، ما يجعل النتائج غير قابلة للمقارنة بين المنصات ويمنع المؤسسة من نقل ربطها إلى نظام آخر.",
  "A standardised, versioned skill taxonomy with a defined extension mechanism, so that a curriculum mapping made once is portable and two platforms' readiness figures mean the same thing.":
    "تصنيف مهارات معياري مُصدَّر بإصدارات وله آلية توسعة معرَّفة، بحيث يصبح ربط المنهج الذي يُصنع مرة قابلاً للنقل، وتعني أرقام الجاهزية في منصتين الشيء نفسه.",
  "A human reviewer approves an uploaded certificate and it becomes verified evidence inside Fursah. That verification cannot leave the platform: another system must re-verify from scratch.":
    "يعتمد مراجع بشري شهادة مرفوعة فتصبح دليلاً موثَّقاً داخل فرصة. ولا يمكن لذلك التوثيق مغادرة المنصة: إذ يتعيّن على نظام آخر إعادة التوثيق من الصفر.",
  "There is no standard representation for 'this evidence was checked by a named party under a stated procedure' that a receiving system can evaluate. Verification effort is therefore duplicated at every boundary, which is the cost that keeps credential checking manual.":
    "لا يوجد تمثيل معياري لعبارة «تحقّق من هذا الدليل طرف مسمّى وفق إجراء معلن» يستطيع نظام مستقبِل تقييمه. ولذلك يتكرّر جهد التوثيق عند كل حدّ، وهي الكلفة التي تُبقي فحص الشهادات يدوياً.",
  "A verifiable-credential profile for skills evidence that carries the verifying party, the procedure applied and its date, so a receiving system can decide whether to accept it rather than repeat it.":
    "ملف تعريف لشهادة قابلة للتحقّق خاص بأدلة المهارات يحمل الطرف المُوثِّق والإجراء المطبَّق وتاريخه، ليقرّر النظام المستقبِل قبولها بدل تكرارها.",
  "Fursah publishes no trend, growth or forecast figure anywhere, and the assistant is instructed to refuse trend questions, because the platform stores no historical series and none is available to check against.":
    "لا تنشر فرصة أي رقم اتجاه أو نمو أو تنبؤ في أي موضع، والمساعد مُوجَّه لرفض أسئلة الاتجاهات، لأن المنصة لا تخزّن سلسلة تاريخية ولا تتوفّر سلسلة يمكن التحقّق مقابلها.",
  "Graduate and labour figures are published annually or quarterly by separate authorities on separate schedules and cuts. There is no joined education-to-employment outcome series at the resolution a matching system would need to know whether its recommendations worked.":
    "تُنشر أرقام الخريجين وسوق العمل سنوياً أو ربع سنوي من جهات منفصلة بجداول وتقسيمات مختلفة. ولا توجد سلسلة موصولة لمخرجات التعليم إلى التوظيف بالدقّة التي يحتاجها نظام مطابقة ليعرف إن كانت توصياته قد نجحت.",
  "A published graduate-outcomes series linking field of study to employment outcome at a suppressed but usable granularity. Without it, no platform in this category can demonstrate effect rather than activity.":
    "سلسلة منشورة لمخرجات الخريجين تربط مجال الدراسة بمخرج التوظيف بدقّة محجوبة جزئياً لكنها قابلة للاستخدام. وبدونها لا تستطيع أي منصة في هذه الفئة إثبات الأثر بدل النشاط.",
  "Fursah ranks candidates and states the ranking is advisory. Nothing prevents an employer from screening by that ranking in practice, which would make it decisive without ever being labelled a decision.":
    "ترتّب فرصة المرشحين وتصرّح بأن الترتيب استرشادي. ولا شيء يمنع صاحب العمل من الفرز بذلك الترتيب عملياً، فيصبح حاسماً دون أن يوصف قط بأنه قرار.",
  "The distinction between decision support and automated decision-making is stated in principle but has no operational test. A platform can satisfy every disclosure requirement while its output is used exactly as an automated decision.":
    "التمييز بين دعم القرار واتخاذ القرار الآلي مذكور من حيث المبدأ لكن بلا اختبار تشغيلي. فبإمكان منصة أن تستوفي كل متطلبات الإفصاح بينما يُستخدم مخرجها تماماً كقرار آلي.",
  "An operational test for effective automation — pass-through rate, override rate, or a mandated minimum review — so the obligation attaches to how output is used rather than how it is described.":
    "اختبار تشغيلي للأتمتة الفعلية — نسبة المرور المباشر، أو نسبة التجاوز، أو حدّ أدنى إلزامي للمراجعة — بحيث يرتبط الالتزام بكيفية استخدام المخرج لا بكيفية وصفه.",

  // --- /knowledge-base: area notes and lead --------------------------------
  "Every instrument, standard and statistical source Fursah depends on, linked to the original publication. The rule for inclusion is that a document must be publicly checkable and actually load-bearing: a standard we merely admire is not on this list. Where a document constrains code, the file it constrains is named.":
    "كل أداة ومعيار ومصدر إحصائي تعتمد عليه فرصة، مرتبطاً بمنشوره الأصلي. وقاعدة الإدراج أن تكون الوثيقة قابلة للتحقّق علناً وحاملةً لوزن فعلي: فالمعيار الذي نُعجب به فحسب ليس في هذه القائمة. وحيثما تقيّد وثيقةٌ الشيفرة، يُذكر الملف الذي تقيّده.",
  "The material this project is assessed against. Y.3172 clause 8.1 supplies the architecture vocabulary; the AI Ready Report supplies the readiness dimensions and the gap taxonomy.":
    "المادة التي يُقيَّم هذا المشروع مقابلها. يوفّر البند 8.1 من Y.3172 مفردات المعمارية، ويوفّر تقرير الجاهزية أبعاد الجاهزية وتصنيف الفجوات.",
  "Binding national instruments. These are the documents that decide what Fursah is permitted to collect, who may see it, and what a person can require of us.":
    "أدوات وطنية مُلزِمة. وهي الوثائق التي تحدّد ما يُسمح لفرصة بجمعه، ومن يجوز له الاطّلاع عليه، وما يحقّ للشخص مطالبتنا به.",
  "The evidence base for the problem statement. Every figure on the National Impact page traces back to one of these, dated and attributed.":
    "قاعدة الأدلة لصياغة المشكلة. وكل رقم في صفحة الأثر الوطني يعود إلى إحداها، مؤرَّخاً ومنسوباً.",
  "Voluntary frameworks the governance design follows, used to structure risk assessment and management rather than to claim certification.":
    "أطر طوعية يتبعها تصميم الحوكمة، تُستخدم لهيكلة تقييم المخاطر وإدارتها لا لادّعاء شهادة اعتماد.",
  "Some national figures are published by an authority and carried by a news outlet before appearing in a downloadable bulletin. Where that is the case, the National Impact page names the authority and the outlet, and marks the figure as reported rather than primary, so the chain can be followed back. Documents issued in Arabic are cited in Arabic; no figure here is translated from a secondary English summary without the original being linked.":
    "تنشر جهةٌ بعض الأرقام الوطنية وتنقلها وسيلة إخبارية قبل ظهورها في نشرة قابلة للتنزيل. وحيثما كان الأمر كذلك، تذكر صفحة الأثر الوطني الجهة والوسيلة معاً، وتصف الرقم بأنه منقول لا أوّلي، ليمكن تتبّع السلسلة رجوعاً. والوثائق الصادرة بالعربية يُستشهد بها بالعربية، ولا يُترجم أي رقم هنا من ملخّص إنجليزي ثانوي دون ربط الأصل.",

  // --- /knowledge-base: document titles ------------------------------------
  "Architectural framework for machine learning in future networks including IMT-2020":
    "الإطار المعماري لتعلُّم الآلة في الشبكات المستقبلية بما فيها IMT-2020",
  "AI Ready — Analysis Towards a Standardized Readiness Framework, Report 2.0":
    "الجاهزية للذكاء الاصطناعي — تحليل نحو إطار جاهزية معياري، التقرير 2.0",
  "Architectural framework for machine learning sandbox in future networks including IMT-2020":
    "الإطار المعماري للبيئة المعزولة لتعلُّم الآلة في الشبكات المستقبلية بما فيها IMT-2020",
  "Machine learning marketplace integration in future networks including IMT-2020":
    "تكامل سوق تعلُّم الآلة في الشبكات المستقبلية بما فيها IMT-2020",
  "Personal Data Protection Law (نظام حماية البيانات الشخصية)": "نظام حماية البيانات الشخصية",
  "AI Ethics Principles": "مبادئ أخلاقيات الذكاء الاصطناعي",
  "National Data Management and Personal Data Protection Standards":
    "معايير إدارة البيانات الوطنية وحماية البيانات الشخصية",
  "Essential Cybersecurity Controls (ECC) and Cloud Cybersecurity Controls (CCC)":
    "الضوابط الأساسية للأمن السيبراني وضوابط الأمن السيبراني للحوسبة السحابية",
  "Digital Accessibility Standards and Guidelines": "معايير وأدلة الإتاحة الرقمية",
  "Saudi Vision 2030 and the Human Capability Development Program":
    "رؤية السعودية 2030 وبرنامج تنمية القدرات البشرية",
  "Labour Force Survey": "مسح القوى العاملة",
  "Graduate statistics (إحصاءات الخريجين)": "إحصاءات الخريجين",
  "Global Education Monitoring Report — Saudi Arabia country case study":
    "التقرير العالمي لرصد التعليم — دراسة حالة المملكة العربية السعودية",
  "ISO/IEC 42001:2023 — Artificial intelligence management system":
    "ISO/IEC 42001:2023 — نظام إدارة الذكاء الاصطناعي",
  "ISO/IEC 23894:2023 — Guidance on risk management for AI":
    "ISO/IEC 23894:2023 — إرشادات إدارة المخاطر للذكاء الاصطناعي",
  "Sustainable Development Goals — targets 4.4, 5.5, 8.5, 8.6 and 10.3":
    "أهداف التنمية المستدامة — الغايات 4.4 و5.5 و8.5 و8.6 و10.3",

  // --- /knowledge-base: what each document is ------------------------------
  "Defines the ML pipeline as a set of named nodes — SRC, C, PP, M, P, D and SINK — together with the overlay that manages them. Clause 8.1 is the pipeline definition itself.":
    "يعرّف مسار تعلُّم الآلة بوصفه مجموعة عقد مسمّاة — SRC وC وPP وM وP وD وSINK — مع الطبقة التي تديرها. والبند 8.1 هو تعريف المسار نفسه.",
  "Derives 13 AI-readiness dimensions bottom-up from Plugfest projects, with metrics under each, and sets out a three-part gap taxonomy in chapter 4.":
    "يشتقّ ثلاثة عشر بُعداً للجاهزية للذكاء الاصطناعي من مشاريع Plugfest من الأسفل إلى الأعلى، مع مقاييس تحت كل بُعد، ويضع تصنيفاً ثلاثياً للفجوات في الفصل الرابع.",
  "Specifies a sandbox in which an ML model or policy is evaluated before it is allowed to affect a live system.":
    "يحدّد بيئة معزولة يُقيَّم فيها نموذج أو سياسة لتعلُّم الآلة قبل السماح له بالتأثير في نظام تشغيلي.",
  "Covers orchestration, versioning and lifecycle management of ML models across a pipeline.":
    "يغطّي تنسيق نماذج تعلُّم الآلة وإصداراتها وإدارة دورة حياتها عبر المسار.",
  "The Kingdom's personal data law: lawful basis, data minimisation, the rights of the data subject, and the conditions on transfer outside the Kingdom.":
    "نظام البيانات الشخصية في المملكة: الأساس النظامي، وتقليل البيانات، وحقوق صاحب البيانات، وشروط النقل خارج المملكة.",
  "Seven principles for AI in the Kingdom, including fairness, transparency and explainability, accountability, and human oversight.":
    "سبعة مبادئ للذكاء الاصطناعي في المملكة، منها الإنصاف والشفافية وقابلية التفسير والمساءلة والإشراف البشري.",
  "Data classification, quality, retention and governance controls for data held in the Kingdom.":
    "ضوابط تصنيف البيانات وجودتها والاحتفاظ بها وحوكمتها للبيانات المحفوظة في المملكة.",
  "Baseline cybersecurity controls for national organisations and for workloads hosted in cloud environments.":
    "ضوابط أمن سيبراني أساسية للجهات الوطنية وللأحمال المستضافة في البيئات السحابية.",
  "Accessibility and interoperability requirements for digital services, referencing WCAG 2.1 Level AA.":
    "متطلبات الإتاحة والتشغيل البيني للخدمات الرقمية، بالإحالة إلى WCAG 2.1 المستوى AA.",
  "National strategy, including the commitment to align education with labour-market needs and the published unemployment and participation targets.":
    "استراتيجية وطنية تشمل الالتزام بمواءمة التعليم مع احتياجات سوق العمل، ومستهدفات البطالة والمشاركة المنشورة.",
  "The official quarterly labour statistics: unemployment, participation, and employment-to-population ratios.":
    "الإحصاءات الربعية الرسمية لسوق العمل: البطالة والمشاركة ونسب التشغيل إلى السكان.",
  "Annual graduate totals by degree level across the Kingdom's universities.":
    "إجماليات الخريجين السنوية حسب المرحلة الدراسية في جامعات المملكة.",
  "Tertiary enrolment growth and the shift in the distribution of graduates by field of study.":
    "نمو الالتحاق بالتعليم العالي والتحوّل في توزيع الخريجين حسب مجال الدراسة.",
  "Management-system requirements for organisations developing or using AI, including risk and impact assessment.":
    "متطلبات نظام إداري للجهات التي تطوّر الذكاء الاصطناعي أو تستخدمه، بما فيها تقييم المخاطر والأثر.",
  "Guidance on identifying, analysing and treating risks specific to AI systems.":
    "إرشادات لتحديد المخاطر الخاصة بأنظمة الذكاء الاصطناعي وتحليلها ومعالجتها.",
  "The official target wording against which contribution can be assessed by published indicator.":
    "الصياغة الرسمية للغايات التي يمكن تقييم الإسهام مقابلها بمؤشر منشور.",

  // --- /knowledge-base: what depends on each document ----------------------
  "The platform's architecture is described in these seven nodes, and each node names the component implementing it and the policy governing it. This is the primary conformance reference.":
    "تُوصَف معمارية المنصة بهذه العقد السبع، وكل عقدة تذكر المكوّن الذي ينفّذها والسياسة التي تحكمها. وهذا هو المرجع الأساسي للمطابقة.",
  "Fursah self-assesses against all 13 dimensions, and the policy gaps this project identified are structured on the report's own gap taxonomy. The report names skills gap analysis as a desired framework output under Dimension 9, which is Fursah's primary function.":
    "تُقيّم فرصة نفسها مقابل الأبعاد الثلاثة عشر جميعاً، والفجوات السياساتية التي حدّدها هذا المشروع مُنظَّمة وفق تصنيف الفجوات في التقرير نفسه. ويسمّي التقرير تحليل فجوة المهارات مخرجاً منشوداً للإطار تحت البُعد التاسع، وهو الوظيفة الأساسية لفرصة.",
  "The governance scenario simulator: a proposed control is stated, checked against the safeguards, and requires a recorded human decision before activation.":
    "محاكي سيناريوهات الحوكمة: يُعرض ضابط مقترح، ويُفحص مقابل الضمانات، ويستلزم قراراً بشرياً مسجَّلاً قبل التفعيل.",
  "Every scoring surface stamps its model version onto the audit trail, so a past result can be traced to the ruleset that produced it and that ruleset can be rolled back.":
    "تختم كل واجهة تقييم إصدار نموذجها على سجل التدقيق، فيمكن تتبّع نتيجة سابقة إلى مجموعة القواعد التي أنتجتها، ويمكن التراجع عن تلك المجموعة.",
  "The privacy policy is written against it clause by clause. It is the reason no protected characteristic is collected, the reason consent is purpose-specific and separately withdrawable, and the source of the four data-request types implemented.":
    "كُتبت سياسة الخصوصية مقابله بنداً بنداً. وهو سبب عدم جمع أي خاصية محمية، وسبب كون الموافقة مخصَّصة بالغرض وقابلة للسحب منفصلةً، ومصدر أنواع طلبات البيانات الأربعة المنفَّذة.",
  "The explainability requirement is why every score is reconstructible from published weights rather than produced by a trained model, and the human-oversight principle is why a named reviewer can override any automated result.":
    "متطلب قابلية التفسير هو سبب كون كل درجة قابلة لإعادة البناء من أوزان منشورة بدل إنتاجها من نموذج مُدرَّب، ومبدأ الإشراف البشري هو سبب تمكّن مراجع مسمّى من تجاوز أي نتيجة آلية.",
  "Classification of evidence documents as private by default, the retention posture, and the aggregate-only treatment of institutional reporting.":
    "تصنيف مستندات الأدلة خاصةً افتراضياً، وسياسة الاحتفاظ، ومعالجة التقارير المؤسسية تجميعياً فقط.",
  "Private object storage with no public bucket access, server-held credentials that never reach the browser, and the hosting-region gap recorded openly in the DPIA rather than left implicit.":
    "تخزين كائنات خاص بلا وصول عام إلى الحاويات، وبيانات اعتماد محفوظة على الخادم لا تصل المتصفح قط، وفجوة منطقة الاستضافة مسجَّلة صراحةً في تقييم أثر حماية البيانات بدل تركها ضمنية.",
  "The accessibility statement's conformance target, the Arabic runtime layer across every portal, and the keyboard and contrast requirements applied to the interface.":
    "هدف المطابقة في بيان الإتاحة، وطبقة العربية في وقت التشغيل عبر كل بوابة، ومتطلبات لوحة المفاتيح والتباين المطبَّقة على الواجهة.",
  "The stated alignment on the National Impact page, quoted against specific programme commitments rather than the strategy in general.":
    "المواءمة المذكورة في صفحة الأثر الوطني، منسوبةً إلى التزامات برنامجية محدَّدة لا إلى الاستراتيجية عموماً.",
  "The labour indicators on the National Impact page, and the evidence for the argument that the Kingdom's constraint is matching quality rather than aggregate participation.":
    "مؤشرات سوق العمل في صفحة الأثر الوطني، والدليل على أن القيد في المملكة هو جودة المواءمة لا إجمالي المشاركة.",
  "The 2023 graduate figure and its degree-level breakdown on the National Impact page.":
    "رقم خريجي 2023 وتفصيله حسب المرحلة الدراسية في صفحة الأثر الوطني.",
  "The field-mix argument: that graduate output grew while concentrating in some fields, which is the distributional problem Fursah addresses.":
    "حجّة مزيج التخصصات: أن مخرجات الخريجين نمت مع تركّزها في بعض المجالات، وهي مشكلة التوزيع التي تعالجها فرصة.",
  "The structure of the governance surfaces: recorded decisions, model versioning, monitoring with a paused state, and a documented impact assessment.":
    "بنية واجهات الحوكمة: قرارات مسجَّلة، وإصدارات للنماذج، ومراقبة بحالة إيقاف مؤقّت، وتقييم أثر موثَّق.",
  "The risk register in the DPIA, including the treatment decision recorded against each risk.":
    "سجل المخاطر في تقييم أثر حماية البيانات، بما فيه قرار المعالجة المسجَّل مقابل كل خطر.",
  "The SDG alignment on the National Impact page, cited to the numbered target rather than the goal alone.":
    "مواءمة أهداف التنمية المستدامة في صفحة الأثر الوطني، منسوبةً إلى الغاية المرقّمة لا إلى الهدف وحده.",

  // --- Extension descriptions ---------------------------------------------
  "Governance scenarios are evaluated against the safeguards before a control is activated, and the human decision — including an override — is recorded.":
    "تُقيَّم سيناريوهات الحوكمة مقابل الضمانات قبل تفعيل أي ضابط، ويُسجَّل القرار البشري بما في ذلك التجاوز.",
  "Every scoring surface stamps its model version onto the audit trail, so a result can be traced to the ruleset that produced it and that ruleset can be rolled back.":
    "تختم كل واجهة تقييم إصدار نموذجها على سجل التدقيق، فيمكن تتبّع أي نتيجة إلى مجموعة القواعد التي أنتجتها، ويمكن التراجع عن تلك المجموعة.",
  "The standards page maps Fursah onto ITU-T Y.3172 clause 8.1 node by node, self-assesses against the 13 AI Readiness dimensions, and sets out the policy gaps this project identified.":
    "تربط صفحة المعايير فرصة بالبند 8.1 من ITU-T Y.3172 عقدةً بعقدة، وتُقيّمها ذاتياً مقابل أبعاد الجاهزية الثلاثة عشر، وتعرض الفجوات السياساتية التي حدّدها هذا المشروع.",

  // --- Publishers and editions --------------------------------------------
  "ITU-T Study Group 13": "لجنة الدراسات 13 بقطاع تقييس الاتصالات",
  "ITU": "الاتحاد الدولي للاتصالات",
  "Kingdom of Saudi Arabia": "المملكة العربية السعودية",
  "SDAIA — Saudi Data and Artificial Intelligence Authority":
    "سدايا — الهيئة السعودية للبيانات والذكاء الاصطناعي",
  "NDMO — National Data Management Office, SDAIA":
    "مكتب إدارة البيانات الوطنية — سدايا",
  "NCA — National Cybersecurity Authority": "الهيئة الوطنية للأمن السيبراني",
  "DGA — Digital Government Authority": "هيئة الحكومة الرقمية",
  "GASTAT — General Authority for Statistics (الهيئة العامة للإحصاء)": "الهيئة العامة للإحصاء",
  "Council of Universities Affairs (مجلس شؤون الجامعات)": "مجلس شؤون الجامعات",
  "UNESCO": "اليونسكو",
  "ISO/IEC": "المنظمة الدولية للتقييس واللجنة الكهرتقنية الدولية",
  "Royal Decree M/19 of 1443H, as amended by M/148, with Implementing Regulations":
    "المرسوم الملكي م/19 لعام 1443هـ، المعدَّل بالمرسوم م/148، مع لائحته التنفيذية",
  "Version 1.0": "الإصدار 1.0",
  "Current issue": "الإصدار الحالي",
  "Programme documents and published KPIs": "وثائق البرنامج ومؤشرات الأداء المنشورة",
  "Q3 2024 and Q2 2025 releases": "إصدارا الربع الثالث 2024 والربع الثاني 2025",
  "2026 edition": "إصدار 2026",
  "2030 Agenda": "خطة 2030",
  "January 2026 · ISBN 978-92-61-41911-0": "يناير 2026 · ردمك 978-92-61-41911-0",
  "ECC-1:2018 · CCC-1:2020": "ECC-1:2018 · CCC-1:2020",
  "· published in Arabic and English": "· منشورة بالعربية والإنجليزية",
  "· published in Arabic": "· منشورة بالعربية",
};
