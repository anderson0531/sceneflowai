import type { ClientPortalLocale } from '@/lib/intake/clientPortalCopy'

export type ClientProductionStyleId =
  | 'hybrid_live_ai'
  | 'voice_over_cinema'
  | 'studio_hands_off'

export interface ClientPrepGuideCopy {
  guideTitle: string
  guideSubtitle: string
  showGuide: string
  hideGuide: string
  printSheetLabel: string
  reassuranceNote: string
  chooseStyleHeading: string
  styleSavedBadge: string
  styles: Record<
    ClientProductionStyleId,
    { title: string; badge: string; description: string }
  >
  checklistHeading: string
  tips: {
    photosTitle: string
    photosBody: string
    voiceTitle: string
    voiceBody: string
    videoTitle: string
    videoBody: string
    cueCardsTitle: string
    cueCardsBody: string
    familyTitle: string
    familyBody: string
  }
  invite: {
    greeting: string
    intro: string
    prepHeader: string
    photosBullet: string
    voiceBullet: string
    videoBullet: string
    cueCardsBullet: string
    familyBullet: string
    closing: string
  }
}

const EN_COPY: ClientPrepGuideCopy = {
  guideTitle: 'Quick Prep Guide & Your Production Options',
  guideSubtitle:
    'Everything below is optional—share only what you feel comfortable sharing, at your own pace.',
  showGuide: 'Show Prep Guide',
  hideGuide: 'Hide Guide',
  printSheetLabel: 'Print 1-Page Prep Sheet',
  reassuranceNote:
    'No special camera or microphone needed. Your smartphone, laptop, and favorite family photos are all it takes.',
  chooseStyleHeading: 'Which style sounds most like what you envision? (Tap one — optional)',
  styleSavedBadge: 'Preference shared with your producer',
  styles: {
    hybrid_live_ai: {
      title: 'Live Chapter Intros + 4K AI Cinema',
      badge: 'Most Popular for Memoirs',
      description:
        'Appear briefly on camera (or audio) using our on-screen Cue Cards to introduce memories, then dissolve smoothly into 4K cinematic reenactments.',
    },
    voice_over_cinema: {
      title: 'Your Voice, 4K Visuals (No Camera)',
      badge: 'Camera-Free',
      description:
        'Skip being on camera. Record a 15–30s voice sample (or audio story) + upload photos; your real or cloned voice narrates 4K scenes & animated keepsake photos.',
    },
    studio_hands_off: {
      title: 'Hands-Off Studio Production',
      badge: 'Fastest',
      description:
        'Simply upload reference photos and approve the cast, locations, and keepsakes—our studio handles all narration, voices, and 4K visuals for you.',
    },
  },
  checklistHeading: '5-Minute Preparation Checklist',
  tips: {
    photosTitle: 'Gather 5–15 Favorite Photos',
    photosBody:
      'Phone snapshots of printed photo albums work great. Right after uploading a photo, tap "Tell photo story" to record a quick 15-second memory explaining who is in it and when it was taken.',
    voiceTitle: 'Voice Sample & Cloning (15–30 Seconds)',
    voiceBody:
      'Sit in a quiet carpeted/furnished room (avoid echoey kitchens). Speak naturally at arm’s length. Record the 1-sentence consent clip if you want exact voice cloning for narration.',
    videoTitle: 'Live Video Clips or Couch Interviews',
    videoBody:
      'Face a window for flattering natural light. Holding your phone sideways (landscape) is ideal, though vertical works too—we automatically frame vertical clips in a polished 16:9 documentary matte. You can also upload one longer interview and we will auto-chapter it.',
    cueCardsTitle: 'Use Built-In Chapter Cue Cards',
    cueCardsBody:
      'Not sure what to say? Tap any Chapter Cue Card below to view large-print prompts and record a short live video or audio intro directly from your phone.',
    familyTitle: 'Invite Family Members to Help',
    familyBody:
      'Have children or siblings with old photo albums on their phones? Tap "Invite Family" in the top bar so they can add photos and memories under their own name.',
  },
  invite: {
    greeting: 'Hi! Your private studio portal for "{projectTitle}" is ready:',
    intro:
      'Take a few minutes whenever convenient to review our cast & settings and upload anything you’d like included (everything is optional):',
    prepHeader: 'Quick 5-Minute Prep Tips:',
    photosBullet:
      '• Photos: Gather 5–15 favorite photos (even phone snaps of printed albums work). You can tap "Tell photo story" right after uploading to add a quick voice note.',
    voiceBullet:
      '• Your Voice: In a quiet furnished room, record a 15–30s voice sample (+ 1-sentence spoken consent) if you’d like your voice to narrate or match scenes.',
    videoBullet:
      '• Live Video / Audio Stories: Face a window for soft lighting to record short intros, or upload one longer couch interview—we automatically extract clean narration audio & chapters.',
    cueCardsBullet:
      '• Built-In Cue Cards: Tap any Chapter Cue Card inside the link for large-print prompts so you never have to guess what to say.',
    familyBullet:
      '• Family Help: Feel free to tap "Invite Family" inside the portal so relatives can upload their favorite photos too!',
    closing: '— {brandName}',
  },
}

