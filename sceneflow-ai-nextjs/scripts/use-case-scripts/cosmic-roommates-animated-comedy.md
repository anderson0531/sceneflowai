# COSMIC ROOMMATES — Animated Comedy Showcase

Video Script (Animated Comedy Demo — Production Examples `animation` card)

**Show:** *Cosmic Roommates* — a human slacker and a compulsively formal four-armed alien share a one-bedroom apartment
**Generated footage:** 8 blocks × 10s = 80s of motion
**Format:** Each block is a full ten-second motion clip carrying its own in-scene dialogue. The freeze hold and the narration are added in the video editor.
**Narrator:** Single VO, dry and confident, comedy-trailer register — plays it straight, never mugs for the joke
**Shipped style:** Anime (90s) — every block except the style swap in 03 is the finished look

Follows the beat-table convention of `1847-maple-drive-listing-tour.md`, adapted for editor-assembled
freeze frames: blocks are a fixed 10s of generated motion, the prompt column is a video prompt with
camera action, and every block names the frame the editor will freeze on.

## THE EDITOR-ASSEMBLED METHOD

A block is not a finished cut. It is a ten-second motion clip, and the edit is built on top of it:

1. **Generate** the 10s clip. In-scene dialogue and physical comedy play across the whole ten seconds.
2. **Freeze** the final frame in the editor and extend it.
3. **Lay the narration** over that hold, sizing the hold to the line rather than the line to the hold.

The consequence that shapes everything below: **narration has no word ceiling.** It is not competing
with the dialogue for the same seconds, because it lives on a different layer. Write each narration
line for clarity and punch, then let the hold be however long it needs to be.

Two rules the prompts are written around:

- **The last frame of every clip is the frame the audience stares at longest.** Each video prompt ends
  by naming the pose the shot must settle into. It is a held storyboard panel, not a throwaway — a
  muddy or mid-blink final frame ruins the block no matter how good the motion was.
- **Every block earns its comedy.** The tool blocks are not abstract interface montages with a
  voiceover. The characters play a scene that *demonstrates* the feature while the narration explains
  it, so the product proof and the joke are the same ten seconds.

**Assembly:** narration begins as the image settles and may pre-lap the freeze by up to a second so the
seam is inaudible. Cross-dissolve 0.4s into the next block from the tail of the hold, never across a
spoken word.

## DIALOGUE BUDGET

Only the in-scene dialogue is time-boxed, because it genuinely has to play inside ten seconds of
animated performance. At ~160 words per minute a bare ten seconds is 27 words, but character comedy
needs air: **keep in-scene lines at or under 20 words** so the pauses survive. The silences are load-bearing.
Every in-scene line below is annotated with its count.

Narration lines are annotated with an estimated hold at the same ~160 wpm. That number is an
instruction to the editor, not a limit on the writer.

## GLOBAL BASE LOCK

Append to every video prompt below, then append one style module:

> Animated comedy production shot, 16:9, expressive exaggerated character acting, bold readable silhouettes, bright key light with warm bounce, amber and orange accent palette, playful staging with comedic negative space, consistent with Reference Library character designs. No text overlays, watermarks, captions, or readable interface copy in frame.

## STYLE MODULES

| Token | Module text |
|-------|-------------|
| `STYLE_ANIME_90S` | 1990s cel-animation aesthetic, visible ink lines, limited-frame animation feel, hand-painted background plates, slight film grain. |
| `STYLE_GHIBLI` | Soft watercolour backgrounds, gentle rounded linework, naturalistic ambient light, warm pastoral palette, unhurried motion. |
| `STYLE_COMIC` | Heavy black inked outlines, flat halftone shading, high-contrast primary colours, graphic panel-like compositions. |

## REFERENCE CHARACTERS (generate once — lock in Reference Library)

Descriptions are rendering-agnostic on purpose — features only, no style words — so one sheet survives all
three style modules. Block 04 exists to demonstrate exactly this, so verify both sheets hold under each
module before generating any block.

**REF: CHAR_DEZ**
Dez, 24, human, medium-brown skin, persistent bedhead of dark curls, heavy-lidded sleepy eyes, faint stubble, oversized mustard hoodie with a stretched neckline, mismatched socks. Posture permanently at forty-five degrees — leans on everything. Reference sheet: portrait plus three-quarter and full-body, neutral soft key light, plain background.

