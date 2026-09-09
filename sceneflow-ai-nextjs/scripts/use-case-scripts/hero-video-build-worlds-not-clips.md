# HERO VIDEO — "Build Worlds. Not Just Clips."

Landing-page hero video script for **https://sceneflowai.studio**. The video is the
first thing a visitor sees, so it must land the core value proposition in under a
minute and feel unmistakably cinematic.

- **Purpose:** Sell the SceneFlow AI Studio automated pipeline as the way to
  produce **high-quality, long-form video and series** — not five-second clips.
- **Runtime:** 1:10 (10 blocks × ~7s of motion, tail-held for 4K upscale grain
  smoothing)
- **Master:** Gemini Omni Flash 1.1 video generations, upscaled to **4K** in post.
- **Delivery aspect ratio:** 16:9 for landing hero, 9:16 auto-promo cut generated
  from the same blocks.
- **Frame rate:** 24 fps cinematic.
- **Languages:** English master, then dubbed with lip-sync into **Spanish,
  Portuguese, Hindi, Chinese, Arabic, Thai** (7 total, matching the Production
  Examples surface on the landing page).

Follows the block/beat convention of
[`cosmic-roommates-animated-comedy.md`](./cosmic-roommates-animated-comedy.md)
and [`1847-maple-drive-listing-tour.md`](./1847-maple-drive-listing-tour.md).

---

## OBJECTIVE

Land three claims from the current landing copy, in this order, without saying any
of them literally:

1. **"Build Worlds. Not Just Clips."** — long-form and series, not micro-prompts.
2. **Persistent Continuity** — the Reference Library locks faces, wardrobe,
   voices, and locations through scene 100.
3. **Direct Before You Render** — approve a feature-length animatic on low-cost
   beat frames, then commit to high-res.
4. **Built for Every Audience** — one master, seven languages, seventy more
   available.

Payoff frame: SceneFlow logo, `sceneflowai.studio`, and the primary CTA
"Start Your Production."

---

## THE FREEZE-FRAME METHOD (recap)

Each block generates ~6 seconds of motion, then holds its final frame for the
remaining ~4 seconds while narration completes. That buys 10s of VO per block
instead of 6s. Two consequences the prompts below are written around:

- **The last frame of every clip is a deliberate composition.** Every video prompt
  ends by naming the pose the shot must settle into.
- **Narration spans motion and hold continuously.** The cut point should be
  inaudible — a shot settles, it doesn't stop.

**Assembly:** generate each clip at ~6s, hold its final frame for the remainder.
Cross-dissolve 0.4s into the next block, overlapping the tail of the hold so the
dissolve never interrupts a spoken word. Block 03 is a special case (locked
composition, style hard-cuts inside the motion) and is annotated inline.

## NARRATION BUDGET

Delivery is ~150 wpm — trailer register, slightly slower than the comedy demo so
each phrase carries weight and dubs breathe. Ten seconds is therefore
**24–26 English words** per block. Every block below is annotated with its count.

**Dub-safe rules for every line:**

- No idioms, no puns, no brand-tied wordplay. Every sentence must translate
  cleanly into ES, PT, HI, ZH, AR, TH.
- No jokes that depend on English word order.
- Numbers stated as digits ("70+"), not words, so dubs don't drift on count.
- Every named brand string (**SceneFlow**, **Studio**, **Screening Room**,
  **Blueprint**, **Reference Library**) is left untranslated across all seven
  masters — dub scripts must keep these tokens verbatim.
- Prefer voiceover to on-camera sync dialogue. The single line of sync dialogue
  in Block 01 is intentionally short and lip-friendly across all seven target
  languages.

## GLOBAL BASE LOCK

Append to every video prompt below, then append any style module:

> Cinematic long-form production frame, 16:9 anamorphic 2.39:1 aspect within a
> 16:9 delivery frame, 35mm film grain, filmic warm-cool contrast (warm amber
> key, cool teal shadow), shallow depth of field, subtle atmospheric haze,
> premium production value, no text overlays or captions or watermarks or
> readable interface copy in frame, no logos in frame except where explicitly
> specified.

## STYLE MODULES

