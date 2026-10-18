# Feature Room — 60-Second Overview Scripts

Production guide for the **four Key Features overview videos** on the landing page (`#key-features`): **Series Room**, **Blueprint Room**, **Production Stage**, and **Screening Room**. The media slot ids stay `series-desk`, `blueprint-board`, `production-stage`, and `screening-room`. The on-screen names are the room labels.

Each film is the looping band above that room’s feature list, played by `FeatureRoomOverview`. The slots in [`src/config/landing/featureRoomMedia.ts`](../src/config/landing/featureRoomMedia.ts) stay empty until these masters are recorded. These are not the longer pillar walkthroughs in [`HOW_IT_WORKS_VIDEO_SCRIPTS.md`](./HOW_IT_WORKS_VIDEO_SCRIPTS.md).

Copy follows the live room promises and feature titles in [`messages/en.json`](../messages/en.json) (`keyFeatures.rooms`). A single film can skip Series Room. Language count on screen and in the voiceover is **44**. 4K is a native **Veo 3.1** render.

---

## Shared production spec

| Item | Spec |
|------|------|
| Runtime | 60 seconds, including a 2-second title card and a 3-second end card |
| Frame | 1920×1080, 30fps, H.264, AAC 48 kHz |
| Loudness | Voice −16 LUFS integrated. Music bed about −22 LUFS, ducked to about −28 LUFS under the voice |
| Playback | The landing player autoplays **muted** and loops. Every beat carries a lower-third title so the film reads with the sound off |
| Narration | 125–140 spoken words, about 145 words per minute. Second person. The viewer approves; a rewrite appears only after they apply it |
| Capture | Dark theme, cursor visible, demo series already populated, no names, emails, or account data in frame. Light punch-in on the control being named |
| Open | Room name + one-line promise. No voice |
| Close | SceneFlow mark + the next room. No voice, no price |

Word counts below are whitespace-separated words, read at about 145 per minute. Numerals that must be spoken are already written out (`three point one`, `four K`, `sixteen by nine`). A hyphenated compound (`forty-four`, `lip-sync`, `Pre-Vis`, `Co-Director`) counts as one word.

---

## Narrator

One voice across all four films, so the rooms feel like one walk through the studio.

### Recommended

| Setting | Value |
|---------|-------|
| Voice ID | `gemini-Charon` |
| Catalog | Informative — measured, low, smooth, steady. The catalog describes it as delivery for explainers, documentary, and briefings ([`src/lib/tts/geminiVoiceCatalog.ts`](../src/lib/tts/geminiVoiceCatalog.ts)) |
| Pace | 145 words per minute |
| Director note | A producer walking a colleague through the studio for the first time. Unhurried. Land the approval line — “until you apply it,” “before anyone spends on pictures,” “keep building the rest” — a half-beat slower than the line before it |

### Alternate

Use `gemini-Rasalgethi` only if these films must match the older pillar videos. Do not use `gemini-Algenib`. That voice is gravelly character casting, and it is already the landing story narrator.

### ElevenLabs pass (if Gemini is not used)

| Setting | Value |
|---------|-------|
| Style | Narration / Documentary |
| Stability | 0.70 |
| Similarity | 0.80 |
| Speed | 0.94 |

Record each film as one continuous read. Do not stitch lines from separate sessions.

---

## Music score — suite “Four Rooms”

One suite, four cues. The motif is the same in every film so a viewer who switches tabs hears one piece of music.

| | |
|--|--|
| Key | D minor |
| Tempo | 92 BPM, 4/4 |
| Motif | D4–F4–A4–C5, a rising minor seventh. Felt piano. Each note a quarter note, then a half-note rest. The phrase is two bars |
| Palette | Felt piano, a soft sub pulse on beats 1 and 3, and one color layer per room. No vocals, no bright cymbals, no lead synth that fights consonants |
| Duck | Sidechain the bed under the voice. The motif may play through a title card and the end card at full bed level. Under speech it sits back |
| Loop | In the last three seconds the motif returns alone. The last note (C5) rings across the cut back to the title card, so the loop lands on beat 1 |

Room colors follow the Key Features tab gradients.

