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

const JA_COPY: ClientPrepGuideCopy = {
  guideTitle: 'かんたん準備ガイド＆制作オプション',
  guideSubtitle:
    '以下はすべて任意です。ご自身のペースで、共有できるものだけお送りください。',
  showGuide: '準備ガイドを表示',
  hideGuide: 'ガイドを閉じる',
  printSheetLabel: '1ページ準備シートを印刷',
  reassuranceNote:
    '特別なカメラやマイクは不要です。スマートフォン、パソコン、そしてお気に入りの家族写真があれば十分です。',
  chooseStyleHeading: 'イメージに最も近いスタイルはどれですか？（タップして選択 — 任意）',
  styleSavedBadge: 'ご希望をプロデューサーに共有しました',
  styles: {
    hybrid_live_ai: {
      title: '本人チャプター導入＋4K AIシネマ',
      badge: 'メモワールで一番人気',
      description:
        '画面上のキューカードを見ながら短くカメラ（または音声）で思い出を紹介し、そのまま滑らかに4Kシネマ再現映像へと繋ぎます。',
    },
    voice_over_cinema: {
      title: 'あなたの声＋4K映像（顔出しなし）',
      badge: 'カメラ不要',
      description:
        'カメラ出演なしで制作できます。15〜30秒の声サンプル（または音声ストーリー）を録音し写真をアップロードするだけで、ご本人の声や音声クローンで4K映像と動く思い出写真をナレーションします。',
    },
    studio_hands_off: {
      title: 'スタジオおまかせ制作',
      badge: '最短・おまかせ',
      description:
        '参考写真をアップロードしてキャスト・場所・思い出の品を承認するだけ。ナレーション、音声、4K映像制作はすべて当スタジオにお任せください。',
    },
  },
  checklistHeading: '5分でできる準備チェックリスト',
  tips: {
    photosTitle: 'お気に入りの写真を5〜15枚集める',
    photosBody:
      '印刷されたアルバムをスマホで撮影した写真でも問題ありません。写真をアップロードしたら「写真の思い出を語る」をタップして、誰が写っていていつ頃の写真かを15秒ほど音声で吹き込めます。',
    voiceTitle: '音声サンプル＆音声クローン（15〜30秒）',
    voiceBody:
      'カーペットや家具のある静かな部屋で録音してください（反響しやすいキッチンは避けましょう）。腕を伸ばしたくらいの距離で自然に話し、ナレーション用の正確な音声クローンをご希望の場合は1文の同意クリップも録音してください。',
    videoTitle: '実写ビデオクリップまたはソファ・インタビュー',
    videoBody:
      '窓に向かって座ると自然な光で美しく映ります。スマホは横向き（ランドスケープ）が理想ですが縦向きでも大丈夫です—縦動画も洗練された16:9ドキュメンタリー枠に自動調整します。長めのインタビュー1本をアップロードすれば自動でチャプター分けも行います。',
    cueCardsTitle: '内蔵チャプター・キューカードを活用',
    cueCardsBody:
      '何を話せばいいか迷ったら、下のチャプター・キューカードをタップしてください。大きな文字のガイドを見ながら、スマホから直接短いビデオや音声の導入を録音できます。',
    familyTitle: 'ご家族を招待して協力してもらう',
    familyBody:
      '昔のアルバム写真を持っているお子様やご兄弟はいらっしゃいますか？上部バーの「家族を招待」をタップすると、ご家族もご自身の名前で写真や思い出を追加できます。',
  },
  invite: {
    greeting: 'こんにちは！「{projectTitle}」の専用スタジオポータルが準備できました：',
    intro:
      'お時間のあるときにキャストや舞台設定をご確認のうえ、盛り込みたい写真や音声を自由にアップロードしてください（すべて任意です）：',
    prepHeader: '5分でできる準備のコツ：',
    photosBullet:
      '• 写真：お気に入りの写真を5〜15枚ご用意ください（アルバムのスマホ撮影もOK）。アップロード後すぐに音声で写真のエピソードを添えられます。',
    voiceBullet:
      '• あなたの声：静かなお部屋で15〜30秒の声サンプル（＋1文の音声同意）を録音いただくと、ご自身の声でナレーションを付けられます。',
    videoBullet:
      '• 実写ビデオ／音声ストーリー：窓の柔らかい光に向かって短い導入を撮るか、長めのインタビューをそのままアップロードしてください。クリアな音声抽出とチャプター分けは自動で行います。',
    cueCardsBullet:
      '• 内蔵キューカード：リンク内のチャプター・キューカードをタップすると大きな文字のガイドが表示され、迷わず話せます。',
    familyBullet:
      '• ご家族の協力：ポータル内の「家族を招待」からご親族にも共有し、それぞれのスマホから写真を追加してもらえます。',
    closing: '— {brandName}',
  },
}