| Token | Module text |
|-------|-------------|
| `STYLE_LIVE_DRAMA` | Live-action cinematic drama, natural skin texture, physically plausible lighting, feature-film color grade, ARRI-Alexa-inspired highlight rolloff. |
| `STYLE_ANIMATION` | Stylized 3D animation, expressive character rigs, soft global illumination, art-directed color palette, feature-animation quality lighting. |
| `STYLE_DOC` | Documentary cinematography, handheld micro-movement, motivated practical light sources, period-accurate wardrobe and props, muted naturalistic palette. |
| `STYLE_UI_ABSTRACT` | Abstract product UI rendered as luminous glass panels floating in soft darkness, thin cyan-to-amber underlines, no readable copy, shape-and-motion only. |

## REFERENCE CHARACTERS (generate once — lock in Reference Library)

Rendering-agnostic descriptions on purpose — features only, no style words — so
one sheet survives every style module.

**REF: CHAR_ANA** — Ana, 32, mixed-heritage, warm brown eyes, dark curly hair
loosely pulled back with a few strands loose at the temple, faint freckles across
the nose, olive-green field jacket over a slate turtleneck, thin silver ring on
the right index finger. Confident but not performative — a director's calm.
Reference sheet: portrait, three-quarter, full-body, neutral soft key light,
plain background.

**REF: CHAR_MARCUS** — Marcus, 44, Black, close-cropped hair with grey at the
temples, salt-and-pepper beard, charcoal wool coat over a black henley, worn
leather notebook in one hand. Reads as a veteran cinematographer. Reference
sheet: portrait, three-quarter, full-body, neutral soft key light, plain
background.

**REF: CHAR_HERO_SUBJECT** — A drama protagonist used only in the pipeline
demonstration cutaways (Blocks 05–07). Woman, 35, long dark hair, deep-set eyes,
worn navy trench coat, silver locket. Rendering-agnostic; must hold across
animatic frame, pre-vis render, and final delivery frame without drift.

## REFERENCE LOCATIONS & MOTIFS

**REF: LOC_ROOFTOP** — A rain-slicked rooftop above a city at blue hour. Distant
skyline slightly out of focus, warm sodium streetlights below, cool teal sky
above, a single overhead practical light source (an old service lamp) providing
motivated key.

**REF: LOC_STUDIO** — A minimalist creator workspace: matte black desk in the
foreground, a single warm amber key light off to one side, floor-to-ceiling
window looking onto a rain-slicked cityscape at blue hour. No visible screens,
no readable interface — the software presence in this environment is entirely
suggested by light.

**REF: LOC_DESERT_DUSK** — A wide desert horizon at dusk, orange sky bleeding
into deep violet, silhouetted acacia trees, no visible signage.

**REF: LOC_ANIM_CITY** — A stylized 3D-animated city street at golden hour,
warm bounce light off pastel building facades, exaggerated depth of field,
character-scale focal length.

**REF: LOC_1930S_STAGE** — A documentary-styled 1930s theatre stage lit by
tungsten footlights, dust motes suspended in the beam, empty velvet seats in
soft focus behind.

## UI / ABSTRACT MOTIFS (STYLE_UI_ABSTRACT)

**REF: UI_BLUEPRINT** — Three floating glass panels arranged in a shallow arc,
each panel showing a soft-edged abstract storyboard shape (a face silhouette, a
location silhouette, a costume silhouette). Thin cyan-to-amber underline beneath
the middle panel. Shapes only, no readable text.

**REF: UI_REFERENCE_LIBRARY** — A vertical stack of glass tiles descending into
darkness, each tile holding a single character-portrait silhouette. A soft amber
lock icon glows on the topmost tile. Shapes only, no readable text.

**REF: UI_ANIMATIC_TIMELINE** — A horizontal timeline of held still frames laid
end to end, each frame a low-detail cinematic beat. A playhead traces left to
right; the timeline glows warmer as the playhead crosses each accepted beat.
Shapes only, no readable text.

**REF: UI_SCREENING_ROOM** — A dark private review room: one large centered
glowing playback rectangle, thin scrubber beneath, three small language pips
arranged along the base of the frame. Shapes only, no readable text.

**REF: UI_LANG_GLOBE** — A rotating luminous globe rendered as thin glass
meridians, with seven ribbon-shaped waveforms haloing around it in soft cyan.
Each ribbon represents one dub track. No country outlines, no flags, no
readable copy.

**REF: LOGO_CARD** — Centred SceneFlow wordmark on deep navy, thin amber-to-orange
underline, wide symmetrical negative space. Lower third left clear for a caption
line.

## MUSIC & SOUND DESIGN

**Score:** one continuous cue across all 10 blocks — no cuts, no stops.

