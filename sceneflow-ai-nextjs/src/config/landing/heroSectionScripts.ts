/**
 * Copyable video scripts for the three hero sections.
 * They match the on-page subtitles. The shipped MP4s stay until a new cut is produced.
 */

export type HeroVideoBeat = {
  label: string
  narration: string
  picture: string
  settle: string
}

export type HeroVideoScript = {
  id: 'friction' | 'control' | 'agent' | 'cut' | 'academy'
  eyebrow: string
  beats: readonly HeroVideoBeat[]
}

export const HERO_SECTION_SCRIPTS: readonly HeroVideoScript[] = [
  {
    id: 'friction',
    eyebrow: 'The friction we remove',
    beats: [
      {
        label: 'The stack',
        narration:
          'Clip prompts in one tab. Music in another. Narration recorded somewhere else, then dragged back onto a timeline that does not know the scene.',
        picture:
          'A dim desk with three glowing tools side by side: a prompt box, a music waveform, and a narration track, none of them sharing a frame.',
        settle: 'The three windows stay open and disconnected. The chair is empty.',
      },
      {
        label: 'The pipeline',
        narration:
          'SceneFlow is one pipeline. The series, or the 90-minute master, is built in the same studio that writes the clip prompt, lays the music cue, and holds the narration on the beat.',
        picture:
          'One dark studio path: blueprint pages, a reference portrait, a shot frame, a music cue bar, and a narration line, arranged as a single sequence.',
        settle: 'The path ends on one playable scene, not three exports.',
      },
      {
        label: 'The publish',
        narration:
          'When a scene or a chapter is ready, you publish that cut. You do not rebuild the prompt, the score, and the voice from scratch.',
        picture:
          'A finished frame with a thin music bar and a narration line already sitting under the picture.',
        settle: 'The frame holds. The music bar and the narration line remain in place.',
      },
    ],
  },
  {
    id: 'control',
    eyebrow: 'The control you keep',
    beats: [
      {
        label: 'The direction',
        narration:
          'You direct the shot in plain language. Who is in the frame, where they stand, what the moment is.',
        picture:
          'A director’s note beside a storyboard frame. The note is handwriting, not a wall of keywords.',
        settle: 'The note and the frame agree: same people, same pose.',
      },
      {
        label: 'The clip prompt',
        narration:
          'Shot direction writes the still and the clip prompt. You do not retype the shot into a generator.',
        picture:
          'The same frame splitting into a still prompt and a clip prompt, both naming the people and the settled pose.',
        settle: 'Both prompts stay visible under the frame you approved.',
      },
      {
        label: 'Music and narration',
        narration:
          'Music cues and narration sit on the beat. You hear them in the animatic, change the shot if it is wrong, and only then spend on motion.',
        picture:
          'An animatic timeline: picture, a music cue across the scene, and a narration line locked to the same beats.',
        settle: 'The playhead rests before the motion render. The cue and the narration are already there.',
      },
    ],
  },
  {
    id: 'agent',
    eyebrow: 'Production Agent • Autonomous Studio Builder',
    beats: [
      {
        label: 'The 300-shot wall',
        narration:
          'A twenty-seven scene production takes over three hundred manual still and clip prompts. With the Production Agent, you spend under an hour perfecting the script, then launch the build.',
        picture:
          'CHAR_ANA in the dark virtual production suite beside a curved display showing 27 scene cards, selecting Pre-Vis, Clips, Scenes, Master, and Promo in one click.',
        settle: 'A single cyan-to-emerald progress bar ignites across all 27 scenes.',
      },
      {
        label: 'The autonomous build and self-healing',
        narration:
          'The Agent walks every scene on its own — locking references, laying narration and music stems, generating stills, optimizing any failed clip prompt, and switching to Creative Clips when a dramatic shot hits policy filters.',
        picture:
          'Behind Ana, storyboard frames, narration waveforms, and motion clips populate in sequence while an amber retry pulse self-heals a flagged shot into green.',
        settle: 'All 27 scene indicators hold steady emerald green while the studio runs hands-free.',
      },
      {
        label: 'Walk away and review in the Screening Room',
        narration:
          'Set scene checkpoints or walk away completely. When the cut is finished, a notification arrives on your phone with a private Screening Room link ready for review.',
        picture:
          'Ana picks up her coffee mug and steps away from the desk as a calm notification chime lights up a private /s/ Screening Room preview on her phone.',
        settle: 'Ana smiles to camera, coffee in hand, while the finished master plays behind her.',
      },
    ],
  },
  {
    id: 'cut',
    eyebrow: 'The cut you publish',
    beats: [
      {
        label: 'The scene',
        narration:
          'The scene you export already carries the picture, the music, and the narration. The clip prompt was written with the shot, not pasted in later.',
        picture:
          'A screening-room frame. Under it, a music stem and a narration stem, both aligned to the picture.',
        settle: 'The frame holds in a dark review room. The stems do not drift.',
      },
      {
        label: 'The master',
        narration:
          'Download the master and ship it yourself, or publish a finished scene or chapter while the long cut is still in progress.',
        picture:
          'One master timeline beside a shorter chapter pulled from it, same faces, same score, same voice.',
        settle: 'The chapter card and the master share one frame of the same scene.',
      },
      {
        label: 'The room',
        narration:
          'Before anything reaches a public feed, watch it in the Screening Room. The network, if you earn it, is an invitation — not an open shelf.',
        picture:
          'A quiet screening room, one large picture, no storefront. A small premiere mark waits, unlit, at the side.',
        settle: 'The picture is the only light. The premiere mark stays dark until it is earned.',
      },
    ],
  },
  {
    id: 'academy',
    eyebrow: 'SceneFlow Studio Academy & Just-In-Time Training',
    beats: [
      {
        label: 'The Just-In-Time screen map',
        narration:
          'You never stare at a blank workspace wondering what comes next. Press question mark on any screen and a Just-In-Time visual map highlights the exact controls for your active stage.',
        picture:
          'CHAR_ANA in the studio beside a translucent workspace map where four glowing cyan callout pins connect directly to the storyboard, narration waveform, and clip prompt controls.',
        settle: 'The four numbered callout pins hold steady over the active workspace.',
      },
      {
        label: 'The 60-second checklist and credit guardrails',
        narration:
          'A sixty-second guided checklist triggers the next studio action in one click, while real-time credit guardrails make sure you lock narration, music, and animatic frames before spending on motion.',
        picture:
          'A compact three-step checklist beside an emerald credit-guardrail badge warming from script resonance to a playable animatic.',
        settle: 'The animatic preview locks green before heavy video render.',
      },
      {
        label: 'Your first film in 10 minutes',
        narration:
          'Walk through four interactive Academy courses right inside the studio — from a one-sentence idea to a voiced, scored, and published master with zero film school required.',
        picture:
          'Ana smiles to camera as Spotlight X-Ray callouts step cleanly from Blueprint to Virtual Soundstage to the Screening Room.',
        settle: 'Ana holds a warm, encouraging expression while the finished scene plays beside her.',
      },
    ],
  },
]

