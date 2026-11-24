import type { IntakeVerticalId } from '@/lib/intake/intakePlaybooks'
import type { BrandProfileSnapshot } from '@/lib/producer/producerProfileService'

export type ShowcaseCategoryId = 'milestones' | 'commercial'

export type ShowcaseOfferId =
  | 'family_legacy'
  | 'wedding_love'
  | 'graduation_milestone'
  | 'retirement_tribute'
  | 'real_estate_express'
  | 'brand_express'
  | 'training_express'

export type ShowcaseVideoSlug = 'memoir' | 'realestate' | 'brand' | 'training'

export interface ExpressShowcaseOffer {
  id: ShowcaseOfferId
  category: ShowcaseCategoryId
  vertical: IntakeVerticalId
  videoSlug: ShowcaseVideoSlug
  badge: string
  title: string
  subtitle: string
  idealFor: string
  runtimeLabel: string
  turnaroundLabel: string
  blueprintPassUsd: number
  totalPriceUsd: number
  balanceDueUsd: number
  posterImage: string
  sampleVideoUrl: string
  sampleVideoPoster: string
  sampleTitle: string
  sampleCaption: string
  deliverables: readonly string[]
  /** Prompt hint carried into the guided story intake so the AI interviewer tailors questions to the occasion */
  occasionPromptContext: string
  titlePlaceholder: string
}

export const SHOWCASE_BRAND_SNAPSHOT: BrandProfileSnapshot = {
  brandName: 'Keepsake Cinema',
  primaryColor: '#D9A760',
  logoUrl: null,
  supportEmail: 'support@sceneflowai.studio',
  hideSceneFlowBranding: false,
}

export const EXPRESS_BLUEPRINT_PASS_USD = 29