- **0:00–0:20** — Intimate solo piano, single left-hand pattern, quiet.
- **0:20–0:45** — A cello enters at 0:20, a low sub-bass pulse enters at 0:32, a
  soft string bed rises under it at 0:38.
- **0:45–1:00** — Full orchestra with a low taiko-inspired percussion layer,
  never trailer-cliché — restrained, cinematic.
- **1:00–1:10** — Strings hold, percussion drops out, a single piano note lands
  on the logo card and rings out.

**Sound design (per block, called out inline):** foley is present but understated;
effects always motivated by what is on screen. No stingers, no whooshes on cuts.

---

## BLOCKS

### 01 — COLD OPEN (0:00)

The first thing the viewer sees is a *finished cinematic frame* — no logo, no
setup, no narrator. We must earn the pitch before we make it. One line of sync
dialogue lands, then the film breathes.

| Field | Content |
|-------|---------|
| **Timing** | Motion 0:00–0:06 · Freeze 0:06–0:10 |
| **In-scene** (0:02–0:05) | **ANA:** "We're not building a clip. We're building a world." *(11 words)* |
| **Narration** (0:06–0:10) | — *(no VO; music breathes; ambient rooftop only)* |
| **Video prompt** | LOC_ROOFTOP interior of the frame: CHAR_ANA standing near the parapet in three-quarter profile, city lights out of focus behind her, thin rain visible against the amber service lamp overhead. She looks off-camera-left, then turns slowly to camera as she delivers the line. Micro-rain landing on her jacket shoulders. **Settle on:** Ana looking directly to camera, calm, a single beat of stillness, rain hanging in the amber lamp beam. Base lock. STYLE_LIVE_DRAMA. |
| **Camera** | Slow dolly-in from medium to medium-close-up, 40mm anamorphic, T2.8, subject-locked focus |
| **Lighting** | Motivated overhead sodium/amber key from a practical service lamp; cool teal ambient from the sky above; wet-street bounce below |
| **SFX** | Distant city traffic (low, filtered), soft steady rain on jacket fabric, no music stinger — piano continues underneath |
| **Music** | Solo piano, ~55 bpm, single sustained motif, no swell |
| **Assembly note** | Ana's line is the ONLY sync dialogue in the film — every downstream dub must lip-sync this one line and only this one line. Keep it short: 11 English words → ES ~13, PT ~13, HI ~14, ZH ~10, AR ~12, TH ~13. |

### 02 — THE PROBLEM (0:10)

The first VO enters. State the core friction — fragmented tools, drift, chaos —
without ever naming a competitor.

| Field | Content |
|-------|---------|
| **Timing** | Motion 0:10–0:16 · Freeze 0:16–0:20 |
| **Narration** (0:10–0:20) | Most AI tools hand you a 5-second clip and hope you love it. Faces drift. Wardrobe shifts. A hundred tabs, and nothing holds together. *(26 words)* |
| **Video prompt** | Abstract dark space: eight floating glass panels arranged in a loose grid, each showing a slightly different version of the same face — hair length, jaw shape, and clothing subtly wrong on each. The panels drift out of alignment as the camera pushes in, then two of them shatter softly into slow-motion glass dust. No readable text on any panel. **Settle on:** the drifting misaligned grid, two panels mid-shatter, dust hanging in the light. Base lock. STYLE_UI_ABSTRACT. |
| **Camera** | Slow push-in through the panel grid, 24mm, T4, deep focus on the near panels going soft at the far edge |
| **Lighting** | Cool teal rim on every panel, single warm amber accent on the two shattering panels for visual emphasis |
| **SFX** | Low sub drop at 0:12, delicate glass-tinkle for the shatter at 0:15, otherwise near-silent |
| **Music** | Piano continues; a low cello note enters at 0:14 |

### 03 — THE STUDIO REVEAL (0:20)

Reveal the platform. The visual is deliberately soft — no UI copy, no dashboard
screenshot. Software presence is suggested by warm light on Ana's face.

