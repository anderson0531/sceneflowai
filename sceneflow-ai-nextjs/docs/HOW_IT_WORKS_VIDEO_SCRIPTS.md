# How It Works — Per-Step Narrated Video Scripts

Production guide for the 14 guided pipeline walkthrough videos on the landing page (`#pipeline`). Each video is **30 seconds**, narrated, with synchronized screen capture of the real SceneFlow Studio UI.

**Asset convention** (wired in `src/config/landing/guidedStepsMedia.ts`):

| Asset | Path |
|-------|------|
| Video | `public/landing/how-it-works/{stepId}.mp4` |
| Poster | `public/landing/how-it-works/{stepId}.jpg` |

Uncomment `videoUrl` / `posterUrl` in `guidedStepsMedia.ts` when each MP4 is ready.

---

## Narrator voice & profile

Use one consistent narrator across all 14 videos so the pipeline feels like a single guided tour.

### Persona

| Field | Value |
|-------|-------|
| **Name** | Studio Guide (internal label only) |
| **Role** | Senior creative director welcoming a new producer to SceneFlow |
| **Tone** | Warm, confident, unhurried — expert peer, not sales pitch |
| **Pace** | 150–160 words per minute (~75 words per 30s script) |
| **Energy** | Measured enthusiasm; emphasize outcomes (“you approve,” “you control”) |

### Recommended TTS voice (Gemini)

Align with existing landing narrator patterns in `src/config/landing/roleStoryScripts.ts`:

| Setting | Value |
|---------|-------|
| **Voice ID** | `gemini-Rasalgethi` |
| **Profile** | Robust, deep, narrative-driven storyteller; cinematic gravity, unhurried, documentary-quality delivery |
| **Director note (per line)** | “Speak as a creative director walking a client through their studio for the first time — clear, reassuring, never rushed.” |

### Alternate (ElevenLabs)

If producing via ElevenLabs instead of Gemini TTS:

| Setting | Value |
|---------|-------|
| **Style** | Narration / Documentary |
| **Stability** | 0.65–0.75 |
| **Similarity** | 0.80 |
| **Speed** | 0.92–0.96 (slightly slower than default) |

### Audio & video specs

- **Duration:** 28–32 seconds (target 30s)
- **Format:** MP4, H.264, 1920×1080, 30fps
- **Audio:** AAC 48 kHz, −16 LUFS integrated loudness
- **Capture:** 1920×1080 browser window, dark UI theme, cursor visible, no personal data in frame
- **Edit:** Light zoom on key clicks; cut dead air; narration recorded first or generated from script below, then timed to capture

---

## Series pillar

### Step: `start` — Spin up a season or a single project

**On-screen title:** Spin up a season or a single project

**Narration script (~75 words):**

> Every great production starts with a clear intake. In SceneFlow, you can spin up a multi-episode series from a single concept — or open a single project and paste your script. Choose your format, set episode count, and SceneFlow builds your storyline, episode blueprints, and shared reference foundation. One studio. One pipeline. Whether you're launching a season or shipping one film, your creative DNA is structured before a single frame generates.

**Screen capture instructions:**

1. Open `/dashboard` → click **New Project** or navigate to `/dashboard/series`.
2. **Series path:** Click **New Series** → fill **Topic / Concept**, select **Production Format** (e.g. Narrative Series), set **Number of Episodes** → **Generate Storyline**.
3. Show **Series Studio** (`/dashboard/series/{seriesId}`): **Overview** tab with Production Bible, then **Episodes** tab with episode blueprints.
4. Cut to **Single project path:** `/dashboard/studio/new-project` → **Create Your Blueprint** empty state → click **Generate Blueprint** or **Import Script**.
5. Hold on **Create Blueprint** dialog with **Your Concept** textarea and format/tone settings.
6. End on dashboard **Quick Actions** showing both entry paths.

**Primary UI files:** `src/app/dashboard/series/page.tsx`, `src/app/dashboard/series/[seriesId]/page.tsx`, `src/app/dashboard/studio/[projectId]/StudioPageClient.tsx`, `src/components/blueprint/BlueprintReimaginDialog.tsx`

---

## Blueprint pillar

### Step: `blueprint` — Lock your creative DNA before a single frame renders

**On-screen title:** Lock your creative DNA before a single frame renders

**Narration script (~76 words):**

