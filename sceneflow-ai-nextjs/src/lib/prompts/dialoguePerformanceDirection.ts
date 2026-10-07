/**
 * Shared authoring rules for spoken-line performance direction.
 *
 * Gemini TTS steers emotion from the style prompt, not from 1–3 word
 * ElevenLabs-style tags. Compact `[emotion, delivery]` prefixes stay on the
 * spoken line for stills/video/UI. The acting brief lives on `voiceDirection`
 * and is sent to TTS, stills, and video.
 */

export const DIALOGUE_PERFORMANCE_DIRECTION_RULES = `DIALOGUE PERFORMANCE DIRECTION (GEMINI TTS):
Every spoken line (dialogue AND narration) carries two complementary directions:

1. LEADING TAG on "line" — compact [emotion, delivery], 2–4 words. Used by stills, video, and UI chips.
   Examples: [obsessive, breathless], [whispering nervously], [cold, measured]
   Do NOT write a paragraph inside the brackets. Do NOT omit the tag.

2. "voiceDirection" — 1–2 sentences of actor-facing direction for THIS take. This is the primary Gemini TTS style prompt, and it is also sent to stills and video as Performance.
   Cover: inner state, breath/volume, pace, the word to land, and how to frame the face and body.
   Use concrete verbs ("catch a breath", "land X as a plea", "let the words crack on X") — not adjective soup.
   The visual frame belongs in the brief (quiet bitter surrender, a crack on one word, tightly coiled calculation). Not a one-word mood.
   Specific to this beat: do not restate the character's standing voice profile.
   Keep voiceDirection in English even when spoken dialogue is in another language.
   Beat "emotion" is that same visual frame, specific enough for a face and a posture.

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
  {
    "character": "GIDEON",
    "line": "[defeated, close-mic] It's a closed loop... why won't the math close?",
    "voiceDirection": "Close-mic, intimate and utterly defeated. Let the breath carry the words more than the vocal cords. Frame this as a quiet, bitter surrender to his own limitations."
  }
  {
    "character": "GIDEON",
    "line": "[fragile, intimate] I'm losing the thread, Clara. The current is dead.",
    "voiceDirection": "Fragile and highly intimate. He is confessing his absolute failure to the only person who mattered. Let the words crack on 'dead'."
  }
  {
    "character": "GIDEON",
    "line": "[coiled, calculating] Eighty pounds of drag... Ward found me.",
    "voiceDirection": "Tightly coiled, processing impossible data. He isn't panicked, he's rapidly calculating the physics of the threat and arriving at a terrifying conclusion. Grounded in paranoia."
  }

CRITICAL: Every spoken line MUST start with a compact [emotion, delivery] tag AND include voiceDirection.
CRITICAL: Do NOT put stage directions or unspoken action in "line".`
