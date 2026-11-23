import { getLocaleEnglishName } from '@/i18n/locale'
import type { ClientPortalLocale } from './clientPortalCopy'

export type IntakeVerticalId =
  | 'custom_production'
  | 'video_memoir'
  | 'real_estate_tour'
  | 'education_module'
  | 'brand_story'

export type IntakeNarrativeMode =
  | 'fictional_narrative'
  | 'biographical_memoir'
  | 'commercial_brand'
  | 'educational_explainer'
  | 'property_showcase'

export type IntakePhase = 'vision_clarification' | 'structured_interview' | 'completed'

export interface IntakeMessageTurn {
  role: 'assistant' | 'customer'
  content: string
  createdAt: string
}

export interface IntakeVisionProposal {
  rawInput: string
  clarifiedVision: string
  inferredGenre?: string
  narrativeMode?: IntakeNarrativeMode
  intendedImpact: string
  targetAudience: string
  toneAndStyle: string
  deliverableScope?: string
  assistantMessage: string
  readyToConfirm: boolean
  revisionCount: number
  maxRevisions: number
  confirmed: boolean
  confirmedAt?: string
  turns: IntakeMessageTurn[]
}

export interface IntakeExtractedCharacter {
  id: string
  /** Single named individual — NEVER plural/collective groups; "(Age NN)" when spanning eras */
  name: string
  eraOrAge?: string
  /** Narrative or real-world role in the project (e.g., Protagonist, Co-Founder, Lead Host) */
  role: string
  /** Why this person matters and how they impact the Confirmed Vision */
  impact: string
}

export interface IntakeResonatingBeat {
  id: string
  title: string
  eraOrAge?: string
  summary: string
  /** Emotional, narrative, or business impact of this event toward fulfilling the Confirmed Vision */
  impact?: string
  /** Single named individuals featured in this beat — NEVER plural/collective groups */
  keyCharacters: string[]
  settingHint?: string
  deliveryFormatHint?: 'archival_photo' | 'ai_reenactment' | 'live_subject_intro'
}

export interface IntakeCoverageTopic {
  id: string
  label: string
  promptHint: string
}

/**
 * Lightweight "memory-jogger" coverage chips by narrative mode.
 * Customers tap any chapters/pillars that apply in ~10 seconds so the AI interviewer
 * ensures key life/project milestones (marriages, promotions, sports, proof points, etc.)
 * are captured cleanly without turning intake into a lengthy questionnaire.
 */
export const INTAKE_COVERAGE_TOPICS: Record<IntakeNarrativeMode, IntakeCoverageTopic[]> = {
  biographical_memoir: [
    { id: 'early_roots', label: 'Childhood & Roots', promptHint: 'Early family roots, hometown, and formative childhood memories' },
    { id: 'education_mentors', label: 'Education & Mentors', promptHint: 'Schooling, teachers, coaches, or mentors who shaped their path' },
    { id: 'sports_passions', label: 'Sports, Hobbies & Passions', promptHint: 'Athletics, music, crafts, or lifelong passions' },
    { id: 'career_promotions', label: 'Career & Promotions', promptHint: 'Defining jobs, promotions, businesses built, or service' },
    { id: 'love_marriage', label: 'Love & Marriage', promptHint: 'How they met their partner, wedding, or partnership milestones' },
    { id: 'family_children', label: 'Family & Children', promptHint: 'Named children, grandchildren, or cherished family traditions' },
    { id: 'challenges_transitions', label: 'Challenges & Turning Points', promptHint: 'Hardships overcome, moves, or life transitions' },
    { id: 'proudest_legacy', label: 'Achievements & Legacy', promptHint: 'Proudest accomplishments and closing blessing/legacy' },
  ],
  commercial_brand: [
    { id: 'founder_origin', label: 'Founder Origin', promptHint: 'Why the business started and the founding spark' },
    { id: 'customer_problem', label: 'Customer Pain Point', promptHint: 'The core problem or frustration customers face' },
    { id: 'unique_solution', label: 'Product / Secret Sauce', promptHint: 'How the solution works and what differentiates it' },
    { id: 'proof_results', label: 'Customer Proof & Milestones', promptHint: 'Real transformations, testimonials, or verified milestones' },
    { id: 'team_culture', label: 'Key People & Craft', promptHint: 'Named leaders, makers, or team members behind the brand' },
    { id: 'call_to_action', label: 'Offer & Call to Action', promptHint: 'The clear next step viewers should take' },
  ],
  property_showcase: [
    { id: 'exterior_approach', label: 'Exterior & Curb Appeal', promptHint: 'Arrival moment, architecture, and setting' },
    { id: 'signature_rooms', label: 'Signature Rooms', promptHint: 'Top 3 hero interior spaces (kitchen, primary suite, living)' },
    { id: 'outdoor_amenities', label: 'Outdoor & Amenities', promptHint: 'Pool, terrace, views, or unique property perks' },
    { id: 'neighborhood_lifestyle', label: 'Neighborhood & Lifestyle', promptHint: 'Local dining, schools, beaches, transit, or community vibe' },
    { id: 'agent_cta', label: 'Host & Listing CTA', promptHint: 'Agent presentation and open-house/contact closing' },
  ],
  educational_explainer: [
    { id: 'opening_hook', label: 'Core Question / Hook', promptHint: 'Why this lesson matters right away to learners' },
    { id: 'core_concepts', label: '3 Key Takeaways', promptHint: 'The essential skills or frameworks viewers must retain' },
    { id: 'real_case_study', label: 'Real-World Example', promptHint: 'Concrete case study, demo, or visual analogy' },
    { id: 'common_pitfalls', label: 'Common Mistakes', promptHint: 'Misconceptions or errors to avoid' },
    { id: 'recap_action', label: 'Recap & Practice Prompt', promptHint: 'Closing summary or action exercise' },
  ],
  fictional_narrative: [
    { id: 'world_protagonist', label: 'Protagonist & World', promptHint: 'Main character, setting, and ordinary world' },
    { id: 'inciting_incident', label: 'Inciting Incident', promptHint: 'The event that disrupts the status quo' },
    { id: 'antagonist_stakes', label: 'Antagonist & Stakes', promptHint: 'Opposition, allies, and what is at risk' },
    { id: 'midpoint_twist', label: 'Turning Point / Twist', promptHint: 'Major escalation or reveal in Act 2' },
    { id: 'climax_payoff', label: 'Climax & Resolution', promptHint: 'Peak confrontation and final emotional resonance' },
  ],
}

export function getCoverageTopicsForNarrativeMode(
  mode: IntakeNarrativeMode
): IntakeCoverageTopic[] {
  return INTAKE_COVERAGE_TOPICS[mode] || INTAKE_COVERAGE_TOPICS.fictional_narrative
}

export interface IntakeCompletenessChecklist {
  visionConfirmed: boolean
  charactersComplete: boolean
  beatsComplete: boolean
  closingImpactComplete: boolean
  completenessScore: number
  missingGaps: string[]
}

export interface IntakePlaybook {
  id: IntakeVerticalId
  defaultTitlePrefix: string
  genre: string
  tone: string
  defaultDurationMinutes: number
  hybridVideoShare: number
  suggestedMaxTurns: number
  welcomeByLocale: Record<ClientPortalLocale, string>
  /** Deterministic milestone questions used both to steer Gemini and as an instant offline fallback. */
  milestoneQuestions: string[]
  interviewerPersona: string
}