| Film | Cue title | Color layer |
|------|-----------|-------------|
| Series Room | Inherit | Indigo pad. Spacious, almost still. Motif stated in full |
| Blueprint Room | The only sheet | Same motif, light mallets an octave up. Editorial, not tense |
| Production Stage | Approve, then render | Muted electronic pulse (filtered eighth notes) under the agents. Piano returns when the Pre-Vis animatic plays |
| Screening Room | Ship the piece | Warm amber violas, no brass. The last phrase resolves D minor up to F major |

Cue sheets for each film are under that film. Times are in-point to out-point.

---

## 1. Series Room — “Inherit the world”

**Slot:** `series-desk` · **Target:** 60 seconds · **Spoken words:** 126 · **Route:** `/dashboard/series/{seriesId}`

**Promise on the title card:** Lock the franchise once. A single film can skip this room.

**Primary UI:** [`src/app/dashboard/series/[seriesId]/page.tsx`](../src/app/dashboard/series/[seriesId]/page.tsx)

### Full read

> Lock the franchise once, on Series Room. Season arcs, recurring cast, tone, and world rules live on the series, and every new episode inherits them.
>
> Open an episode. Its outline, synopsis, and story beats sync into that episode's Blueprint Room and Production Stage. Episode twelve still knows the cast, the world, and what already happened.
>
> Open Reshape with Direction. Speak or type what should change, and focus the edit on plot, characters, episode content, tone, or setting. Unrelated parts stay put until you apply it yourself.
>
> When the note is about one episode, use Direct this episode. Dictate the change and apply it there only. The rest of the season is left alone.
>
> A single film can skip Series Room and open in the Blueprint Room.

### Beat sheet

#### 0:00–0:02 — Title

- **On-screen title:** Series Room
- **Subtitle:** Lock the franchise once
- **Narration:** none
- **Picture:** Title card over a still of the series header (title, logline). Indigo grade.
- **Music:** Felt piano states the motif once. Indigo pad swells under the second bar. No pulse yet.

#### 0:02–0:13 — Season universe

- **On-screen title:** Season universe
- **Narration:**
  > Lock the franchise once, on Series Room. Season arcs, recurring cast, tone, and world rules live on the series, and every new episode inherits them.
- **Screen capture:** **Overview** tab. Hold on **Series Overview** (logline and synopsis), then pan to **Setting**. Do not open Listen.
- **Primary UI:** Overview panel in the series page.

#### 0:13–0:25 — Episode handoff

- **On-screen title:** Episode handoff
- **Narration:**
  > Open an episode. Its outline, synopsis, and story beats sync into that episode's Blueprint Room and Production Stage. Episode twelve still knows the cast, the world, and what already happened.
- **Screen capture:** **Episodes** tab. Select a later episode (label it Episode 12 in the demo data). Show **Synopsis** and **Story Beats**. Hover **Start Project** — do not click through into a loading state. Optional one-second cut of **Continue Project** only if that episode already has a Blueprint.
- **Primary UI:** Episodes panel in the series page. The button label is **Start Project**.

#### 0:25–0:38 — Reshape with Direction

- **On-screen title:** Reshape · with Direction
- **Narration:**
  > Open Reshape with Direction. Speak or type what should change, and focus the edit on plot, characters, episode content, tone, or setting. Unrelated parts stay put until you apply it yourself.
- **Screen capture:** Header button **Reshape with Direction**. Dialog title reads **Reshape · with Direction**. Type a short note (“Make the antagonist more sympathetic”). Open **Focus Area** and land on **Plot & Story Arcs**, then reveal the other options in the menu: **Characters & Relationships**, **Episode Content**, **Tone & Style**, **Setting & World**. Cursor rests on **Apply Changes**. Do not wait for the apply spinner.
- **Primary UI:** Edit Storyline dialog in the series page. The field label is **What would you like to change?** The focus control is **Focus Area**.

#### 0:38–0:50 — Direct this episode

- **On-screen title:** Direct this episode
- **Narration:**
  > When the note is about one episode, use Direct this episode. Dictate the change and apply it there only. The rest of the season is left alone.
- **Screen capture:** Back on the episode detail. The amber card is titled **Direct this episode**. Dictate or type “Raise the stakes in the climax.” Cursor on **Apply**. Cut wide enough to show the rest of the episode list unchanged.
- **Primary UI:** Episodes panel, **Direct this episode** card.