> Blueprint is where your creative DNA gets locked in. SceneFlow generates a deep film treatment — logline, characters, beats, tone, and visual style — from your concept or imported script. Review every section, run Audience Resonance against your target viewers, and refine with scoped edits before you spend a single credit. When the story sings, hit Start Production — and the entire pipeline inherits your approved vision. No drift. No guesswork.

**Screen capture instructions:**

1. Open `/dashboard/studio/{projectId}` with a completed Blueprint.
2. Show header: **Blueprint**, **Saved** status, **Audience Resonance** score strip.
3. Scroll **TreatmentCard** sections: **Core Identifying Information**, **Story Setup**, **Tone, Style, & Themes**, **Beats & Runtime**, **Characters**.
4. Open side panel → **Resonance** tab → **Analyze** (show score breakdown).
5. Click **Edit Blueprint** (`BlueprintRefineDialog`) — show scoped section edit.
6. Close dialog → click **Start Production** (`StartProductionDialog` readiness gate).
7. End on treatment hero poster image if visible.

**Primary UI files:** `src/app/dashboard/studio/[projectId]/StudioPageClient.tsx`, `src/components/blueprint/TreatmentCard.tsx`, `src/components/blueprint/AudienceResonancePanelV3.tsx`, `src/components/blueprint/StartProductionDialog.tsx`

---

## Production pillar — 12 milestones

All Production steps capture from `/dashboard/workflow/vision/{projectId}` unless noted.

---

### Step 1: `draft-script` — Generate a professional draft script

**On-screen title:** Generate a professional draft script

**Narration script (~74 words):**

> Your approved Blueprint becomes a professional screenplay — automatically. SceneFlow formats every scene with dialogue, action lines, and beat markers so downstream audio, frames, and video all follow the same script. Watch scenes populate in real time as Generation Progress tracks each batch. Expand any scene card to review Direction, Beats, Music, and Pre-Vis tabs. This isn't a rough draft — it's production-ready structure your entire studio pipeline will follow.

**Screen capture instructions:**

1. Navigate to Vision page after **Start Production** (first load triggers script generation).
2. Show floating **GenerationProgress** toast: “Generating Vision…”, “X of Y scenes completed”.
3. Expand a **SCENE** card; click **Script** workflow tab.
4. Show sub-tabs: **Direction**, **Beats**, **Music**, **Pre-Vis**, **Narration**.
5. Scroll through 2–3 populated scene cards with dialogue and action lines.
6. End on full script list with scene count visible in header.

**Primary UI files:** `src/app/dashboard/workflow/vision/[projectId]/page.tsx`, `src/components/vision/ScriptPanel.tsx`, `src/components/vision/GenerationProgress.tsx`

---

### Step 2: `audience-resonance` — Optimize with Audience Resonance Analysis

**On-screen title:** Optimize with Audience Resonance Analysis

**Narration script (~75 words):**

> Before you spend credits on generation, score your script against your target audience. Open Audience Resonance from the toolbar to see an overview, scene-by-scene breakdown, and cinematic analysis. Flag pacing drops, sharpen dialogue hooks, and apply one-click improvements scene by scene. Each scene shows its resonance score with expandable recommendations. Fix the story now — when edits are free — not after you've rendered fifty beats of video.

**Screen capture instructions:**

1. In ScriptPanel toolbar, click **Audience** button (show score badge, e.g. `85`).
2. Open **ScriptReviewModal** — tab through **Overview**, **Analysis**, **Scene Breakdown**.
3. Show per-scene **Audience Resonance: N/100** badge expanded with recommendations.
4. Click **Edit & Apply** or **Optimize Scene** on one recommendation.
5. Briefly show **OptimizeSceneDialog** with a suggested fix.
6. Close modal; show updated score badge on toolbar.

**Primary UI files:** `src/components/vision/ScriptReviewModal.tsx`, `src/components/vision/OptimizeSceneDialog.tsx`, `src/components/vision/ScriptPanel.tsx`

---

### Step 3: `set-production-budget` — Set your production budget

**On-screen title:** Set your production budget

**Narration script (~76 words):**

> Smart producers set the budget before they generate. Open the Project Cost Calculator from your script toolbar to see a full credit breakdown — script, audio, images, and video — scene by scene. Pick a preset like Short Film or Commercial, or fine-tune scope yourself. When the numbers look right, click Set as Project Budget. Every generation from here tracks against your cap, so you stay in control of spend from day one.

**Screen capture instructions:**

