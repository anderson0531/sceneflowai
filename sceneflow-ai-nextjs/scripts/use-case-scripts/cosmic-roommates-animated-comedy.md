# COSMIC ROOMMATES — Animated Comedy Showcase

Video Script (Animated Comedy Demo — Production Examples `animation` card)

**Show:** *Cosmic Roommates* — a human slacker and a compulsively formal four-armed alien share a one-bedroom apartment
**Runtime:** 1:20 (8 blocks × 10s)
**Format:** Freeze-frame animatic — each block generates ~6s of motion, then holds its final frame while the narration completes
**Narrator:** Single VO, dry and confident, comedy-trailer register — plays it straight, never mugs for the joke
**Shipped style:** Anime (90s) — blocks 01, 03, 07 are the finished look

Follows the beat-table convention of `1847-maple-drive-listing-tour.md`, adapted for freeze-frame
assembly: blocks are a fixed 10s, the prompt column is a video prompt with camera action, and every block
declares where motion ends and the hold begins.

## THE FREEZE-FRAME METHOD

Narration is not capped by clip length. Each block generates roughly six seconds of motion; the final
frame then holds for the remainder while the voiceover finishes its thought. That buys a full ten seconds
of narration per block instead of the six a moving clip would allow, so each block can land one complete
idea rather than a fragment.

Two consequences the prompts below are written around:

- **The last frame of every clip is a held composition, not a throwaway.** Each video prompt ends by
  naming the pose the shot must settle into. Treat that final frame as a deliberate storyboard panel.
- **Narration spans motion and hold continuously.** There is no pause at the freeze. The cut point should
  be inaudible — the viewer registers the image settling, not the animation stopping.

**Assembly:** generate each clip at 6s. Hold the final frame for the remaining 4s. Cross-dissolve 0.4s
into the next block, overlapping the tail of the hold so the dissolve never interrupts a spoken word.
Block 03 is the exception and is noted inline.

## NARRATION BUDGET

Delivery is ~160 words per minute — comedy-trailer pace, faster than the documentary register used by the
introduction animatic. Ten seconds is therefore **26–28 words**. Every block below is annotated with its
count. Blocks carrying in-scene character dialogue split the ten seconds explicitly and are annotated per
segment.

Rewriting a line? Keep the count. Going long forces the VO to rush the joke, and the jokes are the demo.

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

**REF: LOC_SOCK_DRAWER** — An open dresser drawer, socks folded into identical labelled rows with tiny divider cards, each row flagged with a colour tab. Absurdly over-organised. Close shot, no people.

**REF: UI_WRITERS_ROOM** — Abstracted script surface rendered as animated comedy graphics: a column of soft-edged dialogue blocks, each tightening and snapping shorter in sequence. Shapes only, no readable text.

**REF: UI_RESONANCE_GAUGE** — Abstracted circular gauge filling toward a high value, beside it a horizontal timing bar with one over-long segment visibly contracting. Shapes only, no readable text.

**REF: UI_SCREENING_ROOM** — Abstracted darkened review room: one large glowing playback rectangle, slim scrubber beneath. Shapes only, no readable text.

**REF: LOGO_CARD** — Centred SceneFlow mark on deep navy, thin amber-to-orange underline, wide symmetrical negative space. Lower third left clear for an overlay caption.

## BLOCKS

### 01 — COLD OPEN (0:00)

Open inside the finished show. No logo, no setup, no narration until the joke has landed — the first thing
the viewer hears is the product's actual output. The VO arrives only once they are already amused.

| Field | Content |
|-------|---------|
| **Timing** | Motion 0:00–0:06 · Freeze 0:06–0:10 |
| **In-scene** (0:00–0:05) | **DEZ:** "You alphabetised my socks."<br>**VORP-9:** "I alphabetised your *timeline*. The socks were symptomatic." *(12 words)* |
| **Narration** (0:05–0:10) | Nobody drew that. One person described a show, and SceneFlow built every frame. *(13 words)* |
| **Video prompt** | LOC_APARTMENT interior, morning. CHAR_DEZ slumped on the plaid couch holding a single folded sock aloft, turning slowly toward CHAR_VORP with dawning alarm. CHAR_VORP stands rigidly beside the open LOC_SOCK_DRAWER, all four hands clasped in serene pairs, three amber eyes blinking out of sequence. Beat of stillness, then the sock drops from Dez's fingers. **Settle on:** Dez staring flatly at camera, sock mid-fall, Vorp-9 serene in the background. Base lock. STYLE_ANIME_90S. |
| **Camera** | Locked wide, quick 20% punch-in on the sock drop, hold on the two-shot |

### 02 — WRITER'S ROOM (0:10)