#### 0:50–0:57 — A film can skip this room

- **On-screen title:** A single film skips this room
- **Narration:**
  > A single film can skip Series Room and open in the Blueprint Room.
- **Screen capture:** Wide shot of the series, then a one-second dissolve toward the Blueprint Room title card of the next film. No new clicks.
- **Music:** Pulse drops out. Motif restated on piano.

#### 0:57–1:00 — End card

- **On-screen title:** Next: Blueprint Room
- **Narration:** none
- **Picture:** SceneFlow mark. Indigo pad decays. Last motif note rings into the loop.

### Music cue — “Inherit”

| Time | What enters or drops |
|------|----------------------|
| 0:00–0:02 | Piano motif, full level. Indigo pad fades in. Duck is off |
| 0:02–0:50 | Pad holds. Soft sub pulse on beats 1 and 3. Piano only every eight bars. Bed ducks under the voice |
| 0:50–0:57 | Pulse out. Motif in full, still under the last line, then opens as the line ends |
| 0:57–1:00 | Motif alone. Pad decays. Cut on beat 1 of the loop |

---

## 2. Blueprint Room — “Score it before pictures”

**Slot:** `blueprint-board` · **Target:** 60 seconds · **Spoken words:** 128 · **Route:** `/dashboard/studio/{projectId}`

**Promise on the title card:** A sentence becomes the treatment, and the only beat sheet.

**Primary UI:** [`src/components/blueprint/TreatmentCard.tsx`](../src/components/blueprint/TreatmentCard.tsx), [`src/components/blueprint/BlueprintRefineDialog.tsx`](../src/components/blueprint/BlueprintRefineDialog.tsx), [`src/components/blueprint/BlueprintShareViewer.tsx`](../src/components/blueprint/BlueprintShareViewer.tsx)

### Full read

> A sentence, or a full brief, becomes the treatment: motivations, characters, art direction, and the only beat sheet. Beats exist only here. Production Stage turns each beat into a chapter. It does not invent a second beat sheet.
>
> Score concept, tone, characters, and beats against the audience you named. You see the score and the recommendations, then decide what to revise, before anyone spends on pictures.
>
> Open Co-Director Blueprint. Describe the change in plain words. Preview the rewrite, keep the parts you want, and apply it without throwing away the art direction already locked in the treatment. Nothing changes until you accept it.
>
> Share a link they can read and listen to. Collaborators hear the narration and see this same board. Their notes come back as guided revision.

### Beat sheet

#### 0:00–0:02 — Title

- **On-screen title:** Blueprint Room
- **Subtitle:** Score it before pictures
- **Narration:** none
- **Picture:** Title card over the treatment hero. Violet grade.
- **Music:** Motif on piano, mallets answer an octave up on the second bar.

#### 0:02–0:18 — Treatment and beat sheet

- **On-screen title:** Treatment and beat sheet
- **Narration:**
  > A sentence, or a full brief, becomes the treatment: motivations, characters, art direction, and the only beat sheet. Beats exist only here. Production Stage turns each beat into a chapter. It does not invent a second beat sheet.
- **Screen capture:** Treatment toolbar (the document label is **Treatment**). Move through the section tabs in order: **Core**, **Story**, **Characters**, **Tone**, **Beats**. Hold on **Beats** long enough to read the beat list. Art direction is the **Tone** tab (**Tone & Style** — visual style and mood). Motivations live in **Story** and **Characters**. Do not open a second beat list anywhere else.
- **Primary UI:** `TreatmentCard` section tabs. Tab labels resolve from [`messages/app/en/blueprint.json`](../messages/app/en/blueprint.json) (`tabs`).

#### 0:18–0:30 — Audience Resonance

- **On-screen title:** Audience Resonance
- **Narration:**
  > Score concept, tone, characters, and beats against the audience you named. You see the score and the recommendations, then decide what to revise, before anyone spends on pictures.
- **Screen capture:** Side panel, **Resonance** tab. Show the score and the recommendation list. Do not auto-apply a fix. Cursor may hover **Apply top Audience Resonance fix** without clicking.
- **Primary UI:** Blueprint side panel. The analyze action is **Save audience & run Audience Resonance**.

#### 0:30–0:46 — Co-Director · Blueprint

