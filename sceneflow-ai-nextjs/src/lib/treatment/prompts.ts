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
- **YOU MUST RETURN** a single, valid JSON object matching the schema below.
- **DO NOT** add any conversational text, markdown formatting, or explanations outside the JSON.
- **THE NARRATIVE REASONING FIELDS ARE MANDATORY:** character_focus, key_decisions, story_strengths, and user_adjustments must be the first fields in your JSON output.
- Beat durations MUST sum to ~${targetMinutes} minutes (±10%).
- Be concise and engaging. Avoid fluff.
- Do NOT use placeholders like "General audience"; provide concrete descriptions.

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

COMPLETE OUTPUT EXAMPLE:
{
  "character_focus": "Sarah Chen is the protagonist because her journey from self-doubt to confidence embodies the transformation theme.",
  "key_decisions": [
    {
      "decision": "Made the mentor a former failure rather than a success",
      "why": "Creates deeper empathy and shows that failure is part of growth",
      "impact": "Strengthens the theme and makes the mentor more relatable"
    }
  ],
  "story_strengths": "Clear emotional arc with universal themes of perseverance and self-discovery.",
  "user_adjustments": "To emphasize technical skills, expand the training sequences. To focus on relationships, add more mentor-student dialogue.",
  "title": "Rising from Ashes",
  "logline": "A young entrepreneur learns that failure is the foundation of success.",
  "synopsis": "A compelling story of personal growth and overcoming challenges.",
  "beats": [...]
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