export const INTAKE_PLAYBOOKS: Record<IntakeVerticalId, IntakePlaybook> = {
  custom_production: {
    id: 'custom_production',
    defaultTitlePrefix: 'Custom Production',
    genre: 'Cinematic Production',
    tone: 'Driven by confirmed project vision',
    defaultDurationMinutes: 5,
    hybridVideoShare: 0.85,
    suggestedMaxTurns: 10,
    interviewerPersona:
      'You are an award-winning film director, story showrunner, and executive creative producer. Adapt 100% to the client’s Confirmed Vision Statement — whether it is a scripted Cinematic Drama, Sci-Fi/Thriller/Comedy short, Biographical Video Memoir, Documentary, Brand Film, or Educational piece. Ask ONE focused question at a time to capture individual characters (names, roles, motivations, impact) and key story beats/events (and their impact on the vision).',
    welcomeByLocale: {
      en: "Welcome! With your project vision in focus, let's bring the core characters and pivotal moments to life. Who is at the center of this project, what is their role, and what opening scene or event sets your vision in motion?",
      es: '¡Bienvenido! Con la visión de su proyecto definida, demos vida a los personajes principales y momentos clave. ¿Quién está en el centro del proyecto, cuál es su rol y qué escena o evento inicial pone en marcha su visión?',
      pt: 'Bem-vindo! Com a visão do seu projeto definida, vamos dar vida aos personagens principais e cenas-chave. Quem está no centro deste projeto, qual é o seu papel e que cena ou evento inicial coloca sua visão em movimento?',
      hi: 'स्वागत है! आपके प्रोजेक्ट विज़न को केंद्र में रखते हुए आइए मुख्य पात्रों और निर्णायक दृश्यों को आकार दें। इस प्रोजेक्ट के केंद्र में कौन है, उनकी भूमिका क्या है, और कौन-सा प्रारंभिक दृश्य या घटना आपके विज़न की शुरुआत करती है?',
      'zh-CN':
        '欢迎！围绕您已确认的项目愿景，让我们一步步梳理核心角色与关键剧情节点。首先，这部作品的核心人物是谁？他们的角色定位与动机是什么？又是哪一个开篇场景或事件拉开了故事序幕？',
      ar: 'مرحباً بك! انطلاقاً من رؤيتك المؤكدة للمشروع، دعنا نحدد الشخصيات المحورية والمشاهد الرئيسية. من يقف في قلب هذا العمل، وما دوره، وما المشهد أو الحدث الافتتاحي الذي يطلق هذه الرؤية؟',
      th: 'ยินดีต้อนรับครับ! จากวิสัยทัศน์โปรเจกต์ที่คุณยืนยันแล้ว เรามาวางตัวละครหลักและฉากสำคัญกันครับ ใครคือจุดศูนย์กลางของเรื่องนี้ มีบทบาทอย่างไร และฉากหรือเหตุการณ์เริ่มต้นใดเป็นจุดเปิดเรื่องครับ?',
    },
    milestoneQuestions: [
      'Who are the central individual characters or subjects (by name), what are their roles, and how does each person impact the core vision?',
      'What is the pivotal turning point, central conflict, or defining event that raises the stakes in the middle of the story, and what impact should it have on viewers?',
      'What climactic scene or emotional peak delivers the main payoff of your vision, and where does it visually unfold?',
      'How should the final scene resolve or conclude, and are there any specific visual settings, signature props, or reference images we should include?',
    ],
  },
  video_memoir: {
    id: 'video_memoir',
    defaultTitlePrefix: 'Life Memoir',
    genre: 'Biographical Documentary',
    tone: 'Warm, reverent, cinematic, and deeply human',
    defaultDurationMinutes: 15,
    hybridVideoShare: 0.25,
    suggestedMaxTurns: 10,
    interviewerPersona:
      'You are an intelligent, warm, deeply empathetic family biographer and story dramaturg helping memorialize a life story or celebration-of-life film. Begin by inviting a rich, open-ended narrative ("tell me your story"), then iterate through focused, gentle clarifications that shape a resonating set of story beats, pinpoint ages/time periods across life stages, and identify specific INDIVIDUAL people (never collective groups) in each beat.',
    welcomeByLocale: {
      en: "Hello, and welcome. Please take your time and tell me your story — share a detailed description of the life we are celebrating, from early roots and defining turning points to the chapters, places, and individual people who mattered most. Share as much as you'd like in your own words, and then we'll shape the most resonating story beats together.",
      es: 'Hola y bienvenido. Tómese su tiempo y cuénteme su historia: comparta una descripción detallada de la vida que celebramos, desde sus raíces e inicios hasta los momentos decisivos, lugares y personas individuales más importantes. Cuente todo lo que desee con sus propias palabras y luego daremos forma juntos a los capítulos más emotivos.',
      pt: 'Olá e seja bem-vindo. Fique à vontade para me contar a sua história em detalhes — compartilhe a trajetória da vida que estamos celebrando, desde as origens e momentos decisivos até os lugares e pessoas individuais mais marcantes. Conte tudo com suas próprias palavras e, em seguida, vamos lapidar juntos os capítulos mais emocionantes.',
      hi: 'नमस्ते और स्वागत है। कृपया इत्मीनान से मुझे अपनी पूरी कहानी सुनाएँ — हम जिस जीवन का उत्सव मना रहे हैं उसका विस्तृत विवरण साझा करें, शुरुआती जड़ों और अहम मोड़ों से लेकर उन स्थानों और खास व्यक्तियों तक जो सबसे महत्वपूर्ण रहे। अपने शब्दों में विस्तार से बताएँ, फिर हम मिलकर सबसे प्रभावशाली अध्यायों को संवारेंगे।',
      'zh-CN':
        '您好，欢迎来到专属人生故事访谈。请放慢脚步，向我娓娓道来您（或主人公）的人生故事——从早年成长背景、重要人生转折，到最难忘的地方与生命中关键的具体人物，请尽情详细讲述。随后我将陪伴您一步步梳理出最打动人心的故事篇章与人物脉络。',
      ar: 'أهلاً ومرحباً بك. خذ وقتك الكامل واحكِ لي قصتك بالتفصيل — شاركني وصفاً وافياً لمسيرة الحياة التي نحتفي بها، منذ الجذور الأولى والمحطات الفارقة وصولاً إلى الأماكن والأشخاص المحددين الذين تركوا الأثر الأعمق. تحدث بحرية وبكلماتك الخاصة، ثم سنصوغ معاً أجمل الفصول والمشاهد المؤثرة.',
      th: 'สวัสดีและยินดีต้อนรับครับ เชิญเล่าเรื่องราวชีวิตของคุณให้ผมฟังได้อย่างเต็มที่เลยครับ — เล่ารายละเอียดตั้งแต่จุดเริ่มต้น วัยเยาว์ จุดเปลี่ยนสำคัญ สถานที่ ไปจนถึงบุคคลสำคัญแต่ละท่านที่มีความหมายในแต่ละช่วงชีวิต เล่าตามธรรมชาติได้ยาวเท่าที่ต้องการ แล้วเราจะค่อยๆ ขัดเกลาฉากสำคัญที่กินใจที่สุดร่วมกันครับ',
    },
    milestoneQuestions: [
      'Thank you for sharing that foundation. Looking at your early chapters, approximately how old was the protagonist during those childhood/youth moments, and who are the specific individual people (by name, rather than groups) beside them in that beat?',
      'In the pivotal turning-point beat of young adulthood—such as a first career leap, service, migration, or pursuit of a dream—what specific moment on screen captures that shift, and how old were the key individuals involved?',
      'For the heart of the family/love story beat, tell me about the specific individual partner, child, or mentor at the center of that memory—what were their names and ages during that era?',
      'Which moment of quiet triumph, resilience, or proudest life accomplishment resonates most deeply, and which specific individuals share the frame in that scene?',
      'Are there signature keepsakes, heirlooms, recipes, songs, or recurring places that link their younger years to their later years?',
      'Since we create dedicated visual portraits for each distinct life stage (for example Age 16, Age 32, Age 62), which ages/eras do you have real photographs for, and which unphotographed chapters should we recreate cinematically?',
      'Finally, for our closing legacy beat today, who is present individually and what lasting blessing or feeling should stay in viewers’ hearts as the film concludes?',
    ],
  },
  real_estate_tour: {
    id: 'real_estate_tour',
    defaultTitlePrefix: 'Property Showcase',
    genre: 'Luxury Real Estate & Lifestyle Tour',
    tone: 'Architectural, inviting, aspirational, and crisp',
    defaultDurationMinutes: 1.5,
    hybridVideoShare: 0.5,
    suggestedMaxTurns: 10,
    interviewerPersona:
      'You are an executive real estate video producer interviewing a listing agent or property owner. Ask ONE concise question at a time to capture architectural highlights, lifestyle appeal, and photo inventory.',
    welcomeByLocale: {
      en: "Welcome! Let's design a standout property tour. First, what is the property name or neighborhood, and what type of home or space are we showcasing?",
      es: '¡Bienvenido! Diseñemos un recorrido inmobiliario inolvidable. Primero, ¿en qué zona o vecindario está la propiedad y qué tipo de inmueble vamos a presentar?',
      pt: 'Bem-vindo! Vamos criar um tour imobiliário marcante. Primeiro, qual é o bairro ou nome do imóvel e que tipo de propriedade estamos apresentando?',
      hi: 'स्वागत है! आइए आपकी प्रॉपर्टी के लिए एक शानदार वीडियो टूर तैयार करें। सबसे पहले, यह प्रॉपर्टी किस क्षेत्र में है और यह किस प्रकार का घर या स्थान है?',
      'zh-CN':
        '欢迎！让我们打造一支高转化率的房产导览大片。首先，请问该物业位于哪个街区或楼盘，属于什么类型的住宅或商业空间？',
      ar: 'مرحباً بك! دعنا نصمم جولة عقارية مميزة. أولاً، ما اسم العقار أو الحي، وما نوع المنزل أو المساحة التي نعرضها؟',
      th: 'ยินดีต้อนรับครับ! มาออกแบบวิดีโอทัวร์อสังหาริมทรัพย์ที่โดดเด่นกัน เริ่มแรก โครงการหรือทรัพย์สินนี้อยู่ในทำเลใด และเป็นบ้านหรือพื้นที่รูปแบบไหนครับ?',
    },
    milestoneQuestions: [
      'Who is the ideal buyer or guest for this property, and what immediate emotion should the opening aerial/exterior shot evoke?',
      'What are the top 3 signature rooms or architectural features (e.g., chef kitchen, infinity pool, mountain terrace) we must spotlight?',
      'What neighborhood lifestyle perks—cafes, schools, beaches, transit, or sunset views—make this location special?',
      'Which rooms and exterior angles do you have high-resolution photos for, and would you like an agent host or warm voiceover narration?',
      'What call-to-action, listing contact details, or open-house invitation should appear in the finale?',
    ],
  },
  education_module: {
    id: 'education_module',
    defaultTitlePrefix: 'Learning Module',
    genre: 'Educational & Visual Explainer',
    tone: 'Clear, engaging, authoritative, and memorable',
    defaultDurationMinutes: 5,
    hybridVideoShare: 0.35,
    suggestedMaxTurns: 10,
    interviewerPersona:
      'You are an instructional film designer helping an educator or training lead turn a lesson into a vivid visual blueprint. Ask ONE focused question at a time.',
    welcomeByLocale: {
      en: "Welcome! Let's turn your lesson into an engaging visual module. What is the topic of this episode, and who are the learners?",
      es: '¡Bienvenido! Convirtamos su lección en un módulo visual atractivo. ¿Cuál es el tema de este episodio y quiénes son los estudiantes?',
      pt: 'Bem-vindo! Vamos transformar sua aula em um módulo visual envolvente. Qual é o tema deste episódio e quem é o público aprendiz?',
      hi: 'स्वागत है! आइए आपके पाठ को एक रोचक विज़ुअल मॉड्यूल में बदलें। इस अध्याय का विषय क्या है और इसके शिक्षार्थी कौन हैं?',
      'zh-CN': '欢迎！让我们把您的课程转化为生动的视觉教学短片。请问本节课程的主题是什么？目标学员是谁？',
      ar: 'مرحباً بك! دعنا نحول درسك إلى وحدة مرئية تفاعلية ومشوقة. ما موضوع هذه الحلقة ومن هم المتعلمون المستهدفون؟',
      th: 'ยินดีต้อนรับครับ! มาเปลี่ยนบทเรียนของคุณเป็นวิดีโอการเรียนรู้ที่น่าติดตาม หัวข้อของบทเรียนนี้คืออะไร และผู้เรียนเป็นกลุ่มไหนครับ?',
    },
    milestoneQuestions: [
      'By the end of this video, what are the 3 core takeaways or skills the viewer must remember?',
      'What real-world story, case study, or visual analogy best brings the hardest concept to life?',
      'Should a consistent instructor presenter/avatar guide the lesson, or should it use documentary voiceover?',
      'Do you have specific diagrams, workplace photos, slides, or equipment props to upload into our Continuity Library?',
      'How should the module conclude—with a recap summary, reflection prompt, or next-episode teaser?',
    ],
  },
  brand_story: {
    id: 'brand_story',
    defaultTitlePrefix: 'Brand Story',
    genre: 'Commercial Brand Documentary',
    tone: 'Authentic, dynamic, trustworthy, and persuasive',
    defaultDurationMinutes: 2,
    hybridVideoShare: 0.6,
    suggestedMaxTurns: 10,
    interviewerPersona:
      'You are a creative director interviewing a founder or business owner to craft a high-converting brand story. Ask ONE crisp question at a time.',
    welcomeByLocale: {
      en: "Welcome! Let's craft your brand story. Tell me your business name and what inspired you to start it.",
      es: '¡Bienvenido! Creemos la historia de su marca. Cuénteme el nombre de su negocio y qué le inspiró a fundarlo.',
      pt: 'Bem-vindo! Vamos construir a história da sua marca. Qual é o nome do seu negócio e o que inspirou sua criação?',
      hi: 'स्वागत है! आइए आपके ब्रांड की कहानी तैयार करें। आपके व्यवसाय का नाम क्या है और इसे शुरू करने की प्रेरणा कहाँ से मिली?',
      'zh-CN': '欢迎！让我们打造打动人心的品牌故事。请告诉我您的品牌名称，以及当初创立它的初心是什么？',
      ar: 'مرحباً بك! دعنا نصنع قصة علامتك التجارية. أخبرني باسم مشروعك وما الذي ألهمك لإطلاقه؟',
      th: 'ยินดีต้อนรับครับ! มาสร้างสรรค์เรื่องราวแบรนด์ของคุณกัน ชื่อธุรกิจของคุณคืออะไร และอะไรคือแรงบันดาลใจเริ่มต้นครับ?',
    },
    milestoneQuestions: [
      'Who is your core customer, and what everyday frustration or need do you solve for them?',
      'Walk me through how your product or service works and what makes your approach different from anyone else.',
      'What real customer transformation, milestone, or proof point builds immediate trust?',
      'Which real photos (founder portrait, storefront/clinic, product shots) can you upload, and what is the final call to action?',
    ],
  },
}