export const EXPRESS_SHOWCASE_OFFERS: readonly ExpressShowcaseOffer[] = [
  {
    id: 'family_legacy',
    category: 'milestones',
    vertical: 'video_memoir',
    videoSlug: 'memoir',
    badge: 'Most Popular · Life & Milestones',
    title: 'Life Stories & Family Memoirs, Weddings, Graduations, and more',
    subtitle:
      'Go deep—tell an unforgettable 30 to 150 minute feature-length life story covering every chapter from childhood roots and career triumphs to family traditions, weddings, graduations, or retirements. Your $149 package includes up to 1 hour (360 directed 4K frames) plus a shareable 1–3 min theatrical trailer (longer films available).',
    idealFor:
      '70th/80th birthdays, family legacies, weddings & anniversaries, graduations, retirements & celebrations of life',
    runtimeLabel: 'Up to 60 min (360 frames) · + 1–3 min Trailer',
    turnaroundLabel: 'Same-Day (2–4 hrs after photo lock)',
    blueprintPassUsd: 29,
    totalPriceUsd: 149,
    balanceDueUsd: 120,
    posterImage: '/landing/video-services/memoir-1.webp',
    sampleVideoUrl: '/landing/video-services/videos/express-memoir-en.mp4',
    sampleVideoPoster: '/landing/video-services/videos/memoir-poster.webp',
    sampleTitle: 'Family Legacy & Life Story Sample',
    sampleCaption:
      '2-min preview example — $149 package delivers up to a 60-min (360-frame) 4K feature film + 1–3 min trailer (expandable to 150 min).',
    deliverables: [
      'Up to 60-min Longform 4K Feature (360 directed frames; extendable to 150 min)',
      '1–3 min Shareable Theatrical Trailer included for family & event invites',
      'Continuity lock: age-28 de-aging, relative matching, hometowns & heirlooms',
      '90%+ resonance multi-chapter script, voice cloning/matching & stereo score',
    ],
    occasionPromptContext:
      'Family Legacy / Life Story Memoir honoring a loved one’s key chapters, influential people, cherished traditions, and lasting impact.',
    titlePlaceholder: 'e.g., Grandpa Mateo’s 80th Birthday Story',
  },
  {
    id: 'wedding_love',
    category: 'milestones',
    vertical: 'video_memoir',
    videoSlug: 'memoir',
    badge: 'Weddings & Anniversaries',
    title: 'Love Stories, Weddings & Vow Renewals',
    subtitle:
      'Turn how you met, favorite trips, proposals, and family blessings into a theater-worthy 4K film ready to screen at the rehearsal dinner, reception, or 25th/50th anniversary.',
    idealFor: 'Rehearsal dinners, wedding receptions, 25th & 50th anniversaries, engagement films',
    runtimeLabel: 'Up to 60 min (360 frames) · + 1–3 min Trailer',
    turnaroundLabel: 'Same-Day (2–4 hrs after photo lock)',
    blueprintPassUsd: 29,
    totalPriceUsd: 149,
    balanceDueUsd: 120,
    posterImage: '/landing/video-services/memoir-2.webp',
    sampleVideoUrl: '/landing/video-services/videos/express-memoir-en.mp4',
    sampleVideoPoster: '/landing/video-services/videos/memoir-poster.webp',
    sampleTitle: 'Anniversary & Milestone Tribute Sample',
    sampleCaption:
      'Heartfelt narrated chapter progression crafted from couple photos, romantic locations, and multi-language family editions.',
    deliverables: [
      'Story Blueprint + family/wedding-party comment triage link',
      'Upload favorite couple & proposal photos right from your phone',
      'Warm narration, ambient soundscapes & cinematic score',
      'Downloadable 4K MP4 ready for venue projectors & TVs',
    ],
    occasionPromptContext:
      'Wedding / Anniversary Love Story celebrating how the couple met, defining moments together, family & friends, and their next chapter.',
    titlePlaceholder: 'e.g., Claire & Daniel — From Lisbon to Forever',
  },
  {
    id: 'graduation_milestone',
    category: 'milestones',
    vertical: 'video_memoir',
    videoSlug: 'memoir',
    badge: 'Graduations & Coming-of-Age',
    title: 'Graduation & Coming-of-Age Tributes',
    subtitle:
      'Celebrate high school, college, or medical/law school graduation with a moving 4K story—from first steps and sports wins to late-night study sessions and cap-and-gown pride.',
    idealFor: 'High school & university graduations, scholarship banquets, senior night & send-offs',
    runtimeLabel: 'Up to 60 min (360 frames) · + 1–3 min Trailer',
    turnaroundLabel: 'Same-Day (ready for the weekend party)',
    blueprintPassUsd: 29,
    totalPriceUsd: 149,
    balanceDueUsd: 120,
    posterImage: '/landing/video-services/memoir-1.webp',
    sampleVideoUrl: '/landing/video-services/videos/express-memoir-en.mp4',
    sampleVideoPoster: '/landing/video-services/videos/memoir-poster.webp',
    sampleTitle: 'Coming-of-Age & Milestone Cinema Sample',
    sampleCaption:
      'Childhood keepsake photos paired with bespoke illustrated beats, upbeat narrative pacing, and uplifting score.',
    deliverables: [
      'Fast 5-minute guided intake with milestone memory-jogger chips',
      'Gather notes from parents, coaches & siblings via guest link',
      'Phone photo uploads + name/school pronunciation guide',
      'Crisp 4K MP4 ready for graduation parties & family sharing',
    ],
    occasionPromptContext:
      'Graduation & Coming-of-Age Tribute highlighting childhood roots, school/sports/arts achievements, mentors, and dreams ahead.',
    titlePlaceholder: 'e.g., Maya’s Class of 2026 Journey',
  },
  {
    id: 'retirement_tribute',
    category: 'milestones',
    vertical: 'video_memoir',
    videoSlug: 'brand',
    badge: 'Retirements & Career Legacy',
    title: 'Retirement & Career Milestone Films',
    subtitle:
      'Honor 20–40 years of leadership, mentorship, and unforgettable workplace moments in a polished 4K tribute film—complete with colleague anecdotes gathered via one private link.',
    idealFor: 'Retirement dinners, executive farewells, military/first-responder honors, founder tributes',
    runtimeLabel: 'Up to 60 min (360 frames) · + 1–3 min Trailer',
    turnaroundLabel: 'Same-Day (2–4 hrs after photo lock)',
    blueprintPassUsd: 29,
    totalPriceUsd: 149,
    balanceDueUsd: 120,
    posterImage: '/landing/video-services/brand-2.webp',
    sampleVideoUrl: '/landing/video-services/videos/express-brand-en.mp4',
    sampleVideoPoster: '/landing/video-services/videos/brand-poster.webp',
    sampleTitle: 'Career & Founder Tribute Sample',
    sampleCaption:
      'Executive-grade documentary pacing honoring decades of work, team milestones, and family next chapters.',
    deliverables: [
      'Share a guest comment link so teammates can add stories easily',
      'Upload career photos, team shots & workplace milestones',
      'Studio narration + 10-second name/company pronunciation guide',
      '4K MP4 master ready for banquet screens & Zoom farewells',
    ],
    occasionPromptContext:
      'Retirement & Career Legacy Tribute honoring decades of service, signature projects, colleagues mentored, and life after retirement.',
    titlePlaceholder: 'e.g., 35 Years of Leadership — Captain Robert Hayes',
  },
  {
    id: 'real_estate_express',
    category: 'commercial',
    vertical: 'real_estate_tour',
    videoSlug: 'realestate',
    badge: 'Real Estate · Same-Day 4K',
    title: 'Express 4K Property Listing Film',
    subtitle:
      'Go far beyond a 60-second slideshow. Walk buyers deeply through every room, architectural upgrades, chef-grade appliances, outdoor living, schools, and neighborhood lifestyle—includes up to 60 min (360 directed 4K frames) plus a 1–3 min MLS & social overview trailer.',
    idealFor: 'Luxury estates, residential listings, out-of-town buyers, boutique hotels & vacation rentals',
    runtimeLabel: 'Up to 60 min (360 frames) · Deep Tour + 1–3 min Trailer',
    turnaroundLabel: 'Same-Day (2–3 hrs)',
    blueprintPassUsd: 29,
    totalPriceUsd: 149,
    balanceDueUsd: 120,
    posterImage: '/landing/video-services/realestate-1.webp',
    sampleVideoUrl: '/landing/video-services/videos/express-realestate-en.mp4',
    sampleVideoPoster: '/landing/video-services/videos/realestate-poster.webp',
    sampleTitle: 'Real Estate 4K Listing Film Sample',
    sampleCaption:
      '2-min preview example — $149 buys a deep-dive property & neighborhood film (up to 60 min / 360 frames) + 1–3 min trailer.',
    deliverables: [
      'Deep-dive 4K property & neighborhood film (up to 60 min / 360 frames)',
      '1–3 min MLS & social highlight trailer included for instant buyer hooks',
      'Room-by-room updates, luxury appliances, schools & lifestyle storytelling',
      'Multilingual buyer dubs (70+ languages) + commercial-licensed 4K master',
    ],
    occasionPromptContext:
      'Real Estate Express 4K Listing Film showcasing architectural highlights, lifestyle appeal, and neighborhood amenities.',
    titlePlaceholder: 'e.g., 420 Harbor Crest Oceanview Residence',
  },
  {
    id: 'brand_express',
    category: 'commercial',
    vertical: 'brand_story',
    videoSlug: 'brand',
    badge: 'Brand Story & Clinics · Same-Day 4K',
    title: 'Express 4K Founder & Practice Film',
    subtitle:
      'Tell the complete documentary story behind your clinic, firm, or flagship brand—founder origin, client transformations, facility walkthrough, and team philosophy—up to 60 min (360 directed 4K frames) plus a 1–3 min high-converting homepage trailer.',
    idealFor: 'Medical/dental clinics, law firms, craft founders, local businesses & nonprofits',
    runtimeLabel: 'Up to 60 min (360 frames) · Brand Doc + 1–3 min Trailer',
    turnaroundLabel: 'Same-Day (2–4 hrs)',
    blueprintPassUsd: 29,
    totalPriceUsd: 199,
    balanceDueUsd: 170,
    posterImage: '/landing/video-services/brand-1.webp',
    sampleVideoUrl: '/landing/video-services/videos/express-brand-en.mp4',
    sampleVideoPoster: '/landing/video-services/videos/brand-poster.webp',
    sampleTitle: 'Founder & Practice Brand Film Sample',
    sampleCaption:
      '2-min preview example — package delivers a deep-dive brand documentary (up to 60 min / 360 frames) + 1–3 min trailer.',
    deliverables: [
      'Longform 4K founder & brand documentary (up to 60 min / 360 frames)',
      '1–3 min homepage & social trailer included to convert visitors fast',
      'Lock founder, clinic/office, signature products & pronunciation lock',
      '90%+ target audience resonance script + 100% commercial 4K master',
    ],
    occasionPromptContext:
      'Founder & Practice Brand Film communicating origin story, client trust, core outcomes, and call to action.',
    titlePlaceholder: 'e.g., Pacific Coast Family Dental — Our Story',
  },
  {
    id: 'training_express',
    category: 'commercial',
    vertical: 'education_module',
    videoSlug: 'training',
    badge: 'Training & SOPs · Same-Day 4K',
    title: 'Express 4K Narrated Training & SOP Film',
    subtitle:
      'Convert 50-page manuals, onboarding playbooks, or compliance protocols into an engaging multi-module 4K training course (up to 60 min / 360 directed frames; extendable to 150-min curricula) with locked instructors, real equipment visuals & a 1–3 min overview trailer.',
    idealFor: 'Employee onboarding, workplace safety, clinic SOPs, franchise playbooks & certification courses',
    runtimeLabel: 'Up to 60 min (360 frames) · Full Course + 1–3 min Overview',
    turnaroundLabel: 'Same-Day (2–4 hrs)',
    blueprintPassUsd: 29,
    totalPriceUsd: 249,
    balanceDueUsd: 220,
    posterImage: '/landing/video-services/training-1.webp',
    sampleVideoUrl: '/landing/video-services/videos/express-training-en.mp4',
    sampleVideoPoster: '/landing/video-services/videos/training-poster.webp',
    sampleTitle: 'Narrated 4K Training Module Sample',
    sampleCaption:
      '2-min preview example — package builds full multi-module training courses (up to 60 min / 360 frames; extendable to 150 min).',
    deliverables: [
      'Multi-module 4K training course (up to 60 min / 360 frames; extendable)',
      '1–3 min executive & new-hire overview trailer included',
      'Locked instructor, uniform, workplace & safety equipment visuals',
      'Technical acronym pronunciation lock + LMS-ready 4K master in 70+ langs',
    ],
    occasionPromptContext:
      'Narrated Corporate Training / SOP Film transforming operational guidelines into clear visual chapters.',
    titlePlaceholder: 'e.g., New Hire Safety & Equipment Onboarding',
  },
] as const