const ES_COPY: ClientPrepGuideCopy = {
  ...EN_COPY,
  guideTitle: 'Guía Rápida de Preparación y Opciones de Producción',
  guideSubtitle:
    'Todo es opcional: comparte solo lo que te haga sentir cómodo, a tu propio ritmo.',
  showGuide: 'Ver Guía de Preparación',
  hideGuide: 'Ocultar Guía',
  printSheetLabel: 'Imprimir Guía (1 Página)',
  reassuranceNote:
    'No necesitas cámara ni micrófono profesional. Tu teléfono y tus fotos favoritas son más que suficientes.',
  chooseStyleHeading: '¿Qué estilo se acerca más a lo que imaginas? (Toca uno — opcional)',
  styleSavedBadge: 'Preferencia enviada a tu productor',
  styles: {
    hybrid_live_ai: {
      title: 'Intros en Vivo + Cine 4K con IA',
      badge: 'Más Popular para Memorias',
      description:
        'Presenta capítulos brevemente frente a la cámara usando nuestras Tarjetas Guía y pásalo suavemente a recreaciones cinematográficas en 4K.',
    },
    voice_over_cinema: {
      title: 'Tu Voz, Imágenes 4K (Sin Cámara)',
      badge: 'Sin Cámara',
      description:
        'Sin necesidad de salir en video. Graba una muestra de voz de 15–30 s (o audio) + sube fotos; tu voz narra las escenas 4K y tus fotos animadas.',
    },
    studio_hands_off: {
      title: 'Producción Completa de Estudio',
      badge: 'Más Rápido',
      description:
        'Solo sube fotos de referencia y aprueba el elenco y lugares; nuestro estudio se encarga de las voces y del video 4K.',
    },
  },
  checklistHeading: 'Lista de Preparación en 5 Minutos',
  invite: {
    greeting: '¡Hola! Tu portal privado de estudio para "{projectTitle}" está listo:',
    intro:
      'Cuando gustes, revisa el elenco y escenarios y sube el material que desees incluir (todo es opcional):',
    prepHeader: 'Consejos rápidos de 5 minutos:',
    photosBullet:
      '• Fotos: Reúne 5–15 fotos favoritas (incluso fotos tomadas con el celular a álbumes impresos). Luego toca "Contar historia" para añadir una breve nota de voz.',
    voiceBullet:
      '• Tu Voz: En una habitación tranquila, graba 15–30 s de voz (+ 1 frase de consentimiento) si deseas narrar con tu propia voz.',
    videoBullet:
      '• Videos / Audios en Vivo: Colócate frente a una ventana con luz suave para grabar intros breves o sube una entrevista más larga; extraemos el audio y los capítulos automáticamente.',
    cueCardsBullet:
      '• Tarjetas Guía: Toca cualquier tarjeta de capítulo en el enlace para ver sugerencias en letra grande.',
    familyBullet:
      '• Ayuda Familiar: Toca "Invitar Familia" dentro del portal para que tus familiares también suban fotos.',
    closing: '— {brandName}',
  },
}

