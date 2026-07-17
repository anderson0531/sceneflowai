# Pipeline Pillar — Narrated Marketing Video Scripts

Production guide for the **3 per-pillar walkthrough videos** on the landing page 3-Pillar Pipeline section (`#pipeline`): **Series**, **Blueprint**, and **Production**. These are **marketing** videos — not step demos — engineered for a concept-to-publish "wow": streamlined, cinematic, and built to convert potential subscribers.

Each pillar video plays full-width beneath the pillar's "How It Works" step timeline and uses the pillar screenshot as its poster.

**Asset convention** (wired in [`src/config/landing/pipelinePillarsMedia.ts`](../src/config/landing/pipelinePillarsMedia.ts)):

| Pillar | Video | Poster |
|--------|-------|--------|
| Series | `Series.mp4` | `/landing/pipeline/series.png` |
| Blueprint | `BLUEPRINT.mp4` | `/landing/pipeline/blueprint.png` |
| Production | `walkthrough/Production.mp4` | `/landing/pipeline/production.png` |

Per-step screenshot placeholders in the How It Works timeline are wired in [`src/config/landing/guidedStepsMedia.ts`](../src/config/landing/guidedStepsMedia.ts) (`{stepId}.mp4` / `{stepId}.jpg` under `public/landing/how-it-works/`).

---

## Narrator voice & profile

Use one consistent narrator across all three videos so the pipeline feels like a single guided tour from the same creative director.

### Persona

| Field | Value |
|-------|-------|
| **Name** | Studio Guide (internal label only) |
| **Role** | Senior creative director welcoming a new producer to SceneFlow |
| **Tone** | Warm, confident, unhurried — an expert peer, not a sales pitch |
| **Pace** | 150–160 words per minute |
| **Energy** | Measured enthusiasm; emphasize outcomes ("you approve," "you control," "in one click") |
| **POV** | Speak to "you," the creator; sell the streamlined concept-to-publish feeling |

### Recommended TTS voice (Gemini)

Aligns with existing landing narrator patterns in [`src/config/landing/roleStoryScripts.ts`](../src/config/landing/roleStoryScripts.ts):

| Setting | Value |
|---------|-------|
| **Voice ID** | `gemini-Rasalgethi` |
| **Profile** | Robust, deep, narrative-driven storyteller; cinematic gravity, unhurried, documentary-quality delivery |
| **Director note** | "Speak as a creative director walking a client through their studio for the first time — clear, reassuring, never rushed. Land the payoff lines with quiet confidence." |

### Alternate (ElevenLabs)

| Setting | Value |
|---------|-------|
| **Style** | Narration / Documentary |
| **Stability** | 0.65–0.75 |
| **Similarity** | 0.80 |
| **Speed** | 0.92–0.96 (slightly slower than default) |

### Audio & video specs

- **Duration:** Series ~50s, Blueprint ~40s, Production ~2:15 (see per-pillar targets).
- **Format:** MP4, H.264, 1920×1080, 30fps.
- **Audio:** AAC 48 kHz, −16 LUFS integrated loudness; light bed music under narration (−22 LUFS), duck on VO.
- **Capture:** 1920×1080 browser window, dark UI theme, cursor visible, no personal data in frame.
- **Edit:** Light zoom on key clicks; snappy cuts between beats; open on a title card, close on the SceneFlow logo + CTA. Beat titles lower-third on screen.

---

## 1. Series — "Build a Universe, Not a Clip"

**Video:** `Series.mp4` · **Target:** ~50 seconds · **Beats:** 6

**Opening hook (0:00–0:06)**

> One idea. One studio. An entire series — cast, episodes, and a consistent world — built before you touch a timeline.

### Beat 1 — Start with your concept
- **On-screen title:** Start with your concept
- **Narration:**
  > It starts with a sentence. Describe your series or your YouTube channel, and SceneFlow turns your concept into a production-ready foundation — no prompt engineering.
- **Screen capture:** `/dashboard/series` → **New Series** → type a **Topic / Concept**, pick **Production Format**, set **Number of Episodes** → **Generate Storyline**.
- **Primary UI:** `src/app/dashboard/series/page.tsx`, `src/components/blueprint/BlueprintReimaginDialog.tsx`