const KO_COPY: ClientPrepGuideCopy = {
  guideTitle: '간단 준비 가이드 및 제작 옵션',
  guideSubtitle:
    '아래 항목은 모두 선택 사항입니다. 편하신 속도로 공유하고 싶은 자료만 올려 주세요.',
  showGuide: '준비 가이드 보기',
  hideGuide: '가이드 숨기기',
  printSheetLabel: '1페이지 준비 시트 인쇄',
  reassuranceNote:
    '특별한 카메라나 마이크가 필요 없습니다. 스마트폰, 노트북, 그리고 소중한 가족 사진만 있으면 충분합니다.',
  chooseStyleHeading: '떠올리시는 완성작과 가장 가까운 스타일은 무엇인가요? (선택 사항)',
  styleSavedBadge: '선호 스타일이 프로듀서에게 공유되었습니다',
  styles: {
    hybrid_live_ai: {
      title: '라이브 챕터 인트로 + 4K AI 시네마',
      badge: '회고록 인기 1위',
      description:
        '화면의 큐 카드를 보며 카메라(또는 음성)로 추억을 짧게 소개한 뒤, 자연스럽게 4K 시네마틱 재연 영상으로 이어집니다.',
    },
    voice_over_cinema: {
      title: '당신의 목소리, 4K 비주얼 (카메라 없음)',
      badge: '카메라 불필요',
      description:
        '카메라 앞에 서지 않아도 됩니다. 15~30초 음성 샘플(또는 오디오 이야기)을 녹음하고 사진을 올리면 실제 목소리 또는 클로닝된 목소리로 4K 장면과 움직이는 추억 사진을 내레이션합니다.',
    },
    studio_hands_off: {
      title: '스튜디오 전담 제작',
      badge: '가장 빠름',
      description:
        '참고 사진을 업로드하고 인물·장소·소품만 승인해 주세요. 모든 내레이션, 보이스, 4K 비주얼 제작은 스튜디오가 대신 진행합니다.',
    },
  },
  checklistHeading: '5분 준비 체크리스트',
  tips: {
    photosTitle: '소중한 사진 5~15장 모으기',
    photosBody:
      '인화된 사진 앨범을 스마트폰으로 찍은 사진도 아주 좋습니다. 사진을 올린 직후 "사진 이야기 들려주기"를 눌러 누가 나오고 언제 찍은 사진인지 15초 내외로 짧게 녹음해 보세요.',
    voiceTitle: '음성 샘플 및 보이스 클로닝 (15~30초)',
    voiceBody:
      '카펫이나 가구가 있는 조용한 방에서 녹음하세요(울림이 큰 주방은 피하세요). 팔 길이 정도 거리에서 자연스럽게 말씀하시고, 정확한 내레이션 보이스 클로닝을 원하시면 1문장 동의 음성도 함께 녹음해 주세요.',
    videoTitle: '라이브 영상 클립 또는 소파 인터뷰',
    videoBody:
      '창문을 바라보고 앉으면 부드러운 자연광으로 훨씬 보기 좋습니다. 스마트폰은 가로(풍경) 방향이 이상적이지만 세로 영상도 괜찮습니다—세로 클립도 세련된 16:9 다큐멘터리 프레임으로 자동 배치됩니다. 긴 인터뷰 하나를 올려주셔도 자동으로 챕터를 나눠드립니다.',
    cueCardsTitle: '내장 챕터 큐 카드 활용',
    cueCardsBody:
      '무슨 말을 해야 할지 막막하신가요? 아래 챕터 큐 카드를 누르면 큰 글씨 프롬프트가 표시되어 스마트폰에서 바로 짧은 영상이나 음성 인트로를 녹음할 수 있습니다.',
    familyTitle: '가족 구성원 초대하기',
    familyBody:
      '옛날 앨범 사진을 휴대폰에 갖고 계신 자녀나 형제분이 있나요? 상단 바의 "가족 초대"를 누르면 가족들도 각자 이름으로 사진과 추억을 올릴 수 있습니다.',
  },
  invite: {
    greeting: '안녕하세요! "{projectTitle}" 전용 스튜디오 포털이 준비되었습니다:',
    intro:
      '편하실 때 몇 분만 시간을 내어 인물과 배경을 검토하시고 담고 싶은 자료를 올려 주세요 (모두 선택 사항입니다):',
    prepHeader: '5분 간편 준비 팁:',
    photosBullet:
      '• 사진: 좋아하는 사진 5~15장을 모아 주세요(앨범을 휴대폰으로 찍은 사진도 좋습니다). 업로드 직후 짧은 음성 메모로 사진 속 이야기를 남길 수 있습니다.',
    voiceBullet:
      '• 내 목소리: 조용한 방에서 15~30초 음성 샘플(+ 1문장 음성 동의)을 녹음하면 본인의 목소리로 내레이션할 수 있습니다.',
    videoBullet:
      '• 라이브 영상 / 오디오 이야기: 창가 자연광을 마주 보고 짧은 인트로를 촬영하거나 긴 인터뷰 영상을 올려 주세요. 깔끔한 음성과 챕터를 자동으로 추출합니다.',
    cueCardsBullet:
      '• 내장 큐 카드: 링크 안의 챕터 큐 카드를 누르면 큰 글씨 안내 문구가 나와 망설이지 않고 녹음할 수 있습니다.',
    familyBullet:
      '• 가족 함께하기: 포털 안의 "가족 초대"를 눌러 친척분들도 각자 간직한 사진을 함께 올릴 수 있습니다!',
    closing: '— {brandName}',
  },
}