1. In ScriptPanel toolbar, click the **Calculator** icon.
2. Open **Project Cost Calculator** modal showing credit breakdown by category (Film, Image, Mic, Video icons).
3. Select a preset (e.g. **Short Film** or **Commercial**) — show totals updating.
4. Expand scene-level detail; show per-scene credit estimates.
5. Click **Set as Project Budget (N credits)** button.
6. Cut to dashboard **ActiveProjectCard** showing **Project Budget** used vs. budget bar.
7. End on calculator summary with total credits and USD estimate.

**Primary UI files:** `src/components/credits/ProjectCostCalculator.tsx`, `src/components/vision/ScriptPanel.tsx`, `src/lib/credits/projectCalculator.ts`, `src/app/dashboard/components/ActiveProjectCard.tsx`

---

### Step 4: `reference-library` — Generate Reference Library

**On-screen title:** Generate Reference Library

**Narration script (~74 words):**

> Consistency starts in the Reference Library. Lock every character's look, wardrobe, voice profile, location, and prop before generation begins. Open Reference from the toolbar and browse Cast, Locations, and Props tabs. Assign voices, upload identity images, or batch Express Generate missing references. Every scene downstream pulls from this shared visual DNA — so characters don't drift and worlds stay coherent across episodes and beats.

**Screen capture instructions:**

1. Click **Reference** button in ScriptPanel toolbar.
2. Open **Reference Library** dialog.
3. **Cast** tab: show character cards with identity images, **Wardrobe**, voice assignment.
4. Open **VoiceSelectionDialog** or voice picker on one character.
5. **Locations** tab: show location reference images.
6. **Props** tab: show object references.
7. Click **Express Generate** for a missing reference; show generation progress.
8. Close dialog; show **Reference** button with readiness indicator.

**Primary UI files:** `src/components/vision/ReferenceLibraryDialog.tsx`, `src/components/vision/CharacterLibrary.tsx`, `src/components/vision/LocationLibrary.tsx`

---

### Step 5: `express-audio` — Express generate production audio

**On-screen title:** Express generate production audio

**Narration script (~73 words):**

> Hear your story before you see it. Express Audio generates dialogue, narration, SFX, and music beds — timed to every beat in your script. Open the Beats tab, click Express Audio, and choose scope: missing cues only or the full soundtrack. Credit estimates appear before you confirm. Native-quality voiceover in seventy-plus languages starts here — laying the audio foundation your animatic and final video will follow.

**Screen capture instructions:**

1. Expand a scene card → **Beats** tab.
2. Click **Express Audio** button.
3. Open **ExpressAudioConfirmDialog** — show scope toggle (**missing** / **all**), per-cue checkboxes, credit estimate.
4. Confirm generation; show progress on beat audio lines.
5. Show completed audio waveforms / play buttons on dialogue and SFX cues.
6. Briefly show **SceneGallery** Express pipeline **Audio** phase badge.

**Primary UI files:** `src/components/vision/ExpressAudioConfirmDialog.tsx`, `src/components/vision/ScriptPanel.tsx`, `src/components/vision/SceneGallery.tsx`

---

### Step 6: `beat-frames` — Express generate Beat Frames

**On-screen title:** Express generate Beat Frames

**Narration script (~74 words):**

> Approve the look before SceneFlow spends credits on motion. Express Beat Frames generates start and end composition stills for every beat — locked to your Reference Library. Open Pre-Vis Studio, run Express All, and watch the pipeline move through Direction, Audio, Image Plan, and Beat Frames. Review each frame, finalize the set, and sign off on the visual story. No surprises when video generation starts.

**Screen capture instructions:**

1. Open **Pre-Vis Studio** panel (`SceneGallery`).
2. Click **Express All** → **ExpressConfirmDialog** with toggles: music, SFX, **includeEndFrames**, quality preset, credit estimate.
3. Confirm; show **ExpressBeatFrameProgressOverlay** phases: Direction → Audio → Image plan → Beat frames.
4. Open a scene **Pre-Vis** tab → `SceneStoryboardFrameViewer` with start/end frame slots.
5. Show generated frames locked to character references.
6. Click **Finalize frames (N)** button.
7. End on gallery grid of approved beat frames.

**Primary UI files:** `src/components/vision/SceneGallery.tsx`, `src/components/vision/ExpressConfirmDialog.tsx`, `src/components/vision/SceneStoryboardFrameViewer.tsx`, `src/components/vision/ExpressBeatFrameProgressOverlay.tsx`

---

