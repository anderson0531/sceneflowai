/**
 * SceneFlow introduction animatic — beat-by-beat script.
 *
 * Follows the beat-table convention established by
 * scripts/use-case-scripts/1847-maple-drive-listing-tour.md: a global style lock,
 * REF: reference sheets generated once, then per-act beats pairing a narration line
 * with an image illustration prompt and a Ken Burns motion note.
 *
 * One visual spine, six narration tracks: frame prompts are language-neutral so a
 * single set of beat frames is reused for every locale and only the voiceover is
 * re-synthesized — the same way the hero and persona videos ship (heroVideoLocales.ts).
 * Frames stay text-free so no locale needs a re-render; overlay copy is added as a
 * caption layer at assembly.
 */

/** Locale ids match the video-locale bucket in heroVideoLocales.ts (`zh`, not `zh-CN`). */
export type IntroAnimaticLocaleId = 'en' | 'es' | 'pt' | 'zh' | 'ar' | 'th'

export type IntroAnimaticLocale = {
  id: IntroAnimaticLocaleId
  /** UI label (English) */
  label: string
  /** Native language name */
  nativeLabel: string
  dir: 'ltr' | 'rtl'
  /** Short code passed to resolveGeminiTtsLanguageCode() for synthesis. */
  ttsShortCode: string
  /** False until a native speaker has signed off on the narration. */
  reviewed: boolean
}

export type IntroAnimaticAct =
  | 'HOOK'
  | 'BLUEPRINT'
  | 'REFERENCES'
  | 'PRODUCTION'
  | 'SCREENING'
  | 'PUBLISH'
  | 'CLOSE'

export type IntroAnimaticBeat = {
  /** Zero-padded beat number, e.g. '01'. */
  id: string
  act: IntroAnimaticAct
  /** Start timecode, m:ss. */
  timecode: string
  durationSeconds: number
  /** Ken Burns note applied to the still frame. */
  motion: string
  /** Language-neutral image prompt; ends with the style-lock marker. */
  framePrompt: string
  /** Language-neutral overlay copy added at assembly, not baked into the frame. */
  onScreenText?: string
  narration: Record<IntroAnimaticLocaleId, string>
}

export const INTRO_ANIMATIC_STYLE_LOCK_MARKER = 'Style lock.'

export const INTRO_ANIMATIC_STYLE_LOCK =
  'SceneFlow introduction animatic storyboard frame, 16:9, cinematic dark editorial style, deep navy and slate background, cyan and violet accent light, soft volumetric glow, illustrated semi-realistic rendering, generous negative space, confident and modern. No text overlays, watermarks, captions, or readable interface copy in frame.'

export const INTRO_ANIMATIC_META = {
  title: 'SceneFlow AI — Introduction',
  format:
    'Illustrated animatic — one storyboard frame per narration line; Ken Burns motion, cross-dissolve 0.5s between beats',
  narrator: 'Single narrator, warm and confident, documentary-explainer register',
  voiceId: 'gemini-Algenib',
  directorNotes: 'Clear, intelligent, and engaging',
} as const

export const INTRO_ANIMATIC_LOCALES: IntroAnimaticLocale[] = [
  { id: 'en', label: 'English', nativeLabel: 'English', dir: 'ltr', ttsShortCode: 'en', reviewed: true },
  { id: 'es', label: 'Spanish', nativeLabel: 'Español', dir: 'ltr', ttsShortCode: 'es', reviewed: false },
  { id: 'pt', label: 'Portuguese', nativeLabel: 'Português', dir: 'ltr', ttsShortCode: 'pt', reviewed: false },
  { id: 'zh', label: 'Chinese', nativeLabel: '中文', dir: 'ltr', ttsShortCode: 'zh', reviewed: false },
  { id: 'ar', label: 'Arabic', nativeLabel: 'العربية', dir: 'rtl', ttsShortCode: 'ar', reviewed: false },
  { id: 'th', label: 'Thai', nativeLabel: 'ไทย', dir: 'ltr', ttsShortCode: 'th', reviewed: false },
]

export const INTRO_ANIMATIC_LOCALE_IDS: IntroAnimaticLocaleId[] = INTRO_ANIMATIC_LOCALES.map(
  (locale) => locale.id
)

export type IntroAnimaticReference = {
  /** REF token used inside frame prompts. */
  token: string
  kind: 'character' | 'location' | 'motif' | 'interface'
  prompt: string
}

