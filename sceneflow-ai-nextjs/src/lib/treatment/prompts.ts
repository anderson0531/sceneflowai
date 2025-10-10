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
}`
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


