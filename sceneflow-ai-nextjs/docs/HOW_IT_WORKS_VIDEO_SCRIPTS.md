# Key Features — room films and 30-second demos

Shoot script for the Key Features section. English only. One production: the cinematic drama. A face in any clip is the face in the longform master.

These are not a tutorial and not a playlist. Each room film is its own edit. Each 30-second demo can play alone. Room films use trims from the same capture session. They do not play the demos back to back.

Live copy: `src/config/landing/jsonMaintainedCopy.json` (`keyFeatures`). Edit plan: `src/config/landing/keyFeatureChapterMap.ts`.

The retired pillar films (Series ~50s, Blueprint ~40s, Production ~2:15) and the five-minute click tour are not to be shot.

---

## How to read a beat

| Field | Meaning |
|-------|---------|
| **Picture** | `Capture` (live studio), `Omni` (10-second Gemini Omni clip of the drama, no interface), or `Still` (a frame that must match a named screenshot). |
| **Narration** | Spoken. About 150 words a minute. Silence is allowed. |
| **Music** | The room bed, ducked under the voice. |

Capture rules: cut on the decision. No cursor tours, menus, spinners, arrows, lower-thirds, or “click here.” No logo, no “in this video,” no intro, no outro, no end card.

A 30-second demo uses at most two Omni clips: the open and the close.

- 0:00–0:03 — Omni or a held longform frame. One stake, or silence.
- 0:03–0:23 — one move in the studio.
- 0:23–0:30 — the longform result of that move.

If the capture is not in hand, hold the named still. It is a real screenshot, not a drawn interface.

---

## Voice

One narrator for every film. A director finishing a picture, speaking to “you.” Warm, unhurried, no sales cadence. Land the short lines and let the picture carry the rest.

Gemini voice: `gemini-Rasalgethi`. Director note: “You are in the room with the cut. You do not teach the screen.”

Pace: 150 words a minute. Do not fill every second.

## Music

No lyrics. No theme that asks to be noticed. Duck under the voice (voice near −16 LUFS, bed near −22).

| Room | Bed |
|------|-----|
| Series | Low strings, a slow pulse, almost no melody. |
| Blueprint | Quieter. A single piano figure, like someone reading. |
| Production | A muted pulse under the picture. It does not accelerate on a render. |
| Screening | Near-silence under the master. The pulse returns only on the last line. |

A 30-second demo uses a trim of its room’s bed.

## Format

1920×1080, 30fps, H.264, AAC 48 kHz. Omni clips are picture only, then cut into the edit. They are not screen recordings.

---

## Omni clips to generate

Ten-second clips of the drama. No interface, no titles, no captions. Same woman, same coat, same room across every clip.

| ID | Prompt |
|----|--------|
| `omni-door` | A woman in a dark wool coat turns in a rain-streaked doorway. The face is specific and holds. She looks back into a dim apartment. Slow push-in. No text. |
| `omni-hold` | The same woman, same coat, now seated at a kitchen table in scene-40 light. The face matches the doorway. She does not speak. A cup stays still. No text. |
| `omni-walk` | She crosses from the doorway into the kitchen in one continuous move. Face, coat, and room stay consistent. No text. |
| `omni-animatic` | The doorway shot as a locked still that eases into a slow Ken Burns drift, then the same framing becomes full motion of her turning. No text. |
| `omni-language` | The kitchen shot again. She speaks one short line. Picture identical to `omni-hold`. No subtitles burned in. |
| `omni-trailer` | Three held frames from the drama — doorway, table, a hand on the coat — cut as a vertical-feeling sequence inside a 16:9 frame, ending on her face. No titles, no logos. |

---

# Room films

## 1. Series Room — 75 seconds

**File:** `series-desk-en.mp4` · **Bed:** Series · **Handoff:** Blueprint Room

### 0:00–0:10 — The face slips

- **Picture:** Omni `omni-door`, full 10 seconds.
- **Narration (from 0:02):** Every new shot, she becomes someone else.
- **Words:** 7

### 0:10–0:28 — Lock the franchise

- **Picture:** Capture. The series overview. Season arc, recurring cast, tone, and world rules on one board. Cut when her name is on the cast, not while the page is scrolling.
- **Still if needed:** `Series overview`
- **Narration:** You lock the franchise once. The season. The cast. The tone. The rules of that world. Episode one does not open on a blank page. Neither does the last one.
- **Words:** 30

