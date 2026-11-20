/**
 * Typed source of truth for the 6-spot Global Paid Social Promo Video Series
 * (Omni 1.2 Flash 10s · 3 × 10s = 30s · 7 languages: en, es, pt, hi, zh, ar, th).
 *
 * Mirrors `scripts/use-case-scripts/global-paid-social-promo-series.md`.
 */

export type SocialPromoLocale = 'en' | 'es' | 'pt' | 'hi' | 'zh' | 'ar' | 'th'

export type SocialPromoSpotId =
  | 'svc-01'
  | 'svc-02'
  | 'svc-03'
  | 'crt-01'
  | 'crt-02'
  | 'crt-03'

export const SOCIAL_PROMO_LOCALES: readonly SocialPromoLocale[] = [
  'en',
  'es',
  'pt',
  'hi',
  'zh',
  'ar',
  'th',
] as const

export const SOCIAL_PROMO_LOCALE_LABELS: Record<SocialPromoLocale, string> = {
  en: 'English',
  es: 'Spanish (LATAM/Global Neutral)',
  pt: 'Portuguese (Brazil)',
  hi: 'Hindi (Conversational)',
  zh: 'Mandarin Chinese (Simplified)',
  ar: 'Modern Standard Arabic',
  th: 'Thai (Natural Commercial)',
}

export interface SocialPromoBlock {
  blockNumber: 1 | 2 | 3
  title: string
  timecode: string
  durationSeconds: 10
  vo: Record<SocialPromoLocale, string>
}

export interface SocialPromoSpotSpec {
  id: SocialPromoSpotId
  track: 'agency' | 'creator'
  title: string
  defaultVoice: string
  directorNotes: string
  musicPrompt: string
  blocks: [SocialPromoBlock, SocialPromoBlock, SocialPromoBlock]
}

