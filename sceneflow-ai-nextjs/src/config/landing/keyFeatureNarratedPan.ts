import { PRODUCTION_AND_SCREENING_NARRATED_PAN } from './keyFeatureNarratedPanProduction'

export type FeaturePanLocaleId = 'en' | 'es' | 'pt' | 'hi' | 'zh' | 'ar' | 'th'

export const FEATURE_PAN_LOCALE_OPTIONS: ReadonlyArray<{
  id: FeaturePanLocaleId
  shortLabel: string
  nativeName: string
  speechLang: string
}> = [
  { id: 'en', shortLabel: 'EN', nativeName: 'English', speechLang: 'en-US' },
  { id: 'es', shortLabel: 'ES', nativeName: 'Español', speechLang: 'es-MX' },
  { id: 'pt', shortLabel: 'PT', nativeName: 'Português', speechLang: 'pt-BR' },
  { id: 'hi', shortLabel: 'HI', nativeName: 'हिन्दी', speechLang: 'hi-IN' },
  { id: 'zh', shortLabel: '中文', nativeName: '中文 (简体)', speechLang: 'zh-CN' },
  { id: 'ar', shortLabel: 'AR', nativeName: 'العربية', speechLang: 'ar-SA' },
  { id: 'th', shortLabel: 'TH', nativeName: 'ภาษาไทย', speechLang: 'th-TH' },
]

export function normalizeFeaturePanLocale(locale?: string): FeaturePanLocaleId {
  const cleaned = (locale ?? 'en').trim().toLowerCase()
  if (cleaned.startsWith('zh')) return 'zh'
  const base = cleaned.split(/[-_]/)[0] ?? 'en'
  if (
    base === 'en' ||
    base === 'es' ||
    base === 'pt' ||
    base === 'hi' ||
    base === 'zh' ||
    base === 'ar' ||
    base === 'th'
  ) {
    return base
  }
  return 'en'
}

export type FeaturePanBeat = {
  /** Optional screenshot variant id (e.g., 'overview' -> 'pickups' on FlowDirector) */
  variantId?: string
  fromZoom: number
  toZoom: number
  fromAnchorX: number
  toAnchorX: number
  fromAnchorY: number
  toAnchorY: number
  durationSec: number
  narration: Record<FeaturePanLocaleId, string>
}

export type FeaturePanSpec = {
  icon: string
  beats: readonly FeaturePanBeat[]
}

export type FeaturePanUiCopy = {
  tourBadge: string
  playTourLabel: string
  pauseTourLabel: string
  hearVoiceoverLabel: string
  voiceoverOnLabel: string
  muteVoiceoverLabel: string
  beatPrefix: string
  manualHint: string
  languagePickerTitle: string
}

export const FEATURE_PAN_UI_COPY: Record<FeaturePanLocaleId, FeaturePanUiCopy> = {
  en: {
    tourBadge: '5K Pan Tour',
    playTourLabel: 'Play 5K Tour',
    pauseTourLabel: 'Pause Tour',
    hearVoiceoverLabel: 'Hear Voiceover',
    voiceoverOnLabel: 'Voiceover On',
    muteVoiceoverLabel: 'Mute Voiceover',
    beatPrefix: 'Beat',
    manualHint: 'Drag or zoom anytime for manual 5K inspection',
    languagePickerTitle: 'Select narration language (7 languages)',
  },
  es: {
    tourBadge: 'Tour 5K',
    playTourLabel: 'Reproducir 5K',
    pauseTourLabel: 'Pausar Tour',
    hearVoiceoverLabel: 'Oír Narración',
    voiceoverOnLabel: 'Narración Activa',
    muteVoiceoverLabel: 'Silenciar Voz',
    beatPrefix: 'Paso',
    manualHint: 'Arrastra o haz zoom en cualquier momento para inspeccionar en 5K',
    languagePickerTitle: 'Elegir idioma de narración (7 idiomas)',
  },
  pt: {
    tourBadge: 'Tour 5K',
    playTourLabel: 'Reproduzir 5K',
    pauseTourLabel: 'Pausar Tour',
    hearVoiceoverLabel: 'Ouvir Narração',
    voiceoverOnLabel: 'Narração Ativa',
    muteVoiceoverLabel: 'Silenciar Voz',
    beatPrefix: 'Passo',
    manualHint: 'Arraste ou dê zoom a qualquer momento para inspeção manual em 5K',
    languagePickerTitle: 'Selecionar idioma da narração (7 idiomas)',
  },
  hi: {
    tourBadge: '5K पैन टूर',
    playTourLabel: '5K टूर चलाएँ',
    pauseTourLabel: 'टूर रोकें',
    hearVoiceoverLabel: 'आवाज़ सुनें',
    voiceoverOnLabel: 'वॉइस चालू',
    muteVoiceoverLabel: 'आवाज़ म्यूट करें',
    beatPrefix: 'चरण',
    manualHint: 'मैनुअल 5K ज़ूम के लिए कभी भी ड्रैग या स्क्रॉल करें',
    languagePickerTitle: 'नैरेशन भाषा चुनें (7 भाषाएँ)',
  },
  zh: {
    tourBadge: '5K 导览',
    playTourLabel: '播放5K导览',
    pauseTourLabel: '暂停导览',
    hearVoiceoverLabel: '开启语音解说',
    voiceoverOnLabel: '解说已开启',
    muteVoiceoverLabel: '静音解说',
    beatPrefix: '节点',
    manualHint: '随时拖拽或缩放，自由进入5K手动细看模式',
    languagePickerTitle: '选择配音解说语言（支持7种语言）',
  },
  ar: {
    tourBadge: 'جولة 5K',
    playTourLabel: 'تشغيل جولة 5K',
    pauseTourLabel: 'إيقاف الجولة',
    hearVoiceoverLabel: 'سماع التعليق',
    voiceoverOnLabel: 'الصوت مفعّل',
    muteVoiceoverLabel: 'كتم الصوت',
    beatPrefix: 'خطوة',
    manualHint: 'اسحب أو كبّر في أي وقت للفحص اليدوي بدقة 5K',
    languagePickerTitle: 'اختر لغة التعليق الصوتي (7 لغات)',
  },
  th: {
    tourBadge: 'ทัวร์ 5K',
    playTourLabel: 'เล่นทัวร์ 5K',
    pauseTourLabel: 'หยุดทัวร์',
    hearVoiceoverLabel: 'ฟังเสียงบรรยาย',
    voiceoverOnLabel: 'เปิดเสียงอยู่',
    muteVoiceoverLabel: 'ปิดเสียงบรรยาย',
    beatPrefix: 'ช่วง',
    manualHint: 'ลากหรือซูมได้ทุกเมื่อเพื่อสำรวจภาพ 5K ด้วยตัวเอง',
    languagePickerTitle: 'เลือกภาษาเสียงบรรยาย (รองรับ 7 ภาษา)',
  },
}