| Field | Content |
|-------|---------|
| **Timing** | Motion 0:10–0:16 · Freeze 0:16–0:20 |
| **Narration** | It starts in the Writer's Room. Describe the premise, and SceneFlow drafts the episode — then polishes every line, because a joke two beats too long isn't a joke. *(28 words)* |
| **Video prompt** | UI_WRITERS_ROOM fills frame: a vertical column of dialogue blocks, each visibly tightening and snapping shorter in sequence down the column, an amber pulse travelling with every contraction. CHAR_DEZ silhouetted small at the lower frame edge, watching the column shrink. No readable text anywhere. **Settle on:** the fully tightened column, amber pulse resting at the base beside Dez's silhouette. Base lock. STYLE_ANIME_90S. |
| **Camera** | Slow pan down the column following the pulse, settle at the base |

### 03 — ART STYLE (0:20)

The money shot. The frame must be pinned so precisely that only the rendering appears to change — any
drift in framing or pose destroys the effect and the block becomes a montage instead of a transformation.

| Field | Content |
|-------|---------|
| **Timing** | Motion 0:20–0:28 continuous · Freeze 0:28–0:30 *(three swaps inside the motion, then hold on Comic Book)* |
| **Narration** | Then pick the look — or let SceneFlow recommend one for your genre. Nineties anime. Ghibli-esque. Comic book. Same script, same performances, same timing, entirely repainted. Watch. *(26 words)* |
| **Video prompt** | Held two-shot of CHAR_DEZ and CHAR_VORP in LOC_APARTMENT, identical pose, framing and lens throughout. Beneath the unchanged composition the rendering hard-cuts three times: STYLE_ANIME_90S, then STYLE_GHIBLI, then STYLE_COMIC. Character features, proportions, all four arms and eye placement remain exactly matched across all three. **Settle on:** the STYLE_COMIC render, held dead still. Base lock. |
| **Camera** | Absolutely locked — the frame must not move, so only the style reads as changing |
| **Assembly note** | Time the swaps so the third lands on the word "repainted"; "Watch." plays over the held comic-book frame |

### 04 — REFERENCE LIBRARY (0:30)

| Field | Content |
|-------|---------|
| **Timing** | Motion 0:30–0:36 · Freeze 0:36–0:40 |
| **Narration** | Every character lives in the Reference Library. Build them once and they hold — same face, same three eyes, same four arms — in every style, every episode. *(26 words)* |
| **Video prompt** | Triptych in one frame: CHAR_VORP rendered in STYLE_ANIME_90S, STYLE_GHIBLI and STYLE_COMIC side by side, all three performing the same slow four-armed shrug in perfect sync. Thin amber alignment lines draw on, connecting matching features across the panels — the three stacked eyes, each of the four shoulders. **Settle on:** all three mid-shrug at the identical pose, alignment lines complete and glowing. Base lock. |
| **Camera** | Hold with faint drift in; alignment lines draw on over 2s and remain lit through the freeze |

### 05 — AUDIENCE RESONANCE (0:40)

| Field | Content |
|-------|---------|
| **Timing** | Motion 0:40–0:46 · Freeze 0:46–0:50 |
| **Narration** | Audience Resonance scores the cut against your actual audience. It finds the beat that drags, the setup with no payoff, and tells you before anyone else sees it. *(28 words)* |
| **Video prompt** | UI_RESONANCE_GAUGE centred, the circular gauge sweeping up toward a high value. Beside it the horizontal timing bar shows one conspicuously over-long segment contracting to match its neighbours, and the gauge ticks higher as it does. Small inset of CHAR_DEZ mid-laugh, arriving visibly earlier on the second pass. **Settle on:** gauge at its high value, timing bar even, Dez's laugh frozen at its peak. Base lock. STYLE_ANIME_90S. |
| **Camera** | Slow push-in on the gauge, whip to the timing bar, settle wide on both |

### 06 — SCREENING ROOM (0:50)

| Field | Content |
|-------|---------|
| **Timing** | Motion 0:50–0:56 · Freeze 0:56–1:00 |
| **Narration** | In the Screening Room you watch the animatic first — rough frames, real timing. Approve it, and only then does SceneFlow render and premiere the finished episode. *(26 words)* |
| **Video prompt** | UI_SCREENING_ROOM: CHAR_DEZ and CHAR_VORP seated in silhouette before the glowing playback rectangle. Inside the rectangle, rough grey animatic frames of the sock-drawer scene resolve left to right into full-colour finished animation. **Settle on:** the rectangle fully resolved to finished colour, both silhouettes lit by its glow. Base lock. STYLE_ANIME_90S. |
| **Camera** | Slow zoom out from the rectangle to include both silhouettes, settle |