/** Generate once and lock in the Reference Library before generating beat frames. */
export const INTRO_ANIMATIC_REFERENCES: IntroAnimaticReference[] = [
  {
    token: 'CREATOR_ALEX',
    kind: 'character',
    prompt:
      'Alex, early 30s, androgynous solo creator, warm brown eyes, short textured dark hair, olive skin tone, charcoal sweater over a simple tee. Expressive but understated — reads as capable rather than glamorous. Reference sheet: portrait plus three-quarter and full-body angles, neutral soft key light, plain background.',
  },
  {
    token: 'LOC_HOME_STUDIO',
    kind: 'location',
    prompt:
      'Small home studio at night: one desk, a wide monitor, a condenser mic on a boom arm, a shelf of books, a single warm lamp against cool window light. Lived-in and modest, not a influencer set. Wide establishing shot, no people.',
  },
  {
    token: 'MOTIF_TOOL_CHAOS',
    kind: 'motif',
    prompt:
      'Six mismatched floating translucent panels orbiting a figure at unequal angles, each glowing a different clashing hue, connected by tangled cables and circular arrows that loop back on themselves. Fragmented, noisy, unresolved composition.',
  },
  {
    token: 'MOTIF_PIPELINE_RIBBON',
    kind: 'motif',
    prompt:
      'A single continuous cyan-to-violet ribbon of light flowing left to right through four evenly spaced luminous waypoints, replacing scattered fragments. Calm, ordered, purposeful.',
  },
  {
    token: 'UI_BLUEPRINT_PANEL',
    kind: 'interface',
    prompt:
      'Abstracted planning surface: one large soft-edged input field, beneath it three closed padlock glyphs on small cards suggesting story, audience, and visual style. Shapes only, no readable text.',
  },
  {
    token: 'UI_REFERENCE_LIBRARY',
    kind: 'interface',
    prompt:
      'Abstracted grid of reference cards: a face portrait, a waveform, a garment silhouette, and an interior thumbnail, each with a small locked badge. Shapes only, no readable text.',
  },
  {
    token: 'UI_BEAT_TIMELINE',
    kind: 'interface',
    prompt:
      'Abstracted horizontal timeline with four stacked parallel lanes filling simultaneously left to right, small frame thumbnails pinned along the top lane. Shapes only, no readable text.',
  },
  {
    token: 'UI_SCREENING_ROOM',
    kind: 'interface',
    prompt:
      'Abstracted darkened review room: one large glowing playback rectangle, a slim scrubber beneath, a soft circular gauge to the side. Shapes only, no readable text.',
  },
  {
    token: 'MOTIF_LANGUAGE_GLOBE',
    kind: 'motif',
    prompt:
      'A single luminous master reel at center radiating thin cyan filaments outward to many small glowing nodes distributed across a softly implied globe. Expansive, generous, connected.',
  },
  {
    token: 'LOGO_CARD',
    kind: 'motif',
    prompt:
      'Centered SceneFlow mark on deep navy, thin cyan-to-violet underline, wide symmetrical negative space, faint volumetric haze. Composition leaves the lower third clear for an overlay caption.',
  },
]