- **On-screen title:** Co-Director · Blueprint
- **Narration:**
  > Open Co-Director Blueprint. Describe the change in plain words. Preview the rewrite, keep the parts you want, and apply it without throwing away the art direction already locked in the treatment. Nothing changes until you accept it.
- **Screen capture:** Open the refine dialog. The title is **Co-Director · Blueprint** (`assistantTitle('Blueprint')` in `BlueprintRefineDialog`). Type one plain-language note. Show the preview with the tone / art-direction section still present. Cursor on the apply control. Cut back to the board unchanged until the click, then one accepted change.
- **Primary UI:** [`BlueprintRefineDialog.tsx`](../src/components/blueprint/BlueprintRefineDialog.tsx)

#### 0:46–0:57 — Stakeholder review

- **On-screen title:** Stakeholder review
- **Narration:**
  > Share a link they can read and listen to. Collaborators hear the narration and see this same board. Their notes come back as guided revision.
- **Screen capture:** Side panel **Collaborate** tab. The control is **Share & Collaborate**. Show **Share for feedback** / **Reviewer link** (hint on screen: read, listen, and comment). Cut to the shared viewer (`BlueprintShareViewer`) on the same **Beats** section, with **Listen** available. A reviewer note is already on the board — do not type a new document.
- **Primary UI:** Collaborate side panel; [`BlueprintShareViewer.tsx`](../src/components/blueprint/BlueprintShareViewer.tsx)

#### 0:57–1:00 — End card

- **On-screen title:** Next: Production Stage
- **Narration:** none
- **Picture:** SceneFlow mark. Mallets drop out. Motif rings into the loop.

### Music cue — “The only sheet”

| Time | What enters or drops |
|------|----------------------|
| 0:00–0:02 | Piano motif. Mallets double it an octave up. Duck is off |
| 0:02–0:18 | Mallets and pad. Pulse is lighter than Series Room. Duck under the voice |
| 0:18–0:30 | Mallets thin out on the score so the numbers read. Piano motif once, quiet |
| 0:30–0:46 | Mallets return, still ducked. No new percussion |
| 0:46–0:57 | Bed opens slightly as the shared viewer plays. Duck stays on until the last word |
| 0:57–1:00 | Motif alone, mallets on the last two notes. Cut on beat 1 |

---

## 3. Production Stage — “Direct, then render”

**Slot:** `production-stage` · **Target:** 60 seconds · **Spoken words:** 131 · **Route:** `/dashboard/workflow/vision/{projectId}`

**Promise on the title card:** Write, spend, lock the references, mix, then deploy.

This room has fifteen features. The voice follows the spine. Lower-thirds name the features the line does not say.

**Primary UI:** [`src/app/dashboard/workflow/vision/[projectId]/page.tsx`](../src/app/dashboard/workflow/vision/[projectId]/page.tsx)

### Full read

> Bring your own image and video keys, at your rates. The guided studio stays. Set a credit budget, and see the overrun before the render.
>
> In Writer's Room, revise the script scene by scene, with Audience Resonance beside the page. Scene Director previews one scene. You keep the changes you want.
>
> Lock cast, wardrobe, voices, locations, and props in the Reference Library. Audio, Stills, and Video agents build from that lock. Direct Shot previews the camera, the blocking, and the references. Watch the Pre-Vis animatic, then render motion.
>
> Balance dialogue, narration, score, and effects in the Mixer, then render the scene.
>
> Language Streams, in forty-four languages, with lip-sync when you want it. Veo three point one renders the master in four K. Pin a take. Cut the trailer from this timeline.

### Beat sheet

#### 0:00–0:02 — Title

- **On-screen title:** Production Stage
- **Subtitle:** Direct, then render
- **Narration:** none
- **Picture:** Title card over the vision workspace. Emerald grade.
- **Music:** Motif on piano, one bar only. No pulse yet.

#### 0:02–0:13 — Spend

- **On-screen title:** Bring Your Own Key · Budget Manager
- **Narration:**
  > Bring your own image and video keys, at your rates. The guided studio stays. Set a credit budget, and see the overrun before the render.
