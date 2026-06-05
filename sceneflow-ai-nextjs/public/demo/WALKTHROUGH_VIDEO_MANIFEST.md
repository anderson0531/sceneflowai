# Platform Walkthrough Video Manifest

Landing **Platform Walkthrough** section (`#feature-storyboard`) — curated **9 clips** for Google Startups resubmit.

Config: [`src/config/landing/featureStoryboardCopy.ts`](../../src/config/landing/featureStoryboardCopy.ts)  
Media: [`src/config/landing/featureStoryboardMedia.ts`](../../src/config/landing/featureStoryboardMedia.ts)  
Upload: [`scripts/upload-walkthrough-videos.mjs`](../../scripts/upload-walkthrough-videos.mjs)

---

## Nine-video set

| # | Card ID | Title | Video blob | Status |
|---|---------|-------|------------|--------|
| 1 | 1 | Platform Overview | `walkthrough/PlatformOverview.mp4` or interim `One Platform.mp4` | Interim linked |
| 2 | 9 | Series | `Series.mp4` | Ready |
| 4 | 10 | Blueprint | `BLUEPRINT.mp4` | Ready |
| 5 | 11 | Production | `walkthrough/Production.mp4` | Interim (Express clip) — re-record beat-first + EXT |
| 6 | 12 | Final Cut | `walkthrough/FinalCut.mp4` | Interim — re-record assembly UI |
| 7 | 13 | Premiere | `walkthrough/Premiere.mp4` | Interim — re-record Premiere + Screening |
| 8 | 16 | Trust & Safety | `walkthrough/TrustSafety.mp4` | Interim stock clip — re-record in-app trust tour |
| 9 | 7 | Audience Resonance | `Audience .mp4` | Ready — verify UI |
| 10 | 5 | Reference Library | `Reference.mp4` | Ready — verify UI |

**Removed from walkthrough (still in FAQ/docs):** BYOK credits (2), multilanguage (8), standalone Screening Room (14), duplicate UX cards (3, 4, 6).

---

## P0 recording briefs

### 1 — Platform Overview (90s)

Hero → How It Works → new project → Blueprint + resonance → Production beat-first → Final Cut → Premiere → `#trust-safety`.

### 5 — Production (60s)

Lock script → Express storyboard → Beat Frames → Veo EXT (+7s) → send stream to Final Cut.

### 6 — Final Cut (30s)

Stream picker → All Video preset → preview → export master MP4.

### 7 — Premiere (45s)

Import master → `/s/` screening → insights → YouTube wizard or export bundle.

### 8 — Trust & Safety (45s)

Landing trust tiers → Studio validation → guarded-path block (generic copy) → provenance → `/trust-safety`.

**Public narration only** — no Hive/Kling/vendor names.

---

## Upload commands

```bash
cd sceneflow-ai-nextjs
node scripts/upload-walkthrough-videos.mjs --dry-run
node scripts/upload-walkthrough-videos.mjs --all
node scripts/upload-walkthrough-videos.mjs --id production
```

After recording replacements, upload with `--id` and update `featureStoryboardMedia.ts` if paths change.

---

## Google Startups demo URLs

- Walkthrough: `https://sceneflowai.studio/#feature-storyboard`
- Trust: `https://sceneflowai.studio/#trust-safety`
- Admin email: `brian@sfai.studio`