const SERIES_AND_BLUEPRINT_NARRATED_PAN: Record<string, FeaturePanSpec> = {
  newSeries: {
    icon: 'newSeries',
    beats: [
      {
        fromZoom: 1.55,
        toZoom: 1.9,
        fromAnchorX: 0.1,
        toAnchorX: -0.1,
        fromAnchorY: 0.92,
        toAnchorY: 0.35,
        durationSec: 6.0,
        narration: {
          en: 'Pitch a multi-episode series, training curriculum, or client legacy anthology in plain language—zero blank-page friction.',
          es: 'Presenta una serie multiepisodio, curso corporativo o antología familiar en lenguaje sencillo sin enfrentar la página en blanco.',
          pt: 'Apresente uma série multiepisódio, curso corporativo ou antologia familiar em linguagem natural sem página em branco.',
          hi: 'बिना किसी तकनीकी जटिलता के सामान्य भाषा में मल्टी-एपिसोड सीरीज़ या क्लाइंट ट्रेनिंग कोर्स का विचार लिखें।',
          zh: '用自然语言描述多集剧集、企业培训课程或家族传记构想，告别空白页创作焦虑。',
          ar: 'قدّم فكرة مسلسل متعدد الحلقات أو منهج تدريبي بلغة طبيعية دون عناء الصفحة البيضاء.',
          th: 'เล่าไอเดียซีรีส์หลายตอน หลักสูตรอบรม หรือชีวประวัติลูกค้าด้วยภาษาพูดทั่วไป เริ่มงานได้ทันทีโดยไม่ต้องกลัวหน้ากระดาษว่าง',
        },
      },
      {
        fromZoom: 1.9,
        toZoom: 1.85,
        fromAnchorX: -0.1,
        toAnchorX: 0.15,
        fromAnchorY: 0.3,
        toAnchorY: -0.35,
        durationSec: 5.8,
        narration: {
          en: 'Clarify and Confirm sharpens your premise, target audience, and visual art style before generating the season baseline.',
          es: 'Clarificar y Confirmar afina tu premisa, público objetivo y estilo visual antes de generar la base de la temporada.',
          pt: 'Clarificar e Confirmar refina sua premissa, público-alvo e estilo visual antes de gerar a base da temporada.',
          hi: 'सीज़न बेसलाइन बनाने से पहले Clarify & Confirm आपके विषय, लक्षित दर्शक और विज़ुअल आर्ट स्टाइल को निखारता है।',
          zh: '智能澄清确认环节在生成全季大纲前，协助打磨核心立意、目标受众与统一视觉画风。',
          ar: 'تعمل خطوة التوضيح والتأكيد على صقل الفكرة والجمهور المستهدف والأسلوب البصري قبل توليد الموسم.',
          th: 'ระบบถามตอบอัจฉริยะช่วยเกลาพล็อต กลุ่มผู้ชม และสไตล์ภาพให้คมชัดก่อนสร้างโครงเรื่องทั้งซีซัน',
        },
      },
      {
        fromZoom: 1.8,
        toZoom: 1.45,
        fromAnchorX: 0.1,
        toAnchorX: 0,
        fromAnchorY: -0.35,
        toAnchorY: -0.88,
        durationSec: 5.8,
        narration: {
          en: 'Click Generate Series to auto-build a complete episode slate, character roster, and reusable world bible in seconds.',
          es: 'Pulsa Generar Serie para construir automáticamente la pizarra de episodios, elenco y biblia del universo en segundos.',
          pt: 'Clique em Gerar Série para criar automaticamente a grade de episódios, elenco e bíblia do universo em segundos.',
          hi: 'Generate Series पर क्लिक करते ही सेकंडों में पूरा एपिसोड स्लेट, किरदार और रीयूज़ेबल सीरीज़ बाइबिल तैयार हो जाती है।',
          zh: '点击生成剧集，数秒内自动构建完整分集片单、常驻角色卡与可复用的世界观圣经。',
          ar: 'اضغط توليد المسلسل لبناء قائمة الحلقات وطاقم الشخصيات وملف العالم القابل لإعادة الاستخدام في ثوانٍ.',
          th: 'คลิกสร้างซีรีส์เพื่อเนรมิตผังตอนทั้งหมด รายชื่อตัวละคร และคัมภีร์จักรวาลที่ใช้ซ้ำได้ในไม่กี่วินาที',
        },
      },
    ],
  },

  seriesReview: {
    icon: 'seriesReview',
    beats: [
      {
        fromZoom: 1.5,
        toZoom: 1.88,
        fromAnchorX: 0.45,
        toAnchorX: -0.25,
        fromAnchorY: 0.85,
        toAnchorY: 0.25,
        durationSec: 6.0,
        narration: {
          en: 'Read or listen to the narrated Season Bible and episode synopses to verify story arcs before scripting a single scene.',
          es: 'Lee o escucha la Biblia de Temporada narrada y las sinopsis para validar los arcos antes de escribir escenas.',
          pt: 'Leia ou ouça a Bíblia da Temporada narrada e as sinopses para validar os arcos antes de roteirizar cenas.',
          hi: 'एक भी सीन लिखने से पहले कहानी की दिशा परखने के लिए ऑडियो नैरेशन के साथ सीज़न बाइबिल और एपिसोड सारांश सुनें।',
          zh: '在编写具体场次剧本前，可阅读或收听语音朗读的全季圣经与分集梗概，快速校验故事走向。',
          ar: 'اقرأ أو استمع إلى ملف الموسم المروي وملخصات الحلقات للتحقق من مسار القصة قبل كتابة المشاهد.',
          th: 'อ่านหรือกดฟังเสียงบรรยายภาพรวมซีซันและเรื่องย่อรายตอน เพื่อเช็กเส้นเรื่องก่อนเริ่มเขียนบทจริง',
        },
      },
      {
        fromZoom: 1.88,
        toZoom: 1.85,
        fromAnchorX: -0.2,
        toAnchorX: 0.4,
        fromAnchorY: 0.2,
        toAnchorY: -0.35,
        durationSec: 6.0,
        narration: {
          en: 'Shared Reference Library locks cast faces, voices, sets, and props once so Episode 1 through Episode 10 never drift.',
          es: 'La Biblioteca Compartida fija rostros, voces, sets y utilería una sola vez para que los episodios 1 al 10 no deriven.',
          pt: 'A Biblioteca Compartilhada trava rostos, vozes, cenários e objetos uma única vez para manter todos os episódios fiéis.',
          hi: 'शेयर्ड रेफरेंस लाइब्रेरी चेहरे, आवाज़ें, सेट और प्रॉप्स एक बार लॉक करती है ताकि एपिसोड 1 से 10 तक कोई बदलाव न आए।',
          zh: '共享参考资产库一次锁定演员面孔、声线、主场景与核心道具，确保第1集到第10集零走样。',
          ar: 'تثبّت المكتبة المشتركة الوجوه والأصوات والمواقع والدعائم مرة واحدة لتبقى متطابقة عبر جميع الحلقات.',
          th: 'คลังเรฟเฟอเรนซ์กลางล็อกใบหน้า เสียง ฉาก และพร็อพครั้งเดียว ใช้ต่อเนื่องตั้งแต่ตอนที่ 1 ถึงตอนจบโดยไม่เพี้ยน',
        },
      },
      {
        fromZoom: 1.8,
        toZoom: 1.45,
        fromAnchorX: 0.25,
        toAnchorX: 0,
        fromAnchorY: -0.35,
        toAnchorY: -0.88,
        durationSec: 5.8,
        narration: {
          en: 'Update a brand host or workplace set once in the Series Bible to propagate consistency across every client training module.',
          es: 'Actualiza un presentador o set una sola vez en la Biblia para propagar consistencia a todos los módulos del cliente.',
          pt: 'Atualize um apresentador ou cenário uma vez na Bíblia para propagar consistência em todos os módulos do cliente.',
          hi: 'सीरीज़ बाइबिल में किसी होस्ट या सेट को एक बार अपडेट करें और बदलाव हर क्लाइंट ट्रेनिंग मॉड्यूल में अपने-आप लागू हो जाएगा।',
          zh: '只需在剧集圣经中更新一次品牌主持人或办公场景，即可自动同步至所有客户培训分集。',
          ar: 'حدّث مقدّم البرنامج أو موقع العمل مرة واحدة في ملف المسلسل لينعكس تلقائياً على جميع الوحدات التدريبية.',
          th: 'อัปเดตพิธีกรหรือฉากออฟฟิศเพียงครั้งเดียวในคัมภีร์ซีรีส์ ระบบจะซิงก์ความต่อเนื่องไปยังทุกบทเรียนของลูกค้าทันที',
        },
      },
    ],
  },

  seriesResonance: {
    icon: 'seriesResonance',
    beats: [
      {
        fromZoom: 1.5,
        toZoom: 1.88,
        fromAnchorX: 0.45,
        toAnchorX: -0.25,
        fromAnchorY: 0.88,
        toAnchorY: 0.25,
        durationSec: 6.0,
        narration: {
          en: 'Series Audience Resonance scores your season arc, cliffhangers, and binge retention curve against your target demographic.',
          es: 'Series Audience Resonance califica el arco de temporada, los cliffhangers y la curva de retención frente a tu audiencia.',
          pt: 'O Series Audience Resonance avalia o arco da temporada, ganchos e curva de retenção junto ao seu público-alvo.',
          hi: 'सीरीज़ ऑडियंस रेज़ोनेंस आपके लक्षित दर्शकों के अनुसार पूरे सीज़न आर्क, क्लिफ़हैंगर और रिटेंशन कर्व को स्कोर करता है।',
          zh: '剧集受众共鸣针对目标人群量化评估全季弧光、集末悬念钩子与追剧留存曲线。',
          ar: 'يقيّم رنين الجمهور مسار الموسم ونهايات الحلقات ومنحنى الاحتفاظ بالمشاهدين وفق جمهورك المستهدف.',
          th: 'วิเคราะห์คะแนนความน่าติดตามของทั้งซีซัน จุดทิ้งท้ายชวนลุ้น และกราฟการดูต่อเนื่องตรงตามกลุ่มเป้าหมาย',
        },
      },
      {
        fromZoom: 1.88,
        toZoom: 1.85,
        fromAnchorX: -0.2,
        toAnchorX: 0.35,
        fromAnchorY: 0.2,
        toAnchorY: -0.35,
        durationSec: 5.8,
        narration: {
          en: 'Spot mid-season pacing dips or underused characters early—before spending credits generating episode scripts or visuals.',
          es: 'Detecta caídas de ritmo a mitad de temporada o personajes desaprovechados antes de gastar créditos de producción.',
          pt: 'Identifique quedas de ritmo no meio da temporada ou personagens subutilizados antes de gastar créditos de produção.',
          hi: 'प्रोडक्शन क्रेडिट्स खर्च करने से पहले ही मध्य-सीज़न की धीमी गति या कम उपयोग हुए किरदारों को पहचान लें।',
          zh: '在投入剧本与视觉算力前，提前发现季中节奏低谷或戏份薄弱的配角隐患。',
          ar: 'اكتشف تراجع الإيقاع في منتصف الموسم أو ضعف حضور الشخصيات مبكراً قبل إنفاق رصيد الإنتاج.',
          th: 'เจอจุดเนือยกลางซีซันหรือตัวละครที่บทจางได้ตั้งแต่เนิ่นๆ ก่อนเสียเครดิตผลิตจริง',
        },
      },
      {
        fromZoom: 1.8,
        toZoom: 1.45,
        fromAnchorX: 0.25,
        toAnchorX: 0,
        fromAnchorY: -0.35,
        toAnchorY: -0.9,
        durationSec: 5.8,
        narration: {
          en: 'Apply data-backed Actionable Insights in one click while keeping complete creative authority in the director’s chair.',
          es: 'Aplica recomendaciones accionables en un clic manteniendo siempre el control creativo total en tus manos.',
          pt: 'Aplique insights acionáveis com um clique mantendo sempre o controle criativo total nas mãos do diretor.',
          hi: 'निदेशक का पूर्ण रचनात्मक नियंत्रण बनाए रखते हुए एक क्लिक में डेटा-आधारित सुझाव लागू करें।',
          zh: '一键采纳数据驱动的剧本改进建议，同时将最终创作决定权牢牢掌握在导演手中。',
          ar: 'طبّق التوصيات العملية بنقرة واحدة مع الاحتفاظ بالقرار الإبداعي الكامل في يد المخرج.',
          th: 'กดนำคำแนะนำเชิงลึกไปปรับใช้ได้ในคลิกเดียว โดยที่คุณยังกุมอำนาจตัดสินใจสูงสุดในฐานะผู้กำกับ',
        },
      },
    ],
  },

  seriesDirector: {
    icon: 'seriesDirector',
    beats: [
      {
        fromZoom: 1.5,
        toZoom: 1.88,
        fromAnchorX: 0.45,
        toAnchorX: -0.25,
        fromAnchorY: 0.8,
        toAnchorY: 0.2,
        durationSec: 5.8,
        narration: {
          en: 'Reshape an entire season by voice or text—shift tone, raise stakes, or evolve a character arc across all episodes at once.',
          es: 'Rediseña toda la temporada por voz o texto: ajusta tono, sube la apuesta o evoluciona un arco en todos los episodios.',
          pt: 'Remodele toda a temporada por voz ou texto: mude o tom, eleve a tensão ou evolua um arco em todos os episódios.',
          hi: 'आवाज़ या टेक्स्ट से पूरे सीज़न को नया रूप दें—टोन बदलें, रोमांच बढ़ाएँ या सभी एपिसोड्स में किरदार का विकास करें।',
          zh: '用语音或文字重塑整季走向：统一调整基调、拉高戏剧冲突或贯穿升级人物弧光。',
          ar: 'أعد تشكيل الموسم بالكامل صوتياً أو نصياً لتعديل النبرة أو رفع التوتر عبر جميع الحلقات دفعة واحدة.',
          th: 'สั่งปรับทั้งซีซันด้วยเสียงหรือข้อความ เปลี่ยนโทนเรื่อง เพิ่มความเข้มข้น หรือปรับเส้นเรื่องตัวละครรวดเดียวทุกตอน',
        },
      },
      {
        fromZoom: 1.88,
        toZoom: 1.85,
        fromAnchorX: -0.2,
        toAnchorX: 0.35,
        fromAnchorY: 0.15,
        toAnchorY: -0.35,
        durationSec: 5.8,
        narration: {
          en: 'Preview surgical multi-episode revisions side by side while unrelated storylines and locked continuity stay untouched.',
          es: 'Previsualiza revisiones quirúrgicas lado a lado sin alterar tramas no relacionadas ni la continuidad bloqueada.',
          pt: 'Visualize revisões cirúrgicas lado a lado mantendo tramas não relacionadas e a continuidade totalmente intactas.',
          hi: 'अन्य कथानकों और लॉक किए गए कंटिन्यूटी को छेड़े बिना मल्टी-एपिसोड बदलावों का साइड-बाय-साइड प्रीव्यू देखें।',
          zh: '并排预览跨集精准修订对比，无关故事支线与已锁定的连续性设定完好无损。',
          ar: 'عاين التعديلات الدقيقة جنباً إلى جنب مع بقاء الخطوط الدرامية الأخرى والاستمرارية المثبّتة دون مساس.',
          th: 'เทียบดูร่างแก้ไขหลายตอนแบบเคียงข้างกัน โดยที่เส้นเรื่องอื่นและความต่อเนื่องที่ล็อกไว้ไม่กระทบ',
        },
      },
      {
        fromZoom: 1.8,
        toZoom: 1.45,
        fromAnchorX: 0.25,
        toAnchorX: 0,
        fromAnchorY: -0.35,
        toAnchorY: -0.85,
        durationSec: 5.6,
        narration: {
          en: 'Nothing mutates your Series Bible until you click Accept—giving client PMs safe, rapid iteration.',
          es: 'Nada modifica tu Biblia de Serie hasta pulsar Aceptar, brindando iteración rápida y segura a los gestores.',
          pt: 'Nada altera sua Bíblia de Série até clicar em Aceitar, garantindo iteração rápida e segura aos produtores.',
          hi: 'जब तक आप Accept पर क्लिक नहीं करते तब तक सीरीज़ बाइबिल सुरक्षित रहती है—प्रोजेक्ट मैनेजर्स के लिए तेज़ और सुरक्षित।',
          zh: '点击确认前绝不改动剧集圣经原稿，让项目经理在与客户共创时安全、快速地迭代。',
          ar: 'لا يتغير شيء في ملف المسلسل حتى تضغط قبول، مما يمنح مديري المشاريع تكراراً آمناً وسريعاً.',
          th: 'ข้อมูลหลักจะไม่เปลี่ยนจนกว่าคุณจะกดยืนยัน ช่วยให้ PM ปรับแก้ตามคอมเมนต์ลูกค้าได้อย่างปลอดภัยและรวดเร็ว',
        },
      },
    ],
  },

  directEpisode: {
    icon: 'directEpisode',
    beats: [
      {
        fromZoom: 1.5,
        toZoom: 1.88,
        fromAnchorX: 0.45,
        toAnchorX: -0.25,
        fromAnchorY: 0.85,
        toAnchorY: 0.25,
        durationSec: 5.8,
        narration: {
          en: 'Zoom into any single episode to refine its cold open, act structure, or climax in complete isolation.',
          es: 'Entra en cualquier episodio individual para pulir su apertura, estructura de actos o clímax de forma aislada.',
          pt: 'Entre em qualquer episódio individual para refinar sua abertura, estrutura de atos ou clímax isoladamente.',
          hi: 'बाकी एपिसोड्स से अलग रहकर किसी भी एक एपिसोड के कोल्ड-ओपन, एक्ट संरचना या क्लाइमेक्स को निखारें।',
          zh: '单独聚焦任意一集，独立打磨开场钩子、幕次结构或高潮转折。',
          ar: 'ركّز على أي حلقة منفردة لصقل افتتاحيتها أو بنيتها الدرامية أو ذروتها بمعزل تام.',
          th: 'เจาะจงปรับแก้เฉพาะตอนที่ต้องการ ทั้งฉากเปิด โครงสร้างองก์ หรือจุดไคลแมกซ์แบบแยกอิสระ',
        },
      },
      {
        fromZoom: 1.88,
        toZoom: 1.85,
        fromAnchorX: -0.2,
        toAnchorX: 0.35,
        fromAnchorY: 0.2,
        toAnchorY: -0.35,
        durationSec: 5.8,
        narration: {
          en: 'Neighboring episodes and the overarching Season Bible stay locked so single-module client updates never ripple unintentionally.',
          es: 'Los episodios vecinos y la Biblia general quedan bloqueados para que ajustes puntuales no afecten al resto.',
          pt: 'Os episódios vizinhos e a Bíblia geral permanecem travados para que ajustes pontuais não afetem o restante.',
          hi: 'आस-पास के एपिसोड और मुख्य सीज़न बाइबिल लॉक रहते हैं ताकि एक मॉड्यूल का बदलाव बाकी सीरीज़ को प्रभावित न करे।',
          zh: '相邻分集与全季总纲保持锁定，客户对单集课件的修改绝不会意外波及其他剧集。',
          ar: 'تبقى الحلقات المجاورة وملف الموسم العام مقفلين حتى لا تؤثر تعديلات حلقة واحدة على البقية.',
          th: 'ตอนข้างเคียงและคัมภีร์หลักถูกล็อกไว้ การแก้บทเรียนตอนเดียวของลูกค้าจึงไม่กระทบตอนอื่น',
        },
      },
      {
        fromZoom: 1.8,
        toZoom: 1.45,
        fromAnchorX: 0.25,
        toAnchorX: 0,
        fromAnchorY: -0.35,
        toAnchorY: -0.88,
        durationSec: 5.6,
        narration: {
          en: 'Polish episode hooks until they shine, then hand off directly into the Blueprint Room.',
          es: 'Pule los ganchos del episodio hasta que brillen y pásalo directamente a la Sala de Blueprint.',
          pt: 'Refine os ganchos do episódio até ficarem perfeitos e envie direto para a Sala de Blueprint.',
          hi: 'एपिसोड के हर मोड़ को चमकाने के बाद उसे सीधे ब्लूप्रिंट रूम में लॉन्च करें।',
          zh: '将单集悬念与节奏打磨到位后，一键无缝移交至蓝图室展开精细制作。',
          ar: 'اصقل تفاصيل الحلقة حتى تكتمل ثم انقلها مباشرة إلى غرفة المخطط.',
          th: 'เกลาจังหวะของตอนให้คมกริบ แล้วส่งต่อไปยังห้อง Blueprint ได้ทันที',
        },
      },
    ],
  },

  startEpisode: {
    icon: 'startEpisode',
    beats: [
      {
        fromZoom: 1.5,
        toZoom: 1.88,
        fromAnchorX: 0.35,
        toAnchorX: -0.25,
        fromAnchorY: 0.85,
        toAnchorY: 0.25,
        durationSec: 5.8,
        narration: {
          en: 'Launch any approved episode into the Blueprint Room in one click—bringing its synopsis, beats, and cast pre-wired.',
          es: 'Lanza cualquier episodio aprobado a la Sala de Blueprint en un clic con sinopsis, beats y elenco ya conectados.',
          pt: 'Lance qualquer episódio aprovado na Sala de Blueprint com um clique, trazendo sinopse, beats e elenco pré-conectados.',
          hi: 'किसी भी स्वीकृत एपिसोड को एक क्लिक में ब्लूप्रिंट रूम में लॉन्च करें—सारांश, बीट्स और कास्ट पहले से जुड़े मिलते हैं।',
          zh: '一键将获批分集送入蓝图室，分集梗概、节拍表与常驻演员自动挂载就绪。',
          ar: 'أطلق أي حلقة معتمدة إلى غرفة المخطط بنقرة واحدة مع انتقال الملخص والإيقاعات والطاقم تلقائياً.',
          th: 'ส่งตอนที่อนุมัติแล้วเข้าห้อง Blueprint ในคลิกเดียว พร้อมเรื่องย่อ บีต และนักแสดงที่เชื่อมไว้ให้ครบ',
        },
      },
      {
        fromZoom: 1.88,
        toZoom: 1.85,
        fromAnchorX: -0.2,
        toAnchorX: 0.35,
        fromAnchorY: 0.2,
        toAnchorY: -0.35,
        durationSec: 5.8,
        narration: {
          en: 'Voice profiles, wardrobes, locations, and art direction transfer automatically with zero manual copy-paste.',
          es: 'Voces, vestuarios, locaciones y dirección de arte se transfieren automáticamente sin copiar ni pegar nada.',
          pt: 'Vozes, figurinos, cenários e direção de arte são transferidos automaticamente sem copiar e colar nada.',
          hi: 'बिना किसी मैनुअल कॉपी-पेस्ट के वॉइस प्रोफ़ाइल, कॉस्ट्यूम, लोकेशन और आर्ट डायरेक्शन अपने-आप ट्रांसफ़र होते हैं।',
          zh: '声线配置、服装设定、场景图与视觉画风全程自动继承，无需任何手动复制粘贴。',
          ar: 'تنتقل الأصوات والأزياء والمواقع والتوجه الفني تلقائياً دون أي نسخ أو إدخال يدوي.',
          th: 'โปรไฟล์เสียง ชุด โลเคชัน และสไตล์ภาพถูกดึงมาให้อัตโนมัติ ไม่ต้องเสียเวลาก๊อปปี้วางใหม่',
        },
      },
      {
        fromZoom: 1.8,
        toZoom: 1.45,
        fromAnchorX: 0.25,
        toAnchorX: 0,
        fromAnchorY: -0.35,
        toAnchorY: -0.88,
        durationSec: 5.6,
        narration: {
          en: 'Spin up multiple episodes in parallel so one operator can run 20 active series and client projects simultaneously.',
          es: 'Inicia múltiples episodios en paralelo para que un solo operador gestione 20 proyectos activos a la vez.',
          pt: 'Dispare múltiplos episódios em paralelo para que um operador gerencie 20 projetos ativos simultaneamente.',
          hi: 'एक साथ कई एपिसोड समानांतर चलाएँ ताकि एक ऑपरेटर 20 सक्रिय प्रोजेक्ट्स आसानी से संभाल सके।',
          zh: '支持多集并行立项推进，让单名项目经理也能轻松驾驭20个同步运转的客户项目。',
          ar: 'شغّل عدة حلقات بالتوازي ليتمكن مشغّل واحد من إدارة عشرين مشروعاً نشطاً في آن واحد.',
          th: 'เปิดผลิตหลายตอนขนานกันได้ทันที ช่วยให้ผู้ดูแลคนเดียวบริหารงาน 20 โปรเจกต์พร้อมกันได้สบาย',
        },
      },
    ],
  },

  startBlueprint: {
    icon: 'startBlueprint',
    beats: [
      {
        fromZoom: 1.5,
        toZoom: 1.88,
        fromAnchorX: 0.4,
        toAnchorX: -0.25,
        fromAnchorY: 0.85,
        toAnchorY: 0.25,
        durationSec: 6.0,
        narration: {
          en: 'Start a Blueprint from a Series episode, a story-first client interview, or an imported PDF, FDX, or Fountain script.',
          es: 'Inicia un Blueprint desde un episodio de Serie, una entrevista al cliente o importando un guion PDF, FDX o Fountain.',
          pt: 'Inicie um Blueprint a partir de um episódio, entrevista com o cliente ou importando roteiro PDF, FDX ou Fountain.',
          hi: 'सीरीज़ एपिसोड, क्लाइंट के कहानी इंटरव्यू या PDF, FDX और Fountain स्क्रिप्ट इम्पोर्ट से ब्लूप्रिंट शुरू करें।',
          zh: '可从剧集分集、客户故事访谈，或直接导入 PDF、FDX、Fountain 剧本开启蓝图创作。',
          ar: 'ابدأ المخطط من حلقة مسلسل أو مقابلة قصصية مع العميل أو باستيراد نص PDF أو FDX أو Fountain.',
          th: 'เริ่มสร้าง Blueprint ได้ทั้งจากตอนของซีรีส์ บทสัมภาษณ์เรื่องราวลูกค้า หรือนำเข้าไฟล์บท PDF, FDX และ Fountain',
        },
      },
      {
        fromZoom: 1.88,
        toZoom: 1.85,
        fromAnchorX: -0.2,
        toAnchorX: 0.35,
        fromAnchorY: 0.2,
        toAnchorY: -0.35,
        durationSec: 5.8,
        narration: {
          en: 'Validate & Enhance extracts characters, period settings, and dramatic beats automatically into a structured film treatment.',
          es: 'Validar y Mejorar extrae personajes, épocas y beats dramáticos automáticamente en un tratamiento estructurado.',
          pt: 'Validar e Aprimorar extrai personagens, épocas e beats dramáticos automaticamente em um argumento estruturado.',
          hi: 'Validate & Enhance किरदारों, समय-काल और नाटकीय मोड़ों को अपने-आप एक व्यवस्थित फ़िल्म ट्रीटमेंट में बदल देता है।',
          zh: '智能校验增强引擎自动提炼人物关系、年代背景与戏剧节拍，一键生成结构化影视阐述。',
          ar: 'يستخرج التحقق الذكي الشخصيات والحقب الزمنية والمنعطفات الدرامية تلقائياً في معالجة سينمائية منظمة.',
          th: 'ระบบวิเคราะห์และยกระดับพล็อตช่วยดึงตัวละคร ยุคสมัย และบีตสำคัญออกมาเป็นโครงเรื่องภาพยนตร์ให้อัตโนมัติ',
        },
      },
      {
        fromZoom: 1.8,
        toZoom: 1.45,
        fromAnchorX: 0.25,
        toAnchorX: 0,
        fromAnchorY: -0.35,
        toAnchorY: -0.88,
        durationSec: 5.8,
        narration: {
          en: 'Listen to the narrated logline and synopsis—or share a clean Blueprint link for instant client sign-off.',
          es: 'Escucha el logline y la sinopsis narrados o comparte un enlace limpio de Blueprint para aprobación del cliente.',
          pt: 'Ouça o logline e a sinopse narrados ou envie um link limpo de Blueprint para aprovação rápida do cliente.',
          hi: 'ऑडियो लॉगलाइन और सारांश सुनें, या त्वरित क्लाइंट मंज़ूरी के लिए साफ़ ब्लूप्रिंट लिंक साझा करें।',
          zh: '收听语音朗读的故事梗概，或直接发送整洁的蓝图审阅链接供客户在线签字确认。',
          ar: 'استمع إلى الملخص المروي أو شارك رابط المخطط النظيف لاعتماد العميل الفوري.',
          th: 'กดฟังเสียงบรรยายเรื่องย่อ หรือแชร์ลิงก์ Blueprint สะอาดตาให้ลูกค้ากดอนุมัติได้ทันที',
        },
      },
    ],
  },

  treatment: {
    icon: 'treatment',
    beats: [
      {
        fromZoom: 1.75,
        toZoom: 2.05,
        fromAnchorX: 0,
        toAnchorX: 0,
        fromAnchorY: 0.96,
        toAnchorY: 0.35,
        durationSec: 6.0,
        narration: {
          en: 'The Beat Sheet structures the dramatic spine of your film in the Blueprint Room before a single line of dialogue is written.',
          es: 'La Hoja de Beats estructura la columna dramática de tu película en Blueprint antes de escribir una sola línea de diálogo.',
          pt: 'A Folha de Beats estrutura a espinha dramática do filme no Blueprint antes que qualquer diálogo seja escrito.',
          hi: 'संवाद लिखने से पहले ही बीट शीट ब्लूप्रिंट रूम में आपकी फ़िल्म की मज़बूत नाटकीय रीढ़ तैयार करती है।',
          zh: '节拍表在动笔写台词之前，先于蓝图室内搭建起全片严密的戏剧骨架。',
          ar: 'يبني جدول الإيقاعات العمود الفقري الدرامي لفيلمك في غرفة المخطط قبل كتابة سطر حوار واحد.',
          th: 'Beat Sheet วางโครงกระดูกดราม่าของหนังในห้อง Blueprint ให้แน่นหนาก่อนเริ่มเขียนบทพูดจริง',
        },
      },
      {
        fromZoom: 2.05,
        toZoom: 2.05,
        fromAnchorX: 0,
        toAnchorX: 0,
        fromAnchorY: 0.35,
        toAnchorY: -0.35,
        durationSec: 6.0,
        narration: {
          en: 'Audition beats aloud with studio narration, reorder acts, and verify participating characters on every life or brand milestone.',
          es: 'Escucha los beats en voz alta, reordena actos y verifica los personajes que participan en cada hito clave.',
          pt: 'Ouça os beats em voz alta, reordene atos e confira os personagens presentes em cada marco da história.',
          hi: 'स्टूडियो नैरेशन में बीट्स सुनें, एक्ट्स का क्रम बदलें और हर मोड़ पर शामिल किरदारों की पुष्टि करें।',
          zh: '通过语音朗读试听叙事韵律，自由调整幕次顺序，并核对每个关键节点登场的人物。',
          ar: 'استمع إلى الإيقاعات بصوت الاستوديو وأعد ترتيب الفصول وتحقّق من الشخصيات المشاركة في كل محطة.',
          th: 'กดฟังเสียงอ่านบีตเพื่อเช็กจังหวะ สลับลำดับองก์ และตรวจสอบตัวละครในแต่ละเหตุการณ์สำคัญ',
        },
      },
      {
        fromZoom: 2.05,
        toZoom: 1.75,
        fromAnchorX: 0,
        toAnchorX: 0,
        fromAnchorY: -0.35,
        toAnchorY: -0.95,
        durationSec: 5.8,
        narration: {
          en: 'Every locked Blueprint beat maps automatically into a dedicated chapter on the Production Stage.',
          es: 'Cada beat bloqueado en el Blueprint se convierte automáticamente en un capítulo dedicado en Producción.',
          pt: 'Cada beat travado no Blueprint se transforma automaticamente em um capítulo dedicado na Produção.',
          hi: 'ब्लूप्रिंट में लॉक किया गया हर बीट प्रोडक्शन स्टेज पर अपने-आप एक समर्पित चैप्टर में बदल जाता है।',
          zh: '蓝图中锁定的每一个故事节拍，都会在进入制片舞台后自动映射为独立制作章节。',
          ar: 'يتحول كل إيقاع معتمد في المخطط تلقائياً إلى فصل إنتاجي مستقل على منصة الإنتاج.',
          th: 'ทุกบีตที่ล็อกไว้ใน Blueprint จะถูกแปลงเป็นบทการผลิต (Chapter) บน Production Stage ให้อัตโนมัติ',
        },
      },
    ],
  },

  castLocations: {
    icon: 'castLocations',
    beats: [
      {
        fromZoom: 1.75,
        toZoom: 2.05,
        fromAnchorX: 0,
        toAnchorX: 0,
        fromAnchorY: 0.96,
        toAnchorY: 0.3,
        durationSec: 6.0,
        narration: {
          en: 'Design rich character profiles, multi-age portraits (like Age 17, 32, and 62), and vocal identities up front.',
          es: 'Diseña perfiles profundos, retratos multiedad (como 17, 32 y 62 años) e identidades vocales desde el inicio.',
          pt: 'Defina perfis ricos, retratos em múltiplas idades (17, 32 e 62 anos) e identidades vocais desde o início.',
          hi: 'शुरुआत में ही समृद्ध कैरेक्टर प्रोफ़ाइल, अलग-अलग उम्र के रूप (जैसे 17, 32 और 62 वर्ष) और वॉइस पहचान तय करें।',
          zh: '在前期即建立丰满的人物档案、跨年龄阶段肖像（如17岁、32岁、62岁）与专属声线设定。',
          ar: 'صمّم ملفات الشخصيات ومراحلها العمرية المتعددة وبصماتها الصوتية منذ البداية.',
          th: 'ออกแบบโปรไฟล์ตัวละครเชิงลึก แยกช่วงวัยชัดเจน (เช่น วัย 17, 32 และ 62 ปี) พร้อมกำหนดโทนเสียงตั้งแต่ต้น',
        },
      },
      {
        fromZoom: 2.05,
        toZoom: 2.05,
        fromAnchorX: 0,
        toAnchorX: 0,
        fromAnchorY: 0.3,
        toAnchorY: -0.35,
        durationSec: 6.0,
        narration: {
          en: 'Anchor era settings, lighting palettes, and hero locations on the Story tab so the screenplay writes directly to your world.',
          es: 'Fija épocas, paletas de luz y locaciones principales para que el guion se escriba exactamente para tu mundo.',
          pt: 'Ancore épocas, paletas de luz e cenários principais para que o roteiro nasça fiel ao seu universo.',
          hi: 'स्टोरी टैब पर युग, लाइटिंग पैलेट और प्रमुख लोकेशन तय करें ताकि पूरी स्क्रिप्ट आपकी दुनिया के अनुरूप लिखी जाए।',
          zh: '在故事页锚定年代氛围、光影色调与核心场景，让生成的剧本从第一页起就严丝合缝。',
          ar: 'ثبّت الحقبة الزمنية ولوحات الإضاءة والمواقع الرئيسية ليُكتب السيناريو متطابقاً مع عالمك.',
          th: 'ล็อกยุคสมัย โทนแสง และโลเคชันหลักไว้ในแท็บเนื้อเรื่อง เพื่อให้บทที่เขียนออกมาตรงกับโลกของคุณตั้งแต่หน้าแรก',
        },
      },
      {
        fromZoom: 2.05,
        toZoom: 1.75,
        fromAnchorX: 0,
        toAnchorX: 0,
        fromAnchorY: -0.35,
        toAnchorY: -0.95,
        durationSec: 5.8,
        narration: {
          en: 'Locking cast and world before compilation eliminates costly mid-production rewrites across client projects.',
          es: 'Bloquear elenco y mundo antes de compilar elimina costosas reescrituras a mitad de la producción.',
          pt: 'Travar elenco e mundo antes da compilação elimina reescritas caras no meio da produção dos clientes.',
          hi: 'स्क्रिप्ट बनने से पहले कास्ट और लोकेशन लॉक करने से प्रोडक्शन के बीच महँगे बदलावों की ज़रूरत खत्म हो जाती है।',
          zh: '编译剧本前先行锁定阵容与世界观，彻底杜绝中期昂贵的返工重写与连续性错位。',
          ar: 'إن تثبيت الطاقم والمواقع قبل تجميع النص يلغي عمليات إعادة الكتابة المكلفة أثناء الإنتاج.',
          th: 'การล็อกนักแสดงและฉากก่อนสร้างบทจริง ช่วยตัดปัญหางานแก้รื้อบทกลางคันที่สิ้นเปลืองงบและเวลา',
        },
      },
    ],
  },

  blueprintDirector: {
    icon: 'blueprintDirector',
    beats: [
      {
        fromZoom: 1.5,
        toZoom: 1.88,
        fromAnchorX: 0.45,
        toAnchorX: -0.25,
        fromAnchorY: 0.8,
        toAnchorY: 0.2,
        durationSec: 5.8,
        narration: {
          en: 'Speak or type your creative notes into the Blueprint Director to revise Beats, Characters, or Story without prompt syntax.',
          es: 'Habla o escribe tus notas en Blueprint Director para ajustar Beats, Personajes o Historia sin sintaxis técnica.',
          pt: 'Fale ou digite suas notas no Blueprint Director para revisar Beats, Personagens ou História sem prompts técnicos.',
          hi: 'बिना किसी प्रॉम्प्ट सिंटैक्स के बीट्स, किरदार या कहानी सुधारने हेतु ब्लूप्रिंट डायरेक्टर में बोलकर या लिखकर नोट्स दें।',
          zh: '用自然语音或文字向蓝图导演口述修改意见，定向调整节拍、人物或主线，无需任何提示词语法。',
          ar: 'تحدّث أو اكتب ملاحظاتك لمخرج المخطط لتعديل الإيقاعات أو الشخصيات أو القصة دون أوامر تقنية.',
          th: 'พูดหรือพิมพ์คอมเมนต์ลงใน Blueprint Director เพื่อปรับแก้บีต ตัวละคร หรือเนื้อเรื่องได้โดยไม่ต้องใช้โค้ดพรอมต์',
        },
      },
      {
        fromZoom: 1.88,
        toZoom: 1.85,
        fromAnchorX: -0.2,
        toAnchorX: 0.35,
        fromAnchorY: 0.15,
        toAnchorY: -0.35,
        durationSec: 5.8,
        narration: {
          en: 'Inspect a balanced side-by-side revision preview complete with story reasoning before committing a single change.',
          es: 'Revisa una vista previa equilibrada lado a lado con razonamiento narrativo antes de confirmar cualquier cambio.',
          pt: 'Analise uma prévia lado a lado com justificativa narrativa antes de confirmar qualquer alteração no projeto.',
          hi: 'कोई भी बदलाव पक्का करने से पहले कहानी के तर्क के साथ संतुलित साइड-बाय-साइड प्रीव्यू की जाँच करें।',
          zh: '在正式提交更改前，并排审阅修订前后对比及背后的戏剧逻辑阐释。',
          ar: 'افحص معاينة متوازنة جنباً إلى جنب مع التبرير الدرامي قبل اعتماد أي تعديل في مخططك.',
          th: 'ตรวจดูร่างแก้ไขเทียบเคียงของเดิมพร้อมเหตุผลเชิงโครงสร้างเรื่อง ก่อนตัดสินใจกดบันทึกจริง',
        },
      },
      {
        fromZoom: 1.8,
        toZoom: 1.45,
        fromAnchorX: 0.25,
        toAnchorX: 0,
        fromAnchorY: -0.35,
        toAnchorY: -0.85,
        durationSec: 5.6,
        narration: {
          en: 'Iterate with clients in minutes during live review calls while holding 100% creative lock.',
          es: 'Itera con tus clientes en minutos durante llamadas en vivo manteniendo siempre el bloqueo creativo total.',
          pt: 'Itere com clientes em minutos durante reuniões ao vivo mantendo sempre 100% da trava criativa.',
          hi: '100% क्रिएटिव लॉक बनाए रखते हुए लाइव कॉल के दौरान मिनटों में क्लाइंट के साथ बदलाव पूरे करें।',
          zh: '在与客户连线沟通时数分钟内即可完成方案迭代，全程牢牢把控创作安全锁。',
          ar: 'نفّذ ملاحظات العميل في دقائق أثناء اجتماعات المراجعة المباشرة مع الحفاظ على القفل الإبداعي الكامل.',
          th: 'ปรับแก้ตามบรีฟลูกค้าได้ในไม่กี่นาทีระหว่างคุยงานสด พร้อมล็อกต้นฉบับเดิมไว้อย่างปลอดภัย 100%',
        },
      },
    ],
  },

  blueprintResonance: {
    icon: 'blueprintResonance',
    beats: [
      {
        fromZoom: 1.7,
        toZoom: 2.0,
        fromAnchorX: -0.65,
        toAnchorX: -0.85,
        fromAnchorY: 0.96,
        toAnchorY: 0.3,
        durationSec: 6.0,
        narration: {
          en: 'Blueprint Audience Resonance scores your treatment against saved cultural, genre, and buyer profiles before script generation.',
          es: 'Blueprint Audience Resonance evalúa tu tratamiento según cultura, género y perfil de audiencia antes de generar el guion.',
          pt: 'O Blueprint Audience Resonance avalia seu argumento conforme cultura, gênero e público antes de gerar o roteiro.',
          hi: 'स्क्रिप्ट बनने से पहले ब्लूप्रिंट ऑडियंस रेज़ोनेंस आपकी ट्रीटमेंट को लक्षित संस्कृति, जॉनर और दर्शकों की कसौटी पर परखता है।',
          zh: '蓝图受众共鸣在生成剧本前，对照目标文化背景、类型偏好与受众画像进行多维打分。',
          ar: 'يقيّم رنين الجمهور في المخطط معالجتك وفق الثقافة والنوع وملف المشاهدين قبل توليد السيناريو.',
          th: 'ประเมินคะแนนโครงเรื่องเทียบกับวัฒนธรรม แนวหนัง และโปรไฟล์ผู้ชมเป้าหมายก่อนเริ่มเจนบทภาพยนตร์',
        },
      },
      {
        fromZoom: 2.0,
        toZoom: 2.0,
        fromAnchorX: -0.85,
        toAnchorX: -0.5,
        fromAnchorY: 0.3,
        toAnchorY: -0.35,
        durationSec: 6.0,
        narration: {
          en: 'Every diagnostic pairs structural risk detection with a concrete rewrite remedy tailored to your exact beat sheet.',
          es: 'Cada diagnóstico une la detección de riesgos estructurales con una mejora concreta adaptada a tu hoja de beats.',
          pt: 'Cada diagnóstico une a detecção de riscos estruturais a uma solução prática sob medida para sua folha de beats.',
          hi: 'हर विश्लेषण संरचनात्मक जोखिम की पहचान के साथ आपकी बीट शीट के लिए सटीक सुधार सुझाव देता है।',
          zh: '每项诊断不仅指出结构性风险，还针对当前节拍表与人物关系给出可直接落地的改写良方。',
          ar: 'يربط كل تشخيص بين اكتشاف المخاطر البنيوية وتوصية معالجة عملية مخصّصة لجدول إيقاعاتك.',
          th: 'ทุกคำวินิจฉัยชี้จุดเสี่ยงเชิงโครงสร้าง พร้อมเสนอแนวทางปรับแก้ที่ออกแบบมาเฉพาะสำหรับบีตและตัวละครของคุณ',
        },
      },
      {
        fromZoom: 2.0,
        toZoom: 1.65,
        fromAnchorX: -0.5,
        toAnchorX: -0.75,
        fromAnchorY: -0.35,
        toAnchorY: -0.95,
        durationSec: 5.8,
        narration: {
          en: 'Send selective fixes straight into the Blueprint Director to greenlight high-converting stories with confidence.',
          es: 'Envía mejoras selectivas directo al Blueprint Director para dar luz verde a historias de alto impacto con confianza.',
          pt: 'Envie melhorias seletivas direto ao Blueprint Director para aprovar histórias de alto impacto com confiança.',
          hi: 'चुनिंदा सुधार सीधे ब्लूप्रिंट डायरेक्टर में भेजें और पूरे आत्मविश्वास के साथ कहानी को ग्रीनलाइट करें।',
          zh: '勾选心仪建议一键送入蓝图导演修订，满怀把握地为高转化率好故事亮起绿灯。',
          ar: 'أرسل التحسينات المختارة مباشرة إلى مخرج المخطط لاعتماد قصص عالية التأثير بثقة تامة.',
          th: 'ส่งข้อเสนอแนะที่เลือกเข้าสู่ Blueprint Director ได้ทันที มั่นใจเต็มร้อยก่อนไฟเขียวเข้าสู่การผลิตจริง',
        },
      },
    ],
  },

  goToProduction: {
    icon: 'goToProduction',
    beats: [
      {
        fromZoom: 1.5,
        toZoom: 1.88,
        fromAnchorX: 0.45,
        toAnchorX: -0.25,
        fromAnchorY: 0.85,
        toAnchorY: 0.25,
        durationSec: 6.0,
        narration: {
          en: 'Once your client approves the shared Blueprint link, click Greenlight to step directly onto the Production Stage.',
          es: 'Cuando el cliente aprueba el enlace de Blueprint compartido, pulsa Luz Verde para pasar directo al Escenario de Producción.',
          pt: 'Quando o cliente aprovar o link de Blueprint compartilhado, clique em Luz Verde para avançar direto à Produção.',
          hi: 'क्लाइंट द्वारा शेयर्ड ब्लूप्रिंट लिंक मंज़ूर होते ही ग्रीनलाइट दबाएँ और सीधे प्रोडक्शन स्टेज पर कदम रखें।',
          zh: '客户在共享蓝图链接上签字确认后，点击绿灯立项即可一步跨入全流程制片舞台。',
          ar: 'فور اعتماد العميل لرابط المخطط المشترك، اضغط الضوء الأخضر للانتقال مباشرة إلى منصة الإنتاج.',
          th: 'เมื่อลูกค้ากดอนุมัติลิงก์ Blueprint แล้ว กดไฟเขียวเพื่อก้าวเข้าสู่ Production Stage ได้ทันที',
        },
      },
      {
        fromZoom: 1.88,
        toZoom: 1.85,
        fromAnchorX: -0.2,
        toAnchorX: 0.35,
        fromAnchorY: 0.2,
        toAnchorY: -0.35,
        durationSec: 5.8,
        narration: {
          en: 'SceneFlow compiles the full multi-chapter screenplay automatically—with beats, cast, wardrobes, and locations pre-wired.',
          es: 'SceneFlow compila el guion multicapítulo automáticamente con beats, elenco, vestuarios y locaciones ya conectados.',
          pt: 'O SceneFlow compila o roteiro multicapítulo automaticamente com beats, elenco, figurinos e cenários pré-conectados.',
          hi: 'SceneFlow बीट्स, कास्ट, वार्डरोब और लोकेशन को जोड़ते हुए अपने-आप पूरा मल्टी-चैप्टर स्क्रीनप्ले तैयार कर देता है।',
          zh: '系统自动编译多章节完整剧本，节拍结构、演员阵容、服装与场景参考全部预先挂载就位。',
          ar: 'يجمّع النظام السيناريو الكامل متعدد الفصول تلقائياً مع ربط الإيقاعات والطاقم والأزياء والمواقع مسبقاً.',
          th: 'ระบบคอมไพล์บทภาพยนตร์หลายบทให้อัตโนมัติ พร้อมผูกบีต นักแสดง ชุด และโลเคชันเตรียมไว้เสร็จสรรพ',
        },
      },
      {
        fromZoom: 1.8,
        toZoom: 1.45,
        fromAnchorX: 0.25,
        toAnchorX: 0,
        fromAnchorY: -0.35,
        toAnchorY: -0.9,
        durationSec: 5.8,
        narration: {
          en: 'Your project is immediately ready for autonomous Audio, Stills, Clips, and FlowDirector review agents.',
          es: 'Tu proyecto queda listo al instante para los agentes autónomos de Audio, Stills, Clips y revisión FlowDirector.',
          pt: 'Seu projeto fica imediatamente pronto para os agentes autônomos de Áudio, Stills, Clipes e revisão FlowDirector.',
          hi: 'आपका प्रोजेक्ट तुरंत स्वायत्त ऑडियो, स्टिल्स, क्लिप्स और FlowDirector रिव्यू एजेंट्स के लिए तैयार हो जाता है।',
          zh: '项目即刻就绪，随时调度自主音频、静帧、片段代理与 FlowDirector 智能审片流水线。',
          ar: 'يصبح مشروعك جاهزاً فوراً لوكلاء الصوت والصور والمقاطع ومراجعة FlowDirector الذكية.',
          th: 'โปรเจกต์พร้อมทันทีสำหรับรันเอเจนต์อัตโนมัติทั้งเสียง ภาพนิ่ง คลิป และการตรวจคุณภาพด้วย FlowDirector',
        },
      },
    ],
  },
}

