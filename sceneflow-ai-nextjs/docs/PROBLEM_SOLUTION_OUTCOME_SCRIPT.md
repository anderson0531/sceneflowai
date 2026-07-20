# Problem → Solution → Outcome — Narration Script

Landing / pitch narration for the three-beat SceneFlow story: the fragmented AI stack, the one-studio fix, and the sustainable cadence that follows.

**Target runtime:** ~45–55 seconds total (~15–18s per block)  
**Tone arc:** Frustration → relief → confident resolve  
**Use:** Hero dialogue, pitch demo VO, or “Hear the Story” style MP3

---

## Google TTS voice profile

Use one consistent narrator across all three blocks so the arc feels like a single cinematic piece.

| Field | Value |
|-------|-------|
| **Provider** | Google Gemini TTS (Gemini 3.1 Flash / Cloud TTS voice name) |
| **Voice ID** | `gemini-Rasalgethi` |
| **Display name** | Rasalgethi (Gemini) |
| **Gender / age** | Male · mature |
| **Language** | `en-US` |
| **Profile** | Robust, deep, narrative-driven storyteller; cinematic gravity, unhurried, documentary-quality delivery — like a creative director who has lived the pain and found the way out |
| **Pace** | 145–155 words per minute; leave short breaths between beats |
| **Loudness target** | −16 LUFS integrated (match other landing story audio) |

### Global director note (apply to every line)

> Speak as a peer who has burned weekends in the AI tool stack — clear, grounded, never salesy. Let Block 1 feel heavy, Block 2 open and relieving, Block 3 land with quiet certainty.

### Alternate voices (optional A/B)

| Role | Voice ID | When to use |
|------|----------|-------------|
| Primary (recommended) | `gemini-Rasalgethi` | Default cinematic narrator |
| Warm female alternate | `gemini-Aoede` | Softer, audiobook warmth for longer-form cuts |
| Polished announcer | `gemini-Algieba` | Pitch-deck / conference VO |

---

## Full dialogue (ready to record)

### Block 1 — The Problem

**On-screen label:** The Problem  
**Emotional beat:** Recognition + fatigue  
**Approx. duration:** 16–18s

**Narration**

> Making one polished video today usually means paying for — and learning — half a dozen separate AI apps. One for the script. Then others for images, voices, video, music, and editing. You regenerate each piece over and over, hoping for something usable. It’s costly. It’s technical. It can eat an entire weekend… and your characters still look different from scene to scene.

**Voice direction**

| Setting | Direction |
|---------|-----------|
| Energy | Low–medium; measured frustration, not anger |
| Emphasis | Hit *half a dozen*, *over and over*, and *entire weekend* |
| Pause | Brief beat after “usable.” Longer breath before the final clause |
| Color | Darker, intimate — late-night creator energy |
| Director note for TTS | “Start with weary recognition. List the tools like a toll you’re tired of paying. Drop the energy slightly on ‘entire weekend,’ then land the character-consistency line with quiet disbelief — almost a resigned laugh.” |

---

### Block 2 — The SceneFlow Solution

**On-screen label:** The SceneFlow Solution  
**Emotional beat:** Turn / relief / clarity  
**Approx. duration:** 16–18s

**Narration**

> SceneFlow replaces that entire stack with one guided studio. Describe your idea in plain words — and it writes the series, designs the cast, and renders the audio, frames, and video together. A shared Reference Library keeps every character consistent across episodes. No prompt engineering. No re-rolling.

**Voice direction**

| Setting | Direction |
|---------|-----------|
| Energy | Lift from Block 1; warmer, forward-moving |
| Emphasis | Hit *one guided studio*, *plain words*, *Reference Library*, *consistent* |
| Pause | Soft pause after “together.” Punchier staccato on the two closing negatives |
| Color | Brightening — the door opening |
| Director note for TTS | “This is the turn of the story. Brighter than Block 1, still peer-to-peer. Build momentum through the pipeline list. Soften into relief on ‘Reference Library,’ then close clean and decisive on ‘No prompt engineering. No re-rolling.’” |

---

### Block 3 — The Outcome

**On-screen label:** The Outcome  
**Emotional beat:** Resolution / sustainable confidence  
**Approx. duration:** 10–12s

**Narration**

> You move from an all-weekend, many-app ordeal… to a steady upload rhythm you can actually sustain.

**Voice direction**

| Setting | Direction |
|---------|-----------|
| Energy | Calm confidence; satisfying close |
| Emphasis | Contrast *all-weekend, many-app ordeal* vs. *steady upload rhythm*; land *actually sustain* |
| Pause | Ellipsis breath between ordeal and outcome |
| Color | Warm resolve — smile in the voice, no hard sell |
| Director note for TTS | “Confident, satisfying close. Let the contrast breathe. Hit ‘steady upload rhythm’ cleanly, then land ‘actually sustain’ with quiet conviction — like a promise kept, not a slogan.” |

---

## Continuous cut (single take)

If recording as one unbroken VO instead of three cards:

> Making one polished video today usually means paying for — and learning — half a dozen separate AI apps. One for the script. Then others for images, voices, video, music, and editing. You regenerate each piece over and over, hoping for something usable. It’s costly. It’s technical. It can eat an entire weekend… and your characters still look different from scene to scene.
>
> SceneFlow replaces that entire stack with one guided studio. Describe your idea in plain words — and it writes the series, designs the cast, and renders the audio, frames, and video together. A shared Reference Library keeps every character consistent across episodes. No prompt engineering. No re-rolling.
>
> You move from an all-weekend, many-app ordeal… to a steady upload rhythm you can actually sustain.

**Continuous director note:** “Three acts in one breath-group: weight, lift, land. Do not rush the turn into SceneFlow. Leave half a second of air before the Outcome line.”

---

## Production notes

| Item | Spec |
|------|------|
| Format | MP3 or AAC, 48 kHz |
| Blocks | Prefer separate files (`pso-problem.mp3`, `pso-solution.mp3`, `pso-outcome.mp3`) for UI sync; stitch with ~0.4s silence between blocks |
| Music bed | Sparse underscore under Block 1; open/resolve under Blocks 2–3; duck −12 to −18 dB under VO |
| Visual sync | Cut on sentence boundaries; hold character-drift visual through end of Block 1; reveal studio UI on “one guided studio” |
| Word count | ~145 words total (~≈55s at 150 WPM) |

### Suggested TTS payload shape

Align with `roleStoryScripts.ts` / Gemini Flash TTS generation scripts:

```ts
{
  voiceId: 'gemini-Rasalgethi',
  profile:
    'Robust, deep, narrative-driven storyteller; cinematic gravity, unhurried, documentary-quality delivery.',
  lines: [
    {
      block: 'problem',
      text: 'Making one polished video today…',
      directorNote:
        'Weary recognition. List the tools like a toll. Drop on “entire weekend,” then land character inconsistency with quiet disbelief.',
    },
    {
      block: 'solution',
      text: 'SceneFlow replaces that entire stack…',
      directorNote:
        'The turn — brighter, peer-to-peer. Soften into relief on Reference Library; close decisive on the two negatives.',
    },
    {
      block: 'outcome',
      text: 'You move from an all-weekend, many-app ordeal…',
      directorNote:
        'Confident close. Contrast ordeal vs. rhythm; land “actually sustain” with quiet conviction.',
    },
  ],
}
```

---

*SceneFlow AI — from fragmented stack to one studio, to a cadence you can keep.*
