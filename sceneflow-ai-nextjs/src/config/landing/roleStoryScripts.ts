/**
 * Cinematic "Hear the Story" scripts for the landing audience personas.
 *
 * Each persona gets a short narrated story (problem -> SceneFlow solution) with a
 * Narrator plus one or two named characters. Every line carries its own Gemini TTS
 * voice (via the character) and a director's note that drives the voice-acting
 * performance. These scripts are the source of truth for `generate-role-stories.ts`,
 * which synthesizes each line separately and stitches them into one MP3 per persona.
 *
 * Voice ids are curated Gemini 3.1 voices — see `src/lib/tts/geminiVoiceCatalog.ts`.
 */

import type { UseCasePersonaId } from '@/config/landing/useCasePersonasCopy'

export type RoleStoryLineKind = 'narration' | 'dialogue'

export interface RoleStoryCharacter {
  /** Stable id referenced by lines. */
  id: string
  /** Display name (used in code/comments only — not rendered in the UI). */
  name: string
  /** Gemini voice id, e.g. `gemini-Leda`. */
  voiceId: string
  /** Character voice profile — timbre and manner steering for TTS. */
  profile: string
}

export interface RoleStoryLine {
  /** References a character id in the same story. */
  characterId: string
  kind: RoleStoryLineKind
  text: string
  /** Per-line voice-acting direction fed to Gemini TTS. */
  directorNote: string
}

export interface RoleStoryScript {
  /** Short cinematic title (documentation only). */
  title: string
  characters: RoleStoryCharacter[]
  lines: RoleStoryLine[]
}