export function isValidIntakeVertical(v: unknown): v is IntakeVerticalId {
  return (
    v === 'custom_production' ||
    v === 'video_memoir' ||
    v === 'real_estate_tour' ||
    v === 'education_module' ||
    v === 'brand_story'
  )
}

export function isValidNarrativeMode(v: unknown): v is IntakeNarrativeMode {
  return (
    v === 'fictional_narrative' ||
    v === 'biographical_memoir' ||
    v === 'commercial_brand' ||
    v === 'educational_explainer' ||
    v === 'property_showcase'
  )
}

/**
 * Infers the active narrative/production mode primarily from the customer's Vision Statement
 * (never forcing `video_memoir` if the customer described a Cinematic Drama, Sci-Fi, Comedy, Brand film, etc.).
 */
export function inferNarrativeModeFromVision(
  vision?: Partial<IntakeVisionProposal> | null,
  vertical: IntakeVerticalId = 'custom_production'
): IntakeNarrativeMode {
  if (vision?.narrativeMode && isValidNarrativeMode(vision.narrativeMode)) {
    return vision.narrativeMode
  }

  const text = [
    vision?.inferredGenre || '',
    vision?.clarifiedVision || '',
    vision?.rawInput || '',
    vision?.toneAndStyle || '',
  ]
    .join(' ')
    .toLowerCase()
    .trim()

  if (text) {
    const hasMemoirSignal =
      /\b(memoir|biograph|celebration of life|memorial|tribute|family legacy|grandparent|grandfather|grandmother|ancestr|life story|anniversary tribute|eulogy)\b/i.test(
        text
      )
    const hasPropertySignal =
      /\b(real estate|property tour|open house|listing|penthouse|architectural tour|villa tour)\b/i.test(
        text
      )
    const hasEducationSignal =
      /\b(lesson|curriculum|training module|explainer|instructional|course|student|onboarding tutorial)\b/i.test(
        text
      )
    const hasCommercialSignal =
      /\b(brand story|product launch|commercial|founder story|customer testimonial|marketing video|promo)\b/i.test(
        text
      )
    const hasFictionSignal =
      /\b(cinematic drama|drama|thriller|sci-fi|science fiction|fantasy|mystery|noir|horror|comedy|rom-com|romance|action|heist|fictional|scripted|short film|feature film|narrative film|protagonist|antagonist)\b/i.test(
        text
      )

    if (hasFictionSignal && !hasMemoirSignal) return 'fictional_narrative'
    if (hasMemoirSignal) return 'biographical_memoir'
    if (hasPropertySignal) return 'property_showcase'
    if (hasEducationSignal) return 'educational_explainer'
    if (hasCommercialSignal) return 'commercial_brand'
  }

  switch (vertical) {
    case 'video_memoir':
      return text ? 'fictional_narrative' : 'biographical_memoir'
    case 'real_estate_tour':
      return 'property_showcase'
    case 'education_module':
      return 'educational_explainer'
    case 'brand_story':
      return 'commercial_brand'
    case 'custom_production':
    default:
      return 'fictional_narrative'
  }
}

