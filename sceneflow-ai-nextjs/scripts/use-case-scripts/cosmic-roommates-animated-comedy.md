# COSMIC ROOMMATES — Animated Comedy Showcase

Video Script (Animated Comedy Demo — Production Examples `animation` card)

**Show:** *Cosmic Roommates* — a human slacker and a compulsively formal four-armed alien share a one-bedroom apartment
**Runtime:** 1:10 (7 blocks × 10s)
**Format:** Finished animated video — narrated showcase; opens inside the comedy, pulls back to the pipeline, returns for the punchline
**Narrator:** Single VO, dry and warm, comedy-trailer register — never mugs for the joke
**Shipped style:** Anime (90s) — blocks 01, 06, 07 are the finished look

Follows the beat-table convention of `1847-maple-drive-listing-tour.md`, with two changes: blocks are a
fixed 10s, and the prompt column is a video prompt with camera action rather than a still-image prompt.
The style lock is split into a base lock plus three swappable modules because the style toggle is what
block 03 exists to demonstrate.

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

**REF: LOC_SOCK_DRAWER** — An open dresser drawer, socks folded into identical labelled rows with tiny divider cards. Absurdly over-organised. Close shot, no people.

**REF: UI_WRITERS_ROOM** — Abstracted script surface rendered as animated comedy graphics: a column of soft-edged dialogue blocks, each tightening and snapping shorter in sequence. Shapes only, no readable text.

**REF: UI_RESONANCE_GAUGE** — Abstracted circular gauge filling toward a high value, beside it a horizontal timing bar with one over-long segment visibly contracting. Shapes only, no readable text.

**REF: UI_SCREENING_ROOM** — Abstracted darkened review room: one large glowing playback rectangle, slim scrubber beneath. Shapes only, no readable text.

**REF: LOGO_CARD** — Centred SceneFlow mark on deep navy, thin amber-to-orange underline, wide symmetrical negative space. Lower third left clear for an overlay caption.

## BLOCKS

**Assembly:** every block is exactly 10s. Cross-dissolve 0.4s between blocks; hard cut on the block 03
style swaps. Narration is budgeted at roughly 130–140 words per minute, so each block sits near 20 words.

### 01 — COLD OPEN (0:00)

| Field | Content |
|-------|---------|
| **In-scene** (0:00–0:06) | **DEZ:** "You reorganised my sock drawer?"<br>**VORP-9:** "I reorganised your timeline. The socks were symptomatic." *(13 words)* |
| **Narration** (0:06–0:10) | Every frame of this was made in one studio. *(9 words)* |
| **Video prompt** | LOC_APARTMENT interior. CHAR_DEZ slumped on the plaid couch holding one folded sock, turning slowly toward camera with dawning alarm. CHAR_VORP stands rigidly beside the open LOC_SOCK_DRAWER, all four hands clasped in serene pairs, three amber eyes blinking out of sequence. Comedic beat of stillness, then Dez's sock drops from frame. Base lock. STYLE_ANIME_90S. |
| **Camera** | Locked wide, then quick 20% punch-in on the drop |

### 02 — WRITER'S ROOM (0:10)

| Field | Content |
|-------|---------|
| **Narration** | That punchline wasn't hand-written. The Writer's Room knows the genre, drafts the script, then polishes every line for rhythm and timing. *(21 words)* |
| **Video prompt** | UI_WRITERS_ROOM fills frame: a vertical column of dialogue blocks, each one visibly tightening and snapping shorter in sequence down the column, amber pulse travelling with each contraction. CHAR_DEZ silhouetted small at the lower frame edge, watching. No readable text anywhere. Base lock. STYLE_ANIME_90S. |
| **Camera** | Slow pan down the column, following the pulse |

### 03 — ART STYLE (0:20)

| Field | Content |
|-------|---------|
| **Narration** | Then choose the look. SceneFlow recommends one — nineties Anime, Ghibli-esque, or Comic Book — and re-renders the entire show. *(20 words)* |
| **Video prompt** | Held two-shot of CHAR_DEZ and CHAR_VORP in LOC_APARTMENT, identical pose and framing throughout. The rendering style hard-cuts three times beneath the unchanged composition: first STYLE_ANIME_90S, then STYLE_GHIBLI, then STYLE_COMIC. Character features, proportions, all four arms, and eye placement remain exactly matched across all three. Base lock. |
| **Camera** | Absolutely locked — the frame must not move, so only the style reads as changing |

### 04 — REFERENCE LIBRARY (0:30)

