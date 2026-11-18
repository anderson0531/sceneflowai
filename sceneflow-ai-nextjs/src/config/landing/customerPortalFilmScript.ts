import type { FeaturePanLocaleId } from './customerPortalAnimaticCopy'

export interface CustomerPortalFilmReferenceLock {
  token: string
  category: 'Cast' | 'Location' | 'Prop' | 'Screen'
  name: string
  role: string
  promptDescription: string
  assetPath?: string
}

export interface ScreenRoiSpec {
  /** Horizontal center [0..1] on the 2560x1440 UI plate */
  cxFrac: number
  /** Vertical center [0..1] on the 2560x1440 UI plate */
  cyFrac: number
  /** Crop width as a fraction [0.55..1.0] of the 2560x1440 plate */
  widthFrac: number
}

export interface CustomerPortalFilmBeatSpec {
  beatNumber: number
  id: string
  kind: 'story_clip' | 'app_screen'
  /** 1..8 for `story_clip` (`tmp/customer-portal-build/clips/01.mp4` .. `08.mp4`) */
  clipNumber?: number
  /** `01-business-portal` .. `08-client-signoff-roi` for `app_screen` */
  screenSlug?: string
  /** Optional 2560x1440 PNG plate the user can upload into Flow as an on-set monitor/tablet reference */
  optionalFlowScreenRef?: string
  fromRoi?: ScreenRoiSpec
  toRoi?: ScreenRoiSpec
  shortTabLabel: Record<FeaturePanLocaleId, string>
  title: Record<FeaturePanLocaleId, string>
  videoPrompt?: string
  functionalScreenSummary?: string
  narrationVo: Record<FeaturePanLocaleId, string>
}

export const CUSTOMER_PORTAL_FILM_META = {
  filmTitle: 'The Twenty-Nine-Dollar Doorway',
  runtimeLabel: '2:30',
  durationSeconds: 150,
  aspectRatio: '16:9 (with 9:16 Social Safe-Zone)',
  narratorVoice: 'Charon (gemini-2.5-flash-preview-tts / Chirp3-HD-Charon)',
  narratorStylePrompt:
    'Warm, grounded, authoritative executive studio narrator. Clear broadcast diction, unhurried cadence, inspiring confidence on story beats and crisp product clarity on application beats.',
  artStyleLock:
    'Anamorphic Cinema Commercial Realism for 8 Human Story Clips + Razor-Sharp 2560x1440 QHD Application UI Plates Interjected with Smooth Cubic Ease-In-Out Camera Pan/Zoom',
  backgroundMusic: {
    title: 'Harborlight Horizon (2:30 Three-Act Warm Felt Piano, Plucked Cello & Modern Chamber Score)',
    bpmAndKey: '92 BPM · D Major building smoothly to an emotional 1:55–2:20 family premiere swell',
    mixLevel: '24% idle / -18 dB ducked smoothly beneath Studio Narrator VO',
    generationPrompt:
      'Instrumental modern cinema commercial and documentary score, 150 seconds (2:30), 92 BPM, D major. 0:00-0:45 (Act I - Boutique Launch & Paid Discovery) sunlit warm felt piano notes and subtle plucked acoustic guitar harmonics with an optimistic, effortless boutique-studio pulse. 0:45-1:45 (Act II - Intelligent Automation & Shared Craft) warm solo cello and light brushed marimba-and-shaker groove enter smoothly, conveying creative momentum and clarity. 1:45-2:18 (Act III - Emotional 4K Premiere) soaring, heartfelt chamber strings and warm French horn swell for a father-daughter screening embrace. 2:18-2:30 serene resolving felt piano D-major chord with natural studio decay. Instrumental only, no vocals.',
  },
} as const

export const CUSTOMER_PORTAL_FILM_REFERENCE_LOCKS: readonly CustomerPortalFilmReferenceLock[] = [
  {
    token: 'person [1]',
    category: 'Cast',
    name: 'Maya 34',
    role: 'New Video Service Provider (Solo Studio Founder)',
    promptDescription:
      'Poised, approachable 34-year-old solo creative studio founder, shoulder-length dark espresso waves, warm dark-brown eyes, tailored sage-green linen blazer over ivory knit top.',
  },
  {
    token: 'person [2]',
    category: 'Cast',
    name: 'Elena 46',
    role: 'Client Ordering Family Memoir Film',
    promptDescription:
      'Warm-hearted 46-year-old daughter, wavy chestnut-brown hair, expressive hazel-amber eyes, cozy cream cable-knit cardigan over soft terracotta blouse.',
  },
  {
    token: 'person [3]',
    category: 'Cast',
    name: 'Mateo 80',
    role: 'Honoree Father at Family Premiere',
    promptDescription:
      'Distinguished 80-year-old coastal boatbuilder grandfather, combed silver-white hair, deep warm laugh lines, navy wool fisherman sweater over chambray collar.',
  },
  {
    token: 'person [4]',
    category: 'Cast',
    name: 'Mateo 28',
    role: '1972 Era Likeness from Mateo 80',
    promptDescription:
      'Transform note: "28-year-old 1972 version of Mateo 80 with thick dark wavy hair, clean jawline, identical warm eyes and smile, rolled-sleeve chambray work shirt in sunlit cedar boatshop."',
  },
  {
    token: 'location [1]',
    category: 'Location',
    name: 'Maya Home Studio',
    role: 'Provider Boutique Desk & Curved Display Set',
    promptDescription:
      'Sunlit minimalist apartment studio overlooking green city trees, warm oak desk, sleek aluminum laptop, wide curved monitor, ceramic coffee mug, 3200K morning sunlight.',
  },
  {
    token: 'location [2]',
    category: 'Location',
    name: 'Elena Sunlit Living Room',
    role: 'Customer Home Discovery & Family Screening Set',
    promptDescription:
      'Inviting coastal-craftsman living room with warm oak coffee table, oatmeal linen sofa, golden afternoon window shafts, and wall-mounted widescreen television.',
  },
  {
    token: 'prop [1]',
    category: 'Prop',
    name: 'Cedar Compass Box',
    role: 'Heirloom Continuity Prop Lock',
    promptDescription:
      'Hand-carved scorched-cedar heirloom compass box resting beside three square faded 1970s harbor snapshots on warm oak wood, zero text.',
  },
] as const