**REF: CHAR_VORP**
Vorp-9, adult alien, translucent lavender skin with faint internal luminescence, tall narrow frame, four arms in two symmetrical pairs, three vertically stacked amber eyes, no hair, immaculate pressed grey cardigan buttoned to the throat. Posture rigidly vertical, hands clasped in pairs. Reference sheet: portrait plus three-quarter and full-body, all four arms clearly separated, neutral soft key light, plain background.

## REFERENCE LOCATIONS & MOTIFS

**REF: LOC_APARTMENT** — Cramped one-bedroom shared apartment: sagging plaid couch, one crooked lamp, a wall calendar hung perfectly level beside a leaning stack of pizza boxes. Half the room obsessively tidy, half chaotic, split down the middle. Wide establishing shot, no people.

**REF: LOC_KITCHEN** — The kitchen corner of the same apartment: a squat refrigerator carrying an absurd grid of small neat labels, one of them stuck to the refrigerator door itself. Mugs hung in size order above a sink of unwashed dishes. Medium shot, no people.

**REF: LOC_SOCK_DRAWER** — An open dresser drawer, socks folded into identical labelled rows with tiny divider cards, each row flagged with a colour tab. Absurdly over-organised. Close shot, no people.

**REF: UI_WRITERS_ROOM** — Abstracted script surface rendered as animated comedy graphics: a column of soft-edged dialogue blocks, each tightening and snapping shorter in sequence. Shapes only, no readable text.

**REF: UI_RESONANCE_GAUGE** — Abstracted circular gauge filling toward a high value, beside it a horizontal timing bar with one over-long segment visibly contracting. Shapes only, no readable text.

**REF: UI_SCREENING_ROOM** — Abstracted darkened review room: one large glowing playback rectangle, slim scrubber beneath. Shapes only, no readable text.

**REF: LOGO_CARD** — Centred SceneFlow mark on deep navy, thin amber-to-orange underline, wide symmetrical negative space. Lower third left clear for an overlay caption.

## BLOCKS

Timings below are positions in the 80s of generated motion. The finished runtime is longer once the
editor adds each hold — see the block ledger at the end.

### 01 — COLD OPEN (0:00)

Open inside the finished show. No logo, no setup, no narration until the joke has landed — the first thing
the viewer hears is the product's actual output. The VO arrives only once they are already amused.

| Field | Content |
|-------|---------|
| **Timing** | Motion 0:00–0:10 · hold added in edit |
| **In-scene** (0:00–0:10) | **DEZ:** "You alphabetised my socks."<br>**VORP-9:** "I alphabetised your *timeline*. The socks were symptomatic."<br>**DEZ:** *(beat)* "…Symptomatic of what?"<br>**VORP-9:** "Thursday. I have scheduled it." *(20 words)* |
| **Narration** (unlimited) | Nobody drew that. No storyboard, no animation studio, no render farm. One person described a show they wanted to watch — and SceneFlow built every frame of it. *(~10s hold)* |
| **Video prompt** | LOC_APARTMENT interior, morning. CHAR_DEZ slumped on the plaid couch holding a single folded sock aloft, turning slowly toward CHAR_VORP with dawning alarm. CHAR_VORP stands rigidly beside the open LOC_SOCK_DRAWER, all four hands clasped in serene pairs, three amber eyes blinking out of sequence. The sock slips from Dez's fingers; he does not look at it. He looks at the camera. **Settle on:** Dez in flat two-shot staring dead into lens, sock on the floor, Vorp-9 serene behind him. Base lock. STYLE_ANIME_90S. |
| **Camera** | Locked wide, quick 20% punch-in on the sock drop, settle back to the two-shot |

### 02 — WRITER'S ROOM (0:10)

The gag *is* the feature. Vorp delivers the unpolished draft of a line, it dies in total silence, the line
snaps down to its short form and Dez actually laughs. The narration never has to claim that dialogue
polish works, because the block already showed the before and the after.

