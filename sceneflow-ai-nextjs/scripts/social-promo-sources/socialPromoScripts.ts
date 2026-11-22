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
    title: 'Beyond Random AI Clips: The Automated 4K Client Studio',
    defaultVoice: 'Charon',
    directorNotes:
      'Confident, poised executive studio narrator. Crisp broadcast articulation, entrepreneurial authority, energetic yet unhurried commercial pacing that fits cleanly inside 9 seconds.',
    musicPrompt:
      'Instrumental modern commercial tech-cinema track, 30 seconds, 108 BPM, F minor lifting to A-flat major at 0:11. 0:00-0:10 tense muted bass pulse and subtle rhythmic clock-like percussion. 0:10-0:20 crisp upbeat synth pluck and warm confident Rhodes chords opening smoothly. 0:20-0:30 uplifting string swell and clean bass groove resolving on a resonant warm final chord. Instrumental only, no vocals, no lyrics.',
    blocks: [
      {
        blockNumber: 1,
        title: 'AI Clip Tool Trap (Random 5s Clips & Drifting Faces)',
        timecode: '0:00–0:10',
        durationSeconds: 10,
        vo: {
          en: 'Ordinary AI tools only spit out random five-second clips — leaving you trapped babysitting prompts, fixing drifting faces, and stitching audio all night.',
          es: 'Las herramientas de IA comunes solo generan clips sueltos de cinco segundos, atrapándote toda la noche entre prompts, rostros cambiantes y edición manual.',
          pt: 'Ferramentas comuns de IA só geram clipes soltos de cinco segundos — prendendo você a noite toda em prompts manuais, rostos inconsistentes e edição.',
          hi: 'आम AI टूल सिर्फ़ पाँच सेकंड के अलग-अलग क्लिप देते हैं — जिससे आप पूरी रात प्रॉम्प्ट, बदलते चेहरों और मैनुअल एडिटिंग में उलझे रहते हैं।',
          zh: '普通 AI 工具只会吐出随机的五秒碎片，让你整晚困在反复改提示词、修变脸和手动拼剪音频的噩梦里。',
          ar: 'أدوات الذكاء الاصطناعي العادية تنتج مقاطع عشوائية من خمس ثوانٍ فقط، فتتركك طوال الليل تصلح تغيّر الوجوه وتدمج الصوت يدوياً.',
          th: 'เครื่องมือ AI ทั่วไปสร้างได้แค่คลิปสุ่มห้าวินาที ทำให้คุณต้องนั่งแก้พรอมต์ แก้หน้าตัวละครเพี้ยน และตัดต่อเสียงเองทั้งคืน',
        },
      },
      {
        blockNumber: 2,
        title: 'Automated 4K Studio Platform (Continuity Vault + Production Agent)',
        timecode: '0:10–0:20',
        durationSeconds: 10,
        vo: {
          en: 'SceneFlow Studio is a complete automated 4K production platform. Lock cast and sets in the Continuity Vault, launch the Production Agent, and walk away.',
          es: 'SceneFlow Studio es una plataforma completa de producción 4K automatizada. Bloquea elenco y locaciones en Continuity Vault, lanza el agente y aléjate.',
          pt: 'O SceneFlow Studio é uma plataforma completa de produção 4K automatizada. Trave elenco e cenários no Continuity Vault, acione o agente e relaxe.',
          hi: 'SceneFlow Studio एक पूरा ऑटोमेटेड 4K प्रोडक्शन प्लेटफ़ॉर्म है। Continuity Vault में किरदार व सेट लॉक करें, Production Agent चलाएँ और निश्चिंत हो जाएँ।',
          zh: 'SceneFlow Studio 是全流程自动化 4K 制片平台：在连续性资产库锁定角色与场景，一键启动自动制片代理即可轻松离开。',
          ar: 'SceneFlow Studio منصة إنتاج 4K آلية متكاملة. ثبّت الشخصيات والمواقع في خزنة الاستمرارية، شغّل وكيل الإنتاج، واتركه يبني الفيلم وحده.',
          th: 'SceneFlow Studio คือแพลตฟอร์มผลิตวิดีโอ 4K อัตโนมัติครบวงจร ล็อกตัวละครและฉากใน Continuity Vault กดเริ่ม Production Agent แล้วปล่อยระบบทำงานได้เลย',
        },
      },
      {
        blockNumber: 3,
        title: '100% White-Label Client Portals + 90% Margins CTA',
        timecode: '0:20–0:30',
        durationSeconds: 10,
        vo: {
          en: 'Deliver memoirs, real estate, and corporate films through 100% white-label client portals — with up to ninety percent margins. Launch at sceneflowai.studio.',
          es: 'Entrega memorias, tours inmobiliarios y videos corporativos en portales 100% marca blanca, con hasta noventa por ciento de margen. Empieza en sceneflowai.studio.',
          pt: 'Entregue memórias, tours imobiliários e filmes corporativos em portais 100% com a sua marca, com até noventa por cento de margem em sceneflowai.studio.',
          hi: '100% अपने ब्रांड के क्लाइंट पोर्टल से मेमॉयर, रियल एस्टेट और कॉर्पोरेट फ़िल्में डिलीवर करें — 90 प्रतिशत तक मुनाफ़े के साथ। शुरू करें sceneflowai.studio पर।',
          zh: '通过 100% 白标客户门户交付传记、房产与企业宣传片，净利率高达 90%。立即访问 sceneflowai.studio 开启工作室。',
          ar: 'سلّم أفلام السيرة الذاتية والعقارات والتدريب عبر بوابات عملاء بعلامتك التجارية 100% بهوامش تصل لتسعين بالمئة عبر sceneflowai.studio.',
          th: 'ส่งมอบงานชีวประวัติ ทัวร์อสังหา และสื่อองค์กรผ่านพอร์ทัลแบรนด์ของคุณ 100% ทำกำไรสูงสุด 90 เปอร์เซ็นต์ เริ่มเลยที่ sceneflowai.studio',
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
    title: 'The Video Memoir Business: Turn Family Stories Into High-Margin 4K Income',
    defaultVoice: 'Charon',
    directorNotes:
      'Warm, inspiring, trustworthy entrepreneurial studio narrator. Heartfelt opening shifting into confident digital-business opportunity, crisp commercial pacing (~9–10 seconds per block).',
    musicPrompt:
      'Instrumental warm uplifting modern acoustic-percussive commercial track, 30 seconds, 106 BPM, G major. Immediate soft crisp finger-snap and warm felt piano groove from 0:00 (no silent intro). 0:00-0:10 nostalgic warm Rhodes chords and light rhythmic pulse evoking cherished family memories. 0:10-0:20 bright acoustic guitar pluck, crisp modern percussive beat, and soaring warm strings signaling effortless automation. 0:20-0:30 confident joyful commercial swell with clean bassline resolving on a resonant warm chord. Instrumental only, no vocals, no lyrics.',
    blocks: [
      {
        blockNumber: 1,
        title: 'Baby Boomer Memoir Goldmine (Untapped Family Market)',
        timecode: '0:00–0:10',
        durationSeconds: 10,
        vo: {
          en: 'Millions of aging parents and families want their photos and life stories turned into cinema-quality video memoirs — and happily pay premium rates.',
          es: 'Millones de padres mayores y familias sueñan con convertir sus fotos e historias en películas de memoria — y pagan tarifas premium por ello.',
          pt: 'Milhões de pais e famílias querem transformar fotos antigas e histórias de vida em filmes de memória — e pagam valores premium por isso.',
          hi: 'करोड़ों माता-पिता और परिवार अपनी पुरानी तस्वीरों व जीवन की कहानियों को सिनेमा जैसी मेमॉयर फ़िल्म बनवाना चाहते हैं — और इसके लिए प्रीमियम भुगतान करते हैं।',
          zh: '全球无数长辈与家庭渴望将老照片和人生故事拍成电影级人生传记，并愿意为此支付高昂的定制费用。',
          ar: 'ملايين الآباء والعائلات حول العالم يتمنون تحويل صورهم وقصص حياتهم إلى أفلام سيرة سينمائية، ويدفعون بسخاء مقابل ذلك.',
          th: 'ครอบครัวและผู้สูงวัยนับล้านอยากเปลี่ยนภาพเก่าและเรื่องราวชีวิตให้เป็นหนังชีวประวัติระดับโรงภาพยนตร์ และพร้อมจ่ายในราคาพรีเมียม',
        },
      },
      {
        blockNumber: 2,
        title: 'Zero-Gear Laptop Memoir Studio (White-Label Intake + 4K Auto-Build)',
        timecode: '0:10–0:20',
        durationSeconds: 10,
        vo: {
          en: 'You need zero camera gear or editing skills. Families upload photos and voice notes through your branded portal while SceneFlow builds the 4K film automatically.',
          es: 'No necesitas cámaras ni saber editar. Las familias suben fotos y audios en tu portal marca blanca mientras SceneFlow crea la película 4K automáticamente.',
          pt: 'Você não precisa de câmeras nem saber editar. As famílias enviam fotos e áudios pelo seu portal próprio enquanto o SceneFlow cria o filme 4K sozinho.',
          hi: 'आपको किसी कैमरे या एडिटिंग कौशल की ज़रूरत नहीं। परिवार आपके ब्रांडेड पोर्टल पर फ़ोटो और आवाज़ भेजते हैं, और SceneFlow अपने आप 4K फ़िल्म बनाता है।',
          zh: '你无需摄影器材也不必懂剪辑：家人通过你的专属白标门户上传照片与口述音频，SceneFlow 自动生成完整 4K 成片。',
          ar: 'لا تحتاج لأي كاميرات أو خبرة مونتاج. ترفع العائلة صورها وتسجيلاتها عبر بوابتك الخاصة، بينما يبني SceneFlow فيلم 4K تلقائياً.',
          th: 'คุณไม่ต้องมีกล้องหรือทักษะตัดต่อ ครอบครัวส่งรูปและเสียงเล่าเรื่องผ่านพอร์ทัลแบรนด์คุณ แล้ว SceneFlow สร้างหนัง 4K ให้อัตโนมัติ',
        },
      },
      {
        blockNumber: 3,
        title: 'Up to 90% Margin Virtual Income CTA',
        timecode: '0:20–0:30',
        durationSeconds: 10,
        vo: {
          en: 'Turn priceless family memories into a rewarding laptop business with up to ninety percent margins. Launch your memoir studio today at sceneflowai.studio.',
          es: 'Convierte recuerdos familiares en un negocio digital rentable con hasta noventa por ciento de margen. Lanza tu estudio hoy en sceneflowai.studio.',
          pt: 'Transforme memórias de família em uma renda digital de alto retorno com até noventa por cento de margem. Comece hoje em sceneflowai.studio.',
          hi: 'परिवारों की अनमोल यादों को 90 प्रतिशत तक मुनाफ़े वाले लैपटॉप बिज़नेस में बदलें। आज ही अपना मेमॉयर स्टूडियो शुरू करें sceneflowai.studio पर।',
          zh: '把珍贵的家庭回忆变成净利率高达 90% 的居家数字事业。立即访问 sceneflowai.studio 开启你的传记影视工作室。',
          ar: 'حوّل ذكريات العائلات الثمينة إلى مشروع رقمي مربح من حاسوبك بهوامش تصل لتسعين بالمئة. أطلق استوديوك اليوم عبر sceneflowai.studio.',
          th: 'เปลี่ยนความทรงจำอันล้ำค่าเป็นธุรกิจดิจิทัลจากโน้ตบุ๊กที่ทำกำไรได้สูงสุด 90 เปอร์เซ็นต์ เปิดสตูดิโอของคุณวันนี้ที่ sceneflowai.studio',
        },
      },
    ],
  },

  'crt-02': {
    id: 'crt-02',
    track: 'creator',
    title: 'Zero-Gear 4K Video Business: Earn Recurring Local Client Income From Your Laptop',
    defaultVoice: 'Charon',
    directorNotes:
      'Sharp, high-energy modern entrepreneur studio narrator. Confident, motivating, crisp commercial cadence showing an accessible high-margin laptop business (~9–10 seconds per block).',
    musicPrompt:
      'Instrumental punchy kinetic beat-driven modern tech-business track, 30 seconds, 114 BPM, F minor lifting to A-flat major at 0:10. Immediate crisp percussive kick, snappy rimshot, and driving bass groove right from 0:00 (no quiet intro). 0:10-0:20 sleek upbeat synth plucks and energetic handclap rhythm building unstoppable momentum. 0:20-0:30 triumphant polished electronic-strings groove ending on a crisp confident hit. Instrumental only, no vocals, no lyrics.',
    blocks: [
      {
        blockNumber: 1,
        title: 'Local Business 4K Video Demand (Real Estate, Hotels & Clinics)',
        timecode: '0:00–0:10',
        durationSeconds: 10,
        vo: {
          en: 'Every real estate agent, boutique hotel, and local business needs 4K showcase videos — yet hates waiting weeks and paying traditional crews thousands.',
          es: 'Cada agente inmobiliario, hotel boutique y negocio local necesita videos 4K — pero odia esperar semanas y pagar miles a productoras tradicionales.',
          pt: 'Todo corretor, hotel boutique e negócio local precisa de vídeos 4K — mas detesta esperar semanas e pagar caro por produtoras tradicionais.',
          hi: 'हर रियल एस्टेट एजेंट, बुटीक होटल और लोकल बिज़नेस को 4K वीडियो चाहिए — पर पारंपरिक क्रू का भारी खर्च और हफ़्तों का इंतज़ार कोई नहीं चाहता।',
          zh: '每位房产经纪、精品酒店和本地企业都急需 4K 宣传片，却苦于传统拍摄团队收费高昂、周期动辄数周。',
          ar: 'كل وكيل عقاري وفندق وشركة محلية بحاجة لفيديوهات 4K احترافية، لكنهم يكرهون الانتظار لأسابيع ودفع آلاف لطواقم التصوير.',
          th: 'นายหน้าอสังหา โรงแรมบูติก และธุรกิจท้องถิ่นทุกแห่งต้องการวิดีโอ 4K แต่ไม่อยากรอหลายสัปดาห์และจ่ายค่ากองถ่ายราคาแพง',
        },
      },
      {
        blockNumber: 2,
        title: 'One-Person Automated 4K Studio From Home',
        timecode: '0:10–0:20',
        durationSeconds: 10,
        vo: {
          en: 'Start a one-person 4K video studio right from your laptop. SceneFlow’s Production Agent builds polished client films automatically while you focus on landing clients.',
          es: 'Abre tu propio estudio 4K desde tu laptop. El Production Agent de SceneFlow crea videos profesionales automáticamente mientras tú consigues más clientes.',
          pt: 'Lance sua produtora 4K direto do seu notebook. O Production Agent do SceneFlow cria vídeos impecáveis automaticamente enquanto você fecha novos clientes.',
          hi: 'अपने लैपटॉप से वन-पर्सन 4K वीडियो स्टूडियो शुरू करें। SceneFlow का Production Agent अपने आप फ़िल्में बनाता है, जबकि आप नए क्लाइंट जोड़ते हैं।',
          zh: '一台笔记本就能开启一人 4K 商业影视工作室：SceneFlow 自动制片代理全自动产出成片，让你专注拓展客户。',
          ar: 'أطلق استوديو فيديو 4K لشخص واحد من حاسوبك مباشرة. يبني وكيل الإنتاج في SceneFlow الأفلام تلقائياً بينما تركز أنت على كسب العملاء.',
          th: 'เริ่มสตูดิโอวิดีโอ 4K คนเดียวจากโน้ตบุ๊กของคุณ ให้ Production Agent ของ SceneFlow ผลิตงานให้อัตโนมัติ ขณะที่คุณโฟกัสการหาลูกค้า',
        },
      },
      {
        blockNumber: 3,
        title: 'Recurring Monthly Virtual Income CTA',
        timecode: '0:20–0:30',
        durationSeconds: 10,
        vo: {
          en: 'Deliver under your own brand through zero-login client portals and build recurring monthly virtual income. Start your studio today at sceneflowai.studio.',
          es: 'Entrega bajo tu propia marca en portales sin registro y construye ingresos digitales mensuales recurrentes. Empieza hoy en sceneflowai.studio.',
          pt: 'Entregue com a sua própria marca em portais sem login e construa uma renda digital recorrente todo mês. Comece hoje em sceneflowai.studio.',
          hi: 'बिना लॉगिन वाले अपने ब्रांडेड पोर्टल से डिलीवर करें और हर महीने नियमित डिजिटल आय बनाएँ। आज ही शुरू करें sceneflowai.studio पर।',
          zh: '通过免登录专属白标门户交付成片，打造稳定的月度复购商业收入。立即前往 sceneflowai.studio 开启事业。',
          ar: 'سلّم أعمالك بعلامتك التجارية عبر بوابات دون تسجيل دخول، وابنِ دخلاً رقمياً شهرياً متجدداً. ابدأ استوديوك اليوم عبر sceneflowai.studio.',
          th: 'ส่งมอบงานภายใต้แบรนด์คุณผ่านพอร์ทัลที่ไม่ต้องล็อกอิน สร้างรายได้ออนไลน์ประจำทุกเดือน เริ่มสตูดิโอของคุณวันนี้ที่ sceneflowai.studio',
        },
      },
    ],
  },

  'crt-03': {
    id: 'crt-03',
    track: 'creator',
    title: 'Monetize Global Faceless 4K Video Series in 70+ Languages',
    defaultVoice: 'Charon',
    directorNotes:
      'Visionary, motivating digital-media narrator. High-retention energetic pacing appealing to aspiring YouTubers, podcasters, and global content entrepreneurs (~9–10 seconds per block).',
    musicPrompt:
      'Instrumental high-retention modern global electronic-cinematic beat track, 30 seconds, 116 BPM, D minor expanding to F major at 0:10. Immediate driving percussive groove and pulsing synth bass right at 0:00 (zero slow intro). 0:10-0:20 shimmering rhythmic synth arpeggio, crisp drums, and expansive cinematic strings surging forward. 0:20-0:30 bold triumphant global media anthem climax resolving cleanly on a sharp resonant chord. Instrumental only, no vocals, no lyrics.',
    blocks: [
      {
        blockNumber: 1,
        title: 'Faceless 4K Channels & Podcast-to-Video Monetization Wave',
        timecode: '0:00–0:10',
        durationSeconds: 10,
        vo: {
          en: 'Faceless 4K documentaries, sci-fi series, and video podcasts are generating huge global ad revenue — without you ever stepping in front of a camera.',
          es: 'Los canales sin rostro de documentales 4K, series y videopodcasts generan ingresos globales enormes — sin que tengas que salir frente a cámara.',
          pt: 'Canais sem rosto de documentários 4K, séries e videocasts geram receitas globais enormes — sem você precisar aparecer diante das câmeras.',
          hi: 'फ़ेसलेस 4K डॉक्यूमेंट्री, सीरीज़ और वीडियो पॉडकास्ट दुनिया भर में शानदार कमाई कर रहे हैं — वह भी बिना कैमरे के सामने आए।',
          zh: '无需露脸的 4K 纪录片、科幻剧集与视频播客正在全球疯狂变现——全程不必出镜也能赚取持续广告收益。',
          ar: 'القنوات دون ظهور للوثائقيات بدقة 4K والمسلسلات وبودكاست الفيديو تحقق أرباحاً عالمية ضخمة دون أن تقف أمام الكاميرا.',
          th: 'ช่องสารคดี 4K ซีรีส์ และวิดีโอพอดแคสต์แบบไม่เปิดหน้ากำลังสร้างรายได้ทั่วโลกมหาศาล โดยที่คุณไม่ต้องออกหน้ากล้องเลยสักครั้ง',
        },
      },
      {
        blockNumber: 2,
        title: 'Consistent Series Engine + One-Click 70+ Language Dubbing',
        timecode: '0:10–0:20',
        durationSeconds: 10,
        vo: {
          en: 'Turn one idea or audio story into an ongoing 4K series with locked characters, then dub every episode into over seventy languages automatically.',
          es: 'Convierte una idea o podcast en una serie 4K continua con personajes fijos, y dobla cada episodio a más de setenta idiomas automáticamente.',
          pt: 'Transforme uma ideia ou áudio em uma série 4K contínua com personagens travados, e duble cada episódio para mais de setenta idiomas automaticamente.',
          hi: 'एक आइडिया या ऑडियो कहानी को लॉक किरदारों वाली 4K सीरीज़ में बदलें, और हर एपिसोड को अपने आप सत्तर से अधिक भाषाओं में डब करें।',
          zh: '把一个创意或播客音频变成角色连贯的 4K 剧集，并一键自动配音为七十多种全球语种，无需重渲染画面。',
          ar: 'حوّل فكرة واحدة أو قصة صوتية إلى سلسلة 4K متواصلة بشخصيات ثابتة، ثم دبلج كل حلقة إلى أكثر من سبعين لغة تلقائياً.',
          th: 'เปลี่ยนหนึ่งไอเดียหรือพอดแคสต์เป็นซีรีส์ 4K ต่อเนื่องที่ล็อกตัวละครเป๊ะ แล้วพากย์เสียงเป็นกว่าเจ็ดสิบภาษาทั่วโลกได้อัตโนมัติ',
        },
      },
      {
        blockNumber: 3,
        title: 'Multiply Global Views, Sponsors & Ad Revenue CTA',
        timecode: '0:20–0:30',
        durationSeconds: 10,
        vo: {
          en: 'Produce once, publish worldwide, and multiply your views, sponsors, and creator income with zero extra rendering. Start building at sceneflowai.studio.',
          es: 'Produce una sola vez, publica en todo el mundo y multiplica tus vistas, patrocinios e ingresos sin volver a renderizar. Empieza en sceneflowai.studio.',
          pt: 'Produza uma vez, publique no mundo todo e multiplique visualizações, patrocínios e receita sem renderizar de novo. Comece em sceneflowai.studio.',
          hi: 'एक बार बनाएँ, पूरी दुनिया में पब्लिश करें और बिना दोबारा रेंडर किए व्यूज़, स्पॉन्सर व कमाई कई गुना बढ़ाएँ। शुरू करें sceneflowai.studio पर।',
          zh: '一次制作，全球分发，零额外渲染成本成倍放大播放量、品牌赞助与频道收益。立即前往 sceneflowai.studio 开启创作变现。',
          ar: 'أنتج مرة واحدة، انشر للعالم بأسره، وضاعف المشاهدات والرعايات وأرباح قناتك دون إعادة رندر. ابدأ البناء الآن عبر sceneflowai.studio.',
          th: 'สร้างครั้งเดียว เผยแพร่ได้ทั่วโลก เพิ่มยอดวิว สปอนเซอร์ และรายได้ครีเอเตอร์หลายเท่าโดยไม่ต้องเรนเดอร์ซ้ำ เริ่มเลยที่ sceneflowai.studio',
        },
      },
    ],
  },
}