### Beat 2 — Review the SceneFlow baseline
- **On-screen title:** Review the professional baseline
- **Narration:**
  > SceneFlow returns a professional baseline — scored by Audience Resonance Analysis against your target viewers. Read it, or listen to the narrated overview, then add your direction.
- **Screen capture:** Series **Overview** tab (Production Bible) with the **Audience Resonance** score strip; click the narrated-overview play button; show the listen/read toggle.
- **Primary UI:** `src/app/dashboard/series/[seriesId]/page.tsx`, `src/components/blueprint/AudienceResonancePanelV3.tsx`

### Beat 3 — Create unlimited episodes
- **On-screen title:** Create unlimited episodes
- **Narration:**
  > Need a season? Spin up an unlimited number of episodes — each one inheriting your series DNA, so the cast, tone, and world never drift.
- **Screen capture:** **Episodes** tab; add episodes; scroll the generated episode blueprints.
- **Primary UI:** `src/app/dashboard/series/[seriesId]/page.tsx`

### Beat 4 — Review the Reference Library
- **On-screen title:** One shared Reference Library
- **Narration:**
  > Every episode draws from one shared Reference Library — characters, voices, wardrobe, locations, and props — created and maintained through Production and reused across the whole series.
- **Screen capture:** Open **Series Reference Library**; pan across Cast, Locations, Props with identity images.
- **Primary UI:** `src/components/series/SeriesReferenceLibraryPanel.tsx`

### Beat 5 — Direct the Intelligent Assistant Writer
- **On-screen title:** Direct by voice or text
- **Narration:**
  > Want a change? Just say it. The Intelligent Assistant Writer reshapes your series or any episode from spoken or typed direction — professional copy, instantly, no blank page.
- **Screen capture:** Open the assistant on the series; dictate a direction (mic), show the rewrite; then a typed edit on an episode.
- **Primary UI:** `src/components/ui/DictationTextarea.tsx`, `src/components/vision/InstructionsPanel.tsx`

### Beat 6 — Start production in one click
- **On-screen title:** Start production in one click
- **Narration:**
  > When an episode is ready, start its production with a single click — and flow straight into the guided pipeline.
- **Screen capture:** Hover an episode → **Start Production**; cut to the Vision workspace loading.
- **Primary UI:** `src/components/blueprint/StartProductionDialog.tsx`

**Closing payoff (~0:46–0:50)**

> From one idea to a whole series — that's the SceneFlow pipeline.

---

## 2. Blueprint — "Your Creative DNA, Locked In"

**Video:** `BLUEPRINT.mp4` · **Target:** ~40 seconds · **Beats:** 4

**Opening hook (0:00–0:06)**

> Before a single frame renders, your story is already working — pacing, characters, and tone, approved.

### Beat 1 — Review the baseline Blueprint
- **On-screen title:** Review the baseline Blueprint
- **Narration:**
  > Blueprint is your deep film treatment — synopsis, beats, characters, tone, and style — with Audience Resonance Analysis built in. Read it, or listen to the narrated overview, and hear exactly why it lands.
- **Screen capture:** `/dashboard/studio/{projectId}` Blueprint; scroll `TreatmentCard` sections; show the resonance score; play the narrated overview.
- **Primary UI:** `src/app/dashboard/studio/[projectId]/StudioPageClient.tsx`, `src/components/blueprint/TreatmentCard.tsx`, `src/components/blueprint/AudienceResonancePanelV3.tsx`

### Beat 2 — Direct the Intelligent Assistant Writer
- **On-screen title:** Refine by voice or text
- **Narration:**
  > Shape the synopsis, beats, or characters by speaking or typing your direction. The Intelligent Assistant Writer revises the treatment instantly — no prompt engineering.
- **Screen capture:** Open **Edit Blueprint** (`BlueprintRefineDialog`); dictate/type a scoped edit; show the section updating.
- **Primary UI:** `src/components/blueprint/BlueprintRefineDialog.tsx`, `src/components/ui/DictationTextarea.tsx`

### Beat 3 — Review the Reasoning
- **On-screen title:** See the creative reasoning
- **Narration:**
  > Curious why it works? Open the Reasoning section for the creative logic behind every beat and character choice — your story, explained.
