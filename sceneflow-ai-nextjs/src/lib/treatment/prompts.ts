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

SCHEMA:
{
  "estimatedDurationMinutes": ${targetMinutes},
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
      "age": "35" or "mid-30s",
      "gender": "male | female | non-binary",
      "ethnicity": "e.g., Asian-American, Hispanic, Caucasian, African-American",
      "height": "e.g., 5'10\\" | tall | average | short",
      "build": "e.g., athletic | slim | stocky | muscular",
      "hairStyle": "e.g., short cropped | shoulder-length | buzz cut",
      "hairColor": "e.g., dark brown | blonde | graying",
      "eyeColor": "e.g., brown | blue | green | hazel",
      "distinctiveFeatures": "e.g., scar above left eyebrow, wire-rimmed glasses, silver earring",
      "appearance": "Full description: Age, height, build, facial features (synthesizes above)",
      "demeanor": "Personality, body language, mannerisms (e.g., 'Confident, stands tall, speaks deliberately')",
      "personality": "Core traits (e.g., 'Analytical, reserved, compassionate under pressure')",
      "voiceCharacteristics": "e.g., Deep baritone, speaks slowly, slight accent",
      "clothing": "Typical outfit details (e.g., 'Navy blazer, white shirt, dark jeans')",
      "clothingStyle": "e.g., business casual | street wear | formal",
      "accessories": "e.g., leather messenger bag, silver watch, glasses",
      "description": "Brief character summary for script context"
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

CRITICAL: 
- Generate 3-5 detailed character_descriptions (protagonist + supporting characters)
- Generate 3-5 detailed scene_descriptions (key locations)
- Include SPECIFIC visual details for consistency in image/video generation
- Appearance, demeanor, clothing must be concrete and filmable
- Location, atmosphere, furniture must be specific and visualizable`
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