const SCRIPT_BY_ID: Record<HeroVideoScript['id'], HeroVideoScript> = {
  friction: HERO_SECTION_SCRIPTS[0],
  control: HERO_SECTION_SCRIPTS[1],
  agent: HERO_SECTION_SCRIPTS[2],
  cut: HERO_SECTION_SCRIPTS[3],
  academy: HERO_SECTION_SCRIPTS[4],
}

export type HeroDubLocaleId = 'en' | 'es' | 'pt' | 'hi' | 'zh' | 'ar' | 'th'

export const HERO_DUB_LOCALE_IDS: readonly HeroDubLocaleId[] = [
  'en',
  'es',
  'pt',
  'hi',
  'zh',
  'ar',
  'th',
] as const

/**
 * Canonical voice profile for CHAR_ANA (Ana, 32, warm, confident, composed creative director).
 * Uses Sarah/Bella (EXAVITQu4vr4xnSDxMaL) on ElevenLabs v3 multilingual and Gemini Kore fallback.
 */
export const ANA_CHARACTER_VOICE = {
  characterId: 'CHAR_ANA',
  name: 'Ana',
  elevenLabsVoiceId: 'EXAVITQu4vr4xnSDxMaL',
  elevenLabsModelId: 'eleven_v3',
  geminiVoiceId: 'gemini-Kore',
  directorNotes:
    'Ana, 32-year-old warm, confident, calm female creative director and studio mentor; steady cinematic pacing.',
} as const

/**
 * Translated 3-beat narration scripts for each of the 5 hero sequence sections.
 * Brand terms (SceneFlow, Production Agent, Creative Clips, Screening Room, Just-In-Time, Academy)
 * remain intact across locales per dubbing rules.
 */
export const HERO_SECTION_DUB_BEATS: Record<
  HeroVideoScript['id'],
  Record<HeroDubLocaleId, readonly [string, string, string]>