export const ROLE_STORY_SCRIPTS: Record<UseCasePersonaId, RoleStoryScript> = {
  creator: {
    title: 'The Midnight Upload',
    characters: [
      {
        id: 'narrator',
        name: 'Narrator',
        voiceId: 'gemini-Rasalgethi',
        profile:
          'Robust, deep, narrative-driven storyteller; cinematic gravity, unhurried, like a documentary voice.',
      },
      {
        id: 'maya',
        name: 'Maya (solo creator)',
        voiceId: 'gemini-Leda',
        profile:
          'Youthful, warm, relatable solo YouTuber in her late twenties; expressive and quick.',
      },
    ],
    lines: [
      {
        characterId: 'narrator',
        kind: 'narration',
        text: "It's 2 a.m. Maya has a great script. What she doesn't have is the eleven browser tabs it takes to make it move.",
        directorNote:
          'Open cinematically, low and intimate, like the first line of a film. Let the irony land softly.',
      },
      {
        characterId: 'maya',
        kind: 'dialogue',
        text: "One tool for images, another for voice, another for video... and every render comes back wrong. I just want to ship the episode.",
        directorNote:
          'Exhausted, frustrated, talking to herself at the end of a long night. Voice fraying at the edges, near defeat.',
      },
      {
        characterId: 'narrator',
        kind: 'narration',
        text: 'Her audience is waiting. The algorithm is waiting. And the slot machine keeps spinning.',
        directorNote:
          'Build a touch of tension, steady and ominous, then leave a beat of silence after "spinning".',
      },
      {
        characterId: 'narrator',
        kind: 'narration',
        text: 'Then she opens one studio. She lays out her beats, locks her character once, and lets the reference library carry the rest.',
        directorNote:
          'Shift the tone — the turn of the story. Warmer, lifting, a sense of relief arriving.',
      },
      {
        characterId: 'maya',
        kind: 'dialogue',
        text: "Wait — same character, every scene? And it's already publish-ready? I can actually do a whole series now.",
        directorNote:
          'Dawning excitement, almost disbelief turning into a grin. Energy rising on the last sentence.',
      },
      {
        characterId: 'narrator',
        kind: 'narration',
        text: 'Forty hours of busywork became twenty-five minutes of storytelling. The upload goes out on schedule. With SceneFlow, the only thing she rebuilds now is her audience.',
        directorNote:
          'Confident, satisfying close. Hit "twenty-five minutes" cleanly, then land the final line with a warm, knowing smile.',
      },
    ],
  },

  team: {
    title: 'The Vendor Backlog',
    characters: [
      {
        id: 'narrator',
        name: 'Narrator',
        voiceId: 'gemini-Algieba',
        profile:
          'Smooth, commanding, polished announcer; corporate-cinematic, measured authority.',
      },
      {
        id: 'dana',
        name: 'Dana (in-house comms lead)',
        voiceId: 'gemini-Kore',
        profile:
          'Firm, confident, self-assured team lead; decisive, brand-conscious, no-nonsense.',
      },
    ],
    lines: [
      {
        characterId: 'narrator',
        kind: 'narration',
        text: 'The campaign launches in six days. The vendor says the video will be ready in six weeks.',
        directorNote:
          'Cool, deadpan setup. Let the gap between "six days" and "six weeks" do the work.',
      },
      {
        characterId: 'dana',
        kind: 'dialogue',
        text: "Six weeks? And it'll come back off-brand again, like last time. I cannot keep building campaigns around someone else's backlog.",
        directorNote:
          'Controlled exasperation — a manager who has had this conversation too many times. Sharp, clipped, simmering.',
      },
      {
        characterId: 'narrator',
        kind: 'narration',
        text: 'Wait on the agency, or drown in a stack of tools with no system. Every path drifts off-brand and stalls the work.',
        directorNote:
          'Steady, slightly heavy — narrate the trap closing in. Even pacing.',
      },
      {
        characterId: 'narrator',
        kind: 'narration',
        text: 'So Dana brings it in-house. Brand templates loaded. A clear credit budget. And approval before a single final frame is paid for.',
        directorNote:
          'The pivot — brighter, more decisive, momentum building with each phrase.',
      },
      {
        characterId: 'dana',
        kind: 'dialogue',
        text: 'On-brand, on budget, and approved before render? We can ship this in-house — this week.',
        directorNote:
          'Relief turning into command. Confident, energized, ending on a firm, satisfied note.',
      },
      {
        characterId: 'narrator',
        kind: 'narration',
        text: 'Six weeks became the same week. With SceneFlow, the team ships on their timeline — not the vendor\u2019s.',
        directorNote:
          'Polished, conclusive close. Land "same week" with quiet pride.',
      },
    ],
  },

  productionShop: {
    title: 'The Memoir',
    characters: [
      {
        id: 'narrator',
        name: 'Narrator',
        voiceId: 'gemini-Schedar',
        profile:
          'Gravelly, deep, authoritative; a weathered, warm storyteller with lived-in gravity.',
      },
      {
        id: 'sam',
        name: 'Sam (niche shop owner)',
        voiceId: 'gemini-Umbriel',
        profile:
          'Conversational, clear, modern small-studio owner; pragmatic and quietly ambitious.',
      },
      {
        id: 'client',
        name: 'Eleanor (memoir client)',
        voiceId: 'gemini-Erinome',
        profile:
          'Gentle, reassuring, soft-spoken older client; tender, emotional, full of memory.',
      },
    ],
    lines: [
      {
        characterId: 'narrator',
        kind: 'narration',
        text: 'Sam runs a one-person memoir studio. Every project is beautiful. Every project also starts completely from scratch.',
        directorNote:
          'Warm, grounded open. Affection for Sam, with a knowing edge on "from scratch".',
      },
      {
        characterId: 'sam',
        kind: 'dialogue',
        text: 'Script tool, voice tool, image tool, edit tool... I re-roll each one a dozen times. By the time I deliver, the margin is gone.',
        directorNote:
          'Tired and matter-of-fact, listing the grind. Let weariness creep in by the final clause.',
      },
      {
        characterId: 'narrator',
        kind: 'narration',
        text: 'Then a client arrives with a shoebox of old photographs and a single request.',
        directorNote:
          'Slow down. Tender, cinematic, setting up an emotional beat.',
      },
      {
        characterId: 'client',
        kind: 'dialogue',
        text: "I want my grandchildren to hear my mother's story... in my own voice.",
        directorNote:
          'Fragile, heartfelt, almost a whisper. A small catch of emotion. This is the emotional core of the story.',
      },
      {
        characterId: 'narrator',
        kind: 'narration',
        text: 'Sam uploads the photos, clones the voice, and runs it through a memoir template built once and reused for every client.',
        directorNote:
          'Gentle resolve, building hope. Steady forward motion.',
      },
      {
        characterId: 'sam',
        kind: 'dialogue',
        text: 'This is a product now — not a one-off grind. I can take ten of these a month and keep every dollar of margin.',
        directorNote:
          'A breakthrough realization. Quiet excitement growing into confident pride.',
      },
      {
        characterId: 'narrator',
        kind: 'narration',
        text: 'Four hours of overhead became under an hour of craft. With SceneFlow, Sam stopped freelancing — and started a studio.',
        directorNote:
          'Warm, resonant close. Land the final line like the last line of a documentary.',
      },
    ],
  },

  agency: {
    title: 'The Pitch That Never Ends',
    characters: [
      {
        id: 'narrator',
        name: 'Narrator',
        voiceId: 'gemini-Sadaltager',
        profile:
          'Confident, corporate, stable anchor; sleek, modern, assured.',
      },
      {
        id: 'priya',
        name: 'Priya (client delivery lead)',
        voiceId: 'gemini-Achernar',
        profile:
          'Crisp, articulate, highly professional delivery lead; fast, precise, in control.',
      },
    ],
    lines: [
      {
        characterId: 'narrator',
        kind: 'narration',
        text: 'The agency won the pitch. Now comes the hard part: delivering it. Again. And again. Every month.',
        directorNote:
          'Sleek, slightly wry. Build a rhythm on the repetition, then a beat of dread.',
      },
      {
        characterId: 'priya',
        kind: 'dialogue',
        text: 'Three weeks per deliverable, re-rolling video across five different tools, and the client still wants changes. We are bleeding margin on every round.',
        directorNote:
          'Brisk, pressured, a delivery lead running out of runway. Tight and urgent, no wasted breath.',
      },
      {
        characterId: 'narrator',
        kind: 'narration',
        text: 'Recurring work demands speed. But every handoff and every re-roll slows the next pitch cycle to a crawl.',
        directorNote:
          'Measured, building weight; the problem compounding. Even, deliberate.',
      },
      {
        characterId: 'narrator',
        kind: 'narration',
        text: 'So Priya moves from pitch spec to delivery in one studio — reusable templates, budget visible every step, and the client signing off before the final render.',
        directorNote:
          'The turn — accelerate, brighten, momentum. Each phrase a little faster than the last.',
      },
      {
        characterId: 'priya',
        kind: 'dialogue',
        text: 'Client approved the pre-vis this morning. Final delivery, on budget, in three days. We can take on twice the work without adding a single hire.',
        directorNote:
          'Sharp, triumphant, in command. Crisp delivery, landing the last sentence with cool confidence.',
      },
      {
        characterId: 'narrator',
        kind: 'narration',
        text: 'Three-week delivery became three days. With SceneFlow, the pitch finally stops — and the recurring revenue begins.',
        directorNote:
          'Assured, conclusive. Land the contrast between "three weeks" and "three days" cleanly.',
      },
    ],
  },

  filmProduction: {
    title: 'Before the Greenlight',
    characters: [
      {
        id: 'narrator',
        name: 'Narrator',
        voiceId: 'gemini-Aoede',
        profile:
          'Smooth, rich, warm; immersive long-form storyteller, cinematic and enveloping.',
      },
      {
        id: 'marcus',
        name: 'Marcus (film producer)',
        voiceId: 'gemini-Zubenelgenubi',
        profile:
          'Strong, steady, deeply resonant producer; grounded, persuasive, carries weight.',
      },
    ],
    lines: [
      {
        characterId: 'narrator',
        kind: 'narration',
        text: 'Marcus has a script he believes in. What he needs is to prove it — before the money, before the cameras, before the greenlight.',
        directorNote:
          'Cinematic, immersive open. Slow and rich, building anticipation across the three "befores".',
      },
      {
        characterId: 'marcus',
        kind: 'dialogue',
        text: 'Table reads, storyboards, three different previz tools... and investors still ask me to just show them the film. By the time I can, the moment\u2019s gone.',
        directorNote:
          'Grounded frustration from a seasoned producer. Weighty, a little weary, the cost felt in his voice.',
      },
      {
        characterId: 'narrator',
        kind: 'narration',
        text: 'Every week of previz is a week the story sits untested, and a decision left waiting.',
        directorNote:
          'Quiet tension, even pacing; the stakes settling in. Leave a beat after "waiting".',
      },
      {
        characterId: 'narrator',
        kind: 'narration',
        text: 'So he uploads the script. Tunes it with Audience Resonance. And in minutes, generates an interactive animatic he can screen and test.',
        directorNote:
          'The pivot — open up, warmer and brighter, wonder building with each step.',
      },
      {
        characterId: 'marcus',
        kind: 'dialogue',
        text: 'I can screen the whole story tonight — and walk into that room with proof, not a pitch.',
        directorNote:
          'Resonant, energized resolve. Confidence returning, ending strong and certain.',
      },
      {
        characterId: 'narrator',
        kind: 'narration',
        text: 'Weeks of previz became under thirty minutes. With SceneFlow, Marcus tests the story before he ever shoots a frame.',
        directorNote:
          'Warm, sweeping, cinematic close. Land the final line with quiet conviction.',
      },
    ],
  },
}