const DE_COPY: ClientPrepGuideCopy = {
  guideTitle: 'Schnell-Vorbereitungsguide & Ihre Produktionsoptionen',
  guideSubtitle:
    'Alles hier ist optional — teilen Sie in Ihrem eigenen Tempo nur das, womit Sie sich wohlfühlen.',
  showGuide: 'Vorbereitungsguide anzeigen',
  hideGuide: 'Guide ausblenden',
  printSheetLabel: '1-Seiten-Checkliste drucken',
  reassuranceNote:
    'Keine spezielle Kamera oder Mikrofontechnik nötig. Ihr Smartphone, Laptop und Ihre Lieblingsfotos genügen vollkommen.',
  chooseStyleHeading: 'Welcher Stil entspricht Ihrer Vorstellung am meisten? (Antippen — optional)',
  styleSavedBadge: 'Auswahl mit Ihrem Produzenten geteilt',
  styles: {
    hybrid_live_ai: {
      title: 'Live-Kapitelintros + 4K-KI-Kino',
      badge: 'Am beliebtesten für Erinnerungsfilme',
      description:
        'Erscheinen Sie kurz vor der Kamera (oder per Audio) mit unseren Bildschirm-Stichwortkarten, um Erinnerungen einzuleiten, bevor es nahtlos in filmische 4K-Nachstellungen übergeht.',
    },
    voice_over_cinema: {
      title: 'Ihre Stimme, 4K-Bilder (Ohne Kamera)',
      badge: 'Ohne Kamera',
      description:
        'Kein Auftritt vor der Kamera nötig. Nehmen Sie eine 15–30-sekündige Stimmprobe (oder Audiogeschichte) auf und laden Sie Fotos hoch — Ihre echte oder geklonte Stimme erzählt 4K-Szenen und animierte Erinnerungsfotos.',
    },
    studio_hands_off: {
      title: 'Rundum-Sorglos-Studioproduktion',
      badge: 'Am schnellsten',
      description:
        'Laden Sie einfach Referenzfotos hoch und geben Sie Besetzung, Orte und Erinnerungsstücke frei — unser Studio übernimmt die gesamte Vertonung, Stimmen und 4K-Umsetzung.',
    },
  },
  checklistHeading: '5-Minuten-Vorbereitungs-Checkliste',
  tips: {
    photosTitle: '5–15 Lieblingsfotos zusammentragen',
    photosBody:
      'Smartphone-Fotos von gedruckten Fotoalben funktionieren hervorragend. Direkt nach dem Hochladen können Sie auf „Fotogeschichte erzählen“ tippen, um in 15 Sekunden kurz einzusprechen, wer zu sehen ist und wann das Bild entstand.',
    voiceTitle: 'Stimmprobe & Stimmklon (15–30 Sekunden)',
    voiceBody:
      'Setzen Sie sich in einen ruhigen Raum mit Teppich oder Möbeln (vermeiden Sie hallende Küchen). Sprechen Sie natürlich auf Armlänge. Nehmen Sie den 1-Satz-Einwilligungsclip auf, wenn Sie einen exakten Stimmklon für die Erzählung wünschen.',
    videoTitle: 'Live-Videoclips oder Sofa-Interviews',
    videoBody:
      'Setzen Sie sich mit Blick zum Fenster für schmeichelhaftes Tageslicht. Querformat (Landscape) ist ideal, Hochformat funktioniert aber ebenfalls — wir rahmen Hochformat-Clips automatisch in ein edles 16:9-Dokumentarformat. Sie können auch ein längeres Interview hochladen, das wir automatisch in Kapitel gliedern.',
    cueCardsTitle: 'Integrierte Kapitel-Stichwortkarten nutzen',
    cueCardsBody:
      'Unsicher, was Sie sagen sollen? Tippen Sie unten auf eine beliebige Kapitel-Stichwortkarte, um groß gedruckte Leitfragen zu sehen und direkt vom Smartphone ein kurzes Video- oder Audio-Intro aufzunehmen.',
    familyTitle: 'Familienmitglieder zum Mithelfen einladen',
    familyBody:
      'Haben Kinder oder Geschwister alte Fotoalben auf dem Handy? Tippen Sie in der oberen Leiste auf „Familie einladen“, damit sie Fotos und Erinnerungen unter ihrem eigenen Namen ergänzen können.',
  },
  invite: {
    greeting: 'Hallo! Ihr privates Studioportal für „{projectTitle}“ ist bereit:',
    intro:
      'Nehmen Sie sich ganz entspannt ein paar Minuten Zeit, um Besetzung und Schauplätze zu prüfen und gewünschte Materialien hochzuladen (alles ist optional):',
    prepHeader: 'Kurze 5-Minuten-Vorbereitungstipps:',
    photosBullet:
      '• Fotos: Sammeln Sie 5–15 Lieblingsfotos (auch Handyfotos aus gedruckten Alben klappen super). Direkt nach dem Hochladen können Sie eine kurze Sprachnotiz zum Foto aufnehmen.',
    voiceBullet:
      '• Ihre Stimme: Nehmen Sie in einem ruhigen, möblierten Raum eine 15–30-sekündige Stimmprobe (+ 1 gesprochenen Einwilligungssatz) auf, wenn Ihre Stimme durch den Film führen soll.',
    videoBullet:
      '• Live-Video / Audiogeschichten: Nutzen Sie sanftes Fensterlicht für kurze Intros oder laden Sie ein längeres Interview hoch — wir extrahieren automatisch sauberen Ton und Kapitel.',
    cueCardsBullet:
      '• Integrierte Stichwortkarten: Tippen Sie im Link auf eine Kapitelkarte, um große Lesehilfen anzuzeigen — so müssen Sie nie überlegen, was Sie sagen möchten.',
    familyBullet:
      '• Hilfe aus der Familie: Tippen Sie im Portal auf „Familie einladen“, damit Angehörige ebenfalls ihre Lieblingsfotos hochladen können!',
    closing: '— {brandName}',
  },
}