/**
 * The 4 non-redundant featured storefront cards — one unique video example per vertical
 * (Life & Milestones, Real Estate, Brand Story, and Training & SOP).
 * Occasion-specific IDs (`wedding_love`, `graduation_milestone`, `retirement_tribute`)
 * remain in `EXPRESS_SHOWCASE_OFFERS` for tailored intake prompts and checkout compatibility.
 */
export const FEATURED_STOREFRONT_OFFER_IDS: readonly ShowcaseOfferId[] = [
  'family_legacy',
  'real_estate_express',
  'brand_express',
  'training_express',
] as const

export const FEATURED_STOREFRONT_OFFERS: readonly ExpressShowcaseOffer[] =
  FEATURED_STOREFRONT_OFFER_IDS.map(
    (id) => EXPRESS_SHOWCASE_OFFERS.find((o) => o.id === id)!
  )

export function getShowcaseOfferById(id?: string | null): ExpressShowcaseOffer {
  const found = EXPRESS_SHOWCASE_OFFERS.find((o) => o.id === id)
  return found ?? EXPRESS_SHOWCASE_OFFERS[0]
}

export function getShowcaseOfferByVertical(vertical?: string | null): ExpressShowcaseOffer {
  const found = EXPRESS_SHOWCASE_OFFERS.find((o) => o.vertical === vertical)
  return found ?? EXPRESS_SHOWCASE_OFFERS[0]
}