- **Screen capture:** Expand the **Reasoning** panel; scroll the explanation tied to beats/characters.
- **Primary UI:** `src/components/blueprint/TreatmentCard.tsx`

### Beat 4 — Start production when ready
- **On-screen title:** Start production when ready
- **Narration:**
  > When the story sings, start production — and the entire pipeline inherits your approved creative DNA. No drift. No guesswork.
- **Screen capture:** Click **Start Production** (`StartProductionDialog` readiness gate); cut to the Production workspace.
- **Primary UI:** `src/components/blueprint/StartProductionDialog.tsx`

**Closing payoff (~0:36–0:40)**

> Approve the story first. Then let SceneFlow build it.

---

## 3. Production — "From Script to Published Master"

**Video:** `walkthrough/Production.mp4` · **Target:** ~2:15 · **Beats:** 11

**Opening hook (0:00–0:08)**

> This is where it all comes together — script, audio, frames, and video, generated concurrently, and carried all the way to a published master. Without leaving the studio.

### Beat 1 — Review the baseline script
- **On-screen title:** Review the baseline script
- **Narration:**
  > Production opens on a professional baseline script, scored by Audience Resonance Analysis. Read it, or listen to the narrated analysis — so you know what lands before you spend a credit.
- **Screen capture:** Vision page after Start Production; script scenes populate; open **Audience** score; play narrated analysis.
- **Primary UI:** `src/app/dashboard/workflow/vision/[projectId]/page.tsx`, `src/components/vision/ScriptReviewModal.tsx`

### Beat 2 — Optimize scene by scene
- **On-screen title:** Optimize scene by scene
- **Narration:**
  > Tune the script scene by scene with the Intelligent Assistant Writer — tighten dialogue, reshape a beat, apply one-click improvements by voice or text.
- **Screen capture:** Open `SceneEditorModalV2`; dictate a revision; **Generate Preview**; before/after; **Apply**.
- **Primary UI:** `src/components/vision/SceneEditorModalV2.tsx`, `src/components/vision/OptimizeSceneDialog.tsx`

### Beat 3 — Build the Reference Library
- **On-screen title:** Build the Reference Library
- **Narration:**
  > Lock your world in the Reference Library — scripted, custom, or uploaded characters, voices, wardrobes, locations, and props. Edit a reference image directly — no slot-machine regenerations.
- **Screen capture:** `ReferenceLibraryDialog`; Cast/Locations/Props tabs; assign a voice; edit a reference image in place.
- **Primary UI:** `src/components/vision/ReferenceLibraryDialog.tsx`, `src/components/vision/CharacterLibrary.tsx`

### Beat 4 — Generate audio
- **On-screen title:** Generate audio
- **Narration:**
  > Hear it before you see it. Generate dialogue, narration, SFX, and music with Express Production across every scene, a single scene, or beat by beat — native-quality voiceover in seventy-plus languages.
- **Screen capture:** **Beats** tab → **Express Audio** → `ExpressAudioConfirmDialog` scope + credit estimate; waveforms populate.
- **Primary UI:** `src/components/vision/ExpressAudioConfirmDialog.tsx`, `src/components/vision/ScriptPanel.tsx`

### Beat 5 — Generate and edit frames
- **On-screen title:** Generate and edit frames
- **Narration:**
  > Generate beat frames with Express Production, Express Scene, or beat by beat — then edit any frame with the Intelligent Assistant Director. Just describe the change: remove the coffee mug, and it's done.
- **Screen capture:** `SceneGallery` **Express All**; frames populate locked to references; open IAD edit on a frame; type an instruction; show the result.
- **Primary UI:** `src/components/vision/SceneGallery.tsx`, `src/components/vision/SceneStoryboardFrameViewer.tsx`

### Beat 6 — Review the animatic
- **On-screen title:** Review the animatic
- **Narration:**
  > In under thirty minutes, play the full animatic — frames, dialogue, SFX, and music, synced — in the interactive Screening Room. Share a link for feedback without exporting a file.
