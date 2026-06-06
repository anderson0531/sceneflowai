# Use Case Demo Video Manifest

Landing page use case examples support **one demo video per example** with shareable bookmark hashes.

Hash format: `#use-cases-{categoryId}-{exampleId}`

Example: `#use-cases-knowledge-k12-higher-ed`

Config source: [`src/config/landing/useCaseExamples.ts`](../../src/config/landing/useCaseExamples.ts)

Playback whitelist: [`src/config/landing/useCaseVideoStatus.ts`](../../src/config/landing/useCaseVideoStatus.ts)

Automation: [`scripts/fetch-use-case-demos.mjs`](../../scripts/fetch-use-case-demos.mjs) + [`scripts/use-case-demo-sources.json`](../../scripts/use-case-demo-sources.json)

Poster thumbnails: [`scripts/upload-landing-thumbnails.mjs`](../../scripts/upload-landing-thumbnails.mjs) (`--type use-case-posters --all`)

Blob path: `demo/use-cases/{categoryId}/{exampleId}-poster.jpg`

**License:** Clips sourced from [Pexels](https://www.pexels.com/) under the [Pexels License](https://www.pexels.com/license/) (free for commercial use with attribution).

**Playback:** Only examples with `USE_CASE_VIDEO_READY[category][id] = true` are playable on the landing page. All others show the poster thumbnail with a "Demo Coming Soon" overlay. `videoSrc` still points at the Blob path so enabling playback after upload is a one-line config change.

---

## Entertainment & Creator Series (`entertainment`)

| Example ID | Label | Hash | Video (Blob) | Playback |
|------------|-------|------|--------------|----------|
| `vertical-short-drama` | YouTube TV Drama | `#use-cases-entertainment-vertical-short-drama` | `demo/use-cases/entertainment/vertical-short-drama.mp4` | Thumbnail only |
| `animated-web-series` | Animated Web Series | `#use-cases-entertainment-animated-web-series` | `demo/use-cases/entertainment/animated-web-series.mp4` | Thumbnail only |
| `episodic-youtube-series` | Episodic YouTube Series | `#use-cases-entertainment-episodic-youtube-series` | `demo/use-cases/entertainment/episodic-youtube-series.mp4` | Thumbnail only |
| `creator-reality-competition` | Creator Reality & Competition | `#use-cases-entertainment-creator-reality-competition` | `demo/use-cases/entertainment/creator-reality-competition.mp4` | Thumbnail only |
| `ctv-ready-series` | Vertical Mobile Drama | `#use-cases-entertainment-ctv-ready-series` | `demo/use-cases/entertainment/ctv-ready-series.mp4` | Thumbnail only |

---

## Property, Spaces & Hospitality (`property`)

| Example ID | Label | Hash | Video (Blob) | Playback |
|------------|-------|------|--------------|----------|
| `residential-real-estate` | Residential Real Estate | `#use-cases-property-residential-real-estate` | `Home Tour.mp4` | **Enabled** |
| `commercial-real-estate` | Commercial Real Estate | `#use-cases-property-commercial-real-estate` | `demo/use-cases/property/commercial-real-estate.mp4` | Thumbnail only |
| `short-term-rentals` | Short-Term Rentals | `#use-cases-property-short-term-rentals` | `demo/use-cases/property/short-term-rentals.mp4` | Thumbnail only |
| `hospitality-tourism` | Hospitality & Tourism | `#use-cases-property-hospitality-tourism` | `demo/use-cases/property/hospitality-tourism.mp4` | Thumbnail only |
| `museum-gallery-guides` | Museum & Gallery Guides | `#use-cases-property-museum-gallery-guides` | `demo/use-cases/property/museum-gallery-guides.mp4` | Thumbnail only |

---

## Knowledge, Training & Education (`knowledge`)

| Example ID | Label | Hash | Video (Blob) | Playback |
|------------|-------|------|--------------|----------|
| `k12-higher-ed` | K-12 & Higher Ed | `#use-cases-knowledge-k12-higher-ed` | `Astrophysics.mp4` | **Enabled** |
| `corporate-ld` | Corporate L&D | `#use-cases-knowledge-corporate-ld` | `demo/use-cases/knowledge/corporate-ld.mp4` | Thumbnail only |
| `software-saas-tutorials` | Software SaaS Tutorials | `#use-cases-knowledge-software-saas-tutorials` | `demo/use-cases/knowledge/software-saas-tutorials.mp4` | Thumbnail only |
| `niche-skill-tutoring` | Niche Skill Tutoring | `#use-cases-knowledge-niche-skill-tutoring` | `demo/use-cases/knowledge/niche-skill-tutoring.mp4` | Thumbnail only |
| `medical-patient-education` | Medical/Patient Education | `#use-cases-knowledge-medical-patient-education` | `demo/use-cases/knowledge/medical-patient-education.mp4` | Thumbnail only |
| `video-memoirs` | Video Memoirs | `#use-cases-knowledge-video-memoirs` | `KITCHEN.mp4` | **Enabled** |

---

## JIT Media & Information (`jit`)

| Example ID | Label | Hash | Video (Blob) | Playback |
|------------|-------|------|--------------|----------|
| `hyper-local-news` | Hyper-Local News | `#use-cases-jit-hyper-local-news` | `demo/signal.mp4` | **Enabled** |
| `financial-market-recaps` | Financial & Market Recaps | `#use-cases-jit-financial-market-recaps` | `demo/use-cases/jit/financial-market-recaps.mp4` | Thumbnail only |
| `sports-commentary` | Sports Commentary | `#use-cases-jit-sports-commentary` | `demo/use-cases/jit/sports-commentary.mp4` | Thumbnail only |
| `true-crime-historical-docs` | True Crime & Historical Docs | `#use-cases-jit-true-crime-historical-docs` | `demo/use-cases/jit/true-crime-historical-docs.mp4` | Thumbnail only |
| `weather-emergency-alerts` | Weather & Emergency Alerts | `#use-cases-jit-weather-emergency-alerts` | `demo/use-cases/jit/weather-emergency-alerts.mp4` | Thumbnail only |

---

## B2B Marketing & Sales (`b2b`)

| Example ID | Label | Hash | Video (Blob) | Playback |
|------------|-------|------|--------------|----------|
| `product-explainer-videos` | Product Explainer Videos | `#use-cases-b2b-product-explainer-videos` | `Demo.mp4` | **Enabled** |
| `case-study-testimonials` | Case Study/Testimonials | `#use-cases-b2b-case-study-testimonials` | `demo/use-cases/b2b/case-study-testimonials.mp4` | Thumbnail only |
| `recruitment-branding` | Recruitment & Branding | `#use-cases-b2b-recruitment-branding` | `demo/use-cases/b2b/recruitment-branding.mp4` | Thumbnail only |
| `conference-event-promos` | Conference & Event Promos | `#use-cases-b2b-conference-event-promos` | `demo/use-cases/b2b/conference-event-promos.mp4` | Thumbnail only |

---

## Public Sector & Advocacy (`public`)

| Example ID | Label | Hash | Video (Blob) | Playback |
|------------|-------|------|--------------|----------|
| `ngo-impact-reports` | NGO Impact Reports | `#use-cases-public-ngo-impact-reports` | `NGO.mp4` | **Enabled** |
| `public-health-announcements` | Public Health Announcements | `#use-cases-public-public-health-announcements` | `demo/use-cases/public/public-health-announcements.mp4` | Thumbnail only |
| `legal-insurance-explainers` | Legal & Insurance Explainers | `#use-cases-public-legal-insurance-explainers` | `demo/use-cases/public/legal-insurance-explainers.mp4` | Thumbnail only |
| `religious-spiritual-teachings` | Religious & Spiritual Teachings | `#use-cases-public-religious-spiritual-teachings` | `demo/use-cases/public/religious-spiritual-teachings.mp4` | Thumbnail only |

---

## Summary

| Status | Count |
|--------|-------|
| Playback enabled (SceneFlow demos) | 6 |
| Thumbnail only (stock / pending upload) | 23 |
| **Total landing examples** | **29** |

Blob host: `xxavfkdhdebrqida.public.blob.vercel-storage.com`

Canonical video path pattern: `demo/use-cases/{categoryId}/{exampleId}.mp4`

---

## Enable playback after upload

1. Upload the real demo to the Blob path listed in `videoSrc` (see `useCaseExamples.ts`).
2. In [`useCaseVideoStatus.ts`](../../src/config/landing/useCaseVideoStatus.ts), add under the category:

   ```typescript
   'example-id': true,
   ```

3. Deploy. No `videoSrc` change is required if the file is at the canonical path.

---

## Fetch script usage

```bash
# Requires BLOB_READ_WRITE_TOKEN in .env.local
# Optional PEXELS_API_KEY for search; otherwise set pexelsVideoId + directDownloadUrl in use-case-demo-sources.json

node scripts/fetch-use-case-demos.mjs --dry-run
node scripts/fetch-use-case-demos.mjs --id corporate-ld
node scripts/fetch-use-case-demos.mjs --write-config
```

Flags: `--dry-run`, `--id {exampleId}`, `--skip-upload` (writes to `public/demo/use-cases/`), `--write-config` (patches `useCaseExamples.ts`).

To swap a clip: update `pexelsVideoId`, `directDownloadUrl`, and attribution fields in `use-case-demo-sources.json`, then re-run with `--id`.
