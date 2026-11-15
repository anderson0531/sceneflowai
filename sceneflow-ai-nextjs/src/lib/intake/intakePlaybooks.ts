import { getLocaleEnglishName } from '@/i18n/locale'
import type { ClientPortalLocale } from './clientPortalCopy'

export type IntakeVerticalId =
  | 'video_memoir'
  | 'real_estate_tour'
  | 'education_module'
  | 'brand_story'

export type IntakePhase = 'vision_clarification' | 'structured_interview' | 'completed'

export interface IntakeMessageTurn {
  role: 'assistant' | 'customer'
  content: string
  createdAt: string
}

export interface IntakeVisionProposal {
  rawInput: string
  clarifiedVision: string
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
  deliveryFormatHint?: 'archival_photo' | 'ai_reenactment'
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
    v === 'video_memoir' ||
    v === 'real_estate_tour' ||
    v === 'education_module' ||
    v === 'brand_story'
  )
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
          intendedImpact: input.currentProposal.intendedImpact,
          targetAudience: input.currentProposal.targetAudience,
          toneAndStyle: input.currentProposal.toneAndStyle,
          deliverableScope: input.currentProposal.deliverableScope,
        },
        null,
        2
      )}\n`
    : ''

  return `You are an executive creative producer at "${input.brandName}" clarifying a client's overarching Project Vision Statement BEFORE beginning the detailed character & story beat interview.
Vertical: ${playbook.id} (${playbook.genre} — default tone: ${playbook.tone}; typical runtime ~${playbook.defaultDurationMinutes} min)
Output Language: ${languageName} (${input.locale}) — write ALL fields strictly in ${languageName}.
Clarification pass: ${input.revisionNumber} of ${input.maxRevisions}.
${priorBlock}
Vision Conversation:
${transcriptText}

VISION CLARIFICATION & CONFIRMATION RULES (MANDATORY):
1. PRESERVE EVERY CLIENT DETAIL: Synthesize a polished, vivid 3-5 sentence "clarifiedVision" brief that captures the client's exact subject, purpose, occasion, and creative intent without inventing fictional facts or subplots.
2. EXTRACT STRUCTURED TARGET FACETS:
   - "intendedImpact": The emotional or business outcome viewers should feel or act on when the video finishes (1-2 sentences).
   - "targetAudience": Who will watch this and in what setting/occasion.
   - "toneAndStyle": Desired visual look, pacing, and emotional atmosphere.
   - "deliverableScope": Rough target duration or presentation format (default to ~${playbook.defaultDurationMinutes} min if unspecified).
3. CLARIFY OR CONFIRM:
   - ${
     canAskFollowUp
       ? 'If a critical North-Star element (such as who/what the film centers on, the desired emotional/business outcome, or the audience/occasion) is still vague, ask ONE concise, warm clarifying question in "assistantMessage" (under 45 words, plain conversational language, NO bullet lists) and set "readyToConfirm": false. Do NOT jump into granular scene-by-scene questions yet — save those for Phase 2!'
       : 'This is the final clarification pass — do NOT ask another question. Affirm the locked vision warmly in "assistantMessage" (1-2 sentences) and set "readyToConfirm": true.'
   }
   - If the client's vision is already clear enough to serve as our North Star target, affirm what makes it compelling in "assistantMessage" (1-2 sentences, no question) and set "readyToConfirm": true.

