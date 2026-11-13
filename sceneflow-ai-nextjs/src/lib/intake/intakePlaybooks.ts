import { getLocaleEnglishName } from '@/i18n/locale'
import type { ClientPortalLocale } from './clientPortalCopy'

export type IntakeVerticalId =
  | 'video_memoir'
  | 'real_estate_tour'
  | 'education_module'
  | 'brand_story'

export interface IntakeMessageTurn {
  role: 'assistant' | 'customer'
  content: string
  createdAt: string
}

export interface IntakeResonatingBeat {
  id: string
  title: string
  eraOrAge?: string
  summary: string
  /** Single named individuals featured in this beat — NEVER plural/collective groups */
  keyCharacters: string[]
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
    suggestedMaxTurns: 8,
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
    suggestedMaxTurns: 8,
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
    suggestedMaxTurns: 8,
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
    v === 'video_memoir' ||
    v === 'real_estate_tour' ||
    v === 'education_module' ||
    v === 'brand_story'
  )
}

export function buildNextIntakeQuestionPrompt(input: {
  vertical: IntakeVerticalId
  locale: ClientPortalLocale
  brandName: string
  turns: IntakeMessageTurn[]
  customerTurnNumber: number
  maxCustomerTurns: number
  existingBeats?: IntakeResonatingBeat[]
}): string {
  const playbook = INTAKE_PLAYBOOKS[input.vertical]
  const languageName = getLocaleEnglishName(input.locale)
  const remaining = Math.max(0, input.maxCustomerTurns - input.customerTurnNumber)
  const nextMilestone =
    playbook.milestoneQuestions[
      Math.min(input.customerTurnNumber - 1, playbook.milestoneQuestions.length - 1)
    ]

  const transcriptText = input.turns
    .map((t) => `${t.role === 'assistant' ? 'INTERVIEWER' : 'CLIENT'}: ${t.content}`)
    .join('\n')

  const priorBeatsBlock =
    Array.isArray(input.existingBeats) && input.existingBeats.length > 0
      ? `\nCurrent Resonating Beats Draft (refine, expand, or sharpen based on the latest answer):\n${JSON.stringify(input.existingBeats, null, 2)}\n`
      : ''

  return `${playbook.interviewerPersona}
Production Studio Brand: ${input.brandName}
Output Language: ${languageName} (${input.locale}) — write "reply", beat "title", "eraOrAge", and "summary" strictly in ${languageName}.
Client turns completed: ${input.customerTurnNumber} of ${input.maxCustomerTurns} (${remaining} remaining).

Suggested topic if not already covered by the client's story:
"${nextMilestone}"
${priorBeatsBlock}
Conversation so far:
${transcriptText}

INTELLIGENT DRAMATURG & CONTINUITY INTERVIEW RULES (MANDATORY):
1. DISTILL RESONATING BEATS: Extract and refine 3 to 7 emotionally resonating story beats ("resonatingBeats") from everything the client has shared so far. Do NOT ask repetitive questions about facts the client already shared in their opening story!
2. HIGHLIGHT KEY INDIVIDUAL CHARACTERS PER BEAT (NEVER GROUPS):
   - Every beat MUST list its "keyCharacters" as SINGLE NAMED INDIVIDUALS (e.g., "John Miller (Age 16)", "Margaret Miller (Age 42)", "David Chen (Age 17)").
   - NEVER output plural or collective groups ("John's Friends", "His Brothers", "Neighbors", "Parents", "Classmates", "Coworkers", "The Family") in "keyCharacters"!
   - If the client mentioned a group (e.g. "my army buddies" or "her sisters") in an important moment without naming a specific individual, ask a warm clarifying question to identify the ONE or TWO specific individuals by name who should appear on screen in that beat.
3. PINPOINT AGES & TIME PERIODS FOR MULTI-ERA CONTINUITY:
   - Production Stage creates separate character cards for distinct life stages (e.g. "John Miller (Age 16)", "John Miller (Age 32)", "John Miller (Age 62)") rather than trying to age one portrait with outfits.
   - Whenever a character appears across different decades/eras, stamp their approximate age on the beat's "eraOrAge" (e.g. "1968 — Age 16") AND on their name in "keyCharacters" ("John Miller (Age 16)").
   - If an important beat is missing when it happened or how old the key person was, ask for that age/time period naturally in your clarification!
4. ASK ONE FOCUSED CLARIFICATION AT A TIME:
   - In "reply", warmly acknowledge a specific detail or emerging beat from what the client just shared (1-2 sentences), briefly note how the story beats are taking shape, and ask ONE high-value clarifying question that deepens emotional resonance, clarifies an individual character, or anchors an age/era.
   - If ${remaining} <= 1 (or if we already have 4+ rich resonating beats with clear individual characters, ages/eras, and closing resonance), invite any final detail and let them know they can click Submit Story & Build Blueprint whenever ready.

Return JSON ONLY matching:
{
  "reply": "Warm acknowledgment + ONE intelligent beat/character/era clarification question in ${languageName}",
  "resonatingBeats": [
    {
      "id": "beat-1",
      "title": "Short evocative beat title",
      "eraOrAge": "Year/era & protagonist age if applicable (e.g. '1968 — Age 16')",
      "summary": "1-2 sentence summary of the resonating moment",
      "keyCharacters": ["Single Individual Name (Age NN)", "Second Individual Name"]
    }
  ],
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
    synopsis: string
    minutes: number
    deliveryFormat: 'archival_photo' | 'ai_reenactment'
  }>
  character_descriptions: Array<{
    name: string
    role: string
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
  resonatingBeats?: IntakeResonatingBeat[]
}): string {
  const playbook = INTAKE_PLAYBOOKS[input.vertical]
  const languageName = getLocaleEnglishName(input.locale)
  const transcriptText = input.turns
    .map((t) => `${t.role === 'assistant' ? 'INTERVIEWER' : 'CLIENT'}: ${t.content}`)
    .join('\n\n')
  const beatsContext =
    Array.isArray(input.resonatingBeats) && input.resonatingBeats.length > 0
      ? `\nRefined Resonating Beats & Key Individuals from Interview:\n${JSON.stringify(input.resonatingBeats, null, 2)}\n`
      : ''

  return `You are an award-winning executive producer transforming a client onboarding interview into a structured SceneFlow Studio Blueprint and Continuity Asset Checklist.
Vertical: ${playbook.id} (${playbook.genre})
Target Output Language: ${languageName} (${input.locale}) — author creative prose fields in ${languageName} (keep "age", "ethnicity", and physical "appearance" concise and clear).
Client Name: ${input.customerName}
Target Runtime: ${playbook.defaultDurationMinutes} minutes
${beatsContext}
Client Interview Transcript:
${transcriptText}

CRITICAL CHARACTER & BEAT CONTINUITY RULES (MANDATORY):
1. INDIVIDUALS ONLY — NEVER GROUPS:
   - Every entry in "character_descriptions" and every beat's "characters" array MUST be a SINGLE NAMED INDIVIDUAL person.
   - NEVER output plural or collective groups ("John's Friends", "Neighbors", "The Brothers", "Parents", "Factory Workers", "Guests"). Split any couple ("Arthur & Elena Lin") into two separate individual character entries.
2. SEPARATE CHARACTER CARDS FOR DIFFERENT AGES / ERAS (CRITICAL FOR VIDEO MEMOIRS):
   - Production Stage locks ONE base facial reference portrait per character card and uses Wardrobes ONLY for outfit changes at that same biological age.
   - Therefore, whenever the same person appears at meaningfully different ages or decades (>= 10 years apart, e.g. childhood/teen, young adult, senior), you MUST create SEPARATE entries in "character_descriptions" named "Full Name (Age NN)" — e.g. "John Miller (Age 16)", "John Miller (Age 32)", "John Miller (Age 62)"!
   - Give each "(Age NN)" entry its exact single biological "age" (NEVER a range like "16-62"), shared "ethnicity" and bone structure, age-appropriate hair/skin in "appearance", and set "needsClientPhoto": true so the client can upload a real photo for each life stage in the Continuity Portal!
3. HIGHLIGHT KEY INDIVIDUAL CHARACTERS ON EVERY BEAT:
   - Each beat in "beats" MUST include "eraOrAge" (e.g. "1968 — Age 16") and "characters": ["Exact Individual Character Name from character_descriptions"] using the era-matched "(Age NN)" entry for that beat.

Return valid JSON ONLY matching this exact schema:
{
  "title": "Compelling production title",
  "logline": "1-2 sentence emotional hook",
  "synopsis": "2-3 paragraph cohesive narrative treatment",
  "genre": "${playbook.genre}",
  "tone_description": "${playbook.tone}",
  "visual_style": "Documentary photography blended with warm cinematic lighting",
  "target_audience": "Primary audience description",
  "beats": [
    {
      "title": "Chapter / Scene Beat Title",
      "eraOrAge": "Year/era & protagonist age (e.g. '1968 — Age 16')",
      "characters": ["Exact Individual Character Name from character_descriptions"],
      "intent": "Emotional or informational purpose",
      "synopsis": "Concrete visual and narrative action",
      "minutes": 2.5,
      "deliveryFormat": "archival_photo"
    }
  ],
  "character_descriptions": [
    {
      "name": "Single Individual Name — use 'Full Name (Age NN)' when person spans multiple eras (e.g. 'John Miller (Age 16)')",
      "role": "protagonist | supporting | narrator",
      "age": "Exact biological age for this card, e.g. '16' or '32' or '62'",
      "ethnicity": "Specific heritage shared across all age stages of this person",
      "appearance": "2-3 sentences of standing physical appearance at this exact age",
      "description": "Life stage, relationship, emotional role, and period attire context",
      "needsClientPhoto": true
    }
  ],
  "locations": [
    {
      "name": "Specific Place / Room / Era Setting",
      "description": "Visual atmosphere and architectural details",
      "needsClientPhoto": true
    }
  ],
  "props": [
    {
      "name": "Key Keepsake / Product / Diagram",
      "description": "Visual details and story significance",
      "needsClientPhoto": true
    }
  ]
}`
}