const PT_COPY: ClientPrepGuideCopy = {
  ...EN_COPY,
  guideTitle: 'Guia Rápido de Preparação e Opções de Produção',
  guideSubtitle:
    'Tudo aqui é opcional — envie apenas o que desejar, no seu próprio ritmo.',
  showGuide: 'Ver Guia de Preparação',
  hideGuide: 'Ocultar Guia',
  printSheetLabel: 'Imprimir Guia (1 Página)',
  reassuranceNote:
    'Não é necessário equipamento profissional. Seu celular e suas fotos favoritas já são suficientes.',
  chooseStyleHeading: 'Qual estilo combina mais com a sua visão? (Toque em um — opcional)',
  styleSavedBadge: 'Preferência enviada ao produtor',
  styles: {
    hybrid_live_ai: {
      title: 'Intros ao Vivo + Cinema 4K com IA',
      badge: 'Mais Popular para Memórias',
      description:
        'Apresente capítulos rapidamente na câmera usando nossos Cartões de Roteiro, com transição suave para recriações 4K.',
    },
    voice_over_cinema: {
      title: 'Sua Voz, Imagens 4K (Sem Câmera)',
      badge: 'Sem Câmera',
      description:
        'Sem precisar aparecer em vídeo. Grave 15–30s de voz (ou áudio) + envie fotos; sua voz narra as cenas 4K e fotos animadas.',
    },
    studio_hands_off: {
      title: 'Produção Completa pelo Estúdio',
      badge: 'Mais Rápido',
      description:
        'Apenas envie fotos de referência e aprove personagens e cenários — cuidamos de toda a narração e vídeo 4K.',
    },
  },
  checklistHeading: 'Checklist Rápido de 5 Minutos',
  invite: {
    greeting: 'Olá! Seu portal privado de estúdio para "{projectTitle}" está pronto:',
    intro:
      'Quando puder, revise o elenco e os cenários e envie os materiais que quiser incluir (tudo é opcional):',
    prepHeader: 'Dicas rápidas de 5 minutos:',
    photosBullet:
      '• Fotos: Separe 5–15 fotos favoritas (fotos de álbuns impressos tiradas no celular funcionam muito bem). Depois toque para gravar uma breve história sobre a foto.',
    voiceBullet:
      '• Sua Voz: Em um ambiente silencioso, grave uma amostra de 15–30s (+ 1 frase de consentimento) se quiser narrar com sua voz.',
    videoBullet:
      '• Vídeos / Áudios ao Vivo: Fique de frente para uma janela com luz natural para intros curtas ou envie uma entrevista mais longa — extraímos áudio limpo e capítulos automaticamente.',
    cueCardsBullet:
      '• Cartões de Roteiro: Toque em qualquer capítulo dentro do link para ver sugestões em letras grandes.',
    familyBullet:
      '• Família: Use "Convidar Família" no topo do portal para que parentes também enviem fotos.',
    closing: '— {brandName}',
  },
}