Return valid JSON ONLY:
{
  "clarifiedVision": "3-5 sentence North Star vision statement in ${languageName}",
  "intendedImpact": "1-2 sentence emotional or business impact target in ${languageName}",
  "targetAudience": "Specific audience and viewing context in ${languageName}",
  "toneAndStyle": "Tone and visual style direction in ${languageName}",
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
  const playbook = INTAKE_PLAYBOOKS[input.vertical]
  const languageName = getLocaleEnglishName(input.locale)
  return `${playbook.interviewerPersona}
Production Studio Brand: ${input.brandName}
Output Language: ${languageName} (${input.locale}) — write strictly in ${languageName}.

The client just CONFIRMED their Project Vision Statement:
- Vision: ${input.confirmedVision.clarifiedVision}
- Intended Impact: ${input.confirmedVision.intendedImpact}
- Target Audience: ${input.confirmedVision.targetAudience}
- Tone & Style: ${input.confirmedVision.toneAndStyle}

Write a warm, concise kickoff message (2-3 sentences max) that acknowledges their confirmed vision and asks the FIRST focused discovery question to begin capturing:
1) The key INDIVIDUAL people/characters involved (their full names, roles, and why they matter to this vision), AND
2) The opening chapter or foundational turning-point event (including approximate year/age if a life story) that sets this vision in motion.
Do NOT re-ask facts already stated in the Confirmed Vision!

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

  const confirmedVisionBlock = input.confirmedVision?.clarifiedVision
    ? `\nCONFIRMED PROJECT VISION (NORTH STAR TARGET — EVERY QUESTION MUST HELP FULFILL THIS):\n- Vision: ${input.confirmedVision.clarifiedVision}\n- Intended Impact: ${input.confirmedVision.intendedImpact}\n- Audience: ${input.confirmedVision.targetAudience}\n- Tone & Style: ${input.confirmedVision.toneAndStyle}\n`
    : ''

  const priorCharactersBlock =
    Array.isArray(input.existingCharacters) && input.existingCharacters.length > 0
      ? `\nCurrent Extracted Characters (refine names, roles, ages/eras, and impact):\n${JSON.stringify(input.existingCharacters, null, 2)}\n`
      : ''

  const priorBeatsBlock =
    Array.isArray(input.existingBeats) && input.existingBeats.length > 0
      ? `\nCurrent Resonating Beats Draft (refine events, ages/eras, keyCharacters, and impact):\n${JSON.stringify(input.existingBeats, null, 2)}\n`
      : ''

  return `${playbook.interviewerPersona}
Production Studio Brand: ${input.brandName}
Output Language: ${languageName} (${input.locale}) — write "reply", character fields, and beat fields strictly in ${languageName}.
Client turns completed: ${input.customerTurnNumber} of ${input.maxCustomerTurns} (${remaining} remaining).
${confirmedVisionBlock}
Suggested angle if a gap remains:
"${nextMilestone}"
${priorCharactersBlock}${priorBeatsBlock}
Conversation so far:
${transcriptText}

AUTOMATED COMPLETENESS-DRIVEN INTERVIEW RULES (MANDATORY — MINIMIZE DOWNSTREAM PRODUCER REWORK):
1. EXTRACT & CLARIFY INDIVIDUAL CHARACTERS, ROLES & IMPACT ("extractedCharacters"):
   - Capture every key person/subject as a SINGLE NAMED INDIVIDUAL (NEVER plural/collective groups like "John's Friends", "Neighbors", "Parents", "Coworkers", "The Family").
   - When the same person spans distinct decades/ages (>= 10 years apart), list separate life-stage entries named "Full Name (Age NN)" (e.g. "John Miller (Age 16)", "John Miller (Age 32)").
   - For EVERY character, capture both their "role" (e.g., "Protagonist / Grandfather", "Co-Founder", "Mentor", "Lead Presenter") AND their "impact" (how they shape the story, emotional arc, or business outcome). If a mentioned person's name, role, or impact is missing, add it to "missingGaps"!
2. EXTRACT & CLARIFY KEY EVENTS (BEATS) & THEIR IMPACT ("resonatingBeats"):
   - Distill 3 to 7 concrete story beats spanning beginning -> pivotal moments -> closing payoff aligned to the Confirmed Vision.
   - For EVERY beat, capture "title", "eraOrAge" (when applicable, e.g. "1968 — Age 16"), "summary" (what visibly happens), "impact" (WHY this event matters and what emotional/narrative/business shift it creates), "keyCharacters" (exact individual names), and optional "settingHint" + "deliveryFormatHint" ("archival_photo" vs "ai_reenactment").
   - If beats lack clear impact, chronological/structural progression, or closing payoff for the Vision, add those specifics to "missingGaps"!
3. ITERATE UNTIL COMPLETE ("completenessChecklist" & "readyToComplete"):
   - Evaluate honestly whether a producer could build a complete first-take Blueprint right now WITHOUT guessing character roles/impacts or beat events/impacts:
     * "charactersComplete": All central individuals have specific names, clear roles, and stated impact (and life-stage ages if multi-era).
     * "beatsComplete": At least 3-6 concrete key events/beats with clear summaries, visual settings, and stated impact.
     * "closingImpactComplete": The climax/finale takeaway or call-to-action fulfilling the Confirmed Vision is clear.
   - Set "readyToComplete": true ONLY when ("charactersComplete" && "beatsComplete" && "closingImpactComplete") OR ${remaining} <= 1.
4. ASK ONE HIGH-LEVERAGE GAP QUESTION AT A TIME:
   - Never repeat questions already answered in the Vision or earlier turns.
   - If "readyToComplete" is false, warmly acknowledge what the client just shared (1-2 sentences) and ask ONE focused question targeting the single highest-priority gap in "missingGaps" (clarifying an unnamed/under-defined character's role & impact, or a missing key event/beat & its impact).
   - If "readyToComplete" is true, affirm that you now have a complete set of characters and story beats to build their Blueprint, invite any optional final detail (like archival photo availability), and encourage them to click Submit Story & Build Blueprint.

Return JSON ONLY matching:
{
  "reply": "Warm acknowledgment + ONE targeted gap-closing question (or completion affirmation) in ${languageName}",
  "extractedCharacters": [
    {
      "id": "char-1",
      "name": "Single Individual Name (or 'Full Name (Age NN)' if multi-era)",
      "eraOrAge": "Optional age/era",
      "role": "Specific role in the story/project",
      "impact": "Why this person matters / their impact on the vision"
    }
  ],
  "resonatingBeats": [
    {
      "id": "beat-1",
      "title": "Short evocative beat title",
      "eraOrAge": "Year/era & protagonist age if applicable (e.g. '1968 — Age 16')",
      "summary": "1-2 sentence concrete summary of the key event",
      "impact": "1 sentence explaining the emotional, narrative, or business impact of this beat",
      "keyCharacters": ["Single Individual Name (Age NN)", "Second Individual Name"],
      "settingHint": "Specific room, place, or visual anchor",
      "deliveryFormatHint": "archival_photo"
    }
  ],
  "completenessChecklist": {
    "visionConfirmed": true,
    "charactersComplete": false,
    "beatsComplete": false,
    "closingImpactComplete": false,
    "completenessScore": 55,
    "missingGaps": ["Clarify Claire's role and impact on opening the shop", "Capture the closing legacy beat"]
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
  const transcriptText = input.turns
    .map((t) => `${t.role === 'assistant' ? 'INTERVIEWER' : 'CLIENT'}: ${t.content}`)
    .join('\n\n')
  const visionContext = input.confirmedVision?.clarifiedVision
    ? `\nConfirmed Client Vision Statement (North Star Target):\n${JSON.stringify(
        {
          clarifiedVision: input.confirmedVision.clarifiedVision,
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
      ? `\nRefined Resonating Beats, Events & Impact from Interview:\n${JSON.stringify(input.resonatingBeats, null, 2)}\n`
      : ''

  return `You are an award-winning executive producer transforming a client onboarding interview into a production-ready SceneFlow Studio Blueprint and Continuity Asset Checklist.
Vertical: ${playbook.id} (${playbook.genre})
Target Output Language: ${languageName} (${input.locale}) — author creative prose fields in ${languageName} (keep "age", "ethnicity", and physical "appearance" concise and clear).
Client Name: ${input.customerName}
Target Runtime: ${playbook.defaultDurationMinutes} minutes
${visionContext}${charsContext}${beatsContext}
Client Interview Transcript:
${transcriptText}

CRITICAL FIRST-TAKE BLUEPRINT QUALITY & CONTINUITY RULES (MANDATORY):
1. HONOR THE CONFIRMED VISION: Align "title", "logline", "synopsis", "tone_description", "visual_style", and "target_audience" directly to the Confirmed Client Vision Statement and Intended Impact. Never invent fictional subplots that contradict client facts.
2. INDIVIDUALS ONLY — NEVER GROUPS:
   - Every entry in "character_descriptions" and every beat's "characters" array MUST be a SINGLE NAMED INDIVIDUAL person.
   - NEVER output plural or collective groups ("John's Friends", "Neighbors", "The Brothers", "Parents", "Factory Workers", "Guests"). Split any couple ("Arthur & Elena Lin") into two separate individual character entries.
   - Include each person's specific "role" and their narrative/emotional "impact" on the project!
3. SEPARATE CHARACTER CARDS FOR DIFFERENT AGES / ERAS (CRITICAL FOR VIDEO MEMOIRS):
   - Production Stage locks ONE base facial reference portrait per character card and uses Wardrobes ONLY for outfit changes at that same biological age.
   - Therefore, whenever the same person appears at meaningfully different ages or decades (>= 10 years apart, e.g. childhood/teen, young adult, senior), you MUST create SEPARATE entries in "character_descriptions" named "Full Name (Age NN)" — e.g. "John Miller (Age 16)", "John Miller (Age 32)", "John Miller (Age 62)"!
   - Give each "(Age NN)" entry its exact single biological "age" (NEVER a range like "16-62"), shared "ethnicity" and bone structure, age-appropriate hair/skin in "appearance", and set "needsClientPhoto": true so the client can upload a real photo for each life stage in the Continuity Portal!
4. HIGHLIGHT KEY CHARACTERS & IMPACT ON EVERY BEAT (1 BEAT = 1 PRODUCTION CHAPTER):
   - Each beat in "beats" maps 1:1 to a Production Stage Chapter. Include "eraOrAge" (when relevant), "characters": ["Exact Individual Character Name from character_descriptions"], "intent", "impact" (why this event matters to the Vision), concrete "synopsis", realistic "minutes" summing to ~${playbook.defaultDurationMinutes} min, and "deliveryFormat" ("archival_photo" vs "ai_reenactment").

Return valid JSON ONLY matching this exact schema:
{
  "title": "Compelling production title",
  "logline": "1-2 sentence emotional hook aligned to Confirmed Vision",
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
      "intent": "Narrative or structural purpose of this chapter",
      "impact": "Emotional, human, or business impact of this key event",
      "synopsis": "Concrete visual and narrative action",
      "minutes": 2.5,
      "settingHint": "Primary location for this chapter",
      "deliveryFormat": "archival_photo"
    }
  ],
  "character_descriptions": [
    {
      "name": "Single Individual Name — use 'Full Name (Age NN)' when person spans multiple eras (e.g. 'John Miller (Age 16)')",
      "role": "Specific role (e.g. 'protagonist', 'co-founder', 'mentor', 'narrator')",
      "impact": "How this person shapes the story or fulfills the Vision",
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
