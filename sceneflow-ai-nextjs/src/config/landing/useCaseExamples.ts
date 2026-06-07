import { ENTERTAINMENT_CATEGORY_QUALIFYING_STATEMENT } from '@/config/landing/entertainmentStatsCopy'
import {
  getUseCaseIllustrationUrl,
  getUseCaseVideoPosterUrl,
} from '@/config/landing/landingVisualMedia'
import { isUseCaseVideoEnabled } from '@/config/landing/useCaseVideoStatus'

export type UseCaseCategoryId =
  | 'entertainment'
  | 'property'
  | 'knowledge'
  | 'jit'
  | 'b2b'
  | 'public'

export type UseCaseExample = {
  id: string
  label: string
  description: string
  videoSrc?: string
  illustrationSrc?: string
  videoPosterSrc?: string
  videoEnabled?: boolean
}

export type UseCaseCategory = {
  id: UseCaseCategoryId
  title: string
  examples: UseCaseExample[]
  qualifyingStatement?: string
}

const BLOB_DEMO = 'https://xxavfkdhdebrqida.public.blob.vercel-storage.com'

/** Option C — universal qualifying statement for all use cases */
export const USE_CASES_QUALIFYING_STATEMENT =
  'SceneFlow turns your source photos, uploads, and descriptions into narrated walkthrough videos — with optional voice and character presence you control. These are AI-altered presentations: realistic visualizations grounded in your materials, not live camera recordings. Review and approve every pre-vis before publish; label outputs clearly so audiences know what they\'re watching.'

/** Option B — Property category reinforcement */
export const PROPERTY_CATEGORY_QUALIFYING_STATEMENT =
  'Built from your real property photos — presented as a narrated AI-altered walkthrough with your voice and avatar. A realistic preview of layout and features, not a substitute for an in-person showing. All tours are clearly labeled.'

export const USE_CASE_CATEGORY_IDS: UseCaseCategoryId[] = [
  'entertainment',
  'property',
  'knowledge',
  'jit',
  'b2b',
  'public',
]

type ExampleInput = {
  id: string
  label: string
  description: string
  videoSrc?: string
  illustrationSrc?: string
}

function ex(categoryId: UseCaseCategoryId, example: ExampleInput): UseCaseExample {
  return {
    ...example,
    illustrationSrc: example.illustrationSrc ?? getUseCaseIllustrationUrl(categoryId, example.id),
    videoPosterSrc: getUseCaseVideoPosterUrl(categoryId, example.id),
    videoEnabled: isUseCaseVideoEnabled(categoryId, example.id),
  }
}