### 0:28–0:48 — Hand off the episode

- **Picture:** Capture. One episode’s outline, synopsis, and beats arriving on that episode’s board. Her name and the doorway location are already there. Cut on the match, not on a loading state.
- **Still if needed:** `Episode handoff into Blueprint and Production`
- **Narration:** Hand the next episode across, and the room already knows her. What she wants. What already happened. A single film can skip this room. A season cannot.
- **Words:** 27

### 0:48–1:08 — One episode, not the season

- **Picture:** Capture. Spoken or typed direction on one episode only: raise the stakes. A preview. The other episodes in the season do not move. She accepts. The season list is the proof, held for a beat.
- **Still if needed:** `Direct this episode`
- **Narration:** Say it, or type it. Raise the stakes on this episode alone. The rest of the season stays where you left it. Nothing changes until you accept it.
- **Words:** 28

### 1:08–1:15 — Handoff

- **Picture:** Omni `omni-walk`, first 7 seconds. Same coat, same face, into the next room of the story.
- **Narration:** The franchise is locked. Next, a sentence becomes the film.
- **Words:** 10

**Spoken total:** 102 words.

---

## 2. Blueprint Room — 75 seconds

**File:** `blueprint-board-en.mp4` · **Bed:** Blueprint · **Handoff:** Production Stage

### 0:00–0:08 — Before a frame

- **Picture:** Omni `omni-hold`, first 8 seconds. She is already the person the film will have to protect.
- **Narration:** This is her, before anyone spends on a picture.
- **Words:** 9

### 0:08–0:28 — One beat sheet

- **Picture:** Capture. A sentence on the treatment becomes motivations, characters, art direction, and the beat sheet. Hold on the beats. Do not show a second list anywhere else.
- **Still if needed:** `Treatment board`
- **Narration:** A sentence becomes the film. Who she is. Why she stays. How the rooms look. And one beat sheet. Beats live here. Later, each beat becomes a chapter. There is no second sheet.
- **Words:** 33

### 0:28–0:46 — Score it before the spend

- **Picture:** Capture. Audience Resonance scores concept, tone, characters, and beats against the audience named on the board. Recommendations appear. Nothing rewrites itself.
- **Still if needed:** `Audience Resonance scores`
- **Narration:** Score it against the audience you named. Concept. Tone. Her. The beats. You see what lands, and you decide what to revise. Picture spend waits.
- **Words:** 25

### 0:46–0:58 — The same gesture, on the board

- **Picture:** Capture. Co-Director. A short spoken or typed note. A preview of the rewrite. The art direction already on the treatment does not clear. She keeps one change and leaves the rest.
- **Still if needed:** `Co-Director · Blueprint`
- **Narration:** Tell it what to change. In words, or out loud. Keep the lines you want. The look you already locked stays.
- **Words:** 21

### 0:58–1:10 — They hear the same board

- **Picture:** Capture, then a phone. The treatment share. Narration plays. The collaborator sees the same board. A note returns on that board. The phone lights with the note. The studio stays on the desktop.
- **Still if needed:** `Share link`
- **Narration:** Send the board. They read it, and they hear it. Notes come back on the work, not as a file in some other place. You can read a new one on your phone.
- **Words:** 33

### 1:10–1:15 — Handoff

- **Picture:** Still of the beat sheet, then a one-second dip to black. No card.
- **Narration:** The beats are set. Picture starts after this.
- **Words:** 8

**Spoken total:** 129 words.

---

## 3. Production Stage — 90 seconds

**File:** `production-stage-en.mp4` · **Bed:** Production · **Handoff:** Screening Room

This film walks Spend, Script, Picture, then Deploy. It is not fifteen demos.

### 0:00–0:08 — The face, owed

- **Picture:** Omni `omni-hold`, seconds 2–10. Her face, close, unblinking.
- **Narration:** If the next scene recasts her, the film is over.
- **Words:** 10

### 0:08–0:20 — Your keys, then the plan

- **Picture:** Capture. The existing BYOK shot: provider keys connected, masked, generation still inside the same studio. Cut to the planner: stills and clips per shot, rolled up, a dated finish. No tour of settings.
- **Still if needed:** `BYOK keys`, then `Production Planner`
- **Narration:** Your keys. Your rates. The studio stays. Before a shot is spent, you can see the day it finishes.
- **Words:** 19