const FR_COPY: ClientPrepGuideCopy = {
  guideTitle: 'Guide de préparation rapide et options de production',
  guideSubtitle:
    'Tout ci-dessous est facultatif — partagez uniquement ce que vous souhaitez, à votre rythme.',
  showGuide: 'Afficher le guide',
  hideGuide: 'Masquer le guide',
  printSheetLabel: 'Imprimer la fiche (1 page)',
  reassuranceNote:
    'Aucune caméra ni micro professionnel requis. Votre smartphone, votre ordinateur et vos photos préférées suffisent amplement.',
  chooseStyleHeading: 'Quel style correspond le mieux à ce que vous imaginez ? (Facultatif)',
  styleSavedBadge: 'Préférence transmise à votre producteur',
  styles: {
    hybrid_live_ai: {
      title: 'Intros filmées + Cinéma IA 4K',
      badge: 'Le plus populaire pour les récits de vie',
      description:
        'Apparaissez brièvement face caméra (ou en audio) grâce à nos cartes mémo à l’écran pour introduire vos souvenirs, avant une transition fluide vers des reconstitutions cinématographiques 4K.',
    },
    voice_over_cinema: {
      title: 'Votre voix, images 4K (Sans caméra)',
      badge: 'Sans caméra',
      description:
        'Pas besoin de passer devant la caméra. Enregistrez un échantillon vocal de 15 à 30 s (ou un récit audio) + importez vos photos : votre voix réelle ou clonée raconte les scènes 4K et les photos souvenirs animées.',
    },
    studio_hands_off: {
      title: 'Production studio clé en main',
      badge: 'Le plus rapide',
      description:
        'Importez simplement vos photos de référence et validez les personnages, lieux et objets — notre studio s’occupe entièrement de la narration, des voix et du rendu 4K.',
    },
  },
  checklistHeading: 'Liste de préparation en 5 minutes',
  tips: {
    photosTitle: 'Rassemblez 5 à 15 photos préférées',
    photosBody:
      'Même des photos prises au smartphone depuis des albums imprimés fonctionnent très bien. Juste après l’import, appuyez sur « Raconter la photo » pour enregistrer en 15 secondes qui y figure et à quelle époque elle a été prise.',
    voiceTitle: 'Échantillon vocal et clonage (15–30 secondes)',
    voiceBody:
      'Installez-vous dans une pièce calme et meublée (évitez les cuisines qui résonnent). Parlez naturellement à bout de bras. Enregistrez la phrase de consentement si vous souhaitez un clonage vocal fidèle pour la narration.',
    videoTitle: 'Clips vidéo en direct ou interviews au salon',
    videoBody:
      'Placez-vous face à une fenêtre pour une lumière naturelle flatteuse. Tenir le téléphone à l’horizontale (paysage) est idéal, mais le format vertical fonctionne aussi : nous l’habillons automatiquement en 16:9 documentaire. Vous pouvez aussi importer une interview plus longue qui sera chapitrée automatiquement.',
    cueCardsTitle: 'Utilisez les cartes mémo intégrées',
    cueCardsBody:
      'Vous ne savez pas quoi dire ? Appuyez sur n’importe quelle carte mémo de chapitre ci-dessous pour afficher des repères en gros caractères et enregistrer une courte intro vidéo ou audio depuis votre téléphone.',
    familyTitle: 'Invitez vos proches à participer',
    familyBody:
      'Vos enfants ou frères et sœurs ont d’anciens albums sur leur téléphone ? Appuyez sur « Inviter la famille » en haut pour qu’ils ajoutent leurs photos et souvenirs sous leur propre nom.',
  },
  invite: {
    greeting: 'Bonjour ! Votre portail studio privé pour « {projectTitle} » est prêt :',
    intro:
      'Prenez quelques minutes quand cela vous arrange pour vérifier les personnages et décors et déposer ce que vous souhaitez inclure (tout est facultatif) :',
    prepHeader: 'Conseils rapides de préparation (5 minutes) :',
    photosBullet:
      '• Photos : Rassemblez 5 à 15 photos préférées (même photographiées depuis un album papier). Vous pouvez ajouter une courte note vocale juste après l’envoi.',
    voiceBullet:
      '• Votre voix : Dans une pièce calme et meublée, enregistrez 15 à 30 s de voix (+ 1 phrase de consentement) si vous souhaitez que votre voix assure la narration.',
    videoBullet:
      '• Vidéos / Récits audio : Placez-vous face à une fenêtre pour enregistrer de courtes intros ou importez une interview complète — nous extrayons automatiquement un son propre et les chapitres.',
    cueCardsBullet:
      '• Cartes mémo intégrées : Appuyez sur n’importe quelle carte chapitre dans le lien pour lire des repères en gros caractères.',
    familyBullet:
      '• Aide familiale : Appuyez sur « Inviter la famille » dans le portail afin que vos proches puissent aussi partager leurs photos préférées !',
    closing: '— {brandName}',
  },
}