### Step 7: `screening-room` — Review animatic in Screening Room

**On-screen title:** Review animatic in Screening Room

**Narration script (~75 words):**

> Your animatic is ready in under thirty minutes. Open Screening Room to play the full interactive preview — beat frames, dialogue, music, and SFX synced in real time. Share a Screening Room link for stakeholder feedback without exporting a file. When the story lands, move to Assemble for master export, or jump ahead to final motion. Review early, approve confidently, and keep everyone aligned before the shoot.

**Screen capture instructions:**

1. Toggle **Screening Room** in Vision header (embedded mode) OR navigate to `/dashboard/workflow/screening-room?projectId={id}`.
2. Show `ScreeningRoomV2` player playing the animatic.
3. Show transport controls, scene/beat navigation.
4. Tab to **Feedback** — show comment thread or share link.
5. Tab to **Assemble** — brief glimpse of `FinalCutStreamsPanel`.
6. End on full-screen animatic playback with audio audible.

**Primary UI files:** `src/app/dashboard/workflow/screening-room/page.tsx`, `src/components/screening-room/ProductionScreeningRoomShell.tsx`, `src/components/vision/ScreeningRoomV2.tsx`

---

### Step 8: `script-assistant` — Edit script scenes through intelligent assistant

**On-screen title:** Edit script scenes through intelligent assistant

**Narration script (~74 words):**

> Story changes don't mean starting over. Open the intelligent script assistant on any scene to describe what you want — tighter dialogue, a new beat, a shifted tone. SceneFlow generates a preview with before-and-after comparison so you approve exactly what changes. Dialogue, beats, music, and direction can propagate through the pipeline without rebuilding from scratch. Iterate fast, stay in control, and keep your production moving.

**Screen capture instructions:**

1. On a scene card, open overflow menu → **Edit Scene** (or click **Edit & Apply** from an Audience recommendation).
2. Open **SceneEditorModalV2** with instruction panel.
3. Type a revision prompt (e.g. “Tighten the opening dialogue”).
4. Click **Generate Preview** — show before/after comparison.
5. Toggle preservation options (dialogue, beats, music, direction).
6. Click **Apply** — show scene card updating.
7. Briefly show **SceneWorkflowCoPilotPanel** with AI Co-Pilot suggestions.

**Primary UI files:** `src/components/vision/SceneEditorModalV2.tsx`, `src/components/vision/SceneWorkflowCoPilotPanel.tsx`, `src/components/vision/OptimizeSceneDialog.tsx`

---

### Step 9: `shoot` — Generate full motion video scenes (Shoot)

**On-screen title:** Generate full motion video scenes (Shoot)

**Narration script (~73 words):**

> This is where still frames become motion. Open the Shoot tab on any scene to generate express video — four to fifteen seconds per beat, frame-anchored to your approved compositions. Each beat shows its method — image-to-video, interpolation, or text-to-video — with generation status badges. Play beats inline, review Footage, and approve before moving to the Mixer. Characters stay consistent shot to shot because every render pulls from the same references.

**Screen capture instructions:**

1. Expand scene card → click **Shoot** tab (clapperboard icon).
2. Show inner tabs: **Review**, **Video**, **Mixer**, **Streams**.
3. Scroll **Footage** section in `DirectorConsoleImpl` — beat cards with method badges (**I2V**, **INTERP**, **Rolling**, **In the Can**).
4. Click generate on one beat; show progress spinner.
5. Click **Play Beats** on a completed segment.
6. Open `VideoEditingDialogV2` briefly to show per-beat prompt and reference anchors.
7. End on a row of completed motion beats.

**Primary UI files:** `src/components/vision/ScriptPanel.tsx`, `src/components/vision/scene-production/DirectorConsoleImpl.tsx`, `src/components/vision/scene-production/VideoEditingDialogV2.tsx`

---

### Step 10: `mixer` — Fine-tune scenes in the Mixer

**On-screen title:** Fine-tune scenes in the Mixer

**Narration script (~74 words):**

> The Mixer is your finishing suite — inside the studio. Polish every scene after generation: balance audio stems, add text overlays and watermarks, trim beat timing, and choose output resolution up to 4K. Toggle beats in or out, preview the mix in real time, then Render Stream to lock your approved cut. Brand-safe finishing without exporting to another tool. Your scene is publish-ready before it leaves this panel.

**Screen capture instructions:**