| Field | Content |
|-------|---------|
| **Timing** | Motion 0:20–0:26 · Freeze 0:26–0:30 |
| **Narration** (0:20–0:30) | SceneFlow AI Studio is one automated pipeline — from concept, to Blueprint, to production, to a publish-ready master. *(20 words)* |
| **Video prompt** | LOC_STUDIO: CHAR_ANA seated at the matte black desk in profile-three-quarter, warm amber key light rising slowly onto her face as if a screen is powering up off-camera. She does not look at a screen — the light comes to her. Rain continues on the window behind her, blue hour outside. **Settle on:** Ana bathed in warm amber, eyes reflecting light, city rain out the window still moving softly. Base lock. STYLE_LIVE_DRAMA. |
| **Camera** | Slow lateral track from her profile to a three-quarter, 50mm, T2.0 |
| **Lighting** | Amber key ramps from 0% to 100% over the 6s of motion, warm-to-cool contrast against the blue-hour window |
| **SFX** | A single subtle low hum at 0:22 (implied device power-on, restrained), room tone, rain on glass |
| **Music** | Cello sustains under the piano; the piano gently syncopates |
| **Assembly note** | Do not render any actual UI in frame. The product's presence is *light on the actor*, not screen copy. |

### 04 — REFERENCE LIBRARY LOCK (0:30)

The first payoff of the "Build Worlds" promise: continuity is enforced. Show
what "locks faces, wardrobe, voices, and locations" *looks* like.

| Field | Content |
|-------|---------|
| **Timing** | Motion 0:30–0:36 · Freeze 0:36–0:40 |
| **Narration** (0:30–0:40) | Lock your cast, wardrobe, voices, and locations in the Reference Library. SceneFlow enforces them through scene 100. *(19 words)* |
| **Video prompt** | UI_REFERENCE_LIBRARY: a vertical stack of glass tiles descending into darkness, each tile holding a single character-portrait silhouette. As the camera pulls upward along the stack, an amber lock icon ignites on the topmost tile, then a soft warm ripple travels down the entire stack tile by tile. No readable text anywhere. **Settle on:** the full stack locked, every tile glowing warm, the topmost lock icon steady. Base lock. STYLE_UI_ABSTRACT. |
| **Camera** | Slow vertical crane up the stack, 35mm, T2.8 |
| **Lighting** | Cool teal fill in the darkness between tiles; warm amber "lock" pulse traveling top to bottom |
| **SFX** | Delicate metallic "lock" click at 0:31 (single, soft), warm harmonic bloom as the pulse travels down |
| **Music** | Low sub-bass pulse enters at 0:32 in time with the lock click, cello holds |

### 05 — BLUEPRINT (0:40)

Introduce the pipeline in narrative order. Blueprint = the plan.

| Field | Content |
|-------|---------|
| **Timing** | Motion 0:40–0:46 · Freeze 0:46–0:50 |
| **Narration** (0:40–0:50) | It starts in Blueprint. Story beats, target audience, and locked visual style — approved before a single frame is generated. *(20 words)* |
| **Video prompt** | UI_BLUEPRINT: three glass panels in a shallow arc — face silhouette, location silhouette, costume silhouette. As the camera arcs gently across the panels, a thin cyan-to-amber underline draws itself beneath the middle panel and then beneath all three in sequence. In the reflection on the middle panel, a ghosted silhouette of CHAR_HERO_SUBJECT briefly appears (the drama protagonist we will render fully in Block 07). No readable text. **Settle on:** all three panels underlined, subject silhouette faintly held in the middle reflection. Base lock. STYLE_UI_ABSTRACT. |
| **Camera** | Slow horizontal arc left-to-right past the three panels, 32mm, T2.8 |
| **Lighting** | Cool teal ambient with amber underline as the only warm accent |
| **SFX** | Soft pen-line "draw" sound as each underline appears (three beats, gentle) |
| **Music** | Cello swells slightly, string bed rises under it at 0:38 (into this block) |

### 06 — PRE-VIS ANIMATIC (0:50)

The second payoff: "Direct Before You Render." Show low-cost beat frames turning
into a feature-length animatic.

