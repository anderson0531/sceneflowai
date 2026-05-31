export type UseCaseCategoryId = 'property' | 'knowledge' | 'jit' | 'b2b' | 'public'

export type UseCaseExample = {
  id: string
  label: string
  description: string
  videoSrc?: string
}

export type UseCaseCategory = {
  id: UseCaseCategoryId
  title: string
  examples: UseCaseExample[]
}

const BLOB_DEMO = 'https://xxavfkdhdebrqida.public.blob.vercel-storage.com'

export const USE_CASE_CATEGORY_IDS: UseCaseCategoryId[] = [
  'property',
  'knowledge',
  'jit',
  'b2b',
  'public',
]

export const VIDEO_CATEGORIES: UseCaseCategory[] = [
  {
    id: 'property',
    title: 'Property, Spaces & Hospitality',
    examples: [
      {
        id: 'residential-real-estate',
        label: 'Residential Real Estate',
        description:
          "Automated listing tours featuring the agent's cloned voice and avatar identity.",
        videoSrc: '/demo/property-hospitality.mp4',
      },
      {
        id: 'commercial-real-estate',
        label: 'Commercial Real Estate',
        description:
          'Investor pitch videos showing floor plans, 3D renderings of future developments, and neighborhood data.',
        videoSrc: `${BLOB_DEMO}/demo/use-cases/property/commercial-real-estate.mp4`,
      },
      {
        id: 'short-term-rentals',
        label: 'Short-Term Rentals',
        description:
          'Automated "Digital Welcome Books" that walk guests through house features and local "best of" spots.',
        videoSrc: `${BLOB_DEMO}/demo/use-cases/property/short-term-rentals.mp4`,
      },
      {
        id: 'hospitality-tourism',
        label: 'Hospitality & Tourism',
        description: 'Hotel virtual tours and narrated travel itineraries for agencies.',
        videoSrc: `${BLOB_DEMO}/demo/use-cases/property/hospitality-tourism.mp4`,
      },
      {
        id: 'museum-gallery-guides',
        label: 'Museum & Gallery Guides',
        description:
          'Multi-language audio-visual "tours" for exhibitions that can be updated JIT as exhibits change.',
        videoSrc: `${BLOB_DEMO}/demo/use-cases/property/museum-gallery-guides.mp4`,
      },
    ],
  },
  {
    id: 'knowledge',
    title: 'Knowledge, Training & Education',
    examples: [
      {
        id: 'k12-higher-ed',
        label: 'K-12 & Higher Ed',
        description:
          '30-minute curriculum modules that can be instantly localized for ESL students or global campuses.',
        videoSrc: 'https://storage.googleapis.com/sceneflow-assets/demo/living-wall.mp4',
      },
      {
        id: 'corporate-ld',
        label: 'Corporate L&D',
        description:
          'Compliance training, safety protocols, and new-hire onboarding that stays consistent across global offices.',
        videoSrc: `${BLOB_DEMO}/demo/use-cases/knowledge/corporate-ld.mp4`,
      },
      {
        id: 'software-saas-tutorials',
        label: 'Software SaaS Tutorials',
        description:
          'Automated "walk-throughs" using UI screenshots as reference images for F2V motion.',
        videoSrc: `${BLOB_DEMO}/demo/use-cases/knowledge/software-saas-tutorials.mp4`,
      },
      {
        id: 'niche-skill-tutoring',
        label: 'Niche Skill Tutoring',
        description:
          'Professional "How-To" series for cooking, DIY, or technical certifications.',
        videoSrc: `${BLOB_DEMO}/demo/use-cases/knowledge/niche-skill-tutoring.mp4`,
      },
      {
        id: 'medical-patient-education',
        label: 'Medical/Patient Education',
        description:
          'Narrated explanations of surgical procedures or medication management for hospitals and clinics.',
        videoSrc: `${BLOB_DEMO}/demo/use-cases/knowledge/medical-patient-education.mp4`,
      },
      {
        id: 'video-memoirs',
        label: 'Video Memoirs',
        description:
          'Turn uploaded photos, interview audio, and scene notes into chapter-based memoir videos with narrated storyboard approval before final render.',
        videoSrc: `${BLOB_DEMO}/demo/use-cases/knowledge/video-memoirs.mp4`,
      },
    ],
  },
  {
    id: 'jit',
    title: 'JIT Media & Information',
    examples: [
      {
        id: 'hyper-local-news',
        label: 'Hyper-Local News',
        description:
          'Automated daily news briefs for small towns or specific neighborhoods where a film crew is too expensive.',
        videoSrc: `${BLOB_DEMO}/demo/signal.mp4`,
      },
      {
        id: 'financial-market-recaps',
        label: 'Financial & Market Recaps',
        description:
          'Turning daily stock market or crypto data into 3-minute narrated visual digests.',
        videoSrc: `${BLOB_DEMO}/demo/use-cases/jit/financial-market-recaps.mp4`,
      },
      {
        id: 'sports-commentary',
        label: 'Sports Commentary',
        description:
          'Automated "recap" videos using game stats and static photography turned into F2V action.',
        videoSrc: `${BLOB_DEMO}/demo/use-cases/jit/sports-commentary.mp4`,
      },
      {
        id: 'true-crime-historical-docs',
        label: 'True Crime & Historical Docs',
        description:
          'Using the Reference Library to keep historical figures consistent across a multi-part documentary series.',
        videoSrc: `${BLOB_DEMO}/demo/use-cases/jit/true-crime-historical-docs.mp4`,
      },
      {
        id: 'weather-emergency-alerts',
        label: 'Weather & Emergency Alerts',
        description:
          'Multilingual emergency broadcasts that need to be generated and published in minutes across social platforms.',
        videoSrc: `${BLOB_DEMO}/demo/use-cases/jit/weather-emergency-alerts.mp4`,
      },
    ],
  },
  {
    id: 'b2b',
    title: 'B2B Marketing & Sales',
    examples: [
      {
        id: 'product-explainer-videos',
        label: 'Product Explainer Videos',
        description:
          'Turning a static product catalog into a cinematic series of "Why You Need This" videos.',
        videoSrc: `${BLOB_DEMO}/Demo.mp4`,
      },
      {
        id: 'case-study-testimonials',
        label: 'Case Study/Testimonials',
        description:
          'Using client headshots and project photos to create high-end visual success stories.',
        videoSrc: `${BLOB_DEMO}/demo/use-cases/b2b/case-study-testimonials.mp4`,
      },
      {
        id: 'recruitment-branding',
        label: 'Recruitment & Branding',
        description:
          'Giving candidates a narrated "day in the life" tour of the office and culture.',
        videoSrc: `${BLOB_DEMO}/demo/use-cases/b2b/recruitment-branding.mp4`,
      },
      {
        id: 'conference-event-promos',
        label: 'Conference & Event Promos',
        description:
          'Automated "Speaker Bio" videos and "What to Expect" guides for large-scale events.',
        videoSrc: `${BLOB_DEMO}/demo/use-cases/b2b/conference-event-promos.mp4`,
      },
    ],
  },
  {
    id: 'public',
    title: 'Public Sector & Advocacy',
    examples: [
      {
        id: 'ngo-impact-reports',
        label: 'NGO Impact Reports',
        description:
          'Turning data and field photography into emotive, narrated videos for donors.',
        videoSrc: `${BLOB_DEMO}/NGO.mp4`,
      },
      {
        id: 'public-health-announcements',
        label: 'Public Health Announcements',
        description:
          'Universal messaging (vaccination, hygiene, safety) that needs to hit 70+ languages with perfect clarity.',
        videoSrc: `${BLOB_DEMO}/demo/use-cases/public/public-health-announcements.mp4`,
      },
      {
        id: 'legal-insurance-explainers',
        label: 'Legal & Insurance Explainers',
        description:
          'Helping clients understand complex contracts or claim processes through narrated visual breakdowns.',
        videoSrc: `${BLOB_DEMO}/demo/use-cases/public/legal-insurance-explainers.mp4`,
      },
      {
        id: 'religious-spiritual-teachings',
        label: 'Religious & Spiritual Teachings',
        description:
          'Converting sermons or texts into a consistent, narrated daily video series for global congregations.',
        videoSrc: `${BLOB_DEMO}/demo/use-cases/public/religious-spiritual-teachings.mp4`,
      },
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
  return Boolean(example.videoSrc?.trim())
}