### 0:20–0:32 — The page, then the read

- **Picture:** Capture. The shot-by-shot page, dialogue beside it. Cut to the script resonance report: a score, a scene note. She does not apply it yet.
- **Still if needed:** `Script`, then `Script report`
- **Narration:** The page is written before a clip is spent. A test audience reads it and leaves notes. Nothing moves until you say so.
- **Words:** 23

### 0:32–0:42 — One scene

- **Picture:** Capture. Scene Director on a single scene: preview, she keeps one change, the other scenes stay. One cut, two seconds, to the same gesture on the full draft. She accepts.
- **Still if needed:** `Scene Director`
- **Narration:** Direct the scene the note was about. Preview it. Keep what you want. The rest of the script stays.
- **Words:** 19

### 0:42–0:54 — Same face

- **Picture:** Capture. Reference Library: her face, the coat, the kitchen, the voice, locked to the art direction. Cut to Omni `omni-door` for two seconds and `omni-hold` for two seconds, no interface, as the proof.
- **Still if needed:** `Reference Library`
- **Narration:** Lock her. The coat. The room. The voice. Scene forty does not get a new lead.
- **Words:** 16

### 0:54–1:04 — See it before you move it

- **Picture:** Capture. The animatic: approved stills, her line, a low score. Then Omni `omni-animatic` for the last three seconds, the still becoming motion.
- **Still if needed:** `Animatic player`
- **Narration:** Watch the pre-vis before anyone renders motion. If the turn is wrong, change the shot. Then spend.
- **Words:** 18

### 1:04–1:12 — The shot you meant

- **Picture:** Capture. An agent run already in motion, not a spinner. Cut to Direct Shot: plain words, a preview that names the camera and her look, references still attached. Both the still and the clip carry that direction.
- **Still if needed:** `Agent run`, then `Direct Shot with camera and references`
- **Narration:** You direct the shot. The agents build it. You approve what plays.
- **Words:** 12

### 1:12–1:18 — Finish the scene

- **Picture:** Capture. The Mixer. Dialogue against score. One shot dropped. The scene plays with its sound.
- **Still if needed:** `Mixer`
- **Narration:** Balance her voice against the room. Drop the shot that does not belong.
- **Words:** 13

### 1:18–1:26 — Same cut, then the trailer

- **Picture:** Capture, fast and already resolved. A language version of this scene. One shot on lip-sync. Native 4K, not an upscale. An older take still in the list. The trailer pulling beats off this timeline. No date, no model tour.
- **Stills if needed:** `Language Streams with per-shot Double, Lip-sync, and Regenerate`; `Veo 3.1 4K delivery settings`; `Version list`; `Trailer cut`
- **Narration:** Another language is this cut, not a second film. The master is native 4K. Old takes stay. The trailer comes off this timeline.
- **Words:** 23

### 1:26–1:30 — Handoff

- **Picture:** Omni `omni-trailer`, last 4 seconds. Her face. No title.
- **Narration:** Now you watch it as a piece.
- **Words:** 7

**Spoken total:** 160 words. If a read runs long, shorten Deploy before any other line. The opening face line stays.

---

## 4. Screening Room — 60 seconds

**File:** `screening-room-en.mp4` · **Bed:** Screening · **Handoff:** Watch the longform

Do not re-teach the player. Show that one surface holds the work.

### 0:00–0:12 — The piece

- **Picture:** Omni `omni-walk`, full, played as the master. No chrome until the cut.
- **Narration:** None.
- **Words:** 0

### 0:12–0:28 — One player

- **Picture:** Capture. The same doorway shot inside the player. Switch once: Pre-Vis, then the scene, then the master. The face does not change. A language switch: the picture holds, the voice changes. No menu tour.
- **Still if needed:** `Screening Room player`
- **Narration:** One player. The pre-vis. The scene. The master. The trailer. Switch the language and you are still on the cut the Mixer rendered.
- **Words:** 24

### 0:28–0:44 — A note on the picture

- **Picture:** Capture. One shared link. A reviewer watches real playback and leaves a note on the frame, not in an email. The phone shows the note. The studio stays on the desktop.
- **Still if needed:** `Shared review`
- **Narration:** Send one link. They watch the picture and write on the picture. You read it on your phone. You do not mail a rough cut around.
- **Words:** 26

