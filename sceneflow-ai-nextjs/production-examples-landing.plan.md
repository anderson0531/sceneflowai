# Production Examples Landing Section Plan

| Property | Value |
|----------|-------|
| **Project** | SceneFlow AI Landing Page |
| **Version** | 2.0.0 |
| **Date** | July 25, 2026 |
| **Status** | Implemented — Option B shipped as `#production-examples` |
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
8. [Remaining Work](#remaining-work)
9. [Key Files](#key-files)
10. [Demo Video Status](#demo-video-status)
11. [Version History](#version-history)

---

## Overview

The **Production Examples** section shows visitors concrete production types SceneFlow can deliver — with enough depth to convert, without reintroducing the old overloaded landing page.

Two related implementations existed in code but had been removed from the live landing during funnel simplification, and neither was captured in a plan file. This document consolidates code, git history, and manifest docs into a single reference, records which option was chosen, and tracks what remains.

---

## Goal

Show visitors **concrete production types SceneFlow can deliver** — sector breadth across 29 verticals — positioned to support conversion without duplicating the persona showcase above it.

---

## Current Landing (Live)

`LandingPageClient.tsx` renders:

1. Hero
2. **`UseCasesSection`** (`#use-cases`) — persona tabs (YouTube Creator, Startup Provider, Enterprise, Educator) with story + Screening Room preview
3. **`ProductionExamplesSection`** (`#production-examples`) — sector browser, 6 sectors / 29 examples
4. **Pipeline Pillars** (`#pipeline`)
5. **Key Features**
6. **Pricing**

The “4 production style cards” section (`TemplatesGallery`) remains off the page and is marked `@deprecated`.

---

## Implementations

### Option A — Production Showcase (`TemplatesGallery.tsx`)

| Property | Value |
|----------|-------|
| **Anchor** | `#templates` |
| **Badge** | Production Showcase |
| **Headline** | Start Any Production Style |
| **Layout** | 2×2 grid of production-style cards |
| **i18n** | Hardcoded English only (no `productionShowcase` namespace) |
| **Status** | Not shipped — marked `@deprecated`, zero imports |

Built in commit `2984c8b3a` (*Transform Templates Gallery to Production Showcase*). Removed from landing in commit `fe26885e2` (*refactor(landing): rebuild narrative for non-technical creators*).

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
- Hover CTA **“Start This Production”** → signup with `?production={id}`

---

### Option B — Sector Use-Case Browser (`ProductionComparisonVisual.tsx`)

| Property | Value |
|----------|-------|
| **Hashes** | `#use-cases-{categoryId}-{exampleId}` |
| **i18n** | `useCases` namespace in `messages/en.json` |
| **Config** | `useCaseExamples.ts` — 6 sectors, 29 examples |
| **Status** | **Shipped** — rendered by `ProductionExamplesSection` |

Previously lived inside the old `UseCasesSection`, below persona tabs. Removed in commit `119779a5d` (*Simplify the landing page into a focused $9 conversion funnel*), and revived as its own section.

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
Production Examples           #production-examples sector browser, 6 sectors / 29 examples
  ↓
Pipeline Pillars              #pipeline
  ↓
Key Features → Pricing
```

---

## Decision

**Option B (sector browser) shipped.** It was chosen over Option A and the hybrid because:

| Factor | Option B | Option A |
|--------|----------|----------|
| Localization | `useCases` namespace already translated across 38 locales | Hardcoded English |
| Content source | Config-driven (`useCaseExamples.ts`) | Hardcoded component array |
| Breadth | 29 examples across 6 sectors | 4 production styles |
| Supporting infra | Poster thumbnails, narration, story audio, demo manifest | None |
| Deep links | `#use-cases-{category}-{example}` bookmarks | None |

The hybrid was rejected for now: the persona section already sits directly above and covers the “who is this for” angle, so stacking both card sets would repeat the same pitch twice.

---

## Implemented

1. **`ProductionExamplesSection`** renders `ProductionComparisonVisual` under the
   `#production-examples` anchor, using the existing `useCases` badge/title/subtitle
   and qualifying statement.
2. **Wired** into `LandingPageClient.tsx` between `UseCasesSection` and `PipelinePillarsSection`.
3. **Nav:** entries added to `FloatingNav` and both the desktop and mobile header,
   with new `nav.productionExamples` / `floatingNav.productionExamples` keys.
4. **Deep links:** `#use-cases-{category}-{example}` now scrolls the section into view.
   Previously the hash only selected an example, because no element carries the
   example hash as an `id`.
5. **i18n:** narration labels added under `useCases.ui`. Locale files deep-merge over
   the English base (`src/i18n/mergeMessages.ts`), so new keys fall back to English
   without touching all 38 locale files.
6. **Cleanup:** `TemplatesGallery` marked `@deprecated` with a pointer to this plan.

### Deliberately left alone

- **Section height:** the browser is allowed to size to its content rather than being
  boxed with its internal `overflow-y-auto` panes. Constraining it pushed the example
  cards — the section's primary interaction — below an internal scroll fold.
- **`LandingSectionCollapse`:** the new section is always expanded, matching every
  other section on the live landing page.

---

## Remaining Work

1. **Demos:** upload real SceneFlow outputs per `USE_CASE_VIDEO_MANIFEST.md`; flip flags
   in `useCaseVideoStatus.ts`. 23 of 29 examples still show a poster only.
2. **Translations:** new nav and narration keys currently fall back to English.
   Run `npm run i18n:generate` when a translation pass is scheduled.
3. **`messages/en.json` drift:** the committed file no longer matches
   `buildEnMessages.ts` output — regenerating drops live keys (`pipeline`,
   `useCasesShowcase`, `keyFeatures`, `landingSections`). Both files were updated by
   hand here; reconciling the generator is a separate task.
4. **Option A decision:** delete `TemplatesGallery.tsx` outright, or port its copy into
   i18n if the “pick a production style” angle is still wanted.

---

## Key Files

| File | Role |
|------|------|
| `src/components/landing/ProductionExamplesSection.tsx` | Section wrapper, anchor, deep-link scrolling |
| `src/app/LandingPageClient.tsx` | Landing section order |
| `src/components/landing/ProductionComparisonVisual.tsx` | 29-example sector browser |
| `src/components/landing/TemplatesGallery.tsx` | 4-card Production Showcase (deprecated) |
| `src/components/landing/UseCasesSection.tsx` | Live persona showcase |
| `src/__tests__/productionExamplesLanding.test.ts` | Wiring, i18n contract, hash round-trip |
| `src/components/landing/AudiencePathStrip.tsx` | Role path strip (orphaned) |
| `src/config/landing/useCaseExamples.ts` | Example definitions |
| `src/config/landing/useCaseVideoStatus.ts` | Playback whitelist |
| `src/config/landing/landingVisualMedia.ts` | Illustrations, narration, story audio URLs |
| `public/demo/USE_CASE_VIDEO_MANIFEST.md` | Demo upload paths + playback status |
| `scripts/fetch-use-case-demos.mjs` | Pexels fetch + Blob upload automation |
| `messages/en.json` | `useCases` and `useCasesShowcase` i18n keys |

---

## Demo Video Status

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