const IT_COPY: ClientPrepGuideCopy = {
  guideTitle: 'Guida rapida alla preparazione e opzioni di produzione',
  guideSubtitle:
    'Tutto ciò che segue è facoltativo: condividi solo ciò che ti fa sentire a tuo agio, con i tuoi tempi.',
  showGuide: 'Mostra guida',
  hideGuide: 'Nascondi guida',
  printSheetLabel: 'Stampa scheda (1 pagina)',
  reassuranceNote:
    'Non servono videocamere o microfoni speciali. Il tuo smartphone, il computer e le tue foto preferite sono tutto ciò che occorre.',
  chooseStyleHeading: 'Quale stile rispecchia meglio ciò che immagini? (Tocca uno — facoltativo)',
  styleSavedBadge: 'Preferenza condivisa con il produttore',
  styles: {
    hybrid_live_ai: {
      title: 'Intro dal vivo + Cinema IA 4K',
      badge: 'Più scelto per le memorie',
      description:
        'Appari brevemente davanti alla fotocamera (o in audio) usando le nostre Schede Guida su schermo per introdurre i ricordi, per poi passare con fluidità alle ricostruzioni cinematografiche in 4K.',
    },
    voice_over_cinema: {
      title: 'La tua voce, immagini 4K (Senza telecamera)',
      badge: 'Senza telecamera',
      description:
        'Nessun bisogno di comparire in video. Registra un campione vocale di 15–30 s (o un racconto audio) e carica le foto: la tua voce reale o clonata narrerà le scene 4K e le foto ricordo animate.',
    },
    studio_hands_off: {
      title: 'Produzione completa in studio',
      badge: 'Più veloce',
      description:
        'Carica semplicemente le foto di riferimento e approva cast, luoghi e ricordi: il nostro studio si occupa di tutta la narrazione, delle voci e della resa visiva 4K.',
    },
  },
  checklistHeading: 'Checklist di preparazione in 5 minuti',
  tips: {
    photosTitle: 'Raccogli 5–15 foto preferite',
    photosBody:
      'Anche gli scatti fatti col telefono dagli album stampati funzionano benissimo. Subito dopo il caricamento tocca "Racconta la foto" per registrare un breve ricordo di 15 secondi su chi è ritratto e quando è stata scattata.',
    voiceTitle: 'Campione vocale e clonazione (15–30 secondi)',
    voiceBody:
      'Siediti in una stanza silenziosa e arredata (evita cucine con eco). Parla con naturalezza a distanza di un braccio. Registra la frase di consenso se desideri una clonazione fedele della tua voce per la narrazione.',
    videoTitle: 'Clip video dal vivo o interviste sul divano',
    videoBody:
      'Mettiti di fronte a una finestra per una luce naturale morbida. Tenere il telefono in orizzontale è l’ideale, ma funziona anche in verticale: adattiamo automaticamente le clip verticali in un elegante formato documentario 16:9. Puoi anche caricare un’unica intervista più lunga che suddivideremo automaticamente in capitoli.',
    cueCardsTitle: 'Usa le Schede Guida integrate',
    cueCardsBody:
      'Non sai cosa dire? Tocca qualsiasi Scheda Guida di capitolo qui sotto per leggere spunti a caratteri grandi e registrare una breve intro video o audio direttamente dal telefono.',
    familyTitle: 'Invita i familiari ad aiutare',
    familyBody:
      'Figli o fratelli hanno vecchi album fotografici sul telefono? Tocca "Invita famiglia" nella barra in alto così potranno aggiungere foto e ricordi a proprio nome.',
  },
  invite: {
    greeting: 'Ciao! Il tuo portale privato di studio per "{projectTitle}" è pronto:',
    intro:
      'Quando ti è comodo, dedica qualche minuto a rivedere cast e ambientazioni e carica tutto ciò che desideri includere (tutto è facoltativo):',
    prepHeader: 'Consigli rapidi di preparazione (5 minuti):',
    photosBullet:
      '• Foto: Raccogli 5–15 foto preferite (vanno benissimo anche foto col telefono agli album cartacei). Subito dopo il caricamento puoi aggiungere una breve nota vocale.',
    voiceBullet:
      '• La tua voce: In una stanza silenziosa e arredata registra 15–30 s di voce (+ 1 frase di consenso) se vuoi che sia la tua voce a narrare.',
    videoBullet:
      '• Video / Racconti audio: Mettiti davanti a una finestra per registrare brevi intro oppure carica un’intervista più lunga: estraiamo automaticamente audio pulito e capitoli.',
    cueCardsBullet:
      '• Schede Guida integrate: Tocca qualsiasi scheda capitolo nel link per leggere tracce a caratteri grandi senza dover improvvisare.',
    familyBullet:
      '• Aiuto familiare: Tocca "Invita famiglia" nel portale così anche i tuoi cari potranno caricare le loro foto preferite!',
    closing: '— {brandName}',
  },
}

