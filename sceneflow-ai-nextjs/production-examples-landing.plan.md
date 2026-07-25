# Production Examples Landing Section Plan

| Property | Value |
|----------|-------|
| **Project** | SceneFlow AI Landing Page |
| **Version** | 1.0.0 |
| **Date** | July 25, 2026 |
| **Status** | Planning — components built but not wired |
| **URL** | https://sceneflowai.studio |

---

## Table of Contents

1. [Overview](#overview)
2. [Goal](#goal)
3. [Current Landing (Live)](#current-landing-live)
4. [Orphaned Implementations](#orphaned-implementations)
5. [Recommended Section Architecture](#recommended-section-architecture)
6. [Decision Matrix](#decision-matrix)
7. [Implementation Checklist](#implementation-checklist)
8. [Key Files](#key-files)
9. [Demo Video Status](#demo-video-status)
10. [Version History](#version-history)

---

## Overview

The **Production Examples** section is meant to show visitors concrete production types SceneFlow can deliver — with enough depth to convert, without reintroducing the old overloaded landing page.

Two related implementations exist in code but were removed from the live landing during funnel simplification. Neither was previously captured in a dedicated plan file. This document consolidates code, git history, and manifest docs into a single reference.

---

## Goal

Show visitors **concrete production types SceneFlow can deliver** — sector breadth (29 verticals) and/or production-style cards (4 formats) — positioned to support conversion without duplicating the persona showcase above it.

---

## Current Landing (Live)

`LandingPageClient.tsx` renders:

1. Hero
2. **`UseCasesSection`** (`#use-cases`) — persona tabs (YouTube Creator, Startup Provider, Enterprise, Educator) with story + Screening Room preview
3. **Pipeline Pillars** (`#pipeline`)
4. **Key Features**
5. **Pricing**

The sector-based “29 examples” browser and the “4 production style cards” section are **not on the page**.

---

## Orphaned Implementations

### Option A — Production Showcase (`TemplatesGallery.tsx`)

| Property | Value |
|----------|-------|
| **Anchor** | `#templates` |
| **Badge** | Production Showcase |
| **Headline** | Start Any Production Style |
| **Layout** | 2×2 grid of production-style cards |
| **i18n** | Hardcoded English only (no `productionShowcase` namespace) |
| **Status** | Orphaned — zero imports |

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
| **Status** | Orphaned — zero imports |

Previously lived inside the old `UseCasesSection`, below persona tabs. Removed in commit `119779a5d` (*Simplify the landing page into a focused $9 conversion funnel*).

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

## Recommended Section Architecture

```
Hero
  ↓
Use Cases (personas)          ← keep: emotional hook + Screening Room
  ↓
Production Examples           ← revive: sector browser OR style cards
  ↓
Pipeline Pillars
  ↓
Key Features → Pricing
```

---

## Decision Matrix

| Approach | Best for | Tradeoff |
|----------|----------|----------|
| **Revive Option B** (sector browser) | Breadth — 29 verticals, shareable hashes | Heavier UI; only 6/29 demos playable today |
| **Revive Option A** (4 style cards) | Conversion — “pick your format” | Narrower scope; English-only copy today |
| **Hybrid** | Personas above + sector browser below | Richest proof, but longest page |

**Open decision:** Pick Option A, B, or hybrid before wiring.

---

## Implementation Checklist

1. **Pick Option A, B, or hybrid** and set anchor (`#production-examples` or keep `#use-cases-*` hashes).
2. **Wire into** `LandingPageClient.tsx` below `UseCasesSection`.
3. **Nav:** add section to `FloatingNav` and header if using a new anchor.
4. **i18n:**
   - Move `TemplatesGallery` hardcoded copy into messages (new `productionShowcase` namespace or extend `useCasesShowcase`).
   - Propagate `useCasesShowcase` beyond `en`/`th` if keeping the persona section as canonical.
5. **Demos:** upload real SceneFlow outputs per `USE_CASE_VIDEO_MANIFEST.md`; flip flags in `useCaseVideoStatus.ts`.
6. **Cleanup:** delete or mark `@deprecated` any orphaned code that is not shipped, to avoid drift.

---

## Key Files

| File | Role |
|------|------|
| `src/app/LandingPageClient.tsx` | Landing section order — wire new section here |
| `src/components/landing/TemplatesGallery.tsx` | 4-card Production Showcase (orphaned) |
| `src/components/landing/ProductionComparisonVisual.tsx` | 29-example sector browser (orphaned) |
| `src/components/landing/UseCasesSection.tsx` | Live persona showcase |
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