### 07 — PAYOFF (1:00)

The runner gag closes. Returning to the show after the pipeline explanation proves the finished thing
actually works — and gives the viewer a second laugh right before the logo, which is what they will
remember.

| Field | Content |
|-------|---------|
| **Timing** | Motion 1:00–1:06 · Freeze 1:06–1:10 |
| **In-scene** (1:00–1:05) | **VORP-9:** "Your socks are now chronological."<br>**DEZ:** "…Chronological."<br>**VORP-9:** "You will thank me in nineteen days." *(13 words)* |
| **Narration** (1:05–1:10) | That started as one sentence. Script to premiere, that is the entire pipeline. *(13 words)* |
| **Video prompt** | LOC_APARTMENT interior, evening. CHAR_VORP presents the open LOC_SOCK_DRAWER with two of four arms, colour tabs now arranged in a precise gradient. CHAR_DEZ stares into it without moving, then slowly turns his head to camera, entirely deadpan. **Settle on:** Dez in flat close-up looking directly at camera, Vorp-9 beaming behind him, drawer glowing amber. Base lock. STYLE_ANIME_90S. |
| **Camera** | Two-shot, slow push-in to Dez's flat close-up, hold |

### 08 — CLOSE (1:10)

| Field | Content |
|-------|---------|
| **Timing** | Motion 1:10–1:16 · Freeze 1:16–1:20 |
| **Narration** | Your show. Your style. Your cast, consistent to the last frame. SceneFlow AI Studio — envision the story, we handle the pipeline. *(21 words, deliberately under budget — delivered unhurried over the logo hold)* |
| **On-screen text** | SceneFlow AI Studio · sceneflowai.studio *(caption layer at assembly, not baked into the frame)* |
| **Video prompt** | LOGO_CARD centred, thin amber-to-orange underline drawing in left to right, faint haze settling. Lower third clear. No people. **Settle on:** completed logo card, underline full width, haze at rest. Base lock. |
| **Camera** | Slow push-in, settle to hold |

**Total:** 8 × 10s = **1:20**

## AUDIO GUIDE

| Layer | Notes |
|-------|-------|
| VO | Single narrator, dry and confident, comedy-trailer register at ~160 wpm; plays it straight |
| Character VO | Dez — flat, unbothered, young male. Vorp-9 — precise, over-articulated, no contractions, faintly resonant |
| Music | Light plucked comedy bed; stings on the block 01 sock drop and the block 07 turn-to-camera; drops out entirely under block 03's style swaps so the visual carries alone |
| Ambience | Room tone in LOC_APARTMENT blocks only; tool blocks stay dry |
| Comic timing | Hold ~0.6s of silence before "…Chronological." — the gap is the joke. Do not let the VO crowd it |
| Freeze transition | No audio change at the motion/freeze cut; the seam must be inaudible |

## PRODUCTION WORKFLOW (SceneFlow)

Mirrors the five workflow steps on the `animation` card in `src/config/landing/productionShowcaseCopy.ts`.
Keep the two in sync — the card is the promise, this script is the proof.

1. **Writer's Room** — genre-aware sitcom script, then dialogue polish for rhythm and beat length
2. **Art style** — accept the SceneFlow recommendation or toggle Anime (90s) / Ghibli-esque / Comic Book; ship Anime (90s) and keep the other two rendered for block 03
3. **Reference Library** — lock CHAR_DEZ and CHAR_VORP once from rendering-agnostic sheets; verify all four arms and three stacked eyes survive each style module before generating blocks
4. **Audience Resonance™** — score comedic timing against the target audience; trim the long beat flagged in block 05
5. **Screening Room** — approve the animatic pre-vis, then premiere the full video

## RUNTIME NOTE

The shipped Cinematic Drama masters run 48–55s. This script is 1:20, because freeze-frame assembly trades
runtime for narration clarity. To shorten:

- **70s** — fold block 07's payoff into the head of block 08, keeping the callback and losing the logo hold
- **60s** — also merge blocks 02 and 03 into a single script-and-style block

Blocks 01, 03 and 04 are the differentiators — the hook, the transformation, and the consistency proof —
and should keep their full ten seconds in any trim.

**Landing excerpt (30s):** blocks **01, 03, 04, 08**

## WIRING THE FINISHED MASTER

Once the master is on Blob as `The Animated Comedy (English).mp4`, add an `animation` entry alongside
`drama` in `src/config/landing/productionShowcaseVideos.ts`. The card picks up the language picker
automatically — no component change. The `leaves the other cards without a player until dubs exist`
assertion in `src/__tests__/productionExamplesLanding.test.ts` covers `animation` today and will need it
removed from that list.