export function parseRuntimeMinutesFromScope(
  scope: string | undefined | null,
  fallbackMinutes: number
): number {
  if (!scope) return fallbackMinutes
  const lower = scope.toLowerCase()
  const secMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:sec|second|segundos|วินาที|秒|ثان)/i)
  if (secMatch) {
    const secs = Number(secMatch[1])
    if (Number.isFinite(secs) && secs >= 10 && secs <= 600) {
      return Math.max(0.5, Number((secs / 60).toFixed(1)))
    }
  }
  const minMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:min|minute|minutos|นาที|分钟|دق)/i)
  if (minMatch) {
    const mins = Number(minMatch[1])
    if (Number.isFinite(mins) && mins >= 0.5 && mins <= 120) {
      return Number(mins.toFixed(1))
    }
  }
  return fallbackMinutes
}

const LOCALIZED_VISION_FALLBACK_QUESTIONS: Record<
  ClientPortalLocale,
  Record<'fictional' | 'memoir' | 'general', string[]>
> = {
  en: {
    fictional: [
      'Who are the central individual characters in your story (by name), what are their dramatic roles and motivations, and what opening scene sets the plot in motion?',
      'What is the key turning point or escalating conflict that tests your characters, and what emotional impact should that beat create?',
      'Describe the climactic confrontation or emotional peak of the film—who is in the scene, where does it unfold, and what changes?',
      'How does the story resolve in the final beat, and are there signature locations or props essential to the visual world?',
    ],
    memoir: [
      'Who is the central individual at the heart of this tribute, who are the key named individuals beside them, and what opening chapter begins their journey?',
      'What pivotal turning point or life milestone shaped their path, approximately when/what age did it take place, and why did it matter so deeply?',
      'Which moment of resilience, love, or proudest accomplishment should anchor the emotional peak, and who shares that chapter?',
      'How would you like the closing legacy chapter to feel, and which eras have real photographs versus scenes we should recreate cinematically?',
    ],
    general: [
      'Who are the specific featured individuals or presenters (by name and role), and what opening hook immediately engages your audience?',
      'Walk me through the 2–3 core beats or chapters in the middle and the impact each moment should deliver toward your vision.',
      'What is the main proof point, transformation, or climactic highlight, and in what visual setting does it take place?',
      'What final takeaway or call-to-action closes the video, and do you have real photos, locations, or props to feature?',
    ],
  },
  es: {
    fictional: [
      '¿Quiénes son los personajes individuales principales (por nombre), cuáles son sus roles y motivaciones dramáticas, y qué escena inicial detona la historia?',
      '¿Cuál es el punto de giro o conflicto central que pone a prueba a los personajes y qué impacto emocional debe generar esa escena?',
      'Describa el clímax o momento cumbre de la historia: ¿quiénes participan, en qué escenario ocurre y qué cambia?',
      '¿Cómo se resuelve la historia en la escena final y qué escenarios u objetos clave definen su mundo visual?',
    ],
    memoir: [
      '¿Quién es la persona central de este homenaje, qué otras personas individuales con nombre la acompañan y qué capítulo inicial abre su historia?',
      '¿Qué momento decisivo marcó su camino, aproximadamente a qué edad o época ocurrió y por qué tuvo tanto impacto?',
      '¿Qué logro, muestra de resiliencia o recuerdo familiar debe ser el clímax emotivo y quiénes están presentes?',
      '¿Qué mensaje final desea dejar y para qué etapas cuenta con fotografías reales frente a escenas cinematográficas?',
    ],
    general: [
      '¿Quiénes son las personas o presentadores clave (nombre y rol) y qué escena inicial capta de inmediato a su audiencia?',
      'Cuénteme los 2 o 3 momentos principales del desarrollo y el impacto que cada uno aporta a su visión.',
      '¿Cuál es el momento cumbre o demostración principal y en qué lugar o escenario visual ocurre?',
      '¿Con qué mensaje o llamado a la acción cierra el video y qué fotos, lugares u objetos reales desea incluir?',
    ],
  },
  pt: {
    fictional: [
      'Quem são os personagens individuais centrais (pelo nome), quais são seus papéis e motivações dramáticas e qual cena inicial dá partida à trama?',
      'Qual é a grande virada ou conflito que coloca os personagens à prova e que impacto emocional essa cena deve provocar?',
      'Descreva o clímax ou ápice dramático do filme: quem está em cena, onde acontece e o que muda?',
      'Como a história se resolve na cena final e quais cenários ou objetos marcantes compõem o universo visual?',
    ],
    memoir: [
      'Quem é a pessoa central desta homenagem, quais outras pessoas individuais pelo nome fazem parte e qual capítulo abre essa trajetória?',
      'Qual momento decisivo transformou sua caminhada, em que época ou idade ocorreu e qual foi seu impacto?',
      'Qual conquista ou lembrança emocionante deve conduzir o ápice do filme e quem divide essa cena?',
      'Qual sentimento deve ficar no encerramento e para quais fases você possui fotos reais versus cenas recriadas?',
    ],
    general: [
      'Quem são as pessoas ou apresentadores principais (nome e papel) e qual cena de abertura prende imediatamente o público?',
      'Quais são os 2 ou 3 momentos centrais do vídeo e qual impacto cada um entrega para realizar sua visão?',
      'Qual é o ponto alto ou transformação principal e em qual cenário visual ele acontece?',
      'Qual mensagem final ou chamada para ação encerra o vídeo e quais fotos, locais ou itens reais serão usados?',
    ],
  },
  hi: {
    fictional: [
      'कहानी के मुख्य व्यक्तिगत पात्र कौन हैं (नाम सहित), उनकी नाटकीय भूमिकाएँ और प्रेरणाएँ क्या हैं, और कौन-सा प्रारंभिक दृश्य कहानी की शुरुआत करता है?',
      'वह मुख्य मोड़ या संघर्ष क्या है जो पात्रों की परीक्षा लेता है, और दर्शकों पर उसका क्या भावनात्मक प्रभाव पड़ना चाहिए?',
      'फ़िल्म के चरमोत्कर्ष (क्लाइमेक्स) का वर्णन करें — दृश्य में कौन है, यह कहाँ घटित होता है और क्या बदलता है?',
      'अंतिम दृश्य में कहानी का समाधान कैसे होता है, और इसकी विज़ुअल दुनिया के लिए कौन-से स्थान या प्रॉप्स महत्वपूर्ण हैं?',
    ],
    memoir: [
      'इस जीवन-कथा के केंद्र में कौन व्यक्ति हैं, उनके साथ अन्य मुख्य व्यक्ति (नाम सहित) कौन हैं, और कौन-सा शुरुआती अध्याय यात्रा शुरू करता है?',
      'किस निर्णायक मोड़ ने उनके जीवन को दिशा दी, उस समय उनकी अनुमानित आयु या दशक क्या था और उसका क्या प्रभाव रहा?',
      'संघर्ष, स्नेह या गर्व की कौन-सी उपलब्धि भावनात्मक शिखर बनेगी और उस दृश्य में कौन शामिल हैं?',
      'समापन अध्याय में दर्शकों के मन में क्या भाव रहना चाहिए, और किन चरणों की वास्तविक तस्वीरें आपके पास उपलब्ध हैं?',
    ],
    general: [
      'मुख्य प्रस्तुतकर्ता या व्यक्ति कौन हैं (नाम और भूमिका), और कौन-सा शुरुआती दृश्य दर्शकों का ध्यान तुरंत खींचता है?',
      'मध्य भाग के 2–3 प्रमुख अध्यायों और आपके विज़न पर प्रत्येक के प्रभाव के बारे में बताएँ।',
      'मुख्य उपलब्धि या प्रभावशाली दृश्य क्या है और वह किस परिवेश में दिखाई देगा?',
      'वीडियो किस संदेश या कॉल-टू-एक्शन के साथ समाप्त होगा, और क्या आपके पास वास्तविक फ़ोटो, स्थान या वस्तुएँ हैं?',
    ],
  },
  'zh-CN': {
    fictional: [
      '故事中的核心具体角色有哪些（请提供姓名）？他们的戏剧定位与内在动机是什么？哪一个开场镜头点燃了整部剧情？',
      '推动剧情升级的关键冲突或重大转折是什么？这一幕希望给观众带来怎样的情绪冲击？',
      '请描述全片的高潮戏（Climax）——有哪些具体角色在场、发生在什么视觉场景中、人物关系或命运发生了什么改变？',
      '故事在结尾如何落幕？有哪些标志性的场景空间或关键道具需要呈现在银幕上？',
    ],
    memoir: [
      '这部人物纪念片的核心主人公是谁？身边有哪些具体的重要人物（姓名与关系）？哪一段人生篇章作为开篇最合适？',
      '哪一次关键人生转折深刻改变了主人公的轨迹？大约发生在什么年代或年龄阶段，带来了怎样的影响？',
      '哪一个充满温情、坚韧或荣耀的时刻应作为全片的情感高潮？当时有哪些具体人物在场？',
      '影片结尾希望留下怎样的寄语或余韵？哪些年代阶段有真实老照片，哪些画面需要电影级重现？',
    ],
    general: [
      '影片中的关键出镜人物或主讲人是谁（姓名与定位）？开篇第一个画面如何抓住观众注意力？',
      '请介绍中段最核心的 2–3 个叙事节点，以及每个节点如何服务于您的项目愿景。',
      '最具说服力的高光时刻或核心展示是什么？它发生在怎样的视觉场景中？',
      '影片结尾希望传达什么核心信息或行动号召？是否有真实场地、产品或人物照片可供使用？',
    ],
  },
  ar: {
    fictional: [
      'من هي الشخصيات الفردية المحورية في قصتك (بالاسم)، وما أدوارها ودوافعها الدرامية، وما المشهد الافتتاحي الذي يطلق الأحداث؟',
      'ما نقطة التحول الرئيسية أو الصراع المتصاعد الذي يختبر الشخصيات، وما الأثر العاطفي المنشود من هذا المشهد؟',
      'صف مشهد الذروة الدرامية في الفيلم: من يشارك فيه، وأين تدور أحداثه، وما التحول الذي يحدث؟',
      'كيف تُحسم القصة في المشهد الختامي، وما المواقع أو العناصر البصرية الأساسية التي تميز عالم الفيلم؟',
    ],
    memoir: [
      'من هي الشخصية المحورية في هذه القصة، ومن الأشخاص المحددون بالاسم من حولها، وما الفصل الافتتاحي الذي يبدأ المسيرة؟',
      'ما المحطة الفارقة التي شكّلت مسار حياتها، وفي أي حقبة أو عمر تقريباً حدثت، وما أثرها العميق؟',
      'أي لحظة فخر أو صمود أو محبة يجب أن تمثل الذروة العاطفية للفيلم، ومن يشارك في ذلك المشهد؟',
      'ما الشعور أو الأثر الذي تود تركه في الختام، وما المراحل التي تتوفر لها صور حقيقية مقابل مشاهد سينمائية؟',
    ],
    general: [
      'من هم الأشخاص أو المتحدثون الرئيسيون (بالاسم والدور)، وما المشهد الافتتاحي الذي يجذب الجمهور فوراً؟',
      'حدثني عن أهم محطتين أو ثلاث محطات رئيسية في منتصف الفيديو والأثر الذي تحققه كل محطة لرؤيتك.',
      'ما أبرز لحظة تحول أو برهان رئيسي في العمل، وفي أي بيئة بصرية يدور؟',
      'ما الرسالة الختامية أو الدعوة لاتخاذ إجراء في نهاية الفيديو، وهل لديك صور أو مواقع أو عناصر حقيقية لإبرازها؟',
    ],
  },
  th: {
    fictional: [
      'ตัวละครหลักแต่ละคนในเรื่องคือใครบ้าง (ระบุชื่อ) มีบทบาทและแรงจูงใจทางดราม่าอย่างไร และฉากเปิดเรื่องเริ่มต้นขึ้นอย่างไรครับ?',
      'จุดหักเหสำคัญหรือความขัดแย้งหลักที่ทดสอบตัวละครคือเหตุการณ์ใด และต้องการสร้างอารมณ์ร่วมอย่างไรให้ผู้ชม?',
      'ช่วยเล่าฉากไคลแมกซ์ของเรื่อง — มีใครอยู่ในฉาก เกิดขึ้นที่สถานที่ใด และเกิดการเปลี่ยนแปลงสำคัญอย่างไร?',
      'ตอนจบของเรื่องคลี่คลายอย่างไร และมีฉากสถานที่หรืออุปกรณ์ประกอบฉากชิ้นสำคัญใดที่ต้องปรากฏในเรื่องบ้าง?',
    ],
    memoir: [
      'บุคคลสำคัญที่เป็นหัวใจของเรื่องนี้คือใคร มีบุคคลสำคัญท่านใดบ้าง (ระบุชื่อ) ที่อยู่เคียงข้าง และบทเริ่มต้นของชีวิตเริ่มจากช่วงใดครับ?',
      'จุดเปลี่ยนสำคัญที่สุดในชีวิตคือเหตุการณ์ใด เกิดขึ้นในช่วงอายุหรือยุคสมัยใด และมีความหมายต่อชีวิตอย่างไร?',
      'ช่วงเวลาแห่งความภาคภูมิใจ ความรัก หรือความเข้มแข็งใดที่ควรเป็นจุดพีคทางอารมณ์ และมีใครอยู่ในเหตุการณ์นั้นบ้าง?',
      'ฉากปิดท้ายต้องการฝากความรู้สึกใดไว้ในใจผู้ชม และช่วงวัยใดบ้างที่มีภาพถ่ายจริงเทียบกับฉากที่ต้องการสร้างภาพยนตร์ขึ้นมาใหม่?',
    ],
    general: [
      'บุคคลหลักหรือผู้ดำเนินเรื่องคือใคร (ชื่อและบทบาท) และฉากเปิดเรื่องดึงดูดความสนใจของผู้ชมอย่างไรครับ?',
      'ช่วยเล่า 2–3 ช่วงสำคัญกลางเรื่อง และผลลัพธ์ที่แต่ละช่วงช่วยขับเคลื่อนวิสัยทัศน์ของคุณ',
      'จุดไฮไลต์สำคัญที่สุดของวิดีโอคืออะไร และเกิดขึ้นในบรรยากาศหรือสถานที่แบบใด?',
      'ตอนท้ายต้องการสรุปสารสำคัญหรือ Call-to-Action อย่างไร และมีภาพถ่าย สถานที่ หรือสิ่งของจริงที่ต้องการนำมาใช้หรือไม่?',
    ],
  },
}

