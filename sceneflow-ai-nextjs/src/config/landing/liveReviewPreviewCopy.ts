/**
 * Localized copy (all 7 priority languages: en, es, pt, hi, zh, ar, th) for the
 * Production Examples "Live Shareable Review Links — Coming Dec 3" preview modal.
 */

import type { HeroDubLocaleId } from '@/config/landing/featureRoomScripts'
import type { ReviewerMilestoneId } from '@/config/landing/productionPipelineDemo'

export type LiveReviewDoorCopy = {
  tabLabel: string
  urlPathPrefix: string
  headline: string
  description: string
  mockHeaderTag: string
  mockActionLabel: string
  mockHighlights: readonly [string, string, string]
}

export type LiveReviewPreviewLocaleCopy = {
  comingSoonBadge: string
  launchDateLabel: string
  modalSubtitle: string
  doorButtonHint: string
  zeroLoginPill: string
  whiteLabelPill: string
  mockRibbon: string
  whatYouCanDoHeading: string
  whatYouCanDoItems: readonly [string, string, string]
  startNowCta: string
  closeLabel: string
  doors: Record<ReviewerMilestoneId, LiveReviewDoorCopy>
}

export const LIVE_REVIEW_PREVIEW_COPY: Record<HeroDubLocaleId, LiveReviewPreviewLocaleCopy> = {
  en: {
    comingSoonBadge: 'Live Shareable Review Links · Active December 3',
    launchDateLabel: 'Interactive links go live Dec 3, 2026',
    modalSubtitle:
      'Every production example will open its real, interactive SceneFlow review link on December 3. Explore a preview of what your clients and collaborators experience with zero login.',
    doorButtonHint: 'Preview live shareable review link (Active Dec 3)',
    zeroLoginPill: 'Zero-Login Client Access',
    whiteLabelPill: '100% White-Label Ready',
    mockRibbon: 'Mock Preview · Live Dec 3',
    whatYouCanDoHeading: 'What activates on December 3 for every example link:',
    whatYouCanDoItems: [
      'Open real shareable URLs under your brand with zero client login required',
      'Switch 7 dubbed audio streams and leave timestamped frame-accurate notes',
      'Test round-capped client sign-off on Blueprints, Series Bibles & Final Masters',
    ],
    startNowCta: 'Start Building Your Studio ($9)',
    closeLabel: 'Close preview',
    doors: {
      screening: {
        tabLabel: 'Screening Room Link',
        urlPathPrefix: 'sceneflowai.studio/share/screening-room/',
        headline: 'White-Label Client Theater & Timestamped Approval',
        description:
          'Share a private theater link where clients watch voiced animatics or 4K masters, toggle 7 dubbed language tracks, pin timestamped notes, and click Approve.',
        mockHeaderTag: 'Round 1 of 2 · 4K Master Ready',
        mockActionLabel: 'Approve Final Master',
        mockHighlights: [
          '0:18 · Client note: "Love the golden-hour transition here!"',
          '0:44 · Audio track switched: EN → ES (Lip-sync verified)',
          '1:12 · Final color & music mix locked for delivery',
        ],
      },
      blueprint: {
        tabLabel: 'Blueprint Pass Link',
        urlPathPrefix: 'sceneflowai.studio/blueprint/share/',
        headline: 'Interactive Treatment, Beat Sheet & Margin Sign-Off',
        description:
          'Lock the story arc, cast portraits, Audience Resonance™ score, and package scope with your client before spending a single video generation credit.',
        mockHeaderTag: 'Audience Resonance™ 94 / 100',
        mockActionLabel: 'Approve Blueprint Pass',
        mockHighlights: [
          'Act I · Hook & Character Arc Locked',
          'Act II · Emotional Turn & Continuity Verified',
          'Act III · Climax Beat & Delivery Spec Signed',
        ],
      },
      series: {
        tabLabel: 'Series Bible Link',
        urlPathPrefix: 'sceneflowai.studio/s/',
        headline: 'Shared Series Canon, Cast Vault & Episode Slate',
        description:
          'Share an entire multi-episode season bible showing locked character faces, location plates, hero props, and episode-by-episode outlines.',
        mockHeaderTag: '5-Episode Arc · Continuity Locked',
        mockActionLabel: 'Approve Series Canon',
        mockHighlights: [
          'Cast Vault · Multi-age face & wardrobe locks synced',
          'Location Plates · 6 persistent studio environments',
          'Season Arc · Episodes 01–05 linked to shared Bible',
        ],
      },
      'script-ar': {
        tabLabel: 'Script & AR Link',
        urlPathPrefix: 'sceneflowai.studio/share/script/',
        headline: 'Production Script + Audience Resonance™ Scorecard',
        description:
          'Inspect formatted screenplay scenes alongside live Audience Resonance™ pacing diagnostics, voice casting notes, and scene-level reviewer comments.',
        mockHeaderTag: 'Pacing 95 · Hook 96 · Continuity 98',
        mockActionLabel: 'Sign Off Production Script',
        mockHighlights: [
          'Scene 01 · Dialogue timing & narrator cues verified',
          'Voice Cast · ElevenLabs neural voices mapped per character',
          'Resonance Pass · Zero pacing drops across all scenes',
        ],
      },
    },
  },
  es: {
    comingSoonBadge: 'Enlaces de Revisión en Vivo · Activos el 3 de Diciembre',
    launchDateLabel: 'Los enlaces interactivos se activan el 3 de dic. de 2026',
    modalSubtitle:
      'Cada ejemplo abrirá su enlace interactivo real de revisión en SceneFlow el 3 de diciembre. Explora aquí cómo verán y aprobarán tus clientes sin crear cuenta.',
    doorButtonHint: 'Ver vista previa del enlace de revisión en vivo (Activo 3 dic.)',
    zeroLoginPill: 'Acceso sin Registro',
    whiteLabelPill: '100% Marca Blanca',
    mockRibbon: 'Vista Previa · En Vivo 3 Dic.',
    whatYouCanDoHeading: 'Qué se activa el 3 de diciembre en cada enlace:',
    whatYouCanDoItems: [
      'Abre URLs reales compartibles bajo tu marca sin registro para clientes',
      'Cambia entre 7 idiomas doblados y deja notas exactas por código de tiempo',
      'Prueba aprobaciones con rondas limitadas en Blueprints, Biblias y Másteres',
    ],
    startNowCta: 'Inicia tu Estudio Ahora ($9)',
    closeLabel: 'Cerrar vista previa',
    doors: {
      screening: {
        tabLabel: 'Enlace Screening Room',
        urlPathPrefix: 'sceneflowai.studio/share/screening-room/',
        headline: 'Sala de Proyección Marca Blanca y Aprobación por Tiempo',
        description:
          'Comparte una sala privada donde tus clientes ven animatics o másteres 4K, cambian entre 7 idiomas doblados, dejan notas en el segundo exacto y aprueban en 1 clic.',
        mockHeaderTag: 'Ronda 1 de 2 · Máster 4K Listo',
        mockActionLabel: 'Aprobar Máster Final',
        mockHighlights: [
          '0:18 · Nota del cliente: "¡Excelente transición de luz cálida!"',
          '0:44 · Pista de audio cambiada: EN → ES (Sincronizado)',
          '1:12 · Color y mezcla musical bloqueados para entrega',
        ],
      },
      blueprint: {
        tabLabel: 'Enlace Blueprint Pass',
        urlPathPrefix: 'sceneflowai.studio/blueprint/share/',
        headline: 'Tratamiento Interactivo, Escaleta y Firma Previa',
        description:
          'Cierra el arco narrativo, retratos del elenco, puntaje de Resonancia de Audiencia™ y alcance antes de gastar créditos de video.',
        mockHeaderTag: 'Resonancia de Audiencia™ 94 / 100',
        mockActionLabel: 'Aprobar Blueprint Pass',
        mockHighlights: [
          'Acto I · Gancho inicial y arco de personajes bloqueados',
          'Acto II · Giro emocional y continuidad verificados',
          'Acto III · Clímax y especificación de entrega firmados',
        ],
      },
      series: {
        tabLabel: 'Enlace Biblia de Serie',
        urlPathPrefix: 'sceneflowai.studio/s/',
        headline: 'Canon Compartido, Bóveda de Elenco y Temporada',
        description:
          'Comparte la biblia completa de una serie con rostros bloqueados, locaciones, utilería y sinopsis de cada episodio.',
        mockHeaderTag: 'Arco de 5 Episodios · Canon Bloqueado',
        mockActionLabel: 'Aprobar Canon de Serie',
        mockHighlights: [
          'Elenco · Rostros y vestuario multi-edad sincronizados',
          'Locaciones · 6 entornos consistentes bloqueados',
          'Temporada · Episodios 01–05 vinculados a la Biblia',
        ],
      },
      'script-ar': {
        tabLabel: 'Enlace Guion y AR',
        urlPathPrefix: 'sceneflowai.studio/share/script/',
        headline: 'Guion de Producción + Diagnóstico Audience Resonance™',
        description:
          'Revisa escenas formateadas junto a métricas de ritmo, reparto de voces IA y notas por escena.',
        mockHeaderTag: 'Ritmo 95 · Gancho 96 · Continuidad 98',
        mockActionLabel: 'Aprobar Guion de Producción',
        mockHighlights: [
          'Escena 01 · Tiempos de diálogo y narración validados',
          'Voces · Perfiles neuronales ElevenLabs asignados',
          'Resonancia · Sin caídas de ritmo en toda la pieza',
        ],
      },
    },
  },
  pt: {
    comingSoonBadge: 'Links de Revisão ao Vivo · Ativos em 3 de Dezembro',
    launchDateLabel: 'Links interativos entram no ar em 3 dez. 2026',
    modalSubtitle:
      'Cada exemplo abrirá seu link real e interativo do SceneFlow em 3 de dezembro. Veja uma prévia do que clientes e parceiros vivenciam sem precisar criar conta.',
    doorButtonHint: 'Ver prévia do link de revisão ao vivo (Ativo 3 dez.)',
    zeroLoginPill: 'Acesso Sem Login',
    whiteLabelPill: '100% White-Label',
    mockRibbon: 'Prévia Ilustrativa · Ao Vivo 3 Dez.',
    whatYouCanDoHeading: 'O que ativa em 3 de dezembro em cada link:',
    whatYouCanDoItems: [
      'Abra URLs reais compartilháveis com sua marca e zero login para clientes',
      'Alterne entre 7 dublagens e deixe comentários no segundo exato do vídeo',
      'Teste aprovação com limite de rodadas em Blueprints, Bíblias e Masters 4K',
    ],
    startNowCta: 'Comece Seu Estúdio Agora ($9)',
    closeLabel: 'Fechar prévia',
    doors: {
      screening: {
        tabLabel: 'Link Screening Room',
        urlPathPrefix: 'sceneflowai.studio/share/screening-room/',
        headline: 'Sala de Exibição White-Label e Aprovação por Timestamp',
        description:
          'Envie uma sala privada onde clientes assistem animatics ou masters 4K, alternam 7 idiomas dublados, fixam comentários e clicam em Aprovar.',
        mockHeaderTag: 'Rodada 1 de 2 · Master 4K Pronto',
        mockActionLabel: 'Aprovar Master Final',
        mockHighlights: [
          '0:18 · Nota do cliente: "Adoramos a transição dourada!"',
          '0:44 · Faixa de áudio alterada: EN → PT (Sincronizado)',
          '1:12 · Cor e mixagem travados para entrega final',
        ],
      },
      blueprint: {
        tabLabel: 'Link Blueprint Pass',
        urlPathPrefix: 'sceneflowai.studio/blueprint/share/',
        headline: 'Tratamento Interativo, Escaleta e Aprovação Prévia',
        description:
          'Trave a história, retratos do elenco, nota de Ressonância de Audiência™ e escopo antes de gastar créditos de vídeo.',
        mockHeaderTag: 'Ressonância de Audiência™ 94 / 100',
        mockActionLabel: 'Aprovar Blueprint Pass',
        mockHighlights: [
          'Ato I · Gancho inicial e arco de personagens travados',
          'Ato II · Virada emocional e continuidade verificadas',
          'Ato III · Clímax e escopo de entrega aprovados',
        ],
      },
      series: {
        tabLabel: 'Link Bíblia da Série',
        urlPathPrefix: 'sceneflowai.studio/s/',
        headline: 'Cânone Compartilhado, Cofre de Elenco e Episódios',
        description:
          'Compartilhe a bíblia completa da temporada com rostos travados, cenários, objetos de cena e sinopses de todos os episódios.',
        mockHeaderTag: 'Arco de 5 Episódios · Cânone Travado',
        mockActionLabel: 'Aprovar Cânone da Série',
        mockHighlights: [
          'Elenco · Rostos e figurinos multi-idade sincronizados',
          'Cenários · 6 ambientes consistentes travados',
          'Temporada · Episódios 01–05 ligados à Bíblia',
        ],
      },
      'script-ar': {
        tabLabel: 'Link Roteiro e AR',
        urlPathPrefix: 'sceneflowai.studio/share/script/',
        headline: 'Roteiro de Produção + Painel Audience Resonance™',
        description:
          'Inspecione cenas formatadas ao lado de diagnósticos de ritmo, elenco de voz IA e comentários por cena.',
        mockHeaderTag: 'Ritmo 95 · Gancho 96 · Continuidade 98',
        mockActionLabel: 'Aprovar Roteiro de Produção',
        mockHighlights: [
          'Cena 01 · Diálogos e narração cronometrados',
          'Vozes · Perfis neurais ElevenLabs mapeados',
          'Ressonância · Ritmo consistente em todas as cenas',
        ],
      },
    },
  },
  hi: {
    comingSoonBadge: 'लाइव शेयर करने योग्य रिव्यू लिंक · 3 दिसंबर से सक्रिय',
    launchDateLabel: 'इंटरैक्टिव लिंक 3 दिसंबर 2026 को लाइव होंगे',
    modalSubtitle:
      'प्रत्येक उदाहरण 3 दिसंबर को अपना वास्तविक SceneFlow रिव्यू लिंक खोलेगा। देखें कि आपके क्लाइंट बिना लॉगिन के कैसे समीक्षा और अनुमोदन करेंगे।',
    doorButtonHint: 'लाइव रिव्यू लिंक प्रीव्यू देखें (3 दिसंबर से सक्रिय)',
    zeroLoginPill: 'बिना लॉगिन क्लाइंट एक्सेस',
    whiteLabelPill: '100% व्हाइट-लेबल तैयार',
    mockRibbon: 'मॉक प्रीव्यू · 3 दिसंबर को लाइव',
    whatYouCanDoHeading: '3 दिसंबर को हर उदाहरण लिंक पर क्या सक्रिय होगा:',
    whatYouCanDoItems: [
      'बिना क्लाइंट लॉगिन के अपने ब्रांड के साथ वास्तविक शेयर लिंक खोलें',
      '7 डब की गई भाषाओं में स्विच करें और सटीक टाइमस्टैम्प नोट्स जोड़ें',
      'Blueprint, सीरीज़ बाइबल और 4K मास्टर पर क्लाइंट स्वीकृति आज़माएँ',
    ],
    startNowCta: 'अभी अपना स्टूडियो शुरू करें ($9)',
    closeLabel: 'प्रीव्यू बंद करें',
    doors: {
      screening: {
        tabLabel: 'स्क्रीनिंग रूम लिंक',
        urlPathPrefix: 'sceneflowai.studio/share/screening-room/',
        headline: 'व्हाइट-लेबल क्लाइंट थिएटर और टाइमस्टैम्प अनुमोदन',
        description:
          'एक निजी थिएटर लिंक साझा करें जहाँ क्लाइंट 4K मास्टर देखते हैं, 7 डब भाषाएँ बदलते हैं, नोट्स जोड़ते हैं और 1 क्लिक में स्वीकृत करते हैं।',
        mockHeaderTag: 'राउंड 1 / 2 · 4K मास्टर तैयार',
        mockActionLabel: 'फ़ाइनल मास्टर स्वीकृत करें',
        mockHighlights: [
          '0:18 · क्लाइंट टिप्पणी: "गोल्डन-आवर ट्रांज़िशन शानदार है!"',
          '0:44 · ऑडियो ट्रैक बदला गया: EN → HI (सिंक सत्यापित)',
          '1:12 · फ़ाइनल कलर और म्यूज़िक मिक्स लॉक',
        ],
      },
      blueprint: {
        tabLabel: 'Blueprint पास लिंक',
        urlPathPrefix: 'sceneflowai.studio/blueprint/share/',
        headline: 'इंटरैक्टिव ट्रीटमेंट, बीट शीट और पूर्व-अनुमोदन',
        description:
          'वीडियो क्रेडिट खर्च करने से पहले क्लाइंट के साथ कहानी, कलाकार चित्र, Audience Resonance™ स्कोर और दायरा लॉक करें।',
        mockHeaderTag: 'Audience Resonance™ 94 / 100',
        mockActionLabel: 'Blueprint पास स्वीकृत करें',
        mockHighlights: [
          'एक्ट I · हुक और किरदार चाप लॉक',
          'एक्ट II · भावनात्मक मोड़ और कंटिन्यूटी सत्यापित',
          'एक्ट III · क्लाइमेक्स और डिलीवरी स्पेक स्वीकृत',
        ],
      },
      series: {
        tabLabel: 'सीरीज़ बाइबल लिंक',
        urlPathPrefix: 'sceneflowai.studio/s/',
        headline: 'साझा सीरीज़ कैनन, कास्ट वॉल्ट और एपिसोड स्लेट',
        description:
          'लॉक किए गए चेहरे, लोकेशन प्लेट, प्रॉप्स और हर एपिसोड के सारांश के साथ पूरी सीरीज़ बाइबल साझा करें।',
        mockHeaderTag: '5-एपिसोड आर्क · कंटिन्यूटी लॉक',
        mockActionLabel: 'सीरीज़ कैनन स्वीकृत करें',
        mockHighlights: [
          'कास्ट वॉल्ट · बहु-आयु चेहरे और पोशाक सिंक',
          'लोकेशन प्लेट · 6 सुसंगत स्टूडियो सेट लॉक',
          'सीज़न आर्क · एपिसोड 01–05 साझा बाइबल से जुड़े',
        ],
      },
      'script-ar': {
        tabLabel: 'स्क्रिप्ट और AR लिंक',
        urlPathPrefix: 'sceneflowai.studio/share/script/',
        headline: 'प्रोडक्शन स्क्रिप्ट + Audience Resonance™ स्कोरकार्ड',
        description:
          'लाइव Audience Resonance™ पेसिंग स्कोर, AI वॉइस कास्टिंग और दृश्य-दर-दृश्य टिप्पणियों के साथ स्क्रिप्ट देखें।',
        mockHeaderTag: 'पेसिंग 95 · हुक 96 · कंटिन्यूटी 98',
        mockActionLabel: 'प्रोडक्शन स्क्रिप्ट स्वीकृत करें',
        mockHighlights: [
          'सीन 01 · संवाद और नैरेशन टाइमिंग सत्यापित',
          'वॉइस कास्ट · हर किरदार हेतु ElevenLabs आवाज़ें',
          'रेज़ोनेंस पास · सभी दृश्यों में सटीक गति',
        ],
      },
    },
  },
  zh: {
    comingSoonBadge: '实时可分享审片链接 · 12 月 3 日正式开放',
    launchDateLabel: '交互式真实审片链接将于 2026 年 12 月 3 日上线',
    modalSubtitle:
      '12 月 3 日起，每部示例作品都将直达真实的 SceneFlow 在线审片链接。先通过以下界面预览，了解客户免登录即可完成的协作与签字体验。',
    doorButtonHint: '预览实时可分享审片链接（12 月 3 日上线）',
    zeroLoginPill: '客户免登录访问',
    whiteLabelPill: '100% 白标定制',
    mockRibbon: '界面预览 · 12 月 3 日开放',
    whatYouCanDoHeading: '12 月 3 日上线后，您可在每个示例链接中体验：',
    whatYouCanDoItems: [
      '直接打开带您品牌标识的真实分享网址，客户全程无需注册登录',
      '实时切换 7 种语种配音，并在精确时间点留下审片批注',
      '亲身体验 Blueprint、剧集设定集与 4K 成片的轮次锁定签字流程',
    ],
    startNowCta: '立即启动工作室 ($9)',
    closeLabel: '关闭预览',
    doors: {
      screening: {
        tabLabel: '放映室链接',
        urlPathPrefix: 'sceneflowai.studio/share/screening-room/',
        headline: '白标客户放映厅与精确时间轴批注签字',
        description:
          '分享私密放映室链接，客户可直接观看配音动态预演或 4K 母带，切换 7 国配音音轨，精准打点留言并一键批准。',
        mockHeaderTag: '第 1 / 2 轮 · 4K 母带就绪',
        mockActionLabel: '批准最终母带',
        mockHighlights: [
          '0:18 · 客户批注：“非常喜欢这段黄金时刻转场！”',
          '0:44 · 音轨切换：EN → ZH（口型与节奏已校对）',
          '1:12 · 终版调色与配乐混音已锁定交付',
        ],
      },
      blueprint: {
        tabLabel: '蓝图签字链接',
        urlPathPrefix: 'sceneflowai.studio/blueprint/share/',
        headline: '交互式故事蓝图、节拍表与毛利前置签字',
        description:
          '在消耗任何视频算力前，与客户在线确认剧情节拍、演员定妆照、Audience Resonance™ 评分及交付规格。',
        mockHeaderTag: 'Audience Resonance™ 94 / 100',
        mockActionLabel: '确认蓝图方案',
        mockHighlights: [
          '第一幕 · 开篇钩子与人物弧线已锁定',
          '第二幕 · 情感转折与视觉连续性已核验',
          '第三幕 · 高潮节拍与成片规格已签署',
        ],
      },
      series: {
        tabLabel: '剧集圣经链接',
        urlPathPrefix: 'sceneflowai.studio/s/',
        headline: '共享剧集设定集、角色资产库与全季大纲',
        description:
          '一键分享多集季度的完整设定集，展示锁定的人物面孔、场景底图、关键道具及逐集梗概。',
        mockHeaderTag: '5 集完整季 · 设定连续性已锁定',
        mockActionLabel: '确认剧集设定集',
        mockHighlights: [
          '角色库 · 跨年龄面孔与服装造型保持统一',
          '场景库 · 6 组核心置景视觉风格锁定',
          '全季大纲 · 第 01–05 集自动继承共享设定',
        ],
      },
      'script-ar': {
        tabLabel: '剧本与共鸣链接',
        urlPathPrefix: 'sceneflowai.studio/share/script/',
        headline: '标准制作剧本 + Audience Resonance™ 共鸣评分卡',
        description:
          '在线审阅分场剧本，同步查看节奏共鸣指数、角色配音音色方案与逐场审片意见。',
        mockHeaderTag: '节奏 95 · 钩子 96 · 连贯性 98',
        mockActionLabel: '确认制作剧本',
        mockHighlights: [
          '第 01 场 · 对白时长与旁白节奏校验通过',
          '配音阵容 · 每位角色均匹配 ElevenLabs 神经音色',
          '共鸣诊断 · 全片无拖沓低谷，情绪曲线饱满',
        ],
      },
    },
  },
  ar: {
    comingSoonBadge: 'روابط المراجعة الحية القابلة للمشاركة · تُفعّل في 3 ديسمبر',
    launchDateLabel: 'تُفتح الروابط التفاعلية مباشرة في 3 ديسمبر 2026',
    modalSubtitle:
      'سيفتح كل مثال إنتاجه عبر رابط مراجعة SceneFlow التفاعلي الحقيقي في 3 ديسمبر. استعرض أدناه محاكاة لما سيختبره عملاؤك دون الحاجة لتسجيل الدخول.',
    doorButtonHint: 'معاينة رابط المراجعة الحي (يُفعّل في 3 ديسمبر)',
    zeroLoginPill: 'دخول العميل بلا تسجيل',
    whiteLabelPill: 'علامة بيضاء 100%',
    mockRibbon: 'معاينة توضيحية · يُفعّل 3 ديسمبر',
    whatYouCanDoHeading: 'ما الذي سيُفعّل في 3 ديسمبر لكل رابط مثال:',
    whatYouCanDoItems: [
      'افتح روابط مشاركة حقيقية بعلامتك التجارية دون إنشاء حساب للعميل',
      'بدّل بين 7 مسارات صوتية مدبلجة وأضف ملاحظات مرتبطة بالثانية',
      'جرّب اعتماد العميل المحدود بالجولات للـ Blueprint وملف السلسلة والنسخة النهائية',
    ],
    startNowCta: 'ابدأ استوديوك الآن ($9)',
    closeLabel: 'إغلاق المعاينة',
    doors: {
      screening: {
        tabLabel: 'رابط غرفة العرض',
        urlPathPrefix: 'sceneflowai.studio/share/screening-room/',
        headline: 'صالة عرض بعلامتك مع ملاحظات زمنية واعتماد فوري',
        description:
          'شارك رابط عرض خاص يشاهد فيه العملاء النسخ الأولية أو الماستر 4K، ويبدلون بين 7 لغات مدبلجة ويتركون ملاحظات دقيقة قبل الاعتماد.',
        mockHeaderTag: 'الجولة 1 من 2 · ماستر 4K جاهز',
        mockActionLabel: 'اعتماد الماستر النهائي',
        mockHighlights: [
          '0:18 · ملاحظة العميل: "أحببنا الانتقال البصري الدافئ هنا!"',
          '0:44 · تبديل المسار الصوتي: EN ← AR (متزامن بدقة)',
          '1:12 · تثبيت الألوان والمكساج النهائي للتسليم',
        ],
      },
      blueprint: {
        tabLabel: 'رابط Blueprint Pass',
        urlPathPrefix: 'sceneflowai.studio/blueprint/share/',
        headline: 'المعالجة التفاعلية، نبضات القصة والاعتماد قبل الرندر',
        description:
          'ثبّت المسار الدرامي وصور الشخصيات ودرجة صدى الجمهور™ ونطاق الباقة مع عميلك قبل إنفاق أي رصيد فيديو.',
        mockHeaderTag: 'صدى الجمهور™ 94 / 100',
        mockActionLabel: 'اعتماد Blueprint Pass',
        mockHighlights: [
          'الفصل الأول · تثبيت الافتتاحية ومسار الشخصيات',
          'الفصل الثاني · التحقق من التحول العاطفي والاستمرارية',
          'الفصل الثالث · اعتماد الذروة ومواصفات التسليم',
        ],
      },
      series: {
        tabLabel: 'رابط ملف السلسلة',
        urlPathPrefix: 'sceneflowai.studio/s/',
        headline: 'دليل السلسلة المشترك، خزنة الشخصيات وقائمة الحلقات',
        description:
          'شارك الدليل الكامل للموسم بما يشمل وجوه الشخصيات المثبتة، المواقع، الدعائم، وملخصات جميع الحلقات.',
        mockHeaderTag: 'موسم من 5 حلقات · الاستمرارية مثبتة',
        mockActionLabel: 'اعتماد دليل السلسلة',
        mockHighlights: [
          'خزنة الشخصيات · تثبيت الوجوه والأزياء عبر الأعمار',
          'مواقع التصوير · 6 بيئات بصرية متسقة',
          'مسار الموسم · الحلقات 01–05 مرتبطة بالدليل المشترك',
        ],
      },
      'script-ar': {
        tabLabel: 'رابط السيناريو وAR',
        urlPathPrefix: 'sceneflowai.studio/share/script/',
        headline: 'سيناريو الإنتاج + بطاقة صدى الجمهور™',
        description:
          'تصفّح مشاهد السيناريو المنسّقة جنباً إلى جنب مع مؤشرات الإيقاع، أصوات الشخصيات وملاحظات المراجعين.',
        mockHeaderTag: 'الإيقاع 95 · الجذب 96 · الاستمرارية 98',
        mockActionLabel: 'اعتماد سيناريو الإنتاج',
        mockHighlights: [
          'المشهد 01 · ضبط توقيت الحوار والسرد الصوتي',
          'الأصوات · ربط أصوات ElevenLabs العصبية بكل شخصية',
          'فحص الصدى · تدفق درامي متماسك في كل المشاهد',
        ],
      },
    },
  },
  th: {
    comingSoonBadge: 'ลิงก์ตรวจงานจริงแบบแชร์ได้ · เปิดใช้งาน 3 ธันวาคม',
    launchDateLabel: 'ลิงก์โต้ตอบจริงเปิดใช้งานวันที่ 3 ธ.ค. 2026',
    modalSubtitle:
      'ตั้งแต่วันที่ 3 ธันวาคม ตัวอย่างทุกเรื่องจะเปิดลิงก์ตรวจงานจริงของ SceneFlow ได้ทันที ลองดูภาพจำลองประสบการณ์ที่ลูกค้าจะได้รับแบบไม่ต้องล็อกอิน',
    doorButtonHint: 'ดูตัวอย่างลิงก์ตรวจงานจริง (เปิดใช้ 3 ธ.ค.)',
    zeroLoginPill: 'ลูกค้าเข้าชมไม่ต้องล็อกอิน',
    whiteLabelPill: 'รองรับ White-Label 100%',
    mockRibbon: 'ภาพจำลอง · เปิดจริง 3 ธ.ค.',
    whatYouCanDoHeading: 'สิ่งที่เปิดใช้งานในวันที่ 3 ธันวาคมสำหรับทุกลิงก์ตัวอย่าง:',
    whatYouCanDoItems: [
      'เปิด URL จริงภายใต้แบรนด์ของคุณได้ทันทีโดยลูกค้าไม่ต้องสมัครสมาชิก',
      'สลับเสียงพากย์ 7 ภาษาและปักหมุดคอมเมนต์ตามวินาทีของวิดีโอ',
      'ทดสอบการอนุมัติงานแบบจำกัดรอบทั้ง Blueprint คัมภีร์ซีรีส์ และมาสเตอร์ 4K',
    ],
    startNowCta: 'เริ่มสร้างสตูดิโอของคุณ ($9)',
    closeLabel: 'ปิดหน้าต่างตัวอย่าง',
    doors: {
      screening: {
        tabLabel: 'ลิงก์ห้องฉาย Screening Room',
        urlPathPrefix: 'sceneflowai.studio/share/screening-room/',
        headline: 'โรงฉายลูกค้า White-Label พร้อมคอมเมนต์ตามเวลา & อนุมัติ',
        description:
          'แชร์ลิงก์โรงฉายส่วนตัวให้ลูกค้าชม Animatic หรือมาสเตอร์ 4K สลับเสียงพากย์ 7 ภาษา ปักหมุดโน้ตตามวินาที แล้วกดอนุมัติได้ในคลิกเดียว',
        mockHeaderTag: 'รอบที่ 1 จาก 2 · มาสเตอร์ 4K พร้อมตรวจ',
        mockActionLabel: 'อนุมัติมาสเตอร์สุดท้าย',
        mockHighlights: [
          '0:18 · โน้ตลูกค้า: "ชอบจังหวะเปลี่ยนฉากแสงทองตรงนี้มาก!"',
          '0:44 · สลับแทร็กเสียง: EN → TH (ซิงค์ปากเรียบร้อย)',
          '1:12 · ล็อกโทนสีและมิกซ์เสียงดนตรีพร้อมส่งมอบ',
        ],
      },
      blueprint: {
        tabLabel: 'ลิงก์ Blueprint Pass',
        urlPathPrefix: 'sceneflowai.studio/blueprint/share/',
        headline: 'โครงเรื่องโต้ตอบ บีตชีต & ยืนยันขอบเขตก่อนเรนเดอร์',
        description:
          'ล็อกเส้นเรื่อง ภาพนักแสดง คะแนน Audience Resonance™ และขอบเขตงานกับลูกค้าก่อนใช้เครดิตสร้างวิดีโอ',
        mockHeaderTag: 'Audience Resonance™ 94 / 100',
        mockActionLabel: 'อนุมัติ Blueprint Pass',
        mockHighlights: [
          'องก์ 1 · ล็อกฉากเปิดและพัฒนาการตัวละครครบถ้วน',
          'องก์ 2 · ตรวจจุดพลิกผันอารมณ์และความต่อเนื่องแล้ว',
          'องก์ 3 · ยืนยันจุดไคลแมกซ์และสเปกส่งมอบงาน',
        ],
      },
      series: {
        tabLabel: 'ลิงก์คัมภีร์ซีรีส์',
        urlPathPrefix: 'sceneflowai.studio/s/',
        headline: 'คัมภีร์ซีรีส์ร่วม คลังตัวละคร และผังตอนทั้งหมด',
        description:
          'แชร์คัมภีร์ซีซันครบทุกตอนพร้อมใบหน้านักแสดงที่ล็อกไว้ สถานที่ พร็อพหลัก และเรื่องย่อรายตอน',
        mockHeaderTag: 'ซีซัน 5 ตอน · ล็อกความต่อเนื่องครบ',
        mockActionLabel: 'อนุมัติคัมภีร์ซีรีส์',
        mockHighlights: [
          'คลังนักแสดง · ซิงค์ใบหน้าและชุดทุกช่วงวัยให้ตรงกัน',
          'ฉากและสถานที่ · ล็อกโลเคชันหลัก 6 แห่งต่อเนื่อง',
          'ผังซีซัน · ตอนที่ 01–05 เชื่อมต่อคัมภีร์ร่วมอัตโนมัติ',
        ],
      },
      'script-ar': {
        tabLabel: 'ลิงก์บทและคะแนน AR',
        urlPathPrefix: 'sceneflowai.studio/share/script/',
        headline: 'บทภาพยนตร์ฉบับผลิต + การ์ดคะแนน Audience Resonance™',
        description:
          'ตรวจบทตามรูปแบบมาตรฐานควบคู่กับกราฟจังหวะอารมณ์ เสียงพากย์ AI ประจำตัวละคร และโน้ตรายฉาก',
        mockHeaderTag: 'จังหวะ 95 · จุดดึงดูด 96 · ความต่อเนื่อง 98',
        mockActionLabel: 'อนุมัติบทฉบับผลิต',
        mockHighlights: [
          'ฉาก 01 · ตรวจจังหวะบทพูดและเสียงบรรยายเรียบร้อย',
          'ทีมเสียงพากย์ · จับคู่เสียง ElevenLabs ครบทุกตัวละคร',
          'ผลวิเคราะห์ AR · จังหวะเรื่องกระชับไม่มีช่วงเนือย',
        ],
      },
    },
  },
}