### 0:44–0:55 — Ship the piece that is done

- **Picture:** Capture. A finished scene, a few minutes, ready to leave: title and description with it. The rest of the film is still on the board behind it, unfinished, and that is fine. Do not show a settings maze.
- **Still if needed:** `Publish package`
- **Narration:** When a scene is ready, let it go. A chapter. The master. The promo. Keep building what is not ready yet.
- **Words:** 21

### 0:55–1:00 — Watch the longform

- **Picture:** Omni `omni-door`, the turn, five seconds. The bed returns under the last line only.
- **Narration:** Watch the longform.
- **Words:** 3

**Spoken total:** 74 words.

---

# 30-second demos

Each demo stands alone. Shared gestures do not get a second film.

## Series

### Season universe — `seasonUniverse` — 30s

- **0:00–0:03 Picture:** Omni `omni-door`, the turn. **Narration:** She cannot change faces at the hour mark. **Words:** 8
- **0:03–0:23 Picture:** Capture. Series overview filling in: season, cast, tone, world. Cut when her row locks. **Still:** `Series overview`. **Narration:** You define the franchise once. Season, cast, tone, and the rules of the world live on the series. Every new episode inherits them. A film with no season can skip this room. **Words:** 32
- **0:23–0:30 Picture:** Omni `omni-hold`. Same face, later light. **Narration:** Episode twelve still knows who she is. **Words:** 7
- **Bed:** Series. **Spoken:** 47

### Episode handoff — `episodeHandoff` — 30s

- **0:00–0:03 Picture:** Omni `omni-walk`, first 3 seconds. **Narration:** None.
- **0:03–0:23 Picture:** Capture. This episode’s outline, synopsis, and beats landing on its own board, her name already present. **Still:** `Episode handoff into Blueprint and Production`. **Narration:** This episode does not start from nothing. The outline, the beats, and what already happened move with her into the work. **Words:** 21
- **0:23–0:30 Picture:** Omni `omni-hold`. **Narration:** She remembers the doorway. So does the film. **Words:** 8
- **Bed:** Series. **Spoken:** 29

### Reshape — `reshapeSeries` — also plays for Direct this episode — 30s

- **0:00–0:03 Picture:** Omni `omni-door`. **Narration:** The season is right. This hour is soft. **Words:** 8
- **0:03–0:23 Picture:** Capture. Direction, spoken or typed, on one episode: raise the stakes. Optional focus on that episode only. Preview. The other episodes do not change. She accepts. **Still:** `Reshape dialog`, then `Direct this episode`. **Narration:** Say it, or type it. Raise the stakes here, and nowhere else. You see the revision. Unrelated hours stay put. It applies when you accept it. **Words:** 26
- **0:23–0:30 Picture:** Omni `omni-walk`, she commits to the turn. **Narration:** One episode changes. The season holds. **Words:** 6
- **Bed:** Series. **Spoken:** 40

## Blueprint

### Treatment and beat sheet — `treatment` — 30s

- **0:00–0:03 Picture:** Still of a single sentence on a dark card, then it is gone. **Narration:** One sentence. **Words:** 2
- **0:03–0:23 Picture:** Capture. That sentence becomes motivations, characters, art direction, and the only beat sheet. Hold on the beats. **Still:** `Treatment board`. **Narration:** It becomes the treatment. Who she is, how the rooms look, and one beat sheet. Beats exist only here. Each one will become a chapter. Not a second list. **Words:** 29
- **0:23–0:30 Picture:** Omni `omni-hold`, silent. **Narration:** The film is decided before the picture. **Words:** 7
- **Bed:** Blueprint. **Spoken:** 38

### Audience Resonance — `blueprintResonance` — 30s

- **0:00–0:03 Picture:** Omni `omni-hold`, her eyes. **Narration:** Will they stay with her? **Words:** 5
- **0:03–0:23 Picture:** Capture. Scores for concept, tone, characters, and beats, against the audience named on the board. Recommendations sit there. No automatic rewrite. **Still:** `Audience Resonance scores`. **Narration:** Score the board before anyone spends on pictures. You see the score. You see the notes. You choose what to revise. **Words:** 21
- **0:23–0:30 Picture:** The score, held, then Omni `omni-door` for the last two seconds. **Narration:** Picture spend waits on you. **Words:** 5
- **Bed:** Blueprint. **Spoken:** 31

