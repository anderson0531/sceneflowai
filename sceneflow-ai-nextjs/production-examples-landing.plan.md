# Production Examples Landing Section & January 2027 Launch Rollout Plan

| Property | Value |
|----------|-------|
| **Project** | SceneFlow AI — 6 Flagship Long-Form Production Verticals, 7-Language UI & Startup Program Proof |
| **Version** | 5.0.0 |
| **Date** | November 3, 2026 |
| **Status** | Active — All 6 Flagship Verticals (*Drama*, *Animation*, *Documentary*, *Training*, *Podcast*, *Memoir*) & 7-Language UI/Trailer Dubs (`EN`, `ES`, `PT`, `HI`, `ZH`, `AR`, `TH`) Shipped; On Track for January 2027 Launch |
| **URL** | https://sceneflowai.studio/#production-examples |

---

## Table of Contents

1. [Strategic Context: 7 Market Problems & Why the 6 Examples Are the Deal-Makers](#1-strategic-context-7-market-problems--why-the-6-examples-are-the-deal-makers)
2. [Review & Specifications of the 6 Flagship Production Verticals](#2-review--specifications-of-the-6-flagship-production-verticals)
   - [Example 1 — Cinematic Drama: *The White City Current* (`drama`)](#21-example-1--cinematic-drama-the-white-city-current-drama)
   - [Example 2 — Animated Series: *Hart House* (`animation`)](#22-example-2--animated-series-hart-house-animation)
   - [Example 3 — Historical Documentary: *The Long Thought* (`documentary`)](#23-example-3--historical-documentary-the-long-thought-documentary)
   - [Example 4 — Instructional Curriculum: *Five Plates* (`training`)](#24-example-4--instructional-curriculum-five-plates-training)
   - [Example 5 — Creator Channels & Video Podcasts: *The Midnight Frequency* (`podcast`)](#25-example-5--creator-channels--video-podcasts-the-midnight-frequency-podcast)
   - [Example 6 — Video Memoirs & Client Studios: *Letters Across the Water* (`memoir`)](#26-example-6--video-memoirs--client-studios-letters-across-the-water-memoir)
3. [Two-Phase Compute Budget: $2K Google Startup Credits → Jan 2027 Launch](#3-two-phase-compute-budget-2k-google-startup-credits--jan-2027-launch)
4. [Execution Roadmap: Nov 2026 Credit Unlock to Jan 2027 Commercial Launch](#4-execution-roadmap-nov-2026-credit-unlock-to-jan-2027-commercial-launch)
5. [Key Codebase Files](#5-key-codebase-files)
6. [Version History](#6-version-history)

---

## 1. Strategic Context: 7 Market Problems & Why the 6 Examples Are the Deal-Makers

Most generative video platforms (Runway, Pika, Sora, Luma, CapCut, InVideo) remain trapped in **10-second isolated clips** or **short-form social templates**, while enterprise avatar tools (Synthesia, HeyGen) are limited to static talking heads over slides.

SceneFlow AI positions itself as a **long-form professional video studio** (`Series Room → Blueprint Room → Production Stage → Screening Room`) that uniquely solves **7 core market problems** for our **January 2027 launch**:

1. **Long-Form Video Creation with Audience Resonance™ (AR) & Agent Automation:** Beat-level Gemini script optimization eliminates structural flaws before rendering, while the **Autonomous Production Agent** + Veo `EXT` continuous dialogue chains build full episodes without 300-shot prompt fatigue.
2. **Full Direction Control for Experienced Creators:** Granular camera lenses, lighting, spatial blocking, start/end keyframes, motion controls, and BYOK orchestration.
3. **Automated Series, Blueprint & Script for New Creators:** Plain-language ideation into multi-episode Series Bibles, locked cast sheets, and voiced scenes via a $9 Explorer Test Flight and $19/mo Hobbyist tier.
4. **Standalone Script Upload & Screening Room Pre-Vis for Filmmakers Seeking Funding:** Upload `.fdx`, `.fountain`, or PDF screenplays to generate a voiced, scored Pre-Vis Animatic and Promo Trailer—replacing $5,000–$25,000 pitch packages.
5. **Character/Voice Cloning & Live Clip Uploads for Video Podcasters:** Upload live studio camera takes (or use cloned voices/avatars) paired with a locked desk companion and SceneFlow-generated historical/sci-fi reconstructions (*The Midnight Frequency*).
6. **Turnkey Online Video Production Businesses (Video Memoirs, Real Estate, Client Studios):** Enable solo operators in 2027 to launch high-margin B2B/B2C production services ($1,500–$5,000 commissioned family legacy films and property tours built on $30–$60 of compute) to offset AI job displacement (*Letters Across the Water*).
7. **Global Reach Across 7 UI Languages & 70+ Delivery Languages:** Native Studio and Landing UI in **English (`en`), Spanish (`es`), Portuguese (`pt`), Hindi (`hi`), Simplified Chinese (`zh-CN`), Arabic (`ar`), and Thai (`th`)**, backed by a 3-layer localization architecture that protects English machine prompts (`englishForModel()`).

| Evaluator | What They Look For in `#production-examples` | Proof Delivered by the 6 Examples |
|-----------|----------------------------------------------|-----------------------------------|
| **Google for Startups** ($2K Start → $100K–$250K Partner / AI-First Track) | Deep, non-trivial orchestration of **Vertex AI Gemini** (Series Bible, Blueprint, Audience Resonance, Production Agent), **Imagen 4 / Gemini Pro Image** (Continuity Vault & Beat Frames), **Veo 3.1 + EXT**, **Cloud Run** (FFmpeg stream assembly), and **GCS**. | Six cards exposing four live review doors (**Series Room**, **Blueprint Room**, **Production Stage**, **Screening Room**) + 7-language trailer streams demonstrating full-stack Google Cloud consumption. |
| **NVIDIA Inception Program** | Multi-modal temporal/spatial consistency, multi-reference conditioning, hybrid live-video + AI match-cuts, 4K upscale pipeline, and neural lip-sync. | Character turnaround locks, era-specific visual guardrails (1956 16mm vs. 1966 Kodachrome vs. 4K), 2D flat-cel style locking, 3-camera instructional continuity, and live-camera-to-AI match cuts. |
| **Seed Investors & B2B Partners** | TAM expansion beyond hobbyist clips into six high-ARPU verticals—especially **Creator Podcasts** and **B2B Video Production Businesses (Video Memoirs / Real Estate)** that drive Pro ($149/mo), Studio ($599/mo), and Add-On pack expansion. | Six complete vertical archetypes with transparent Series Synopses, Locked Casts, Episode 1 + Chapter 1 Synopses, and 7-language global distribution (`EN`, `ES`, `PT`, `HI`, `ZH`, `AR`, `TH`). |

---

## 2. Review & Specifications of the 6 Flagship Production Verticals

All six examples in [`src/config/landing/exampleSeriesInputs.ts`](src/config/landing/exampleSeriesInputs.ts), [`src/config/landing/exampleTrailerScripts.ts`](src/config/landing/exampleTrailerScripts.ts), and [`src/config/landing/productionShowcaseCopy.ts`](src/config/landing/productionShowcaseCopy.ts) ship with:
- **Series Synopsis (`seriesSynopsis`)** & **Visual Bible (`artLock`)**
- **Locked Cast & Principal Continuity Roster (`cast`)**
- **Featured Example — Episode 1 Synopsis (`episode1Synopsis`)** + **Chapter 1 Production Proof**
- **Full Episode / Chapter Breakdown (`episodes`)**
- **7-Language Trailer Streams (`en`, `es`, `pt`, `hi`, `zh`, `ar`, `th`)** in [`src/config/landing/productionPipelineDemo.ts`](src/config/landing/productionPipelineDemo.ts)

---

### 2.1 Example 1 — Cinematic Drama: *The White City Current* (`drama`)

- **Format:** 6-Episode Prestige Series · Episode 1 Pilot (8 Chapters)
- **Genre:** Sci-Fi Infrastructure Thriller
- **Art Style:** Anamorphic Photorealism · Tungsten, Sub-Zero Slate & Violet-Teal Induction Glow
- **Duration:** 265 min Series (6 × 42–48 min) · Episode 1: 42.5 min (Chapter 1 Proof: 6 min)
- **Locked Cast (4):** Gideon Croft (54, Archivist), Piper Hayes (31, Investigative Reporter), Julian Ward (46, Corporate Risk Director), Dr. Clara Vance-Croft (48, Late Resonance Physicist) + Hero Prop Lock (`PROP_MANIFOLD`).
- **Chapter 1 Proof — *Subterranean Isolation* (6 min):** Forty feet beneath freezing Chicago, Piper Hayes breaches Gideon Croft’s 1906 freight-tunnel vault carrying Clara’s 1893 brass cipher and Vane-Calhoun’s load-shedding orders.

---

### 2.2 Example 2 — Animated Series: *Hart House* (`animation`)

- **Format:** Animated Sitcom · 5-Episode Season
- **Genre:** Multi-Generational Family Comedy
- **Art Style:** 2D Flat-Cel Animation · Bold Ink Outlines & Warm Suburban Palette
- **Duration:** 110 min Season (5 × 22 min) · Episode 1: 22 min (Chapter 1 Proof: 5.5 min)
- **Locked Cast (5):** Ruth Hart (42), Ellis Hart (44), June Hart (16), Milo Hart (9), Nana Inez (71).
- **Chapter 1 Proof — *Twelve Bins by Thursday* (5.5 min):** In the locked 2D Hart kitchen, Ruth unveils Millwick’s twelve-category sorting chart while Ellis brings home a salvaged bus-door motor and Milo labels the household furniture.

---

### 2.3 Example 3 — Historical Documentary: *The Long Thought* (`documentary`)

- **Format:** Historical Documentary · 5-Part Series
- **Genre:** Global History of Science & Technology
- **Art Style:** Era-Accurate Archival Realism (1950s 16mm Grain → 1980s CRT → Modern 4K)
- **Duration:** 200 min Series (5 × 40 min) · Episode 1: 40 min (Chapter 1 Proof: 6 min)
- **Locked Cast (4):** Dr. Amira Hassan (Age 28 in 1989 & Age 64 Present Day), Kenji Sato (Age 31 in 1991 & Age 66 Present Day), The Chronicler (Narrator), and Period-Guarded Lab Ensemble.
- **Chapter 1 Proof — *The Relay That Remembered (Manchester & Tokyo, 1956)* (6 min):** Shot in locked 1956 16mm grain with zero modern artifacts, intercut with 4K present-day interview plates of Amira Hassan and Kenji Sato holding original 5-hole punched tape.

---

### 2.4 Example 4 — Instructional Curriculum: *Five Plates* (`training`)

- **Format:** Instructional Series · 5-Module Course
- **Genre:** Hands-On Culinary Curriculum
- **Art Style:** Natural Daylight Studio · Clean 3-Camera Coverage (A-Cam Medium, 90° Overhead B-Cam, Macro C-Cam)
- **Duration:** 75 min Course (5 × 15 min) · Module 1: 15 min (Chapter 1 Proof: 5 min)
- **Locked Cast (4):** Chef Lila Mensah (38, Lead Instructor), Marcus Cole (26, Apprentice), Priya Nair (24, Apprentice), Harbor Street Teaching Kitchen (Locked Studio Set).
- **Chapter 1 Proof — *Cold Water, Clean Bones & The First Simmer* (5 min):** Chef Lila introduces the five-plate syllabus on A-Cam, cuts to 90° overhead B-Cam for uniform mirepoix cuts, and brings the stockpot to its first convection bubble on Macro C-Cam.

---

### 2.5 Example 5 — Creator Channels & Video Podcasts: *The Midnight Frequency* (`podcast`)

- **Format:** 6-Episode Creator Channel & Video Podcast Series · Hybrid Studio Upload + AI Cinema
- **Genre:** Investigative Mystery, Hidden History & Science Lore
- **Art Style:** Hybrid Warm Broadcast Studio Desk (Uploaded Live Camera) + Anamorphic Period & Deep-Sea Cinematic Reconstructions
- **Duration:** 190 min Season (6 × 30–34 min) · Episode 1: 32 min (Chapter 1 Proof: 5.5 min)
- **Locked Cast (4):** Devon Vance (36, Lead Host · Uploaded Live Studio Camera & Voice/Character Clone), Orson (Clockwork Brass Barn Owl Co-Host), Captain Nils Lindqvist (48, 1928 Svalbard Lead), Dr. Astrid Solberg (34, 1928 Geophysicist).
- **Chapter 1 Proof — *The Cylinder on the Desk & The 82° North Signal* (5.5 min):** Devon opens on his uploaded live studio camera feed beside Orson holding a corroded 1928 brass telegraph cylinder, triggering a seamless match-cut from the glowing studio VU meter into a howling 1928 Svalbard blizzard.

---

### 2.6 Example 6 — Video Memoirs & Client Studios: *Letters Across the Water* (`memoir`)

- **Format:** 5-Chapter Commissioned Family Legacy Film · Hybrid Interview Upload + Period Reenactment
- **Genre:** Biographical Family Memoir & Reunion Documentary (Turnkey B2B/B2C Service Model)
- **Art Style:** Warm 4K Living-Room Interview Uploads + Lush 1966 Kodachrome Harbor & 1974 Bakery Reenactments
- **Duration:** 28 min Commissioned Featurette (5 Chapters · Chapter 1 Proof: 5.5 min)
- **Locked Cast (4):** Elena Rossi-Chen at Age 82 (Uploaded Family Interview Clip), Young Elena Rossi at Age 22 (1966 Age-Locked Character Sheet), Young Mateo Chen at Age 24 (1966 Locked Cast), Maya Chen at Age 26 (Granddaughter) + Prop Lock (`1966 Leather Recipe Notebook`).
- **Chapter 1 Proof — *Pier 14 & The Cedar Trunk (1966)* (5.5 min):** Present-day 82-year-old Elena opens her worn 1966 leather recipe notebook in a sunlit living room; as she describes the rain on Pier 14, the frame transitions to 22-year-old Elena standing on the misty 1966 steamer gangway holding the exact same notebook.

---

## 3. Two-Phase Compute Budget: $2K Google Startup Credits → Jan 2027 Launch

With all **6 flagship verticals** and **7 language dubs** (`EN`, `ES`, `PT`, `HI`, `ZH`, `AR`, `TH`) configured, the two-phase rendering plan maximizes reviewer impact while staying well inside the **$2,000 Google for Startups Start Tier credit grant**:

| Example Vertical | Ep 1 Total Runtime | Ch 1 Runtime | Phase 1 (Series Bible + Blueprint + AR + Ch 1 Motion + 7-Lang Trailer) | Phase 2 (Full Ep 1 Chapters 2–N Motion + 7-Lang Dubs via $2K GCP Credits) |
|------------------|--------------------|--------------|------------------------------------------------------------------------|---------------------------------------------------------------------------|
| **1. *The White City Current*** (`drama`) | 42.5 min (8 ch) | **6.0 min** | **$20 – $28** *(Live doors + 7-lang trailer deployed)* | ~$165 – $215 (Chapters 2–8 · 36.5 min) |
| **2. *Hart House*** (`animation`) | 22.0 min (4 ch) | **5.5 min** | **$24 – $32** *(5 locked 2D sheets + 7-lang trailer + Ch 1)* | ~$75 – $95 (Chapters 2–4 · 16.5 min) |
| **3. *The Long Thought*** (`documentary`) | 40.0 min (5 ch) | **6.0 min** | **$25 – $34** *(Multi-era witness plates + 7-lang trailer + Ch 1)* | ~$145 – $185 (Chapters 2–5 · 34.0 min) |
| **4. *Five Plates*** (`training`) | 15.0 min (3 ch) | **5.0 min** | **$21 – $26** *(Chef Lila + 3-cam rig + 7-lang trailer + Ch 1)* | ~$45 – $60 (Chapters 2–3 · 10.0 min) |
| **5. *The Midnight Frequency*** (`podcast`) | 32.0 min (6 ch) | **5.5 min** | **$22 – $30** *(Host desk + Orson + 1928 Svalbard Ch 1 + 7-lang trailer)* | ~$95 – $125 (Chapters 2–6 · 26.5 min hybrid) |
| **6. *Letters Across the Water*** (`memoir`) | 28.0 min (5 ch) | **5.5 min** | **$22 – $30** *(Age-82/Age-22 Elena locks + 1966 Pier Ch 1 + 7-lang trailer)* | ~$85 – $110 (Chapters 2–5 · 22.5 min hybrid) |
| **Total Across All 6 Flagship Examples** | **179.5 min** | **33.5 min** | **$134 – $180 USD** *(Inside $250/mo pre-credit guardrail)* | **~$610 – $790 USD** *(Covered 2.5x–3.2x over by $2,000 Google Credits)* |

---

## 4. Execution Roadmap: Nov 2026 Credit Unlock to Jan 2027 Commercial Launch

### Milestone 1 — Week of Nov 3–8, 2026: Application Submission & 6-Vertical Showcase Verification
1. Verify GCP Organization & Billing (`018BC7-19AC32-7CE0EE`) using `scripts/gcp-nov3-post-payment-setup.sh` and `scripts/gcp-setup-organization.sh`.
2. Submit **Google for Startups Cloud Program Application** ([`docs/GOOGLE_STARTUP_APPLICATION.md`](docs/GOOGLE_STARTUP_APPLICATION.md)) showcasing all 6 flagship verticals and 7 UI languages (`en`, `es`, `pt`, `hi`, `zh-CN`, `ar`, `th`).
3. Submit **NVIDIA Inception Application** and updated 2027–2029 Financial Model ([`docs/sceneflow_financial_model_2027_12month.csv`](docs/sceneflow_financial_model_2027_12month.csv), [`docs/sceneflow_financial_model_2027_2029_3year.csv`](docs/sceneflow_financial_model_2027_2029_3year.csv)).

### Milestone 2 — Nov 2026 (Upon $2K Credit Activation): Live Share Tokens & Chapter 1 Masters for All 6 Verticals
1. Generate and publish live database share tokens (`seriesShareToken`, `blueprintShareToken`, `scriptResonanceShareToken`, `screeningRoomSlug`) for `animation`, `documentary`, `training`, `podcast`, and `memoir` in [`src/config/landing/productionPipelineDemo.ts`](src/config/landing/productionPipelineDemo.ts).
2. Render Chapter 1 complete motion masters (33.5 minutes total across the 6 verticals) and full Episode 1 Pre-Vis Animatics using the $2K Vertex AI credit grant.

### Milestone 3 — Dec 2026: Full Episode 1 Masters, Studio i18n Completion & B2B Playbooks
1. Render remaining chapters across the 6 flagship examples (~$610–$790 in Vertex AI credits) and flip `longformPublished: true` in `productionPipelineDemo.ts`.
2. Complete `next-intl` string extraction on remaining in-app surfaces (`dashboard`, `series`, `ScriptPanel.tsx`) so all 7 UI languages run 100% natively without fallback.
3. Package the **Video Memoir & Client Studio Playbook** ([`docs/SCENEFLOW_VIDEO_MEMOIR_SERVICE_PLAYBOOK.md`](docs/SCENEFLOW_VIDEO_MEMOIR_SERVICE_PLAYBOOK.md)) alongside the Real Estate Playbook inside Studio Academy.

### Milestone 4 — January 2027: Commercial Launch & Viral B2B Production Business Campaigns
1. Open public commercial onboarding via the **$9 Explorer Studio Test Flight** across all 7 language markets (`EN`, `ES`, `PT`, `HI`, `ZH`, `AR`, `TH`).
2. Reinvest early subscription and Add-On revenue into targeted global marketing campaigns for **New Online Video Production Businesses** (Video Memoirs, Real Estate Tours, Podcast Illustration Studios, and Filmmaker Pre-Vis Pitch Packages).
3. Apply for the **$100K–$250K Google Cloud Partner / AI-First Credit Tier** backed by Q1 2027 Vertex AI consumption telemetry.

---

## 5. Key Codebase Files

| File | Role |
|------|------|
| [`src/config/landing/exampleSeriesInputs.ts`](src/config/landing/exampleSeriesInputs.ts) | Canonical data for all 6 examples (`drama`, `animation`, `documentary`, `training`, `podcast`, `memoir`): Specs, Logline, Series Synopsis, Locked Cast (`cast`), Episode 1 + Chapter 1 Synopsis, and Episode breakdown |
| [`src/config/landing/exampleTrailerScripts.ts`](src/config/landing/exampleTrailerScripts.ts) | 60s–90s single-shot trailer scripts and Reference Locks for all 6 verticals powering `#imagine-possibilities` and `#production-examples` |
| [`src/config/landing/productionShowcaseCopy.ts`](src/config/landing/productionShowcaseCopy.ts) | Card headlines, subtitles, 7-language banner, and 4 problem-vs-solution pillars per vertical |
| [`src/config/landing/productionPipelineDemo.ts`](src/config/landing/productionPipelineDemo.ts) | Share tokens (`seriesShareToken`, `blueprintShareToken`, `scriptResonanceShareToken`, `screeningRoomSlug`) and 7-language localized trailer URLs (`en`, `es`, `pt`, `hi`, `zh`, `ar`, `th`) for all 6 examples |
| [`src/config/landingTranslateLanguages.ts`](src/config/landingTranslateLanguages.ts) | Single source of truth for the 7 UI languages (`en`, `es`, `pt`, `hi`, `zh-CN`, `ar`, `th`) and 70+ delivery languages |
| [`docs/GOOGLE_STARTUP_APPLICATION.md`](docs/GOOGLE_STARTUP_APPLICATION.md) | Google for Startups application brief aligned to 6 verticals, 7 languages, and Jan 2027 launch |
| [`docs/SCENEFLOW_VIDEO_MEMOIR_SERVICE_PLAYBOOK.md`](docs/SCENEFLOW_VIDEO_MEMOIR_SERVICE_PLAYBOOK.md) | Turnkey B2B/B2C playbook for operators launching Video Memoir & Legacy Film businesses |
| [`docs/sceneflow_financial_model_2027_12month.csv`](docs/sceneflow_financial_model_2027_12month.csv) | 12-Month 2027 financial model incorporating 7 language markets, $2K → $100K/$250K GCP credit tracks, and viral B2B Production Business growth |
| [`docs/sceneflow_financial_model_2027_2029_3year.csv`](docs/sceneflow_financial_model_2027_2029_3year.csv) | 3-Year (2027–2029) P&L, 7-market subscriber mix, and B2B Production Business revenue model |

---

## 6. Version History

| Date | Version | Change |
|------|---------|--------|
| 2026-07-25 | 1.0.0–3.0.0 | Initial `#production-examples` section architecture and 4-card showcase implementation |
| 2026-10-28 | 4.0.0 | Added Series Synopses, Locked Cast rosters, and Episode 1 + Chapter 1 Synopses to `exampleSeriesInputs.ts`, `SeriesInputPanel.tsx`, and `PipelinePlaceholderStage.tsx` |
| 2026-11-03 | 5.0.0 | **Expanded to 6 Flagship Verticals & 7 UI/Trailer Languages for Jan 2027 Launch:** Added Example 5 (*The Midnight Frequency* — `podcast`) and Example 6 (*Letters Across the Water* — `memoir`), synced all 7 languages (`EN`, `ES`, `PT`, `HI`, `ZH`, `AR`, `TH`), and aligned budget & financial models to the $2K Google Startup Credit unlock and B2B Production Business growth loop |
