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
    badge: 'Most Popular · Family Legacy',
    title: 'Life Stories & Family Memoirs',
    subtitle:
      'Preserve a parent’s or grandparent’s journey—from childhood roots to today—blending real family photos with photorealistic era scenes, warm narration, and bespoke score.',
    idealFor: '70th/80th birthdays, parents & grandparents, celebrations of life, family reunions',
    runtimeLabel: '5–8 min · 4K Cinema',
    turnaroundLabel: 'Same-Day (2–4 hrs after photo lock)',
    blueprintPassUsd: 29,
    totalPriceUsd: 149,
    balanceDueUsd: 120,
    posterImage: '/landing/video-services/memoir-1.webp',
    sampleVideoUrl: '/landing/video-services/videos/express-memoir-en.mp4',
    sampleVideoPoster: '/landing/video-services/videos/memoir-poster.webp',
    sampleTitle: 'Family Legacy & Life Story Sample',
    sampleCaption:
      'Photorealistic continuity-locked 4K frames, smooth documentary camera motion, studio voices, SFX & original underscore.',
    deliverables: [
      'Illustrated & narrated Storyboard Blueprint in ~3 min',
      'Private comment-only sharing link for siblings & relatives',
      'Continuity photo library + 10-second name pronunciation guide',
      'Auto-rendered 4K MP4 Master delivered to your inbox',
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
    runtimeLabel: '5–7 min · 4K Cinema',
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
    runtimeLabel: '4–6 min · 4K Cinema',
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
    runtimeLabel: '5–8 min · 4K Cinema',
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
      'Transform existing MLS listing photos and neighborhood highlights into a voiced, scored 4K cinema tour the same day—zero weather delays or extra camera crews.',
    idealFor: 'Residential listings, luxury estates, boutique hotels & vacation rentals',
    runtimeLabel: '90 sec · 4K Cinema',
    turnaroundLabel: 'Same-Day (2–3 hrs)',
    blueprintPassUsd: 29,
    totalPriceUsd: 149,
    balanceDueUsd: 120,
    posterImage: '/landing/video-services/realestate-1.webp',
    sampleVideoUrl: '/landing/video-services/videos/express-realestate-en.mp4',
    sampleVideoPoster: '/landing/video-services/videos/realestate-poster.webp',
    sampleTitle: 'Real Estate 4K Listing Film Sample',
    sampleCaption:
      'Smooth 4K architectural Ken Burns pans, warm luxury voiceover, ambient sound design & music.',
    deliverables: [
      'Room-by-room Storyboard Blueprint in ~3 min',
      'Upload MLS listing stills directly from phone or desktop',
      'Optional multilingual dubs for international buyers',
      'Commercial-licensed 4K MP4 ready for MLS & social',
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
    badge: 'Business & Clinics · Same-Day 4K',
    title: 'Express 4K Founder & Practice Film',
    subtitle:
      'Give your website a trustworthy, cinema-grade homepage story without a $5,000 agency shoot—combining photorealistic visuals, crisp narration, and music in 4K.',
    idealFor: 'Medical/dental clinics, law firms, craft founders, local businesses & nonprofits',
    runtimeLabel: '90 sec–2 min · 4K Cinema',
    turnaroundLabel: 'Same-Day (2–4 hrs)',
    blueprintPassUsd: 29,
    totalPriceUsd: 199,
    balanceDueUsd: 170,
    posterImage: '/landing/video-services/brand-1.webp',
    sampleVideoUrl: '/landing/video-services/videos/express-brand-en.mp4',
    sampleVideoPoster: '/landing/video-services/videos/brand-poster.webp',
    sampleTitle: 'Founder & Practice Brand Film Sample',
    sampleCaption:
      'High-trust homepage narrative film with locked founder visuals, custom narration, SFX & commercial rights.',
    deliverables: [
      'Conversion-focused Storyboard Blueprint + team review link',
      'Lock founder, clinic/office & signature brand visuals',
      '10-second brand & leadership pronunciation guide',
      '100% commercial-licensed 4K MP4 master',
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
      'Convert manuals, onboarding checklists, or safety protocols into a clear, instructor-locked 4K narrated training module—easy to update whenever policies change.',
    idealFor: 'Employee onboarding, workplace safety, clinic SOPs & franchise playbooks',
    runtimeLabel: '5 min · 4K Cinema',
    turnaroundLabel: 'Same-Day (2–4 hrs)',
    blueprintPassUsd: 29,
    totalPriceUsd: 249,
    balanceDueUsd: 220,
    posterImage: '/landing/video-services/training-1.webp',
    sampleVideoUrl: '/landing/video-services/videos/express-training-en.mp4',
    sampleVideoPoster: '/landing/video-services/videos/training-poster.webp',
    sampleTitle: 'Narrated 4K Training Module Sample',
    sampleCaption:
      'Consistent presenter & workplace visual continuity paired with crystal-clear voiceover and chapter structure.',
    deliverables: [
      'Structured chapter Blueprint + stakeholder sign-off link',
      'Locked presenter, uniform & workplace visual library',
      'Technical terminology & acronym pronunciation guide',
      'LMS-ready 4K MP4 master with commercial ownership',
    ],
    occasionPromptContext:
      'Narrated Corporate Training / SOP Film transforming operational guidelines into clear visual chapters.',
    titlePlaceholder: 'e.g., New Hire Safety & Equipment Onboarding',
  },
] as const

export function getShowcaseOfferById(id?: string | null): ExpressShowcaseOffer {
  const found = EXPRESS_SHOWCASE_OFFERS.find((o) => o.id === id)
  return found ?? EXPRESS_SHOWCASE_OFFERS[0]
}

export function getShowcaseOfferByVertical(vertical?: string | null): ExpressShowcaseOffer {
  const found = EXPRESS_SHOWCASE_OFFERS.find((o) => o.vertical === vertical)
  return found ?? EXPRESS_SHOWCASE_OFFERS[0]
}
