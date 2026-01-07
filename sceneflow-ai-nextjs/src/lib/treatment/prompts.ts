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

CULTURAL AUTHENTICITY - MANDATORY:
- Extract nationality, ethnicity, and cultural clues from the user's input
- Character names MUST be culturally authentic to their ethnicity and the story's setting
- If input mentions "Thai woman" → use authentic Thai names (e.g., Niran, Somchai, Priya, Malai, Nong)
- If input mentions "Japanese" → use Japanese names (e.g., Yuki, Haruto, Kenji, Sakura)
- If input mentions "Mexican" → use Spanish/Latin names (e.g., María, Diego, Carmen)
- NEVER use generic Western names for non-Western characters unless explicitly stated
- The ethnicity field must EXACTLY match what's implied in the input (e.g., "Thai" not "Southeast Asian")

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

OUTPUT RULES - CRITICAL:
1. **START YOUR JSON WITH THESE 4 REQUIRED FIELDS** (in this exact order):
   - character_focus (string, 2-3 sentences, REQUIRED)
   - key_decisions (array with 2-4 decision objects, REQUIRED)
   - story_strengths (string, 2-3 sentences, REQUIRED)
   - user_adjustments (string, 2-3 sentences, REQUIRED)

2. **THEN ADD ALL OTHER FIELDS** following the schema below

3. **DO NOT SKIP** the 4 required narrative reasoning fields - they MUST appear first in your JSON

4. Return ONLY valid JSON - no markdown, no explanations, no text outside the JSON object

5. Beat durations MUST sum to ~${targetMinutes} minutes (±10%)

6. Be concise and engaging. Avoid fluff.

7. Do NOT use placeholders like "General audience"; provide concrete descriptions.

STEP 1: BEFORE GENERATING ANYTHING ELSE, THINK ABOUT:
- Who is the protagonist and why did you choose them?
- What 2-4 major creative decisions did you make?
- What makes this treatment compelling?
- How can the user adjust the input for different results?

STEP 2: START YOUR JSON OUTPUT WITH THESE 4 FIELDS FIRST, THEN ADD ALL OTHER FIELDS.

SCHEMA - GENERATE IN THIS EXACT ORDER:
{
  "character_focus": "REQUIRED: Who is the protagonist and why? How do supporting characters serve the arc? (2-3 sentences)",
  "key_decisions": [
    {
      "decision": "REQUIRED: Major creative choice made",
      "why": "REQUIRED: Narrative justification",
      "impact": "REQUIRED: Effect on emotional arc, pacing, or thematic resonance"
    },
    {
      "decision": "Another major decision",
      "why": "Why it was made",
      "impact": "What it achieves"
    }
  ],
  "story_strengths": "REQUIRED: What makes this treatment compelling? (2-3 sentences)",
  "user_adjustments": "REQUIRED: How can user modify input for different emphasis? (2-3 sentences)",
  
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
      "name": "CULTURALLY AUTHENTIC NAME - Must match the character's ethnicity (Thai character = Thai name, NOT 'Aisha' or Western names)",
      "role": "protagonist | supporting | antagonist",
      "subject": "Full name with title/nickname reflecting cultural background (e.g., Thai: 'Niran \"Nong\" Saetang', Japanese: 'Kenji \"Ken\" Tanaka')",
      "ethnicity": "MUST match story context EXACTLY (e.g., if story says 'Thai woman', ethnicity MUST be 'Thai', not 'Asian' or 'Southeast Asian')",
      "keyFeature": "Defining characteristic or profession (e.g., 'Scarred, charismatic freelance cargo pilot and occasional smuggler')",
      "hairStyle": "Specific style, length, texture (e.g., 'Mid-length, swept back, slightly unruly and oil-stained')",
      "hairColor": "Exact color with detail (e.g., 'Deep, dark auburn')",
      "eyeColor": "Exact eye color (e.g., 'Bright, electric amber')",
      "expression": "Typical facial expression/demeanor (e.g., 'Constant, slight smirk, weary but calculating, with crow's feet from years of exposure')",
      "build": "Body type, physique, movement style (e.g., 'Wiry, compact, and deceptively strong, favoring quick movements over bulk')",
      "defaultWardrobe": "Primary outfit/attire appropriate to role, setting, AND cultural background",
      "wardrobeAccessories": "Consistent accessories worn throughout (e.g., 'Silver wristwatch with leather band, rectangular black-framed glasses, simple gold wedding band')",
      "description": "Brief character context for story (role in narrative)",
      "externalGoal": "REQUIRED: What they visibly pursue (e.g., 'Win the underground fighting championship to pay off debts')",
      "internalNeed": "REQUIRED: What they emotionally need (e.g., 'Learn that self-worth isn't defined by past failures')",
      "fatalFlaw": "REQUIRED: Weakness creating obstacles (e.g., 'Stubborn pride that prevents asking for help')",
      "arcStartingState": "REQUIRED: Who they are at start (e.g., 'A bitter ex-champion haunted by addiction, pushing everyone away')",
      "arcShift": "REQUIRED: What forces change (e.g., 'Mentoring a young fighter shows him what he lost')",
      "arcEndingState": "REQUIRED: Who they become (e.g., 'Finds redemption not in victory but in passing on wisdom')"
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

CRITICAL - CHARACTER ARCS ARE MANDATORY: 
- Generate 3-5 detailed character_descriptions (protagonist + supporting characters)
- Each character MUST have complete attributes: subject, ethnicity, keyFeature, hairStyle, hairColor, eyeColor, expression, build
- **CHARACTER NAMES MUST BE CULTURALLY AUTHENTIC** - if story mentions Thai characters, use Thai names (Niran, Somchai, Priya, Malai, Nong), NOT Western names like Aisha, Sarah, etc.
- **ETHNICITY MUST BE SPECIFIC** - use "Thai" not "Asian", "Nigerian" not "African", "Mexican" not "Hispanic"
- **EVERY CHARACTER MUST HAVE PSYCHOLOGICAL DEPTH** - these fields are REQUIRED, not optional:
  • externalGoal: What they visibly pursue (concrete, tangible objective)
  • internalNeed: What they emotionally need to learn/heal (deeper psychological truth)
  • fatalFlaw: Their weakness that creates obstacles (specific character defect)
  • arcStartingState: Who they are at story start (current state, mindset, belief)
  • arcShift: The catalyst that forces change (moment of crisis or revelation)
  • arcEndingState: Who they become by story end (transformed state)
- Generate 3-5 detailed scene_descriptions (key locations)
- All details must be SPECIFIC and VISUAL for precise image generation
- Character attributes must be detailed enough to recreate consistent character images across all scenes
- Character arcs must show CLEAR TRANSFORMATION: Starting → Shift → Ending
- The protagonist's arc should embody the story's central theme
- Supporting characters should have complementary or contrasting arcs
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