| Field | Content |
|-------|---------|
| **Timing** | Motion 0:10–0:20 · hold added in edit |
| **In-scene** (0:10–0:20) | **VORP-9:** "I have prepared a response which I believe you will find both amusing and instructive."<br>*(dead silence — Dez does not react)*<br>**VORP-9:** "…I labelled your milk."<br>**DEZ:** *(a real laugh, surprised out of him)* *(19 words)* |
| **Narration** (unlimited) | It starts in the Writer's Room. Describe the premise, and SceneFlow drafts the episode — then tightens it, line by line. The joke was always there. It was just eleven words too long. *(~12s hold)* |
| **Video prompt** | LOC_KITCHEN. CHAR_VORP delivers the long line with immense satisfaction, two hands spread in presentation. CHAR_DEZ stares at him, entirely blank. Beside them UI_WRITERS_ROOM hangs in the air as animated comedy graphics: a tall dialogue block visibly contracting to a short one, an amber pulse travelling with the contraction, timed to the moment Vorp restates the line. Dez breaks into a genuine laugh. No readable text anywhere. **Settle on:** Dez mid-laugh, head tipped back, Vorp-9 delighted and rigid beside the shortened block. Base lock. STYLE_ANIME_90S. |
| **Camera** | Locked two-shot; small push-in on the silence, hold through the laugh |

### 03 — ART STYLE (0:20)

The money shot. The frame must be pinned so precisely that only the rendering appears to change — any
drift in framing or pose destroys the effect and the block becomes a montage instead of a transformation.
The dialogue runs unbroken across all three repaints, which is the proof: Vorp claims to be consistent
while being painted three different ways, and he is telling the truth.

| Field | Content |
|-------|---------|
| **Timing** | Motion 0:20–0:30 · three swaps inside the motion, hold on Comic Book · hold added in edit |
| **In-scene** (0:20–0:30) | **DEZ:** "Do you ever feel like we look different every episode?"<br>**VORP-9:** "I have not noticed."<br>**DEZ:** "Huh."<br>**VORP-9:** "I am consistent." *(18 words)* |
| **Narration** (unlimited) | Then pick the look. Nineties anime. Ghibli-esque. Comic book. Or let SceneFlow recommend one for your genre. Same script, same performances, same timing — entirely repainted. And he is right. That is the same character in all three. *(~14s hold)* |
| **Video prompt** | Held two-shot of CHAR_DEZ and CHAR_VORP in LOC_APARTMENT, identical pose, framing and lens throughout, dialogue and lip movement continuous. Beneath the unchanged composition the rendering hard-cuts three times: STYLE_ANIME_90S, then STYLE_GHIBLI, then STYLE_COMIC. Character features, proportions, all four arms and eye placement remain exactly matched across all three. **Settle on:** the STYLE_COMIC render, Vorp mid-declaration, held dead still. Base lock. |
| **Camera** | Absolutely locked — the frame must not move, so only the style reads as changing |
| **Assembly note** | Time the swaps so the third lands on "I am consistent"; the narration's "And he is right" plays over the held comic-book frame |

### 04 — REFERENCE LIBRARY (0:30)

| Field | Content |
|-------|---------|
| **Timing** | Motion 0:30–0:40 · hold added in edit |
| **In-scene** (0:30–0:40) | **VORP-9:** *(all three panels, in unison)* "One. Two. Three. Four."<br>**DEZ:** *(off-screen)* "You do this every morning."<br>**VORP-9:** "And every morning, there are four." *(15 words)* |
| **Narration** (unlimited) | Every character lives in the Reference Library. Build them once and they hold — same face, same three eyes, same four arms — in every style, in every episode, in shots you have not written yet. *(~13s hold)* |
| **Video prompt** | Triptych in one frame: CHAR_VORP rendered in STYLE_ANIME_90S, STYLE_GHIBLI and STYLE_COMIC side by side, all three counting their own arms in perfect sync, touching each hand in turn. Thin amber alignment lines draw on, connecting matching features across the panels — the three stacked eyes, each of the four shoulders. **Settle on:** all three panels on the fourth arm at the identical pose, alignment lines complete and glowing. Base lock. |
| **Camera** | Hold with faint drift in; alignment lines draw on over 2s and remain lit through the freeze |

### 05 — AUDIENCE RESONANCE (0:40)

Two takes of one joke inside a single block. The first pass sits a half-second too long and Dez's laugh
arrives late; the pass repeats with the pause trimmed and the laugh lands early. The gauge climbing is
the least interesting thing on screen, which is the point — the difference is audible before it is legible.