const HI_COPY: ClientPrepGuideCopy = {
  ...EN_COPY,
  guideTitle: 'त्वरित तैयारी गाइड और आपके प्रोडक्शन विकल्प',
  guideSubtitle: 'सब कुछ वैकल्पिक है — केवल वही साझा करें जिसमें आप सहज हों, अपनी गति से।',
  showGuide: 'तैयारी गाइड देखें',
  hideGuide: 'गाइड छिपाएँ',
  printSheetLabel: '1-पेज चेकलिस्ट प्रिंट करें',
  reassuranceNote:
    'किसी विशेष कैमरे या माइक्रोफ़ोन की ज़रूरत नहीं है। आपका स्मार्टफ़ोन और पसंदीदा पारिवारिक फ़ोटो ही काफ़ी हैं।',
  chooseStyleHeading: 'आपकी कल्पना के सबसे क़रीब कौन-सी शैली है? (चुनें — वैकल्पिक)',
  styleSavedBadge: 'पसंद आपके प्रोड्यूसर को भेज दी गई है',
  invite: {
    greeting: 'नमस्ते! "{projectTitle}" के लिए आपका निजी स्टूडियो पोर्टल तैयार है:',
    intro:
      'जब भी सुविधा हो, किरदारों और लोकेशन की समीक्षा करें और अपनी पसंदीदा यादें अपलोड करें (सब कुछ वैकल्पिक है):',
    prepHeader: '5 मिनट की आसान तैयारी टिप्स:',
    photosBullet:
      '• फ़ोटो: 5–15 पसंदीदा फ़ोटो चुनें (एल्बम से फ़ोन द्वारा ली गई तस्वीर भी चलती है) और अपलोड के बाद छोटी वॉइस कहानी जोड़ें।',
    voiceBullet:
      '• आपकी आवाज़: किसी शांत कमरे में 15–30 सेकंड का वॉइस सैंपल (+ 1 सहमति वाक्य) रिकॉर्ड करें यदि आप अपनी आवाज़ से कहानी सुनाना चाहते हैं।',
    videoBullet:
      '• लाइव वीडियो / ऑडियो कहानी: खिड़की की रोशनी की ओर चेहरा करके छोटा परिचय रिकॉर्ड करें या लंबा इंटरव्यू अपलोड करें — हम साफ़ ऑडियो और अध्याय अपने आप बना देंगे।',
    cueCardsBullet:
      '• क्यू कार्ड्स (Cue Cards): लिंक के अंदर किसी भी अध्याय कार्ड पर टैप करें और बड़े अक्षरों में संकेत देखकर बोलें।',
    familyBullet:
      '• परिवार की मदद: पोर्टल में "Invite Family" पर टैप करें ताकि परिवार के अन्य सदस्य भी अपनी फ़ोटो जोड़ सकें।',
    closing: '— {brandName}',
  },
}

const ZH_CN_COPY: ClientPrepGuideCopy = {
  ...EN_COPY,
  guideTitle: '快速准备指南与您的制作方式选择',
  guideSubtitle: '以下内容均为可选项——请按照自己的节奏，只分享您方便提供的内容。',
  showGuide: '展开准备指南',
  hideGuide: '收起指南',
  printSheetLabel: '打印一页准备清单',
  reassuranceNote: '无需专业相机或麦克风，用您的手机和珍藏照片就完全足够。',
  chooseStyleHeading: '哪种成片风格最符合您的期待？（点击选择 — 可选）',
  styleSavedBadge: '已将偏好同步给制片人',
  styles: {
    hybrid_live_ai: {
      title: '真人章节开场 + 4K AI 电影重现',
      badge: '回忆录最受欢迎',
      description:
        '借助屏幕上的大字提示卡录制简短的真人（或语音）开场，随后自然衔接至 4K 电影级历史情景重现。',
    },
    voice_over_cinema: {
      title: '您的声音 + 4K 画面（无需出镜）',
      badge: '无需出镜',
      description:
        '无需面对镜头。只需录制 15–30 秒语音样本（或口述故事）并上传照片，即可用您的真实或克隆声音讲述 4K 故事。',
    },
    studio_hands_off: {
      title: '全托管工作室制作',
      badge: '最省心',
      description:
        '只需上传参考照片并确认人物与场景，配音、声音设计与 4K 影片制作全部交给我们团队完成。',
    },
  },
  checklistHeading: '5 分钟快速准备清单',
  invite: {
    greeting: '您好！「{projectTitle}」的专属工作室链接已准备好：',
    intro: '欢迎随时打开链接确认人物与场景，并上传您想加入的照片或记忆（全部为可选）：',
    prepHeader: '5 分钟准备小贴士：',
    photosBullet:
      '• 照片：准备 5–15 张喜欢的照片（手机翻拍纸质相册也可以），上传后可点击按钮录制一段简短的照片故事。',
    voiceBullet:
      '• 您的声音：在安静的室内录制 15–30 秒自然语音（及 1 句授权语句），即可用您的声音担任旁白。',
    videoBullet:
      '• 实拍视频 / 口述音频：面向窗户自然光录制简短开场，或直接上传一段较长访谈，系统将自动提取清晰人声并分章。',
    cueCardsBullet:
      '• 内置提词卡：点击链接中的章节提示卡即可看到大号字提示，录制更轻松。',
    familyBullet:
      '• 邀请家人：点击页面顶部的“邀请家人”，让亲友直接从各自手机上传老照片。',
    closing: '— {brandName}',
  },
}