export const VIDEO_CATEGORIES: UseCaseCategory[] = [
  {
    id: 'entertainment',
    title: 'Entertainment & Creator Series',
    qualifyingStatement: ENTERTAINMENT_CATEGORY_QUALIFYING_STATEMENT,
    examples: [
      ex('entertainment', {
        id: 'vertical-short-drama',
        label: 'YouTube TV Drama',
        description:
          'Imagine shipping 16:9 episodic drama on YouTube—where YouTube now holds 13.4% of U.S. TV viewing and over 35% of watch time happens on connected TV. SceneFlow helps creators grow that share with engaging alternative content: beat-first pre-vis, Reference Library continuity, and publish-ready widescreen masters.',
        videoSrc: `${BLOB_DEMO}/demo/use-cases/entertainment/vertical-short-drama.mp4`,
      }),
      ex('entertainment', {
        id: 'animated-web-series',
        label: 'Animated Web Series',
        description:
          'Imagine locking stylized characters in your Reference Library once—then shipping serialized episodes in anime, Pixar, or Ghibli-inspired art with the consistency indie hits like Glitch Productions demand.',
        videoSrc: `${BLOB_DEMO}/demo/use-cases/entertainment/animated-web-series.mp4`,
      }),
      ex('entertainment', {
        id: 'episodic-youtube-series',
        label: 'Episodic YouTube Series',
        description:
          'Imagine auto-generated season arcs in Series Studio—episode outlines sync into Blueprint and Production so every face, voice, and beat stays aligned across a growing channel.',
        videoSrc: `${BLOB_DEMO}/demo/use-cases/entertainment/episodic-youtube-series.mp4`,
      }),
      ex('entertainment', {
        id: 'creator-reality-competition',
        label: 'Creator Reality & Competition',
        description:
          'Imagine producing reality-scale creator competitions without a broadcast crew—multi-cam beats, stakeholder Screening Room reviews, and same-week turnaround from script to master MP4.',
        videoSrc: `${BLOB_DEMO}/demo/use-cases/entertainment/creator-reality-competition.mp4`,
      }),
      ex('entertainment', {
        id: 'ctv-ready-series',
        label: 'Vertical Mobile Drama',
        description:
          'Imagine photoreal 9:16 hooks and serialized mobile episodes built for scroll—approve Beat Frames before render, chain native extensions for emotional beats that stop the thumb. SceneFlow outputs vertical masters ready for YouTube Shorts and mobile feeds.',
        videoSrc: `${BLOB_DEMO}/demo/use-cases/entertainment/ctv-ready-series.mp4`,
      }),
    ],
  },
  {
    id: 'property',
    title: 'Property, Spaces & Hospitality',
    qualifyingStatement: PROPERTY_CATEGORY_QUALIFYING_STATEMENT,
    examples: [
      ex('property', {
        id: 'residential-real-estate',
        label: 'Residential Real Estate',
        description:
          'Imagine uploading your property images with your saved character reference and voice. Then instantly generating a professional listing walkthrough with your image and voice — in over 70 languages.',
        videoSrc: `${BLOB_DEMO}/Home%20Tour.mp4`,
      }),
      ex('property', {
        id: 'commercial-real-estate',
        label: 'Commercial Real Estate',
        description:
          "Imagine uploading floor plans, renderings, and neighborhood data with your broker's saved voice and avatar. Then instantly producing investor pitch walkthroughs that bring every square foot to life — localized in 70+ languages.",
        videoSrc: `${BLOB_DEMO}/demo/use-cases/property/commercial-real-estate.mp4`,
      }),
      ex('property', {
        id: 'short-term-rentals',
        label: 'Short-Term Rentals',
        description:
          "Imagine uploading house photos and amenity notes with your host's saved voice. Then instantly publishing digital welcome videos that greet every guest in their language — before they ever check in.",
        videoSrc: `${BLOB_DEMO}/demo/use-cases/property/short-term-rentals.mp4`,
      }),
      ex('property', {
        id: 'hospitality-tourism',
        label: 'Hospitality & Tourism',
        description:
          "Imagine uploading hotel photos and itinerary highlights with your brand's saved host voice and avatar. Then instantly shipping virtual tours and narrated travel guides in 70+ languages — no film crew per property.",
        videoSrc: `${BLOB_DEMO}/demo/use-cases/property/hospitality-tourism.mp4`,
      }),
      ex('property', {
        id: 'museum-gallery-guides',
        label: 'Museum & Gallery Guides',
        description:
          'Imagine uploading exhibit photos and curator notes as displays change. Then instantly refreshing narrated gallery tours in 70+ languages — no reshoot when the exhibition rotates.',
        videoSrc: `${BLOB_DEMO}/demo/use-cases/property/museum-gallery-guides.mp4`,
      }),
    ],
  },
  {
    id: 'knowledge',
    title: 'Knowledge, Training & Education',
    examples: [
      ex('knowledge', {
        id: 'k12-higher-ed',
        label: 'K-12 & Higher Ed',
        description:
          "Imagine uploading lesson materials with your instructor's saved voice and character reference. Then instantly generating full curriculum modules your ESL and global campus students can watch in 70+ languages.",
        videoSrc: `${BLOB_DEMO}/Astrophysics.mp4`,
      }),
      ex('knowledge', {
        id: 'corporate-ld',
        label: 'Corporate L&D',
        description:
          "Imagine uploading training slides with your L&D lead's saved voice. Then instantly publishing module videos—chain native +7 second extensions for long explainers, approve Beat Frames before render.",
        videoSrc: `${BLOB_DEMO}/demo/use-cases/knowledge/corporate-ld.mp4`,
      }),
      ex('knowledge', {
        id: 'software-saas-tutorials',
        label: 'Software SaaS Tutorials',
        description:
          "Imagine uploading UI screenshots as reference frames with your product expert's saved voice. Then instantly generating walkthrough videos that animate every click — updated the day your UI ships.",
        videoSrc: `${BLOB_DEMO}/demo/use-cases/knowledge/software-saas-tutorials.mp4`,
      }),
      ex('knowledge', {
        id: 'niche-skill-tutoring',
        label: 'Niche Skill Tutoring',
        description:
          "Imagine uploading step photos with your instructor's saved voice and character reference. Then instantly publishing professional how-to series — cooking, DIY, or certification prep — in 70+ languages.",
        videoSrc: `${BLOB_DEMO}/demo/use-cases/knowledge/niche-skill-tutoring.mp4`,
      }),
      ex('knowledge', {
        id: 'medical-patient-education',
        label: 'Medical/Patient Education',
        description:
          "Imagine uploading procedure diagrams with your clinician's approved saved voice. Then instantly generating clear patient education videos families can understand in 70+ languages.",
        videoSrc: `${BLOB_DEMO}/demo/use-cases/knowledge/medical-patient-education.mp4`,
      }),
      ex('knowledge', {
        id: 'video-memoirs',
        label: 'Video Memoirs',
        description:
          'Imagine uploading family photos, interview audio, and scene notes with a saved narrator voice. Then instantly shaping chapter-based memoir videos — approve the pre-vis before final render.',
        videoSrc: `${BLOB_DEMO}/KITCHEN.mp4`,
      }),
    ],
  },
  {
    id: 'jit',
    title: 'JIT Media & Information',
    examples: [
      ex('jit', {
        id: 'hyper-local-news',
        label: 'Hyper-Local News',
        description:
          "Imagine uploading today's photos and bulletins with your anchor's saved voice. Then instantly publishing a daily neighborhood news brief — no film crew, no missed deadline.",
        videoSrc: `${BLOB_DEMO}/demo/signal.mp4`,
      }),
      ex('jit', {
        id: 'financial-market-recaps',
        label: 'Financial & Market Recaps',
        description:
          "Imagine uploading market data and chart snapshots each morning with your analyst's saved voice. Then instantly turning them into a narrated visual digest — ready before the opening bell.",
        videoSrc: `${BLOB_DEMO}/demo/use-cases/jit/financial-market-recaps.mp4`,
      }),
      ex('jit', {
        id: 'sports-commentary',
        label: 'Sports Commentary',
        description:
          "Imagine uploading game stats and still photography with your commentator's saved voice. Then instantly generating recap videos with animated action — published while fans are still talking.",
        videoSrc: `${BLOB_DEMO}/demo/use-cases/jit/sports-commentary.mp4`,
      }),
      ex('jit', {
        id: 'true-crime-historical-docs',
        label: 'True Crime & Historical Docs',
        description:
          'Imagine locking historical figures in your Reference Library once. Then instantly producing multi-part episodes where every face and voice stays consistent — series after series.',
        videoSrc: `${BLOB_DEMO}/demo/use-cases/jit/true-crime-historical-docs.mp4`,
      }),
      ex('jit', {
        id: 'weather-emergency-alerts',
        label: 'Weather & Emergency Alerts',
        description:
          "Imagine uploading emergency bulletins with your agency's trusted saved voice. Then instantly broadcasting clear alerts in 70+ languages across social platforms — in minutes, not days.",
        videoSrc: `${BLOB_DEMO}/demo/use-cases/jit/weather-emergency-alerts.mp4`,
      }),
    ],
  },
  {
    id: 'b2b',
    title: 'B2B Marketing & Sales',
    examples: [
      ex('b2b', {
        id: 'product-explainer-videos',
        label: 'Product Explainer Videos',
        description:
          "Imagine uploading product catalog shots with your brand's saved presenter voice and avatar. Then instantly generating a cinematic explainer series — approve the pre-vis before you render.",
        videoSrc: `${BLOB_DEMO}/Demo.mp4`,
      }),
      ex('b2b', {
        id: 'case-study-testimonials',
        label: 'Case Study/Testimonials',
        description:
          'Imagine uploading client headshots, project photos, and success metrics with a saved narrator voice. Then instantly producing polished visual case studies — without a testimonial shoot.',
        videoSrc: `${BLOB_DEMO}/demo/use-cases/b2b/case-study-testimonials.mp4`,
      }),
      ex('b2b', {
        id: 'recruitment-branding',
        label: 'Recruitment & Branding',
        description:
          "Imagine uploading office photos and culture highlights with your recruiter's saved voice and avatar. Then instantly giving candidates a narrated day-in-the-life tour — in 70+ languages for global hiring.",
        videoSrc: `${BLOB_DEMO}/demo/use-cases/b2b/recruitment-branding.mp4`,
      }),
      ex('b2b', {
        id: 'conference-event-promos',
        label: 'Conference & Event Promos',
        description:
          "Imagine uploading speaker bios, session details, and venue photos with your event host's saved voice. Then instantly generating speaker intros and what-to-expect guides — refreshed every time the agenda changes.",
        videoSrc: `${BLOB_DEMO}/demo/use-cases/b2b/conference-event-promos.mp4`,
      }),
    ],
  },
  {
    id: 'public',
    title: 'Public Sector & Advocacy',
    examples: [
      ex('public', {
        id: 'ngo-impact-reports',
        label: 'NGO Impact Reports',
        description:
          "Imagine uploading field photography and impact data with your organization's saved narrator voice. Then instantly turning donor reports into emotive narrated videos — your mission's voice, not a slideshow.",
        videoSrc: `${BLOB_DEMO}/NGO.mp4`,
      }),
      ex('public', {
        id: 'public-health-announcements',
        label: 'Public Health Announcements',
        description:
          "Imagine uploading approved health messaging with your department's trusted saved voice. Then instantly reaching every community in 70+ languages — same clarity, same urgency, zero translation delay.",
        videoSrc: `${BLOB_DEMO}/demo/use-cases/public/public-health-announcements.mp4`,
      }),
      ex('public', {
        id: 'legal-insurance-explainers',
        label: 'Legal & Insurance Explainers',
        description:
          "Imagine uploading contract summaries and process diagrams with your advisor's saved voice. Then instantly generating visual breakdowns clients actually understand — before they sign or file a claim.",
        videoSrc: `${BLOB_DEMO}/demo/use-cases/public/legal-insurance-explainers.mp4`,
      }),
      ex('public', {
        id: 'religious-spiritual-teachings',
        label: 'Religious & Spiritual Teachings',
        description:
          "Imagine uploading sermon notes or sacred texts with your teacher's saved voice and presence. Then instantly publishing a consistent daily video series for global congregations — in 70+ languages.",
        videoSrc: `${BLOB_DEMO}/demo/use-cases/public/religious-spiritual-teachings.mp4`,
      }),
    ],
  },
]

