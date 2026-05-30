# Use Case Demo Video Manifest

Landing page use case examples support **one demo video per example** with shareable bookmark hashes.

Hash format: `#use-cases-{categoryId}-{exampleId}`

Example: `#use-cases-knowledge-k12-higher-ed`

Config source: [`src/config/landing/useCaseExamples.ts`](../../src/config/landing/useCaseExamples.ts)

---

## Property, Spaces & Hospitality (`property`)

| Example ID | Label | Hash | Video |
|------------|-------|------|-------|
| `residential-real-estate` | Residential Real Estate | `#use-cases-property-residential-real-estate` | Ready — `/demo/property-hospitality.mp4` |
| `commercial-real-estate` | Commercial Real Estate | `#use-cases-property-commercial-real-estate` | Placeholder |
| `short-term-rentals` | Short-Term Rentals | `#use-cases-property-short-term-rentals` | Placeholder |
| `hospitality-tourism` | Hospitality & Tourism | `#use-cases-property-hospitality-tourism` | Placeholder |
| `museum-gallery-guides` | Museum & Gallery Guides | `#use-cases-property-museum-gallery-guides` | Placeholder |

---

## Knowledge, Training & Education (`knowledge`)

| Example ID | Label | Hash | Video |
|------------|-------|------|-------|
| `k12-higher-ed` | K-12 & Higher Ed | `#use-cases-knowledge-k12-higher-ed` | Ready — Living Wall (`living-wall.mp4`) |
| `corporate-ld` | Corporate L&D | `#use-cases-knowledge-corporate-ld` | Placeholder |
| `software-saas-tutorials` | Software SaaS Tutorials | `#use-cases-knowledge-software-saas-tutorials` | Placeholder |
| `niche-skill-tutoring` | Niche Skill Tutoring | `#use-cases-knowledge-niche-skill-tutoring` | Placeholder |
| `medical-patient-education` | Medical/Patient Education | `#use-cases-knowledge-medical-patient-education` | Placeholder |
| `video-memoirs` | Video Memoirs | `#use-cases-knowledge-video-memoirs` | Placeholder |

---

## JIT Media & Information (`jit`)

| Example ID | Label | Hash | Video |
|------------|-------|------|-------|
| `hyper-local-news` | Hyper-Local News | `#use-cases-jit-hyper-local-news` | Ready — `demo/signal.mp4` |
| `financial-market-recaps` | Financial & Market Recaps | `#use-cases-jit-financial-market-recaps` | Placeholder |
| `sports-commentary` | Sports Commentary | `#use-cases-jit-sports-commentary` | Placeholder |
| `true-crime-historical-docs` | True Crime & Historical Docs | `#use-cases-jit-true-crime-historical-docs` | Placeholder |
| `weather-emergency-alerts` | Weather & Emergency Alerts | `#use-cases-jit-weather-emergency-alerts` | Placeholder |

---

## B2B Marketing & Sales (`b2b`)

| Example ID | Label | Hash | Video |
|------------|-------|------|-------|
| `product-explainer-videos` | Product Explainer Videos | `#use-cases-b2b-product-explainer-videos` | Ready — `Demo.mp4` |
| `case-study-testimonials` | Case Study/Testimonials | `#use-cases-b2b-case-study-testimonials` | Placeholder |
| `recruitment-branding` | Recruitment & Branding | `#use-cases-b2b-recruitment-branding` | Placeholder |
| `conference-event-promos` | Conference & Event Promos | `#use-cases-b2b-conference-event-promos` | Placeholder |

---

## Public Sector & Advocacy (`public`)

| Example ID | Label | Hash | Video |
|------------|-------|------|-------|
| `ngo-impact-reports` | NGO Impact Reports | `#use-cases-public-ngo-impact-reports` | Ready — `NGO.mp4` |
| `public-health-announcements` | Public Health Announcements | `#use-cases-public-public-health-announcements` | Placeholder |
| `legal-insurance-explainers` | Legal & Insurance Explainers | `#use-cases-public-legal-insurance-explainers` | Placeholder |
| `religious-spiritual-teachings` | Religious & Spiritual Teachings | `#use-cases-public-religious-spiritual-teachings` | Placeholder |

---

## Summary

| Status | Count |
|--------|-------|
| Ready | 5 |
| Placeholder | 19 |
| **Total examples** | **24** |

To add a demo: set `videoSrc` on the matching example in `useCaseExamples.ts` and update this manifest.