const TH_COPY: ClientPrepGuideCopy = {
  ...EN_COPY,
  guideTitle: 'คู่มือเตรียมตัวแบบย่อ และตัวเลือกรูปแบบการผลิต',
  guideSubtitle: 'ทุกขั้นตอนเป็นตัวเลือกเสริม คุณสามารถส่งเฉพาะสิ่งที่สะดวกได้เลย',
  showGuide: 'ดูคู่มือเตรียมตัว',
  hideGuide: 'ซ่อนคู่มือ',
  printSheetLabel: 'พิมพ์เช็กลิสต์ 1 หน้า',
  reassuranceNote: 'ไม่ต้องใช้อุปกรณ์มืออาชีพ แค่มือถือและรูปถ่ายที่คุณชื่นชอบก็เพียงพอแล้ว',
  chooseStyleHeading: 'คุณอยากให้ผลงานออกมาในสไตล์ไหนมากที่สุด? (เลือกได้ — ไม่บังคับ)',
  styleSavedBadge: 'ส่งความต้องการให้โปรดิวเซอร์แล้ว',
  invite: {
    greeting: 'สวัสดีครับ/ค่ะ พอร์ทัลสตูดิโอส่วนตัวสำหรับ "{projectTitle}" พร้อมแล้ว:',
    intro: 'คุณสามารถตรวจสอบตัวละคร ฉาก และอัปโหลดรูปหรือเรื่องราวเพิ่มเติมได้ตามสะดวก (ทุกอย่างเป็นตัวเลือกเสริม):',
    prepHeader: 'เคล็ดลับเตรียมตัวง่ายๆ ใน 5 นาที:',
    photosBullet: '• รูปภาพ: เตรียมรูปที่ชอบ 5–15 รูป (ถ่ายจากอัลบั้มกระดาษด้วยมือถือก็ได้) และกดอัดเสียงเล่าเรื่องหลังอัปโหลดได้ทันที',
    voiceBullet: '• เสียงของคุณ: อยู่ในห้องที่เงียบ อัดเสียงพูดธรรมชาติ 15–30 วินาที (+ ประโยคยินยอม 1 ประโยค) เพื่อให้เสียงคุณบรรยายเรื่องราว',
    videoBullet: '• คลิปวิดีโอ / เสียงเล่าเรื่อง: หันหน้าเข้าหาแสงหน้าต่างเพื่ออัดอินโทรสั้นๆ หรืออัปโหลดคลิปสัมภาษณ์ยาวได้เลย ระบบจะแยกเสียงและแบ่งตอนให้อัตโนมัติ',
    cueCardsBullet: '• การ์ดคำใบ้ (Cue Cards): แตะการ์ดแต่ละบทในลิงก์เพื่อดูข้อความตัวใหญ่ช่วยนำการพูด',
    familyBullet: '• ชวนครอบครัว: กดปุ่ม "Invite Family" ในพอร์ทัลเพื่อให้ญาติๆ ช่วยส่งรูปจากมือถือของเขาได้ด้วย',
    closing: '— {brandName}',
  },
}