1. In Shoot tab, expand **Mixer** collapsible section (`SceneProductionMixer`).
2. Show **Language Streams** chips and **Text Overlay** controls.
3. Add a sample text overlay; show preview on canvas.
4. Configure **Watermark** (text or image, anchor position).
5. Toggle beat **Include/exclude from mixer** on one beat.
6. Select output resolution: **1080p** then **4K (UHD)**.
7. Click **Render Stream** — show render options (Fast WebM / Cloud MP4).

**Primary UI files:** `src/components/vision/scene-production/SceneProductionMixer.tsx`, `src/components/vision/scene-production/DirectorConsoleImpl.tsx`

---

### Step 11: `multilanguage` — Generate multilanguage streams

**On-screen title:** Generate multilanguage streams

**Narration script (~72 words):**

> One master. Seventy-plus markets. Generate dubbed and lip-synced language streams from the same approved cut — without re-shooting a single frame. Add a language from the Mixer or Pre-Vis Studio, and SceneFlow produces localized dialogue and narration timed to your beats. Export scripts for translation, import finished copy, and manage separate animatic and video streams per locale. Global reach from one pipeline.

**Screen capture instructions:**

1. In **Pre-Vis Studio** / **SceneGallery**, open `GroupedLanguageSelector`.
2. Click **Generate language…** for a missing locale (e.g. Español).
3. Show generation progress for localized audio.
4. In **Mixer → Language Streams**, click **+ Add Language** and show flag chips.
5. Show separate stream entries in `ProductionStreamsPanel` (Animatic / Video per language).
6. Briefly show **Export Script for Translation** / **Import Translation** in scene overflow menu.
7. End on two language streams playing the same scene.

**Primary UI files:** `src/components/vision/GroupedLanguageSelector.tsx`, `src/components/vision/scene-production/SceneProductionMixer.tsx`, `src/components/vision/scene-production/ProductionStreamsPanel.tsx`

---

### Step 12: `publish` — Render final (4K) and Publish

**On-screen title:** Render final (4K) and Publish

**Narration script (~75 words):**

> This is the finish line. Open Production Render to stitch your scene streams into a master — up to 4K where your tier allows. Preview the assembled cut, then Publish to YouTube with title, description, and thumbnail — or download a distribution bundle for your other channels. From first concept to published master, every step lived inside SceneFlow. Your story is ready for the world.

**Screen capture instructions:**

1. In Vision header, click **Production Render** → open **Production Workspace** sheet.
2. Show **Production Render** tab (`FinalCutStreamsPanel`) — per-scene stream/version picks, language selector.
3. Start a master render; show progress.
4. Click **Publish** → **ProductionPublishPanel** or navigate to Screening Room **Publish** tab.
5. Open **PublishingWizard**: YouTube OAuth, title, description, privacy, thumbnail.
6. Show **Bundle** download option.
7. End on a completed 4K master playing in preview with Publish confirmation visible.

**Primary UI files:** `src/components/production/ProductionWorkspaceSheet.tsx`, `src/components/production/ProductionRenderPanel.tsx`, `src/components/production/ProductionPublishPanel.tsx`, `src/components/premiere/PublishingWizard.tsx`

---

## Production checklist

| Step ID | Video file | Poster | Script words | Captured |
|---------|------------|--------|--------------|----------|
| `start` | ☐ | ☐ | ~75 | ☐ |
| `blueprint` | ☐ | ☐ | ~76 | ☐ |
| `draft-script` | ☐ | ☐ | ~74 | ☐ |
| `audience-resonance` | ☐ | ☐ | ~75 | ☐ |
| `set-production-budget` | ☐ | ☐ | ~76 | ☐ |
| `reference-library` | ☐ | ☐ | ~74 | ☐ |
| `express-audio` | ☐ | ☐ | ~73 | ☐ |
| `beat-frames` | ☐ | ☐ | ~74 | ☐ |
| `screening-room` | ☐ | ☐ | ~75 | ☐ |
| `script-assistant` | ☐ | ☐ | ~74 | ☐ |
| `shoot` | ☐ | ☐ | ~73 | ☐ |
| `mixer` | ☐ | ☐ | ~74 | ☐ |
| `multilanguage` | ☐ | ☐ | ~72 | ☐ |
| `publish` | ☐ | ☐ | ~75 | ☐ |

After each video is exported, uncomment the matching `videoUrl` and `posterUrl` lines in `src/config/landing/guidedStepsMedia.ts` (or set them explicitly).
