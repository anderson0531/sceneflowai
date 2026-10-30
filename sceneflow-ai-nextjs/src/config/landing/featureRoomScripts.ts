/**
 * Canonical narration scripts and multilanguage dub translations for the 4 Key Features
 * Room Overview films:
 *   1. series-desk      ("Series Room" — 89.73s)
 *   2. blueprint-board  ("Blueprint Room" — 77.89s)
 *   3. production-stage ("Production Stage" — 132.40s)
 *   4. screening-room   ("Screening Room" — 53.66s)
 *
 * Voiced by Ana (CHAR_ANA: EXAVITQu4vr4xnSDxMaL on ElevenLabs v3) across
 * English, Spanish, Portuguese, Hindi, Chinese, Arabic, and Thai.
 */

import type { FeatureRoomId } from '@/config/landing/featureRoomMedia'
import { ANA_CHARACTER_VOICE, type HeroDubLocaleId } from '@/config/landing/heroSectionScripts'

export { ANA_CHARACTER_VOICE, type HeroDubLocaleId }

export type FeatureRoomScriptSpec = {
  roomId: FeatureRoomId
  title: string
  durationSeconds: number
  /** Start timestamps (in seconds) of each beat in the master screen recording. */
  beatStartSeconds: readonly number[]
  /** Verbatim English narration beats and localized translations for Ana's voiceover. */
  beatsByLocale: Record<HeroDubLocaleId, readonly string[]>
}

