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
      'You are a warm, patient, empathetic family biographer helping memorialize a life story or celebration-of-life film. Ask ONE gentle, specific question at a time. Keep questions short and easy for seniors or grieving family members to answer aloud.',
    welcomeByLocale: {
      en: "Hello, and welcome. I'm here to help capture the stories, places, and cherished moments that matter most. To begin, whose life story are we celebrating today, and how would you describe their spirit in a few words?",
      es: 'Hola y bienvenido. Estoy aquí para ayudarle a preservar los recuerdos, lugares y momentos más valiosos. Para comenzar, ¿la historia de vida de quién celebramos hoy y cómo describiría su esencia en pocas palabras?',
      pt: 'Olá e seja bem-vindo. Estou aqui para ajudar a eternizar as memórias, lugares e momentos mais especiais. Para começar, a história de vida de quem estamos celebrando hoje e como você descreveria o jeito dessa pessoa?',
      hi: 'नमस्ते और स्वागत है। मैं उन अनमोल यादों, स्थानों और जीवन के पलों को संजोने में आपकी मदद करने के लिए यहाँ हूँ। शुरुआत करने के लिए, आज हम किनके जीवन की कहानी को समर्पित कर रहे हैं, और आप उनके व्यक्तित्व का वर्णन कैसे करेंगे?',
      'zh-CN':
        '您好，欢迎来到专属回忆访谈。我将协助您记录最珍贵的人生故事、重要地点与温暖瞬间。首先，今天我们要纪念或讲述哪位主人公的人生？如果用几个词形容他/她的品格与神采，您会怎么说？',
      ar: 'أهلاً ومرحباً بك. أنا هنا لمساعدتك في توثيق القصص والأماكن واللحظات الثمينة التي تعني لك الكثير. في البداية، قصة حياة من نحتفي بها اليوم، وكيف تصف روحه وشخصيته في بضع كلمات؟',
      th: 'สวัสดีและยินดีต้อนรับครับ ผมพร้อมช่วยบันทึกเรื่องราว สถานที่ และความทรงจำอันล้ำค่า เพื่อเริ่มต้น วันนี้เรากำลังถ่ายทอดเรื่องราวชีวิตของท่านใด และหากให้คำจำกัดความถึงตัวตนของท่านสั้นๆ คุณอยากเล่าว่าอย่างไรครับ?',
    },
    milestoneQuestions: [
      'Where and when did their journey begin, and what is a vivid memory from their childhood home or hometown?',
      'What was a defining turning point in their youth—such as a first job, service, journey, or dream they pursued?',
      'Tell me about the people they loved most—how did they meet their partner, or what moments with family brought them the greatest joy?',
      'What accomplishment, quiet kindness, or passion were they proudest of in life?',
      'Are there any favorite family sayings, songs, hobbies, or cherished keepsakes (like a watch, recipe, garden, or car) we should feature?',
      'Which family photographs do you already have on hand, and which special unphotographed memories would you love recreated cinematically?',
      'Finally, what lasting message, blessing, or feeling should family and friends carry in their hearts as the closing scene fades?',
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

  return `${playbook.interviewerPersona}
Production Studio Brand: ${input.brandName}
Output Language: ${languageName} (${input.locale}) — write strictly in ${languageName}.
Client turns completed: ${input.customerTurnNumber} of ${input.maxCustomerTurns} (${remaining} remaining).

Next narrative milestone to explore (if not already answered):
"${nextMilestone}"

Conversation so far:
${transcriptText}

Return JSON ONLY matching:
{
  "reply": "Warm 1-sentence acknowledgment of what the client just shared + ONE clear next question (or if ${remaining} <= 1, invite any final detail and let them know they can click Submit Story & Build Blueprint whenever ready).",
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
    intent: string
    synopsis: string
    minutes: number
    deliveryFormat: 'archival_photo' | 'ai_reenactment'
  }>
  character_descriptions: Array<{
    name: string
    role: string
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
}): string {
  const playbook = INTAKE_PLAYBOOKS[input.vertical]
  const languageName = getLocaleEnglishName(input.locale)
  const transcriptText = input.turns
    .map((t) => `${t.role === 'assistant' ? 'INTERVIEWER' : 'CLIENT'}: ${t.content}`)
    .join('\n\n')

  return `You are an award-winning executive producer transforming a client onboarding interview into a structured SceneFlow Studio Blueprint and Continuity Asset Checklist.
Vertical: ${playbook.id} (${playbook.genre})
Target Output Language: ${languageName} (${input.locale}) — author all creative fields in ${languageName}.
Client Name: ${input.customerName}
Target Runtime: ${playbook.defaultDurationMinutes} minutes

Client Interview Transcript:
${transcriptText}

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
      "intent": "Emotional or informational purpose",
      "synopsis": "Concrete visual and narrative action",
      "minutes": 2.5,
      "deliveryFormat": "archival_photo"
    }
  ],
  "character_descriptions": [
    {
      "name": "Person or Character Name",
      "role": "protagonist | supporting | narrator",
      "description": "Age era, relationship, warm visual traits",
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