| Field | Content |
|-------|---------|
| **Timing** | Motion 0:40–0:50 · hold added in edit |
| **In-scene** (0:40–0:50) | **VORP-9:** "There are now nineteen labels on the refrigerator."<br>**DEZ:** "Nineteen."<br>**VORP-9:** "The refrigerator is one of them." *(15 words)* |
| **Narration** (unlimited) | Audience Resonance scores the cut against the people you are actually making it for. It finds the beat that drags, the punchline sitting a half-second too late — and it tells you before an audience does. Same joke, half a second tighter. *(~15s hold)* |
| **Video prompt** | LOC_KITCHEN. CHAR_VORP indicates the labelled refrigerator with two arms while CHAR_DEZ leans in the doorway. The exchange plays twice: first pass with a long dead pause before the last line and a late, weak reaction from Dez; second pass identical but tighter, Dez laughing immediately. Small UI_RESONANCE_GAUGE inset in the lower corner, its timing bar contracting one over-long segment and the circular gauge ticking higher on the second pass. **Settle on:** Dez's laugh frozen at its peak, Vorp-9 pleased, gauge at its high value. Base lock. STYLE_ANIME_90S. |
| **Camera** | Locked medium for both passes so only the timing differs; small push-in on the second |

### 06 — SCREENING ROOM (0:50)

| Field | Content |
|-------|---------|
| **Timing** | Motion 0:50–1:00 · hold added in edit |
| **In-scene** (0:50–1:00) | **VORP-9:** "My posture reads as smug."<br>**DEZ:** "That is just your posture."<br>**VORP-9:** *(long pause)* "Approve it."<br>**DEZ:** "Already did." *(14 words)* |
| **Narration** (unlimited) | In the Screening Room you watch the animatic first. Rough frames, real timing, the whole episode before a single final frame is rendered. Approve it, and only then does SceneFlow render and premiere. *(~12s hold)* |
| **Video prompt** | UI_SCREENING_ROOM: CHAR_DEZ and CHAR_VORP seated in silhouette before the glowing playback rectangle, watching themselves. Inside the rectangle, rough grey animatic frames of the sock-drawer scene resolve left to right into full-colour finished animation. Vorp tilts his head at his own posture on screen; Dez does not move. **Settle on:** the rectangle fully resolved to finished colour, both silhouettes lit by its glow, Vorp's head still tilted. Base lock. STYLE_ANIME_90S. |
| **Camera** | Slow zoom out from the rectangle to include both silhouettes, settle |

### 07 — PAYOFF (1:00)

The runner gag closes and collects the "nineteen" from block 05. Returning to the show after the pipeline
explanation proves the finished thing actually works — and gives the viewer a second laugh right before
the logo, which is what they will remember.

| Field | Content |
|-------|---------|
| **Timing** | Motion 1:00–1:10 · hold added in edit |
| **In-scene** (1:00–1:10) | **VORP-9:** "Your socks are now chronological."<br>**DEZ:** *(beat)* "…Chronological."<br>**VORP-9:** "You will thank me in nineteen days."<br>**DEZ:** "Why nineteen?"<br>**VORP-9:** "You will see." *(18 words)* |
| **Narration** (unlimited) | That started as one sentence typed into a text box. Script, cast, style, timing, edit, premiere — you just watched the entire pipeline. *(~8s hold)* |
| **Video prompt** | LOC_APARTMENT interior, evening. CHAR_VORP presents the open LOC_SOCK_DRAWER with two of four arms, colour tabs now arranged in a precise gradient. CHAR_DEZ stares into it without moving, asks his question without looking up, then slowly turns his head to camera, entirely deadpan. **Settle on:** Dez in flat close-up looking directly at camera, Vorp-9 beaming behind him, drawer glowing amber. Base lock. STYLE_ANIME_90S. |
| **Camera** | Two-shot, slow push-in to Dez's flat close-up, hold |

### 08 — CLOSE (1:10)

