/**
 * Shared authoring rules for spoken-line performance direction.
 *
 * Gemini TTS steers emotion from the style prompt, not from 1–3 word
 * ElevenLabs-style tags. Compact `[emotion, delivery]` prefixes stay on the
 * spoken line for stills/video/UI. The acting brief lives on `voiceDirection`.
 */

export const DIALOGUE_PERFORMANCE_DIRECTION_RULES = `DIALOGUE PERFORMANCE DIRECTION (GEMINI TTS):
Every spoken line (dialogue AND narration) carries two complementary directions:

1. LEADING TAG on "line" — compact [emotion, delivery], 2–4 words. Used by stills, video, and UI chips.
   Examples: [obsessive, breathless], [whispering nervously], [cold, measured]
   Do NOT write a paragraph inside the brackets. Do NOT omit the tag.

2. "voiceDirection" — 1–2 sentences of actor-facing direction for THIS take. This is the primary Gemini TTS style prompt.
   Cover: inner state, breath/volume, pace, where to land emphasis, any non-verbal (sigh, whisper, laugh).
   Use concrete verbs ("catch a breath", "land X as a plea") — not adjective soup.
   Specific to this beat: do not restate the character's standing voice profile.
   Keep voiceDirection in English even when spoken dialogue is in another language.

PUNCTUATION & PACING (in the spoken words, not in voiceDirection):
- Ellipses (...) for pauses, trailing off, or hesitation
- Dashes (—) for interruptions or sudden stops
- CAPS for EMPHASIS on specific words (NEVER asterisks * or underscores _)

EXAMPLES:
  {
    "character": "ELENA",
    "line": "[obsessive, breathless] The differential holds... it has to hold this time.",
    "voiceDirection": "Close-mic, private, strained. Argue with the numbers on leftover air. Rush the first clause, catch a thin breath on the ellipsis, then land \\"has to hold this time\\" as a plea she does not want overheard. Do not smooth this into a composed read."
  }
  {
    "character": "JULIAN",
    "line": "[cold, measured] The board has already voted.",
    "voiceDirection": "Flat, unhurried, almost bored. No rise at the end. Let the period land like a door closing. Do not add warmth or apology."
  }

CRITICAL: Every spoken line MUST start with a compact [emotion, delivery] tag AND include voiceDirection.
CRITICAL: Do NOT put stage directions or unspoken action in "line".`