- **Screen capture:** Two short cuts. First, `/dashboard/settings/byok` — card title **Bring Your Own Key (BYOK)**, keys connected, key fields masked. Second, the **Production Budget** modal opened from the script header in `ScriptPanel`. Show the project credit budget and the charges already logged, with the remaining runway visible before a render.
- **Primary UI:** [`src/app/dashboard/settings/byok/page.tsx`](../src/app/dashboard/settings/byok/page.tsx), Production Budget modal opened from [`src/components/vision/ScriptPanel.tsx`](../src/components/vision/ScriptPanel.tsx)

#### 0:13–0:24 — Script

- **On-screen title:** Writer's Room · Script Audience Resonance · Scene Director
- **Second line, smaller:** Script Director revises the whole script the same way
- **Narration:**
  > In Writer's Room, revise the script scene by scene, with Audience Resonance beside the page. Scene Director previews one scene. You keep the changes you want.
- **Screen capture:** Script page with the Audience Resonance column beside a scene. Open **Scene Director · Scene N** ([`SceneEditorModalV2.tsx`](../src/components/vision/SceneEditorModalV2.tsx)). Show the preview and the selected changes. Do not show a whole-script rewrite applying itself. A one-second insert of **Script Director** ([`DirectScriptDialog.tsx`](../src/components/vision/DirectScriptDialog.tsx)) is enough for the lower-third; do not start a second narration.
- **Primary UI:** `ScriptPanel`, `SceneEditorModalV2`, `DirectScriptDialog`

#### 0:24–0:39 — Production

- **On-screen title:** Reference Library · Production Agents · Direct Shot · Pre-Vis
- **Narration:**
  > Lock cast, wardrobe, voices, locations, and props in the Reference Library. Audio, Stills, and Video agents build from that lock. Direct Shot previews the camera, the blocking, and the references. Watch the Pre-Vis animatic, then render motion.
- **Screen capture:** Four punches, about three seconds each, then the animatic.
  1. **Reference Library** — cast, wardrobe, locations, props. Same face on two scenes.
  2. An agent run in progress (Audio, Stills, or Video) with references attached. Do not show a raw prompt box as the hero.
  3. **Direct Shot · Scene N · Shot N** ([`BeatDirectorDialog.tsx`](../src/components/vision/BeatDirectorDialog.tsx)). The preview is readable: camera, blocking, and connected cast / locations / objects. If the chips fit without crowding, flash **Camera move**, **Hold the start frame**, **Keep faces**.
  4. Pre-Vis playing: Ken Burns animatic with dialogue audible under the voice for one second, then ducked. Playback control can be the **Pre-Vis** option in [`ScreeningRoomV2.tsx`](../src/components/vision/ScreeningRoomV2.tsx).
- **Music:** Filtered eighth-note pulse from the library through Direct Shot. Piano motif returns as the animatic picture appears (about 0:35).

#### 0:39–0:45 — Mixer

- **On-screen title:** Mixer
- **Narration:**
  > Balance dialogue, narration, score, and effects in the Mixer, then render the scene.
- **Screen capture:** [`SceneProductionMixer.tsx`](../src/components/vision/scene-production/SceneProductionMixer.tsx). Four tracks visible: dialogue, narration, score, effects. Toggle one shot off, then on. Cursor toward render. Do not start a long render.
- **Primary UI:** `SceneProductionMixer`

#### 0:45–0:57 — Deploy

- **On-screen title:** Language Streams · Veo 3.1 4K · Version control · Promotion trailers
- **Second line:** 44 languages · Kling lip-sync, optional · 30–60s · 9:16
- **Narration:**
  > Language Streams, in forty-four languages, with lip-sync when you want it. Veo three point one renders the master in four K. Pin a take. Cut the trailer from this timeline.
- **Screen capture:** Montage, still inside Production Stage, ending on the rendered scene.
  1. Mixer section titled **Language Streams**. The switch label is **Kling lip-sync dubbed dialogue to video**. Toggle it on, then off, so both choices read.
  2. Resolution control with **4K (UHD)** selected. On-screen caption: **Veo 3.1 · native 4K**.
  3. Stream version list in [`ProductionStreamsPanel.tsx`](../src/components/vision/scene-production/ProductionStreamsPanel.tsx). Pin one take. A second take remains in the list.
  4. A 9:16 promo frame cut from the same timeline. Caption: **30–60s · Shorts, Reels, TikTok**.
- **Primary UI:** `SceneProductionMixer` (Language Streams, resolution), `ProductionStreamsPanel` (pin), promo trailer render