export const SOCIAL_PROMO_SPOTS: Record<SocialPromoSpotId, SocialPromoSpotSpec> = {
  'svc-01': {
    id: 'svc-01',
    track: 'agency',
    title: 'Sell $2,500 Client Films With $40 of Compute',
    defaultVoice: 'Charon',
    directorNotes:
      'Confident, poised executive studio narrator. Crisp broadcast articulation, entrepreneurial authority, energetic yet unhurried commercial pacing that fits cleanly inside 9 seconds.',
    musicPrompt:
      'Instrumental modern commercial tech-cinema track, 30 seconds, 108 BPM, F minor lifting to A-flat major at 0:11. 0:00-0:10 tense muted bass pulse and subtle rhythmic clock-like percussion. 0:10-0:20 crisp upbeat synth pluck and warm confident Rhodes chords opening smoothly. 0:20-0:30 uplifting string swell and clean bass groove resolving on a resonant warm final chord. Instrumental only, no vocals, no lyrics.',
    blocks: [
      {
        blockNumber: 1,
        title: 'Hook + Pain ($4,000 Shoot vs. Margin)',
        timecode: '0:00–0:10',
        durationSeconds: 10,
        vo: {
          en: 'Agencies charge four thousand dollars and take three weeks for one client film — while crews, locations, and late-night edits devour your entire profit margin.',
          es: 'Las agencias cobran cuatro mil dólares y tardan tres semanas por un solo video, mientras los rodajes y madrugadas editando devoran toda tu ganancia.',
          pt: 'Agências cobram milhares de dólares e levam semanas por um único filme comercial, enquanto equipes caras e madrugadas na edição devoram seu lucro.',
          hi: 'एक क्लाइंट वीडियो बनाने में पारंपरिक एजेंसियाँ लाखों रुपये और तीन हफ्ते लगाती हैं — और शूटिंग क्रू व एडिटिंग आपका पूरा मुनाफ़ा खत्म कर देती हैं।',
          zh: '传统制作公司拍一条客户宣传片动辄收费数千美元、耗时三周，拍摄团队与通宵剪辑吞噬了你全部的利润。',
          ar: 'تتقاضى الوكالات آلاف الدولارات وتستغرق ثلاثة أسابيع لفيلم واحد، بينما تلتهم طواقم التصوير وساعات المونتاج هامش ربحك بالكامل.',
          th: 'เอเจนซี่ทั่วไปคิดค่าผลิตวิดีโอลูกค้าหลักแสนและใช้เวลาสามสัปดาห์ ขณะที่ค่ากองถ่ายและการตัดต่อข้ามคืนทำให้กำไรของคุณแทบไม่เหลือ',
        },
      },
      {
        blockNumber: 2,
        title: 'One-Laptop Studio Reveal',
        timecode: '0:10–0:20',
        durationSeconds: 10,
        vo: {
          en: 'SceneFlow Studio lets you run a full-scale video business from one laptop — producing life memoirs, real estate tours, and corporate training in 4K.',
          es: 'Con SceneFlow Studio operas una productora completa desde tu laptop: video memorias, tours inmobiliarios y capacitación corporativa en 4K.',
          pt: 'O SceneFlow Studio coloca uma produtora completa no seu notebook — criando memórias de vida, tours imobiliários e treinamentos corporativos em 4K.',
          hi: 'SceneFlow Studio से आप एक ही लैपटॉप से पूरा वीडियो बिज़नेस चला सकते हैं — लाइफ मेमॉयर, रियल एस्टेट टूर और कॉर्पोरेट ट्रेनिंग, सीधे 4K में।',
          zh: '有了 SceneFlow Studio，一台笔记本就能运营整家影视机构——4K 打造人生传记、房产巡礼与企业培训片。',
          ar: 'مع SceneFlow Studio تدير شركة إنتاج متكاملة من حاسوبك — أفلام السيرة الذاتية، جولات العقارات، وفيديوهات التدريب بدقة 4K.',
          th: 'SceneFlow Studio ให้คุณเปิดสตูดิโอวิดีโอครบวงจรได้จากโน้ตบุ๊กเครื่องเดียว ทั้งวิดีโอชีวประวัติ ทัวร์อสังหา และสื่ออบรมระดับ 4K',
        },
      },
      {
        blockNumber: 3,
        title: 'Margin Proof + $9 CTA',
        timecode: '0:20–0:30',
        durationSeconds: 10,
        vo: {
          en: 'Consistent cast, neural voices, and 100% white-label client portals — with up to ninety percent net margins. Start your nine-dollar test flight at sceneflowai.studio.',
          es: 'Personajes consistentes, voces naturales y portales 100% marca blanca, con hasta noventa por ciento de margen neto. Empieza tu prueba por nueve dólares en sceneflowai.studio.',
          pt: 'Elenco consistente, vozes neurais e portais 100% white-label, com margens líquidas de até noventa por cento. Comece seu teste por nove dólares em sceneflowai.studio.',
          hi: 'एक जैसे चेहरे, असली जैसी आवाज़ें और 100% व्हाइट-लेबल क्लाइंट पोर्टल — 90 प्रतिशत तक नेट मार्जिन के साथ। sceneflowai.studio पर सिर्फ़ नौ डॉलर में शुरू करें।',
          zh: '角色面孔统一、配音自然，搭配 100% 白标客户门户，净利率高达 90%。立即访问 sceneflowai.studio，9 美元开启试用。',
          ar: 'شخصيات متسقة، أصوات طبيعية، وبوابات عملاء بعلامتك التجارية 100% بهوامش ربح تصل لتسعين بالمئة. ابدأ تجربتك بتسعة دولارات عبر sceneflowai.studio.',
          th: 'ตัวละครหน้าเดิมทุกฉาก เสียงพากย์สมจริง พร้อมพอร์ทัล White-Label 100% ทำกำไรสุทธิสูงสุด 90 เปอร์เซ็นต์ ทดลองเพียง 9 ดอลลาร์ที่ sceneflowai.studio',
        },
      },
    ],
  },

  'svc-02': {
    id: 'svc-02',
    track: 'agency',
    title: '100% White-Label Client Portals — Zero Client Login',
    defaultVoice: 'Charon',
    directorNotes:
      'Refined, reassuring B2B agency studio narrator. Smooth modern authority, crisp articulation, warm luxury service tone paced cleanly under 9 seconds.',
    musicPrompt:
      'Instrumental sleek luxury corporate minimal track, 30 seconds, 100 BPM, C major. 0:00-0:10 soft restrained muted pluck bass with subtle cool electric piano chord creating gentle tension. 0:10-0:20 warm acoustic-electronic fingerstyle pulse and clean airy felt piano chords signaling effortless clarity. 0:20-0:30 lush warm cello harmony and polished crisp snap groove landing cleanly on a refined final tonic chord. Instrumental only, no vocals, no lyrics.',
    blocks: [
      {
        blockNumber: 1,
        title: 'Client Login & Late Revision Pain',
        timecode: '0:00–0:10',
        durationSeconds: 10,
        vo: {
          en: 'Clients hate creating accounts, digging through emails, and guessing what their video will look like — and late changes after rendering wipe out your margin.',
          es: 'Tus clientes odian crear cuentas, buscar correos y adivinar cómo quedará su video — y los cambios tardíos tras renderizar borran tu ganancia.',
          pt: 'Clientes detestam criar senhas, procurar anexos no e-mail e adivinhar o resultado — e alterações tardias após a renderização acabam com o seu lucro.',
          hi: 'क्लाइंट्स को अकाउंट बनाना, ईमेल में फ़ाइलें ढूँढना और अंदाज़ा लगाना पसंद नहीं — और रेंडर के बाद बदलाव आपका पूरा मुनाफ़ा खत्म कर देते हैं।',
          zh: '客户讨厌注册账号、在邮件里翻找附件，更怕成片出来不对版——渲染后再大改，你的利润瞬间清零。',
          ar: 'يكره العملاء إنشاء الحسابات والبحث في البريد الإلكتروني وتخمين شكل الفيديو — وأي تعديل متأخر بعد الرندر يلتهم ربحك فوراً.',
          th: 'ลูกค้าไม่ชอบสมัครบัญชี ค้นหาไฟล์ในอีเมล หรือคอยเดาว่าวิดีโอจะออกมาเป็นแบบไหน และถ้าขอแก้หลังเรนเดอร์ กำไรของคุณก็หายวับทันที',
        },
      },
      {
        blockNumber: 2,
        title: 'Zero-Login Branded Mobile Intake',
        timecode: '0:10–0:20',
        durationSeconds: 10,
        vo: {
          en: 'SceneFlow gives you 100% white-label client portals under your own brand. Clients share photos and voice stories straight from their phone with zero login.',
          es: 'SceneFlow te da portales 100% marca blanca bajo tu propio nombre. Tus clientes suben fotos y graban su historia desde el celular, sin registrarse.',
          pt: 'O SceneFlow entrega portais 100% white-label com a sua marca. O cliente envia fotos e grava depoimentos pelo celular, sem precisar de login.',
          hi: 'SceneFlow देता है 100% व्हाइट-लेबल क्लाइंट पोर्टल — आपके अपने ब्रांड में। क्लाइंट बिना लॉगिन फ़ोन से फ़ोटो और आवाज़ साझा करते हैं।',
          zh: 'SceneFlow 为你提供 100% 白标定制客户门户。客户无需登录，用手机即可直接上传照片并口述故事素材。',
          ar: 'يمنحك SceneFlow بوابات عملاء بعلامتك التجارية 100%. يرفع العميل صوره ويسجل قصته من هاتفه دون أي تسجيل دخول.',
          th: 'SceneFlow มอบพอร์ทัลลูกค้าแบบ White-Label 100% ภายใต้แบรนด์ของคุณ ลูกค้าอัปโหลดรูปและอัดเสียงเล่าเรื่องจากมือถือได้โดยไม่ต้องล็อกอิน',
        },
      },
      {
        blockNumber: 3,
        title: 'Blueprint Approval + Screening Room CTA',
        timecode: '0:20–0:30',
        durationSeconds: 10,
        vo: {
          en: 'They approve your Blueprint before you spend video credits, leave timestamped notes, and sign off in your private Screening Room. Launch at sceneflowai.studio.',
          es: 'Aprueban el Blueprint antes de gastar créditos, dejan notas exactas por segundo y firman en tu sala privada. Descúbrelo en sceneflowai.studio.',
          pt: 'Ele aprova o Blueprint antes de gastar créditos de vídeo, comenta no segundo exato e assina na sua sala privada. Conheça em sceneflowai.studio.',
          hi: 'वीडियो क्रेडिट खर्च करने से पहले Blueprint स्वीकृत होता है, फिर आपकी निजी स्क्रीनिंग रूम में टाइमस्टैम्प नोट्स के साथ फ़ाइनल मंज़ूरी। शुरू करें sceneflowai.studio पर।',
          zh: '消耗算力前先锁定蓝图，随后在你的专属放映厅打点批注并一键签字批准。立即体验：sceneflowai.studio。',
          ar: 'يعتمد العميل المخطط قبل إنفاق رصيد الفيديو، ويترك ملاحظاته بالثانية ويمنحك الموافقة في قاعة عرضك الخاصة عبر sceneflowai.studio.',
          th: 'อนุมัติโครงเรื่องก่อนใช้เครดิตสร้างวิดีโอ แล้วปักหมุดคอมเมนต์ตามวินาทีพร้อมกดอนุมัติในห้องฉายส่วนตัวของคุณ เริ่มเลยที่ sceneflowai.studio',
        },
      },
    ],
  },

  'svc-03': {
    id: 'svc-03',
    track: 'agency',
    title: 'Scale From 1 Solo Operator to 100+ Client Projects',
    defaultVoice: 'Charon',
    directorNotes:
      'Commanding, forward-driving executive operations narrator. Crisp B2B clarity, strong momentum, calm scalable leadership tone paced cleanly under 9 seconds.',
    musicPrompt:
      'Instrumental driving modern electronic-orchestral momentum score, 30 seconds, 116 BPM, D minor shifting to F major at 0:11. 0:00-0:10 tight pulsing analog arpeggio and deep moody sub-bass. 0:10-0:20 crisp rhythmic syncopated percussion and soaring bright staccato strings locking into smooth forward momentum. 0:20-0:30 expansive triumphant orchestral synth swell settling onto a clean wide confident chord. Instrumental only, no vocals, no lyrics.',
    blocks: [
      {
        blockNumber: 1,
        title: 'Scaling Bottleneck (2 to 50 Clients)',
        timecode: '0:00–0:10',
        durationSeconds: 10,
        vo: {
          en: 'What happens when your video business jumps from two clients a month to fifty? Most AI tools fall apart the second you hire Project Managers.',
          es: '¿Qué pasa cuando tu negocio de video salta de dos clientes al mes a cincuenta? Casi todas las herramientas de IA colapsan en cuanto contratas equipo.',
          pt: 'O que acontece quando sua produtora salta de dois clientes por mês para cinquenta? Quase toda ferramenta de IA quebra quando você contrata gestores.',
          hi: 'जब आपका वीडियो बिज़नेस महीने के दो क्लाइंट से पचास पर पहुँचता है, तो क्या होता है? ज़्यादातर AI टूल टीम जोड़ते ही बिखर जाते हैं।',
          zh: '当你的视频业务从每月 2 个客户暴增到 50 个时，流程撑得住吗？大多数 AI 工具一旦引入项目团队就会彻底失控。',
          ar: 'ماذا يحدث عندما يقفز عملك في إنتاج الفيديو من عميلين شهرياً إلى خمسين؟ تنهار معظم أدوات الذكاء الاصطناعي فور توظيف مديري مشاريع.',
          th: 'จะเกิดอะไรขึ้นเมื่อธุรกิจวิดีโอของคุณโตจากเดือนละ 2 โปรเจกต์ เป็น 50 โปรเจกต์? เครื่องมือ AI ส่วนใหญ่มักพังทันทีที่คุณเริ่มสร้างทีม',
        },
      },
      {
        blockNumber: 2,
        title: 'Multi-PM Kanban, Credit Caps & 0-Credit QA',
        timecode: '0:10–0:20',
        durationSeconds: 10,
        vo: {
          en: 'SceneFlow Agency Scale is built for hundreds of active productions — with Kanban SLA tracking, monthly PM credit caps, and zero-credit QA reviewer seats.',
          es: 'SceneFlow Agency Scale soporta cientos de proyectos activos: tablero Kanban con alertas SLA, límites mensuales por PM y revisores de calidad sin consumo de créditos.',
          pt: 'O SceneFlow Agency Scale suporta centenas de produções simultâneas, com Kanban de SLA, limites mensais por PM e revisores de QA com custo zero de créditos.',
          hi: 'SceneFlow Agency Scale सैकड़ों प्रोजेक्ट्स के लिए बना है — Kanban SLA ट्रैकिंग, हर PM के लिए क्रेडिट कैप और 0-क्रेडिट QA रिव्यूअर सीट्स के साथ।',
          zh: 'SceneFlow 机构版专为数百个并发项目打造：看板 SLA 追踪、PM 月度点数上限、零消耗 QA 审核席位一应俱全。',
          ar: 'صُمم SceneFlow Agency Scale لمئات المشاريع النشطة — مع لوحة Kanban لمراقبة المواعيد، وسقف رصيد لكل مدير، ومقاعد جودة بلا استهلاك رصيد.',
          th: 'SceneFlow Agency Scale สร้างมาเพื่อรองรับงานนับร้อยพร้อมกัน ทั้งบอร์ด Kanban ติดตาม SLA จำกัดเครดิตรายเดือนของ PM และบทบาท QA ที่ไม่เสียเครดิต',
        },
      },
      {
        blockNumber: 3,
        title: '7-Language Auto-Routing + Custom Domain CTA',
        timecode: '0:20–0:30',
        durationSeconds: 10,
        vo: {
          en: 'Auto-route multilingual clients across seven languages, launch walk-away automated builds, and deliver on your custom domain. Explore Agency Scale at sceneflowai.studio.',
          es: 'Enruta clientes en siete idiomas, activa producción autónoma y entrega bajo tu propio dominio. Escala hoy en sceneflowai.studio.',
          pt: 'Direcione clientes em sete idiomas, ative produção autônoma e entregue no seu domínio próprio. Escale sem um exército de editores em sceneflowai.studio.',
          hi: 'सात भाषाओं में क्लाइंट ऑटो-रूट करें, ऑटोनॉमस प्रोडक्शन चलाएँ और अपने कस्टम डोमेन पर डिलीवर करें — sceneflowai.studio पर।',
          zh: '自动分流七大语种全球客户，启动无人值守自动制片，并以你的专属域名交付成片。访问 sceneflowai.studio。',
          ar: 'وجّه العملاء عبر سبع لغات، وشغّل الإنتاج الآلي، وسلّم أعمالك على نطاقك الخاص دون جيش من المحررين عبر sceneflowai.studio.',
          th: 'กระจายงานลูกค้า 7 ภาษาอัตโนมัติ สั่งผลิตงานแบบปล่อยทิ้งไว้ได้ และส่งมอบบนโดเมนของคุณเอง ที่ sceneflowai.studio',
        },
      },
    ],
  },

  'crt-01': {
    id: 'crt-01',
    track: 'creator',
    title: 'Stop Generating Random 5-Second Clips — Build Worlds',
    defaultVoice: 'Kore',
    directorNotes:
      'Charismatic, inspiring modern filmmaker & cinema-trailer narrator. Relatable hook energy shifting into awe and creative authority, crisp pacing cleanly under 9 seconds.',
    musicPrompt:
      'Instrumental theatrical cinema trailer score, 30 seconds, 92 BPM, E minor lifting into soaring G major at 0:11. 0:00-0:10 sparse moody cello pulse and faint restless sub-bass tension. 0:10-0:20 sweeping lush strings and warm French horn swell building genuine feature-film emotion. 0:20-0:30 grand restrained orchestral cadence resolving cleanly onto one lingering solo piano note. Instrumental only, no vocals, no lyrics.',
    blocks: [
      {
        blockNumber: 1,
        title: 'Face Drift & Random Clip Fatigue',
        timecode: '0:00–0:10',
        durationSeconds: 10,
        vo: {
          en: 'Tired of AI video generators where your main character turns into a stranger every five seconds? Random clips aren’t a movie — and retries burn your budget fast.',
          es: '¿Cansado de generadores con IA donde tu protagonista cambia de cara cada cinco segundos? Clips sueltos no hacen una película y queman tu presupuesto rapidísimo.',
          pt: 'Cansado de geradores com IA onde seu protagonista vira outra pessoa a cada cinco segundos? Clipes aleatórios não formam um filme e queimam seus créditos rápido.',
          hi: 'क्या आप ऐसे AI वीडियो टूल से थक चुके हैं जहाँ हर पाँच सेकंड में हीरो का चेहरा बदल जाता है? छोटे क्लिप से फ़िल्म नहीं बनती — सिर्फ़ क्रेडिट बर्बाद होते हैं।',
          zh: '受够了每隔五秒主角就变脸的 AI 视频工具吗？随机拼凑的碎片不是电影，反复抽卡只会迅速烧光你的预算。',
          ar: 'هل سئمت من أدوات الفيديو التي تغيّر ملامح بطل قصتك كل خمس ثوانٍ؟ المقاطع العشوائية لا تصنع فيلماً وتحرق رصيدك بسرعة.',
          th: 'เบื่อไหมกับ AI สร้างวิดีโอที่เปลี่ยนหน้าตัวเอกทุกห้าวินาที? คลิปสุ่มสั้นๆ ไม่สามารถเป็นหนังได้ และยังผลาญเครดิตของคุณอย่างรวดเร็ว',
        },
      },
      {
        blockNumber: 2,
        title: 'Blueprint Room + Continuity Vault Lock',
        timecode: '0:10–0:20',
        durationSeconds: 10,
        vo: {
          en: 'SceneFlow Studio is built for real storytelling. Lock your script in the Blueprint Room, then lock every face, outfit, voice, and location in the Continuity Vault.',
          es: 'SceneFlow Studio está hecho para contar historias reales. Cierra tu guion en el Blueprint Room y bloquea rostros, vestuario, voces y locaciones en el Continuity Vault.',
          pt: 'O SceneFlow Studio foi feito para histórias de verdade. Estruture no Blueprint Room e trave rostos, figurinos, vozes e cenários no Continuity Vault.',
          hi: 'SceneFlow Studio असली कहानियों के लिए बना है। Blueprint Room में कहानी लॉक करें और Continuity Vault में हर चेहरा, पहनावा, आवाज़ और लोकेशन फिक्स करें।',
          zh: 'SceneFlow Studio 专为完整叙事而生：先在蓝图室锁定剧本，再将角色面孔、服装、音色与场景锁进连续性资产库。',
          ar: 'صُمم SceneFlow Studio لسرد قصص حقيقية. ثبّت الحبكة في Blueprint Room، واقفل الوجوه والأزياء والأصوات والمواقع في خزنة الاستمرارية.',
          th: 'SceneFlow Studio สร้างมาเพื่อการเล่าเรื่องจริง ล็อกโครงเรื่องใน Blueprint Room แล้วล็อกใบหน้า ชุด เสียง และฉากทั้งหมดใน Continuity Vault',
        },
      },
      {
        blockNumber: 3,
        title: 'Voiced Animatic + 4K Master + $9 CTA',
        timecode: '0:20–0:30',
        durationSeconds: 10,
        vo: {
          en: 'Preview your full voiced animatic before spending video credits, then render a cohesive 4K cinema master. Start your first film for nine dollars at sceneflowai.studio.',
          es: 'Revisa tu animatic con voces antes de renderizar video y exporta tu máster en 4K. Empieza tu primera película por nueve dólares en sceneflowai.studio.',
          pt: 'Assista ao animatic completo com vozes antes de gerar vídeo e renderize seu master em 4K. Comece seu primeiro filme por nove dólares em sceneflowai.studio.',
          hi: 'वीडियो क्रेडिट खर्च करने से पहले पूरा वॉइस एनिमेटिक देखें — फिर 4K मास्टर तैयार करें। sceneflowai.studio पर सिर्फ़ नौ डॉलर में शुरू करें।',
          zh: '消耗视频点数前先看完整配音预演，确认无误一键渲染连贯的 4K 电影母带。9 美元开启你的首部电影：sceneflowai.studio。',
          ar: 'شاهد النسخة الأولية الكاملة بالصوت قبل إنفاق رصيد الفيديو، ثم أخرج فيلماً متكاملاً بدقة 4K. ابدأ بتسعة دولارات على sceneflowai.studio.',
          th: 'ดู Animatic ที่มีเสียงพากย์ครบก่อนใช้เครดิตสร้างวิดีโอ แล้วค่อยเรนเดอร์มาสเตอร์ 4K เริ่มสร้างหนังเรื่องแรกเพียง 9 ดอลลาร์ที่ sceneflowai.studio',
        },
      },
    ],
  },

  'crt-02': {
    id: 'crt-02',
    track: 'creator',
    title: '300 Manual Prompts vs. Walk-Away Production Agent',
    defaultVoice: 'Kore',
    directorNotes:
      'Energetic, relatable creator-director voice. Quick punchy tension in the opening hook giving way to breezy relief and effortless excitement, cleanly paced under 9 seconds.',
    musicPrompt:
      'Instrumental bright modern upbeat electronic-piano track, 30 seconds, 112 BPM, A major. 0:00-0:10 crisp playful staccato percussion and ticking rimshot creating energetic urgency. 0:10-0:20 clean drop into a breezy uplifting Rhodes piano melody, warm bassline, and effortless snapping beat. 0:20-0:30 sunny feel-good synth pads and crisp melodic chime resolving cleanly on an open airy major chord. Instrumental only, no vocals, no lyrics.',
    blocks: [
      {
        blockNumber: 1,
        title: '300 Manual Prompts Grind',
        timecode: '0:00–0:10',
        durationSeconds: 10,
        vo: {
          en: 'Making one ten-minute AI film used to mean three hundred manual image, voice, and video prompts — where one blocked shot ruins your whole evening.',
          es: 'Crear una película con IA de diez minutos antes exigía trescientos prompts manuales de imagen, voz y video — y un plano bloqueado arruinaba toda tu noche.',
          pt: 'Fazer um filme de dez minutos com IA exigia trezentos prompts manuais de imagem, voz e vídeo — e um único plano bloqueado travava sua noite inteira.',
          hi: 'दस मिनट की एक AI फ़िल्म बनाने के लिए तीन सौ मैनुअल प्रॉम्प्ट लिखने पड़ते थे — और एक भी शॉट अटकने पर पूरी रात बर्बाद हो जाती थी।',
          zh: '过去做一条十分钟的 AI 影片需要三百多次繁琐提示词，只要有一个镜头卡壳，一整晚就白费了。',
          ar: 'كان إنتاج فيلم مدته عشر دقائق يتطلب ثلاثمئة أمر يدوي للصور والصوت والفيديو — ولقطة واحدة متعثرة كانت تضيع سهرتك بالكامل.',
          th: 'เมื่อก่อนการทำหนังสั้น AI สิบนาทีต้องพิมพ์พรอมต์เองกว่าสามร้อยครั้ง แค่ช็อตเดียวติดขัด คืนทั้งคืนของคุณก็พังทันที',
        },
      },
      {
        blockNumber: 2,
        title: 'Walk-Away Production Agent',
        timecode: '0:10–0:20',
        durationSeconds: 10,
        vo: {
          en: 'With SceneFlow’s Production Agent, you spend under an hour perfecting your script, click launch, and walk away while it locks references, mixes audio, and auto-heals failed shots.',
          es: 'Con el Production Agent de SceneFlow pules tu guion en menos de una hora, pulsas iniciar y te alejas mientras bloquea referencias, mezcla audio y corrige tomas solas.',
          pt: 'Com o Production Agent do SceneFlow, você dedica menos de uma hora ao roteiro, clica em iniciar e sai da tela enquanto ele trava o elenco, mixa o áudio e corrige falhas sozinho.',
          hi: 'SceneFlow के Production Agent के साथ स्क्रिप्ट परफेक्ट करें, लॉन्च दबाएँ और टहलने निकल जाएँ — एजेंट खुद किरदार लॉक करता है, ऑडियो मिलाता है और अटकने वाले शॉट ठीक करता है।',
          zh: '有了 SceneFlow 自动制片代理，不到一小时打磨好剧本即可一键启动并离开——它自动锁定角色、混音配乐并智能修复失败镜头。',
          ar: 'مع وكيل الإنتاج في SceneFlow، تتقن السيناريو بأقل من ساعة وتضغط تشغيل وتتركه يثبّت الشخصيات ويمزج الصوت ويصلح اللقطات المتعثرة تلقائياً.',
          th: 'แต่ด้วย Production Agent ของ SceneFlow ใช้เวลาไม่ถึงชั่วโมงขัดเกลาบท กดเริ่ม แล้วลุกไปพัก ระบบจะล็อกตัวละคร มิกซ์เสียง และแก้ช็อตที่ล้มเหลวให้อัตโนมัติ',
        },
      },
      {
        blockNumber: 3,
        title: 'Café Phone Ping + $9 CTA',
        timecode: '0:20–0:30',
        durationSeconds: 10,
        vo: {
          en: 'When it’s done, your private Screening Room link pings straight to your phone. You direct the story — SceneFlow builds the film. Try it for nine dollars at sceneflowai.studio.',
          es: 'Al terminar, el enlace de tu sala privada llega directo a tu celular. Tú diriges la historia; SceneFlow construye la película. Pruébalo por nueve dólares en sceneflowai.studio.',
          pt: 'Quando termina, o link da sua sala privada chega direto no seu celular. Você dirige a história; o SceneFlow constrói o filme. Teste por nove dólares em sceneflowai.studio.',
          hi: 'फ़िल्म तैयार होते ही प्राइवेट स्क्रीनिंग रूम लिंक सीधे आपके फ़ोन पर आता है। कहानी आप डायरेक्ट करें, फ़िल्म SceneFlow बनाएगा। sceneflowai.studio पर नौ डॉलर से शुरू करें।',
          zh: '成片完成后放映室链接直接推送到你的手机。你负责导演故事，SceneFlow 构建电影。9 美元立即体验：sceneflowai.studio。',
          ar: 'وفور الجاهزية يصلك رابط قاعة العرض مباشرة على هاتفك. أنت تخرج القصة وSceneFlow يبني الفيلم. جرّبه بتسعة دولارات عبر sceneflowai.studio.',
          th: 'เมื่อเสร็จสมบูรณ์ ลิงก์ห้องฉายส่วนตัวจะส่งตรงเข้ามือถือทันที คุณกำกับเรื่องราว SceneFlow สร้างหนังให้เอง ทดลองเพียง 9 ดอลลาร์ที่ sceneflowai.studio',
        },
      },
    ],
  },

  'crt-03': {
    id: 'crt-03',
    track: 'creator',
    title: 'One Film, Seven Global Languages — Multiply Your Audience',
    defaultVoice: 'Kore',
    directorNotes:
      'Vibrant, expansive global storyteller narrator. Curious opening question expanding into bold international scale and clear enthusiasm, cleanly paced under 9 seconds.',
    musicPrompt:
      'Instrumental energetic global cinema percussion and soaring strings score, 30 seconds, 114 BPM, G minor expanding to B-flat major at 0:11. 0:00-0:10 intimate solo acoustic hand-drum pulse and warm deep bass note. 0:10-0:20 shimmering crystalline synth arpeggio joined by sweeping global percussion and luminous layered strings blooming outward. 0:20-0:30 joyful wide orchestral groove peaking cleanly and fading into a warm uplifting final chord. Instrumental only, no vocals, no lyrics.',
    blocks: [
      {
        blockNumber: 1,
        title: 'One-Language Ceiling',
        timecode: '0:00–0:10',
        durationSeconds: 10,
        vo: {
          en: 'Why publish your videos in only one language when the whole world is watching? Hiring voice actors and remixing global dubs used to cost thousands per episode.',
          es: '¿Por qué publicar tus historias en un solo idioma cuando todo el mundo está mirando? Contratar doblaje y remezclar audio solía costar miles por episodio.',
          pt: 'Por que publicar suas histórias em um único idioma quando o mundo inteiro está assistindo? Contratar dubladores e remixar trilhas custava milhares por episódio.',
          hi: 'जब पूरी दुनिया देख रही है, तो अपने वीडियो सिर्फ़ एक भाषा में क्यों डालें? ग्लोबल डबिंग और साउंड रीमिक्स में हर एपिसोड लाखों खर्च होते थे।',
          zh: '全世界都在看视频，为什么把你的频道局限在单一语言里？过去请配音、重做多语种混音，每集动辄数千美元。',
          ar: 'لماذا تنشر فيديوهاتك بلغة واحدة بينما العالم بأسره يشاهد؟ كانت الدبلجة وإعادة المكساج للقنوات العالمية تكلف آلاف الدولارات لكل حلقة.',
          th: 'ทำไมต้องลงวิดีโอแค่ภาษาเดียว ในเมื่อคนทั้งโลกกำลังรอชม? เมื่อก่อนการจ้างนักพากย์และมิกซ์เสียงสำหรับช่องต่างประเทศมีค่าใช้จ่ายมหาศาลต่อตอน',
        },
      },
      {
        blockNumber: 2,
        title: 'Build Once, Dub 7 Languages in Minutes',
        timecode: '0:10–0:20',
        durationSeconds: 10,
        vo: {
          en: 'Inside SceneFlow Studio, build your series once — then dub every episode into Spanish, Portuguese, Hindi, Mandarin, Arabic, Thai, and more in minutes.',
          es: 'En SceneFlow Studio produces tu serie una sola vez y doblas cada episodio a inglés, portugués, hindi, chino, árabe, tailandés y más en minutos.',
          pt: 'No SceneFlow Studio você cria sua série uma vez e dubla cada episódio para inglês, espanhol, hindi, mandarim, árabe, tailandês e muito mais em minutos.',
          hi: 'SceneFlow Studio में अपनी सीरीज़ एक बार बनाएँ — और मिनटों में अंग्रेज़ी, स्पैनिश, पुर्तगाली, चीनी, अरबी और थाई में डब करें।',
          zh: '在 SceneFlow Studio 里只需制作一次剧集，几分钟就能一键配音为英语、西语、葡语、印地语、阿拉伯语和泰语。',
          ar: 'داخل SceneFlow Studio، أنتج سلسلتك مرة واحدة — ثم دبلج كل حلقة إلى الإنجليزية والإسبانية والبرتغالية والهندية والصينية والتايلاندية خلال دقائق.',
          th: 'ใน SceneFlow Studio สร้างซีรีส์แค่ครั้งเดียว แล้วพากย์เสียงเป็นภาษาอังกฤษ สเปน โปรตุเกส ฮินดี จีน อาหรับ และอีกหลายภาษาได้ในไม่กี่นาที',
        },
      },
      {
        blockNumber: 3,
        title: 'Zero Re-Rendering + Global CTA',
        timecode: '0:20–0:30',
        durationSeconds: 10,
        vo: {
          en: 'Your original sound effects and score stay completely untouched, with zero extra video rendering costs. Multiply your global audience for nine dollars at sceneflowai.studio.',
          es: 'Tus efectos de sonido y música original quedan intactos, sin volver a renderizar el video. Multiplica tu audiencia global por nueve dólares en sceneflowai.studio.',
          pt: 'Seus efeitos sonoros e trilha permanecem intactos, sem renderizar o vídeo de novo. Multiplique sua audiência global por nove dólares em sceneflowai.studio.',
          hi: 'आपके मूल साउंड इफ़ेक्ट और म्यूज़िक बिल्कुल सुरक्षित रहते हैं, बिना दोबारा वीडियो रेंडर किए। sceneflowai.studio पर नौ डॉलर में ग्लोबल ऑडियंस बढ़ाएँ।',
          zh: '原片音效与配乐完整保留，完全无需重新渲染画面，极低成本撬动全球流量。9 美元开启体验：sceneflowai.studio。',
          ar: 'تبقى المؤثرات الصوتية والموسيقى الأصلية كما هي دون إعادة رندر الفيديو. ضاعف جمهورك العالمي بتسعة دولارات عبر sceneflowai.studio.',
          th: 'ซาวด์เอฟเฟกต์และดนตรีประกอบต้นฉบับยังคงอยู่ครบ โดยไม่ต้องเรนเดอร์วิดีโอใหม่ ขยายผู้ชมทั่วโลกวันนี้เพียง 9 ดอลลาร์ที่ sceneflowai.studio',
        },
      },
    ],
  },
}