export function getUseCaseCategory(categoryId: string): UseCaseCategory | undefined {
  return VIDEO_CATEGORIES.find((cat) => cat.id === categoryId)
}

export function getUseCaseExample(
  categoryId: string,
  exampleId: string
): UseCaseExample | undefined {
  return getUseCaseCategory(categoryId)?.examples.find((ex) => ex.id === exampleId)
}

export function getDefaultExampleId(categoryId: string): string | undefined {
  return getUseCaseCategory(categoryId)?.examples[0]?.id
}

export function buildUseCaseExampleHash(categoryId: string, exampleId: string): string {
  return `use-cases-${categoryId}-${exampleId}`
}

export function parseUseCaseExampleHash(
  hash: string
): { categoryId: UseCaseCategoryId; exampleId: string } | null {
  for (const categoryId of USE_CASE_CATEGORY_IDS) {
    const prefix = `use-cases-${categoryId}-`
    if (!hash.startsWith(prefix)) continue

    const exampleId = hash.slice(prefix.length)
    if (!exampleId) return null

    if (getUseCaseExample(categoryId, exampleId)) {
      return { categoryId, exampleId }
    }
  }

  return null
}

export function hasUseCaseExampleVideo(example: UseCaseExample): boolean {
  return Boolean(example.videoEnabled && example.videoSrc?.trim())
}
