# Production Examples Landing Section & Nov. 3, 2026 Rollout Plan

| Property | Value |
|----------|-------|
| **Project** | SceneFlow AI — Long-Form Production Examples & Startup Program Proof |
| **Version** | 4.0.0 |
| **Date** | October 28, 2026 |
| **Status** | Active — Optimized Series Synopses, Cast & Episode 1 / Chapter 1 Proof Shipped; GCP Restoration Scheduled for Nov. 3, 2026 |
| **URL** | https://sceneflowai.studio/#production-examples |

---

## Table of Contents

1. [Strategic Context: Why the Examples Are the Deal-Makers](#1-strategic-context-why-the-examples-are-the-deal-makers)
2. [Review & Optimization of the 4 Flagship Long-Form Examples](#2-review--optimization-of-the-4-flagship-long-form-examples)
   - [Example 1 — Cinematic Drama: *The White City Current*](#21-example-1--cinematic-drama-the-white-city-current-drama)
   - [Example 2 — Animated Series: *Hart House*](#22-example-2--animated-series-hart-house-animation)
   - [Example 3 — Historical Documentary: *The Long Thought*](#23-example-3--historical-documentary-the-long-thought-documentary)
   - [Example 4 — Instructional Curriculum: *Five Plates*](#24-example-4--instructional-curriculum-five-plates-training)
3. [Pre-Credit Budget Strategy: Chapter 1 First, Full Masters Post-Credits](#3-pre-credit-budget-strategy-chapter-1-first-full-masters-post-credits)
4. [Updated Plan of Action from Nov. 3, 2026 (GCP Back-Bill Payment & Service Restoration)](#4-updated-plan-of-action-from-nov-3-2026-gcp-back-bill-payment--service-restoration)
5. [Key Codebase Files](#5-key-codebase-files)
6. [Version History](#6-version-history)

---

## 1. Strategic Context: Why the Examples Are the Deal-Makers

Most generative video platforms (Runway, Pika, Sora, Luma, CapCut, InVideo) remain trapped in **10-second isolated clips** or **short-form social templates**, while enterprise avatar tools (Synthesia, HeyGen) are limited to static talking heads over slides.

SceneFlow AI positions itself as a **long-form professional video studio** (`Series Room → Blueprint Room → Production Stage → Screening Room`) capable of holding character identity, wardrobe, set geometry, period accuracy, and multi-language vocal sync across **15-to-45-minute episodes** and **multi-episode seasons**.

Because reviewers for **Google for Startups Cloud Program**, **NVIDIA Inception**, and **Seed Investors** evaluate live product proof before approving high-tier credits or capital, the four examples on `#production-examples` are the primary technical and commercial deal-breakers:

| Evaluator | What They Look For in `#production-examples` | Proof Delivered by the 4 Examples |
|-----------|----------------------------------------------|-----------------------------------|
| **Google for Startups** ($2K Start → $100K–$250K Partner / AI-First Track) | Deep, non-trivial orchestration of **Vertex AI Gemini** (Series Bible, Blueprint, Audience Resonance), **Imagen 4 / Gemini Pro Image** (Reference Library & Beat Frames), **Veo 3.1 + EXT** (continuous dialogue/motion), **Cloud Run** (FFmpeg stream assembly), and **GCS**. | Every card exposes four live review doors (**Series Room**, **Blueprint Room**, **Production Stage**, **Screening Room**) demonstrating full-stack Google Cloud consumption per production. |
| **NVIDIA Inception Program** | Multi-modal temporal/spatial consistency, multi-reference conditioning, 4K upscale pipeline, neural lip-sync, and compute-intensive long-form rendering workflows. | Character turnaround locks, era-specific visual guardrails (1956 16mm vs. 1980s CRT vs. 4K), 2D flat-cel style locking, and multi-angle 3-camera instructional continuity. |
| **Seed Investors** ($1.5M Seed Round) | TAM expansion beyond hobbyist clips into four high-ARPU verticals: **Prestige Entertainment**, **Serialized Animation**, **Non-Fiction / Documentary**, and **Enterprise / EdTech Curriculum**—backed by predictable unit economics. | Four complete vertical archetypes with transparent Series Synopses, Locked Casts, Episode 1 + Chapter 1 Synopses, and 4-language global distribution (`EN`, `ES`, `ZH`, `AR`). |

---

## 2. Review & Optimization of the 4 Flagship Long-Form Examples

### Summary of Optimizations Implemented

1. **Unified Series-to-Episode Hierarchy:** Previously, *The White City Current* was framed only as an 8-beat pilot without an overarching multi-episode Series Synopsis, while *Hart House*, *The Long Thought*, and *Five Plates* lacked structured Cast rosters and dedicated Episode 1 + Chapter 1 production synopses. All four examples in [`src/config/landing/exampleSeriesInputs.ts`](src/config/landing/exampleSeriesInputs.ts) and [`src/components/landing/SeriesInputPanel.tsx`](src/components/landing/SeriesInputPanel.tsx) now include:
   - **Series Synopsis (`seriesSynopsis`)** & **Visual Bible (`artLock`)**
   - **Locked Cast & Principal Continuity Roster (`cast`)** with character roles, ages, wardrobe, and lighting/style anchors
   - **Featured Example — Episode 1 Synopsis (`episode1Synopsis`)** plus a highlighted **Chapter 1 Production Proof** callout (`chapter1Title`, `chapter1Duration`, `chapter1Synopsis`)
   - **Full Episode / Chapter Breakdown (`episodes`)**
2. **Upgraded Review Stage (`PipelinePlaceholderStage.tsx`):** Opening any review milestone door (`Series Room`, `Blueprint Room`, `Production Stage`, `Screening Room`) on examples whose database share is still being rendered now displays the complete Series Synopsis, Locked Cast, and Episode 1 / Chapter 1 Synopsis rather than a bare stub.

---

### 2.1 Example 1 — Cinematic Drama: *The White City Current* (`drama`)

- **Format:** 6-Episode Prestige Series · Episode 1 Pilot (8 Chapters)
- **Genre:** Sci-Fi Infrastructure Thriller
- **Art Style:** Anamorphic Photorealism · Tungsten, Sub-Zero Slate & Violet-Teal Induction Glow
- **Duration:** 265 min Series (6 × 42–48 min) · Episode 1: 42.5 min (Chapter 1 Proof: 6 min)
- **Logline:** *“When a disgraced reporter breaches the subterranean bunker of an isolated infrastructure archivist to activate an 1893 atmospheric energy artifact, the pair must survive an elite strike team led by the corporate risk operative who murdered his wife—culminating in a choice between self-preservation and liberating humanity from artificial scarcity.”*

#### Series Synopsis
Set beneath a climate-battered American Midwest where private utility conglomerate Vane-Calhoun Energy weaponizes rolling winter blackouts to extract municipal concessions, *The White City Current* spans six 45-minute episodes. Former municipal archivist Gideon Croft and blacklisted investigative journalist Piper Hayes uncover a suppressed 1893 Columbian Exposition resonant-induction network engineered by Gideon’s late wife, Dr. Clara Vance-Croft. Across Season 1, lighting the Chicago Two-Mile Crib in Episode 1 triggers a high-stakes war across historic subterranean infrastructure corridors—from Detroit’s salt-mine substations to Niagara’s decommissioned wheel-pits—pitting public-grid liberation against Senior Risk Director Julian Ward’s private containment directorate.

#### Locked Cast & Continuity Profiles (4)
1. **Gideon Croft** (*Protagonist · Locked Character Sheet*) — Former Municipal Infrastructure Archivist (54). Weathered charcoal wool archivist smock, wire-rimmed spectacles, salt-and-pepper beard, calloused draftsman hands; lit by warm 3200K tungsten against cold tunnel slate.
2. **Piper Hayes** (*Co-Lead · Locked Character Sheet*) — Blacklisted Investigative Energy Reporter (31). Snow-dusted olive field parka, canvas satchel with encrypted drive and brass cipher cylinder, sharp kinetic intensity under violet-teal induction spill.
3. **Julian Ward** (*Primary Antagonist · Locked Character Sheet*) — Senior Director of Corporate Risk, Vane-Calhoun Energy (46). Tailored matte-black tactical overcoat, bone-conduction comms, surgical calm; framed with sterile high-contrast institutional lighting.
4. **Dr. Clara Vance-Croft** (*Archival & Memory Anchor · Locked Character Sheet*) — Late Resonance Physicist (48). Slate lab coat, copper-wound 1893 calibration rig, warm amber flashback plates and holographic schematic reflections.

#### Example [Episode 1] Synopsis — *Episode 1: The Faraday Protocol* (42.5 min · 8 Chapters)
During a lethal polar vortex engineered by Vane-Calhoun Energy to bankrupt Chicago’s South Side wards, Piper Hayes breaches Gideon Croft’s 1906 freight-tunnel bunker with the missing cryptographic key to his murdered wife Clara’s 1893 resonant induction manifold. Awakening the prototype alerts Julian Ward’s sanitization unit, forcing Gideon and a wounded Piper out of hiding and through steam sluices, an Adams Street pneumatic mail station, and a collapsing 1890s sub-lacustrine intake tunnel to couple the manifold to the offshore Two-Mile Crib.
- **Chapter 1 (Beat 1) Proof — *Subterranean Isolation* (6 min):** Forty feet beneath freezing Chicago, Gideon Croft’s chalk-covered vault hums under stolen municipal current while radio dispatches count South Side blackout casualties. Piper Hayes bypasses his perimeter tripwires carrying Clara’s brass cipher and Vane-Calhoun’s load-shedding orders—forcing Gideon to confront the proof that Clara’s death was a corporate assassination.

---

### 2.2 Example 2 — Animated Series: *Hart House* (`animation`)

- **Format:** Animated Sitcom · 5-Episode Season
- **Genre:** Multi-Generational Family Comedy
- **Art Style:** 2D Flat-Cel Animation · Bold Ink Outlines & Warm Suburban Palette
- **Duration:** 110 min Season (5 × 22 min) · Episode 1: 22 min (Chapter 1 Proof: 5.5 min)
- **Logline:** *“In Millwick, the Harts turn a household argument into the week’s joke, and the joke into the reason they still live under one roof.”*

#### Series Synopsis
Set in the civic-ordinance-obsessed town of Millwick, *Hart House* is a five-episode, 22-minute 2D animated family sitcom built to prove zero off-model drift across an entire broadcast season. Municipal clerk Ruth Hart and night-shift transit mechanic Ellis Hart share a cramped craftsman house with sixteen-year-old debate captain June, nine-year-old fact-collector Milo, and Ruth’s mother Nana Inez, whose “temporary” enclosed side porch has quietly become the emotional center of the home. Every episode turns a small municipal headache into rapid-fire ensemble comedy while keeping identical line weights, warm cel-shaded palettes, and multi-angle character sheets locked from Episode 1 through the Episode 5 household vote.

#### Locked Cast & Continuity Profiles (5)
1. **Ruth Hart** (*Matriarch · Locked 2D Character Sheet*) — Millwick Municipal Clerk (42). Terracotta knit cardigan, tortoiseshell glasses, color-coded wall calendar; deadpan vocal timing and expressive eyebrow arcs.
2. **Ellis Hart** (*Patriarch · Locked 2D Character Sheet*) — Night-Shift Municipal Bus Mechanic (44). Navy shop coveralls, steel thermos, optimistic garage inventor who solves 5-minute chores with 40-pound contraptions.
3. **June Hart** (*Daughter · Locked 2D Character Sheet*) — High School Debate Captain (16). Mustard hoodie over pleated skirt, annotated town charter in hand; treats every dinner-table rule like a Supreme Court oral argument.
4. **Milo Hart** (*Son · Locked 2D Character Sheet*) — Household Archivist & Label-Maker Enthusiast (9). Striped rugby shirt, untied high-tops, industrial label gun; delivers devastatingly literal truths on the comedic beat.
5. **Nana Inez** (*Grandmother · Locked 2D Character Sheet*) — Side-Porch Sovereign & Retired Seamstress (71). Embroidered indigo shawl, silver chignon, wicker throne; remembers every zoning variance on the block since 1984.

#### Example [Episode 1] Synopsis — *Episode 1: The Sorting Rule* (22 min · 4 Chapters)
When Millwick enacts Ordinance 412—requiring twelve color-coded curb bins by Thursday morning—Ruth wants quiet compliance so her coworkers at Town Hall cannot gossip, June drafts a constitutional challenge for the council mic, and Ellis constructs a pulley-driven sorting machine in the garage. The machine triumphs on glass bottles before devouring the family’s unlabeled storage boxes, culminating in a living-room standoff when Milo prints a tag reading “Nana’s Temporary Porch Things” and the family must admit nobody knows what “temporary” means.
- **Chapter 1 (Cold Open & Act I) Proof — *Twelve Bins by Thursday* (5.5 min):** At 6:15 a.m. in the locked Hart kitchen, Ruth unveils the town’s twelve-category sorting chart while Ellis returns from night shift with a salvaged bus-door motor. Across fast-cut flat-cel reaction shots, Milo begins labeling household furniture and Nana Inez declares the side porch exempt from municipal jurisdiction.

---

### 2.3 Example 3 — Historical Documentary: *The Long Thought* (`documentary`)

- **Format:** Historical Documentary · 5-Part Series
- **Genre:** Global History of Science & Technology
- **Art Style:** Era-Accurate Archival Realism (1950s 16mm Grain → 1980s CRT → Modern 4K)
- **Duration:** 200 min Series (5 × 40 min) · Episode 1: 40 min (Chapter 1 Proof: 6 min)
- **Logline:** *“A five-part documentary follows intelligence — built, borrowed, and still unfinished — from the first useful machines to the question of a system smarter than its makers.”*

#### Series Synopsis
Spanning seventy years and twelve cities across five continents, *The Long Thought* is a five-part, 200-minute documentary series tracing humanity’s attempt to externalize reasoning—from 1956 relay rooms in Manchester and Tokyo to contemporary foundation-model infrastructure and the governance horizon of superintelligence. Anchored by recurring on-camera witnesses Dr. Amira Hassan (Cairo/London) and Kenji Sato (Osaka/Tokyo), SceneFlow’s Historical Style Guardrails lock period-authentic lenses, wardrobe, and room geometry per decade while automatically weaving transcript-synced archival cutaways, schematics, and multi-language narration.

#### Locked Cast & Continuity Profiles (4)
1. **Dr. Amira Hassan** (*Lead Witness · Multi-Era Locked Identity*) — Mathematical Logician & AI Governance Scholar. Appears in 1980s Cairo/Paris archival recreations (age 28) and present-day 4K London interview plates (age 64) with locked facial structure and vocal cadence.
2. **Kenji Sato** (*Co-Lead Witness · Multi-Era Locked Identity*) — Industrial Control & Semiconductor Engineer. Tracked from 1980s Osaka/Seoul fabrication floors to contemporary Tokyo robotics archives with natural micro-expressions and lip-sync.
3. **The Chronicler (Narrator)** (*Documentary Voice-of-God · 4-Language Neural Lock*) — Measured, unsensationalist documentary narrator driving transcript-timed archival B-roll and localized audio mixes in English, Spanish, Chinese, and Arabic.
4. **Historical Lab & Field Ensemble** (*Period-Guarded Re-Enactment Cast, 1956–Present*) — 1956 Manchester and Tokyo computing pioneers, 1989 Nairobi hospital records analysts, and present-day practitioners in Manila, Accra, and Rotterdam—strictly filtered against modern anachronisms.

#### Example [Episode 1] Synopsis — *Episode 1: The Room with the Switches (1950–1968)* (40 min · 5 Chapters)
Episode 1 reconstructs the physical and philosophical birth of machine intelligence between 1950 and 1968. Moving between 16mm archival-grade recreations of Manchester’s Ferranti Mark 1, Tokyo’s ETL Mark III relay room, and Dartmouth’s 1956 summer study, Dr. Amira Hassan and Kenji Sato examine the artifacts their mentors left behind—showing how early researchers mistook formal logic for human common sense, yet laid the switching architecture that still governs modern compute.
- **Chapter 1 Proof — *The Relay That Remembered (Manchester & Tokyo, 1956)* (6 min):** Shot in locked 1956 16mm grain with zero modern artifacts, engineers in wool waistcoats trace a fault across clattering electromagnetic relays in Manchester and Tokyo, intercut with crisp 4K present-day interview plates of Amira Hassan and Kenji Sato holding original 5-hole punched tape—closing on a single toggle switch left on through the night.

---

### 2.4 Example 4 — Instructional Curriculum: *Five Plates* (`training`)

- **Format:** Instructional Series · 5-Module Course
- **Genre:** Hands-On Culinary Curriculum
- **Art Style:** Natural Daylight Studio · Clean Overhead & Bench Coverage
- **Duration:** 75 min Course (5 × 15 min) · Module 1: 15 min (Chapter 1 Proof: 5 min)
- **Logline:** *“One chef, one kitchen, five meals — each plate teaching the hands what the next plate will need.”*

#### Series Synopsis
Designed as an enterprise-grade, multi-module instructional curriculum, *Five Plates* follows Chef Lila Mensah across five 15-minute lessons (75 minutes total) inside the locked Harbor Street Teaching Kitchen. Unlike avatar slide-readers that cannot demonstrate physical craft, SceneFlow locks Chef Mensah’s face, double-breasted coat, knife station, and green ceramic wall tiles across A-Cam medium teaching beats, B-Cam 90° overhead bench demonstrations, and C-Cam macro simmer/crumb inspections—building cumulative culinary competency from a foundational clear broth to a five-plate graduation service.

#### Locked Cast & Continuity Profiles (4)
1. **Chef Lila Mensah** (*Lead Instructor · Locked Identity & Wardrobe*) — Executive Chef-Instructor (38). Crisp white double-breasted chef coat, slate apron, close-cropped hair; maintains identical facial geometry, hand continuity, and calm pedagogical authority across all 5 modules.
2. **Marcus Cole** (*Apprentice Cohort Cook · Locked Character Sheet*) — First-Year Culinary Student (26). Navy apprentice jacket at Bench #2; executes live technique checks, heat adjustments, and troubleshooting diagnostics.
3. **Priya Nair** (*Apprentice Cohort Cook · Locked Character Sheet*) — First-Year Culinary Student (24). Charcoal apprentice jacket at Bench #3; demonstrates seasoning calibration, dough proofing checks, and family-style plating.
4. **Harbor Street Teaching Kitchen** (*Locked Studio Set · 3-Camera Instructional Rig*) — Daylight-lit industrial brick and green-tile studio with brushed-steel island, heavy copper stockpots, and synced callout graphics across A-Cam, 90° Overhead B-Cam, and Macro C-Cam.

#### Example [Episode 1 / Module 1] Synopsis — *Module 1: The Broth — Extraction, Clarity & Heat Control* (15 min · 3 Chapters)
In Module 1, Chef Lila Mensah establishes the Harbor Street workbench and teaches the foundational skill of the course: transforming cold water, roasted bones or root vegetables, and aromatics into a clear, structured broth. Structured into three instructional chapters—(1) Cold Start & Knife Mise en Place, (2) The Convection Simmer & Skim, and (3) Late-Stage Salt Calibration & Clarity Check—learners master thermal control before touching flour or roast proteins in later modules.
- **Chapter 1 Proof — *Cold Water, Clean Bones & The First Simmer* (5 min):** Opening on A-Cam in the daylight-balanced Harbor Street Kitchen, Chef Lila Mensah introduces the five-plate syllabus, switches to a locked 90° overhead B-Cam to demonstrate uniform mirepoix cuts and cold-water submersion, and brings the stockpot to its first lazy convection bubble alongside apprentices Marcus and Priya.

---

## 3. Pre-Credit Budget Strategy: Chapter 1 First, Full Masters Post-Credits

### Why Full Episode 1 Masters Should Wait Until Credits Unlock

Rendering all chapters of Episode 1 across all four examples (119.5 total minutes of finished motion video) out of pocket before Google for Startups / NVIDIA credits land would require **~$505–$675+ in raw video inference** (or **$700–$1,000+** with a 1.35× director reroll buffer), exceeding the **$250/month** post-payment Cloud Billing guardrail on `018BC7-19AC32-7CE0EE`.

### The Two-Phase Production Strategy

By generating **100% of the Series Bibles, Blueprints, Audience Resonance Reports, Full Episode 1 Pre-Vis Animatics, and a Complete Chapter 1 Motion Master (5–6 min) + Trailer + 4-Language Dub (`EN`, `ES`, `ZH`, `AR`)** for all four examples in **Phase 1**, every review door (`Series Room`, `Blueprint Room`, `Production Stage`, `Screening Room`) is **100% live and playable** for evaluators while keeping total pre-credit cash spend to **~$88–$118**.

| Production Deliverable | Phase 1 (Pre-Credit Cash Spend — Nov 3–7, 2026) | Phase 2 (Post-Credit Unlock — After Google/NVIDIA Credits) |
|------------------------|------------------------------------------------|------------------------------------------------------------|
| **Series Room (`/s/series/[token]`)** | **100% Complete** for all 4 examples (Full season synopsis, cast sheets, all episode blueprints & TTS narration) | Already complete; expand to Episodes 2–N scripts as needed |
| **Blueprint Room (`/blueprint/share/[token]`)** | **100% Complete** for Episode 1 of all 4 examples (Locked character/set reference plates + treatment + AR score) | Already complete |
| **Production Stage (`/share/script-resonance/[token]`)** | **100% Complete** for Episode 1 of all 4 examples (Full script + beat-level Audience Resonance report) | Already complete |
| **Screening Room — Pre-Vis Mode** | **100% Complete** for Episode 1 (or Chapter 1–2) with Beat Frames, multi-voice dialogue, SFX & music | Full Episode 1 Pre-Vis across all chapters |
| **Screening Room — Clips / Scenes / Chapters Mode** | **Chapter 1 Complete (5–6 min per example = 22.5 min total)** rendered in Veo 3.1 + 4-language dubs (`EN`, `ES`, `ZH`, `AR`) | Render **Chapters 2–8** (*Drama*), **Chapters 2–4** (*Animation*), **Chapters 2–5** (*Documentary*), **Chapters 2–3** (*Training*) |
| **Screening Room — Master Mode (`longformPublished`)** | Plays **Chapter 1 Complete Master** (5–6 min per example) + 60s Card Trailer | Stitch full **42.5m / 22m / 40m / 15m** Episode 1 Masters & flip `longformPublished: true` |

### Phase 1 vs. Phase 2 Cost Breakdown (Provider Cost Basis)

| Example | Ep 1 Total Runtime | Ch 1 Runtime | Phase 1 Cost (Series + Blueprint + AR + Ch 1 Motion + 4-Lang Dub) | Phase 2 Cost (Remaining Ep 1 Chapters 2–N Motion + 4K Upscale) |
|---------|--------------------|--------------|------------------------------------------------------------------|----------------------------------------------------------------|
| **1. *The White City Current*** (`drama`) | 42.5 min (8 ch) | **6.0 min** (Ch 1) | **$18 – $26** *(Series/Blueprint/AR/Trailer already live; complete Ch 1 scenes)* | ~$165 – $215 (Chapters 2–8 · 36.5 min) |
| **2. *Hart House*** (`animation`) | 22.0 min (4 ch) | **5.5 min** (Ch 1) | **$24 – $32** *(5 locked 2D character sheets + House plates + Ch 1 5.5m render)* | ~$75 – $95 (Chapters 2–4 · 16.5 min) |
| **3. *The Long Thought*** (`documentary`) | 40.0 min (5 ch) | **6.0 min** (Ch 1) | **$25 – $34** *(Witness plates + 1956 Manchester/Tokyo plates + Ch 1 6m render)* | ~$145 – $185 (Chapters 2–5 · 34.0 min) |
| **4. *Five Plates*** (`training`) | 15.0 min (3 ch) | **5.0 min** (Ch 1) | **$21 – $26** *(Chef Lila + 2 apprentices + Harbor St Kitchen + Ch 1 5m render)* | ~$45 – $60 (Chapters 2–3 · 10.0 min) |
| **Total Across All 4 Examples** | **119.5 min** | **22.5 min** | **$88 – $118 USD** *(Well inside $250/mo guardrail)* | **~$430 – $555 USD** *(100% covered by Startup Credits)* |

---

## 4. Updated Plan of Action from Nov. 3, 2026 (GCP Back-Bill Payment & Service Restoration)

### Milestone 1 — Nov. 3, 2026 (Morning): Payment & GCP Infrastructure Restoration

1. **Pay Past-Due Balance on Billing Account `018BC7-19AC32-7CE0EE` ("SceneFlow Platform", USD):**
   - Settle the balance in Google Cloud Billing Console (`https://console.cloud.google.com/billing/018BC7-19AC32-7CE0EE`).
   - Allow 5–15 minutes for `gcloud billing accounts describe 018BC7-19AC32-7CE0EE --format="value(open)"` to report `True`.
2. **Run Post-Payment Setup & Guardrails Script:**
   ```bash
   bash scripts/gcp-nov3-post-payment-setup.sh --delete-unused-projects
   ```
   - Links primary project `sceneflowai-2d3e6` to `018BC7-19AC32-7CE0EE` and unlinks/deletes unused projects (`sceneflow-export`, `gen-lang-client-0842101693`).
   - Confirms permanent deletion of legacy `clearsight-db` / `clearsight-db-v2` and restarts primary database `sceneflow-db` (`--activation-policy=ALWAYS`, `--no-enable-dataplex-integration`, `--retained-backups-count=7`).
   - Applies 7-day auto-delete lifecycle rule on `gs://sceneflow-render-jobs`.
   - Creates the `$250/mo` **SceneFlow Monthly Guardrail** budget alert (20%, 40%, 80%, 100% thresholds).
   - Verifies and re-enables core APIs (`aiplatform.googleapis.com`, `sqladmin.googleapis.com`, `storage.googleapis.com`, `run.googleapis.com`, `texttospeech.googleapis.com`, `translate.googleapis.com`) and checks GCS buckets (`gs://sceneflow-assets`, `gs://sceneflow-render-jobs`) and Cloud Run FFmpeg renderer.
3. **Run GCP Organization & Domain IAM Alignment Script:**
   ```bash
   bash scripts/gcp-setup-organization.sh
   ```
   - Authenticates `admin@sceneflowai.studio`, verifies the `sceneflowai.studio` GCP Organization ID, migrates `sceneflowai-2d3e6` under the `sceneflowai.studio` Organization, and grants `roles/owner` and `roles/billing.admin` to `admin@sceneflowai.studio` and `brian@sceneflowai.studio` (required for Google for Startups domain verification).
4. **Smoke-Test Live Flagship Share Links on `https://sceneflowai.studio`:**
   - Verify `sceneflow-db` connectivity and confirm that all four *The White City Current* doors load live data:
     - Series Room: `/s/series/cb7cc9e663a87a074e37c62636ef8c00`
     - Blueprint Room: `/blueprint/share/5GDScu72NC7SWo1ioPMwzUxTg9KM2joz`
     - Production Stage (AR): `/share/script-resonance/_uHqaPHdsD0ZfdJoEwtnHBi4DiAJBW9s`
     - Screening Room: `/TheWhiteCityCurrent`

---

### Milestone 2 — Nov. 3–4, 2026: Create Series Bibles, Blueprints & AR Shares for All 4 Examples (~$6 Total)

Because Gemini text, TTS overview, and Reference Library character/location plates cost less than **$1.50 per series**, immediately replace the `example-*` placeholder tokens in [`src/config/landing/productionPipelineDemo.ts`](src/config/landing/productionPipelineDemo.ts) with real published share tokens:

1. **Create & Share Series Room Bibles (`/s/series/[token]`):**
   - Paste the optimized inputs from [`src/config/landing/exampleSeriesInputs.ts`](src/config/landing/exampleSeriesInputs.ts) to create live Series Bibles for *Hart House*, *The Long Thought*, and *Five Plates* (and update *The White City Current* Series Bible with the 4 locked cast profiles).
2. **Generate Locked Cast & Set Reference Plates + Episode 1 Blueprints (`/blueprint/share/[token]`):**
   - Lock the 4–5 principal character sheets and primary set plates per example in the Reference Library.
   - Run Blueprint Audience Resonance and publish read-only Blueprint share links.
3. **Generate Episode 1 Script + Production Stage AR Links (`/share/script-resonance/[token]`):**
   - Generate the Episode 1 script for each example, run Script Audience Resonance, and publish the Production Stage share tokens.

---

### Milestone 3 — Nov. 4–6, 2026: Render Chapter 1 Motion Masters + Trailers for All 4 Examples (~$82–$112 Total)

Focus 100% of video inference spend on **Chapter 1** (5–6 minutes per example) so every Screening Room has a complete, watchable long-form chapter across Pre-Vis, Clips, Scenes, Chapters, and Chapter 1 Master:

1. **Day 1 (Nov 4) — *The White City Current* (`drama`) Chapter 1 Completion:**
   - Complete all scene streams and 4-language dub tracks (`EN`, `ES`, `ZH`, `AR`) for **Chapter 1: "Subterranean Isolation" (6 min)** in `/TheWhiteCityCurrent`.
2. **Day 2 (Nov 5) — *Hart House* (`animation`) Chapter 1 ("Twelve Bins by Thursday", 5.5 min):**
   - Generate Beat Frames with locked 2D flat-cel character turnarounds (Ruth, Ellis, June, Milo, Nana Inez), render Chapter 1 motion clips, cut a 45s silent WebM/MP4 card trailer, assemble the Chapter 1 stream in Cloud Run, and publish `/share/screening-room/HartHouse`.
3. **Day 2–3 (Nov 5–6) — *The Long Thought* (`documentary`) Chapter 1 ("The Relay That Remembered", 6 min):**
   - Generate 1956 16mm Manchester/Tokyo lab frames + 4K witness interview plates (Dr. Amira Hassan & Kenji Sato), render Chapter 1 motion + transcript-synced archival B-roll, cut a 45s card trailer, and publish `/share/screening-room/TheLongThought`.
4. **Day 3 (Nov 6) — *Five Plates* (`training`) Module 1, Chapter 1 ("Cold Water, Clean Bones & The First Simmer", 5 min):**
   - Generate A-Cam medium, B-Cam 90° overhead bench, and C-Cam macro frames in the locked Harbor Street Kitchen with Chef Lila Mensah, render Chapter 1 motion + synced instructional callouts, cut a 45s card trailer, and publish `/share/screening-room/FivePlates`.
5. **Wire Live Tokens into `productionPipelineDemo.ts` & Deploy via PR to `main`:**
   - Update `PRODUCTION_PIPELINE_WALKS` in [`src/config/landing/productionPipelineDemo.ts`](src/config/landing/productionPipelineDemo.ts) with the real `seriesShareToken`, `blueprintShareToken`, `scriptResonanceShareToken`, `screeningRoomSlug`, and `trailerSrc` for all 4 cards.

---

### Milestone 4 — Nov. 7–8, 2026: Submit Google for Startups, NVIDIA Inception & Seed Investor Applications

With `sceneflowai.studio` running on an active, Organization-verified GCP account (`sceneflowai-2d3e6` under `sceneflowai.studio`) and all 4 Production Examples showcasing live Series Room → Blueprint Room → Production Stage → Screening Room (Chapter 1 Complete Masters):

1. **Submit Google for Startups Cloud Program Application** (using [`docs/GOOGLE_STARTUP_APPLICATION.md`](docs/GOOGLE_STARTUP_APPLICATION.md) and `brian@sceneflowai.studio` / `support@sceneflowai.studio`).
2. **Submit NVIDIA Inception Program Application** highlighting multi-modal character/style locking, Veo/Kling orchestration, and long-form chapter rendering.
3. **Distribute Seed Investor Deck & Live Screening Room Links** ([`docs/PITCH_DECK_OUTLINE.md`](docs/PITCH_DECK_OUTLINE.md)).

---

### Milestone 5 — Phase 2 (Post-Credit Unlock): Complete Remaining Chapters & Full Episode 1 Masters

Once Google for Startups credits ($2K Start Tier → $100K–$250K Partner/AI-First Tier) and/or NVIDIA Inception credits are applied to Billing Account `018BC7-19AC32-7CE0EE`:

1. Render **Chapters 2–8** of *The White City Current* (remaining 36.5 min) → stitch 42.5-min 4K ProRes/MP4 Master.
2. Render **Chapters 2–4** of *Hart House* (remaining 16.5 min) → stitch 22-min Episode 1 Master.
3. Render **Chapters 2–5** of *The Long Thought* (remaining 34 min) → stitch 40-min Episode 1 Master.
4. Render **Chapters 2–3** of *Five Plates* (remaining 10 min) → stitch 15-min Module 1 Master.
5. Set `longformPublished: true` and `longformRuntimeLabel` (`'42 min'`, `'22 min'`, `'40 min'`, `'15 min'`) in [`src/config/landing/productionPipelineDemo.ts`](src/config/landing/productionPipelineDemo.ts) for all 4 examples.

---

## 5. Key Codebase Files

| File | Role |
|------|------|
| [`src/config/landing/exampleSeriesInputs.ts`](src/config/landing/exampleSeriesInputs.ts) | Canonical data for the 4 examples: Specs, Logline, Series Synopsis, Locked Cast (`cast`), Episode 1 + Chapter 1 Synopsis (`episode1Synopsis`), and Episode/Beat breakdown |
| [`src/components/landing/SeriesInputPanel.tsx`](src/components/landing/SeriesInputPanel.tsx) | Renders Series Synopsis, Locked Cast, Episode 1 + Chapter 1 Proof, and Episode Breakdown on each landing card |
| [`src/components/landing/PipelinePlaceholderStage.tsx`](src/components/landing/PipelinePlaceholderStage.tsx) | Renders the full Series Synopsis, Cast, and Episode 1 / Chapter 1 Proof inside the review modal while database shares are being generated |
| [`src/config/landing/productionShowcaseCopy.ts`](src/config/landing/productionShowcaseCopy.ts) | Card headlines, subtitles, and 4 problem-vs-solution pillars per vertical |
| [`src/config/landing/productionPipelineDemo.ts`](src/config/landing/productionPipelineDemo.ts) | Share tokens (`seriesShareToken`, `blueprintShareToken`, `scriptResonanceShareToken`, `screeningRoomSlug`) and trailer URLs for all 4 examples |
| [`src/components/landing/ProductionExamplesSection.tsx`](src/components/landing/ProductionExamplesSection.tsx) | `#production-examples` landing section wrapper |
| [`src/components/landing/ProductionStyleCard.tsx`](src/components/landing/ProductionStyleCard.tsx) | Individual example card with TrailerPlayer, SeriesInputPanel, and 4 review doors |
| [`scripts/gcp-nov3-post-payment-setup.sh`](scripts/gcp-nov3-post-payment-setup.sh) | Turnkey Nov. 3 post-payment script (Billing check, `sceneflow-db` restart, 7-day GCS lifecycle, `$250/mo` budget alert, API & bucket verification) |
| [`scripts/gcp-setup-organization.sh`](scripts/gcp-setup-organization.sh) | Turnkey GCP Organization provisioning & `sceneflowai-2d3e6` migration script |
| [`docs/GOOGLE_STARTUP_APPLICATION.md`](docs/GOOGLE_STARTUP_APPLICATION.md) | Google for Startups application brief with reviewer demo URLs |
| [`src/__tests__/productionExamplesLanding.test.ts`](src/__tests__/productionExamplesLanding.test.ts) | Unit test suite guarding the 4 examples, Series/Cast/Episode 1 synopses, i18n parity, and review doors |

---

## 6. Version History

| Date | Version | Change |
|------|---------|--------|
| 2026-07-25 | 1.0.0–3.0.0 | Initial `#production-examples` section architecture and 4-card showcase implementation |
| 2026-10-28 | 4.0.0 | **Optimized all 4 examples for Google Startups, NVIDIA Inception & Seed Investors:** Added Series Synopses, Locked Cast rosters, and Episode 1 + Chapter 1 Synopses to `exampleSeriesInputs.ts`, `SeriesInputPanel.tsx`, and `PipelinePlaceholderStage.tsx`; updated the **Nov. 3, 2026 GCP Post-Payment Action Plan** and **Pre-Credit Chapter-1 Budget Strategy** |
