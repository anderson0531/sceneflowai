import { Beat } from './beatExtractor'

export interface Character {
  name: string
  role?: string
  description?: string
  appearance?: string
  demeanor?: string
  clothing?: string
}

/**
 * Build the prompt for generating scenes for a specific beat
 */
export function buildBeatPrompt(
  treatment: any,
  beat: Beat,
  rollingSummary: string,
  characters: Character[]
): string {
  const characterList = characters.length > 0
    ? `\n\nDEFINED CHARACTERS (USE ONLY THESE):\n${characters.map((c: any) => 
        `${c.name} (${c.role || 'character'}): ${c.description || ''}
        ${c.appearance ? `Appearance: ${c.appearance}` : ''}
        ${c.demeanor ? `Demeanor: ${c.demeanor}` : ''}
        ${c.clothing ? `Clothing: ${c.clothing}` : ''}`
      ).join('\n\n')}`
    : ''

  return `You are an expert documentary scriptwriter.

# GLOBAL CONTEXT
Title: ${treatment.title}
Logline: ${treatment.logline}
Tone: ${treatment.tone}
Genre: ${treatment.genre}
${characterList}

# STORY SO FAR (Continuity)
${rollingSummary || 'The documentary is beginning.'}

# CURRENT BEAT (${beat.index + 1} of ${beat.total})
Title: ${beat.title}
${beat.intent ? `Intent: ${beat.intent}` : ''}
${beat.synopsis ? `Synopsis: ${beat.synopsis}` : ''}
Target Duration: ~${beat.targetDuration}s
Scene Range: ${beat.startScene}-${beat.endScene} (${beat.sceneCount} scenes)

# INSTRUCTIONS
1. Generate ${beat.sceneCount} scenes for this beat ONLY
2. Each scene MUST have: heading, action, narration, dialogue, visualDescription, duration
3. Ensure smooth transition from "STORY SO FAR"
4. Return ONLY valid JSON (no markdown, no explanations)

# DURATION ESTIMATION FORMULA (FOLLOW EXACTLY)
Step 1: Count total words (narration + all dialogue)
Step 2: audio_duration = (total_words / 150) * 60 seconds
Step 3: Add buffer (2-5s based on action description length)
Step 4: Calculate video clips: video_count = Math.ceil((audio_duration + buffer) / 8)
Step 5: scene_duration = (audio_duration + buffer + (video_count * 0.5)) rounded to nearest 8

Average ${Math.ceil(beat.targetDuration / beat.sceneCount)}s per scene = ~${Math.ceil((beat.targetDuration / beat.sceneCount) * 150 / 60)} words per scene

# JSON OUTPUT FORMAT
{
  "beatTitle": "${beat.title}",
  "scenes": [
    {
      "sceneNumber": ${beat.startScene},
      "heading": "INT. LOCATION - TIME",
      "characters": ["Character Name 1"],
      "action": "SOUND of action. Character movement.\n\nSFX: Sound description\n\nMusic: Music description",
      "narration": "Captivating voiceover narration (1-2 sentences)",
      "dialogue": [{"character": "CHARACTER NAME", "line": "[emotion] Dialogue text"}],
      "visualDescription": "Cinematic shot description",
      "duration": 45,
      "sfx": [{"time": 0, "description": "Sound effect"}],
      "music": {"description": "Background music"}
    }
  ]
}

CRITICAL JSON FORMATTING RULES:
- Return ONLY valid JSON - no markdown code fences
- Property names MUST be double-quoted
- String values MUST be properly escaped
- NO control characters (tabs, newlines) except in escaped form (\\n, \\t)
- NO trailing commas

Generate ${beat.sceneCount} scenes with realistic durations based on the formula above.`
}