#### 0:57–1:00 — End card

- **On-screen title:** Next: Screening Room
- **Narration:** none
- **Picture:** The rendered scene holds one frame, then the SceneFlow mark. Motif alone.

### Music cue — “Approve, then render”

| Time | What enters or drops |
|------|----------------------|
| 0:00–0:02 | Piano motif, one phrase. Emerald pad, very low. Duck is off |
| 0:02–0:24 | Pad and a quiet pulse on 1 and 3. No eighth notes yet. Duck under the voice |
| 0:24–0:35 | Filtered electronic eighth notes enter under Reference Library, agents, and Direct Shot. Still ducked. No snare |
| 0:35–0:45 | Eighth notes drop to a half-time pulse. Piano motif returns as Pre-Vis plays and stays through the Mixer |
| 0:45–0:57 | Pulse thins. A single soft bell on the 4K line (one note, C5). Duck until “this timeline” |
| 0:57–1:00 | Eighth notes out. Motif alone. Cut on beat 1 |

---

## 4. Screening Room — “Ship the piece that is finished”

**Slot:** `screening-room` · **Target:** 60 seconds · **Spoken words:** 132 · **Route:** Screening Room opened from the vision workspace

**Promise on the title card:** Watch the cut, review it on one link, and publish the piece that is ready.

**Primary UI:** [`src/components/vision/AudioGalleryPlayer.tsx`](../src/components/vision/AudioGalleryPlayer.tsx), [`src/components/vision/ScreeningRoomV2.tsx`](../src/components/vision/ScreeningRoomV2.tsx), [`src/components/publishing/PublishingPackageShipTab.tsx`](../src/components/publishing/PublishingPackageShipTab.tsx), [`src/components/screening-room/ScreeningRoomPublishPanel.tsx`](../src/components/screening-room/ScreeningRoomPublishPanel.tsx)

### Full read

> One player holds every cut the Mixer rendered. Switch among Pre-Vis, a scene, a chapter, the master, and a promo. Pick a Language Stream and hear that dub, including a lip-synced version when you generated one. It is the same cut.
>
> Share one link. Reviewers watch with real playback and leave notes on the picture. You do not export a rough cut to collect feedback. The notes stay on this cut, in the player, where you can act on them.
>
> Release the piece that is finished. Publish a scene of three to five minutes, a chapter of eight to twelve, the master, or a promo. Send it to YouTube, Facebook, or TikTok, in sixteen by nine or nine by sixteen. Title, description, and privacy travel with the package. Keep building the rest.

### Beat sheet

#### 0:00–0:02 — Title

- **On-screen title:** Screening Room
- **Subtitle:** Ship the piece that is finished
- **Narration:** none
- **Picture:** Title card over the player. Amber grade.
- **Music:** Motif in the violas, piano underneath. The color is warmer than the three films before it.

#### 0:02–0:20 — One player

- **On-screen title:** One player
- **Second line:** Pre-Vis · Scene · Chapter · Master · Promo · Language Stream
- **Narration:**
  > One player holds every cut the Mixer rendered. Switch among Pre-Vis, a scene, a chapter, the master, and a promo. Pick a Language Stream and hear that dub, including a lip-synced version when you generated one. It is the same cut.
- **Screen capture:** The Screening Room player in `AudioGalleryPlayer`. The mode buttons, in order, are **Pre-Vis**, **Rough Cut**, **Scene**, **Chapter**, **Master**, **Promo**. For this beat, click **Pre-Vis**, **Scene**, **Chapter**, **Master**, then **Promo**. Leave **Rough Cut** unselected so the film matches the room promise. Then open the language control and play a non-English Language Stream, then the lip-synced version of that same scene. The picture framing stays put when the language changes.
- **Primary UI:** `AudioGalleryPlayer` (mode buttons and the promo trailer) and `ScreeningRoomV2` language select. **Master** plays the language master. **Promo** plays the 9:16 trailer.

#### 0:20–0:36 — Collaborate on the cut

- **On-screen title:** Collaborate on the cut
- **Narration:**
  > Share one link. Reviewers watch with real playback and leave notes on the picture. You do not export a rough cut to collect feedback. The notes stay on this cut, in the player, where you can act on them.