| Field | Content |
|-------|---------|
| **Timing** | Motion 0:50–0:56 · Freeze 0:56–1:00 |
| **Narration** (0:50–1:00) | Direct the entire film first on low-cost beat frames. Lock the feature-length animatic. Then, and only then, pay for high-res video. *(23 words)* |
| **Video prompt** | UI_ANIMATIC_TIMELINE: a horizontal timeline of ~30 held still frames laid end to end across the width of the shot, each frame a low-detail cinematic beat from a drama production (CHAR_HERO_SUBJECT recurring in ~6 of the frames, wardrobe and hair identical in each). A warm playhead traces left to right; every frame it passes glows warmer, from cool teal to amber, in sequence. **Settle on:** playhead resting three-quarters of the way across, most of the timeline warm, the last quarter still cool. Base lock. STYLE_UI_ABSTRACT. |
| **Camera** | Slow lateral dolly following the playhead left to right, 40mm, T2.8, timeline in shallow focus |
| **Lighting** | Cool teal base across the timeline; warm amber "approved" bloom trailing the playhead |
| **SFX** | Soft rhythmic "approve" tick as each frame warms (subtle, ~4 per second), no click-fatigue |
| **Music** | String bed continues to rise, low sub-bass pulse quickens gently |
| **Assembly note** | CHAR_HERO_SUBJECT must be visibly the same person across all animatic frames. This is the block that literally sells "Persistent Continuity." Regenerate if any frame shows drift. |

### 07 — FROM ANIMATIC TO FINAL (1:00)

Cross the pipeline's key transformation on camera: the same subject, same beat,
first as a low-cost pre-vis frame, then as a final 4K delivery frame. This is
the money shot of the film.

| Field | Content |
|-------|---------|
| **Timing** | Motion 1:00–1:06 continuous · Freeze 1:06–1:10 *(match-cut inside motion at 1:03)* |
| **Narration** (1:00–1:10) | Same beat. Same character. Same performance. Only the render changes. *(11 words)* — then held silence to 1:10 while the music holds. |
| **Video prompt** | Held medium shot of CHAR_HERO_SUBJECT in LOC_ROOFTOP at blue hour, identical pose, framing, focal length, and lighting angle throughout. At 1:03 the render hard-cuts once: from a low-detail flat-shaded pre-vis animatic frame (readable as a storyboard beat) into the fully rendered STYLE_LIVE_DRAMA production frame (film grain, natural skin texture, physically plausible lighting). Face, hair, wardrobe, and pose remain exactly matched across the cut. **Settle on:** the fully rendered production frame, hero subject looking off-camera into rain. Base lock. |
| **Camera** | Absolutely locked — the frame must not move; only the render reads as changing |
| **Lighting** | Motivated amber overhead lamp, cool teal ambient sky, identical angle before and after the cut |
| **SFX** | A single deep low breath of air at 1:03 as the render changes — no whoosh, no impact — the shot should feel like a curtain lifting, not a stinger |
| **Music** | Full orchestra enters at 1:00; on the 1:03 render-cut a soft cymbal wash blooms and settles; strings hold to 1:10 |
| **Assembly note** | If pre-vis and final drift on wardrobe or face by more than a hair, the block reads as a montage instead of a transformation and the film loses its center. Regenerate against locked references until the match is invisible. |

### 08 — RANGE (1:10 note: this beat is inside the last third)

*(Assembly note: Block 08 is compressed inside the same 10s window as Block 09
by design — see “Assembly plan” below. It exists to prove the pipeline serves
every genre, not just live-action drama.)*

Style-range beat. Three quick genre cutaways behind the same VO: animation, doc,
epic desert live-action. Establishes that the pipeline is not genre-locked.

| Field | Content |
|-------|---------|
| **Timing** | Motion runs during Block 09's audio window; treat as a 6s montage layered against Block 09's held frame *(see Assembly plan)* |
| **Video prompt A (2s)** | LOC_ANIM_CITY at golden hour, a stylized animated character walking briskly right-to-left, pastel building bounce light, exaggerated shallow DoF. **Settle on:** character silhouette against a warm building facade. STYLE_ANIMATION. |
| **Video prompt B (2s)** | LOC_1930S_STAGE, documentary handheld micro-movement, an unseen musician's silhouette caught in the tungsten footlight beam, dust motes suspended. **Settle on:** the dust-lit footlight beam holding empty on stage. STYLE_DOC. |
| **Video prompt C (2s)** | LOC_DESERT_DUSK, a lone figure standing in the middle distance against orange sky bleeding into deep violet, silhouetted acacia trees, wide anamorphic frame. **Settle on:** figure held small and centered against the horizon. STYLE_LIVE_DRAMA. |
| **Camera (all three)** | Locked or a whisper of drift, 32–50mm range, T2.8 |
| **SFX** | A: soft animated ambient wind. B: tungsten hum. C: distant desert wind. Cross-fade cleanly, no whooshes. |
| **Music** | Orchestra held from Block 07; low taiko-inspired percussion enters at the top of Block 09 (see Block 09) |

### 09 — BUILT FOR EVERY AUDIENCE (1:10)

