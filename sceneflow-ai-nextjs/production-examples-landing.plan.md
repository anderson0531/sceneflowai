# Production Examples Landing Section Plan

| Property | Value |
|----------|-------|
| **Project** | SceneFlow AI Landing Page |
| **Version** | 2.0.0 |
| **Date** | July 25, 2026 |
| **Status** | Implemented — Option A shipped as `#production-examples` (reversed from Option B) |
| **URL** | https://sceneflowai.studio |

---

## Table of Contents

1. [Overview](#overview)
2. [Goal](#goal)
3. [Current Landing (Live)](#current-landing-live)
4. [Implementations](#implementations)
5. [Section Architecture](#section-architecture)
6. [Decision](#decision)
7. [Implemented](#implemented)
8. [Asset Status](#asset-status)
9. [Remaining Work](#remaining-work)
10. [Key Files](#key-files)
11. [Demo Video Status](#demo-video-status)
12. [Version History](#version-history)

---

## Overview

The **Production Examples** section shows visitors concrete production types SceneFlow can deliver — with enough depth to convert, without reintroducing the old overloaded landing page.

Two related implementations existed in code but had been removed from the live landing during funnel simplification, and neither was captured in a plan file. This document consolidates code, git history, and manifest docs into a single reference, records which option was chosen, and tracks what remains.

---

## Goal

Show visitors **concrete production types SceneFlow can deliver** — four end-to-end production styles with their workflow, tool chain, and payoff — positioned to support conversion without duplicating the persona showcase above it.

---

## Current Landing (Live)

`LandingPageClient.tsx` renders:

1. Hero
2. **`UseCasesSection`** (`#use-cases`) — persona tabs (YouTube Creator, Startup Provider, Enterprise, Educator) with story + Screening Room preview
3. **`ProductionExamplesSection`** (`#production-examples`) — 4 production-style cards
4. **Pipeline Pillars** (`#pipeline`)
5. **Key Features**
6. **Pricing**

The sector browser (`ProductionComparisonVisual`) is now off the page and marked `@deprecated`. `TemplatesGallery` was deleted after its cards were ported into i18n.

---

## Implementations

### Option A — Production Showcase (4 cards)

| Property | Value |
|----------|-------|
| **Anchor** | `#production-examples` |
| **Badge** | Production Examples |
| **Headline** | Start Any Production Style |
| **Layout** | 2×2 grid of production-style cards |
| **i18n** | `productionShowcase` namespace, sourced from `productionShowcaseCopy.ts` |
| **Status** | **Shipped** — rendered by `ProductionExamplesSection` |

Built in commit `2984c8b3a` (*Transform Templates Gallery to Production Showcase*) as `TemplatesGallery.tsx` under `#templates`. Removed from landing in commit `fe26885e2` (*refactor(landing): rebuild narrative for non-technical creators*). Ported into i18n and shipped under `#production-examples`; `TemplatesGallery.tsx` was then deleted.

#### Cards

| Card | Subtitle | Tools flow |
|------|----------|------------|
| Cinematic Drama | 10-episode thriller with locked characters | Series Studio → Writer's Room → Visualizer |
| Animated Comedy | Stylized art with perfect face recognition | Writer's Room → Visualizer → Screening Room |
| AI-First Podcast | 20-episode educational series | Series Studio → Smart Editor → Screening Room |
| Corporate Training | Research outline to 15-part series | Series Studio → Smart Editor → Export |

Each card includes:

- Numbered workflow steps
- Tools flow line
- Benefit callout
- CTA **“Start This Production”** → `/early-access?checkoutTier=explorer&production={id}`
  (hover-revealed on pointer devices, always visible on touch)

---

### Option B — Sector Use-Case Browser (`ProductionComparisonVisual.tsx`)

| Property | Value |
|----------|-------|
| **Hashes** | `#use-cases-{categoryId}-{exampleId}` |
| **i18n** | `useCases` namespace in `messages/en.json` |
| **Config** | `useCaseExamples.ts` — 6 sectors, 29 examples |
| **Status** | Not shipped — marked `@deprecated`, zero imports |

Previously lived inside the old `UseCasesSection`, below persona tabs. Removed in commit `119779a5d` (*Simplify the landing page into a focused $9 conversion funnel*), briefly revived as its own section in `025ea43be`, then unmounted again when Option A shipped. Config, illustrations, and narration audio are retained so it can be revived.

#### Features

- Category tabs across 6 sectors
- Illustration / video panel per example
- “Hear the Story” narration buttons
- Deep-link hashes for shareable bookmarks
- Entertainment stats callout block

#### Sectors

| Sector | Example count |
|--------|---------------|
| Entertainment & Creator Series | 5 |
| Property, Spaces & Hospitality | 5 |
| Knowledge, Training & Education | 6 |
| JIT Media & Information | 5 |
| B2B Marketing & Sales | 4 |
| Public Sector & Advocacy | 4 |
| **Total** | **29** |

**Docs:** `public/demo/USE_CASE_VIDEO_MANIFEST.md`

---

### Related Orphan: Audience Path Strip (`AudiencePathStrip.tsx`)

- i18n: `audiencePaths` namespace (“Who are you? Pick your path”)
- Linked into `#use-cases-{persona}` hashes
- Removed in the same landing simplification as Option B
- Not currently imported on the landing page

---

## Section Architecture

```
Hero
  ↓
Use Cases (personas)          #use-cases           emotional hook + Screening Room
  ↓
Production Examples           #production-examples 4 production-style cards
  ↓
Pipeline Pillars              #pipeline
  ↓
Key Features → Pricing
```

---

## Decision

**Reversed: Option A (4 production-style cards) shipped.**

Option B was shipped first and then rejected on review. The reason is the one thing the
original decision matrix did not weigh: reusing the `useCases` namespace meant the
section rendered *entirely* legacy use-case copy — badge “Use Case Examples”, headline
“Whatever Video You Can Imagine, Build It in SceneFlow”, an internal “USE CASES” chip,
and a “SELECT A USE CASE TO LEARN MORE” footer. Nothing on screen said “Production
Examples”, and it sat directly beneath the persona section, so it read as a duplicate of
the old use-case block rather than a new section.

The original objection to Option A — hardcoded English — cost almost nothing to remove:

| Factor | Option A (shipped) | Option B (retired) |
|--------|--------------------|--------------------|
| Localization | `productionShowcase` namespace; English fallback covers all 38 locales | `useCases` namespace, already translated |
| Content source | Config-driven (`productionShowcaseCopy.ts`) | Config-driven (`useCaseExamples.ts`) |
| Identity | Reads as Production Examples | Read as the old use-case block |
| Breadth | 4 production styles | 29 examples across 6 sectors |
| Conversion | Per-card CTA into the `explorer` funnel | Narration playback, no per-example CTA |
| Deep links | None | `#use-cases-{category}-{example}` bookmarks |

`mergeMessages.ts` starts each locale from a full copy of `en.json`, so a namespace that
exists only in English falls back to English everywhere without touching the 38 locale
files. An MT pass via `npm run i18n:generate` can follow.

The hybrid (Option C, both blocks stacked) is still available and unblocked — the sector
browser was unmounted, not deleted.

---

## Implemented

1. **Copy config:** `src/config/landing/productionShowcaseCopy.ts` holds the header
   scalars and the four cards (`drama`, `animation`, `podcast`, `training`). Icons,
   colors, and CTA gradients stay in TypeScript keyed by card id.
2. **i18n:** `productionShowcase` added to `buildEnMessages.ts` and mirrored by hand into
   `messages/en.json`. A test asserts the two stay byte-identical.
3. **`ProductionExamplesSection`** reads only the `productionShowcase` namespace and
   renders the branded header, the 2×2 card grid, and the bottom CTA strip under the
   unchanged `#production-examples` anchor.
4. **`ProductionStyleCard`** ports the card renderer with three fixes carried over from
   `TemplatesGallery`:
   - The CTA was inside a `opacity-0 group-hover:opacity-100` overlay, so it was
     unreachable on touch. It is now in flow below `md` and hover-revealed above it,
     with `pointer-events-none` plus `focus-within` so it is neither clickable while
     invisible nor unreachable by keyboard.
   - `bg.replace('/10','')` / `bg.replace('/5','')` emitted duplicated, conflicting
     Tailwind gradient classes. Replaced with an explicit `ctaGradient` per card.
   - The CTA now carries `checkoutTier=explorer` alongside `production={id}`, matching
     the `getSignupUrlForTier` convention used by hero, pricing, and exit intent.
     Previously `production` was the only param and nothing downstream reads it.
5. **Nav:** unchanged — `FloatingNav` and both header navs still target
   `#production-examples`.
6. **Cleanup:** `TemplatesGallery.tsx` deleted; `ProductionComparisonVisual` marked
   `@deprecated`; `USE_CASE_VIDEO_MANIFEST.md` carries a banner noting its hashes are no
   longer live.

### Deliberately left alone

- **`LandingSectionCollapse`:** the section is always expanded, matching every other
  section on the live landing page.
- **Sector-browser assets:** the 29 illustrations, 58 audio files, and
  `useCaseExamples.ts` config are all retained so Option B or C can be revived without
  re-uploading anything.

---

## Asset Status

The shipped card layout is icon-and-text only, so it depends on **no** image, video, or
audio assets — apart from the section narration track.

| Asset | Source | Status |
|-------|--------|--------|
| Card icons | `lucide-react` (`Clapperboard`, `Palette`, `Mic`, `GraduationCap`) | In-bundle |
| Section narration | `public/audio/section-narration/use-cases.mp3` | Present, **copy mismatch** |

**Section narration mismatch:** the track still narrates the retired “Whatever Video You
Can Imagine” copy, so it no longer matches the heading above it. The button is wired and
functional; the audio needs re-recording against the new copy. See Remaining Work.

### Retained but unused

Everything the sector browser depended on is still in the repo and still resolves — 29
Blob illustrations, 29 narration clips, 29 story clips, and `useCaseExamples.ts`. Nothing
was deleted, so reviving Option B or C requires no re-upload.

---

## Remaining Work

1. **Re-record section narration:** `public/audio/section-narration/use-cases.mp3`
   narrates the retired headline. Either re-record against the new
   `productionShowcase` copy or drop the button until new audio exists.
2. **Translations:** the whole `productionShowcase` namespace plus the nav keys fall back
   to English. Run `npm run i18n:generate` when a translation pass is scheduled.
3. **`messages/en.json` drift:** the committed file still does not match
   `buildEnMessages.ts` output — regenerating drops live keys (`pipeline`,
   `screeningRoom`, `useCasesShowcase`, `keyFeatures`). **Do not run
   `npm run i18n:build-en`** until this is reconciled; `productionShowcase` was added to
   both files by hand and a test guards that they agree.
4. **`?production={id}` is still inert:** the param now rides alongside
   `checkoutTier=explorer`, so the CTA does enter the funnel, but nothing reads
   `production` after navigation. Either consume it to preselect a production style
   during onboarding or drop it.
5. **Retired sector-browser deep links:** the 29 `#use-cases-{category}-{example}`
   bookmarks documented in `USE_CASE_VIDEO_MANIFEST.md` no longer select an example.
   Decide whether to revive the browser (Option B or C), redirect those hashes, or
   retire them.
6. **Dead video config:** `videoSrc`, `videoPosterSrc`, `videoEnabled`, and
   `useCaseVideoStatus.ts` are consumed by no rendered component. Drop them or wire a
   player if the browser returns.
7. **CI is blocked:** GitHub Actions has been failing repo-wide since at least
   2026-07-24 with *“account is locked due to a billing issue”*, which also disables the
   `deploy-prod.yml` Vercel deploy. Production currently updates through the Vercel Git
   integration only.

---

## Key Files

| File | Role |
|------|------|
| `src/components/landing/ProductionExamplesSection.tsx` | Section wrapper, anchor, header, CTA strip |
| `src/components/landing/ProductionStyleCard.tsx` | Card renderer, icon/color map, per-card CTA |
| `src/config/landing/productionShowcaseCopy.ts` | Card + header copy (English source of truth) |
| `src/i18n/buildEnMessages.ts` | Emits the `productionShowcase` namespace |
| `messages/en.json` | `productionShowcase` keys (hand-mirrored) |
| `src/app/LandingPageClient.tsx` | Landing section order |
| `src/components/landing/UseCasesSection.tsx` | Live persona showcase |
| `src/__tests__/productionExamplesLanding.test.ts` | Wiring, i18n contract, CTA + a11y guards |
| `src/lib/auth/postLoginRedirect.ts` | `getLoginUrl` — builds the per-card signup URL |
| `src/components/landing/ProductionComparisonVisual.tsx` | 29-example sector browser (deprecated) |
| `src/components/landing/AudiencePathStrip.tsx` | Role path strip (orphaned) |
| `src/config/landing/useCaseExamples.ts` | Example definitions (retained, unused) |
| `src/config/landing/useCaseVideoStatus.ts` | Playback whitelist (retained, unused) |
| `src/config/landing/landingVisualMedia.ts` | Section narration + retained example media URLs |
| `public/demo/USE_CASE_VIDEO_MANIFEST.md` | Demo upload paths; hashes no longer live |
| `scripts/fetch-use-case-demos.mjs` | Pexels fetch + Blob upload automation |

---

## Demo Video Status

> Reference only — see [Asset Status](#asset-status). The shipped section does not
> render these videos.

Per `USE_CASE_VIDEO_MANIFEST.md` (as of plan creation):

| Status | Count |
|--------|-------|
| Playback enabled (SceneFlow demos) | 6 |
| Thumbnail only (stock / pending upload) | 23 |
| **Total landing examples** | **29** |

### Enabled examples

| Category | Example ID | Label |
|----------|------------|-------|
| property | `residential-real-estate` | Residential Real Estate |
| knowledge | `k12-higher-ed` | K-12 & Higher Ed |
| knowledge | `video-memoirs` | Video Memoirs |
| jit | `hyper-local-news` | Hyper-Local News |
| b2b | `product-explainer-videos` | Product Explainer Videos |
| public | `ngo-impact-reports` | NGO Impact Reports |

### Enable playback after upload

1. Upload the real demo to the Blob path listed in `videoSrc` (see `useCaseExamples.ts`).
2. In `useCaseVideoStatus.ts`, add under the category:

   ```typescript
   'example-id': true,
   ```

3. Deploy. No `videoSrc` change is required if the file is at the canonical path.

---

## Version History

| Date | Version | Change |
|------|---------|--------|
| 2026-07-25 | 1.0.0 | Initial plan — consolidated from orphaned components, git history, and demo manifests |
| 2026-07-25 | 2.0.0 | Option B implemented — sector browser shipped as `#production-examples` with nav entries, deep-link scrolling, and tests |
| 2026-07-25 | 2.1.0 | Verified all 29 illustrations and 58 audio files resolve; corrected the video note (the section renders illustrations, not video) |
| 2026-07-25 | 3.0.0 | **Decision reversed to Option A.** Option B rendered entirely legacy `useCases` copy and read as the old use-case block. Ported the 4 production-style cards into a new `productionShowcase` namespace, fixed the touch-unreachable CTA and broken gradient classes, routed card CTAs through the `explorer` funnel, deleted `TemplatesGallery`, and deprecated the sector browser |