- **Screen capture:** Create or copy the screening share link. Cut to the reviewer view: playback is running, a note is pinned to a timestamp on the picture. Come back to the author’s player with that note visible. No email compose window, no downloaded file.
- **Primary UI:** Screening share flow from the vision header (`openPublishing('screening')`) and the shared player. Feedback surface: [`UnifiedPlayerFeedbackPanel.tsx`](../src/components/screening-room/UnifiedPlayerFeedbackPanel.tsx)

#### 0:36–0:57 — Release when it is ready

- **On-screen title:** Release when it is ready
- **Second line:** Scene 3–5 min · Chapter 8–12 min · Master · Promo
- **Third line:** YouTube · Facebook · TikTok · 16:9 or 9:16 · Download
- **Narration:**
  > Release the piece that is finished. Publish a scene of three to five minutes, a chapter of eight to twelve, the master, or a promo. Send it to YouTube, Facebook, or TikTok, in sixteen by nine or nine by sixteen. Title, description, and privacy travel with the package. Keep building the rest.
- **Screen capture:** [`PublishingPackageShipTab.tsx`](../src/components/publishing/PublishingPackageShipTab.tsx), opened from [`ScreeningRoomPublishPanel.tsx`](../src/components/screening-room/ScreeningRoomPublishPanel.tsx) or `PublishingManager`. The kind control cycles **Scene**, **Chapter**, **Master**, **Promo**. Destinations on screen: **YouTube**, **Facebook**, **TikTok**. Show **16:9**, then **9:16** (promo defaults to 9:16). Title, description, and privacy fields are filled. Do not complete a live upload. End on the master still in the player, with the scene list still available — the rest of the film is still in the studio.
- **Primary UI:** `PublishingPackageShipTab`. YouTube can also be the wizard in [`PublishingWizard.tsx`](../src/components/premiere/PublishingWizard.tsx); prefer the package tab so Facebook and TikTok are in the same shot.

#### 0:57–1:00 — End card

- **On-screen title:** From the idea to the master
- **Narration:** none
- **Picture:** SceneFlow mark on amber. This is the last room, so the card does not point at a fifth room. The motif resolves and the loop returns to the Screening Room title.

### Music cue — “Ship the piece”

| Time | What enters or drops |
|------|----------------------|
| 0:00–0:02 | Piano motif. Amber violas take the top note (C5). No pulse. Duck is off |
| 0:02–0:20 | Violas hold a D-minor pad. Piano every four bars. Duck under the voice |
| 0:20–0:36 | Pad stays. A quieter inner voice (viola, F and A) so the note on the picture can be read. Still ducked |
| 0:36–0:54 | Violas warm up, still under the voice. No new drums |
| 0:54–0:57 | As “Keep building the rest” ends, the harmony moves D minor to F major. Motif stated one last time, rising |
| 0:57–1:00 | F-major chord, low, then a clean release on the last frame so the loop’s title card is silent of harmony and starts the motif again on beat 1 |

---

## Capture checklist

| Film | File to deliver | Poster still | Spoken words | Runtime |
|------|-----------------|--------------|--------------|---------|
| Series Room | `series-desk` overview | Series Overview with logline | 126 | 1:00 |
| Blueprint Room | `blueprint-board` overview | Treatment, Beats tab | 128 | 1:00 |
| Production Stage | `production-stage` overview | Direct Shot preview | 131 | 1:00 |
| Screening Room | `screening-room` overview | Player on the master | 132 | 1:00 |

Record English first. The landing band is one master per room; this guide does not cover dubs.

When a master exists, point `posterUrl`, `webmUrl`, and `mp4Url` in [`featureRoomMedia.ts`](../src/config/landing/featureRoomMedia.ts) at that file. Until then the band shows **Overview coming soon**.

### On-set rules

- Browser window at 1920×1080, dark theme, 100% zoom.
- Cursor visible. Punch in on the named control, then cut. No long scrolls.
- Demo data only. Mask API keys on the BYOK screen.
- Lower-thirds use the feature titles from `keyFeatures.rooms`, including the middle dot in **Reshape · with Direction**, **Co-Director · Blueprint**, **Scene Director · Scene N**, and **Direct Shot · Scene N · Shot N**.
- Leave the last three seconds free of voice so the motif can turn the loop.