### Stakeholder review — `stakeholderReview` — 30s

- **0:00–0:03 Picture:** A phone, dark, then the treatment narration begins under the Omni doorway, picture only. **Narration:** They should hear it, not just read it. **Words:** 8
- **0:03–0:23 Picture:** Capture. The share link. Same board. Narration playing. A note returns on the board. The phone shows that note. **Still:** `Share link`. **Narration:** Share the treatment. They hear the narration and see the board you see. Notes come back on the work. A new one reaches your phone. **Words:** 25
- **0:23–0:30 Picture:** The note, held on the board. **Narration:** Not a document in another tool. **Words:** 6
- **Bed:** Blueprint. **Spoken:** 39

Co-Director has no demo. The Series reshape demo is the gesture. The Blueprint room film carries the one line about keeping locked art.

## Production

### Spend — `byok` — also plays for Production Planner — 30s

Recut the existing BYOK capture. Do not frame it as a setup tutorial. Add the planner in the same thirty seconds.

- **0:00–0:03 Picture:** The planner’s finish date, a still, no chrome tour. **Narration:** You should know the cost before the first shot. **Words:** 9
- **0:03–0:16 Picture:** Capture, existing BYOK film, tightened. Keys connected. Masked. The studio — the same production — still around them. **Still:** `BYOK keys`. **Narration:** Connect your own keys. Generation runs on your account, at your rates. The studio does not go away. **Words:** 18
- **0:16–0:23 Picture:** Capture. Planner: iterations per shot, rolled up, a start date, cumulative credits. **Still:** `Production Planner`. **Narration:** Set what each shot may cost. The schedule tells you when it finishes. **Words:** 13
- **0:23–0:30 Picture:** The finish date, held. No Omni. This one is trust, not story. **Narration:** Then you spend. **Words:** 3
- **Bed:** Production, quieter than the other production demos. **Spoken:** 43

### Script — `writersRoom` — 30s

- **0:00–0:03 Picture:** Omni `omni-door`, silent.
- **0:03–0:23 Picture:** Capture. The shot-by-shot page and her dialogue. Direction and stills are simply present beside the page, not introduced. **Still:** `Script`. **Narration:** Write the scene and the shots before a clip is spent. Her lines are on the page. You can hear the scene in your head before you pay to see it. **Words:** 31
- **0:23–0:30 Picture:** The page, held on her line. **Narration:** The picture can wait. **Words:** 4
- **Bed:** Production. **Spoken:** 35

### Script Audience Resonance — `scriptResonance` — 30s

- **0:00–0:03 Picture:** The page, a still. **Narration:** The page can still be wrong. **Words:** 6
- **0:03–0:23 Picture:** Capture. The script report: overview, a section score, a note on one scene. She does not apply it. **Still:** `Script report`. **Narration:** A test audience reads the script. Scores. Scene notes. Recommendations. Nothing is rewritten until you open it and apply it yourself. **Words:** 21
- **0:23–0:30 Picture:** The scene note, held. **Narration:** You choose. **Words:** 2
- **Bed:** Production. **Spoken:** 29

### Direct a scene — `sceneDirector` — also plays for Script Director — 30s

- **0:00–0:03 Picture:** Omni `omni-hold`, she looks away. **Narration:** This scene is where they lose her. **Words:** 7
- **0:03–0:20 Picture:** Capture. Scene Director on that scene. Preview. She keeps one change. Neighboring scenes do not move. **Still:** `Scene Director`. **Narration:** Direct that scene. Preview the change. Keep what belongs. The rest of the script stays. **Words:** 15
- **0:20–0:23 Picture:** A brief cut to Script Director, the same preview on the full draft, only long enough to see it is the whole film. **Still:** `Script Director`. **Narration:** When the note is about the film, direct the film. **Words:** 10
- **0:23–0:30 Picture:** Omni `omni-walk`, she turns back. **Narration:** You accept it, or you don’t. **Words:** 6
- **Bed:** Production. **Spoken:** 38

### Reference Library — `referenceLibrary` — 30s