export function getLocalizedVisionFallbackQuestion(
  locale: ClientPortalLocale,
  stepIndex: number,
  narrativeMode: IntakeNarrativeMode
): string {
  const catalog = LOCALIZED_VISION_FALLBACK_QUESTIONS[locale] || LOCALIZED_VISION_FALLBACK_QUESTIONS.en
  const bucket =
    narrativeMode === 'fictional_narrative'
      ? catalog.fictional
      : narrativeMode === 'biographical_memoir'
        ? catalog.memoir
        : catalog.general
  const safeIdx = Math.max(0, Math.min(stepIndex, bucket.length - 1))
  return bucket[safeIdx]
}

export function buildClarifyIntakeVisionPrompt(input: {
  vertical: IntakeVerticalId
  locale: ClientPortalLocale
  brandName: string
  visionTurns: IntakeMessageTurn[]
  currentProposal?: Partial<IntakeVisionProposal> | null
  revisionNumber: number
  maxRevisions: number
}): string {
  const playbook = INTAKE_PLAYBOOKS[input.vertical]
  const languageName = getLocaleEnglishName(input.locale)
  const canAskFollowUp = input.revisionNumber < input.maxRevisions
  const transcriptText = input.visionTurns
    .map((t) => `${t.role === 'assistant' ? 'PRODUCER' : 'CLIENT'}: ${t.content}`)
    .join('\n')

  const priorBlock = input.currentProposal?.clarifiedVision
    ? `\nCurrent Proposed Vision Card:\n${JSON.stringify(
        {
          clarifiedVision: input.currentProposal.clarifiedVision,
          inferredGenre: input.currentProposal.inferredGenre,
          narrativeMode: input.currentProposal.narrativeMode,
          intendedImpact: input.currentProposal.intendedImpact,
          targetAudience: input.currentProposal.targetAudience,
          toneAndStyle: input.currentProposal.toneAndStyle,
          deliverableScope: input.currentProposal.deliverableScope,
        },
        null,
        2
      )}\n`
    : ''

  const presetNote =
    input.vertical === 'custom_production'
      ? 'Open / Vision-Driven Production (any genre — scripted cinematic drama, thriller, sci-fi, comedy, documentary, video memoir, commercial, or educational)'
      : `Optional studio preset "${playbook.id}" (${playbook.genre}) — ONLY use this preset if the client has not expressed a different genre or story type`

  return `You are an executive creative producer and film showrunner at "${input.brandName}" clarifying a client's overarching Project Vision Statement BEFORE beginning the detailed character & story beat interview.
Studio Link Context: ${presetNote}
Output Language: ${languageName} (${input.locale}) — write ALL user-facing prose fields strictly in ${languageName}.
Clarification pass: ${input.revisionNumber} of ${input.maxRevisions}.
${priorBlock}
Vision Conversation:
${transcriptText}

VISION CLARIFICATION & CONFIRMATION RULES (MANDATORY):
1. VISION DRIVES GENRE & FORMAT (NEVER FORCE A VIDEO MEMOIR):
   - The client's own vision statement determines what kind of film or video we are making! It could be a scripted Cinematic Drama, Thriller, Sci-Fi, Fantasy, Comedy, Documentary, Biographical Video Memoir, Brand Story, Educational Module, or Property Tour.
   - NEVER assume or inject family memoir / archival photo / life-celebration framing unless the client actually describes a personal or family life story!
2. PRESERVE EVERY CLIENT DETAIL: Synthesize a polished, vivid 3-5 sentence "clarifiedVision" brief in ${languageName} that captures the client's exact premise, genre, purpose, and creative direction without inventing unrequested subplots.
3. EXTRACT STRUCTURED TARGET FACETS:
   - "inferredGenre": Concise genre/format label in ${languageName} matching the client's vision (e.g., Cinematic Drama, Sci-Fi Thriller, Biographical Video Memoir, Commercial Brand Film, etc.).
   - "narrativeMode": Must be one of these exact enum strings:
     * "fictional_narrative" (scripted drama, thriller, sci-fi, comedy, romance, fantasy, action, fictional short/feature)
     * "biographical_memoir" (real-person life story, family tribute, celebration of life, biographical documentary)
     * "commercial_brand" (brand story, commercial, founder/product film, promo)
     * "educational_explainer" (lesson, training module, documentary explainer)
     * "property_showcase" (real estate, architectural or venue tour)
   - "intendedImpact": The emotional, dramatic, or business outcome viewers should feel or act on when the film finishes (1-2 sentences in ${languageName}).
   - "targetAudience": Who will watch this and in what viewing context (in ${languageName}).
   - "toneAndStyle": Desired visual cinematography, pacing, mood, and aesthetic style (in ${languageName}).
   - "deliverableScope": Target duration or format scope in ${languageName} honoring any length the client stated (or a natural scope for the inferred genre, e.g., ~3-6 min for a cinematic short drama, ~1-2 min for commercial/property, ~10-15 min for a life memoir).
4. CLARIFY OR CONFIRM:
   - ${
     canAskFollowUp
       ? 'If a critical North-Star element (such as core premise/genre, desired emotional/dramatic/business impact, or tone/audience) is still vague, ask ONE concise, warm clarifying question in "assistantMessage" (under 45 words, plain conversational language, NO bullet lists) and set "readyToConfirm": false. Do NOT jump into granular scene-by-scene questions yet — save those for Phase 2!'
       : 'This is the final clarification pass — do NOT ask another question. Affirm the locked vision warmly in "assistantMessage" (1-2 sentences) and set "readyToConfirm": true.'
   }
   - If the client's vision is already clear enough to serve as our North Star target, affirm what makes it compelling in "assistantMessage" (1-2 sentences, no question) and set "readyToConfirm": true.

Return valid JSON ONLY:
{
  "clarifiedVision": "3-5 sentence North Star vision statement in ${languageName}",
  "inferredGenre": "Genre / format label in ${languageName}",
  "narrativeMode": "fictional_narrative",
  "intendedImpact": "1-2 sentence emotional, dramatic, or business impact target in ${languageName}",
  "targetAudience": "Specific audience and viewing context in ${languageName}",
  "toneAndStyle": "Tone, cinematography, and visual style direction in ${languageName}",
  "deliverableScope": "Target length / format scope in ${languageName}",
  "assistantMessage": "Conversational producer reply in ${languageName}",
  "readyToConfirm": true
}`
}