export const KEY_FEATURE_NARRATED_PAN: Record<string, FeaturePanSpec> = {
  ...SERIES_AND_BLUEPRINT_NARRATED_PAN,
  ...PRODUCTION_AND_SCREENING_NARRATED_PAN,
}

const SCREENSHOT_SUBSTRING_TO_ICON: ReadonlyArray<[string, string]> = [
  ['new-series.webm', 'newSeries'],
  ['series-review.webp', 'seriesReview'],
  ['series-resonance.webp', 'seriesResonance'],
  ['series-director.webp', 'seriesDirector'],
  ['episode-director.webp', 'directEpisode'],
  ['series-start-project.webp', 'startEpisode'],
  ['start-blueprint.webp', 'startBlueprint'],
  ['blueprint-beats.webp', 'treatment'],
  ['blueprint-cast.webp', 'castLocations'],
  ['blueprint-director.webp', 'blueprintDirector'],
  ['blueprint-resonance.webp', 'blueprintResonance'],
  ['blueprint-production-stage.webp', 'goToProduction'],
  ['scene-workflow.webp', 'sceneWorkflow'],
  ['scene-director.webp', 'directShot'],
  ['continuity-library.webp', 'continuity'],
  ['script-resonance.webp', 'scriptResonance'],
  ['production-planner.webp', 'budget'],
  ['production-script.webp', 'productionScript'],
  ['audio-agent.webp', 'audioAgent'],
  ['scene-audio-music.webp', 'musicScore'],
  ['stills-agent.webp', 'stillsAgent'],
  ['scene-stills-workbench.webp', 'stillsWorkbench'],
  ['pre-vis-animatic.webp', 'animatic'],
  ['clips-agent.webp', 'videoAgent'],
  ['scene-clips-workbench.webp', 'clipsWorkbench'],
  ['script-supervisor', 'scriptSupervisor'],
  ['production-agent.webp', 'productionAgent'],
  ['production-mixer.webp', 'mixer'],
  ['streams-multilanguage.webp', 'languageStreams'],
  ['multilanguage-ui-', 'multilanguageUi'],
  ['promo-trailers.webp', 'promoTrailers'],
  ['direct-publishing.webp', 'shipPackage'],
  ['screening-player.webp', 'screeningPlayer'],
  ['screening-collab.webp', 'screeningCollab'],
]

export function getKeyFeatureNarratedPan(
  featureIcon?: string | null,
  src?: string | null
): FeaturePanSpec | null {
  if (featureIcon && KEY_FEATURE_NARRATED_PAN[featureIcon]) {
    return KEY_FEATURE_NARRATED_PAN[featureIcon]
  }
  if (src) {
    for (const [match, icon] of SCREENSHOT_SUBSTRING_TO_ICON) {
      if (src.includes(match) && KEY_FEATURE_NARRATED_PAN[icon]) {
        return KEY_FEATURE_NARRATED_PAN[icon]
      }
    }
  }
  return null
}
