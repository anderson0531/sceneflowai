type Format = 'youtube' | 'short_film' | 'documentary' | 'education' | 'training'

export function buildTreatmentPrompt(opts: {
  input: string
  coreConcept: any
  format: Format
  targetMinutes: number
  styleHint?: string
  context?: any
  beatStructure?: { label: string; beats: Array<{ title: string }> } | null
  persona?: 'Narrator'|'Director' | null
}) {
  const { input, coreConcept, format, targetMinutes, styleHint, context, beatStructure, persona } = opts
  const formatBlock = getFormatBlock(format)
  const structureBlock = beatStructure ? `\nBEAT STRUCTURE:\n- Use the ${beatStructure.label} structure.\n- Produce beats matching these titles IN ORDER (adapt wording if needed, keep intent):\n${beatStructure.beats.map((b,i)=>`  ${i+1}. ${b.title}`).join('\n')}\n` : ''
  const personaBlock = persona === 'Director'
    ? '\nVOICE: Write as a concise, confident director offering clear, actionable guidance.'
    : persona === 'Narrator'
    ? '\nVOICE: Write as an engaging, neutral narrator with professional tone.'
    : ''
  return `CRITICAL INSTRUCTIONS: You are a professional ${formatLabel(format)} showrunner.
TARGET RUNTIME: ~${targetMinutes} minutes (±10%).
PRIORITIES: ${formatBlock.priorities}
${personaBlock}${structureBlock}

STORYTELLING OPTIMIZATION (PRIMARY GOAL):
- Prioritize narrative coherence, emotional resonance, dramatic structure
- Make bold creative decisions: combine characters, elevate subplots, shift focus
- Emphasize elements that strengthen themes and character arcs
- Omit/minimize elements that dilute narrative power
- Optimize for maximum storytelling impact, not input preservation

INPUT:
${input}

CORE CONCEPT:
- Title: ${coreConcept?.input_title}
- Synopsis: ${coreConcept?.input_synopsis}
- Themes: ${(coreConcept?.core_themes || []).join(', ')}
- Structure: ${coreConcept?.narrative_structure}

CONTEXT:
- Audience: ${context?.targetAudience || 'General'}
- Platform: ${context?.platform || 'YouTube & web'}
- Tone: ${context?.tone || 'Professional'}
- Genre: ${context?.genre || 'Documentary'}
- Style Hint: ${styleHint || 'N/A'}

OUTPUT RULES:
- Return ONLY valid JSON matching the schema below.
- Beat durations MUST sum to ~${targetMinutes} minutes (±10%).
- Be concise and engaging. Avoid fluff.
- Do NOT use placeholders like "General audience"; provide a concrete audience description (e.g., "aspiring product designers age 18–30").
- **CRITICAL: The "narrative_reasoning" field is MANDATORY. Do NOT omit it.**

SCHEMA:
{
  "estimatedDurationMinutes": ${targetMinutes},
  
  "narrative_reasoning": {
    "character_focus": "Who is the protagonist and why? How do supporting characters serve the arc?",
    "key_decisions": [
      {
        "decision": "Major creative choice made",
        "why": "Narrative justification",
        "impact": "Effect on emotional arc, pacing, or thematic resonance"
      }
    ],
    "story_strengths": "What makes this treatment compelling?",
    "user_adjustments": "How can user modify input for different emphasis?"
  },
  
  "title": "Proposed title",
  "logline": "One- or two-sentence hook",
  "genre": "Genre",
  "format_length": "Short (5–40m) | Feature (90–120m) | Series episode | …",
  "synopsis": "≤120 words",
  "audience": "string",
  "tone": "string",
  "style": "string",
  "target_audience": "Concrete audience description",
  "setting": "Time/place + world rules",
  "protagonist": "Main character brief (goal/flaw)",
  "antagonist": "Primary opposing force/conflict",
  
  "character_descriptions": [
    {
      "name": "Character Name",
      "role": "protagonist | supporting | antagonist",
      "subject": "Full name with title/nickname (e.g., 'Captain Valerius \"Val\" Zinn')",
      "ethnicity": "Specific ethnic/cultural origin (e.g., 'Mediterranean/Outer Rim Colonies')",
      "keyFeature": "Defining characteristic or profession (e.g., 'Scarred, charismatic freelance cargo pilot and occasional smuggler')",
      "hairStyle": "Specific style, length, texture (e.g., 'Mid-length, swept back, slightly unruly and oil-stained')",
      "hairColor": "Exact color with detail (e.g., 'Deep, dark auburn')",
      "eyeColor": "Exact eye color (e.g., 'Bright, electric amber')",
      "expression": "Typical facial expression/demeanor (e.g., 'Constant, slight smirk, weary but calculating, with crow's feet from years of exposure')",
      "build": "Body type, physique, movement style (e.g., 'Wiry, compact, and deceptively strong, favoring quick movements over bulk')",
      "description": "Brief character context for story (role in narrative)"
    }
  ],
  
  "scene_descriptions": [
    {
      "name": "Location Name (e.g., 'Corporate Office', 'Beach House')",
      "type": "INT | EXT",
      "location": "Specific place, size, layout (e.g., 'Modern open-plan office, glass walls, 50x30ft space, downtown high-rise 20th floor')",
      "atmosphere": "Lighting, time of day, weather, mood (e.g., 'Fluorescent overhead lights, late afternoon sun through windows, tense corporate energy, air conditioning hum')",
      "furniture_props": "Key objects, furniture, decorations (e.g., 'Standing desks with dual monitors, whiteboard walls with diagrams, coffee station, potted plants, framed motivational posters')"
    }
  ],
  
  "themes": ["Theme 1", "Theme 2"],
  "opening_hook": "string",
  "cta": ${formatBlock.includeCTA ? '"string"' : 'null'},
  "learning_objectives": ${formatBlock.includeLearning ? '["Objective 1", "Objective 2"]' : '[]'},
  "beats": [
    { "title": "Beat title", "intent": "Purpose/retention goal", "synopsis": "≤50 words beat summary", "minutes": 2.5 }
  ],
  "visual_style": "string",
  "audio_direction": "string",
  "broll_suggestions": ["string"]
}

NARRATIVE REASONING (REQUIRED - DO NOT SKIP):
This field is MANDATORY. Explain your creative decisions:
1. character_focus: Who is the protagonist? Why? How do supporting characters serve the arc?
2. key_decisions: List 2-4 major creative choices with WHY and IMPACT
3. story_strengths: What makes this treatment compelling?
4. user_adjustments: How can user modify input for different emphasis?

EXAMPLE narrative_reasoning:
{
  "character_focus": "Brian Anderson is the protagonist because his journey from corporate burnout to creative fulfillment embodies the core transformation. Supporting characters (mentor Sarah, colleague Marcus) serve as catalysts and mirrors for his internal conflict.",
  "key_decisions": [
    {
      "decision": "Combined Jordan and Michael into single character arc",
      "why": "Their shared anxiety/disability creates powerful parallel to protagonist's struggles",
      "impact": "Tighter focus, stronger thematic resonance, more emotional payoff"
    },
    {
      "decision": "Elevated the 'midnight coding session' from background detail to climactic beat",
      "why": "This moment crystallizes the protagonist's transformation and commitment",
      "impact": "Creates powerful visual metaphor, strengthens Act 2 turning point"
    }
  ],
  "story_strengths": "Strong character arc with clear stakes, relatable conflict, satisfying resolution. Visual storytelling opportunities in contrasting corporate/creative environments.",
  "user_adjustments": "To emphasize family dynamics more, add Sarah's perspective as a parallel storyline. To focus on technical journey, expand the coding/problem-solving sequences."
}

CRITICAL: 
- Generate 3-5 detailed character_descriptions (protagonist + supporting characters)
- Each character MUST have complete attributes: subject, ethnicity, keyFeature, hairStyle, hairColor, eyeColor, expression, build
- Generate 3-5 detailed scene_descriptions (key locations)
- All details must be SPECIFIC and VISUAL for precise image generation
- Character attributes must be detailed enough to recreate consistent character images across all scenes
- Generate treatment with BOLD storytelling choices and CLEAR reasoning`
}

function formatLabel(f: Format): string {
  switch (f) {
    case 'youtube': return 'YouTube series'
    case 'short_film': return 'short film'
    case 'documentary': return 'documentary'
    case 'education': return 'education'
    case 'training': return 'training'
  }
}

function getFormatBlock(f: Format) {
  if (f === 'youtube') return { priorities: 'maximize retention, strong opening hook in first 20 seconds; clear segments and CTA', includeCTA: true, includeLearning: false }
  if (f === 'documentary') return { priorities: 'compelling narrative arc, strong voiceover plan, visual motifs; audience engagement cues', includeCTA: true, includeLearning: false }
  if (f === 'education') return { priorities: 'clear learning objectives, scaffolded sections, recap and quick assessment', includeCTA: false, includeLearning: true }
  if (f === 'training') return { priorities: 'task-oriented modules, demonstrations, checkpoints and practice prompts', includeCTA: false, includeLearning: true }
  return { priorities: 'three-act arc, character tension, cinematic pacing', includeCTA: false, includeLearning: false }
}