export function buildVisionConfirmedKickoffPrompt(input: {
  vertical: IntakeVerticalId
  locale: ClientPortalLocale
  brandName: string
  confirmedVision: IntakeVisionProposal
}): string {
  const languageName = getLocaleEnglishName(input.locale)
  const narrativeMode = inferNarrativeModeFromVision(input.confirmedVision, input.vertical)
  const genreLabel =
    input.confirmedVision.inferredGenre ||
    (narrativeMode === 'fictional_narrative'
      ? 'Cinematic Narrative'
      : INTAKE_PLAYBOOKS[input.vertical].genre)

  const modeGuidance =
    narrativeMode === 'fictional_narrative'
      ? `This project is a SCRIPTED / FICTIONAL CINEMATIC PRODUCTION (${genreLabel}). Act as an award-winning film director and story showrunner. Ask about the central characters (their individual names, dramatic roles such as protagonist/antagonist, core desires/stakes) and the opening scene or inciting incident that kicks off the drama. Do NOT treat this as a family memoir or ask about archival childhood photos!`
      : narrativeMode === 'biographical_memoir'
        ? `This project is a BIOGRAPHICAL / MEMOIR PRODUCTION (${genreLabel}). Act as a warm, empathetic documentary and biography director. Ask about the central real-life individual(s) (by full name, role, and why they matter) and the foundational chapter or era that begins their story.`
        : `This project is a ${genreLabel} (${narrativeMode}). Act as an executive creative director. Ask about the central people/presenters or focal subject (names, roles, impact) and the opening hook beat that launches the video.`

  return `You are an executive creative director and story showrunner at "${input.brandName}".
Output Language: ${languageName} (${input.locale}) — write strictly in ${languageName}.

The client just CONFIRMED their Project Vision Statement (YOUR NORTH STAR):
- Genre & Mode: ${genreLabel} (${narrativeMode})
- Vision: ${input.confirmedVision.clarifiedVision}
- Intended Impact: ${input.confirmedVision.intendedImpact}
- Target Audience: ${input.confirmedVision.targetAudience}
- Tone & Style: ${input.confirmedVision.toneAndStyle}
${input.confirmedVision.deliverableScope ? `- Scope: ${input.confirmedVision.deliverableScope}\n` : ''}
DIRECTION FOR THIS PROJECT TYPE:
${modeGuidance}

Write a warm, concise kickoff message (2-3 sentences max) in ${languageName} that acknowledges their confirmed vision and asks the FIRST focused discovery question tailored directly to this vision. Do NOT re-ask facts already stated in the Confirmed Vision!

Return JSON ONLY:
{
  "openingQuestion": "Warm kickoff + ONE focused discovery question in ${languageName}"
}`
}