export const CUSTOMER_PORTAL_FILM_BEATS: readonly CustomerPortalFilmBeatSpec[] = [
  // ── BEAT 01: STORY CLIP 01 ─────────────────────────────────────────────────
  {
    beatNumber: 1,
    id: 'story-01-maya-launches',
    kind: 'story_clip',
    clipNumber: 1,
    optionalFlowScreenRef: 'public/landing/video-services/portal-screens/01-business-portal.png',
    shortTabLabel: {
      en: '01 · Maya’s Studio',
      es: '01 · Estudio de Maya',
      pt: '01 · Estúdio da Maya',
      hi: '01 · माया का स्टूडियो',
      zh: '01 · Maya 的工作室',
      ar: '01 · استوديو مايا',
      th: '01 · สตูดิโอของมายา',
    },
    title: {
      en: 'Story: Maya Launches Her White-Label Video Studio',
      es: 'Historia: Maya Lanza su Estudio de Video Marca Blanca',
      pt: 'História: Maya Lança sua Produtora de Vídeo White-Label',
      hi: 'कहानी: माया ने लॉन्च किया अपना व्हाइट-लेबल वीडियो स्टूडियो',
      zh: '故事：Maya 一人开启白标视频工作室',
      ar: 'القصة: مايا تطلق استوديو الفيديو الخاص بها بعلامتها التجارية',
      th: 'เรื่องราว: มายาเปิดตัวสตูดิโอวิดีโอแบรนด์ของตัวเอง',
    },
    videoPrompt:
      '0s–2s (Start frame): Inside Maya Home Studio bathed in golden morning sunlight, Maya 34 sets a steaming ceramic coffee mug on her oak desk beside her sleek laptop. 2s–8s (Action): Maya 34 opens her laptop and glances toward her wide curved monitor glowing with dark-emerald cinema portfolio cards, smiling with calm entrepreneurial confidence. 8s–10s (End frame): Warm medium close-up of Maya 34 leaning back comfortably as morning light catches her sage blazer. Camera: Smooth slow dolly arc left-to-right across the sunlit oak desk. No spoken dialogue.',
    narrationVo: {
      en: 'Meet Maya—launching her own white-label video studio from a single laptop, without camera crews, cold calls, or chasing client emails.',
      es: 'Conoce a Maya, quien lanza su propio estudio de video marca blanca desde un solo portátil, sin equipos de rodaje, llamadas en frío ni cadenas de correos.',
      pt: 'Conheça Maya, lançando sua própria produtora white-label em um único notebook, sem equipes de filmagem, ligações frias ou trocas intermináveis de e-mails.',
      hi: 'मिलिए माया से—जो बिना किसी शूटिंग क्रू, कोल्ड कॉल या ईमेल के झंझट के, एक ही लैपटॉप से अपना व्हाइट-लेबल वीडियो स्टूडियो चला रही हैं।',
      zh: '认识一下 Maya——她仅凭一台笔记本便开启了专属白标视频工作室，无需拍摄团队、陌拜电话或繁琐邮件往来。',
      ar: 'تعرّف إلى مايا، التي تطلق استوديو الفيديو الخاص بها من حاسوب محمول واحد، دون طواقم تصوير أو مكالمات مبيعات أو ملاحقة رسائل البريد.',
      th: 'พบกับมายา ผู้เปิดสตูดิโอวิดีโอแบรนด์ของตัวเองด้วยแล็ปท็อปเครื่องเดียว โดยไม่ต้องมีกองถ่าย ไม่ต้องโทรขายงาน หรือคอยตามอีเมลลูกค้า',
    },
  },

  // ── BEAT 02: APP SCREEN 01 — 1. Business Portal ($29) ──────────────────────
  {
    beatNumber: 2,
    id: 'screen-01-business-portal',
    kind: 'app_screen',
    screenSlug: '01-business-portal',
    fromRoi: { cxFrac: 0.44, cyFrac: 0.52, widthFrac: 0.88 },
    toRoi: { cxFrac: 0.68, cyFrac: 0.56, widthFrac: 0.64 },
    shortTabLabel: {
      en: '02 · 1. Portal ($29)',
      es: '02 · 1. Portal (MX$547)',
      pt: '02 · 1. Portal (R$170)',
      hi: '02 · 1. पोर्टल (₹2,720)',
      zh: '02 · 1. 商业门户 (¥193)',
      ar: '02 · 1. البوابة (108 ر.س)',
      th: '02 · 1. พอร์ทัล (฿985)',
    },
    title: {
      en: 'App 1 · Business Portal: 4 Services & Self-Funding $29 Blueprint Pass',
      es: 'App 1 · Portal de Negocio: 4 Servicios y Pase Autofinanciado de MX$547',
      pt: 'App 1 · Portal de Negócios: 4 Serviços e Passe Autofinanciado de R$170',
      hi: 'ऐप 1 · बिज़नेस पोर्टल: 4 सेवाएँ और स्व-वित्तपोषित ₹2,720 ब्लूप्रिंट पास',
      zh: '应用 1 · 品牌门户：四大视频服务与 ¥193 蓝图通行证',
      ar: 'التطبيق 1 · بوابة الأعمال: أربع خدمات وباقة المخطط الممولة ذاتياً بـ 108 ر.س',
      th: 'แอป 1 · พอร์ทัลธุรกิจ: 4 บริการวิดีโอและแพ็กเกจ Blueprint ฿985',
    },
    functionalScreenSummary:
      'Displays Maya’s white-label Harborlight storefront offering Memoirs, Real Estate Tours, Education & Training, and Brand Stories, zooming into the $29 Storyboard Blueprint Pass (100% credited, ~$3.90 max compute, 83% net margin).',
    narrationVo: {
      en: 'On her branded storefront, clients choose Memoirs, Real Estate Tours, Training, or Brand Stories—starting with a twenty-nine-dollar Storyboard Blueprint Pass that filters serious buyers and funds compute at an eighty-three percent margin.',
      es: 'En su portal con marca propia, los clientes eligen Memorias, Tours Inmobiliarios, Capacitación o Historias de Marca, iniciando con un Pase de Blueprint de veintinueve dólares que filtra compradores reales con ochenta y tres por ciento de margen.',
      pt: 'Em seu portal white-label, o cliente escolhe Memórias, Tours Imobiliários, Treinamento ou Histórias de Marca, começando com um Passe de Blueprint de vinte e nove dólares que filtra compradores reais com oitenta e três por cento de margem.',
      hi: 'उनके ब्रांडेड पोर्टल पर ग्राहक मेमॉयर, रियल एस्टेट टूर, ट्रेनिंग या ब्रांड स्टोरीज़ चुनते हैं और उन्नतीस डॉलर के Blueprint पास से शुरुआत करते हैं—जो तिरासी प्रतिशत मार्जिन देता है।',
      zh: '在她的品牌门户上，客户可选择回忆录、房产导览、培训或品牌故事，通过支付二十九美元蓝图通行证开启服务，筛选高意向客户并带来百分之八十三的净毛利。',
      ar: 'عبر بوابتها بعلامتها الخاصة، يختار العملاء أفلام الذكريات أو العقارات أو التدريب أو قصص العلامات، بدءاً بباقة Blueprint بتسعة وعشرين دولاراً بهامش ثلاثة وثمانين بالمئة.',
      th: 'บนหน้าเว็บแบรนด์ของเธอ ลูกค้าเลือกบริการวิดีโอชีวประวัติ อสังหา สื่ออบรม หรือแบรนด์สตอรี่ โดยเริ่มจากแพ็กเกจ Blueprint ยี่สิบเก้าดอลลาร์ที่คัดกรองลูกค้าจริงและทำกำไรแปดสิบสามเปอร์เซ็นต์',
    },
  },

  // ── BEAT 03: STORY CLIP 02 ─────────────────────────────────────────────────
  {
    beatNumber: 3,
    id: 'story-02-elena-checkout-voice',
    kind: 'story_clip',
    clipNumber: 2,
    optionalFlowScreenRef: 'public/landing/video-services/portal-screens/02-auto-intake-email.png',
    shortTabLabel: {
      en: '03 · Elena Orders',
      es: '03 · Elena Ordena',
      pt: '03 · Elena Pede',
      hi: '03 · एलेना का ऑर्डर',
      zh: '03 · Elena 下单讲述',
      ar: '03 · إيلينا تطلب',
      th: '03 · เอเลน่าสั่งทำ',
    },
    title: {
      en: 'Story: Elena Purchases the $29 Pass & Shares Her Father’s Memories',
      es: 'Historia: Elena Compra el Pase de MX$547 y Relata los Recuerdos de su Padre',
      pt: 'História: Elena Compra o Passe de R$170 e Conta as Memórias do Pai',
      hi: 'कहानी: एलेना ने ₹2,720 पास लिया और पिता की यादें साझा कीं',
      zh: '故事：Elena 支付 ¥193 并语音讲述父亲往事',
      ar: 'القصة: إيلينا تشتري باقة 108 ر.س وتروي ذكريات والدها',
      th: 'เรื่องราว: เอเลน่าซื้อแพ็กเกจ ฿985 และเล่าความทรงจำของคุณพ่อ',
    },
    videoPrompt:
      '0s–2s (Start frame): Inside Elena Sunlit Living Room, Elena 46 sits beside Cedar Compass Box and faded 1970s harbor snapshots on the oak table, tapping her smartphone for contactless checkout with a warm smile. 2s–8s (Action): Moments later on the oatmeal sofa, Elena 46 opens an arrival chime on her phone and speaks fondly while holding a vintage 1972 boatshop snapshot. 8s–10s (End frame): Intimate close-up of Elena 46 laughing softly with nostalgic warmth. Camera: Gentle dolly glide from coffee table tap to sunlit sofa close-up. No spoken dialogue.',
    narrationVo: {
      en: 'Across town, Elena orders an eightieth-birthday memoir for her father Mateo—tapping twenty-nine dollars and speaking his memories into her phone moments later.',
      es: 'Al otro lado de la ciudad, Elena encarga una memoria por los ochenta años de su padre Mateo, pagando veintinueve dólares y dictando sus recuerdos desde el sofá.',
      pt: 'Do outro lado da cidade, Elena encomenda um filme pelos oitenta anos de seu pai Mateo, pagando vinte e nove dólares e narrando suas lembranças pelo celular.',
      hi: 'शहर के दूसरे हिस्से में एलेना अपने पिता मातेओ के अस्सीवें जन्मदिन के लिए मेमॉयर बुक करती हैं और कुछ ही पलों में फ़ोन पर उनकी यादें सुनाती हैं।',
      zh: '在城市的另一端，Elena 为父亲 Mateo 的八十岁寿辰定制回忆录，支付二十九美元后，立即在沙发上用手机娓娓道出父亲的往事。',
      ar: 'في الطرف الآخر من المدينة، تطلب إيلينا فيلم ذكريات لعيد ميلاد والدها ماتيو الثمانين، فتدفع تسعة وعشرين دولاراً وتروي ذكرياته عبر هاتفها فوراً.',
      th: 'อีกฟากของเมือง เอเลน่าสั่งทำวิดีโอฉลองวัยแปดสิบปีให้คุณพ่อมาเตโอ เพียงแตะชำระเงินยี่สิบเก้าดอลลาร์แล้วเล่าความทรงจำผ่านมือถือได้ทันที',
    },
  },

  // ── BEAT 04: APP SCREEN 02 — 2. Auto Intake Email ──────────────────────────
  {
    beatNumber: 4,
    id: 'screen-02-auto-intake-email',
    kind: 'app_screen',
    screenSlug: '02-auto-intake-email',
    fromRoi: { cxFrac: 0.34, cyFrac: 0.48, widthFrac: 0.72 },
    toRoi: { cxFrac: 0.66, cyFrac: 0.54, widthFrac: 0.66 },
    shortTabLabel: {
      en: '04 · 2. Auto Intake',
      es: '04 · 2. Entrevista IA',
      pt: '04 · 2. Entrevista IA',
      hi: '04 · 2. ऑटो इनटेक',
      zh: '04 · 2. 自动访谈邮件',
      ar: '04 · 2. بريد المقابلة',
      th: '04 · 2. อีเมลสัมภาษณ์ AI',
    },
    title: {
      en: 'App 2 · Auto Intake Email → Vision Clarification & 4-Turn AI Interview',
      es: 'App 2 · Correo Automático → Visión y Entrevista Guiada de 4 Turnos',
      pt: 'App 2 · E-mail Automático → Visão e Entrevista Guiada de 4 Etapas',
      hi: 'ऐप 2 · ऑटो इनटेक ईमेल → विज़न पुष्टि और 4-टर्न AI इंटरव्यू',
      zh: '应用 2 · 自动邮件链接 → 愿景确认与四轮 AI 故事访谈',
      ar: 'التطبيق 2 · البريد التلقائي ← توضيح الرؤيةومقابلة ذكية من 4 جولات',
      th: 'แอป 2 · อีเมลอัตโนมัติ → ยืนยันวิสัยทัศน์และสัมภาษณ์ AI 4 รอบ',
    },
    functionalScreenSummary:
      'Pans from the instant branded magic-link email in Elena’s inbox across to the zero-login Guided Vision & 4-turn AI Story Interview, highlighting verified consent and auto-extracted multi-era Mateo (Age 28 & Age 80) cast + Cedar Compass Box prop cards.',
    narrationVo: {
      en: 'An automated magic-link email opens clickwrap consent, Vision Clarification, and a four-turn voice-or-text interview—automatically extracting multi-era characters, locations, and props with zero producer involvement.',
      es: 'Un correo con enlace mágico abre el consentimiento, la aclaración de visión y una entrevista de cuatro turnos por voz o texto, extrayendo personajes por época, locaciones y utilería automáticamente.',
      pt: 'Um e-mail com link mágico abre o termo de consentimento, o alinhamento de visão e uma entrevista de quatro etapas por voz ou texto, extraindo personagens por época, locações e objetos automaticamente.',
      hi: 'स्वचालित मैजिक-लिंक ईमेल सहमति, विज़न पुष्टि और चार-टर्न वॉइस या टेक्स्ट इंटरव्यू खोलता है—और हर दौर के पात्र, स्थान व प्रॉप्स अपने-आप निकाल लेता है।',
      zh: '自动发送的专属邮件链接直接开启授权签署、愿景确认与四轮语音或文字访谈，自动提取跨年代角色、场景与关键道具，全程无需人工介入。',
      ar: 'تفتح رسالة الرابط السحري التلقائية نموذج الموافقة وتوضيح الرؤية ومقابلة من أربع جولات صوتية أو نصية، لتستخرج الشخصيات عبر العقود والمواقع والدعائم تلقائياً.',
      th: 'อีเมลเมจิกคาถาลิงก์จะเปิดหน้าขอความยินยอม การสรุปวิสัยทัศน์ และบทสัมภาษณ์สี่รอบทั้งเสียงและข้อความ พร้อมดึงข้อมูลตัวละครแต่ละช่วงวัย สถานที่ และพร็อพให้อัตโนมัติ',
    },
  },

  // ── BEAT 05: STORY CLIP 03 ─────────────────────────────────────────────────
  {
    beatNumber: 5,
    id: 'story-03-elena-blueprint-wonder',
    kind: 'story_clip',
    clipNumber: 3,
    optionalFlowScreenRef: 'public/landing/video-services/portal-screens/03-storyboard-audio.png',
    shortTabLabel: {
      en: '05 · Instant Preview',
      es: '05 · Vista Previa',
      pt: '05 · Prévia Imediata',
      hi: '05 · तुरंत प्रीव्यू',
      zh: '05 · 惊艳预览蓝图',
      ar: '05 · معاينة فورية',
      th: '05 · ชมตัวอย่างทันที',
    },
    title: {
      en: 'Story: Minutes Later, Elena Sees & Hears Her Father’s Blueprint',
      es: 'Historia: Minutos Después, Elena Ve y Escucha el Blueprint de su Padre',
      pt: 'História: Minutos Depois, Elena Vê e Ouve o Blueprint do Pai',
      hi: 'कहानी: कुछ ही मिनटों बाद एलेना देखती और सुनती हैं पिता का ब्लूप्रिंट',
      zh: '故事：几分钟后 Elena 看到并听到父亲的分镜蓝图',
      ar: 'القصة: بعد دقائق، تشاهد إيلينا وتسمع مخطط فيلم والدها',
      th: 'เรื่องราว: เพียงไม่กี่นาทีต่อมา เอเลน่าได้เห็นและฟัง Blueprint ของคุณพ่อ',
    },
    videoPrompt:
      '0s–2s (Start frame): In Elena Sunlit Living Room, Elena 46 opens a fresh notification chime on her tablet at the oak table. 2s–8s (Action): Warm illustrated storyboard light reflects softly on Elena 46’s face as she listens to the narrated overview of young Mateo 28 in his 1972 cedar boatshop, pressing her hand gently to her heart in wonder. 8s–10s (End frame): Expressive close-up of Elena 46 smiling with misty-eyed excitement. Camera: Smooth push-in from over-the-shoulder tablet glow to emotional reaction close-up. No spoken dialogue.',
    narrationVo: {
      en: 'Three minutes after finishing intake, a second email arrives—and Elena experiences her father’s story visually and audibly while her excitement is at its peak.',
      es: 'Tres minutos después de terminar la entrevista llega un segundo correo, y Elena vive la historia de su padre en imagen y voz cuando su emoción está al máximo.',
      pt: 'Três minutos após concluir a entrevista, chega um segundo e-mail, e Elena vivencia a história do pai em imagem e áudio no auge da emoção.',
      hi: 'इनटेक पूरा करने के तीन मिनट बाद दूसरा ईमेल आता है—और उत्साह के चरम पर एलेना अपने पिता की कहानी तस्वीरों और आवाज़ में महसूस करती हैं।',
      zh: '访谈结束后仅三分钟，第二封邮件悄然送达——趁着热情最高涨的时刻，Elena 直观地看到并听到了父亲的故事蓝图。',
      ar: 'بعد ثلاث دقائق من إنهاء المقابلة تصل رسالة ثانية، لتعيش إيلينا قصة والدها بالصورة والصوت في قمة حماسها.',
      th: 'เพียงสามนาทีหลังจบการสัมภาษณ์ อีเมลฉบับที่สองก็มาถึง ให้เอเลน่าได้สัมผัสเรื่องราวของคุณพ่อทั้งภาพและเสียงในจังหวะที่ความตื่นเต้นพุ่งสูงสุด',
    },
  },

  // ── BEAT 06: APP SCREEN 03 — 3. Storyboard + Audio ─────────────────────────
  {
    beatNumber: 6,
    id: 'screen-03-storyboard-audio',
    kind: 'app_screen',
    screenSlug: '03-storyboard-audio',
    fromRoi: { cxFrac: 0.50, cyFrac: 0.36, widthFrac: 0.86 },
    toRoi: { cxFrac: 0.54, cyFrac: 0.62, widthFrac: 0.72 },
    shortTabLabel: {
      en: '06 · 3. Storyboard+VO',
      es: '06 · 3. Storyboard+Voz',
      pt: '06 · 3. Storyboard+Voz',
      hi: '06 · 3. स्टोरीबोर्ड+वॉइस',
      zh: '06 · 3. 分镜与语音导览',
      ar: '06 · 3. اللوحات والصوت',
      th: '06 · 3. สตอรี่บอร์ด+เสียง',
    },
    title: {
      en: 'App 3 · Shared Blueprint: 6 Illustrated Beat Storyboards & Narrated Audio',
      es: 'App 3 · Blueprint Compartido: 6 Storyboards Ilustrados y Narración en Audio',
      pt: 'App 3 · Blueprint Compartilhado: 6 Storyboards Ilustrados e Áudio Narrado',
      hi: 'ऐप 3 · शेयर्ड ब्लूप्रिंट: 6 सचित्र बीट स्टोरीबोर्ड और ऑडियो नैरेशन',
      zh: '应用 3 · 共享蓝图：六幅分镜插图与全程语音导览',
      ar: 'التطبيق 3 · المخطط المشترك: 6 لوحات مشاهد مصوّرة وتعليق صوتي',
      th: 'แอป 3 · หน้าแชร์ Blueprint: สตอรี่บอร์ด 6 บีตพร้อมเสียงบรรยาย',
    },
    functionalScreenSummary:
      'Showcases `/blueprint/share` with the active Charon Narrated Overview player (0:48), 6 illustrated 16:9 beat keyframes (1958 Oaxaca, 1972 Boatshop, 2026 Harbor), and initial Audience Resonance 88/100.',
    narrationVo: {
      en: 'The automated Blueprint Share link presents six illustrated beat storyboards, studio voiceover narration, and an initial Audience Resonance score—all synthesized for roughly one dollar twenty-five in compute.',
      es: 'El enlace compartido muestra seis storyboards ilustrados, narración de voz de estudio y el puntaje inicial de Audience Resonance, generados por apenas un dólar veinticinco de cómputo.',
      pt: 'O link compartilhado exibe seis storyboards ilustrados, narração de voz de estúdio e a nota inicial de Audience Resonance, gerados por cerca de um dólar e vinte e cinco em computação.',
      hi: 'शेयर किया गया Blueprint लिंक छह सचित्र स्टोरीबोर्ड, स्टूडियो वॉइसओवर और प्रारंभिक Audience Resonance स्कोर दिखाता है—जिसकी कुल कंप्यूट लागत लगभग सवा डॉलर है।',
      zh: '自动生成的蓝图分享页呈现六幅电影级分镜插图、录音棚级语音导览及初始受众共鸣评分，全套算力成本仅需约一点二五美元。',
      ar: 'يعرض رابط المخطط المشترك ست لوحات مشاهد مصوّرة وتعليقاً صوتياً احترافياً وتقييم صدى الجمهور الأولي، بتكلفة حوسبة تقارب دولاراً وربعاً فقط.',
      th: 'ลิงก์แชร์ Blueprint แสดงภาพสตอรี่บอร์ดหกบีต เสียงบรรยายระดับสตูดิโอ และคะแนนความโดนใจผู้ชมรอบแรก โดยใช้ต้นทุนคอมพิวต์เพียงราวหนึ่งดอลลาร์ยี่สิบห้าเซ็นต์',
    },
  },

  // ── BEAT 07: APP SCREEN 04 — 4. AI Revisions & AR ──────────────────────────
  {
    beatNumber: 7,
    id: 'screen-04-ai-revisions-ar',
    kind: 'app_screen',
    screenSlug: '04-ai-revisions-ar',
    fromRoi: { cxFrac: 0.34, cyFrac: 0.54, widthFrac: 0.68 },
    toRoi: { cxFrac: 0.68, cyFrac: 0.56, widthFrac: 0.66 },
    shortTabLabel: {
      en: '07 · 4. AI Revisions',
      es: '07 · 4. Revisiones IA',
      pt: '07 · 4. Revisões IA',
      hi: '07 · 4. AI संशोधन',
      zh: '07 · 4. AI 改稿与共鸣',
      ar: '07 · 4. مراجعات ذكية',
      th: '07 · 4. ปรับแก้ด้วย AI',
    },
    title: {
      en: 'App 4 · 4 AI-Filtered Blueprint Revisions + 3 Audience Resonance Passes',
      es: 'App 4 · 4 Revisiones Filtradas por IA + 3 Pases de Audience Resonance',
      pt: 'App 4 · 4 Revisões Filtradas por IA + 3 Passes de Audience Resonance',
      hi: 'ऐप 4 · 4 AI-फ़िल्टर्ड ब्लूप्रिंट संशोधन और 3 ऑडियंस रेज़ोनेंस पास',
      zh: '应用 4 · 四次 AI 提炼改稿 + 三次受众共鸣评分邮件',
      ar: 'التطبيق 4 · 4 مراجعات بالذكاء الاصطناعي + 3 جولات صدى الجمهور',
      th: 'แอป 4 · ปรับแก้ผ่าน AI 4 รอบ + ประเมินความโดนใจผู้ชม 3 รอบ',
    },
    functionalScreenSummary:
      'Pans from Elena’s raw feedback note and the AI Feedback Clarifier confirmation card (routing into Blueprint Director) across to the updated 95/100 Audience Resonance score and green Approve Blueprint button.',
    narrationVo: {
      en: 'Elena gets up to four self-serve revisions and three Audience Resonance passes. AI filters and confirms her notes, Blueprint Director updates the storyboards, and fresh AR links email automatically until she clicks Approve.',
      es: 'Elena dispone de cuatro revisiones de autoservicio y tres pases de Audience Resonance. La IA confirma sus notas, Blueprint Director actualiza los storyboards y envía nuevos enlaces hasta que ella aprueba.',
      pt: 'Elena conta com quatro revisões de autoatendimento e três passes de Audience Resonance. A IA confirma suas notas, o Blueprint Director atualiza os storyboards e envia novos links até ela aprovar.',
      hi: 'एलेना को चार स्व-सेवा संशोधन और तीन Audience Resonance पास मिलते हैं। AI उनके सुझाव पुष्ट करता है, Blueprint Director स्टोरीबोर्ड अपडेट करता है, और अप्रूव करने तक नए लिंक ईमेल होते हैं।',
      zh: 'Elena 享有最多四次自助改稿与三次受众共鸣评估。AI 先提炼确认修改意图，再由 Blueprint Director 更新分镜并自动发送最新评分邮件，直至客户点击批准。',
      ar: 'تحصل إيلينا على أربع مراجعات ذاتية وثلاث جولات صدى الجمهور؛ يؤكد الذكاء الاصطناعي ملاحظاتها ويحدّث Blueprint Director المشاهد ويرسل الروابط تلقائياً حتى تضغط اعتماد.',
      th: 'เอเลน่าปรับแก้เองได้สี่รอบและวิเคราะห์ความโดนใจผู้ชมได้สามรอบ AI จะช่วยยืนยันคำขอก่อนส่งให้ Blueprint Director อัปเดตสตอรี่บอร์ดและส่งอีเมลใหม่อัตโนมัติจนเธอกดอนุมัติ',
    },
  },

  // ── BEAT 08: STORY CLIP 04 ─────────────────────────────────────────────────
  {
    beatNumber: 8,
    id: 'story-04-maya-calm-gate',
    kind: 'story_clip',
    clipNumber: 4,
    optionalFlowScreenRef: 'public/landing/video-services/portal-screens/05-pm-quote-stripe.png',
    shortTabLabel: {
      en: '08 · Maya’s 3-Min Gate',
      es: '08 · Revisión de Maya',
      pt: '08 · Revisão da Maya',
      hi: '08 · माया की 3-मिनट जाँच',
      zh: '08 · Maya 三分钟介入',
      ar: '08 · مراجعة مايا',
      th: '08 · มายาตรวจงาน 3 นาที',
    },
    title: {
      en: 'Story: Maya Steps In Only After Blueprint Approval',
      es: 'Historia: Maya Interviene Solo Cuando el Blueprint Está Aprobado',
      pt: 'História: Maya Entra em Cena Apenas Após a Aprovação do Blueprint',
      hi: 'कहानी: ब्लूप्रिंट लॉक होने पर ही माया सिर्फ़ 3 मिनट जुड़ती हैं',
      zh: '故事：蓝图锁定后 Maya 才从容介入三分钟',
      ar: 'القصة: مايا تتدخل لثلاث دقائق فقط بعد اعتماد المخطط',
      th: 'เรื่องราว: มายาเข้ามาดูแลเพียง 3 นาทีหลังลูกค้าอนุมัติ Blueprint',
    },
    videoPrompt:
      '0s–2s (Start frame): Inside Maya Home Studio, Maya 34 notices a warm golden approval chime on her curved display while holding her coffee mug. 2s–8s (Action): Calm and focused, Maya 34 scans the approved project overview in seconds, nods with assurance, and clicks her trackpad once to dispatch the production quote. 8s–10s (End frame): Relaxed medium portrait of Maya 34 smiling—zero stress, zero wasted hours. Camera: Smooth wrap-around desk gimbal shot from monitor to Maya 34. No spoken dialogue.',
    narrationVo: {
      en: 'Only once Elena approves the Blueprint does Maya step in for three calm minutes—zero hours lost to unpaid discovery or back-and-forth emails.',
      es: 'Solo cuando Elena aprueba el Blueprint interviene Maya durante tres minutos tranquilos, sin perder horas en llamadas no pagadas ni correos interminables.',
      pt: 'Somente depois que Elena aprova o Blueprint é que Maya dedica três minutos tranquilos, sem perder horas em reuniões gratuitas ou trocas de e-mail.',
      hi: 'जब एलेना Blueprint अप्रूव कर देती हैं, तभी माया तीन शांत मिनटों के लिए जुड़ती हैं—बिना किसी मुफ़्त सेल्स कॉल या ईमेल की भागदौड़ के।',
      zh: '只有当 Elena 正式批准蓝图后，Maya 才从容介入三分钟——零免费陪聊损耗，也无需反复拉锯邮件。',
      ar: 'فقط بعدما تعتمد إيلينا المخطط تتدخل مايا لثلاث دقائق هادئة، دون إضاعة ساعات في مكالمات مجانية أو رسائل متكررة.',
      th: 'เมื่อเอเลน่ากดอนุมัติ Blueprint แล้วเท่านั้น มายาจึงเข้ามาใช้เวลาเพียงสามนาทีอย่างสบายใจ ไม่เสียเวลาคุยงานฟรีหรือคอยตอบอีเมลไปมา',
    },
  },

  // ── BEAT 09: APP SCREEN 05 — 5. PM Quote & Stripe ──────────────────────────
  {
    beatNumber: 9,
    id: 'screen-05-pm-quote-stripe',
    kind: 'app_screen',
    screenSlug: '05-pm-quote-stripe',
    fromRoi: { cxFrac: 0.36, cyFrac: 0.54, widthFrac: 0.68 },
    toRoi: { cxFrac: 0.68, cyFrac: 0.58, widthFrac: 0.65 },
    shortTabLabel: {
      en: '09 · 5. Quote & Stripe',
      es: '09 · 5. Cotización Stripe',
      pt: '09 · 5. Cotação Stripe',
      hi: '09 · 5. कोट व Stripe',
      zh: '09 · 5. 核价与收款链接',
      ar: '09 · 5. التسعير والدفع',
      th: '09 · 5. ใบเสนอราคา Stripe',
    },
    title: {
      en: 'App 5 · Producer Console: Cost Estimator & Stripe / Whop Checkout Link',
      es: 'App 5 · Consola PM: Estimador de Costos y Enlace de Stripe o Whop',
      pt: 'App 5 · Console PM: Estimador de Custos e Link Stripe ou Whop',
      hi: 'ऐप 5 · प्रोड्यूसर कंसोल: लागत अनुमान और Stripe / Whop भुगतान लिंक',
      zh: '应用 5 · 制片台：自动算力测算与一键发送 Stripe / Whop 链接',
      ar: 'التطبيق 5 · لوحة المنتج: تقدير التكلفة ورابط الدفع عبر Stripe أو Whop',
      th: 'แอป 5 · คอนโซลโปรดิวเซอร์: คำนวณต้นทุนและส่งลิงก์ Stripe / Whop',
    },
    functionalScreenSummary:
      'Pans from SceneFlow’s automatic $34.20 compute estimator across to the packaged deliverables and one-click $620 Stripe/Whop checkout sender ($649 package minus $29 Blueprint credit = 82% net margin).',
    narrationVo: {
      en: 'In the Producer Console, Maya verifies SceneFlow’s thirty-four-dollar compute estimate, locks packaged deliverables, and sends a six-hundred-twenty-dollar Stripe or Whop link with the twenty-nine-dollar pass credited.',
      es: 'En la Consola de Productor, Maya verifica los treinta y cuatro dólares de cómputo estimado, confirma entregables y envía un enlace de Stripe o Whop por seiscientos veinte dólares con el crédito aplicado.',
      pt: 'No Console do Produtor, Maya confere a estimativa de trinta e quatro dólares em computação, fecha os entregáveis e envia um link Stripe ou Whop de seiscentos e vinte dólares já com o crédito abatido.',
      hi: 'Producer Console में माया चौंतीस डॉलर का कंप्यूट अनुमान देखती हैं, डिलीवरेबल्स चुनती हैं, और उन्नतीस डॉलर घटाकर छह सौ बीस डॉलर का Stripe या Whop लिंक भेजती हैं।',
      zh: '在制片控制台中，Maya 核对系统测算的三十四美元算力成本，勾选交付组合，一键发送抵扣二十九美元定金后的六百二十美元 Stripe 或 Whop 收款链接。',
      ar: 'في لوحة المنتج، تتحقق مايا من تقدير الحوسبة البالغ أربعة وثلاثين دولاراً، وتثبّت المخرجات وترسل رابط Stripe أو Whop بمبلغ ستمئة وعشرين دولاراً بعد خصم الرصيد.',
      th: 'ในหน้าคอนโซล มายาตรวจต้นทุนคอมพิวต์สามสิบสี่ดอลลาร์ เลือกชุดส่งมอบงาน แล้วส่งลิงก์ชำระเงิน Stripe หรือ Whop ยอดหกร้อยยี่สิบดอลลาร์หลังหักมัดจำให้ทันที',
    },
  },

  // ── BEAT 10: STORY CLIP 05 ─────────────────────────────────────────────────
  {
    beatNumber: 10,
    id: 'story-05-elena-continuity-photos',
    kind: 'story_clip',
    clipNumber: 5,
    optionalFlowScreenRef: 'public/landing/video-services/portal-screens/06-script-continuity.png',
    shortTabLabel: {
      en: '10 · Photo Uploads',
      es: '10 · Fotos Familiares',
      pt: '10 · Envio de Fotos',
      hi: '10 · फ़ोटो अपलोड',
      zh: '10 · 上传参考照片',
      ar: '10 · رفع الصور',
      th: '10 · ถ่ายรูปอ้างอิง',
    },
    title: {
      en: 'Story: Elena Photographs Family Portraits & the Cedar Compass Box',
      es: 'Historia: Elena Fotografía Retratos Familiares y la Brújula de Cedro',
      pt: 'História: Elena Fotografa Retratos da Família e a Bússola de Cedro',
      hi: 'कहानी: एलेना ने फ़ोन से लीं पिता और सीडर कंपास बॉक्स की तस्वीरें',
      zh: '故事：Elena 用手机拍摄父亲旧照与雪松罗盘盒',
      ar: 'القصة: إيلينا تلتقط صور العائلة وصندوق البوصلة بهاتفها',
      th: 'เรื่องราว: เอเลน่าใช้มือถือถ่ายภาพคุณพ่อและกล่องเข็มทิศไม้ซีดาร์',
    },
    videoPrompt:
      '0s–2s (Start frame): Inside Elena Sunlit Living Room, Elena 46 holds her smartphone above the oak coffee table framing Cedar Compass Box and the 1972 snapshot of Mateo 28. 2s–8s (Action): She snaps two crisp reference photos on her phone and taps confirm with an appreciative smile as golden afternoon sunlight warms the wood grain. 8s–10s (End frame): Tactile close-up of Cedar Compass Box resting beside the vintage harbor snapshot. Camera: Dynamic overhead-to-45-degree tilt following Elena 46’s hands. No spoken dialogue.',
    narrationVo: {
      en: 'Once paid, collaborative production begins—and Elena snaps reference photos of her father and his scorched cedar compass box right from her smartphone.',
      es: 'Confirmado el pago comienza la producción colaborativa, y Elena fotografía con su celular los retratos de su padre y su caja de brújula de cedro.',
      pt: 'Confirmado o pagamento, começa a produção colaborativa, e Elena fotografa com o celular os retratos do pai e sua caixa de bússola em cedro.',
      hi: 'भुगतान होते ही साझा प्रोडक्शन शुरू हो जाता है—और एलेना अपने फ़ोन से ही पिता और उनके सीडर कंपास बॉक्स की रेफ़रेंस तस्वीरें अपलोड करती हैं।',
      zh: '付款确认后，协同制片即刻启动——Elena 直接用手机拍下父亲的老照片与焦木雪松罗盘盒上传确认。',
      ar: 'بمجرد السداد يبدأ الإنتاج التشاركي، وتلتقط إيلينا بهاتفها صور والدها وصندوق البوصلة الخشبي لاعتمادها.',
      th: 'ทันทีที่ชำระเงิน กระบวนการผลิตร่วมกันก็เริ่มขึ้น เอเลน่าใช้มือถือถ่ายภาพคุณพ่อและกล่องเข็มทิศไม้ซีดาร์ส่งเข้าระบบได้ง่ายๆ',
    },
  },

  // ── BEAT 11: APP SCREEN 06 — 6. Script + Continuity ────────────────────────
  {
    beatNumber: 11,
    id: 'screen-06-script-continuity',
    kind: 'app_screen',
    screenSlug: '06-script-continuity',
    fromRoi: { cxFrac: 0.33, cyFrac: 0.54, widthFrac: 0.66 },
    toRoi: { cxFrac: 0.68, cyFrac: 0.54, widthFrac: 0.66 },
    shortTabLabel: {
      en: '11 · 6. Script+Library',
      es: '11 · 6. Guion+Fotos',
      pt: '11 · 6. Roteiro+Fotos',
      hi: '11 · 6. स्क्रिप्ट+लाइब्रेरी',
      zh: '11 · 6. 剧本与资产库',
      ar: '11 · 6. السيناريو والمكتبة',
      th: '11 · 6. บทและคลังภาพ',
    },
    title: {
      en: 'App 6 · 30-Min AR-Optimized Script + Shared Continuity Library Sign-Off',
      es: 'App 6 · Guion Optimizado en 30 Min + Aprobación de Biblioteca de Continuidad',
      pt: 'App 6 · Roteiro Otimizado em 30 Min + Aprovação da Biblioteca de Continuidade',
      hi: 'ऐप 6 · 30-मिनट AR स्क्रिप्ट + शेयर्ड कॉन्टिन्यूटी लाइब्रेरी मंज़ूरी',
      zh: '应用 6 · 30 分钟优化剧本 + 共享角色场景道具资产库确认',
      ar: 'التطبيق 6 · سيناريو محسّن في 30 دقيقة + اعتماد مكتبة الاستمرارية',
      th: 'แอป 6 · บทพร้อมถ่ายใน 30 นาที + ลิงก์อนุมัติคลังภาพอ้างอิง',
    },
    functionalScreenSummary:
      'Pans from the 30-minute AR-optimized 24-scene script (Score 96/100, multi-age beat exclusivity verified) across to Elena’s signed-off Continuity Library anchors (Mateo 80, Mateo 28, 1972 Boatshop, Cedar Compass Box).',
    narrationVo: {
      en: 'SceneFlow generates the Audience-Resonance-optimized script in thirty minutes while the shared Continuity Library link locks client-approved character, location, and prop anchors with automatic EXIF privacy stripping.',
      es: 'SceneFlow genera el guion optimizado en treinta minutos mientras el enlace de Biblioteca de Continuidad bloquea los rostros, locaciones y utilería aprobados por el cliente con limpieza automática de metadatos.',
      pt: 'O SceneFlow gera o roteiro otimizado em trinta minutos enquanto o link da Biblioteca de Continuidade trava personagens, locações e objetos aprovados pelo cliente com proteção automática de privacidade.',
      hi: 'SceneFlow तीस मिनट में Audience-Resonance-अनुकूलित स्क्रिप्ट तैयार करता है, जबकि Continuity Library लिंक ऑटोमैटिक EXIF प्राइवेसी सुरक्षा के साथ पात्र, स्थान और प्रॉप लॉक करता है।',
      zh: 'SceneFlow 在三十分钟内生成受众共鸣优化剧本，同时共享资产库链接自动抹除照片位置隐私，锁定客户确认的角色、场景与道具形象。',
      ar: 'يولّد SceneFlow السيناريو المحسّن خلال ثلاثين دقيقة بينما يثبّت رابط مكتبة الاستمرارية صور الشخصيات والمواقع والدعائم المعتمدة مع إزالة بيانات الموقع تلقائياً.',
      th: 'SceneFlow สร้างบทที่ปรับจูนแล้วเสร็จในสามสิบนาที พร้อมลิงก์คลังภาพ Continuity ที่ช่วยลบข้อมูลพิกัดส่วนตัวและล็อกหน้าตาตัวละคร สถานที่ และพร็อพตามที่ลูกค้าอนุมัติ',
    },
  },

  // ── BEAT 12: STORY CLIP 06 ─────────────────────────────────────────────────
  {
    beatNumber: 12,
    id: 'story-06-maya-renders-4k',
    kind: 'story_clip',
    clipNumber: 6,
    optionalFlowScreenRef: 'public/landing/video-services/portal-screens/07-screening-room.png',
    shortTabLabel: {
      en: '12 · Cinema Render',
      es: '12 · Render de Cine',
      pt: '12 · Render Cinema',
      hi: '12 · सिनेमा रेंडर',
      zh: '12 · 预演转四K渲染',
      ar: '12 · تصيير سينمائي',
      th: '12 · เรนเดอร์ภาพยนตร์',
    },
    title: {
      en: 'Story: Maya Previews Pre-Vis & Renders 1972 Boatshop Cinema Footage',
      es: 'Historia: Maya Valida el Pre-Vis y Renderiza Escenas 4K del Astillero 1972',
      pt: 'História: Maya Valida o Pre-Vis e Renderiza Cenas 4K do Estaleiro de 1972',
      hi: 'कहानी: माया ने Pre-Vis जाँचा और 1972 बोटशॉप के 4K दृश्य तैयार किए',
      zh: '故事：Maya 审阅动态预演并生成 1972 船坊四K画面',
      ar: 'القصة: مايا تراجع عرض Pre-Vis وتصيّر مشاهد ورشة 1972 بدقة 4K',
      th: 'เรื่องราว: มายาตรวจ Pre-Vis และเรนเดอร์ฉากอู่ต่อเรือปี 1972 คมชัด 4K',
    },
    videoPrompt:
      '0s–2s (Start frame): Inside Maya Home Studio, wide curved monitor shows a warm storyboard animatic frame as Maya 34 watches attentively. 2s–8s (Action): As Maya 34 glides the playhead forward, the animatic dissolves into vibrant photorealistic 4K cinema footage of Mateo 28 planing sunlit cedar planks in a 1972 harbor boatshop while golden wood shavings curl in slow motion. 8s–10s (End frame): Maya 34 smiles proudly and clicks once to share the Screening Room link. Camera: Immersive slow push-in toward Maya 34’s glowing cinema monitor. No spoken dialogue.',
    narrationVo: {
      en: 'In SceneFlow Studio, Maya validates pacing on a low-cost Pre-Vis animatic first, then renders breathtaking four-K scenes with locked multi-decade likeness.',
      es: 'En SceneFlow Studio, Maya valida el ritmo primero con un Animatic Pre-Vis de bajo costo y luego renderiza escenas cuatro K con identidad visual bloqueada.',
      pt: 'No SceneFlow Studio, Maya valida o ritmo primeiro em um Animatic Pre-Vis de baixo custo e depois renderiza cenas quatro K com semelhança preservada entre décadas.',
      hi: 'SceneFlow Studio में माया पहले कम लागत वाले Pre-Vis एनिमैटिक पर गति परखती हैं, फिर लॉक किए गए चेहरे की समानता के साथ शानदार चार-के दृश्य रेंडर करती हैं।',
      zh: '在 SceneFlow Studio 中，Maya 先用低成本动态预演确认节奏，随后一键渲染跨年代容貌高度一致的惊艳四K电影画面。',
      ar: 'في استوديو SceneFlow، تتحقق مايا من الإيقاع عبر عرض Pre-Vis منخفض التكلفة أولاً، ثم تصيّر مشاهد أربعة كي مذهلة بملامح متطابقة عبر العقود.',
      th: 'ใน SceneFlow Studio มายาตรวจจังหวะการเล่าเรื่องด้วย Pre-Vis ต้นทุนต่ำก่อน แล้วจึงเรนเดอร์ฉากสี่เคสุดสมจริงที่คงเอกลักษณ์ใบหน้าตรงกันทุกยุคสมัย',
    },
  },

  // ── BEAT 13: APP SCREEN 07 — 7. Screening Room ─────────────────────────────
  {
    beatNumber: 13,
    id: 'screen-07-screening-room',
    kind: 'app_screen',
    screenSlug: '07-screening-room',
    fromRoi: { cxFrac: 0.44, cyFrac: 0.48, widthFrac: 0.84 },
    toRoi: { cxFrac: 0.66, cyFrac: 0.56, widthFrac: 0.68 },
    shortTabLabel: {
      en: '13 · 7. Screening Room',
      es: '13 · 7. Sala Proyección',
      pt: '13 · 7. Sala Exibição',
      hi: '13 · 7. स्क्रीनिंग रूम',
      zh: '13 · 7. 白标审片室',
      ar: '13 · 7. غرفة العرض',
      th: '13 · 7. ห้องฉายตรวจงาน',
    },
    title: {
      en: 'App 7 · Shared Screening Room: Pre-Vis, Clips, Chapters, Master & Trailer',
      es: 'App 7 · Sala de Proyección: Pre-Vis, Clips, Capítulos, Máster y Tráiler',
      pt: 'App 7 · Sala de Exibição: Pre-Vis, Clipes, Capítulos, Master e Trailer',
      hi: 'ऐप 7 · शेयर्ड स्क्रीनिंग रूम: Pre-Vis, क्लिप्स, चैप्टर्स, मास्टर व ट्रेलर',
      zh: '应用 7 · 白标审片室：预演、片段、章节、母带与预告片分段验收',
      ar: 'التطبيق 7 · غرفة العرض المشتركة: المعاينة والمقاطع والفصول ونسخة 4K',
      th: 'แอป 7 · ห้องฉาย White-Label: ตรวจรับตั้งแต่ Pre-Vis ถึง 4K และเทรลเลอร์',
    },
    functionalScreenSummary:
      'Illustrates `/screening-room` with staged deliverable tabs (Pre-Vis Animatic, Key Clips, Scenes, Chapters, 12-Min 4K Master, 60s Social Trailer), timecoded client pins (@ 04:18), bounded Round 1 of 2 revisions, and stage approval.',
    narrationVo: {
      en: 'One white-label Screening Room link manages feedback and sign-off across any packaged combination of Pre-Vis Animatic, Clips, Scenes, Chapters, the four-K Master, and sixty-second trailer.',
      es: 'Un solo enlace de Sala de Proyección marca blanca gestiona comentarios y aprobaciones para cualquier combinación de Animatic Pre-Vis, Clips, Escenas, Capítulos, Máster cuatro K y tráiler.',
      pt: 'Um único link white-label da Sala de Exibição gerencia comentários e aprovações em qualquer combinação de Animatic Pre-Vis, Clipes, Cenas, Capítulos, Master quatro K e trailer.',
      hi: 'एक व्हाइट-लेबल Screening Room लिंक Pre-Vis एनिमैटिक, क्लिप्स, सीन्स, चैप्टर्स, चार-के मास्टर और साठ-सेकंड ट्रेलर के हर पैकेज पर समयबद्ध फ़ीडबैक और मंज़ूरी संभालता है।',
      zh: '一个白标审片室链接即可统一管理动态预演、片段、场次、章节、四K母带及六十秒预告片的逐帧批注与分阶段签收。',
      ar: 'يدير رابط غرفة عرض واحد بعلامتك التجارية الملاحظات والاعتمادات لأي باقة تجمع عرض Pre-Vis والمقاطع والمشاهد والفصول والنسخة الرئيسية 4K والإعلان القصير.',
      th: 'ลิงก์ห้องฉาย White-Label เพียงลิงก์เดียวรองรับการคอมเมนต์รายวินาทีและกดอนุมัติครบทุกรูปแบบ ทั้ง Pre-Vis คลิป ฉาก บท ไฟล์สี่เคมาสเตอร์ และเทรลเลอร์หกสิบวินาที',
    },
  },

  // ── BEAT 14: STORY CLIP 07 ─────────────────────────────────────────────────
  {
    beatNumber: 14,
    id: 'story-07-mateo-family-premiere',
    kind: 'story_clip',
    clipNumber: 7,
    shortTabLabel: {
      en: '14 · Family Premiere',
      es: '14 · Estreno Familiar',
      pt: '14 · Estreia em Família',
      hi: '14 · परिवार प्रीमियर',
      zh: '14 · 寿辰感动首映',
      ar: '14 · العرض العائلي',
      th: '14 · รอบฉายวันเกิดคุณพ่อ',
    },
    title: {
      en: 'Story: Mateo’s Emotional 80th-Birthday 4K Premiere',
      es: 'Historia: El Emotivo Estreno 4K en los 80 Años de Mateo',
      pt: 'História: A Emocionante Estreia 4K nos 80 Anos de Mateo',
      hi: 'कहानी: मातेओ के 80वें जन्मदिन पर भावुक 4K परिवार प्रीमियर',
      zh: '故事：Mateo 八十寿辰全家泪目观看四K首映',
      ar: 'القصة: عرض عائلي مؤثر بدقة 4K في عيد ميلاد ماتيو الثمانين',
      th: 'เรื่องราว: รอบปฐมทัศน์ 4K สุดซึ้งในคืนวันเกิดปีที่ 80 ของคุณพ่อมาเตโอ',
    },
    videoPrompt:
      '0s–2s (Start frame): Warm evening lamp glow inside Elena Sunlit Living Room; Mateo 80 sits beside Elena 46 on the linen sofa holding Cedar Compass Box open while golden harbor reflections from the widescreen television illuminate their faces. 2s–8s (Action): Watching his young 1972 boatshop story come alive onscreen, Mateo 80’s eyes glisten with joyful tears; he squeezes Elena 46’s hand and pulls her into a deep, grateful embrace. 8s–10s (End frame): Tender medium two-shot of father and daughter smiling together in warm 2700K light. Camera: Slow emotional dolly arc catching warm television light and tears. No spoken dialogue.',
    narrationVo: {
      en: 'On birthday night, Mateo watches his 1972 boatyard come alive in four-K—turning a seamless digital experience into a priceless family heirloom and instant referrals.',
      es: 'En la noche de su cumpleaños, Mateo ve cobrar vida en cuatro K a su astillero de mil novecientos setenta y dos, convirtiendo una experiencia digital impecable en un tesoro familiar.',
      pt: 'Na noite do aniversário, Mateo vê seu estaleiro de mil novecentos e setenta e dois ganhar vida em quatro K, transformando uma jornada digital impecável em uma relíquia de família.',
      hi: 'जन्मदिन की शाम मातेओ अपनी १९७२ की बोटशॉप को चार-के में जीवंत होते देखते हैं—जो एक सहज डिजिटल अनुभव को अनमोल पारिवारिक धरोहर बना देता है।',
      zh: '寿辰当晚，Mateo 看着自己一九七二年的船坊在四K银幕上重现生机——流畅的数字门户体验，化作了世代珍藏的传家之作与口碑推荐。',
      ar: 'في ليلة عيد الميلاد، يشاهد ماتيو ورشته عام اثنين وسبعين تنبض بالحياة بدقة أربعة كي، لتتحول التجربة الرقمية السلسة إلى إرث عائلي لا يُقدّر بثمن.',
      th: 'ในคืนวันเกิด คุณพ่อมาเตโอได้เห็นอู่ต่อเรือปี 1972 มีชีวิตขึ้นมาอีกครั้งในความคมชัดสี่เค เปลี่ยนพอร์ทัลดิจิทัลที่ใช้งานง่ายให้เป็นมรดกล้ำค่าของครอบครัว',
    },
  },

  // ── BEAT 15: APP SCREEN 08 — 8. Client Sign-Off & ROI ──────────────────────
  {
    beatNumber: 15,
    id: 'screen-08-client-signoff-roi',
    kind: 'app_screen',
    screenSlug: '08-client-signoff-roi',
    fromRoi: { cxFrac: 0.34, cyFrac: 0.54, widthFrac: 0.68 },
    toRoi: { cxFrac: 0.68, cyFrac: 0.56, widthFrac: 0.66 },
    shortTabLabel: {
      en: '15 · 8. Sign-Off & ROI',
      es: '15 · 8. Entrega y ROI',
      pt: '15 · 8. Entrega e ROI',
      hi: '15 · 8. डिलीवरी व ROI',
      zh: '15 · 8. 交付与净利看板',
      ar: '15 · 8. التسليم والعائد',
      th: '15 · 8. ส่งมอบงาน & กำไร',
    },
    title: {
      en: 'App 8 · Final 4K Unlock & Studio ROI (+$530 Net / Film · 82% Margin)',
      es: 'App 8 · Descarga 4K y Rentabilidad (+MX$10,010 Neto / Film · 82% Margen)',
      pt: 'App 8 · Download 4K e Retorno (+R$3,113 Líquido / Filme · 82% Margem)',
      hi: 'ऐप 8 · 4K डाउनलोड अनलॉक और स्टूडियो ROI (+₹49,529 शुद्ध लाभ · 82% मार्जिन)',
      zh: '应用 8 · 四K母带解锁与工作室收益看板（单部净赚 +¥3,534 · 82% 毛利）',
      ar: 'التطبيق 8 · فتح تحميل 4K وعائد الاستوديو (+1,989 ر.س صافي ربح · 82% هامش)',
      th: 'แอป 8 · ปลดล็อกไฟล์ 4K และสรุปกำไรสตูดิโอ (+฿18,011 สุทธิ/เรื่อง · กำไร 82%)',
    },
    functionalScreenSummary:
      'Pans from Elena’s unlocked 4K UHD Master & 60s Trailer download portal across to Maya’s Studio ROI Ledger ($29 Pass @ 83% margin + $649 package -> +$530 net profit per film @ 82% margin -> $4,240–$7,950/mo run-rate).',
    narrationVo: {
      en: 'Final sign-off unlocks four-K downloads automatically—netting Maya five hundred thirty dollars profit on a six-hundred-forty-nine-dollar package, with just seventy-five active minutes invested.',
      es: 'La aprobación final desbloquea las descargas cuatro K automáticamente, dejando a Maya quinientos treinta dólares de ganancia neta en un paquete de seiscientos cuarenta y nueve dólares.',
      pt: 'A aprovação final libera os downloads em quatro K automaticamente, rendendo a Maya quinhentos e trinta dólares de lucro líquido em um pacote de seiscentos e quarenta e nove dólares.',
      hi: 'अंतिम साइन-ऑफ़ होते ही चार-के डाउनलोड खुल जाते हैं—और छह सौ उनचास डॉलर के ऑर्डर पर माया को मात्र पचहत्तर सक्रिय मिनटों में पाँच सौ तीस डॉलर का शुद्ध लाभ मिलता है।',
      zh: '客户最终签收后自动解锁四K母带下载——在六百四十九美元的订单中，Maya 仅投入七十五分钟有效时间，便净赚五百三十美元利润。',
      ar: 'يفتح الاعتماد النهائي تحميلات أربعة كي تلقائياً، ليحقق لمايا صافي ربح قدره خمسمئة وثلاثون دولاراً من باقة بستمئة وتسعة وأربعين دولاراً خلال خمس وسبعين دقيقة عمل فقط.',
      th: 'เมื่อกดอนุมัติขั้นสุดท้าย ระบบจะปลดล็อกไฟล์สี่เคให้อัตโนมัติ สร้างกำไรสุทธิให้มายาห้าร้อยสามสิบดอลลาร์จากแพ็กเกจหกร้อยสี่สิบเก้าดอลลาร์ โดยใช้เวลาทำงานจริงเพียงเจ็ดสิบห้านาที',
    },
  },

  // ── BEAT 16: STORY CLIP 08 ─────────────────────────────────────────────────
  {
    beatNumber: 16,
    id: 'story-08-maya-golden-scale',
    kind: 'story_clip',
    clipNumber: 8,
    optionalFlowScreenRef: 'public/landing/video-services/portal-screens/08-client-signoff-roi.png',
    shortTabLabel: {
      en: '16 · Scale 8–15/Mo',
      es: '16 · Escala 8–15/Mes',
      pt: '16 · Escala 8–15/Mês',
      hi: '16 · 8–15 फ़िल्में/माह',
      zh: '16 · 月产 8–15 部大片',
      ar: '16 · توسّع 8–15 شهرياً',
      th: '16 · ขยายสู่ 8–15 เรื่อง/เดือน',
    },
    title: {
      en: 'Story: Luxury Client Portal Outside · 90% Automated Scale Inside',
      es: 'Historia: Portal de Lujo por Fuera · 90% Automatizado por Dentro',
      pt: 'História: Portal de Luxo por Fora · 90% Automatizado por Dentro',
      hi: 'कहानी: बाहर लक्ज़री क्लाइंट पोर्टल · भीतर 90% ऑटोमेटेड स्केल',
      zh: '故事：对外高定客户门户 · 对内 90% 自动化规模交付',
      ar: 'القصة: بوابة فاخرة للعميل خارجياً · وأتمتة بنسبة 90% داخلياً',
      th: 'เรื่องราว: พอร์ทัลสุดหรูสำหรับลูกค้า · พร้อมระบบอัตโนมัติ 90% เบื้องหลัง',
    },
    videoPrompt:
      '0s–2s (Start frame): Golden sunset fills Maya Home Studio as Maya 34 glances warmly at her tablet glowing with three emerald project completion badges. 2s–8s (Action): With a serene, accomplished smile, Maya 34 gently closes her aluminum laptop and pauses beside the sunlit window overlooking glowing city trees at dusk. 8s–10s (End frame): Cinematic medium portrait of Maya 34 smiling toward the golden horizon—creative freedom and thriving studio scale. Camera: Graceful pull-back from oak desk to golden-hour window portrait. No spoken dialogue.',
    narrationVo: {
      en: 'Bespoke studio portal on the outside, ninety percent SceneFlow automation on the inside—empowering one operator to scale eight to fifteen high-margin client films every month.',
      es: 'Un portal de estudio de lujo por fuera y noventa por ciento de automatización con SceneFlow por dentro, permitiendo a un solo operador escalar de ocho a quince películas mensuales.',
      pt: 'Um portal de estúdio sob medida por fora e noventa por cento de automação SceneFlow por dentro, permitindo a um único operador escalar de oito a quinze filmes de alta margem por mês.',
      hi: 'बाहर से प्रीमियम स्टूडियो पोर्टल और भीतर नब्बे प्रतिशत SceneFlow ऑटोमेशन—जो एक ऑपरेटर को हर महीने आठ से पंद्रह उच्च-मार्जिन फ़िल्में डिलीवर करने की शक्ति देता है।',
      zh: '对外是媲美大制片厂的专属客户门户，对内是百分之九十的 SceneFlow 智能自动化——赋能单人运营者每月稳健交付八到十五部高毛利商业影片。',
      ar: 'بوابة استوديو فاخرة أمام العميل وأتمتة بنسبة تسعين بالمئة عبر SceneFlow في الداخل، لتمكين مشغّل واحد من إنجاز ثمانية إلى خمسة عشر فيلماً عالي الربحية شهرياً.',
      th: 'ภายนอกคือพอร์ทัลสตูดิโอระดับพรีเมียม ส่วนเบื้องหลังคือระบบอัตโนมัติของ SceneFlow ถึงเก้าสิบเปอร์เซ็นต์ ช่วยให้ผู้ดูแลเพียงคนเดียวขยายธุรกิจส่งมอบภาพยนตร์กำไรสูงได้แปดถึงสิบห้าเรื่องต่อเดือน',
    },
  },
] as const