export const INTRO_ANIMATIC_BEATS: IntroAnimaticBeat[] = [
  {
    id: '01',
    act: 'HOOK',
    timecode: '0:00',
    durationSeconds: 6,
    motion: 'Slow push-in',
    framePrompt:
      'MOTIF_TOOL_CHAOS around CREATOR_ALEX seated at LOC_HOME_STUDIO, shoulders tight, face lit by clashing panel glow. Style lock.',
    narration: {
      en: 'Making one video with AI today means juggling half a dozen different tools.',
      es: 'Hacer un solo video con IA hoy significa hacer malabares con media docena de herramientas distintas.',
      pt: 'Fazer um único vídeo com IA hoje significa se equilibrar entre meia dúzia de ferramentas diferentes.',
      zh: '如今，用 AI 制作一条视频，往往要在六七个不同的工具之间来回切换。',
      ar: 'إنتاج فيديو واحد بالذكاء الاصطناعي اليوم يعني التنقل بين ستة أدوات مختلفة.',
      th: 'การทำวิดีโอเพียงหนึ่งชิ้นด้วย AI ทุกวันนี้ ต้องสลับใช้เครื่องมือหลายตัว',
    },
  },
  {
    id: '02',
    act: 'HOOK',
    timecode: '0:06',
    durationSeconds: 6,
    motion: 'Slow pan right',
    framePrompt:
      'MOTIF_TOOL_CHAOS close detail: overlapping panel edges, looping circular arrows, small coin glyphs dissolving into embers as they fall. No people. Style lock.',
    narration: {
      en: 'A script here, images there, voices and music somewhere else. Six tabs, endless re-rolls.',
      es: 'El guion aquí, las imágenes allá, las voces y la música en otro lado. Seis pestañas, intentos sin fin.',
      pt: 'O roteiro aqui, as imagens lá, vozes e música em outro lugar. Seis abas, tentativas sem fim.',
      zh: '剧本在这里，画面在那里，配音和音乐又在别处。六个标签页，反复重做。',
      ar: 'النص هنا، والصور هناك، والأصوات والموسيقى في مكان آخر. ستة تبويبات ومحاولات لا تنتهي.',
      th: 'บทอยู่ที่หนึ่ง ภาพอยู่ที่หนึ่ง เสียงและดนตรีอยู่อีกที่ เปิดหกแท็บ สร้างซ้ำไม่จบสิ้น',
    },
  },
  {
    id: '03',
    act: 'HOOK',
    timecode: '0:12',
    durationSeconds: 5,
    motion: 'Hold, subtle drift',
    framePrompt:
      'Transition frame: MOTIF_TOOL_CHAOS fragments collapsing inward and resolving into MOTIF_PIPELINE_RIBBON. Style lock.',
    narration: {
      en: 'SceneFlow replaces all of it with one guided studio.',
      es: 'SceneFlow reemplaza todo eso con un único estudio guiado.',
      pt: 'A SceneFlow substitui tudo isso por um único estúdio guiado.',
      zh: 'SceneFlow 用一个引导式工作室，取代这一切。',
      ar: 'SceneFlow يستبدل كل ذلك باستوديو واحد موجَّه.',
      th: 'SceneFlow แทนที่ทั้งหมดนั้นด้วยสตูดิโอเดียวที่มีระบบนำทาง',
    },
  },
  {
    id: '04',
    act: 'BLUEPRINT',
    timecode: '0:17',
    durationSeconds: 6,
    motion: 'Slow push-in',
    framePrompt:
      'UI_BLUEPRINT_PANEL centered, CREATOR_ALEX at frame edge speaking toward it, soft cyan rim light. Style lock.',
    narration: {
      en: 'It starts in Blueprint. Describe your idea in plain words — no prompt engineering.',
      es: 'Empieza en Blueprint. Describe tu idea con palabras normales, sin ingeniería de prompts.',
      pt: 'Começa no Blueprint. Descreva sua ideia com palavras simples, sem engenharia de prompt.',
      zh: '一切从 Blueprint 开始。用日常语言描述你的想法，无需提示词工程。',
      ar: 'تبدأ من Blueprint. اوصف فكرتك بكلمات عادية، دون هندسة أوامر.',
      th: 'เริ่มต้นที่ Blueprint อธิบายไอเดียของคุณด้วยภาษาธรรมดา ไม่ต้องเขียนพรอมป์',
    },
  },
  {
    id: '05',
    act: 'BLUEPRINT',
    timecode: '0:23',
    durationSeconds: 6,
    motion: 'Slow pan down',
    framePrompt:
      'UI_BLUEPRINT_PANEL: the three padlock cards closing in sequence, a thin cyan line descending from them toward the lower frame edge. No people. Style lock.',
    narration: {
      en: 'Lock your story, audience, and visual style once. Everything downstream inherits it.',
      es: 'Fija tu historia, tu audiencia y tu estilo visual una vez. Todo lo demás lo hereda.',
      pt: 'Defina sua história, seu público e seu estilo visual uma vez. Todo o resto herda isso.',
      zh: '一次锁定你的故事、受众和视觉风格，后续每一步都会自动继承。',
      ar: 'حدِّد قصتك وجمهورك وأسلوبك البصري مرة واحدة، وكل خطوة تالية ترث ذلك.',
      th: 'ล็อกเรื่องราว กลุ่มผู้ชม และสไตล์ภาพเพียงครั้งเดียว ทุกขั้นตอนถัดไปสืบทอดต่อ',
    },
  },
  {
    id: '06',
    act: 'REFERENCES',
    timecode: '0:29',
    durationSeconds: 6,
    motion: 'Slow pan right',
    framePrompt:
      'UI_REFERENCE_LIBRARY grid filling the frame, each card gaining a locked badge in turn. No people. Style lock.',
    narration: {
      en: 'Your cast lives in the Reference Library — faces, voices, wardrobe, locations.',
      es: 'Tu reparto vive en la Biblioteca de Referencias: rostros, voces, vestuario y locaciones.',
      pt: 'Seu elenco vive na Biblioteca de Referências: rostos, vozes, figurino e locações.',
      zh: '你的角色都存放在参考库里：面孔、声音、服装和场景。',
      ar: 'أبطال عملك يعيشون في مكتبة المراجع: الوجوه والأصوات والأزياء والمواقع.',
      th: 'นักแสดงของคุณอยู่ในคลังอ้างอิง ทั้งใบหน้า เสียง เครื่องแต่งกาย และสถานที่',
    },
  },
  {
    id: '07',
    act: 'REFERENCES',
    timecode: '0:35',
    durationSeconds: 6,
    motion: 'Hold',
    framePrompt:
      'Triptych: the same CREATOR_ALEX face rendered identically in three different lighting environments side by side, thin cyan alignment lines connecting matching features across all three. Style lock.',
    narration: {
      en: 'Build them once, and they stay identical across every scene and every episode.',
      es: 'Créalos una vez y se mantienen idénticos en cada escena y cada episodio.',
      pt: 'Crie uma vez e eles permanecem idênticos em cada cena e cada episódio.',
      zh: '创建一次，就能在每个镜头、每一集里保持完全一致。',
      ar: 'أنشئهم مرة واحدة، ليبقوا متطابقين في كل مشهد وكل حلقة.',
      th: 'สร้างครั้งเดียว แล้วคงเดิมทุกฉากและทุกตอน',
    },
  },
  {
    id: '08',
    act: 'PRODUCTION',
    timecode: '0:41',
    durationSeconds: 7,
    motion: 'Slow pan right',
    framePrompt:
      'UI_BEAT_TIMELINE: all four lanes filling at once, frame thumbnails populating along the top lane. No people. Style lock.',
    narration: {
      en: 'Production then generates beat by beat — script, audio, frames, and motion, all at once.',
      es: 'Producción genera beat por beat: guion, audio, cuadros y movimiento, todo a la vez.',
      pt: 'A Produção gera beat por beat: roteiro, áudio, quadros e movimento, tudo ao mesmo tempo.',
      zh: '然后由 Production 逐拍生成：剧本、音频、画面和运动，同时进行。',
      ar: 'ثم يولّد الإنتاج لقطة بلقطة: النص والصوت والإطارات والحركة، معًا في الوقت نفسه.',
      th: 'จากนั้น Production สร้างทีละบีต ทั้งบท เสียง เฟรม และการเคลื่อนไหว พร้อมกัน',
    },
  },
  {
    id: '09',
    act: 'PRODUCTION',
    timecode: '0:48',
    durationSeconds: 6,
    motion: 'Slow push-in',
    framePrompt:
      'UI_BEAT_TIMELINE detail: a row of frame thumbnails each gaining a soft cyan approval check, one dimmed thumbnail set aside. CREATOR_ALEX hand entering frame edge. Style lock.',
    narration: {
      en: 'You approve every frame before video is made. No slot machine, no wasted credits.',
      es: 'Apruebas cada cuadro antes de generar video. Sin ruleta, sin créditos desperdiciados.',
      pt: 'Você aprova cada quadro antes de gerar vídeo. Sem cassino, sem créditos desperdiçados.',
      zh: '生成视频之前，你先确认每一帧。不再靠运气，也不浪费点数。',
      ar: 'توافق على كل إطار قبل توليد الفيديو. لا عشوائية ولا أرصدة مهدورة.',
      th: 'คุณอนุมัติทุกเฟรมก่อนสร้างวิดีโอ ไม่ต้องเสี่ยงดวง ไม่เปลืองเครดิต',
    },
  },
  {
    id: '10',
    act: 'SCREENING',
    timecode: '0:54',
    durationSeconds: 6,
    motion: 'Slow zoom out',
    framePrompt:
      'UI_SCREENING_ROOM with CREATOR_ALEX seated in silhouette watching the glowing playback rectangle, room falling away into darkness. Style lock.',
    narration: {
      en: 'In the Screening Room, watch the full animatic before paying for a final render.',
      es: 'En la Sala de Proyección ves el animático completo antes de pagar el render final.',
      pt: 'Na Sala de Exibição, assista ao animatic completo antes de pagar pelo render final.',
      zh: '在放映室里，先看完整动态分镜，再为最终渲染付费。',
      ar: 'في غرفة العرض، شاهد الأنيماتيك كاملًا قبل أن تدفع مقابل المعالجة النهائية.',
      th: 'ในห้องฉาย ดูแอนิเมติกทั้งเรื่องก่อนจ่ายค่าเรนเดอร์สุดท้าย',
    },
  },
  {
    id: '11',
    act: 'SCREENING',
    timecode: '1:00',
    durationSeconds: 6,
    motion: 'Slow push-in',
    framePrompt:
      'UI_SCREENING_ROOM detail: the circular gauge filling toward a high value, three short recommendation bars beside it. No people. Style lock.',
    narration: {
      en: 'Audience Resonance scores your story against your chosen audience, so you know what lands.',
      es: 'Audience Resonance evalúa tu historia según la audiencia que elegiste, para saber qué funciona.',
      pt: 'O Audience Resonance avalia sua história para o público escolhido, mostrando o que funciona.',
      zh: 'Audience Resonance 会针对你选定的受众为故事评分，让你提前知道效果。',
      ar: 'ويقيس Audience Resonance قصتك أمام الجمهور الذي اخترته، لتعرف ما ينجح مسبقًا.',
      th: 'Audience Resonance ให้คะแนนเรื่องของคุณตามกลุ่มผู้ชมที่เลือก คุณจึงรู้ผลล่วงหน้า',
    },
  },
  {
    id: '12',
    act: 'PUBLISH',
    timecode: '1:06',
    durationSeconds: 6,
    motion: 'Slow zoom out',
    framePrompt:
      'MOTIF_LANGUAGE_GLOBE: filaments reaching outward and lighting nodes in sequence across the implied globe. No people. Style lock.',
    narration: {
      en: 'Then publish — one polished master, with native voice in seventy-plus languages.',
      es: 'Y publicas: un máster pulido, con voz nativa en más de setenta idiomas.',
      pt: 'Depois publique: um master pronto, com voz nativa em mais de setenta idiomas.',
      zh: '然后发布：一个成品母版，支持七十多种语言的母语配音。',
      ar: 'ثم انشر: نسخة نهائية واحدة، بصوت أصلي في أكثر من سبعين لغة.',
      th: 'แล้วเผยแพร่ ได้มาสเตอร์เดียว พร้อมเสียงเจ้าของภาษามากกว่าเจ็ดสิบภาษา',
    },
  },
  {
    id: '13',
    act: 'PUBLISH',
    timecode: '1:12',
    durationSeconds: 6,
    motion: 'Slow pan right',
    framePrompt:
      'Five-panel montage strip in one frame: episodic drama interior, property exterior, training classroom, podcast desk, news desk — each panel a distinct environment, unified color grade. No people. Style lock.',
    narration: {
      en: 'One studio for episodic series, property tours, training, podcasts, and news.',
      es: 'Un solo estudio para series, recorridos inmobiliarios, capacitación, pódcasts y noticias.',
      pt: 'Um estúdio para séries, tours de imóveis, treinamentos, podcasts e telejornais.',
      zh: '同一个工作室，可以做剧集、房产导览、培训、播客和新闻。',
      ar: 'استوديو واحد للمسلسلات وجولات العقارات والتدريب والبودكاست والأخبار.',
      th: 'สตูดิโอเดียวสำหรับซีรีส์ ทัวร์อสังหาริมทรัพย์ การอบรม พอดแคสต์ และข่าว',
    },
  },
  {
    id: '14',
    act: 'PUBLISH',
    timecode: '1:18',
    durationSeconds: 6,
    motion: 'Hold, gentle drift',
    framePrompt:
      'Three-panel montage strip in one frame: product campaign still life, case-study boardroom, public-service community scene — unified color grade. No people. Style lock.',
    narration: {
      en: 'For branded campaigns, case studies, and public-service messages.',
      es: 'Para campañas de marca, casos de éxito y mensajes de servicio público.',
      pt: 'Para campanhas de marca, estudos de caso e mensagens de utilidade pública.',
      zh: '也可以做品牌广告、案例研究和公共服务信息。',
      ar: 'وللحملات التجارية ودراسات الحالة ورسائل الخدمة العامة.',
      th: 'รวมถึงแคมเปญแบรนด์ กรณีศึกษา และสารด้านบริการสาธารณะ',
    },
  },
  {
    id: '15',
    act: 'CLOSE',
    timecode: '1:24',
    durationSeconds: 6,
    motion: 'Slow push-in',
    framePrompt:
      'Split frame: left side a dim tangled clock face wrapped in cables, right side a single clean luminous arc. Composition leaves the lower third clear for an overlay caption. No people. Style lock.',
    narration: {
      en: 'Forty hours of work becomes twenty-five minutes. Three weeks becomes three days.',
      es: 'Cuarenta horas de trabajo se vuelven veinticinco minutos. Tres semanas, tres días.',
      pt: 'Quarenta horas de trabalho viram vinte e cinco minutos. Três semanas viram três dias.',
      zh: '四十小时的工作量，变成二十五分钟。三周的交付，变成三天。',
      ar: 'أربعون ساعة عمل تصبح خمسًا وعشرين دقيقة. وثلاثة أسابيع تصبح ثلاثة أيام.',
      th: 'งานสี่สิบชั่วโมงเหลือยี่สิบห้านาที สามสัปดาห์เหลือสามวัน',
    },
  },
  {
    id: '16',
    act: 'CLOSE',
    timecode: '1:30',
    durationSeconds: 5,
    motion: 'Hold',
    framePrompt: 'LOGO_CARD centered, faint haze settling. Style lock.',
    onScreenText: 'SceneFlow AI Studio · sceneflowai.studio',
    narration: {
      en: 'SceneFlow AI. Envision the story. We handle the pipeline.',
      es: 'SceneFlow AI. Imagina la historia. Nosotros nos encargamos del proceso.',
      pt: 'SceneFlow AI. Imagine a história. Nós cuidamos da produção.',
      zh: 'SceneFlow AI。你构想故事，我们负责生产。',
      ar: 'SceneFlow AI — تصوَّر القصة، ونحن نتولى الإنتاج.',
      th: 'SceneFlow AI จินตนาการเรื่องราว เราจัดการกระบวนการผลิต',
    },
  },
]