const AR_COPY: ClientPrepGuideCopy = {
  ...EN_COPY,
  guideTitle: 'دليل التحضير السريع وخيارات الإنتاج',
  guideSubtitle: 'كل شيء اختياري — شارك فقط ما تشعر بالراحة لمشاركته، وبالوتيرة التي تناسبك.',
  showGuide: 'عرض دليل التحضير',
  hideGuide: 'إخفاء الدليل',
  printSheetLabel: 'طباعة ورقة التحضير (صفحة واحدة)',
  reassuranceNote: 'لا حاجة لكاميرا أو ميكروفون احترافي؛ هاتفك الذكي وصورك المفضلة تكفي تماماً.',
  chooseStyleHeading: 'ما الأسلوب الأقرب لما تتخيله؟ (اختياري)',
  styleSavedBadge: 'تم إرسال اختيارك إلى المنتج',
  invite: {
    greeting: 'مرحباً! بوابة الاستوديو الخاصة بمشروع "{projectTitle}" جاهزة:',
    intro: 'يمكنك مراجعة الشخصيات والمواقع ورفع الصور أو المقاطع التي ترغب بإضافتها (كل شيء اختياري):',
    prepHeader: 'نصائح تحضير سريعة (5 دقائق):',
    photosBullet: '• الصور: اختر 5–15 صورة مفضلة (حتى تصوير الألبوم الورقي بالهاتف ممتاز) ويمكنك تسجيل قصة صوتية قصيرة لكل صورة.',
    voiceBullet: '• صوتك: في غرفة هادئة، سجّل عينة صوتية لمدة 15–30 ثانية (+ جملة الموافقة) إذا رغبت بأن يروي صوتك القصة.',
    videoBullet: '• مقاطع الفيديو أو الصوت: اجلس مقابل نافذة لإضاءة جميلة لتسجيل مقدمات قصيرة أو ارفع مقابلة كاملة وسنقسمها تلقائياً.',
    cueCardsBullet: '• بطاقات التذكير: اضغط على أي بطاقة فصل داخل الرابط لعرض نص كبير يساعدك أثناء التسجيل.',
    familyBullet: '• مشاركة العائلة: اضغط على "دعوة العائلة" داخل الرابط ليضيف أفراد أسرتك صورهم أيضاً.',
    closing: '— {brandName}',
  },
}

const COPY_BY_LOCALE: Record<ClientPortalLocale, ClientPrepGuideCopy> = {
  en: EN_COPY,
  es: ES_COPY,
  pt: PT_COPY,
  hi: HI_COPY,
  'zh-CN': ZH_CN_COPY,
  ar: AR_COPY,
  th: TH_COPY,
}

export function getClientPrepGuideCopy(locale: ClientPortalLocale): ClientPrepGuideCopy {
  return COPY_BY_LOCALE[locale] || EN_COPY
}

/**
 * Generates a warm, ready-to-paste WhatsApp / SMS / Email client welcome & prep message
 * dynamically tailored to the exact toggles enabled on the Continuity link.
 */