| Field | Content |
|-------|---------|
| **Timing** | Motion 1:10–1:20 · hold added in edit |
| **Narration** (unlimited) | Your show. Your style. Your cast, consistent to the last frame. SceneFlow AI Studio — envision the story, we handle the pipeline. *(~8s hold)* |
| **On-screen text** | SceneFlow AI Studio · sceneflowai.studio *(caption layer at assembly, not baked into the frame)* |
| **Video prompt** | LOGO_CARD centred, thin amber-to-orange underline drawing in left to right, faint haze settling. Lower third clear. No people. **Settle on:** completed logo card, underline full width, haze at rest. Base lock. |
| **Camera** | Slow push-in, settle to hold |

## BLOCK LEDGER

Motion is the generated asset. Hold is what the editor adds. Running total is the finished cut.

| Block | Motion | Hold | Block length | Running total |
|-------|--------|------|--------------|---------------|
| 01 Cold open | 10s | 10s | 20s | 0:20 |
| 02 Writer's Room | 10s | 12s | 22s | 0:42 |
| 03 Art style | 10s | 14s | 24s | 1:06 |
| 04 Reference Library | 10s | 13s | 23s | 1:29 |
| 05 Audience Resonance | 10s | 15s | 25s | 1:54 |
| 06 Screening Room | 10s | 12s | 22s | 2:16 |
| 07 Payoff | 10s | 8s | 18s | 2:34 |
| 08 Close | 10s | 8s | 18s | 2:52 |

**Generated motion:** 8 × 10s = **1:20**. **Finished cut:** ~**2:52** including holds, before cross-dissolves.

## AUDIO GUIDE

| Layer | Notes |
|-------|-------|
| VO | Single narrator, dry and confident, comedy-trailer register at ~160 wpm; plays it straight |
| Character VO | Dez — flat, unbothered, young male. Vorp-9 — precise, over-articulated, no contractions, faintly resonant |
| Music | Light plucked comedy bed; stings on the block 01 sock drop and the block 07 turn-to-camera; drops out entirely under block 03's style swaps so the visual carries alone |
| Ambience | Room tone in LOC_APARTMENT and LOC_KITCHEN blocks, carried through the hold so the freeze does not go dead; tool blocks stay dry |
| Comic timing | The silences are the jokes — the dead air in block 02 and the beat before "…Chronological." Do not let anything crowd them |
| Freeze transition | No audio change at the motion/freeze cut; the seam must be inaudible. Narration may pre-lap the freeze by up to 1s |

## PRODUCTION WORKFLOW (SceneFlow)

Mirrors the five workflow steps on the `animation` card in `src/config/landing/productionShowcaseCopy.ts`.
Keep the two in sync — the card is the promise, this script is the proof.

1. **Writer's Room** — genre-aware sitcom script, then dialogue polish for rhythm and beat length
2. **Art style** — accept the SceneFlow recommendation or toggle Anime (90s) / Ghibli-esque / Comic Book; ship Anime (90s) and keep the other two rendered for block 03
3. **Reference Library** — lock CHAR_DEZ and CHAR_VORP once from rendering-agnostic sheets; verify all four arms and three stacked eyes survive each style module before generating blocks
4. **Audience Resonance™** — score comedic timing against the target audience; the two passes in block 05 are the before and after
5. **Screening Room** — approve the animatic pre-vis, then premiere the full video

## RUNTIME NOTE

The shipped Cinematic Drama masters run 48–55s. The full cut here is ~2:52, because the holds buy
narration room the drama masters never had. That length is right for a sales or onboarding context and
long for a landing card, so cut down by dropping whole blocks rather than trimming narration — the
holds are already sized to their lines.

- **~1:43 — landing cut:** blocks **01, 03, 04, 07, 08**. Keeps the hook, the transformation, the consistency proof and the payoff; loses the two workflow blocks
- **~1:02 — teaser cut:** blocks **01, 03, 08**. Hook, money shot, logo

Blocks 01, 03 and 04 are the differentiators and should survive any trim. Block 07 only works if block 05
is present or the "nineteen" callback is rewritten, so drop them together or keep the payoff generic.

## WIRING THE FINISHED MASTER

Once the master is on Blob as `The Animated Comedy (English).mp4`, add an `animation` entry alongside
`drama` in `src/config/landing/productionShowcaseVideos.ts`. The card picks up the language picker
automatically — no component change. The `leaves the other cards without a player until dubs exist`
assertion in `src/__tests__/productionExamplesLanding.test.ts` covers `animation` today and will need it
removed from that list.