const NL_COPY: ClientPrepGuideCopy = {
  guideTitle: 'Snelle voorbereidingsgids & jouw productieopties',
  guideSubtitle:
    'Alles hieronder is optioneel — deel alleen wat prettig voelt, helemaal op je eigen tempo.',
  showGuide: 'Toon voorbereidingsgids',
  hideGuide: 'Verberg gids',
  printSheetLabel: 'Print checklist (1 pagina)',
  reassuranceNote:
    'Geen speciale camera of microfoon nodig. Je smartphone, laptop en favoriete familiefoto’s zijn alles wat je nodig hebt.',
  chooseStyleHeading: 'Welke stijl past het best bij jouw beeld? (Tik er één aan — optioneel)',
  styleSavedBadge: 'Voorkeur gedeeld met je producent',
  styles: {
    hybrid_live_ai: {
      title: 'Live hoofdstukintro’s + 4K AI-cinema',
      badge: 'Meest gekozen voor levensverhalen',
      description:
        'Kom kort in beeld (of alleen met geluid) met behulp van onze geheugenkaartjes op het scherm om herinneringen in te leiden, en vloei daarna naadloos over in 4K-filmische reconstructies.',
    },
    voice_over_cinema: {
      title: 'Jouw stem, 4K-beelden (Zonder camera)',
      badge: 'Zonder camera',
      description:
        'Je hoeft niet op camera. Neem een stemfragment van 15–30 seconden (of een audioverhaal) op en upload foto’s; jouw echte of gekloonde stem vertelt de 4K-scènes en geanimeerde herinneringsfoto’s.',
    },
    studio_hands_off: {
      title: 'Volledig verzorgde studioproductie',
      badge: 'Snelste optie',
      description:
        'Upload alleen referentiefoto’s en keur cast, locaties en aandenkens goed — onze studio verzorgt alle voice-overs, stemmen en 4K-beelden voor je.',
    },
  },
  checklistHeading: 'Voorbereidingschecklist van 5 minuten',
  tips: {
    photosTitle: 'Verzamel 5–15 favoriete foto’s',
    photosBody:
      'Foto’s met je telefoon van gedrukte fotoalbums werken prima. Tik direct na het uploaden op "Vertel fotoverhaal" om in 15 seconden kort in te spreken wie erop staat en wanneer de foto is gemaakt.',
    voiceTitle: 'Stemfragment & stemklonen (15–30 seconden)',
    voiceBody:
      'Ga in een rustige, ingerichte kamer met gordijnen of tapijt zitten (vermijd galmende keukens). Spreek natuurlijk op armlengte. Neem de toestemmingszin van 1 zin op als je een nauwkeurige stemkloon wilt voor de vertelling.',
    videoTitle: 'Live videoclips of bankinterviews',
    videoBody:
      'Kijk richting een raam voor zacht, natuurlijk daglicht. Je telefoon horizontaal houden is ideaal, maar verticaal werkt ook — we plaatsen verticale clips automatisch in een stijlvolle 16:9-documentairekader. Je kunt ook één langer interview uploaden dat we automatisch in hoofdstukken verdelen.',
    cueCardsTitle: 'Gebruik ingebouwde hoofdstuk-geheugenkaartjes',
    cueCardsBody:
      'Weet je niet goed wat je moet zeggen? Tik op een hoofdstukkaartje hieronder voor grote spiekbriefjes en neem direct vanaf je telefoon een korte video- of audio-intro op.',
    familyTitle: 'Nodig familieleden uit om mee te helpen',
    familyBody:
      'Hebben kinderen of broers en zussen oude fotoalbums op hun telefoon? Tik bovenin op "Familie uitnodigen" zodat zij onder hun eigen naam foto’s en herinneringen kunnen toevoegen.',
  },
  invite: {
    greeting: 'Hoi! Je persoonlijke studioportaal voor "{projectTitle}" staat klaar:',
    intro:
      'Neem gerust een paar minuten wanneer het uitkomt om cast en locaties te bekijken en materiaal te uploaden dat je wilt opnemen (alles is optioneel):',
    prepHeader: 'Snelle voorbereidingstips (5 minuten):',
    photosBullet:
      '• Foto’s: Verzamel 5–15 favoriete foto’s (ook telefoonfoto’s van papieren albums werken prima). Direct na het uploaden kun je een korte spraaknotitie toevoegen.',
    voiceBullet:
      '• Jouw stem: Neem in een rustige kamer een stemfragment van 15–30 s op (+ 1 gesproken toestemmingszin) als je wilt dat jouw stem het verhaal vertelt.',
    videoBullet:
      '• Live video / audioverhalen: Ga voor een raam zitten voor zacht licht bij korte intro’s of upload één langer interview — wij halen automatisch heldere audio en hoofdstukken eruit.',
    cueCardsBullet:
      '• Ingebouwde geheugenkaartjes: Tik op een hoofdstukkaartje in de link voor grote geheugensteuntjes, zodat je nooit hoeft te raden wat je moet zeggen.',
    familyBullet:
      '• Hulp van familie: Tik op "Familie uitnodigen" in het portaal zodat familieleden ook hun favoriete foto’s kunnen uploaden!',
    closing: '— {brandName}',
  },
}