> = {
  friction: {
    en: [
      HERO_SECTION_SCRIPTS[0].beats[0].narration,
      HERO_SECTION_SCRIPTS[0].beats[1].narration,
      HERO_SECTION_SCRIPTS[0].beats[2].narration,
    ],
    es: [
      'Prompts en una pestaña. Música en otra. Narración grabada aparte y arrastrada a una línea de tiempo que no conoce la escena.',
      'SceneFlow es un solo flujo. La serie o el máster de 90 minutos se crea en el mismo estudio que escribe el prompt, pone la música y alinea la voz.',
      'Cuando una escena o capítulo está listo, publicas ese corte. No reconstruyes el prompt, la música ni la voz desde cero.',
    ],
    pt: [
      'Prompts em uma aba. Música em outra. Narração gravada à parte e levada para uma timeline que não conhece a cena.',
      'O SceneFlow é um único pipeline. A série ou o master de 90 minutos nasce no mesmo estúdio que cria o prompt, a música e a narração no ritmo.',
      'Quando uma cena ou capítulo fica pronto, você publica esse corte, sem recriar prompt, trilha e voz do zero.',
    ],
    hi: [
      'एक टैब में क्लिप प्रॉम्प्ट। दूसरे में संगीत। कहीं और रिकॉर्ड किया नैरेशन, ऐसी टाइमलाइन पर जो सीन को जानती ही नहीं।',
      'SceneFlow एक ही पाइपलाइन है। सीरीज़ या 90 मिनट का मास्टर उसी स्टूडियो में बनता है जो प्रॉम्प्ट, संगीत और नैरेशन को बीट पर रखता है।',
      'जब सीन या अध्याय तैयार हो, आप वही कट पब्लिश करते हैं। प्रॉम्प्ट, संगीत और आवाज़ को शून्य से दोबारा नहीं बनाते।',
    ],
    zh: [
      '一个标签页写提示词，另一个找音乐，旁白又在别处录制，最后拖进一条根本不懂剧情的时间线。',
      'SceneFlow 是一条完整流水线。无论是剧集还是 90 分钟母带，都在同一工作室里完成提示词编写、配乐铺设与旁白卡点。',
      '当一场戏或一个章节就绪，直接发布成片，无需从零重建提示词、配乐与人声。',
    ],
    ar: [
      'أوامر المشاهد في نافذة، والموسيقى في أخرى، والسرد يُسجَّل منفصلاً ثم يُسحب إلى خط زمني لا يعرف المشهد.',
      'SceneFlow خط إنتاج واحد. المسلسل أو الماستر ذو 90 دقيقة يُبنى في الاستوديو نفسه الذي يكتب الأمر ويضع الموسيقى ويضبط السرد.',
      'وعندما يجهز مشهد أو فصل، تنشر تلك النسخة فوراً دون إعادة بناء الأوامر أو الموسيقى أو الصوت.',
    ],
    th: [
      'เขียนพรอมต์ในแท็บหนึ่ง ทำเพลงอีกแท็บ อัดเสียงบรรยายที่อื่น แล้วลากใส่ไทม์ไลน์ที่ไม่เข้าใจซีน',
      'SceneFlow คือไปป์ไลน์เดียว ทั้งซีรีส์หรือมาสเตอร์ 90 นาทีสร้างในสตูดิโอเดียวที่เขียนพรอมต์ วางเพลง และล็อกเสียงตรงจังหวะ',
      'เมื่อซีนหรือบทพร้อม คุณเผยแพร่คัตนั้นทันที โดยไม่ต้องสร้างพรอมต์ ดนตรี และเสียงใหม่ตั้งแต่ต้น',
    ],
  },
  control: {
    en: [
      HERO_SECTION_SCRIPTS[1].beats[0].narration,
      HERO_SECTION_SCRIPTS[1].beats[1].narration,
      HERO_SECTION_SCRIPTS[1].beats[2].narration,
    ],
    es: [
      'Diriges la toma en lenguaje natural: quién está en cuadro, dónde se ubica y cuál es el momento.',
      'La dirección de toma escribe el prompt de imagen y video. No vuelves a teclear la escena en un generador.',
      'Música y narración van al pulso. Las escuchas en el animatic, ajustas la toma y solo entonces inviertes en movimiento.',
    ],
    pt: [
      'Você dirige o plano em linguagem simples: quem está no quadro, onde fica e qual é o momento.',
      'A direção de cena escreve o prompt da imagem e do clipe. Você não redigita a cena em outro gerador.',
      'Música e narração entram no ritmo. Você ouve no animatic, ajusta o plano e só então investe em movimento.',
    ],
    hi: [
      'आप सरल भाषा में शॉट निर्देशित करते हैं — फ्रेम में कौन है, कहाँ खड़ा है, और पल क्या है।',
      'शॉट डायरेक्शन खुद स्टिल और क्लिप प्रॉम्प्ट लिखता है। आपको जनरेटर में शॉट दोबारा टाइप नहीं करना पड़ता।',
      'संगीत और नैरेशन बीट पर बैठते हैं। एनिमैटिक में सुनें, ज़रूरत हो तो शॉट बदलें, और तभी मोशन पर खर्च करें।',
    ],
    zh: [
      '你用自然语言导演镜头：画面里有谁、站在哪里、此刻发生什么。',
      '镜头指令会自动生成剧照与视频提示词，无需在生成器里反复重新输入。',
      '配乐与旁白精准卡在节拍上。先在动态分镜里试听修改，确认无误后再为视频渲染投入积分。',
    ],
    ar: [
      'تُخرج اللقطة بلغة بسيطة: من في الإطار، أين يقف، وما هي اللحظة.',
      'توجيه اللقطة يكتب أمر الصورة والفيديو تلقائياً دون إعادة كتابته في مولد آخر.',
      'الموسيقى والسرد على الإيقاع. تسمعهما في الأنيماتيك وتعدّل اللقطة، ثم تنفق على الحركة فقط.',
    ],
    th: [
      'คุณกำกับช็อตด้วยภาษาธรรมดา ใครอยู่ในเฟรม ยืนตรงไหน และโมเมนต์คืออะไร',
      'คำสั่งกำกับช็อตเขียนพรอมต์ภาพนิ่งและวิดีโอให้อัตโนมัติ ไม่ต้องพิมพ์ซ้ำในเครื่องมืออื่น',
      'คิวเพลงและเสียงบรรยายลงจังหวะพอดี ฟังในแอนิเมติก แก้ช็อตให้ถูกใจ แล้วค่อยใช้เครดิตสร้างวิดีโอ',
    ],
  },
  agent: {
    en: [
      HERO_SECTION_SCRIPTS[2].beats[0].narration,
      HERO_SECTION_SCRIPTS[2].beats[1].narration,
      HERO_SECTION_SCRIPTS[2].beats[2].narration,
    ],
    es: [
      '27 escenas exigen más de 300 prompts manuales. Con Production Agent, afinas el guion en menos de una hora y lanzas todo.',
      'El Agente recorre cada escena: fija referencias, coloca voz y música, genera cuadros, optimiza prompts y usa Creative Clips ante filtros.',
      'Define controles o aléjate. Al terminar el corte, llega a tu móvil un enlace privado al Screening Room listo para revisar.',
    ],
    pt: [
      '27 cenas exigem mais de 300 prompts manuais. Com o Production Agent, você refina o roteiro em menos de uma hora e inicia tudo.',
      'O Agente percorre cada cena: trava referências, aplica voz e música, gera quadros, otimiza prompts e usa Creative Clips se necessário.',
      'Defina checkpoints ou afaste-se. Quando o corte termina, chega ao seu celular um link privado da Screening Room.',
    ],
    hi: [
      '27 सीन में 300 से ज़्यादा मैनुअल प्रॉम्प्ट लगते हैं। Production Agent के साथ एक घंटे से कम में स्क्रिप्ट निखारें और बिल्ड शुरू करें।',
      'एजेंट हर सीन खुद बनाता है — रेफरेंस लॉक करता है, नैरेशन व संगीत लगाता है, स्टिल्स बनाता है और पॉलिसी फ़िल्टर पर Creative Clips चुनता है।',
      'चेकपॉइंट सेट करें या काम छोड़ दें। कट तैयार होते ही फ़ोन पर निजी Screening Room लिंक आ जाता है।',
    ],
    zh: [
      '27 场戏通常要 300 多个手动提示词。有了 Production Agent，不到一小时打磨剧本即可一键启动构建。',
      '智能体自动完成每场戏：锁定参考、铺设旁白配乐、生成剧照、优化提示词，并在受限时切换 Creative Clips。',
      '可设检查点或完全放手。成片完成后，手机会收到专属 Screening Room 审片链接通知。',
    ],
    ar: [
      'إنتاج 27 مشهداً يتطلب أكثر من 300 أمر يدوي. مع Production Agent تُتقن النص في أقل من ساعة وتطلق البناء.',
      'يمر الوكيل على كل مشهد: يثبّت المراجع، يضع السرد والموسيقى، يولّد الصور، ويتحول إلى Creative Clips عند قيود السياسات.',
      'ضع نقاط مراجعة أو اتركه يعمل. وعند اكتمال المونتاج يصلك إشعار برابط خاص إلى Screening Room.',
    ],
    th: [
      'งาน 27 ซีนต้องใช้พรอมต์กว่า 300 รายการ ด้วย Production Agent คุณขัดเกลาบทไม่ถึงชั่วโมงแล้วกดเริ่มสร้างได้ทันที',
      'เอเจนต์จัดการทุกซีนอัตโนมัติ ล็อกภาพอ้างอิง วางเสียงและดนตรี สร้างภาพนิ่ง และสลับใช้ Creative Clips เมื่อติดตัวกรอง',
      'ตั้งจุดตรวจเช็กหรือปล่อยระบบทำงานจนจบ เมื่อเสร็จแล้ว ลิงก์ Screening Room ส่วนตัวจะแจ้งเตือนเข้ามือถือทันที',
    ],
  },
  cut: {
    en: [
      HERO_SECTION_SCRIPTS[3].beats[0].narration,
      HERO_SECTION_SCRIPTS[3].beats[1].narration,
      HERO_SECTION_SCRIPTS[3].beats[2].narration,
    ],
    es: [
      'La escena que exportas ya incluye imagen, música y narración. El prompt se escribió con la toma, no se pegó después.',
      'Descarga el máster y envíalo tú mismo, o publica una escena o capítulo mientras el corte largo sigue en marcha.',
      'Antes de salir al público, míralo en el Screening Room. La red, si te la ganas, es una invitación, no un estante abierto.',
    ],
    pt: [
      'A cena exportada já traz imagem, música e narração. O prompt foi escrito junto com o plano, não colado depois.',
      'Baixe o master e publique por conta própria, ou lance uma cena ou capítulo enquanto o corte longo segue em produção.',
      'Antes de ir ao público, assista na Screening Room. A rede, quando conquistada, é um convite — não uma prateleira aberta.',
    ],
    hi: [
      'एक्सपोर्ट किए गए सीन में तस्वीर, संगीत और नैरेशन साथ होते हैं। क्लिप प्रॉम्प्ट शॉट के साथ लिखा गया था, बाद में पेस्ट नहीं हुआ।',
      'मास्टर डाउनलोड कर खुद भेजें, या लंबा कट बनते समय ही कोई तैयार सीन या अध्याय पब्लिश कर दें।',
      'पब्लिक फ़ीड से पहले इसे Screening Room में देखें। यह नेटवर्क कोई खुला शेल्फ़ नहीं, गुणवत्ता से मिला निमंत्रण है।',
    ],
    zh: [
      '导出的每一场戏都自带画面、配乐与旁白。视频提示词与镜头同步生成，而非事后拼贴。',
      '你可以下载母带自主发行，也能在长片制作途中先行发布已完成的单场戏或章节。',
      '公开发布前，先在 Screening Room 审片。展映网络凭品质受邀加入，而非随意上架的货架。',
    ],
    ar: [
      'المشهد الذي تصدّره يحمل الصورة والموسيقى والسرد معاً، إذ كُتب أمر اللقطة مع المشهد نفسه.',
      'حمّل الماستر وانشره بنفسك، أو انشر مشهداً أو فصلاً مكتملاً بينما يتواصل العمل على النسخة الطويلة.',
      'وقبل النشر العام، شاهده في Screening Room. فالشبكة دعوة تُكتسب بالجودة وليست رفاً مفتوحاً.',
    ],
    th: [
      'ซีนที่ส่งออกมีครบทั้งภาพ ดนตรี และเสียงบรรยาย พรอมต์ถูกเขียนพร้อมช็อต ไม่ใช่แปะทีหลัง',
      'ดาวน์โหลดมาสเตอร์ไปเผยแพร่เอง หรือปล่อยซีนและบทที่เสร็จก่อนระหว่างรอคัตเต็มก็ได้',
      'ก่อนออกสู่สาธารณะ รับชมใน Screening Room เครือข่ายของเราคือคำเชิญจากคุณภาพงาน ไม่ใช่ชั้นวางเปิดทั่วไป',
    ],
  },
  academy: {
    en: [
      HERO_SECTION_SCRIPTS[4].beats[0].narration,
      HERO_SECTION_SCRIPTS[4].beats[1].narration,
      HERO_SECTION_SCRIPTS[4].beats[2].narration,
    ],
    es: [
      'Nunca miras una pantalla vacía sin saber qué sigue. Pulsa interrogación y el mapa Just-In-Time resaltará los controles de tu etapa.',
      'Una lista de 60 segundos activa el siguiente paso en un clic, y los protectores de créditos fijan voz, música y animatic antes del video.',
      'Recorre cuatro cursos interactivos de Academy en el estudio: de una idea en una frase a un máster completo, sin escuela de cine.',
    ],
    pt: [
      'Você nunca encara uma tela vazia sem saber o próximo passo. Pressione interrogação e o mapa Just-In-Time destacará os controles da etapa.',
      'Um checklist de 60 segundos aciona o próximo passo em um clique, garantindo travar voz, música e animatic antes de gastar com vídeo.',
      'Explore quatro cursos interativos da Academy no estúdio — de uma ideia em uma frase a um master completo, sem escola de cinema.',
    ],
    hi: [
      'आप कभी खाली स्क्रीन देखकर उलझते नहीं। प्रश्नचिह्न दबाएँ और Just-In-Time मैप आपके चरण के सटीक कंट्रोल्स दिखा देगा।',
      '60 सेकंड की चेकलिस्ट एक क्लिक में अगला कदम चलाती है, और क्रेडिट गार्डरेल्स मोशन से पहले नैरेशन, संगीत व एनिमैटिक लॉक कराते हैं।',
      'स्टूडियो में चार इंटरैक्टिव Academy कोर्सेज़ पूरे करें — एक वाक्य के विचार से तैयार मास्टर तक, बिना फ़िल्म स्कूल के।',
    ],
    zh: [
      '你永远不会面对空白界面不知所措。按下问号键，Just-In-Time 视觉地图就会高亮当前阶段的精确控件。',
      '60 秒引导清单支持一键执行下一步，积分护栏则确保在渲染视频前先锁定旁白、配乐与动态分镜。',
      '在工作室内体验四门互动 Academy 课程——无需电影学院背景，也能从一句话灵感做出完整成片。',
    ],
    ar: [
      'لن تقف أمام شاشة فارغة متسائلاً عما يلي. اضغط علامة الاستفهام لتُبرز خريطة Just-In-Time عناصر التحكم لمرحلتك.',
      'قائمة في 60 ثانية تطلق الخطوة التالية بنقرة، وتضمن حواجز الرصيد تثبيت السرد والموسيقى والأنيماتيك قبل الفيديو.',
      'خُض أربع دورات Academy تفاعلية داخل الاستوديو — من فكرة في جملة إلى ماستر كامل دون دراسة سينما.',
    ],
    th: [
      'ไม่ต้องจ้องหน้าจอว่างเปล่าโดยไม่รู้ขั้นตอนต่อไป กดเครื่องหมายคำถาม แล้วแผนที่ Just-In-Time จะชี้ปุ่มควบคุมทันที',
      'เช็กลิสต์ 60 วินาทีสั่งงานถัดไปในคลิกเดียว พร้อมระบบดูแลเครดิตให้ล็อกเสียง ดนตรี และแอนิเมติกก่อนสร้างวิดีโอ',
      'เรียนรู้สี่คอร์สโต้ตอบของ Academy ในสตูดิโอ จากไอเดียประโยคเดียวสู่มาสเตอร์สมบูรณ์แบบ โดยไม่ต้องจบโรงเรียนภาพยนตร์',
    ],
  },
}

export function getHeroSectionDubBeats(
  id: HeroVideoScript['id'],
  locale: HeroDubLocaleId
): readonly [string, string, string] {
  return HERO_SECTION_DUB_BEATS[id][locale] ?? HERO_SECTION_DUB_BEATS[id].en
}

export function getHeroSectionDubNarration(
  id: HeroVideoScript['id'],
  locale: HeroDubLocaleId
): string {
  return getHeroSectionDubBeats(id, locale).join(' ')
}

export function getHeroSectionScript(id: HeroVideoScript['id']): HeroVideoScript {
  return SCRIPT_BY_ID[id]
}

export function formatHeroVideoScript(script: HeroVideoScript): string {
  const beats = script.beats
    .map(
      (beat, index) =>
        `${index + 1}. ${beat.label}\nNarration: ${beat.narration}\nPicture: ${beat.picture}\nSettle on: ${beat.settle}`
    )
    .join('\n\n')
  return `${script.eyebrow}\n\n${beats}`
}