/** Act order as it appears in the script, for grouped rendering. */
export const INTRO_ANIMATIC_ACT_ORDER: IntroAnimaticAct[] = [
  'HOOK',
  'BLUEPRINT',
  'REFERENCES',
  'PRODUCTION',
  'SCREENING',
  'PUBLISH',
  'CLOSE',
]

export const INTRO_ANIMATIC_ACT_TITLES: Record<IntroAnimaticAct, string> = {
  HOOK: 'HOOK — The Fragmented Way',
  BLUEPRINT: 'BLUEPRINT — Lock the Creative DNA',
  REFERENCES: 'REFERENCES — Continuity That Holds',
  PRODUCTION: 'PRODUCTION — Beat-First Generation',
  SCREENING: 'SCREENING — Validate Before You Spend',
  PUBLISH: 'PUBLISH — One Master, Every Market',
  CLOSE: 'CLOSE — Payoff & Sign-Off',
}

export function getIntroAnimaticLocale(
  id: IntroAnimaticLocaleId
): IntroAnimaticLocale | undefined {
  return INTRO_ANIMATIC_LOCALES.find((locale) => locale.id === id)
}

/** Ordered narration lines for one locale — the TTS / VO booth input. */
export function getIntroAnimaticNarration(locale: IntroAnimaticLocaleId): string[] {
  return INTRO_ANIMATIC_BEATS.map((beat) => beat.narration[locale])
}

export function getIntroAnimaticRuntimeSeconds(): number {
  return INTRO_ANIMATIC_BEATS.reduce((total, beat) => total + beat.durationSeconds, 0)
}

export function formatIntroAnimaticTimecode(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

export function getIntroAnimaticBeatsByAct(
  act: IntroAnimaticAct
): IntroAnimaticBeat[] {
  return INTRO_ANIMATIC_BEATS.filter((beat) => beat.act === act)
}

/**
 * Approximate spoken word count. Chinese and Thai are not space-delimited, so they
 * are estimated from character count instead of whitespace splitting.
 */
export function getIntroAnimaticWordCount(locale: IntroAnimaticLocaleId): number {
  const text = getIntroAnimaticNarration(locale).join(' ')
  if (locale === 'zh' || locale === 'th') {
    const scripted = text.replace(/[\s\p{P}]/gu, '').length
    return Math.round(scripted / (locale === 'zh' ? 1.6 : 3.5))
  }
  return text.split(/\s+/).filter(Boolean).length
}