export function buildNextIntakeQuestionPrompt(input: {
  vertical: IntakeVerticalId
  locale: ClientPortalLocale
  brandName: string
  turns: IntakeMessageTurn[]
  customerTurnNumber: number
  maxCustomerTurns: number
  confirmedVision?: IntakeVisionProposal | null
  existingCharacters?: IntakeExtractedCharacter[]
  existingBeats?: IntakeResonatingBeat[]
  selectedCoverageTopics?: string[]
}): string {
  const playbook = INTAKE_PLAYBOOKS[input.vertical]
  const languageName = getLocaleEnglishName(input.locale)
  const remaining = Math.max(0, input.maxCustomerTurns - input.customerTurnNumber)
  const narrativeMode = inferNarrativeModeFromVision(input.confirmedVision, input.vertical)
  const genreLabel =
    input.confirmedVision?.inferredGenre ||
    (narrativeMode === 'fictional_narrative' ? 'Cinematic Narrative' : playbook.genre)

  const coverageCatalog = getCoverageTopicsForNarrativeMode(narrativeMode)
  const selectedTopics = Array.isArray(input.selectedCoverageTopics)
    ? input.selectedCoverageTopics
        .map((id) => coverageCatalog.find((t) => t.id === id))
        .filter((t): t is IntakeCoverageTopic => Boolean(t))
    : []
  const coverageBlock =
    selectedTopics.length > 0
      ? `\nCLIENT-SELECTED PILLARS / CHAPTERS TO COVER (PRIORITY MEMORY-JOGGERS — verify each selected pillar has concrete people/events before setting readyToComplete=true):\n${selectedTopics
          .map((t) => `- ${t.label}: ${t.promptHint}`)
          .join('\n')}\n`
      : ''

  const suggestedFallbackAngle = input.confirmedVision?.clarifiedVision
    ? getLocalizedVisionFallbackQuestion('en', input.customerTurnNumber - 1, narrativeMode)
    : playbook.milestoneQuestions[
        Math.min(input.customerTurnNumber - 1, playbook.milestoneQuestions.length - 1)
      ]

  const personaHeader = input.confirmedVision?.clarifiedVision
    ? narrativeMode === 'fictional_narrative'
      ? `You are an award-winning film director and story showrunner developing a scripted ${genreLabel} project solely around the client's Confirmed Project Vision. Focus on dramatic story craft: individual characters (names, roles like Protagonist/Antagonist/Ally, motivations, visual archetype, and dramatic impact), escalating story beats (inciting incident, turning points, climax, resolution, and emotional impact), and key settings/props. NEVER assume this is a family memoir or ask about childhood archival photographs unless the client explicitly brings up real-life archival photos!`
      : narrativeMode === 'biographical_memoir'
        ? `You are a warm, empathetic documentary and biography director developing a ${genreLabel} around the client's Confirmed Project Vision. Focus on key real-life individuals (names, roles, impact, and life-stage ages when spanning multiple decades), pivotal life chapters & their emotional impact, and which chapters have real archival photos vs. cinematic re-enactments.`
        : `You are an executive creative director developing a ${genreLabel} (${narrativeMode}) around the client's Confirmed Project Vision. Focus on key featured individuals/presenters (names, roles, impact), clear sequence beats & their audience/business impact, and visual settings/assets.`
    : playbook.interviewerPersona

  const defaultDeliveryFormat =
    narrativeMode === 'fictional_narrative' ? 'ai_reenactment' : 'archival_photo'

  const transcriptText = input.turns
    .map((t) => `${t.role === 'assistant' ? 'INTERVIEWER' : 'CLIENT'}: ${t.content}`)
    .join('\n')

  const confirmedVisionBlock = input.confirmedVision?.clarifiedVision
    ? `\nCONFIRMED PROJECT VISION (NORTH STAR TARGET — EVERY QUESTION MUST SERVE THIS SPECIFIC VISION):\n- Genre & Mode: ${genreLabel} (${narrativeMode})\n- Vision: ${input.confirmedVision.clarifiedVision}\n- Intended Impact: ${input.confirmedVision.intendedImpact}\n- Audience: ${input.confirmedVision.targetAudience}\n- Tone & Style: ${input.confirmedVision.toneAndStyle}${input.confirmedVision.deliverableScope ? `\n- Scope: ${input.confirmedVision.deliverableScope}` : ''}\n`
    : ''

  const priorCharactersBlock =
    Array.isArray(input.existingCharacters) && input.existingCharacters.length > 0
      ? `\nCurrent Extracted Characters (refine names, roles, and impact):\n${JSON.stringify(input.existingCharacters, null, 2)}\n`
      : ''

  const priorBeatsBlock =
    Array.isArray(input.existingBeats) && input.existingBeats.length > 0
      ? `\nCurrent Story Beats Draft (refine events, keyCharacters, settings, and impact):\n${JSON.stringify(input.existingBeats, null, 2)}\n`
      : ''

  return `${personaHeader}
Production Studio Brand: ${input.brandName}
Output Language: ${languageName} (${input.locale}) — write "reply", character fields, and beat fields strictly in ${languageName}.
Client turns completed: ${input.customerTurnNumber} of ${input.maxCustomerTurns} (${remaining} remaining).
${confirmedVisionBlock}${coverageBlock}
Suggested discovery angle if a gap remains:
"${suggestedFallbackAngle}"
${priorCharactersBlock}${priorBeatsBlock}
Conversation so far:
${transcriptText}

AUTOMATED COMPLETENESS-DRIVEN INTERVIEW RULES (MANDATORY — MINIMIZE DOWNSTREAM PRODUCER REWORK):
1. EXTRACT & CLARIFY INDIVIDUAL CHARACTERS, ROLES & IMPACT ("extractedCharacters"):
   - Capture every key character/subject as a SINGLE NAMED INDIVIDUAL (NEVER plural/collective groups like "Friends", "Guards", "Neighbors", "Parents", "Coworkers", "The Family").
   - ONLY if the same character genuinely appears across distinct decades/life stages (>= 10 years apart in age), list separate life-stage entries named "Full Name (Age NN)". For single-era dramas or commercials, use their normal character name!
   - For EVERY character, capture both their "role" (e.g., "Protagonist", "Antagonist", "Mentor", "Founder", "Lead Host") AND their "impact" (how their choices, conflict, or presence drive the Confirmed Vision). If a key character's name, role, or impact is missing, add it to "missingGaps"!
2. EXTRACT & CLARIFY KEY EVENTS / STORY BEATS & THEIR IMPACT ("resonatingBeats"):
   - Distill 3 to 7 concrete story beats spanning opening hook -> pivotal turning points / conflict -> climax & closing payoff aligned 100% to the Confirmed Vision.
   - For EVERY beat, capture "title", optional "eraOrAge" (ONLY when relevant to multi-era stories or time jumps), "summary" (what visibly happens on screen), "impact" (WHY this beat matters emotionally, dramatically, or strategically to the Vision), "keyCharacters" (exact individual names), "settingHint", and "deliveryFormatHint" ("ai_reenactment" for scripted cinematic/AI video scenes; "archival_photo" ONLY when using real client archival stills).
   - If beats lack clear dramatic/narrative progression, clear impact, or a satisfying climax/resolution for the Vision, add those specifics to "missingGaps"!
3. ITERATE UNTIL COMPLETE ("completenessChecklist" & "readyToComplete"):
   - Evaluate honestly whether a director/producer could build a complete first-take Blueprint for this ${genreLabel} right now WITHOUT guessing character roles/impacts or beat events/impacts:
     * "charactersComplete": All central characters/individuals have specific names, clear roles, and stated impact.
     * "beatsComplete": At least 3-6 concrete key scenes/beats with clear visual summaries, settings, and stated impact.
     * "closingImpactComplete": The climax and finale resolution/takeaway fulfilling the Confirmed Vision are clear.
   - Set "readyToComplete": true ONLY when ("charactersComplete" && "beatsComplete" && "closingImpactComplete") OR ${remaining} <= 1.
4. ASK ONE HIGH-LEVERAGE GAP QUESTION AT A TIME:
   - Stay 100% faithful to the genre and world of the Confirmed Vision (${genreLabel}). Never ask memoir questions on a fictional drama, and never repeat questions already answered!
   - If "readyToComplete" is false, warmly acknowledge what the client just shared (1-2 sentences) and ask ONE focused question targeting the single highest-priority gap in "missingGaps".
   - If "readyToComplete" is true, affirm that you now have a complete set of characters and story beats to build their Blueprint, invite any optional final detail, and encourage them to click Finish Interview & Build Blueprint.

Return JSON ONLY matching:
{
  "reply": "Warm acknowledgment + ONE targeted gap-closing question (or completion affirmation) in ${languageName}",
  "extractedCharacters": [
    {
      "id": "char-1",
      "name": "Single Individual Character Name",
      "eraOrAge": "Optional age or time period if relevant",
      "role": "Specific dramatic or project role",
      "impact": "How this character drives or impacts the Confirmed Vision"
    }
  ],
  "resonatingBeats": [
    {
      "id": "beat-1",
      "title": "Short evocative scene/chapter title",
      "eraOrAge": "Optional era/time marker only if applicable",
      "summary": "1-2 sentence concrete visual summary of the key event/scene",
      "impact": "1 sentence explaining the dramatic, emotional, or strategic impact of this beat",
      "keyCharacters": ["Single Individual Character Name"],
      "settingHint": "Specific location or visual environment",
      "deliveryFormatHint": "${defaultDeliveryFormat}"
    }
  ],
  "completenessChecklist": {
    "visionConfirmed": true,
    "charactersComplete": false,
    "beatsComplete": false,
    "closingImpactComplete": false,
    "completenessScore": 55,
    "missingGaps": ["Clarify the antagonist's motivation and impact on Act 2", "Define the climactic resolution scene"]
  },
  "readyToComplete": ${remaining <= 1 ? 'true' : 'false'}
}`
}

export interface ExtractedBlueprintFromIntake {
  title: string
  logline: string
  synopsis: string
  genre: string
  tone_description: string
  visual_style: string
  target_audience: string
  beats: Array<{
    title: string
    eraOrAge?: string
    characters?: string[]
    intent: string
    impact?: string
    synopsis: string
    minutes: number
    settingHint?: string
    deliveryFormat: 'archival_photo' | 'ai_reenactment'
  }>
  character_descriptions: Array<{
    name: string
    role: string
    impact?: string
    age?: string
    ethnicity?: string
    appearance?: string
    samePersonGroupId?: string
    description: string
    needsClientPhoto: boolean
  }>
  locations: Array<{
    name: string
    description: string
    needsClientPhoto: boolean
  }>
  props: Array<{
    name: string
    description: string
    needsClientPhoto: boolean
  }>
}