const RU_COPY: ClientPrepGuideCopy = {
  guideTitle: 'Краткий гид по подготовке и варианты производства',
  guideSubtitle:
    'Всё нижеперечисленное необязательно — делитесь только тем, чем комфортно, в удобном вам темпе.',
  showGuide: 'Показать гид',
  hideGuide: 'Скрыть гид',
  printSheetLabel: 'Распечатать памятку (1 стр.)',
  reassuranceNote:
    'Специальная камера или микрофон не нужны. Вашего смартфона, ноутбука и любимых семейных фотографий вполне достаточно.',
  chooseStyleHeading: 'Какой стиль ближе всего к вашему замыслу? (Выберите — необязательно)',
  styleSavedBadge: 'Предпочтение отправлено вашему продюсеру',
  styles: {
    hybrid_live_ai: {
      title: 'Живые вступления к главам + 4K ИИ-кино',
      badge: 'Самый популярный для мемуаров',
      description:
        'Появитесь ненадолго в кадре (или в аудио) с нашими экранными карточками-подсказками, чтобы представить воспоминания, после чего видео плавно перейдёт в 4K-кинореконструкции.',
    },
    voice_over_cinema: {
      title: 'Ваш голос, 4K-видеоряд (Без камеры)',
      badge: 'Без камеры',
      description:
        'Сниматься на камеру не обязательно. Запишите образец голоса 15–30 секунд (или аудиоисторию) и загрузите фото — ваш живой или клонированный голос озвучит 4K-сцены и ожившие памятные снимки.',
    },
    studio_hands_off: {
      title: 'Полностью студийное производство',
      badge: 'Быстрее всего',
      description:
        'Просто загрузите справочные фото и утвердите персонажей, локации и памятные предметы — студия возьмёт на себя всю озвучку, голоса и 4K-визуализацию.',
    },
  },
  checklistHeading: 'Чек-лист подготовки за 5 минут',
  tips: {
    photosTitle: 'Подберите 5–15 любимых фотографий',
    photosBody:
      'Отлично подойдут даже снимки на телефон со страниц бумажных фотоальбомов. Сразу после загрузки нажмите «Рассказать историю фото», чтобы за 15 секунд надиктовать, кто на снимке и когда он сделан.',
    voiceTitle: 'Образец и клонирование голоса (15–30 секунд)',
    voiceBody:
      'Сядьте в тихой комнате с мебелью или ковром (избегайте гулкой кухни). Говорите естественно на расстоянии вытянутой руки. Запишите 1 фразу согласия, если хотите точное клонирование голоса для закадрового текста.',
    videoTitle: 'Живые видеофрагменты или домашнее интервью',
    videoBody:
      'Сядьте лицом к окну для мягкого естественного света. Лучше держать телефон горизонтально, но вертикальная съёмка тоже подходит — мы аккуратно оформим её в документальную рамку 16:9. Можно также загрузить одно длинное интервью, и мы сами разобьём его на главы.',
    cueCardsTitle: 'Используйте встроенные карточки-подсказки',
    cueCardsBody:
      'Не уверены, что сказать? Нажмите на любую карточку главы ниже, чтобы увидеть подсказки крупным шрифтом и записать короткое видео- или аудиовступление прямо с телефона.',
    familyTitle: 'Пригласите родных помочь',
    familyBody:
      'У детей, братьев или сестёр есть старые альбомы на телефоне? Нажмите «Пригласить семью» в верхней панели, чтобы они смогли добавить фото и воспоминания от своего имени.',
  },
  invite: {
    greeting: 'Здравствуйте! Ваш приватный студийный портал для «{projectTitle}» готов:',
    intro:
      'Когда будет удобно, уделите пару минут, чтобы проверить персонажей и локации и загрузить материалы, которые хотите включить (всё необязательно):',
    prepHeader: 'Быстрые советы по подготовке (5 минут):',
    photosBullet:
      '• Фотографии: подберите 5–15 любимых снимков (подойдут и фото бумажных альбомов на телефон). Сразу после загрузки можно добавить короткую голосовую заметку к фото.',
    voiceBullet:
      '• Ваш голос: в тихой комнате запишите образец речи на 15–30 сек. (+ 1 фразу согласия), если хотите, чтобы историю озвучивал ваш голос.',
    videoBullet:
      '• Видео / аудиоистории: сядьте лицом к окну для коротких вступлений или загрузите одно длинное интервью — мы автоматически выделим чистый звук и разделим на главы.',
    cueCardsBullet:
      '• Карточки-подсказки: нажмите на любую карточку главы по ссылке, чтобы увидеть текст крупным шрифтом.',
    familyBullet:
      '• Помощь близких: нажмите «Пригласить семью» в портале, чтобы родственники тоже могли загрузить свои любимые фото!',
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
  ja: JA_COPY,
  ko: KO_COPY,
  de: DE_COPY,
  fr: FR_COPY,
  it: IT_COPY,
  nl: NL_COPY,
  ru: RU_COPY,
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