| Field | Content |
|-------|---------|
| **Narration** | Your cast lives in the Reference Library. Same faces, same four arms, in every style and every episode. *(18 words)* |
| **Video prompt** | Triptych in one frame: CHAR_VORP rendered in STYLE_ANIME_90S, STYLE_GHIBLI, and STYLE_COMIC side by side, all three performing the same slow four-armed shrug in perfect sync. Thin amber alignment lines connect matching features across the panels — the three stacked eyes, each of the four shoulders. Base lock. |
| **Camera** | Hold, faint drift in; alignment lines draw on over 2s |

### 05 — AUDIENCE RESONANCE (0:40)

| Field | Content |
|-------|---------|
| **Narration** | Audience Resonance scores comedic timing against your audience. It flags the joke that runs long before anyone has to sit through it. *(22 words)* |
| **Video prompt** | UI_RESONANCE_GAUGE centred, circular gauge sweeping up toward a high value. Beside it the horizontal timing bar shows one conspicuously over-long segment that contracts to match its neighbours, and the gauge ticks higher as it does. Small inset of CHAR_DEZ mid-laugh, arriving earlier on the second pass. Base lock. STYLE_ANIME_90S. |
| **Camera** | Slow push-in on the gauge, then whip to the timing bar |

### 06 — SCREENING ROOM (0:50)

| Field | Content |
|-------|---------|
| **Narration** (0:50–0:55) | Screen the animatic first. Approve the timing, then premiere the finished episode. *(12 words)* |
| **In-scene** (0:56–1:00) | **VORP-9:** "The socks are now chronological."<br>**DEZ:** "…Chronological." *(8 words)* |
| **Video prompt** | UI_SCREENING_ROOM: CHAR_DEZ and CHAR_VORP seated in silhouette before the glowing playback rectangle. Inside the rectangle, rough grey animatic frames of the sock-drawer scene resolve into full-colour finished animation, sweeping left to right. Then cut inside the rectangle to the finished two-shot for the callback line, Dez staring dead ahead. Base lock. STYLE_ANIME_90S. |
| **Camera** | Slow zoom out on the room, hard cut into the playback for the callback |

### 07 — CLOSE (1:00)

| Field | Content |
|-------|---------|
| **Narration** | One studio. Script to premiere. SceneFlow AI — envision the story, we handle the pipeline. *(14 words)* |
| **On-screen text** | SceneFlow AI Studio · sceneflowai.studio *(caption layer at assembly, not baked into the frame)* |
| **Video prompt** | LOGO_CARD centred, thin amber-to-orange underline drawing in left to right, faint haze settling. Lower third clear. No people. Base lock. |
| **Camera** | Slow push-in, settle to hold |

**Total:** 7 × 10s = **1:10**

## AUDIO GUIDE

| Layer | Notes |
|-------|-------|
| VO | Single narrator, dry and warm, comedy-trailer register; never mugs for the joke |
| Character VO | Dez — flat, unbothered, young male. Vorp-9 — precise, over-articulated, no contractions, faintly resonant |
| Music | Light plucked comedy bed; stings on the block 01 sock drop and the block 06 callback; drops out entirely under block 03's style cuts |
| Ambience | Room tone in LOC_APARTMENT blocks only; tool blocks stay dry |
| Comic timing | Hold ~0.6s of silence before "…Chronological." — the gap is the joke |

## PRODUCTION WORKFLOW (SceneFlow)

Mirrors the five workflow steps on the `animation` card in `src/config/landing/productionShowcaseCopy.ts`.
Keep the two in sync — the card is the promise, this script is the proof.

1. **Writer's Room** — genre-aware sitcom script, then dialogue polish for rhythm and beat length
2. **Art style** — accept the SceneFlow recommendation or toggle Anime (90s) / Ghibli-esque / Comic Book; ship Anime (90s) and keep the other two rendered for block 03
3. **Reference Library** — lock CHAR_DEZ and CHAR_VORP once from rendering-agnostic sheets; verify all four arms and three stacked eyes survive each style module before generating blocks
4. **Audience Resonance™** — score comedic timing against the target audience; trim the long beat flagged in block 05
5. **Screening Room** — approve the animatic pre-vis, then premiere the full video

## RUNTIME NOTE

The shipped Cinematic Drama masters run 48–55s. This script is 70s. To match them, drop block 07 and fold
the sign-off into block 06's tail for 60s, or merge blocks 02 and 03 for 50s. Blocks 03 and 04 are the
differentiators and should keep their full beat in any trim.

**Landing excerpt (30s):** blocks **01, 03, 04, 07**

## WIRING THE FINISHED MASTER

Once the master is on Blob as `The Animated Comedy (English).mp4`, add an `animation` entry alongside
`drama` in `src/config/landing/productionShowcaseVideos.ts`. The card picks up the language picker
automatically — no component change. The `leaves the other cards without a player until dubs exist`
assertion in `src/__tests__/productionExamplesLanding.test.ts` covers `animation` today and will need it
removed from that list.