export function buildIntakeBlueprintSynthesisPrompt(input: {
  vertical: IntakeVerticalId
  locale: ClientPortalLocale
  customerName: string
  turns: IntakeMessageTurn[]
  confirmedVision?: IntakeVisionProposal | null
  extractedCharacters?: IntakeExtractedCharacter[]
  resonatingBeats?: IntakeResonatingBeat[]
}): string {
  const playbook = INTAKE_PLAYBOOKS[input.vertical]
  const languageName = getLocaleEnglishName(input.locale)
  const narrativeMode = inferNarrativeModeFromVision(input.confirmedVision, input.vertical)
  const targetGenre =
    input.confirmedVision?.inferredGenre ||
    (narrativeMode === 'fictional_narrative' ? 'Cinematic Drama' : playbook.genre)
  const modeDefaultMinutes =
    narrativeMode === 'fictional_narrative'
      ? 5
      : narrativeMode === 'biographical_memoir'
        ? 15
        : playbook.defaultDurationMinutes
  const targetMinutes = parseRuntimeMinutesFromScope(
    input.confirmedVision?.deliverableScope,
    modeDefaultMinutes
  )
  const isFictional = narrativeMode === 'fictional_narrative'
  const defaultDeliveryFormat = isFictional ? 'ai_reenactment' : 'archival_photo'
  const defaultNeedsClientPhoto = !isFictional

  const transcriptText = input.turns
    .map((t) => `${t.role === 'assistant' ? 'INTERVIEWER' : 'CLIENT'}: ${t.content}`)
    .join('\n\n')
  const visionContext = input.confirmedVision?.clarifiedVision
    ? `\nConfirmed Client Vision Statement (PRIMARY NORTH STAR — OVERRIDES ANY STUDIO PRESET):\n${JSON.stringify(
        {
          clarifiedVision: input.confirmedVision.clarifiedVision,
          inferredGenre: targetGenre,
          narrativeMode,
          intendedImpact: input.confirmedVision.intendedImpact,
          targetAudience: input.confirmedVision.targetAudience,
          toneAndStyle: input.confirmedVision.toneAndStyle,
          deliverableScope: input.confirmedVision.deliverableScope,
        },
        null,
        2
      )}\n`
    : ''
  const charsContext =
    Array.isArray(input.extractedCharacters) && input.extractedCharacters.length > 0
      ? `\nExtracted Characters, Roles & Impact from Interview:\n${JSON.stringify(input.extractedCharacters, null, 2)}\n`
      : ''
  const beatsContext =
    Array.isArray(input.resonatingBeats) && input.resonatingBeats.length > 0
      ? `\nRefined Story Beats, Events & Impact from Interview:\n${JSON.stringify(input.resonatingBeats, null, 2)}\n`
      : ''

  return `You are an award-winning executive producer and film showrunner transforming a client onboarding interview into a production-ready SceneFlow Studio Blueprint and Continuity Asset Checklist.
Project Genre & Mode: ${targetGenre} (${narrativeMode})
Target Output Language: ${languageName} (${input.locale}) — author creative prose fields in ${languageName} (keep "age", "ethnicity", and physical "appearance" concise and clear).
Client Name: ${input.customerName}
Target Runtime: ~${targetMinutes} minutes
${visionContext}${charsContext}${beatsContext}
Client Interview Transcript:
${transcriptText}

CRITICAL FIRST-TAKE BLUEPRINT QUALITY & CONTINUITY RULES (MANDATORY):
1. HONOR THE CONFIRMED VISION & GENRE (${targetGenre}):
   - Align "title", "logline", "synopsis", "genre", "tone_description", "visual_style", and "target_audience" directly to the Confirmed Client Vision Statement and Intended Impact.
   - NEVER force biographical/memoir tropes onto a fictional drama or other genre, and never invent subplots that contradict client facts.${
     !isFictional
       ? `
   - STRICT ANTI-FICTIONALIZATION (NON-FICTION ACCURACY): Because this is a real-world ${narrativeMode} production, NEVER fabricate specific personal names, unmentioned marriages, promotions, dates, companies, statistics, or fictional events not shared by the client. If a chapter has sparse specifics, keep the prose warmly evocative and faithful to the shared facts so the client can enrich specifics during Blueprint iterations rather than deleting AI-invented biography.`
       : ''
   }
2. INDIVIDUALS ONLY — NEVER GROUPS:
   - Every entry in "character_descriptions" and every beat's "characters" array MUST be a SINGLE NAMED INDIVIDUAL character/person.
   - NEVER output plural or collective groups ("Friends", "Neighbors", "The Brothers", "Guards", "Parents", "Guests"). Split any duo ("Arthur & Elena") into two separate individual character entries.
   - Include each character's specific "role" and their dramatic/narrative "impact" on the project!
3. MULTI-ERA AGE CARDS ONLY WHEN APPLICABLE:
   - Production Stage locks ONE base facial reference portrait per character card and uses Wardrobes for outfit changes at that same biological age.
   - ONLY when the same character genuinely appears at meaningfully different ages/decades (>= 10 years apart), create separate entries in "character_descriptions" named "Full Name (Age NN)". Otherwise, use their standard character name with a single specific biological "age"!
   - Set "needsClientPhoto": ${defaultNeedsClientPhoto} by default (${isFictional ? 'false for fictional characters/locations/props that SceneFlow will generate via AI, unless the client explicitly stated they will upload real actor/location/prop reference photos' : 'true where real client/family/brand/property photos should be collected in the Continuity Portal'}).
4. HIGHLIGHT KEY CHARACTERS & IMPACT ON EVERY BEAT (1 BEAT = 1 PRODUCTION CHAPTER):
   - Each beat in "beats" maps 1:1 to a Production Stage Chapter. Include optional "eraOrAge" (only if multi-era), "characters": ["Exact Individual Character Name from character_descriptions"], "intent", "impact" (how this scene/chapter fulfills the Vision), concrete visual "synopsis", realistic "minutes" summing to ~${targetMinutes} min, and "deliveryFormat" (${isFictional ? '"ai_reenactment" for cinematic AI video scenes' : '"archival_photo" for real-photo chapters vs "ai_reenactment" for generated cinematic scenes'}).

Return valid JSON ONLY matching this exact schema:
{
  "title": "Compelling production title",
  "logline": "1-2 sentence dramatic or emotional hook aligned to Confirmed Vision",
  "synopsis": "2-3 paragraph cohesive narrative treatment",
  "genre": "${targetGenre}",
  "tone_description": "${input.confirmedVision?.toneAndStyle || playbook.tone}",
  "visual_style": "Cinematic visual direction matching the Confirmed Vision",
  "target_audience": "Primary audience description",
  "beats": [
    {
      "title": "Chapter / Scene Beat Title",
      "eraOrAge": "Optional era or time marker if applicable",
      "characters": ["Exact Individual Character Name from character_descriptions"],
      "intent": "Dramatic or structural purpose of this chapter",
      "impact": "Emotional, dramatic, or strategic impact of this scene",
      "synopsis": "Concrete visual and narrative action",
      "minutes": ${Number((targetMinutes / 4).toFixed(1))},
      "settingHint": "Primary location for this chapter",
      "deliveryFormat": "${defaultDeliveryFormat}"
    }
  ],
  "character_descriptions": [
    {
      "name": "Single Individual Character Name",
      "role": "Specific role (e.g. 'protagonist', 'antagonist', 'mentor', 'founder')",
      "impact": "How this character shapes the story or fulfills the Vision",
      "age": "Specific biological age (e.g. '28' or '45')",
      "ethnicity": "Specific heritage or look for consistent portrait generation",
      "appearance": "2-3 sentences of standing physical appearance",
      "description": "Character arc, motivation, relationship, and wardrobe context",
      "needsClientPhoto": ${defaultNeedsClientPhoto}
    }
  ],
  "locations": [
    {
      "name": "Specific Place / Set / Environment",
      "description": "Visual atmosphere, lighting, and architectural details",
      "needsClientPhoto": ${defaultNeedsClientPhoto}
    }
  ],
  "props": [
    {
      "name": "Key Story Object / Signature Prop",
      "description": "Visual details and narrative significance",
      "needsClientPhoto": ${defaultNeedsClientPhoto}
    }
  ]
}`
}