- **0:00–0:03 Picture:** Omni `omni-door`. **Narration:** Every new shot, she becomes someone else. **Words:** 7
- **0:03–0:23 Picture:** Capture. Her face, coat, voice, and the kitchen locked in the library, tied to the art direction. Cut to a later still that uses that lock. **Still:** `Reference Library`. **Narration:** Lock the cast, the wardrobe, the voice, the room. Every still and every clip has to ask for her. A later scene does not get to recast the lead. **Words:** 29
- **0:23–0:30 Picture:** Omni `omni-hold`. Match the face to the open. **Narration:** Scene one. Scene forty. Same person. **Words:** 6
- **Bed:** Production. **Spoken:** 42

### Pre-Vis before motion — `preVis` — 30s

- **0:00–0:03 Picture:** A locked still of the doorway. **Narration:** Do not move her yet. **Words:** 5
- **0:03–0:23 Picture:** Capture. The animatic: that still, her line, score, a sound of rain. She watches. If you show a change, it is one plain-language note on the shot, then back to the animatic. Do not render motion in this demo. **Still:** `Animatic player`. **Narration:** Play the scene from the stills. Dialogue, score, and the rain. If the turn is wrong, change the shot. Motion comes after you believe it. **Words:** 25
- **0:23–0:30 Picture:** Omni `omni-animatic`, the still releasing into motion. **Narration:** Then you spend. **Words:** 3
- **Bed:** Production. **Spoken:** 33

### Mixer — `mixer` — 30s

- **0:00–0:03 Picture:** Omni `omni-hold`, her mouth, the line just ending, sound a little too thin. **Narration:** The line is right. The room is loud. **Words:** 8
- **0:03–0:23 Picture:** Capture. Mixer. Her dialogue lifted against the score. One shot removed. The scene plays back with the sound in place. **Still:** `Mixer`. **Narration:** Balance her voice, the score, the rain. Drop the shot that breaks the turn. What you render here is what the Screening Room will play. **Words:** 25
- **0:23–0:30 Picture:** The mixed scene, full frame, picture and sound, no chrome. **Narration:** The scene is finished. **Words:** 4
- **Bed:** Production, falling toward the Screening silence in the last three seconds. **Spoken:** 37

---

# Inside the room films only

These have no 30-second file. Do not schedule them as separate demos.

| Beat | Where it is spoken |
|------|--------------------|
| Co-Director · Blueprint | Blueprint room film, 0:46. Same gesture as Reshape. |
| Production Agents | Production room film, 1:04. |
| Direct Shot | Production room film, 1:04. |
| Language Streams | Production room film, 1:18. |
| Delivery resolution | Production room film, 1:18. Native 4K. Do not say the Omni date. |
| Version control | Production room film, 1:18. Old takes stay. |
| Promotion trailers | Production room film, 1:18. Same timeline. |
| One player | Screening room film, 0:12. |
| Collaborate on the cut | Screening room film, 0:28. |
| Release when it is ready | Screening room film, 0:44. |

Language is proved on the longform, in the Screening Room, by switching the voice. Do not dub these 30-second demos. Dub the four room films only after the English cuts are right.

---

# Checklist

| Film | File | Length | Bed |
|------|------|--------|-----|
| Series room | `series-desk-en.mp4` | 75s | Series |
| Blueprint room | `blueprint-board-en.mp4` | 75s | Blueprint |
| Production room | `production-stage-en.mp4` | 90s | Production |
| Screening room | `screening-room-en.mp4` | 60s | Screening |
| Season universe | feature demo `seasonUniverse` | 30s | Series |
| Episode handoff | feature demo `episodeHandoff` | 30s | Series |
| Reshape | feature demo `reshapeSeries` (also Direct this episode) | 30s | Series |
| Treatment | feature demo `treatment` | 30s | Blueprint |
| Audience Resonance | feature demo `blueprintResonance` | 30s | Blueprint |
| Stakeholder review | feature demo `stakeholderReview` | 30s | Blueprint |
| Spend | feature demo `byok` (also Production Planner; recut the existing BYOK capture) | 30s | Production |
| Script | feature demo `writersRoom` | 30s | Production |
| Script Audience Resonance | feature demo `scriptResonance` | 30s | Production |
| Direct a scene | feature demo `sceneDirector` (also Script Director) | 30s | Production |
| Reference Library | feature demo `referenceLibrary` | 30s | Production |
| Pre-Vis | feature demo `preVis` | 30s | Production |
| Mixer | feature demo `mixer` | 30s | Production |

Cold open on the landing room band: the first 8 seconds of that room’s film, muted, looped, until the visitor plays the film with sound.