export const FEATURE_ROOM_SCRIPTS: Record<FeatureRoomId, FeatureRoomScriptSpec> = {
  'series-desk': {
    roomId: 'series-desk',
    title: 'Series Room',
    durationSeconds: 89.73,
    beatStartSeconds: [0.4, 11.2, 23.0, 35.3, 43.0, 53.5, 65.7, 74.5],
    beatsByLocale: {
      en: [
        'The Series Room is where that world becomes a season. Same characters, same story, every episode you add.',
        'Start with New Series. Say what you intend. Clarify it until the synopsis is yours. Then generate the baseline.',
        'Read the first cut, or listen to it. Behind the curated zen and titanium glass of an omnipresent Silicon Valley tech empire, every episode builds the arc.',
        'Consistency holds the story. Continuity holds the cast, the places, the props, and the look.',
        'Run Audience Resonance when you want a read on the season. See what lands. Apply an insight only if you want it.',
        'Direct the series in your own words. A recommendation can help. You accept the change; the rest of the story stays.',
        'Open an episode and direct that hour alone. Raise the stakes, or deepen the story. The other episodes stay.',
        'Start the episode project. The outline, the beats, and the cast go with it. Next, that story becomes the film.',
      ],
      es: [
        'La Sala de Series es donde ese mundo se convierte en una temporada completa. Los mismos personajes y la misma historia en cada episodio que agregues.',
        'Comienza con Nueva Serie. Expresa tu intención creativa, afínala hasta que la sinopsis sea completamente tuya y genera la base de la temporada.',
        'Lee el primer corte o escúchalo en voz alta. Detrás del cristal de titanio de un imperio tecnológico en Silicon Valley, cada episodio construye el arco dramático.',
        'La coherencia sostiene la historia. La continuidad protege al elenco, las locaciones, la utilería y el estilo visual.',
        'Ejecuta Resonancia de Audiencia cuando quieras evaluar la temporada. Descubre qué funciona y aplica una mejora solo si tú lo decides.',
        'Dirige la serie con tus propias palabras. Una recomendación inteligente puede ayudarte: aceptas el cambio y el resto de la historia permanece intacto.',
        'Abre cualquier episodio y dirige esa hora por separado. Eleva la tensión o profundiza en la trama mientras los demás episodios se mantienen firmes.',
        'Inicia el proyecto del episodio. El esquema, los pulsos narrativos y el elenco viajan contigo. En el siguiente paso, esa historia se convierte en película.',
      ],
      pt: [
        'A Sala de Séries é onde esse universo se transforma em uma temporada inteira. Os mesmos personagens e a mesma história em cada episódio que você adicionar.',
        'Comece em Nova Série. Diga o que você pretende, refine até que a sinopse seja totalmente sua e gere a estrutura base da temporada.',
        'Leia o primeiro corte ou ouça a narração. Por trás do vidro de titânio de um império tecnológico do Vale do Silício, cada episódio desenvolve o arco completo.',
        'A consistência sustenta a história. A continuidade preserva o elenco, os cenários, os objetos de cena e a identidade visual.',
        'Execute a Ressonância de Audiência quando quiser avaliar a temporada. Veja o que funciona e aplique uma sugestão apenas se quiser.',
        'Dirija a série com suas próprias palavras. Uma recomendação pode ajudar: você aceita a mudança e o restante da história permanece intacto.',
        'Abra um episódio e dirija aquela hora individualmente. Aumente a tensão ou aprofunde a trama enquanto os outros episódios permanecem seguros.',
        'Inicie o projeto do episódio. O esboço, os beats e o elenco seguem juntos. No próximo passo, essa história se transforma em filme.',
      ],
      hi: [
        'सीरीज़ रूम वह जगह है जहाँ आपकी दुनिया एक पूरे सीज़न में बदल जाती है। वही किरदार, वही कहानी, हर नए एपिसोड के साथ।',
        'नई सीरीज़ से शुरुआत करें। अपनी सोच बताएँ, सिनॉप्सिस को तब तक निखारें जब तक वह पूरी तरह आपका न हो जाए, और फिर आधार तैयार करें।',
        'पहला कट पढ़ें या उसे सुनें। सिलिकॉन वैली के एक विशाल टेक साम्राज्य के पीछे, हर एपिसोड कहानी की मुख्य धारा को आगे बढ़ाता है।',
        'निरंतरता कहानी को जोड़े रखती है। कंटिन्यूटी आपके कलाकारों, लोकेशन्स, प्रॉप्स और विज़ुअल लुक को एक समान बनाए रखती है।',
        'जब आप पूरे सीज़न का आकलन करना चाहें, तो ऑडियंस रेज़ोनेंस चलाएँ। देखें क्या प्रभावशाली है और कोई भी सुझाव तभी अपनाएँ जब आप चाहें।',
        'अपने शब्दों में सीरीज़ को निर्देशित करें। स्मार्ट सुझाव मदद कर सकते हैं—आप बदलाव स्वीकार करते हैं, और बाकी कहानी सुरक्षित रहती है।',
        'किसी एक एपिसोड को खोलें और केवल उस घंटे को निर्देशित करें। रोमांच बढ़ाएँ या कहानी को गहरा करें; बाकी एपिसोड वैसे ही रहेंगे।',
        'एपिसोड प्रोजेक्ट शुरू करें। रूपरेखा, बीट्स और कलाकार इसके साथ आगे बढ़ते हैं। अगले चरण में, यह कहानी फ़िल्म बन जाती है।',
      ],
      zh: [
        '剧集室是让那个世界变成整季剧集的地方。无论你添加多少集，始终保持相同的角色与核心故事。',
        '从新建剧集开始。说出你的创作意图，不断打磨直到故事梗概完全符合你的设想，然后生成剧集基线。',
        '阅读初稿，或直接聆听朗读。在硅谷科技帝国的钛金玻璃幕墙背后，每一集都在推进完整的故事弧线。',
        '连贯性稳固故事脉络，连续性锁定演员阵容、场景地点、道具细节与视觉风格。',
        '随时运行观众共鸣分析来评估整季表现。看清哪些情节最打动人心，只在你认可时一键应用洞察建议。',
        '用你自己的话指导整部剧集。智能建议可以提供帮助——你接受修改，其余故事结构依然稳固如初。',
        '打开任意单集，单独指导这一小时的剧情。提高戏剧冲突或深化人物故事，其他剧集不会受到干扰。',
        '启动单集项目。大纲、节拍与演员阵容将完整随行。下一步，这个故事将正式化作电影。',
      ],
      ar: [
        'غرفة المسلسلات هي المكان الذي يتحول فيه ذلك العالم إلى موسم كامل. نفس الشخصيات ونفس القصة في كل حلقة تضيفها.',
        'ابدأ بمسلسل جديد. عبّر عما تقصده، ووضّح الفكرة حتى يصبح الملخص ملكك تماماً، ثم أنشئ خط الأساس للموسم.',
        'اقرأ النسخة الأولى أو استمع إليها. خلف الواجهات الزجاجية لإمبراطورية تقنية في وادي السيليكون، تبني كل حلقة المسار الدرامي للموسم.',
        'الاتساق يحفظ القصة، والاستمرارية تحفظ طاقم التمثيل والأماكن والدعائم والمظهر البصري.',
        'شغّل تحليل صدى الجمهور عندما تريد تقييم الموسم. اكتشف ما يترك أثراً، وطبّق أي توصية فقط إذا أردت ذلك.',
        'أخرج المسلسل بكلماتك الخاصة. يمكن للتوصيات الذكية أن تساعدك؛ تقبل التغيير ويبقى باقي القصة كما هو.',
        'افتح أي حلقة وأخرج تلك الساعة وحدها. ارفع مستوى التوتر أو عمّق القصة، بينما تبقى الحلقات الأخرى ثابتة.',
        'ابدأ مشروع الحلقة. ينتقل المخطط والنبضات الدرامية وطاقم التمثيل معها. وفي الخطوة التالية، تتحول هذه القصة إلى فيلم.',
      ],
      th: [
        'ห้องซีรีส์คือพื้นที่ที่โลกใบนั้นกลายเป็นซีซันเต็มรูปแบบ ตัวละครเดิม เรื่องราวเดิม ในทุกๆ ตอนที่คุณเพิ่มเข้ามา',
        'เริ่มต้นด้วยซีรีส์ใหม่ บอกเล่าสิ่งที่คุณตั้งใจ ปรับแต่งจนเรื่องย่อเป็นของคุณอย่างแท้จริง แล้วสร้างโครงสร้างพื้นฐานทันที',
        'อ่านฉบับร่างแรกหรือกดฟังเสียงบรรยาย เบื้องหลังกระจกไทเทเนียมของอาณาจักรเทคโนโลยีในซิลิคอนแวลลีย์ ทุกตอนจะค่อยๆ สร้างเส้นเรื่องที่สมบูรณ์',
        'ความสม่ำเสมอช่วยยึดเหนี่ยวเรื่องราว ความต่อเนื่องช่วยคุมนักแสดง สถานที่ พร็อพ และโทนภาพให้คงเดิม',
        'รันระบบวิเคราะห์การตอบรับของผู้ชมเมื่อคุณต้องการประเมินซีซัน ดูว่าจุดไหนโดนใจ และเลือกใช้คำแนะนำเฉพาะเมื่อคุณต้องการเท่านั้น',
        'กำกับซีรีส์ด้วยคำพูดของคุณเอง คำแนะนำอัจฉริยะช่วยคุณได้ เมื่อคุณกดยอมรับการแก้ไข ส่วนที่เหลือของเรื่องราวก็จะยังคงอยู่ครบถ้วน',
        'เปิดแต่ละตอนเพื่อกำกับชั่วโมงนั้นโดยเฉพาะ เพิ่มความเข้มข้นหรือลงลึกในเนื้อเรื่อง โดยที่ตอนอื่นๆ ยังคงเดิม',
        'เริ่มโปรเจกต์ประจำตอน โครงเรื่อง จังหวะบีต และนักแสดงทั้งหมดจะถูกส่งต่อไปด้วย ขั้นต่อไป เรื่องราวนี้จะกลายเป็นภาพยนตร์',
      ],
    },
  },

  'blueprint-board': {
    roomId: 'blueprint-board',
    title: 'Blueprint Room',
    durationSeconds: 77.89,
    beatStartSeconds: [0.3, 10.9, 23.2, 33.8, 44.7, 55.8, 67.7],
    beatsByLocale: {
      en: [
        'Perfect the storyline here, before the 90-minute script. A series episode, or a new project. Production should not have to rebuild it.',
        'Start from the episode you already have, or a new project. Say what you intend, then generate the Blueprint.',
        'The Narrative Reasoning section reveals the why behind your Blueprint, breaking down character psychology, creative decisions, and dramatic intent.',
        'Optimize the beats here; they drive the script. Beats exist only here. Leave them wrong, and production rebuilds.',
        'Control every aspect of your Blueprint with the Blueprint Director. Just speak or type in natural language to receive intelligent, guided direction.',
        'Run Audience Resonance when you want a read. See what lands. Apply an insight only if you choose to.',
        'The storyline is set. The script is built from this Blueprint. Move straight to the Production Stage.',
      ],
      es: [
        'Perfecciona la trama aquí, antes del guion de noventa minutos, ya sea el episodio de una serie o un proyecto nuevo. Producción no debería tener que reconstruirlo.',
        'Comienza desde el episodio que ya tienes o desde un proyecto nuevo. Expresa tu intención y genera el Blueprint.',
        'La sección de Razonamiento Narrativo revela el porqué detrás de tu Blueprint, desglosando la psicología de los personajes, las decisiones creativas y la intención dramática.',
        'Optimiza aquí los pulsos narrativos: ellos impulsan el guion. Los beats solo existen en esta sala; si quedan mal, producción tendrá que reconstruir.',
        'Controla cada aspecto de tu estructura con el Director de Blueprint. Solo habla o escribe en lenguaje natural para recibir dirección guiada e inteligente.',
        'Ejecuta Resonancia de Audiencia cuando quieras una evaluación. Mira qué funciona y aplica una mejora solo si tú lo eliges.',
        'La historia está lista y el guion se construye a partir de este Blueprint. Avanza directamente al Escenario de Producción.',
      ],
      pt: [
        'Aperfeiçoe a linha narrativa aqui, antes do roteiro de noventa minutos — seja um episódio de série ou um novo projeto. A produção não deve precisar reconstruí-la.',
        'Comece a partir do episódio que você já tem ou de um novo projeto. Diga o que pretende e gere o Blueprint.',
        'A seção de Raciocínio Narrativo revela o porquê por trás do seu Blueprint, detalhando a psicologia dos personagens, as decisões criativas e a intenção dramática.',
        'Otimize os beats aqui; são eles que conduzem o roteiro. Os beats existem apenas nesta sala — se ficarem errados, a produção terá que refazer tudo.',
        'Controle cada aspecto da sua estrutura com o Diretor de Blueprint. Basta falar ou digitar em linguagem natural para receber direção guiada e inteligente.',
        'Execute a Ressonância de Audiência quando quiser uma leitura crítica. Veja o que funciona e aplique um insight apenas se escolher.',
        'A trama está definida e o roteiro é construído a partir deste Blueprint. Siga direto para o Palco de Produção.',
      ],
      hi: [
        'नब्बे मिनट की स्क्रिप्ट से पहले, यहीं अपनी कहानी को परफेक्ट बनाएँ—चाहे वह सीरीज़ का एपिसोड हो या कोई नया प्रोजेक्ट। प्रोडक्शन को इसे दोबारा बनाने की ज़रूरत नहीं पड़नी चाहिए।',
        'अपने मौजूदा एपिसोड या किसी नए प्रोजेक्ट से शुरुआत करें। अपना उद्देश्य बताएँ और फिर ब्लूप्रिंट तैयार करें।',
        'नैरेटिव रीज़निंग सेक्शन आपके ब्लूप्रिंट के पीछे का कारण स्पष्ट करता है—किरदारों के मनोविज्ञान, रचनात्मक निर्णयों और नाटकीय उद्देश्य का विश्लेषण करता है।',
        'यहीं अपने कहानी के बीट्स को बेहतर बनाएँ; वही स्क्रिप्ट को चलाते हैं। बीट्स केवल यहीं होते हैं—अगर वे अधूरे रहे, तो प्रोडक्शन को फिर से बनाना पड़ेगा।',
        'ब्लूप्रिंट डायरेक्टर के साथ अपने ब्लूप्रिंट के हर पहलू को नियंत्रित करें। बस सहज भाषा में बोलें या टाइप करें और बुद्धिमान, निर्देशित मार्गदर्शन प्राप्त करें।',
        'जब आप आकलन चाहें, तो ऑडियंस रेज़ोनेंस चलाएँ। देखें क्या असरदार है और कोई भी सुधार तभी लागू करें जब आप चुनें।',
        'कहानी तय हो चुकी है। स्क्रिप्ट इसी ब्लूप्रिंट से बनती है। अब सीधे प्रोडक्शन स्टेज पर आगे बढ़ें।',
      ],
      zh: [
        '在进入九十分钟完整剧本之前，先在这里完善故事主线。无论是剧集单集还是全新项目，都不必让制作阶段推倒重来。',
        '从已有的剧集单集或全新项目开始。说出你的创作意图，然后一键生成故事蓝图。',
        '叙事推理板块揭示蓝图背后的创作逻辑，深度拆解角色心理、创意决策与戏剧意图。',
        '在这里优化故事节拍，因为节拍直接驱动剧本。节拍只存在于蓝图室，如果这里出错，制作阶段就得全部返工。',
        '使用蓝图导演掌控蓝图的每一个细节。只需用自然语言说话或输入，即可获得智能化的引导式导演建议。',
        '随时运行观众共鸣分析获取反馈。看清哪些亮点最能打动观众，只在你决定时应用洞察建议。',
        '故事主线已经锁定，完整剧本将直接由这份蓝图构建。现在，直接前往制作舞台。',
      ],
      ar: [
        'أتقن الحبكة الدرامية هنا قبل كتابة سيناريو التسعين دقيقة، سواء كانت حلقة مسلسل أو مشروعاً جديداً. لا ينبغي لمرحلة الإنتاج أن تعيد بناءها من الصفر.',
        'ابدأ من الحلقة التي لديك بالفعل أو من مشروع جديد. عبّر عما تقصده، ثم أنشئ المخطط الأساسي.',
        'يكشف قسم المنطق السردي السبب وراء مخططك، محللاً سيكولوجية الشخصيات والقرارات الإبداعية والقصد الدرامي.',
        'حسّن النبضات الدرامية هنا لأنها هي التي تقود السيناريو. النبضات موجودة هنا فقط، وإذا تُركت غير مكتملة فسيضطر الإنتاج لإعادة البناء.',
        'تحكّم في كل جانب من جوانب مخططك مع مخرج المخطط. تحدث أو اكتب بلغة طبيعية لتحصل على توجيه ذكي ومباشر.',
        'شغّل تحليل صدى الجمهور عندما تريد تقييماً شاملاً. اكتشف ما ينجح، وطبّق أي توصية فقط إذا اخترت ذلك.',
        'تم تثبيت القصة، ويُبنى السيناريو مباشرة من هذا المخطط. انتقل الآن مباشرة إلى منصة الإنتاج.',
      ],
      th: [
        'ขัดเกลาเส้นเรื่องให้สมบูรณ์แบบที่นี่ ก่อนจะไปเป็นบทภาพยนตร์เก้าสิบนาที ไม่ว่าจะเป็นตอนของซีรีส์หรือโปรเจกต์ใหม่ งานโปรดักชันไม่ควรต้องมารื้อสร้างใหม่ทีหลัง',
        'เริ่มต้นจากตอนที่คุณมีอยู่แล้วหรือโปรเจกต์ใหม่ บอกสิ่งที่คุณตั้งใจ แล้วสร้างบลูพรินต์ขึ้นมาทันที',
        'ส่วนเหตุผลเชิงการเล่าเรื่องจะเผยเบื้องหลังของบลูพรินต์ วิเคราะห์จิตวิทยาตัวละคร การตัดสินใจเชิงสร้างสรรค์ และเจตนาทางดรามาอย่างละเอียด',
        'ปรับจังหวะบีตให้ลงตัวที่นี่ เพราะบีตคือหัวใจที่ขับเคลื่อนบทภาพยนตร์ บีตมีอยู่ที่นี่ที่เดียว หากปล่อยให้ผิดพลาด โปรดักชันต้องรื้อทำใหม่ทั้งหมด',
        'ควบคุมทุกองค์ประกอบของบลูพรินต์ด้วยผู้กำกับบลูพรินต์ เพียงพูดหรือพิมพ์ด้วยภาษาธรรมชาติเพื่อรับคำแนะนำการกำกับที่ชาญฉลาด',
        'รันระบบวิเคราะห์การตอบรับของผู้ชมเมื่อต้องการประเมินผล ดูว่าจุดไหนทำงานได้ดี และเลือกปรับใช้เฉพาะเมื่อคุณต้องการ',
        'เส้นเรื่องพร้อมสมบูรณ์แล้ว บทภาพยนตร์ถูกสร้างขึ้นจากบลูพรินต์นี้ ก้าวเข้าสู่สเตจโปรดักชันได้ทันที',
      ],
    },
  },

  'production-stage': {
    roomId: 'production-stage',
    title: 'Production Stage',
    durationSeconds: 132.40,
    beatStartSeconds: [0.3, 10.2, 22.3, 36.0, 43.2, 54.1, 65.0, 77.2, 88.8, 100.5, 111.8, 123.4],
    beatsByLocale: {
      en: [
        'Welcome to the Production Stage. The Blueprint is locked. Now, every chapter, scene, and shot becomes the film.',
        'Your script is structured by chapter and scene. Each shot holds direction, dialogue, and continuity references in one unified workflow.',
        'The Continuity Library locks your cast, wardrobes, locations, and props. Character voices match their portraits, holding consistency across every shot.',
        'Direct in plain language, spoken or typed. Shot direction writes the still and clip prompts automatically, with audience insights built right in.',
        'Plan your generation budget with credits, or your own private API key. Export the production script anytime in industry-standard formats.',
        'The Audio Agent generates dialogue, sound effects, and score concurrently across thirty shots. Filter missing cues, or balance the entire scene.',
        'The Stills Agent renders keyframe frames to illustrate each directed shot. Edit, regenerate, or upload references until every composition is locked.',
        'Preview the cut before spending on video. The Pre-Vis Animatic plays stills, camera motion, and audio together to prove the pacing.',
        'When the animatic holds, the Clips Agent renders motion. Every video clip matches the approved still, camera angle, and locked continuity.',
        'Fine-tune in the Mixer: speed controls and trims, overlays and transitions. Use Streams to generate multi-language dubs instantly and localized cuts.',
        'Cut promotional trailers at any time. Auto-generate thumbnails and publish scenes, chapters, or the complete master directly to public feeds.',
        'No loose clips. No broken timelines. You direct the vision. SceneFlow delivers the finished master.',
      ],
      es: [
        'Bienvenido al Escenario de Producción. El Blueprint está bloqueado. Ahora, cada capítulo, escena y plano se convierte en la película.',
        'Tu guion se estructura por capítulos y escenas. Cada plano reúne dirección, diálogos y referencias de continuidad en un solo flujo de trabajo unificado.',
        'La Biblioteca de Continuidad fija tu elenco, vestuario, locaciones y utilería. Las voces coinciden con cada retrato, manteniendo consistencia en cada toma.',
        'Dirige en lenguaje sencillo, hablado o escrito. La dirección de plano redacta automáticamente los prompts de imagen y video con análisis de audiencia integrado.',
        'Planifica tu presupuesto con créditos o con tu propia clave API privada. Exporta el guion de producción en cualquier momento en formatos estándar de la industria.',
        'El Agente de Audio genera diálogos, efectos de sonido y música simultáneamente en treinta planos. Filtra las pistas faltantes o equilibra toda la escena.',
        'El Agente de Fotogramas renderiza cuadros clave para ilustrar cada toma dirigida. Edita, regenera o sube referencias hasta fijar cada composición.',
        'Previsualiza el corte antes de invertir en video. El Animático Pre-Vis reproduce fotogramas, movimiento de cámara y audio juntos para comprobar el ritmo.',
        'Cuando el animático funciona, el Agente de Clips renderiza el movimiento. Cada clip de video respeta el fotograma aprobado, el ángulo de cámara y la continuidad.',
        'Ajusta todo en el Mezclador: controles de velocidad, recortes, superposiciones y transiciones. Usa Streams para generar doblajes multilingües y cortes localizados al instante.',
        'Edita tráilers promocionales en cualquier momento. Genera miniaturas automáticamente y publica escenas, capítulos o el máster completo directamente.',
        'Sin clips sueltos ni líneas de tiempo rotas. Tú diriges la visión; SceneFlow entrega la obra maestra terminada.',
      ],
      pt: [
        'Bem-vindo ao Palco de Produção. O Blueprint está travado. Agora, cada capítulo, cena e plano se transforma em filme.',
        'Seu roteiro é estruturado por capítulo e cena. Cada plano reúne direção, diálogos e referências de continuidade em um único fluxo de trabalho integrado.',
        'A Biblioteca de Continuidade fixa seu elenco, figurinos, locações e objetos de cena. As vozes combinam com os retratos, mantendo consistência em cada tomada.',
        'Dirija em linguagem simples, falada ou digitada. A direção de plano escreve automaticamente os prompts de imagem e vídeo com insights de audiência integrados.',
        'Planeje seu orçamento de geração com créditos ou com sua própria chave de API privada. Exporte o roteiro de produção a qualquer momento nos formatos padrão da indústria.',
        'O Agente de Áudio gera diálogos, efeitos sonoros e trilha simultaneamente em trinta planos. Filtre deixas ausentes ou equilibre a cena inteira.',
        'O Agente de Stills renderiza quadros-chave para ilustrar cada plano dirigido. Edite, regenere ou envie referências até travar cada composição.',
        'Pré-visualize o corte antes de gastar com vídeo. O Animático Pre-Vis reproduz quadros, movimento de câmera e áudio juntos para comprovar o ritmo.',
        'Quando o animático estiver firme, o Agente de Clips renderiza o movimento. Cada clipe de vídeo respeita o quadro aprovado, o ângulo de câmera e a continuidade.',
        'Faça o ajuste fino no Mixer: controles de velocidade, cortes, sobreposições e transições. Use Streams para gerar dublagens multilíngues e versões localizadas instantaneamente.',
        'Monte trailers promocionais a qualquer momento. Gere miniaturas automaticamente e publique cenas, capítulos ou o master completo diretamente.',
        'Sem clipes soltos. Sem linhas do tempo quebradas. Você dirige a visão; o SceneFlow entrega o master finalizado.',
      ],
      hi: [
        'प्रोडक्शन स्टेज में आपका स्वागत है। ब्लूप्रिंट लॉक हो चुका है। अब हर अध्याय, सीन और शॉट फ़िल्म में बदल जाता है।',
        'आपकी स्क्रिप्ट अध्याय और सीन के अनुसार व्यवस्थित है। प्रत्येक शॉट एक ही एकीकृत वर्कफ़्लो में निर्देशन, संवाद और कंटिन्यूटी रेफ़रेंस को सहेजता है।',
        'कंटिन्यूटी लाइब्रेरी आपके कलाकारों, वेशभूषा, लोकेशन्स और प्रॉप्स को लॉक करती है। किरदारों की आवाज़ें उनके पोर्ट्रेट से मेल खाती हैं और हर शॉट में एकरूपता बनाए रखती हैं।',
        'सरल भाषा में बोलकर या टाइप करके निर्देशित करें। शॉट डायरेक्शन ऑडियंस इनसाइट्स के साथ अपने आप स्टिल और क्लिप प्रॉम्प्ट लिखता है।',
        'क्रेडिट्स या अपनी निजी एपीआई कुंजी के साथ अपने जनरेशन बजट की योजना बनाएँ। किसी भी समय इंडस्ट्री-स्टैंडर्ड फ़ॉर्मैट में प्रोडक्शन स्क्रिप्ट एक्सपोर्ट करें।',
        'ऑडियो एजेंट तीस शॉट्स में एक साथ संवाद, साउंड इफ़ेक्ट्स और बैकग्राउंड स्कोर तैयार करता है। छूटे हुए क्यूज़ को फ़िल्टर करें या पूरे सीन का ऑडियो संतुलित करें।',
        'स्टिल्स एजेंट प्रत्येक निर्देशित शॉट को दर्शाने के लिए की-फ़्रेम तैयार करता है। जब तक हर कंपोज़िशन लॉक न हो जाए, तब तक एडिट करें, रीजनरेट करें या रेफ़रेंस अपलोड करें।',
        'वीडियो पर खर्च करने से पहले कट का प्रीव्यू देखें। प्री-विज़ एनिमैटिक पेसिंग परखने के लिए स्टिल्स, कैमरा मोशन और ऑडियो को एक साथ चलाता है।',
        'जब एनिमैटिक सटीक बैठता है, तो क्लिप्स एजेंट मोशन रेंडर करता है। हर वीडियो क्लिप स्वीकृत फ़्रेम, कैमरा एंगल और लॉक की गई कंटिन्यूटी से मेल खाती है।',
        'मिक्सर में बारीक ट्यूनिंग करें: स्पीड कंट्रोल, ट्रिम्स, ओवरले और ट्रांज़िशन। तुरंत बहुभाषी डब और लोकलाइज़्ड कट्स बनाने के लिए स्ट्रीम्स का उपयोग करें।',
        'किसी भी समय प्रमोशनल ट्रेलर तैयार करें। अपने आप थंबनेल बनाएँ और सीन, अध्याय या संपूर्ण मास्टर को सीधे पब्लिश करें।',
        'न कोई बिखरी क्लिप्स, न टूटी हुई टाइमलाइन। आप विज़न को निर्देशित करते हैं; सीनफ़्लो तैयार मास्टर डिलीवर करता है।',
      ],
      zh: [
        '欢迎来到制作舞台。故事蓝图已经锁定，现在，每一个章节、每一场戏、每一个镜头都将化作真正的电影。',
        '你的剧本按章节与场景严谨构建。每个镜头都将导演指令、对白台词与连续性参考整合在同一个统一工作流中。',
        '连续性资产库锁定你的演员阵容、服装造型、场景地点与道具细节。角色声线与人物肖像精准匹配，在每个镜头间保持高度一致。',
        '用自然的日常语言说话或输入即可执导。镜头导演会自动编写画面与视频提示词，并将观众共鸣洞察直接融入其中。',
        '使用平台积分或你自己的私有 API 密钥规划生成预算，随时以行业标准格式导出完整制作剧本。',
        '音频代理可在三十个镜头间并发生成对白、音效与配乐。快速筛选缺失音轨，或一键平衡整场戏的混音。',
        '静帧代理渲染关键帧画面来呈现每一个导演镜头。自由编辑、重新生成或上传参考图，直到每一帧构图完美锁定。',
        '在投入视频算力之前先预览剪辑节奏。预演动态分镜将静帧、镜头运动与音频同步播放，提前验证影片节奏。',
        '当动态分镜确认无误后，视频片段代理开始渲染动态画面。每一段视频都严格匹配已批准的静帧、机位角度与锁定连续性。',
        '在混音与剪辑台中精细打磨：调节速度、裁切镜头、添加叠加层与转场。使用多语流即时生成多语言配音与本地化成片。',
        '随时剪辑宣传预告片。自动生成封面缩略图，并将单场戏、章节或完整母带直接发布到公开频道。',
        '没有零散混乱的素材，也没有断裂的时间线。你执掌创作愿景，SceneFlow 交付最终母带。',
      ],
      ar: [
        'مرحباً بك في منصة الإنتاج. تم تثبيت المخطط الأساسي، والآن يتحول كل فصل ومشهد ولقطة إلى فيلم سينمائي.',
        'يتم تنظيم السيناريو حسب الفصول والمشاهد. تجمع كل لقطة بين التوجيه الإخراجي والحوار ومراجع الاستمرارية في سير عمل موحد.',
        'تعمل مكتبة الاستمرارية على تثبيت طاقم التمثيل والأزياء والمواقع والدعائم. تتطابق أصوات الشخصيات مع صورها للحفاظ على الاتساق في كل لقطة.',
        'أخرج بلغة بسيطة منطوقة أو مكتوبة. يكتب توجيه اللقطات أوامر الصور والفيديو تلقائياً مع دمج رؤى الجمهور مباشرة.',
        'خطط لميزانية التوليد باستخدام الرصيد أو مفتاح الواجهة البرمجية الخاص بك، وصدّر سيناريو الإنتاج في أي وقت بالصيغ القياسية المعتمدة.',
        'ينشئ وكيل الصوت الحوار والمؤثرات الصوتية والموسيقى التصويرية بالتوازي عبر ثلاثين لقطة. صفِّ الإشارات المفقودة أو وازن المشهد بالكامل.',
        'يقوم وكيل الصور الثابتة بتوليد الإطارات المفتاحية لتوضيح كل لقطة مخرجة. عدّل أو أعد التوليد أو ارفع مراجع بصرية حتى يستقر كل تكوين.',
        'عاين المونتاج قبل الإنفاق على توليد الفيديو. يشغّل الأنيماتيك المسبق الصور الثابتة وحركة الكاميرا والصوت معاً لإثبات الإيقاع.',
        'عندما يستقر الأنيماتيك، يقوم وكيل المقاطع بتوليد الحركة. يطابق كل مقطع فيديو الإطار المعتمد وزاوية الكاميرا والاستمرارية المثبتة.',
        'اضبط التفاصيل الدقيقة في المازج: التحكم في السرعة والقص والطبقات والانتقالات. واستخدم المسارات لتوليد دبلجة متعددة اللغات ونسخ محلية فوراً.',
        'اصنع عروضاً ترويجية في أي وقت. أنشئ الصور المصغرة تلقائياً وانشر المشاهد أو الفصول أو النسخة الرئيسية الكاملة مباشرة.',
        'لا مقاطع مبعثرة ولا خطوط زمنية مكسورة. أنت تقود الرؤية الإخراجية، وسين فلو يسلّمك الفيلم النهائي المتكامل.',
      ],
      th: [
        'ยินดีต้อนรับสู่สเตจโปรดักชัน บลูพรินต์ถูกล็อกเรียบร้อยแล้ว ตอนนี้ทุกบท ทุกซีน และทุกช็อตจะกลายเป็นภาพยนตร์',
        'บทของคุณถูกจัดโครงสร้างตามบทและซีน แต่ละช็อตเก็บคำสั่งกำกับ บทสนทนา และข้อมูลอ้างอิงความต่อเนื่องไว้ในเวิร์กโฟลว์เดียว',
        'คลังความต่อเนื่องช่วยล็อกนักแสดง เครื่องแต่งกาย สถานที่ และพร็อพ เสียงตัวละครตรงกับภาพลักษณ์ รักษาความสม่ำเสมอในทุกช็อต',
        'กำกับด้วยภาษาพูดหรือพิมพ์อย่างเป็นธรรมชาติ ระบบกำกับช็อตจะเขียนพรอมต์ภาพนิ่งและวิดีโอให้อัตโนมัติ พร้อมผสานข้อมูลเชิงลึกของผู้ชมทันที',
        'วางแผนงบประมาณการสร้างด้วยเครดิตหรือคีย์ API ส่วนตัวของคุณเอง และส่งออกบทโปรดักชันได้ทุกเมื่อในรูปแบบมาตรฐานอุตสาหกรรม',
        'เอเจนต์เสียงสร้างบทสนทนา ซาวด์เอฟเฟกต์ และดนตรีประกอบพร้อมกันสามสิบช็อต กรองคิวเสียงที่ขาดหายหรือปรับสมดุลเสียงทั้งซีนได้ทันที',
        'เอเจนต์ภาพนิ่งเรนเดอร์คีย์เฟรมเพื่อแสดงภาพแต่ละช็อตที่กำกับไว้ แก้ไข สร้างใหม่ หรืออัปโหลดภาพอ้างอิงจนกว่าองค์ประกอบทุกเฟรมจะลงตัว',
        'พรีวิวคัตก่อนใช้จ่ายงบสร้างวิดีโอ ระบบพรีวิสแอนิเมติกจะเล่นภาพนิ่ง การเคลื่อนกล้อง และเสียงไปพร้อมกันเพื่อพิสูจน์จังหวะของหนัง',
        'เมื่อแอนิเมติกลงตัวแล้ว เอเจนต์คลิปจะเรนเดอร์ภาพเคลื่อนไหว ทุกคลิปวิดีโอจะตรงกับภาพนิ่งที่อนุมัติ มุมกล้อง และความต่อเนื่องที่ล็อกไว้',
        'ปรับแต่งอย่างละเอียดในมิกเซอร์ ทั้งความเร็ว การตัดแต่ง เลเยอร์ซ้อนทับ และทรานซิชัน ใช้สตรีมเพื่อสร้างเสียงพากย์หลายภาษาและคัตท้องถิ่นได้ทันที',
        'ตัดต่อเทรลเลอร์โปรโมตได้ทุกเมื่อ สร้างภาพปกอัตโนมัติ และเผยแพร่ซีน บท หรือมาสเตอร์ฉบับสมบูรณ์ออกสู่สาธารณะได้โดยตรง',
        'ไม่มีคลิปกระจัดกระจาย ไม่มีไทม์ไลน์พังทลาย คุณเป็นผู้กำกับวิสัยทัศน์ และ SceneFlow ส่งมอบมาสเตอร์ที่เสร็จสมบูรณ์',
      ],
    },
  },

  'screening-room': {
    roomId: 'screening-room',
    title: 'Screening Room',
    durationSeconds: 53.66,
    beatStartSeconds: [0.8, 10.2, 21.8, 32.6, 44.8],
    beatsByLocale: {
      en: [
        'This is the Screening Room: your private theater and finishing suite, where the cut holds before it meets the world.',
        'One unified player: toggle seamlessly between the Pre-Vis Animatic, individual scenes, chapters, and the final master.',
        'Switch language streams on the fly. Audition dubs, lip-syncs, and localized shots locked directly to your cut.',
        'Share a private link for frame-accurate notes. Collaborators drop feedback directly on the picture, delivered straight to your phone.',
        'Screen the cut, rally your team, and premiere globally when the story holds.',
      ],
      es: [
        'Esta es la Sala de Proyección: tu cine privado y suite de acabado, donde el corte se consolida antes de salir al mundo.',
        'Un reproductor unificado: alterna sin interrupciones entre el Animático Pre-Vis, escenas individuales, capítulos y el máster final.',
        'Cambia de idioma al vuelo. Audiciona doblajes, sincronización labial y planos localizados integrados directamente en tu corte.',
        'Comparte un enlace privado para recibir notas con precisión de cuadro. Tus colaboradores dejan comentarios sobre la imagen y llegan directo a tu teléfono.',
        'Proyecta el corte, reúne a tu equipo y estrena a nivel global cuando la historia esté lista.',
      ],
      pt: [
        'Esta é a Sala de Exibição: seu cinema privado e suíte de finalização, onde o corte ganha forma final antes de encontrar o mundo.',
        'Um player unificado: alterne perfeitamente entre o Animático Pre-Vis, cenas individuais, capítulos e o master final.',
        'Troque os fluxos de idioma em tempo real. Avalie dublagens, sincronia labial e planos localizados travados diretamente no seu corte.',
        'Compartilhe um link privado para anotações com precisão de quadro. Colaboradores deixam feedback direto na imagem, entregue no seu celular.',
        'Exiba o corte, reúna sua equipe e faça a estreia global quando a história estiver pronta.',
      ],
      hi: [
        'यह स्क्रीनिंग रूम है: आपका निजी थिएटर और फ़िनिशिंग सुइट, जहाँ दुनिया के सामने आने से पहले आपका कट परखा जाता है।',
        'एक एकीकृत प्लेयर: प्री-विज़ एनिमैटिक, अलग-अलग सीन, अध्यायों और फ़ाइनल मास्टर के बीच सहजता से स्विच करें।',
        'चलते-चलते भाषा स्ट्रीम्स बदलें। अपने कट से सीधे जुड़े डब्स, लिप-सिंक और लोकलाइज़्ड शॉट्स का ऑडिशन लें।',
        'फ़्रेम-सटीक नोट्स के लिए एक निजी लिंक साझा करें। सहयोगी सीधे तस्वीर पर फ़ीडबैक देते हैं, जो तुरंत आपके फ़ोन पर पहुँचता है।',
        'कट की स्क्रीनिंग करें, अपनी टीम को साथ लाएँ, और जब कहानी पूरी तरह तैयार हो, तो दुनिया भर में प्रीमियर करें।',
      ],
      zh: [
        '这里是放映室：你的私人影院与精修套房，在成片走向世界之前，在这里完成最终把关。',
        '一个统一播放器：在预演动态分镜、独立场景、章节片段与最终母带之间无缝切换。',
        '随时即时切换多语言音轨。试听直接锁定在当前剪辑上的多语配音、口型同步与本地化镜头。',
        '分享私密审片链接，收集精确到帧的批注。协作者直接在画面上留下反馈，并即时推送到你的手机。',
        '审看成片、凝聚团队，当故事臻于完美时面向全球首映。',
      ],
      ar: [
        'هذه هي غرفة العرض: قاعتك السينمائية الخاصة وجناح اللمسات النهائية، حيث يستقر المونتاج قبل أن يلتقي بالعالم.',
        'مشغّل موحّد يتيح لك التبديل بسلاسة بين الأنيماتيك المسبق والمشاهد الفردية والفصول والنسخة الرئيسية النهائية.',
        'بدّل مسارات اللغات فوراً أثناء التشغيل. اختبر الدبلجة ومزامنة الشفاه واللقطات المحلية المرتبطة مباشرة بمونتاجك.',
        'شارك رابطاً خاصاً للحصول على ملاحظات دقيقة لكل إطار. يترك المتعاونون تعليقاتهم مباشرة على الصورة لتصل فوراً إلى هاتفك.',
        'اعرض الفيلم، واجمع فريقك، وأطلق العرض الأول عالمياً عندما تكتمل القصة.',
      ],
      th: [
        'นี่คือห้องฉายภาพยนตร์ โรงภาพยนตร์ส่วนตัวและห้องฟินิชชิงของคุณ ที่ซึ่งคัตสุดท้ายจะถูกตรวจสอบอย่างสมบูรณ์ก่อนออกสู่สายตาชาวโลก',
        'เครื่องเล่นเดียวที่รวมทุกอย่างไว้ด้วยกัน สลับดูระหว่างพรีวิสแอนิเมติก ซีนย่อย รายบท และมาสเตอร์ฉบับสมบูรณ์ได้อย่างลื่นไหล',
        'สลับสตรีมภาษาได้ทันทีขณะรับชม ทดสอบเสียงพากย์ ลิปซิงก์ และช็อตที่ปรับให้เข้ากับแต่ละภาษาซึ่งล็อกตรงกับคัตของคุณ',
        'แชร์ลิงก์ส่วนตัวเพื่อรับคอมเมนต์แบบแม่นยำรายเฟรม ทีมงานสามารถปักหมุดข้อเสนอแนะลงบนภาพโดยตรง และแจ้งเตือนตรงถึงโทรศัพท์ของคุณ',
        'ฉายคัตตรวจสอบ รวมพลังทีมของคุณ และพรีเมียร์สู่สายตาผู้ชมทั่วโลกเมื่อเรื่องราวสมบูรณ์แบบ',
      ],
    },
  },
}