The third payoff: seven languages, seventy more available. Dub demo without ever
showing text.

| Field | Content |
|-------|---------|
| **Timing** | Motion 1:10–1:16 · Freeze 1:16–1:20 (Block 08 montage cuts across this window as an overlay behind the language ribbons — see Assembly plan) |
| **Narration** (1:10–1:20) | Then ship it in 7 languages — with 70+ more in Production Studio. One master. Every audience. *(17 words)* |
| **Video prompt** | UI_LANG_GLOBE: a rotating luminous glass globe made of thin meridian lines. Seven ribbon-shaped waveforms halo around it in soft cyan, spaced evenly, each ribbon representing one dub track. The ribbons ripple in sequence as the globe rotates. Behind the globe, ghosted at low opacity, the three Block 08 genre cutaways drift by as background layers. **Settle on:** globe centered, seven ribbons at rest, background genre montage held mid-frame. Base lock. STYLE_UI_ABSTRACT. |
| **Camera** | Slow orbit around the globe, 40mm, T2.8, globe locked in center of frame |
| **Lighting** | Cool cyan on the meridian lines, warm amber accent on the primary ribbon (English) |
| **SFX** | Seven short breath-like "dub" pulses staggered across 1:10–1:16 (one per ribbon), then hold |
| **Music** | Full orchestra plus low taiko-inspired percussion enters at 1:10, restrained not trailer-cliché |
| **Assembly note** | No flags, no country outlines, no readable language names anywhere in frame. Languages are represented as *ribbons*, not labels. This is a dub-safe frame — every locale sees the same visuals. |

### 10 — LOGO / CTA (1:20)

Payoff card. Deliberately understated — the film has already made the pitch.

| Field | Content |
|-------|---------|
| **Timing** | Motion 1:20–1:24 · Freeze 1:24–1:30 |
| **Narration** (1:20–1:26) | Build worlds. Not just clips. *(5 words)* |
| **Narration** (1:26–1:30) | SceneFlow AI Studio. Start your production. *(6 words)* |
| **Video prompt** | LOGO_CARD: centred SceneFlow wordmark on deep navy. Thin amber-to-orange underline draws itself beneath the wordmark from left to right over 1.5s. Lower third of the frame remains empty for a caption overlay added in post: `sceneflowai.studio`. No other movement in frame. **Settle on:** wordmark centered, underline fully drawn, caption line rendered in post at the lower third. STYLE_UI_ABSTRACT. |
| **Camera** | Locked. No motion. |
| **Lighting** | Deep navy field, warm amber underline as the only warm accent |
| **SFX** | A single low sub-bass tail at 1:20 as the underline begins, then near-silence to the end |
| **Music** | Strings hold, percussion drops out, single piano note lands on the wordmark at 1:22 and rings out to 1:30 |
| **Assembly note** | The caption `sceneflowai.studio` is added in post as a text overlay, not generated in-frame — model text rendering is unreliable at this quality bar. The primary CTA button ("Start Your Production") is not shown inside the video; it lives adjacent to the hero video on the landing page. |

---

## ASSEMBLY PLAN

10 blocks, 90 seconds of generated motion, 1:30 total on the master.

| Block | Window | Purpose |
|-------|--------|---------|
| 01 | 0:00–0:10 | Cold open — earned frame, one sync line |
| 02 | 0:10–0:20 | Problem — drift, chaos, fragmentation |
| 03 | 0:20–0:30 | Studio reveal — soft, no UI copy |
| 04 | 0:30–0:40 | Reference Library lock |
| 05 | 0:40–0:50 | Blueprint |
| 06 | 0:50–1:00 | Pre-vis animatic |
| 07 | 1:00–1:10 | Animatic → final render match-cut |
| 08 | *(overlay 1:10–1:16)* | Genre range montage |
| 09 | 1:10–1:20 | Multi-language |
| 10 | 1:20–1:30 | Logo / CTA |

Block 08 is a **3-cut montage overlay** rendered behind Block 09's language
globe. Alternatively, if the montage reads more clearly as a stand-alone beat,
extend the master to **1:40** by giving Block 08 its own 10-second window
between Blocks 07 and 09. Both cuts must be produced; the landing page hero uses
the 1:30 overlay variant; the extended 1:40 variant is the YouTube master.