- **Screen capture:** `ScreeningRoomV2` playing the animatic; transport + language controls; **Feedback** / share link.
- **Primary UI:** `src/components/vision/ScreeningRoomV2.tsx`, `src/components/vision/AudioGalleryPlayer.tsx`

### Beat 7 — Generate video
- **On-screen title:** Generate video
- **Narration:**
  > Turn approved frames into motion with Express Scene or beat by beat. Don't love a shot? Retake it with the Intelligent Assistant Director — no endless slot-machine loops.
- **Screen capture:** **Shoot** tab in `DirectorConsoleImpl`; generate beats with method badges; open the intelligent retake dialog; regenerate one beat.
- **Primary UI:** `src/components/vision/scene-production/DirectorConsoleImpl.tsx`, `src/components/vision/scene-production/IntelligentRetakeDialog.tsx`

### Beat 8 — Edit in the Mixer
- **On-screen title:** Edit in the Mixer
- **Narration:**
  > Finish inside the studio. In the Mixer, add captions, trim beats, balance audio, and dub — brand-safe polish without another tool.
- **Screen capture:** `SceneProductionMixer`; add a caption/overlay; trim a beat; show dubbing/language stems.
- **Primary UI:** `src/components/vision/scene-production/SceneProductionMixer.tsx`

### Beat 9 — Render and review scenes
- **On-screen title:** Render and review scenes
- **Narration:**
  > Render your scenes, then review and share them again through the Screening Room — approval locked before final assembly.
- **Screen capture:** Render a scene stream; play the rendered scene in the Screening Room; share.
- **Primary UI:** `src/components/vision/scene-production/ProductionStreamsPanel.tsx`, `src/components/vision/ScreeningRoomV2.tsx`

### Beat 10 — Generate multilanguage streams
- **On-screen title:** Generate multilanguage streams
- **Narration:**
  > One master, seventy-plus markets. Generate dubbed or lip-synced language streams from the same approved cut — without re-shooting a single frame.
- **Screen capture:** `GroupedLanguageSelector` add a language; localized audio generates; two language streams play the same scene.
- **Primary UI:** `src/components/vision/GroupedLanguageSelector.tsx`, `src/components/vision/scene-production/ProductionStreamsPanel.tsx`

### Beat 11 — Render final and publish
- **On-screen title:** Render final and publish
- **Narration:**
  > This is the finish line. Render the final master, then publish — with auto-generated thumbnails, titles, and descriptions ready for your YouTube channel. From concept to published, every step lived in SceneFlow.
- **Screen capture:** `FinalCutStreamsPanel` master render; **Publish** → `PublishingWizard` (YouTube, title, description, thumbnail); completed master preview.
- **Primary UI:** `src/components/production/ProductionRenderPanel.tsx`, `src/components/production/ProductionPublishPanel.tsx`, `src/components/premiere/PublishingWizard.tsx`

**Closing payoff (~2:05–2:15)**

> Concept to published master — one streamlined pipeline. That's SceneFlow.

---

## Production checklist

| Pillar | Video file | Poster | Beats | Target | Captured |
|--------|------------|--------|-------|--------|----------|
| Series | `Series.mp4` | `/landing/pipeline/series.png` | 6 | ~50s | ☐ |
| Blueprint | `BLUEPRINT.mp4` | `/landing/pipeline/blueprint.png` | 4 | ~40s | ☐ |
| Production | `walkthrough/Production.mp4` | `/landing/pipeline/production.png` | 11 | ~2:15 | ☐ |

Per-step screenshot placeholders (How It Works timeline) can be filled by adding `{stepId}.jpg` / `{stepId}.mp4` under `public/landing/how-it-works/` and wiring them in [`src/config/landing/guidedStepsMedia.ts`](../src/config/landing/guidedStepsMedia.ts). Step ids: `series-concept`, `series-baseline`, `series-episodes`, `series-reference-library`, `series-assistant-writer`, `series-start-production`, `blueprint-baseline`, `blueprint-assistant-writer`, `blueprint-reasoning`, `blueprint-start-production`, `production-script-ara`, `production-assistant-writer`, `production-reference-library`, `production-audio`, `production-frames`, `production-animatic`, `production-video`, `production-mixer`, `production-render-scenes`, `production-multilanguage`, `production-publish`.