export function buildClientInvitePrepMessage(input: {
  projectTitle: string
  brandName: string
  shareUrl: string
  locale: ClientPortalLocale
  allowUploads: boolean
  allowVoiceCapture: boolean
  allowVideoClips: boolean
  hasPromptCards?: boolean
}): string {
  const copy = getClientPrepGuideCopy(input.locale)
  const title = input.projectTitle.trim() || 'your video project'
  const brand = input.brandName.trim() || 'Your Studio Team'

  const bullets: string[] = []
  if (input.allowUploads) bullets.push(copy.invite.photosBullet)
  if (input.allowVoiceCapture) bullets.push(copy.invite.voiceBullet)
  if (input.allowVideoClips) {
    bullets.push(copy.invite.videoBullet)
    if (input.hasPromptCards) bullets.push(copy.invite.cueCardsBullet)
  }
  bullets.push(copy.invite.familyBullet)

  return [
    copy.invite.greeting.replace('{projectTitle}', title),
    input.shareUrl,
    '',
    copy.invite.intro,
    '',
    copy.invite.prepHeader,
    ...bullets,
    '',
    copy.invite.closing.replace('{brandName}', brand),
  ].join('\n')
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Generates a clean, large-font 1-page printable HTML checklist tailored to the active link
 * (ideal for adult children printing instructions for an elderly memoir subject).
 */
export function buildPrintablePrepSheetHtml(input: {
  projectTitle: string
  brandName: string
  locale: ClientPortalLocale
  allowUploads: boolean
  allowVoiceCapture: boolean
  allowVideoClips: boolean
  hasPromptCards: boolean
}): string {
  const copy = getClientPrepGuideCopy(input.locale)
  const items: Array<{ title: string; body: string }> = []
  if (input.allowUploads) {
    items.push({ title: copy.tips.photosTitle, body: copy.tips.photosBody })
  }
  if (input.allowVoiceCapture) {
    items.push({ title: copy.tips.voiceTitle, body: copy.tips.voiceBody })
  }
  if (input.allowVideoClips) {
    items.push({ title: copy.tips.videoTitle, body: copy.tips.videoBody })
    if (input.hasPromptCards) {
      items.push({ title: copy.tips.cueCardsTitle, body: copy.tips.cueCardsBody })
    }
  }
  items.push({ title: copy.tips.familyTitle, body: copy.tips.familyBody })

  const itemsHtml = items
    .map(
      (item, idx) =>
        `<div class="item"><div class="num">${idx + 1}</div><div><h3>${escapeHtml(
          item.title
        )}</h3><p>${escapeHtml(item.body)}</p></div></div>`
    )
    .join('')

  return `<!doctype html>
<html lang="${escapeHtml(input.locale)}">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(input.projectTitle)} — ${escapeHtml(copy.guideTitle)}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #111827; max-width: 720px; margin: 24px auto; padding: 0 24px; line-height: 1.5; }
  .header { border-bottom: 2px solid #0891b2; padding-bottom: 14px; margin-bottom: 20px; }
  .kicker { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #0891b2; }
  h1 { font-size: 24px; margin: 6px 0 4px; }
  .sub { font-size: 14px; color: #4b5563; margin: 0; }
  .note { background: #ecfeff; border: 1px solid #a5f3fc; border-radius: 10px; padding: 12px 14px; font-size: 14px; margin-bottom: 20px; }
  .item { display: flex; gap: 14px; margin-bottom: 16px; align-items: flex-start; }
  .num { width: 28px; height: 28px; border-radius: 999px; background: #0891b2; color: #fff; font-weight: 700; font-size: 14px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 2px; }
  h3 { font-size: 16px; margin: 0 0 4px; }
  p { font-size: 14px; color: #374151; margin: 0; }
  .footer { margin-top: 28px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
</style>
</head>
<body>
  <div class="header">
    <div class="kicker">${escapeHtml(input.brandName)}</div>
    <h1>${escapeHtml(input.projectTitle)} · ${escapeHtml(copy.guideTitle)}</h1>
    <p class="sub">${escapeHtml(copy.guideSubtitle)}</p>
  </div>
  <div class="note">${escapeHtml(copy.reassuranceNote)}</div>
  ${itemsHtml}
  <div class="footer">${escapeHtml(input.brandName)} · ${escapeHtml(copy.checklistHeading)}</div>
  <script>window.onload = function () { window.print(); };</script>
</body>
</html>`
}