**Cross-dissolves:** 0.4s between every block, overlapping the tail of the
freeze so no VO word is ever interrupted by a cut. Exceptions: Block 03's amber
key ramp *becomes* the transition into Block 04 (hard cut on the lock-click);
Block 07's render match-cut is a hard cut with a single 0.2s cymbal wash.

**Music mix:** −18 LUFS dialogue, −22 LUFS score, −30 LUFS ambient beds.
Dialogue-first mix so dubs stay legible across all seven languages.

## MULTI-LANGUAGE DELIVERABLES

Master in English is generated and rendered once. Each dub is auto-aligned to
the same picture cut in Production Studio:

| Locale | Code | Dub method | Lip-sync required |
|--------|------|------------|-------------------|
| Spanish | `es` | Full dub | Block 01 only |
| Portuguese | `pt` | Full dub | Block 01 only |
| Hindi | `hi` | Full dub | Block 01 only |
| Chinese (Simplified) | `zh-CN` | Full dub | Block 01 only |
| Arabic | `ar` | Full dub | Block 01 only |
| Thai | `th` | Full dub | Block 01 only |

Blocks 02–10 are voiceover only. That is a deliberate design choice: it lets the
Blocks 02–10 dubs be produced without lip-sync passes, keeping localization
cost low and delivery fast. Block 01's single sync line ("We're not building a
clip. We're building a world.") is the only block that requires the auto
lip-sync engine.

**Locale-adjusted timing.** Word counts per block above are English. Estimated
dub deltas at ~150 wpm target:

| Locale | Avg. duration vs. EN | Notes |
|--------|----------------------|-------|
| ES | +8% | Trim adjective density in Blocks 02, 06 if a specific dub overruns |
| PT | +9% | Same as ES |
| HI | +5% | Compact syntax; dubs almost always fit |
| ZH | −12% | Under-runs; use the resulting headroom to breathe on Block 07's held silence |
| AR | +6% | Watch Block 02's "hundred tabs" phrase for verbosity |
| TH | +3% | Fits cleanly at the target rate |

## LEGAL / SAFETY GUARDRAILS

- No visible third-party brand marks in any frame. No competing product UIs,
  logos, or interfaces, even implied.
- No readable interface text or copy in-frame at any point (all UI is abstracted
  shapes). Any wordmark or caption is added as a post overlay.
- No real recognizable persons — CHAR_ANA, CHAR_MARCUS, and CHAR_HERO_SUBJECT
  are original composites locked in the Reference Library.
- No text or logos on wardrobe or in environments.
- All generations pass through the standard Vertex safety layer (Trust & Safety
  tier 1). No content in this piece requires the guarded fallback path.

## OUTPUT SPECS

- **Master:** 3840 × 2160 (UHD 4K), 24 fps, ProRes 422 HQ intermediate, H.264
  MP4 delivery at ~40 Mbps for web.
- **Upscale:** Native-generation resolution from Gemini Omni Flash 1.1 upscaled
  to 4K via the Studio's Delivery-Quality Upscale (Premium tier), Topaz on for
  the two live-action blocks (01, 07) and off for the abstract UI blocks
  (02–06, 08–10) to preserve intentional flatness.
- **9:16 promo:** auto-generated by the Promotion Trailers feature from Blocks
  01, 07, and 09; 30-second cut; landscape hero and vertical promo share the
  same picture edits, only reframed.
- **Landing page delivery:** the video is muted-autoplay on hero mount and
  unmutes on user interaction. The single sync line in Block 01 and all VO must
  read as narration in every locale even without audio; caption tracks are
  produced for all seven locales alongside the dubs.

## PRODUCTION CHECKLIST

- [ ] Lock CHAR_ANA, CHAR_MARCUS, CHAR_HERO_SUBJECT in the Reference Library.
- [ ] Lock LOC_ROOFTOP, LOC_STUDIO, LOC_DESERT_DUSK, LOC_ANIM_CITY,
      LOC_1930S_STAGE in the Reference Library.
- [ ] Generate Block 07's pre-vis frame and final frame from the same locked
      reference; verify wardrobe/hair/pose match before rendering the cut.
- [ ] Generate the score as a single continuous cue; do not stem-render
      block-by-block or the ducking under VO will drift.
- [ ] Record English VO first at 150 wpm target; verify each block's word count
      against the annotation above before committing.
- [ ] Auto-dub Blocks 02–10 into ES, PT, HI, ZH, AR, TH; lip-sync Block 01 only.
- [ ] Render 4K master + 9:16 promo. Ship both to the landing page hero slot.
