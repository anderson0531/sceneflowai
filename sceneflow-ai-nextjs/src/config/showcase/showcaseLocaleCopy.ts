/**
 * 14-Language Localization Pack for Keepsake Cinema (`/showcase` & `/showcase/order/[orderId]`)
 * Supported locales: en (USD), es (MXN), pt (BRL), hi (INR), zh-CN (CNY), ar (SAR, RTL), th (THB),
 * ja (JPY), ko (KRW), de (EUR), fr (EUR), it (EUR), nl (EUR), ru (RUB).
 *
 * Inline `$29`, `$120`, `$149`, `$199`, `$249`, `$2,500+` tokens are formatted dynamically
 * via `localizeUsdText` / `formatLandingCurrency` from `@/lib/i18n/landingCurrency`.
 */

import type { ClientPortalLocale } from '@/lib/intake/clientPortalCopy'
import type { ShowcaseOfferId } from './expressCinemaCatalog'

export interface ShowcaseOfferLocaleCopy {
  badge: string
  title: string
  subtitle: string
  idealFor: string
  runtimeLabel: string
  turnaroundLabel: string
  deliverables: readonly [string, string, string, string]
  titlePlaceholder: string
}

export interface ShowcaseLocaleCopy {
  shortCode: string
  nativeLabel: string
  brandSubtitleMobile: string
  brandSubtitleDesktop: string
  topBarBadge: string
  topBarSubtext: string
  topBarCtaMobile: string
  topBarCtaDesktop: string
  nav: {
    occasions: string
    howItWorks: string
    expressQuality: string
    faq: string
    ctaMobile: string
    ctaDesktop: string
  }
  hero: {
    eyebrow: string
    titlePrefix: string
    titleAccent: string
    titleSuffix: string
    subtitleLead: string
    subtitleHighlight1: string
    subtitleMid: string
    subtitleHighlight2: string
    subtitleEnd: string
    metric1Sub: string
    metric2Sub: string
    metric3Val: string
    metric3Sub: string
    primaryCta: string
    secondaryCta: string
    trustWhop: string
    trustPrivacy: string
    trustLanguages: string
  }
  theater: {
    eyebrow: string
    watchSamplePrefix: string
    sameDayTagSuffix: string
    formatToggle: {
      express4kLabel: string
      express4kSub: string
      fullMotionLabel: string
      fullMotionSub: string
      fullMotionEyebrow: string
      fullMotionTagSuffix: string
      express4kNote: string
      fullMotionNote: string
      cardExpressBadge: string
      cardFullMotionBadge: string
      watchExpressPrefix: string
      watchFullMotionPrefix: string
      heroSwitchPrefix: string
      heroOrFullMotion: string
    }
    tabs: readonly [
      { id: ShowcaseOfferId; label: string; caption: string; priceUsd: number; videoSlug: string },
      { id: ShowcaseOfferId; label: string; caption: string; priceUsd: number; videoSlug: string },
      { id: ShowcaseOfferId; label: string; caption: string; priceUsd: number; videoSlug: string },
      { id: ShowcaseOfferId; label: string; caption: string; priceUsd: number; videoSlug: string },
    ]
  }
  occasions: {
    eyebrow: string
    heading: string
    subtitle: string
    tabAll: string
    tabMilestones: string
    tabCommercial: string
    groupMilestonesHeading: string
    groupCommercialHeading: string
    groupCommercialSub: string
    idealForLabel: string
    cardCta: string
    offers: Record<ShowcaseOfferId, ShowcaseOfferLocaleCopy>
  }
  steps: {
    eyebrow: string
    heading: string
    subtitle: string
    items: readonly [
      { tag: string; title: string; body: string; highlight: string },
      { tag: string; title: string; body: string; highlight: string },
      { tag: string; title: string; body: string; highlight: string },
    ]
  }
  clarity: {
    badge: string
    heading: string
    body: string
    bullets: readonly [string, string, string, string]
    partnerHeading: string
    partnerBody1: string
    partnerBody2: string
    partnerPrimaryCta: string
    partnerSecondaryCta: string
  }
  faq: {
    eyebrow: string
    heading: string
    items: readonly Array<{ q: string; a: string }>[number][]
  }
  footer: {
    referenceTag: string
    body: string
    primaryCta: string
    secondaryCta: string
  }
  modal: {
    stepBadge: string
    linePass: string
    lineBalance: string
    lineTotal: string
    whopNotice: string
    currencyNote: string
    instantLinkNote: string
    fieldOccasion: string
    fieldTitle: string
    fieldName: string
    fieldNamePlaceholder: string
    fieldLanguage: string
    fieldLanguageHint: string
    whopRefBadge: string
    fieldEmail: string
    fieldEmailPlaceholder: string
    submitIdlePrefix: string
    submitBusy: string
    errorFallback: string
    errorNetwork: string
    totalOptionSuffix: string
    todayOptionSuffix: string
  }
  orderPage: {
    whopBadgeShort: string
    whopBadgeFull: string
    loading: string
    notFound: string
    returnCta: string
    confirmedTag: string
    unlockedTitle: string
    welcomePrefix: string
    unlockedBody: string
    passBody: string
    emailCopiedNotice: string
    ctaContinuity: string
    ctaIntake: string
    finalizingTitle: string
    pendingTitle: string
    finalizingBody: string
    pendingBody: string
    refreshBtn: string
    resumeCheckoutPrefix: string
  }
}

export type ShowcaseDemoFormat = 'express4k' | 'fullMotion'

const PRODUCED_SHOWCASE_VIDEO_LOCALES = new Set(['en', 'es', 'pt', 'hi', 'zh', 'ar', 'th'])

export function getShowcaseVideoSlugLocale(locale: ClientPortalLocale): string {
  const mapped = locale === 'zh-CN' ? 'zh' : locale
  return PRODUCED_SHOWCASE_VIDEO_LOCALES.has(mapped) ? mapped : 'en'
}

export function getLocalizedShowcaseVideoUrl(
  videoSlug: string,
  locale: ClientPortalLocale,
  format: ShowcaseDemoFormat = 'express4k'
): string {
  const code = getShowcaseVideoSlugLocale(locale)
  if (videoSlug === 'memoir') {
    if (format === 'fullMotion') {
      return code === 'en'
        ? '/videos/video-memoir-trailer.mp4'
        : `/videos/video-memoir-trailer-${code}.mp4`
    }
    return code === 'en'
      ? '/videos/video-memoir-trailer-4k.mp4'
      : `/videos/video-memoir-trailer-4k-${code}.mp4`
  }
  return format === 'fullMotion'
    ? `/landing/video-services/videos/${videoSlug}-${code}.mp4`
    : `/landing/video-services/videos/express-${videoSlug}-${code}.mp4`
}

export function getShowcaseVideoPosterUrl(videoSlug: string): string {
  if (videoSlug === 'memoir') {
    return '/images/trailers/video-memoir-poster.webp'
  }
  return `/landing/video-services/videos/${videoSlug}-poster.webp`
}

export const SHOWCASE_LOCALE_COPY: Record<ClientPortalLocale, ShowcaseLocaleCopy> = {
  en: {
    shortCode: 'EN',
    nativeLabel: 'English',
    brandSubtitleMobile: 'Express 4K Films',
    brandSubtitleDesktop: 'Express 4K Milestone & Life Films',
    topBarBadge: 'Live White-Label Reference Storefront',
    topBarSubtext: '· Express 4K Cinema Only · Powered by SceneFlow Studio',
    topBarCtaMobile: 'Launch Your Studio',
    topBarCtaDesktop: 'Launch your own branded studio on SceneFlow',
    nav: {
      occasions: 'Occasions',
      howItWorks: 'How It Works',
      expressQuality: 'Express 4K Quality',
      faq: 'FAQ',
      ctaMobile: '$29 Blueprint',
      ctaDesktop: 'Start $29 Blueprint',
    },
    hero: {
      eyebrow: '1-Hour+ Feature Films & Multi-Episode Series · Period Reenactments · Zero AI Slop',
      titlePrefix: 'Turn Life’s Greatest Chapters Into a ',
      titleAccent: '1-Hour+ 4K Film or Series',
      titleSuffix: ' — Delivered Today.',
      subtitleLead: 'From ',
      subtitleHighlight1: 'family legacies & historical reenactments',
      subtitleMid: ' to ',
      subtitleHighlight2: 'multi-episode biographies, weddings, and retirements',
      subtitleEnd:
        '—recreate unfilmed life chapters with authentic people, locations, culture, and historical context in a 30–150 minute feature film or bingeable multi-episode series (up to 60 min / 360 directed frames included at $149) plus a 1–3 min theatrical trailer, voice cloning, and score.',
      metric1Sub: 'Blueprint Pass (100% credited)',
      metric2Sub: 'Up to 60-min 4K Feature or Series + Trailer',
      metric3Val: '2–4 hrs',
      metric3Sub: 'Same-day 4K after photo lock',
      primaryCta: 'Start My $29 Storyboard Blueprint',
      secondaryCta: 'Browse All Occasions',
      trustWhop: '100% of $29 credited toward your 4K film',
      trustPrivacy: '100% private photos — never used to train AI',
      trustLanguages: '14 native UI portals · Culturally localized 4K masters in 70+ languages',
    },
    theater: {
      eyebrow: 'Express 4K Cinema Reel',
      watchSamplePrefix: 'Watch Sample',
      sameDayTagSuffix: 'Same-Day 4K',
      formatToggle: {
        express4kLabel: '4K Cinema',
        express4kSub: 'Order Today',
        fullMotionLabel: 'Full Motion',
        fullMotionSub: 'Studio Preview',
        fullMotionEyebrow: 'Full-Motion Cinema Preview',
        fullMotionTagSuffix: 'Partner Studio Tier (Demo Only)',
        express4kNote:
          'Photorealistic 4K frames with Ken Burns camera motion, studio voices & score — available for same-day checkout below.',
        fullMotionNote:
          'Live-action AI motion & lip-synced dialogue — preview both formats here; Full-Motion films are produced via SceneFlow Studio Partners.',
        cardExpressBadge: '4K · Same-Day',
        cardFullMotionBadge: 'Full Motion · Demo',
        watchExpressPrefix: 'Play 4K Cinema',
        watchFullMotionPrefix: 'Play Full Motion',
        heroSwitchPrefix: 'Compare formats:',
        heroOrFullMotion: 'or Full-Motion Cinema',
      },
      tabs: [
        {
          id: 'family_legacy',
          label: 'Harbor Books · Life & Milestones',
          caption:
            'Harbor Books: Fifty Years on Pike Street — Family Legacy, Weddings, Graduations & Retirements',
          priceUsd: 149,
          videoSlug: 'memoir',
        },
        {
          id: 'real_estate_express',
          label: 'Real Estate 4K',
          caption: 'MLS Photos Transformed Into Voiced 4K Property Cinema',
          priceUsd: 149,
          videoSlug: 'realestate',
        },
        {
          id: 'brand_express',
          label: 'Founder & Clinic',
          caption: 'Trust-Building Homepage Origin Films Without a Crew',
          priceUsd: 199,
          videoSlug: 'brand',
        },
        {
          id: 'training_express',
          label: 'Training & SOP',
          caption: 'Presenter-Locked Narrated Modules Easy to Update Anytime',
          priceUsd: 249,
          videoSlug: 'training',
        },
      ],
    },
    occasions: {
      eyebrow: 'Curated Express 4K Collections',
      heading: 'Every Milestone Deserves the Big Screen.',
      subtitle:
        'The 2-minute videos below are short preview samples—your $149 package buys a true 1-hour+ 4K feature film OR bingeable multi-episode series (up to 60 min / 360 directed frames; expandable to 150 min) recreating unfilmed chapters with era-accurate people, locations, culture & history, plus a 1–3 min trailer. Start with a $29 Blueprint Pass (100% credited).',
      tabAll: 'All Examples (4)',
      tabMilestones: 'Life & Milestones (1)',
      tabCommercial: 'Business & Property (3)',
      groupMilestonesHeading: 'Life Stories & Milestone Films',
      groupCommercialHeading: 'Real Estate, Brand Story & Training Examples',
      groupCommercialSub:
        'Explore 4K Cinema (same-day checkout) and Full-Motion studio previews for property listings, founder brand stories, and narrated SOP training.',
      idealForLabel: 'Ideal for:',
      cardCta: 'Start $29 Blueprint',
      offers: {
        family_legacy: {
          badge: 'Most Popular · 1-Hour+ Feature or Series',
          title: 'Life Stories & Family Memoirs, Weddings, Graduations, and more',
          subtitle:
            'Go deep—tell an unforgettable 1-hour+ (30–150 min) feature film or multi-episode life series recreating unfilmed chapters with authentic people, locations, culture, and historical context. Your $149 package includes up to 60 min (360 directed 4K frames) plus a shareable 1–3 min theatrical trailer.',
          idealFor:
            '70th/80th birthdays, family legacies, multi-episode life series, weddings & anniversaries, graduations, retirements & celebrations of life',
          runtimeLabel: 'Up to 60 min Feature OR Multi-Episode Series · + 1–3 min Trailer',
          turnaroundLabel: 'Same-Day (2–4 hrs after photo lock)',
          deliverables: [
            'Up to 60-min 4K Feature OR Multi-Episode Series (360 directed frames; extendable to 150 min)',
            '1–3 min Shareable Theatrical Trailer included for family & event invites',
            'Period reenactments: age-28 de-aging, relative matching, era locations & heirlooms',
            'Includes automatic regional & decade-specific cultural/economic context + staged family gatherings & traditions across 70+ languages',
          ],
          titlePlaceholder: 'e.g., Grandpa Mateo’s 80th Birthday Story',
        },
        wedding_love: {
          badge: 'Weddings & Anniversaries',
          title: 'Love Stories, Weddings & Vow Renewals',
          subtitle:
            'Turn how you met, favorite trips, proposals, and family blessings into a feature-length 4K film (up to 60 min / 360 frames) plus a 1–3 min rehearsal-dinner trailer.',
          idealFor: 'Rehearsal dinners, wedding receptions, 25th & 50th anniversaries, engagement films',
          runtimeLabel: 'Up to 60 min (360 frames) · + 1–3 min Trailer',
          turnaroundLabel: 'Same-Day (2–4 hrs after photo lock)',
          deliverables: [
            'Story Blueprint + family/wedding-party comment triage link',
            'Upload favorite couple & proposal photos right from your phone',
            'Warm narration, ambient soundscapes & cinematic score',
            'Downloadable 4K MP4 feature + 1–3 min theatrical trailer',
          ],
          titlePlaceholder: 'e.g., Claire & Daniel — From Lisbon to Forever',
        },
        graduation_milestone: {
          badge: 'Graduations & Coming-of-Age',
          title: 'Graduation & Coming-of-Age Tributes',
          subtitle:
            'Celebrate high school, college, or graduate school with a deep chapter-by-chapter 4K tribute (up to 60 min / 360 frames) plus a 1–3 min party trailer.',
          idealFor: 'High school & university graduations, scholarship banquets, senior night & send-offs',
          runtimeLabel: 'Up to 60 min (360 frames) · + 1–3 min Trailer',
          turnaroundLabel: 'Same-Day (ready for the weekend party)',
          deliverables: [
            'Fast 5-minute guided intake with milestone memory-jogger chips',
            'Gather notes from parents, coaches & siblings via guest link',
            'Phone photo uploads + name/school pronunciation guide',
            'Crisp 4K MP4 feature + 1–3 min shareable party trailer',
          ],
          titlePlaceholder: 'e.g., Maya’s Class of 2026 Journey',
        },
        retirement_tribute: {
          badge: 'Retirements & Career Legacy',
          title: 'Retirement & Career Milestone Films',
          subtitle:
            'Honor 20–40 years of leadership, mentorship, and unforgettable workplace moments in a deep longform 4K tribute film (up to 60 min / 360 frames) plus a 1–3 min banquet trailer.',
          idealFor: 'Retirement dinners, executive farewells, military/first-responder honors, founder tributes',
          runtimeLabel: 'Up to 60 min (360 frames) · + 1–3 min Trailer',
          turnaroundLabel: 'Same-Day (2–4 hrs after photo lock)',
          deliverables: [
            'Share a guest comment link so teammates can add stories easily',
            'Upload career photos, team shots & workplace milestones',
            'Studio narration + 10-second name/company pronunciation guide',
            '4K MP4 feature + 1–3 min trailer ready for banquet screens',
          ],
          titlePlaceholder: 'e.g., 35 Years of Leadership — Captain Robert Hayes',
        },
        real_estate_express: {
          badge: 'Real Estate · Deep-Dive 4K',
          title: 'Express 4K Property Listing Film',
          subtitle:
            'Go far beyond a 60-second slideshow. Walk buyers deeply through every room, architectural upgrades, chef-grade appliances, outdoor living, schools, and neighborhood lifestyle—includes up to 60 min (360 directed 4K frames) plus a 1–3 min MLS & social overview trailer.',
          idealFor: 'Luxury estates, residential listings, out-of-town buyers, boutique hotels & vacation rentals',
          runtimeLabel: 'Up to 60 min (360 frames) · Deep Tour + 1–3 min Trailer',
          turnaroundLabel: 'Same-Day (2–3 hrs)',
          deliverables: [
            'Deep-dive 4K property & neighborhood film (up to 60 min / 360 frames)',
            '1–3 min MLS & social highlight trailer included for instant buyer hooks',
            'Room-by-room updates, luxury appliances, schools & lifestyle storytelling',
            'Includes virtual furniture updates, active neighborhood lifestyle staging & localized buyer narration in 70+ languages',
          ],
          titlePlaceholder: 'e.g., 420 Harbor Crest Oceanview Residence',
        },
        brand_express: {
          badge: 'Brand Story & Clinics · Longform 4K',
          title: 'Express 4K Founder & Practice Film',
          subtitle:
            'Tell the complete documentary story behind your clinic, firm, or flagship brand—founder origin, client transformations, facility walkthrough, and team philosophy—up to 60 min (360 directed 4K frames) plus a 1–3 min high-converting homepage trailer.',
          idealFor: 'Medical/dental clinics, law firms, craft founders, local businesses & nonprofits',
          runtimeLabel: 'Up to 60 min (360 frames) · Brand Doc + 1–3 min Trailer',
          turnaroundLabel: 'Same-Day (2–4 hrs)',
          deliverables: [
            'Longform 4K founder & brand documentary (up to 60 min / 360 frames)',
            '1–3 min homepage & social trailer included to convert visitors fast',
            'Lock founder, clinic/office, signature products & pronunciation lock',
            'Includes local founding-era historical context & active patient/client care scene staging',
          ],
          titlePlaceholder: 'e.g., Pacific Coast Family Dental — Our Story',
        },
        training_express: {
          badge: 'Training & SOPs · Full-Length 4K Course',
          title: 'Express 4K Narrated Training & SOP Film',
          subtitle:
            'Convert 50-page manuals, onboarding playbooks, or compliance protocols into an engaging multi-module 4K training course (up to 60 min / 360 directed frames; extendable to 150-min curricula) with locked instructors, real equipment visuals & a 1–3 min overview trailer.',
          idealFor: 'Employee onboarding, workplace safety, clinic SOPs, franchise playbooks & certification courses',
          runtimeLabel: 'Up to 60 min (360 frames) · Full Course + 1–3 min Overview',
          turnaroundLabel: 'Same-Day (2–4 hrs)',
          deliverables: [
            'Multi-module 4K training course (up to 60 min / 360 frames; extendable)',
            '1–3 min executive & new-hire overview trailer included',
            'Locked instructor, uniform, workplace & safety equipment visuals',
            'Includes localized workplace safety/equipment scenario staging adapted to regional compliance & 70+ workforce languages',
          ],
          titlePlaceholder: 'e.g., New Hire Safety & Equipment Onboarding',
        },
      },
    },
    steps: {
      eyebrow: 'Effortless Zero-Login Experience',
      heading: 'From Spoken Memories to a 4K Film in 3 Simple Steps',
      subtitle: 'No accounts to create, no complicated software, and no weeks of back-and-forth emails.',
      items: [
        {
          tag: 'Step 01 · $29 Today',
          title: '5-Minute Guided Story & Living Blueprint',
          body: 'Tap occasion memory-joggers and tell your story in any of 70+ film languages (French, Spanish, Japanese, Arabic & more) inside a 14-language native portal. In ~3 minutes, receive an illustrated, narrated Blueprint + family comment link and 4 AI revision rounds.',
          highlight: '100% of your $29 credits toward your final 4K film →',
        },
        {
          tag: 'Step 02 · $120 Balance',
          title: 'Phone Photos, Pronunciation & Continuity Lock',
          body: 'Approve your Blueprint and complete your balance via Whop to unlock your private Continuity Library. Upload keepsake photos from your phone (GPS stripped), add a 10-second name/town pronunciation guide, and lock every face & setting.',
          highlight: 'Every family name & portrait verified before rendering →',
        },
        {
          tag: 'Step 03 · Same-Day 4K',
          title: 'Private Screening Room & Automatic 4K Master',
          body: 'Watch your voiced, scored Express 4K Cinema Film on phone or TV via a zero-login Screening Room link. The moment you click Approve, our cloud cinema engine renders your 4K MP4 master and emails your download link automatically.',
          highlight: 'Ready for venue projectors, smart TVs & family sharing →',
        },
      ],
    },
    clarity: {
      badge: 'Why Express 4K Cinema Works So Well',
      heading: 'Ken Burns Documentary Cinema Meets Modern 4K Storytelling',
      body: 'Think of the emotional power of a documentary film paired with bespoke photorealistic 4K visual scenes, continuity-locked faces across eras, lifelike studio narration, ambient soundscapes, and a custom musical score. By focusing exclusively on Express 4K Cinema Films on this storefront, we deliver museum-grade clarity at $149–$249 same-day instead of $2,500+ and three weeks of waiting.',
      bullets: [
        'Photorealistic 4K stills + smooth camera motion',
        'Real uploaded photos blended seamlessly',
        'Studio narration, SFX & original score',
        '100% commercial & personal sharing rights',
      ],
      partnerHeading: 'Want Full-Motion AI Video Later?',
      partnerBody1:
        'This Express storefront intentionally offers Express 4K Cinema only—keeping quality consistent and turnaround same-day.',
      partnerBody2:
        'Want to upgrade favorite chapters into Full-Motion AI video or add live filmed interviews? Your locked Continuity Vault transfers with zero rework to a Certified SceneFlow Studio Partner anytime.',
      partnerPrimaryCta: 'Order Express 4K Blueprint ($29)',
      partnerSecondaryCta: 'For Video Agencies →',
    },
    faq: {
      eyebrow: 'Questions & Answers',
      heading: 'Everything You Need to Know',
      items: [
        {
          q: 'What exactly is an Express 4K Cinema Film?',
          a: 'An Express 4K Cinema Film is a photorealistic documentary-style 4K movie combining your real photos and custom continuity-locked 4K scenes with smooth Ken Burns camera motion, studio-grade narration & voices, layered ambient sound effects, and an original musical score. Delivered same-day at a fraction of traditional crew pricing.',
        },
        {
          q: 'How does the $29 Storyboard Blueprint Pass work?',
          a: 'You start with a $29 Storyboard Blueprint Pass via Whop Checkout. Immediately after payment, you enter our 5-minute voice-or-text guided interview. Within ~3 minutes you receive an illustrated, narrated Storyboard Blueprint with 4 AI revision rounds and a private comment-only link for family or teammates. Your entire $29 credits toward your Express 4K Film (so a $149 film has just a $120 balance).',
        },
        {
          q: 'Can siblings, spouses, or colleagues contribute stories before we lock the film?',
          a: 'Yes! Your Blueprint Portal includes a separate Guest Comment-Only link. Relatives, bridesmaids, classmates, or coworkers can listen in any of 70+ film languages (with a 14-language portal UI) and leave memories without spending your revision rounds or approving anything.',
        },
        {
          q: 'How do the 14 native UI portals and 70+ culturally localized film languages work together?',
          a: 'Operate in 14 Native Portals. Produce Culturally Authentic Films in 70+ Languages. Review and manage projects in 14 high-impact portal languages (English, Spanish, Portuguese, Hindi, Chinese, Arabic, Thai, Japanese, Korean, German, French, Italian, Dutch, and Russian)—while SceneFlow’s story and visual engine produces culturally localized 4K masters in 70+ languages, complete with region-accurate historical context, local architectural/interior staging, and native pronunciation locks.',
        },
        {
          q: 'What about unusual family surnames, towns, or company names?',
          a: 'Your Continuity Library includes a 10-second Phonetic Pronunciation Guide (type or speak names like "Kowalski = koh-VAHL-skee"). You also review the complete voiced cut in your private Screening Room before your 4K master renders.',
        },
        {
          q: 'Are my family photos or business files ever used to train AI models?',
          a: 'Never. Uploaded photos have EXIF GPS location data stripped automatically on upload, stay private to your project, and are never used to train shared AI models.',
        },
        {
          q: 'What if I later want Full-Motion AI video scenes or a live crew shoot?',
          a: 'This storefront delivers Express 4K Cinema Films exclusively so turnaround stays fast and affordable. Because your cast, voices, and story are locked inside SceneFlow Studio, you can upgrade select chapters to Full-Motion Cinema anytime through a Certified SceneFlow Studio Partner with zero rework.',
        },
      ],
    },
    footer: {
      referenceTag: '· Live Reference Storefront',
      body: 'This storefront runs 100% on SceneFlow Studio’s white-label client portal engine with Whop Merchant of Record checkout. Prospective studio operators can launch their own branded storefront under their own domain and keep 100% of client billing.',
      primaryCta: 'Start $29 Blueprint Pass',
      secondaryCta: 'Run This Under Your Own Brand →',
    },
    modal: {
      stepBadge: 'Step 1 · Blueprint Pass',
      linePass: 'Storyboard Blueprint Pass',
      lineBalance: 'Later Express 4K balance (only if approved)',
      lineTotal: 'Total Express 4K Film',
      whopNotice: 'Processed securely by Whop (Merchant of Record)',
      currencyNote: 'Displayed in local currency estimate; Whop MoR settles in USD ($29 today).',
      instantLinkNote: 'Instant magic link to your 5-minute guided story interview immediately after checkout.',
      fieldOccasion: 'Occasion / Film Style',
      fieldTitle: 'Who or what is this film celebrating? (optional)',
      fieldName: 'Your Name *',
      fieldNamePlaceholder: 'Alex Rivera',
      fieldLanguage: 'Portal UI Language',
      fieldLanguageHint: "Films & narration can be produced in 70+ languages (e.g., French, Italian, German, Japanese, Korean & more) during your guided interview.",
      whopRefBadge: "Payments processed by Whop",
      fieldEmail: 'Email for Your Private Studio Links *',
      fieldEmailPlaceholder: 'you@example.com',
      submitIdlePrefix: 'Continue to Secure Checkout —',
      submitBusy: 'Opening Secure Checkout...',
      errorFallback: 'Could not start Whop Checkout. Please try again.',
      errorNetwork: 'Network error starting Whop Checkout. Please try again.',
      totalOptionSuffix: 'total',
      todayOptionSuffix: 'today',
    },
    orderPage: {
      whopBadgeShort: 'Whop MoR',
      whopBadgeFull: 'Whop Merchant of Record',
      loading: 'Confirming your Whop checkout...',
      notFound: 'Order not found',
      returnCta: 'Return to Keepsake Cinema',
      confirmedTag: 'Payment Confirmed · Ready Now',
      unlockedTitle: 'Your Express 4K Film Is Unlocked!',
      welcomePrefix: 'Welcome,',
      unlockedBody:
        'Thank you for completing your Express 4K balance. Your private Continuity Photo Library is live now—upload real photos from your phone and add a 10-second name/town pronunciation guide so we can produce your Same-Day 4K Cinema Film.',
      passBody:
        'Your Storyboard Blueprint Pass is active and 100% credited toward your Express 4K Film. Launch your guided story interview right now—or open the magic link we just emailed you.',
      emailCopiedNotice:
        'A private copy of this magic link has also been sent to your email so you can resume from phone or desktop anytime.',
      ctaContinuity: 'Open My Continuity Photo Library',
      ctaIntake: 'Start My 5-Minute Guided Story Interview',
      finalizingTitle: 'Finalizing Your Studio Portal...',
      pendingTitle: 'Checkout Pending',
      finalizingBody:
        'We are confirming your Whop payment and spinning up your private studio link. This usually takes just a few seconds.',
      pendingBody: 'Complete your Whop checkout to instantly unlock your private studio portal.',
      refreshBtn: 'Refresh Status',
      resumeCheckoutPrefix: 'Resume Whop Checkout',
    },
  },

  es: {
    shortCode: 'ES',
    nativeLabel: 'Español',
    brandSubtitleMobile: 'Cine Express 4K',
    brandSubtitleDesktop: 'Películas 4K de Vida y Momentos Únicos',
    topBarBadge: 'Tienda de Referencia Marca Blanca en Vivo',
    topBarSubtext: '· Solo Cine Express 4K · Impulsada por SceneFlow Studio',
    topBarCtaMobile: 'Lanza Tu Estudio',
    topBarCtaDesktop: 'Lanza tu propio estudio marca blanca en SceneFlow',
    nav: {
      occasions: 'Ocasiones',
      howItWorks: 'Cómo Funciona',
      expressQuality: 'Calidad 4K Express',
      faq: 'Preguntas',
      ctaMobile: 'Blueprint $29',
      ctaDesktop: 'Iniciar Blueprint $29',
    },
    hero: {
      eyebrow: 'Largometrajes de 1+ Hora y Series Multi-Episodio · Recreaciones de Época · Cero AI Slop',
      titlePrefix: 'Convierte los Grandes Capítulos de la Vida en una ',
      titleAccent: 'Película o Serie 4K de 1+ Hora',
      titleSuffix: ' — Entregada Hoy.',
      subtitleLead: 'Desde ',
      subtitleHighlight1: 'legados familiares y recreaciones históricas',
      subtitleMid: ' hasta ',
      subtitleHighlight2: 'biografías multi-episodio, bodas y jubilaciones',
      subtitleEnd:
        '—recrea capítulos de vida nunca filmados con personas, lugares, cultura y contexto histórico auténticos en un largometraje de 30–150 minutos o una serie multi-episodio atrapante (hasta 60 min / 360 cuadros dirigidos incluidos por $149), más un tráiler cinematográfico de 1–3 min, clonación de voz y banda sonora.',
      metric1Sub: 'Pase Blueprint (100% acreditado)',
      metric2Sub: 'Película o Serie 4K hasta 60 min + Tráiler',
      metric3Val: '2–4 h',
      metric3Sub: 'Master 4K el mismo día',
      primaryCta: 'Iniciar Mi Blueprint con Storyboard — $29',
      secondaryCta: 'Ver Todas las Ocasiones',
      trustWhop: '100% de tus $29 acreditados a tu filme 4K',
      trustPrivacy: 'Fotos 100% privadas — nunca usadas para entrenar IA',
      trustLanguages: '14 portales nativos · Masters 4K localizados culturalmente en 70+ idiomas',
    },
    theater: {
      eyebrow: 'Muestra de Cine Express 4K',
      watchSamplePrefix: 'Ver Muestra',
      sameDayTagSuffix: '4K el Mismo Día',
      formatToggle: {
        express4kLabel: 'Cine 4K',
        express4kSub: 'Pide Hoy',
        fullMotionLabel: 'Movimiento Total',
        fullMotionSub: 'Vista de Estudio',
        fullMotionEyebrow: 'Vista Previa de Cine en Movimiento Total',
        fullMotionTagSuffix: 'Nivel Estudio Socio (Solo Demo)',
        express4kNote:
          'Cuadros 4K fotorrealistas con movimiento Ken Burns, voces de estudio y música — disponible para pedido inmediato abajo.',
        fullMotionNote:
          'Video de acción con IA y diálogos sincronizados — explora ambos formatos aquí; Movimiento Total se produce con Estudios Socios de SceneFlow.',
        cardExpressBadge: '4K · Hoy',
        cardFullMotionBadge: 'Movimiento · Demo',
        watchExpressPrefix: 'Ver Cine 4K',
        watchFullMotionPrefix: 'Ver Movimiento Total',
        heroSwitchPrefix: 'Compara formatos:',
        heroOrFullMotion: 'o Cine en Movimiento Total',
      },
      tabs: [
        {
          id: 'family_legacy',
          label: 'Vida y Momentos',
          caption: 'Legado Familiar · Bodas · Graduaciones · Jubilaciones',
          priceUsd: 149,
          videoSlug: 'memoir',
        },
        {
          id: 'real_estate_express',
          label: 'Inmobiliaria 4K',
          caption: 'Fotos de Propiedades Convertidas en Cine 4K Narrado',
          priceUsd: 149,
          videoSlug: 'realestate',
        },
        {
          id: 'brand_express',
          label: 'Marcas y Clínicas',
          caption: 'Historias de Marca de Alta Confianza Sin Equipo de Rodaje',
          priceUsd: 199,
          videoSlug: 'brand',
        },
        {
          id: 'training_express',
          label: 'Capacitación y SOP',
          caption: 'Módulos Narrados con Instructor Fijo Fáciles de Actualizar',
          priceUsd: 249,
          videoSlug: 'training',
        },
      ],
    },
    occasions: {
      eyebrow: 'Colecciones Curadas Express 4K',
      heading: 'Cada Hito Merece la Gran Pantalla.',
      subtitle:
        'Los videos de 2 minutos abajo son breves muestras: tu paquete de $149 incluye un verdadero largometraje 4K de 1+ hora O una serie multi-episodio atrapante (hasta 60 min / 360 cuadros dirigidos; ampliable a 150 min) que recrea capítulos nunca filmados con personas, lugares, cultura e historia fieles a cada época, más un tráiler de 1–3 min. Empieza con un Pase Blueprint de $29 (100% acreditado).',
      tabAll: 'Todos (4)',
      tabMilestones: 'Vida y Momentos (1)',
      tabCommercial: 'Negocios e Inmuebles (3)',
      groupMilestonesHeading: 'Historias de Vida y Celebraciones',
      groupCommercialHeading: 'Ejemplos de Inmobiliaria, Historia de Marca y Capacitación',
      groupCommercialSub:
        'Compara Cine 4K (pedido hoy) y Movimiento Total para propiedades inmobiliarias, historias de marca de fundadores y capacitación corporativa.',
      idealForLabel: 'Ideal para:',
      cardCta: 'Iniciar Blueprint $29',
      offers: {
        family_legacy: {
          badge: 'Más Popular · Largometraje o Serie 1+ Hora',
          title: 'Historias de Vida y Memorias Familiares, Bodas, Graduaciones y más',
          subtitle:
            'Profundiza en la historia: cuenta un inolvidable largometraje de 1+ hora (30–150 min) o una serie biográfica multi-episodio recreando capítulos nunca filmados con personas, lugares, cultura y contexto histórico auténticos. Tu paquete de $149 incluye hasta 60 min (360 cuadros 4K dirigidos) más un tráiler cinematográfico compartible de 1–3 min.',
          idealFor:
            'Cumpleaños 70/80, legados familiares, series biográficas multi-episodio, bodas y aniversarios, graduaciones, jubilaciones y homenajes de vida',
          runtimeLabel: 'Largometraje o Serie Multi-Episodio hasta 60 min · + Tráiler 1–3 min',
          turnaroundLabel: 'Mismo día (2–4 h tras aprobar fotos)',
          deliverables: [
            'Largometraje 4K O Serie Multi-Episodio hasta 60 min (360 cuadros dirigidos; ampliable a 150 min)',
            'Tráiler cinematográfico compartible de 1–3 min incluido para familia e invitaciones',
            'Recreaciones de época: rejuvenecimiento a los 28 años, parecido familiar, locaciones históricas y reliquias',
            'Incluye contexto cultural/económico automático por región y década + escenas de reuniones y tradiciones familiares en 70+ idiomas',
          ],
          titlePlaceholder: 'ej., Los 80 Años del Abuelo Mateo',
        },
        wedding_love: {
          badge: 'Bodas y Aniversarios',
          title: 'Historias de Amor, Bodas y Renovación de Votos',
          subtitle:
            'Convierte cómo se conocieron, viajes inolvidables y bendiciones familiares en un filme 4K listo para proyectar en la cena de ensayo, boda o aniversario.',
          idealFor: 'Cenas de ensayo, recepciones, bodas de plata y oro, compromisos',
          runtimeLabel: 'Hasta 60 min (360 cuadros) · + Tráiler 1–3 min',
          turnaroundLabel: 'Mismo día (2–4 h tras aprobar fotos)',
          deliverables: [
            'Blueprint narrado + enlace de aportes para familia y padrinos',
            'Sube fotos de pareja y compromiso directo desde tu teléfono',
            'Narración cálida, efectos ambientales y música cinematográfica',
            'MP4 4K listo para proyectores de salón y televisores',
          ],
          titlePlaceholder: 'ej., Clara y Daniel — De Lisboa para Siempre',
        },
        graduation_milestone: {
          badge: 'Graduaciones y Logros',
          title: 'Tributos de Graduación y Crecimiento',
          subtitle:
            'Celebra preparatoria, universidad o posgrado con una película 4K emotiva—desde los primeros pasos y triunfos deportivos hasta el orgullo del birrete.',
          idealFor: 'Graduaciones escolares y universitarias, cenas de gala, despedidas',
          runtimeLabel: 'Hasta 60 min (360 cuadros) · + Tráiler 1–3 min',
          turnaroundLabel: 'Mismo día (listo para la fiesta del fin de semana)',
          deliverables: [
            'Entrevista guiada de 5 min con fichas rápidas de hitos',
            'Recoge mensajes de padres, entrenadores y hermanos con un enlace',
            'Subida de fotos desde el móvil + guía de pronunciación',
            'Master 4K nítido para pantallas de fiesta y compartir en familia',
          ],
          titlePlaceholder: 'ej., El Camino de Maya — Generación 2026',
        },
        retirement_tribute: {
          badge: 'Jubilaciones y Trayectoria',
          title: 'Filmes de Jubilación y Legado Profesional',
          subtitle:
            'Honra 20 a 40 años de liderazgo, mentoría y logros laborales en un filme tributo 4K pulido, sumando anécdotas de colegas mediante un solo enlace privado.',
          idealFor: 'Cenas de retiro, despedidas ejecutivas, homenajes a fundadores y servicio',
          runtimeLabel: 'Hasta 60 min (360 cuadros) · + Tráiler 1–3 min',
          turnaroundLabel: 'Mismo día (2–4 h tras aprobar fotos)',
          deliverables: [
            'Enlace de comentarios para que colegas aporten recuerdos',
            'Sube fotos de carrera, equipo y momentos clave',
            'Narración de estudio + guía de pronunciación de nombres/empresas',
            'Master 4K MP4 listo para banquetes y ceremonias',
          ],
          titlePlaceholder: 'ej., 35 Años de Liderazgo — Capitán Roberto Vega',
        },
        real_estate_express: {
          badge: 'Inmobiliaria · 4K Mismo Día',
          title: 'Filme Express 4K de Propiedad',
          subtitle:
            'Transforma fotos de listado y atractivos del vecindario en un recorrido cinematográfico 4K narrado y musicalizado hoy mismo—sin retrasos por clima.',
          idealFor: 'Propiedades residenciales, residencias de lujo, hoteles boutique y Airbnb',
          runtimeLabel: 'Hasta 60 min (360 cuadros) · Tour Profundo + Tráiler 1–3 min',
          turnaroundLabel: 'Mismo día (2–3 h)',
          deliverables: [
            'Blueprint por espacios listo en ~3 minutos',
            'Sube fotos del inmueble directo desde móvil o computadora',
            'Versiones opcionales en otros idiomas para compradores globales',
            'Incluye actualización virtual de mobiliario, ambientación activa del vecindario y narración localizada para compradores en 70+ idiomas',
          ],
          titlePlaceholder: 'ej., Residencia Vista al Mar 420',
        },
        brand_express: {
          badge: 'Empresas y Clínicas · 4K Mismo Día',
          title: 'Filme Express 4K de Marca y Fundador',
          subtitle:
            'Dale a tu sitio web una historia principal que inspire confianza sin gastar $5,000 en un rodaje—combinando visuales 4K fotorrealistas, narración y música.',
          idealFor: 'Clínicas médicas/dentales, despachos legales, pymes y fundadores',
          runtimeLabel: 'Hasta 60 min (360 cuadros) · Doc. de Marca + Tráiler 1–3 min',
          turnaroundLabel: 'Mismo día (2–4 h)',
          deliverables: [
            'Blueprint enfocado en conversión + enlace de revisión de equipo',
            'Bloqueo visual de fundador, clínica/oficina e identidad',
            'Guía de pronunciación de 10 segundos para marcas y directivos',
            'Incluye contexto histórico local de la época fundacional y puesta en escena activa de atención a pacientes/clientes',
          ],
          titlePlaceholder: 'ej., Clínica Dental Costa del Pacífico — Nuestra Historia',
        },
        training_express: {
          badge: 'Capacitación y SOP · 4K Mismo Día',
          title: 'Módulo Express 4K de Capacitación Narrada',
          subtitle:
            'Convierte manuales, protocolos de seguridad o guías de inducción en un módulo 4K claro con instructor consistente—fácil de actualizar al cambiar normas.',
          idealFor: 'Inducción de personal, seguridad industrial, protocolos clínicos y franquicias',
          runtimeLabel: 'Hasta 60 min (360 cuadros) · Curso Completo + Tráiler 1–3 min',
          turnaroundLabel: 'Mismo día (2–4 h)',
          deliverables: [
            'Blueprint por capítulos + enlace de validación interna',
            'Instructor, uniformes y entorno bloqueados con continuidad',
            'Guía de pronunciación para términos técnicos y siglas',
            'Incluye puesta en escena localizada de seguridad laboral y equipos adaptada a normativas regionales y 70+ idiomas de fuerza laboral',
          ],
          titlePlaceholder: 'ej., Inducción de Seguridad y Equipos para Nuevo Ingreso',
        },
      },
    },
    steps: {
      eyebrow: 'Experiencia Sin Registro Ni Contraseñas',
      heading: 'De Recuerdos Contados a una Película 4K en 3 Pasos',
      subtitle: 'Sin cuentas que crear, sin programas complejos y sin semanas de correos.',
      items: [
        {
          tag: 'Paso 01 · $29 Hoy',
          title: 'Entrevista Guiada de 5 Min y Blueprint Vivo',
          body: 'Toca fichas de momentos clave y cuenta tu historia en cualquiera de 70+ idiomas de producción (francés, español, italiano, japonés y más) dentro de un portal nativo en 14 idiomas. En ~3 min recibes tu Blueprint ilustrado y narrado + enlace familiar y 4 rondas IA.',
          highlight: '100% de tus $29 se abonan a tu película 4K final →',
        },
        {
          tag: 'Paso 02 · Saldo $120',
          title: 'Fotos del Móvil, Pronunciación y Continuidad',
          body: 'Aprueba tu Blueprint y cubre el saldo vía Whop para abrir tu Biblioteca de Continuidad. Sube fotos reales desde tu teléfono (sin GPS), añade una guía de pronunciación de 10 s y bloquea cada rostro y escenario.',
          highlight: 'Cada nombre y retrato verificado antes de renderizar →',
        },
        {
          tag: 'Paso 03 · 4K el Mismo Día',
          title: 'Sala de Proyección y Master 4K Automático',
          body: 'Mira tu Filme Express 4K con voces y música en teléfono o TV mediante un enlace privado. Al hacer clic en Aprobar, nuestro motor renderiza el master 4K MP4 y te envía el enlace de descarga automáticamente.',
          highlight: 'Listo para proyectores, Smart TV y compartir en familia →',
        },
      ],
    },
    clarity: {
      badge: 'Por Qué el Cine Express 4K Sorprende Tanto',
      heading: 'Cine Documental Estilo Ken Burns con Narrativa 4K Moderna',
      body: 'Combina la emoción de un gran documental con escenas 4K fotorrealistas a medida, rostros coherentes en cada época, narración cálida de estudio, efectos ambientales y música original. Al enfocarnos exclusivamente en Cine Express 4K en esta tienda, entregamos nitidez de museo por $149–$249 el mismo día en lugar de $2,500+ y semanas de espera.',
      bullets: [
        'Cuadros 4K fotorrealistas con movimiento suave',
        'Tus fotos reales integradas con naturalidad',
        'Narración de estudio, SFX y música original',
        '100% derechos para compartir y uso comercial',
      ],
      partnerHeading: '¿Deseas Video en Movimiento Completo Después?',
      partnerBody1:
        'Esta tienda Express ofrece exclusivamente Cine Express 4K para garantizar máxima consistencia y entrega el mismo día.',
      partnerBody2:
        '¿Quieres actualizar capítulos clave a video IA en movimiento completo o entrevistas grabadas? Tu bóveda de continuidad se transfiere sin retrabajo a un Socio Certificado de SceneFlow Studio.',
      partnerPrimaryCta: 'Pedir Blueprint Express 4K ($29)',
      partnerSecondaryCta: 'Para Agencias de Video →',
    },
    faq: {
      eyebrow: 'Preguntas Frecuentes',
      heading: 'Todo lo que Necesitas Saber',
      items: [
        {
          q: '¿Qué es exactamente una Película de Cine Express 4K?',
          a: 'Es un filme documental 4K fotorrealista que une tus fotos reales y escenas 4K con continuidad de rostros, movimiento cinematográfico suave (Ken Burns), voces de estudio, efectos ambientales y música original—entregado el mismo día.',
        },
        {
          q: '¿Cómo funciona el Pase Blueprint con Storyboard de $29?',
          a: 'Pagas $29 con Whop Checkout y accedes al instante a una entrevista guiada de 5 minutos por voz o texto. En ~3 minutos recibes tu Blueprint ilustrado y narrado con 4 rondas IA y enlace de comentarios familiares. El 100% de tus $29 se acredita al saldo de tu película 4K.',
        },
        {
          q: '¿Pueden aportar historias hermanos, pareja o compañeros?',
          a: 'Sí. Tu portal incluye un enlace separado de solo comentarios para invitados. Pueden escuchar en cualquiera de 70+ idiomas de película (con portal nativo en 14 idiomas) y dejar recuerdos sin gastar tus rondas.',
        },
        {
          q: '¿Cómo trabajan juntos los 14 portales nativos y los 70+ idiomas de película localizados culturalmente?',
          a: 'Opera en 14 portales nativos. Produce películas culturalmente auténticas en más de 70 idiomas. Revisa y gestiona proyectos en 14 idiomas de portal de alto impacto (inglés, español, portugués, hindi, chino, árabe, tailandés, japonés, coreano, alemán, francés, italiano, neerlandés y ruso)—mientras el motor narrativo y visual de SceneFlow produce masters 4K localizados culturalmente en más de 70 idiomas, con contexto histórico fiel a cada región, ambientación arquitectónica y de interiores local, y bloqueos de pronunciación nativa.',
        },
        {
          q: '¿Cómo aseguran la pronunciación de apellidos o lugares?',
          a: 'La Biblioteca de Continuidad incluye una guía fonética de 10 segundos (por voz o texto). Además revisas el corte completo con voces en tu Sala de Proyección antes del render 4K.',
        },
        {
          q: '¿Se usan mis fotos familiares o empresariales para entrenar IA?',
          a: 'Nunca. Eliminamos automáticamente los metadatos GPS EXIF al subir tus fotos y nunca entrenamos modelos compartidos con el contenido de clientes.',
        },
        {
          q: '¿Puedo ampliar después a video en movimiento completo?',
          a: 'Sí. Aunque esta tienda es exclusivamente Express 4K para entrega el mismo día, tu proyecto bloqueado puede escalarse con cero retrabajo mediante un Socio Certificado de SceneFlow Studio.',
        },
      ],
    },
    footer: {
      referenceTag: '· Tienda de Referencia en Vivo',
      body: 'Esta tienda opera 100% con el motor de portales marca blanca de SceneFlow Studio y cobros Whop Merchant of Record. Los operadores pueden lanzar su propia tienda bajo su marca y conservar el 100% de su facturación.',
      primaryCta: 'Iniciar Pase Blueprint $29',
      secondaryCta: 'Opera Esto Bajo Tu Propia Marca →',
    },
    modal: {
      stepBadge: 'Paso 1 · Pase Blueprint',
      linePass: 'Pase Blueprint con Storyboard',
      lineBalance: 'Saldo Express 4K después (solo si apruebas)',
      lineTotal: 'Total Filme Express 4K',
      whopNotice: 'Procesado de forma segura por Whop (Merchant of Record)',
      currencyNote: 'Precios mostrados en moneda local estimada; Whop liquida en USD ($29 hoy).',
      instantLinkNote: 'Enlace mágico instantáneo a tu entrevista guiada de 5 minutos justo tras pagar.',
      fieldOccasion: 'Ocasión / Estilo de Película',
      fieldTitle: '¿A quién o qué celebra esta película? (opcional)',
      fieldName: 'Tu Nombre *',
      fieldNamePlaceholder: 'Alejandro Rivera',
      fieldLanguage: 'Idioma de la Interfaz',
      fieldLanguageHint: "Tu película y narración pueden producirse en más de 70 idiomas (francés, italiano, alemán, japonés y más) durante la entrevista.",
      whopRefBadge: "Pagos procesados por Whop",
      fieldEmail: 'Correo para Tus Enlaces Privados *',
      fieldEmailPlaceholder: 'tu@correo.com',
      submitIdlePrefix: 'Continuar al Pago Seguro —',
      submitBusy: 'Abriendo pago seguro...',
      errorFallback: 'No se pudo iniciar Whop Checkout. Inténtalo de nuevo.',
      errorNetwork: 'Error de red al iniciar Whop Checkout. Inténtalo de nuevo.',
      totalOptionSuffix: 'total',
      todayOptionSuffix: 'hoy',
    },
    orderPage: {
      whopBadgeShort: 'Whop MoR',
      whopBadgeFull: 'Whop Merchant of Record',
      loading: 'Confirmando tu pago en Whop...',
      notFound: 'Pedido no encontrado',
      returnCta: 'Volver a Keepsake Cinema',
      confirmedTag: 'Pago Confirmado · Listo Ahora',
      unlockedTitle: '¡Tu Filme Express 4K Está Desbloqueado!',
      welcomePrefix: 'Bienvenido,',
      unlockedBody:
        'Gracias por completar tu saldo Express 4K. Tu Biblioteca de Continuidad ya está activa: sube tus fotos desde el teléfono y deja una guía de pronunciación de 10 segundos para producir tu filme 4K hoy mismo.',
      passBody:
        'Tu Pase Blueprint con Storyboard está activo y 100% acreditado a tu película Express 4K. Inicia tu entrevista guiada ahora mismo o abre el enlace mágico enviado a tu correo.',
      emailCopiedNotice:
        'También enviamos una copia privada de este enlace a tu correo para continuar desde móvil o computadora cuando quieras.',
      ctaContinuity: 'Abrir Mi Biblioteca de Fotos y Continuidad',
      ctaIntake: 'Iniciar Mi Entrevista Guiada de 5 Minutos',
      finalizingTitle: 'Preparando Tu Portal Privado...',
      pendingTitle: 'Pago Pendiente',
      finalizingBody:
        'Estamos confirmando tu pago en Whop y creando tu enlace de estudio privado. Solo tomará unos segundos.',
      pendingBody: 'Completa tu pago en Whop para desbloquear al instante tu portal privado.',
      refreshBtn: 'Actualizar Estado',
      resumeCheckoutPrefix: 'Retomar Pago en Whop',
    },
  },

  pt: {
    shortCode: 'PT',
    nativeLabel: 'Português',
    brandSubtitleMobile: 'Cinema Express 4K',
    brandSubtitleDesktop: 'Filmes 4K de Vida e Grandes Marcos',
    topBarBadge: 'Loja de Referência White-Label ao Vivo',
    topBarSubtext: '· Somente Cinema Express 4K · Powered by SceneFlow Studio',
    topBarCtaMobile: 'Lance Seu Estúdio',
    topBarCtaDesktop: 'Lance seu próprio estúdio white-label no SceneFlow',
    nav: {
      occasions: 'Ocasiões',
      howItWorks: 'Como Funciona',
      expressQuality: 'Qualidade 4K Express',
      faq: 'Dúvidas',
      ctaMobile: 'Blueprint $29',
      ctaDesktop: 'Iniciar Blueprint $29',
    },
    hero: {
      eyebrow: 'Longas de 1+ Hora e Séries Multi-Episódios · Reconstituições de Época · Zero AI Slop',
      titlePrefix: 'Transforme os Grandes Capítulos da Vida em um ',
      titleAccent: 'Filme ou Série 4K de 1+ Hora',
      titleSuffix: ' — Entregue Hoje.',
      subtitleLead: 'De ',
      subtitleHighlight1: 'legados familiares e reconstituições históricas',
      subtitleMid: ' a ',
      subtitleHighlight2: 'biografias em episódios, casamentos e aposentadorias',
      subtitleEnd:
        '—recrie capítulos da vida nunca filmados com pessoas, lugares, cultura e contexto histórico autênticos em um longa-metragem de 30–150 minutos ou série envolvente de vários episódios (até 60 min / 360 quadros dirigidos incluídos por $149), mais trailer cinematográfico de 1–3 min, clonagem de voz e trilha sonora.',
      metric1Sub: 'Passe Blueprint (100% abatido)',
      metric2Sub: 'Filme ou Série 4K até 60 min + Trailer',
      metric3Val: '2–4 h',
      metric3Sub: 'Master 4K no mesmo dia',
      primaryCta: 'Iniciar Meu Blueprint com Storyboard — $29',
      secondaryCta: 'Explorar Todas as Ocasiões',
      trustWhop: '100% dos $29 abatidos no seu filme 4K',
      trustPrivacy: 'Fotos 100% privadas — nunca usadas para treinar IA',
      trustLanguages: '14 portais nativos · Masters 4K localizados culturalmente em 70+ idiomas',
    },
    theater: {
      eyebrow: 'Amostra de Cinema Express 4K',
      watchSamplePrefix: 'Assistir Amostra',
      sameDayTagSuffix: '4K no Mesmo Dia',
      formatToggle: {
        express4kLabel: 'Cinema 4K',
        express4kSub: 'Peça Hoje',
        fullMotionLabel: 'Movimento Total',
        fullMotionSub: 'Prévia de Estúdio',
        fullMotionEyebrow: 'Prévia de Cinema em Movimento Total',
        fullMotionTagSuffix: 'Estúdio Parceiro (Apenas Demo)',
        express4kNote:
          'Quadros 4K fotorrealistas com movimento Ken Burns, vozes de estúdio e trilha — disponível para pedido hoje abaixo.',
        fullMotionNote:
          'Movimento cinematográfico com IA e diálogos sincronizados — compare os dois formatos aqui; Movimento Total é produzido via Estúdios Parceiros SceneFlow.',
        cardExpressBadge: '4K · Mesmo Dia',
        cardFullMotionBadge: 'Movimento · Demo',
        watchExpressPrefix: 'Ver Cinema 4K',
        watchFullMotionPrefix: 'Ver Movimento Total',
        heroSwitchPrefix: 'Compare formatos:',
        heroOrFullMotion: 'ou Cinema em Movimento Total',
      },
      tabs: [
        {
          id: 'family_legacy',
          label: 'Vida e Marcos',
          caption: 'Legado Familiar · Casamentos · Formaturas · Aposentadorias',
          priceUsd: 149,
          videoSlug: 'memoir',
        },
        {
          id: 'real_estate_express',
          label: 'Imóveis 4K',
          caption: 'Fotos do Imóvel Transformadas em Tour Cinematográfico 4K',
          priceUsd: 149,
          videoSlug: 'realestate',
        },
        {
          id: 'brand_express',
          label: 'Marcas e Clínicas',
          caption: 'Filmes de Marca que Geram Confiança Sem Diária de Gravação',
          priceUsd: 199,
          videoSlug: 'brand',
        },
        {
          id: 'training_express',
          label: 'Treinamento e POP',
          caption: 'Módulos Narrados com Instrutor Fixo Fáceis de Atualizar',
          priceUsd: 249,
          videoSlug: 'training',
        },
      ],
    },
    occasions: {
      eyebrow: 'Coleções Express 4K Selecionadas',
      heading: 'Cada Marco Merece a Tela Grande.',
      subtitle:
        'Os vídeos de 2 minutos abaixo são breves amostras — seu pacote de $149 garante um verdadeiro longa-metragem 4K de 1+ hora OU uma série envolvente de vários episódios (até 60 min / 360 quadros dirigidos; expansível até 150 min) recriando capítulos não filmados com pessoas, locais, cultura e história fiéis à época, além de um trailer de 1–3 min. Comece com um Passe Blueprint de $29 (100% abatido).',
      tabAll: 'Todos (4)',
      tabMilestones: 'Vida e Marcos (1)',
      tabCommercial: 'Negócios e Imóveis (3)',
      groupMilestonesHeading: 'Histórias de Vida e Celebrações',
      groupCommercialHeading: 'Exemplos de Imóveis, História da Marca e Treinamento',
      groupCommercialSub:
        'Compare Cinema 4K (entrega hoje) e Movimento Total para tours imobiliários, filmes de marca de fundadores e treinamentos corporativos.',
      idealForLabel: 'Ideal para:',
      cardCta: 'Iniciar Blueprint $29',
      offers: {
        family_legacy: {
          badge: 'Mais Popular · Longa ou Série 1+ Hora',
          title: 'Histórias de Vida e Memórias Familiares, Casamentos, Formaturas e mais',
          subtitle:
            'Vá fundo — conte um inesquecível longa-metragem de 1+ hora (30–150 min) ou série biográfica em episódios recriando capítulos não filmados com pessoas, locais, cultura e contexto histórico autênticos. Seu pacote de $149 inclui até 60 min (360 quadros 4K dirigidos) mais um trailer cinematográfico compartilhável de 1–3 min.',
          idealFor:
            'Aniversários de 70/80 anos, legados familiares, séries biográficas em episódios, casamentos e bodas, formaturas, aposentadorias e homenagens de vida',
          runtimeLabel: 'Longa ou Série Multi-Episódios até 60 min · + Trailer 1–3 min',
          turnaroundLabel: 'Mesmo dia (2–4 h após aprovar fotos)',
          deliverables: [
            'Longa 4K OU Série Multi-Episódios até 60 min (360 quadros dirigidos; expansível até 150 min)',
            'Trailer cinematográfico compartilhável de 1–3 min incluído para família e convites',
            'Reconstituições de época: rejuvenescimento aos 28 anos, semelhança familiar, cenários históricos e relíquias',
            'Inclui contexto cultural/econômico automático por região e década + cenas de encontros e tradições familiares em 70+ idiomas',
          ],
          titlePlaceholder: 'ex., Os 80 Anos do Vovô Mateus',
        },
        wedding_love: {
          badge: 'Casamentos e Bodas',
          title: 'Histórias de Amor, Casamentos e Bodas',
          subtitle:
            'Transforme como vocês se conheceram, viagens marcantes e pedidos de casamento em um filme 4K pronto para exibir no jantar, recepção ou bodas de prata/ouro.',
          idealFor: 'Jantares de ensaio, recepções, bodas de 25 e 50 anos, noivados',
          runtimeLabel: 'Até 60 min (360 quadros) · + Trailer 1–3 min',
          turnaroundLabel: 'Mesmo dia (2–4 h após aprovar fotos)',
          deliverables: [
            'Blueprint narrado + link de notas para família e padrinhos',
            'Envie fotos favoritas do casal direto do celular',
            'Narração calorosa, paisagens sonoras e trilha cinematográfica',
            'MP4 4K pronto para projetores de eventos e TVs',
          ],
          titlePlaceholder: 'ex., Clara e Daniel — De Lisboa para Sempre',
        },
        graduation_milestone: {
          badge: 'Formaturas e Conquistas',
          title: 'Tributos de Formatura e Trajetória',
          subtitle:
            'Celebre ensino médio, faculdade ou pós-graduação com um filme 4K emocionante—dos primeiros passos e vitórias esportivas ao orgulho do diploma.',
          idealFor: 'Formaturas escolares e universitárias, jantares de formatura e despedidas',
          runtimeLabel: 'Até 60 min (360 quadros) · + Trailer 1–3 min',
          turnaroundLabel: 'Mesmo dia (pronto para a festa do fim de semana)',
          deliverables: [
            'Entrevista guiada de 5 min com fichas rápidas de marcos',
            'Reúna recados de pais, professores e irmãos por um link',
            'Envio de fotos pelo celular + guia de pronúncia de nomes',
            'Master 4K nítido para festas de formatura e família',
          ],
          titlePlaceholder: 'ex., A Jornada da Maya — Turma de 2026',
        },
        retirement_tribute: {
          badge: 'Aposentadoria e Carreira',
          title: 'Filmes de Aposentadoria e Legado Profissional',
          subtitle:
            'Homenageie 20 a 40 anos de liderança, mentoria e conquistas em um filme tributo 4K refinado—com histórias de colegas reunidas em um único link privado.',
          idealFor: 'Jantares de aposentadoria, despedidas executivas, homenagens a fundadores',
          runtimeLabel: 'Até 60 min (360 quadros) · + Trailer 1–3 min',
          turnaroundLabel: 'Mesmo dia (2–4 h após aprovar fotos)',
          deliverables: [
            'Compartilhe um link para colegas adicionarem memórias',
            'Envie fotos da carreira, equipe e projetos marcantes',
            'Narração de estúdio + guia de pronúncia de 10 segundos',
            'Master 4K MP4 pronto para telões e homenagens online',
          ],
          titlePlaceholder: 'ex., 35 Anos de Liderança — Capitão Roberto Mendes',
        },
        real_estate_express: {
          badge: 'Imóveis · 4K Mesmo Dia',
          title: 'Filme Express 4K de Imóvel',
          subtitle:
            'Transforme fotos de anúncios e destaques do bairro em um tour 4K narrado e musicado no mesmo dia—sem atrasos por clima ou equipe extra.',
          idealFor: 'Imóveis residenciais, alto padrão, hotéis boutique e temporada',
          runtimeLabel: 'Até 60 min (360 quadros) · Tour Profundo + Trailer 1–3 min',
          turnaroundLabel: 'Mesmo dia (2–3 h)',
          deliverables: [
            'Blueprint ambiente por ambiente em ~3 minutos',
            'Envie fotos do imóvel direto do celular ou computador',
            'Versões multilíngues opcionais para compradores internacionais',
            'Inclui atualização virtual de mobiliário, ambientação ativa do estilo de vida do bairro e narração localizada para compradores em 70+ idiomas',
          ],
          titlePlaceholder: 'ex., Residência Vista Mar 420',
        },
        brand_express: {
          badge: 'Empresas e Clínicas · 4K Mesmo Dia',
          title: 'Filme Express 4K de Marca e Fundador',
          subtitle:
            'Dê ao seu site um filme institucional confiável sem gastar $5,000 em produtora—combinando visuais 4K fotorrealistas, narração impecável e trilha.',
          idealFor: 'Clínicas médicas/odontológicas, escritórios, negócios locais e fundadores',
          runtimeLabel: 'Até 60 min (360 quadros) · Doc. de Marca + Trailer 1–3 min',
          turnaroundLabel: 'Mesmo dia (2–4 h)',
          deliverables: [
            'Blueprint focado em conversão + link de revisão da equipe',
            'Continuidade visual de fundador, clínica/escritório e marca',
            'Guia de pronúncia de 10 segundos para marcas e sócios',
            'Inclui contexto histórico local da época da fundação e encenação ativa de atendimento a pacientes/clientes',
          ],
          titlePlaceholder: 'ex., Clínica Odontológica Costa Azul — Nossa História',
        },
        training_express: {
          badge: 'Treinamento e POP · 4K Mesmo Dia',
          title: 'Módulo Express 4K de Treinamento Narrado',
          subtitle:
            'Converta manuais, integrações e normas de segurança em um módulo 4K claro com instrutor fixo—fácil de atualizar sempre que o processo mudar.',
          idealFor: 'Onboarding de equipes, segurança do trabalho, clínicas e franquias',
          runtimeLabel: 'Até 60 min (360 quadros) · Curso Completo + Trailer 1–3 min',
          turnaroundLabel: 'Mesmo dia (2–4 h)',
          deliverables: [
            'Blueprint em capítulos + link de aprovação dos gestores',
            'Instrutor, uniforme e ambiente travados com continuidade',
            'Guia de pronúncia para termos técnicos e siglas',
            'Inclui encenação localizada de segurança no trabalho e equipamentos adaptada à conformidade regional e a 70+ idiomas da equipe',
          ],
          titlePlaceholder: 'ex., Integração de Segurança e Equipamentos',
        },
      },
    },
    steps: {
      eyebrow: 'Experiência Sem Login e Sem Atrito',
      heading: 'De Memórias Faladas a um Filme 4K em 3 Passos Simples',
      subtitle: 'Sem criar contas, sem softwares complexos e sem semanas de e-mails.',
      items: [
        {
          tag: 'Passo 01 · $29 Hoje',
          title: 'Entrevista Guiada de 5 Min e Blueprint Vivo',
          body: 'Toque em lembretes da ocasião e conte sua história em qualquer um dos 70+ idiomas de filme (francês, português, italiano, japonês e mais) em um portal nativo em 14 idiomas. Em ~3 min receba seu Blueprint ilustrado e narrado + link familiar e 4 rodadas IA.',
          highlight: '100% dos seus $29 abatidos do filme 4K final →',
        },
        {
          tag: 'Passo 02 · Saldo $120',
          title: 'Fotos do Celular, Pronúncia e Continuidade',
          body: 'Aprove seu Blueprint e conclua o saldo via Whop para liberar sua Biblioteca de Continuidade. Envie fotos reais do celular (sem GPS), adicione um guia de pronúncia de 10 s e trave cada rosto e cenário.',
          highlight: 'Cada nome e retrato conferido antes da renderização →',
        },
        {
          tag: 'Passo 03 · 4K no Mesmo Dia',
          title: 'Sala de Exibição Privada e Master 4K Automático',
          body: 'Assista ao seu Filme Express 4K com vozes e trilha no celular ou TV por um link sem login. Ao clicar em Aprovar, nosso motor renderiza o master 4K MP4 e envia o link de download automaticamente.',
          highlight: 'Pronto para telões, Smart TVs e compartilhamento →',
        },
      ],
    },
    clarity: {
      badge: 'Por Que o Cinema Express 4K Encanta Tanto',
      heading: 'Cinema Documental Estilo Ken Burns com Narrativa 4K Moderna',
      body: 'Imagine a emoção de um documentário clássico combinada a cenas 4K fotorrealistas sob medida, rostos consistentes entre épocas, narração de estúdio, efeitos sonoros e trilha original. Focando exclusivamente em Cinema Express 4K nesta loja, entregamos qualidade de cinema por $149–$249 no mesmo dia em vez de $2,500+ e três semanas de espera.',
      bullets: [
        'Quadros 4K fotorrealistas com movimento suave',
        'Suas fotos reais integradas com perfeição',
        'Narração de estúdio, SFX e trilha original',
        '100% direitos pessoais e comerciais',
      ],
      partnerHeading: 'Quer Vídeo em Movimento Total Depois?',
      partnerBody1:
        'Esta loja Express oferece intencionalmente apenas Cinema Express 4K—mantendo a qualidade impecável e a entrega no mesmo dia.',
      partnerBody2:
        'Quer evoluir capítulos favoritos para vídeo IA em movimento total ou entrevistas gravadas? Seu cofre de continuidade transfere sem retrabalho para um Parceiro Certificado SceneFlow Studio.',
      partnerPrimaryCta: 'Pedir Blueprint Express 4K ($29)',
      partnerSecondaryCta: 'Para Agências de Vídeo →',
    },
    faq: {
      eyebrow: 'Perguntas Frequentes',
      heading: 'Tudo o que Você Precisa Saber',
      items: [
        {
          q: 'O que é exatamente um Filme de Cinema Express 4K?',
          a: 'É um filme documental 4K fotorrealista que combina suas fotos reais e cenas 4K personalizadas com movimento suave de câmera (Ken Burns), vozes de estúdio, efeitos sonoros e trilha musical original—entregue no mesmo dia.',
        },
        {
          q: 'Como funciona o Passe Blueprint com Storyboard de $29?',
          a: 'Você começa pagando $29 pelo Whop Checkout e entra imediatamente na entrevista guiada de 5 minutos por voz ou texto. Em ~3 minutos recebe o Blueprint ilustrado e narrado com 4 revisões por IA e link de comentários para a família. Os $29 são 100% abatidos do valor final do filme 4K.',
        },
        {
          q: 'Familiares ou colegas podem contribuir com histórias antes de finalizar?',
          a: 'Sim! Seu portal inclui um link separado somente para comentários. Parentes ou colegas podem ouvir em qualquer um dos 70+ idiomas de produção (portal nativo em 14 idiomas) sem consumir suas rodadas.',
        },
        {
          q: 'Como os 14 portais nativos e os 70+ idiomas de filme localizados culturalmente funcionam juntos?',
          a: 'Opere em 14 portais nativos. Produza filmes culturalmente autênticos em mais de 70 idiomas. Revise e gerencie projetos em 14 idiomas de portal de alto impacto (inglês, espanhol, português, hindi, chinês, árabe, tailandês, japonês, coreano, alemão, francês, italiano, holandês e russo)—enquanto o motor narrativo e visual da SceneFlow produz masters 4K localizados culturalmente em mais de 70 idiomas, com contexto histórico fiel à região, ambientação arquitetônica e de interiores local e travas de pronúncia nativa.',
        },
        {
          q: 'E quanto à pronúncia de sobrenomes, cidades ou marcas?',
          a: 'Sua Biblioteca de Continuidade tem um guia fonético de 10 segundos (por voz ou texto). Você ainda assiste ao corte completo narrado na Sala de Exibição antes da renderização 4K.',
        },
        {
          q: 'Minhas fotos são usadas para treinar modelos de IA?',
          a: 'Nunca. Removemos os dados de localização GPS EXIF automaticamente no envio e jamais treinamos modelos compartilhados com arquivos de clientes.',
        },
        {
          q: 'Posso fazer upgrade depois para vídeo em movimento total?',
          a: 'Sim. Esta loja entrega somente Cinema Express 4K para manter agilidade e preço acessível, mas seu projeto travado pode ser evoluído sem retrabalho com um Parceiro Certificado SceneFlow Studio.',
        },
      ],
    },
    footer: {
      referenceTag: '· Loja de Referência ao Vivo',
      body: 'Esta loja funciona 100% no motor white-label do SceneFlow Studio com pagamentos Whop Merchant of Record. Operadores podem lançar sua própria loja com sua marca e ficar com 100% do faturamento.',
      primaryCta: 'Iniciar Passe Blueprint $29',
      secondaryCta: 'Use Isso Sob Sua Própria Marca →',
    },
    modal: {
      stepBadge: 'Passo 1 · Passe Blueprint',
      linePass: 'Passe Blueprint com Storyboard',
      lineBalance: 'Saldo Express 4K depois (só se aprovar)',
      lineTotal: 'Total Filme Express 4K',
      whopNotice: 'Processado com segurança pela Whop (Merchant of Record)',
      currencyNote: 'Valores exibidos em estimativa local; a Whop liquida em USD ($29 hoje).',
      instantLinkNote: 'Link mágico instantâneo para sua entrevista guiada de 5 minutos logo após o pagamento.',
      fieldOccasion: 'Ocasião / Estilo do Filme',
      fieldTitle: 'Quem ou o que este filme celebra? (opcional)',
      fieldName: 'Seu Nome *',
      fieldNamePlaceholder: 'Alexandre Silva',
      fieldLanguage: 'Idioma da Interface',
      fieldLanguageHint: "Seu filme e narração podem ser produzidos em mais de 70 idiomas (francês, italiano, alemão, japonês e mais) na entrevista.",
      whopRefBadge: "Pagamentos processados pela Whop",
      fieldEmail: 'E-mail para Seus Links Privados *',
      fieldEmailPlaceholder: 'voce@exemplo.com',
      submitIdlePrefix: 'Ir para o Pagamento Seguro —',
      submitBusy: 'Abrindo pagamento seguro...',
      errorFallback: 'Não foi possível iniciar o Whop Checkout. Tente novamente.',
      errorNetwork: 'Erro de rede ao iniciar o Whop Checkout. Tente novamente.',
      totalOptionSuffix: 'total',
      todayOptionSuffix: 'hoje',
    },
    orderPage: {
      whopBadgeShort: 'Whop MoR',
      whopBadgeFull: 'Whop Merchant of Record',
      loading: 'Confirmando seu pagamento na Whop...',
      notFound: 'Pedido não encontrado',
      returnCta: 'Voltar para Keepsake Cinema',
      confirmedTag: 'Pagamento Confirmado · Pronto Agora',
      unlockedTitle: 'Seu Filme Express 4K Está Liberado!',
      welcomePrefix: 'Bem-vindo,',
      unlockedBody:
        'Obrigado por concluir seu saldo Express 4K. Sua Biblioteca de Continuidade já está ativa: envie fotos reais do celular e adicione um guia de pronúncia de 10 segundos para produzirmos seu filme 4K hoje mesmo.',
      passBody:
        'Seu Passe Blueprint com Storyboard está ativo e 100% creditado no seu filme Express 4K. Inicie sua entrevista guiada agora ou abra o link mágico enviado para o seu e-mail.',
      emailCopiedNotice:
        'Também enviamos uma cópia privada deste link para o seu e-mail para retomar do celular ou computador quando quiser.',
      ctaContinuity: 'Abrir Minha Biblioteca de Fotos e Continuidade',
      ctaIntake: 'Iniciar Minha Entrevista Guiada de 5 Minutos',
      finalizingTitle: 'Preparando Seu Portal Privado...',
      pendingTitle: 'Pagamento Pendente',
      finalizingBody:
        'Estamos confirmando seu pagamento na Whop e gerando seu link privado de estúdio. Leva apenas alguns segundos.',
      pendingBody: 'Conclua o checkout na Whop para liberar instantaneamente seu portal privado.',
      refreshBtn: 'Atualizar Status',
      resumeCheckoutPrefix: 'Retomar Checkout Whop',
    },
  },

  hi: {
    shortCode: 'HI',
    nativeLabel: 'हिन्दी',
    brandSubtitleMobile: 'एक्सप्रेस 4K फिल्म्स',
    brandSubtitleDesktop: 'एक्सप्रेस 4K जीवन और उत्सव फिल्में',
    topBarBadge: 'लाइव व्हाइट-लेबल रेफरेंस स्टोरफ्रंट',
    topBarSubtext: '· केवल एक्सप्रेस 4K सिनेमा · SceneFlow Studio द्वारा संचालित',
    topBarCtaMobile: 'अपना स्टूडियो शुरू करें',
    topBarCtaDesktop: 'SceneFlow पर अपना ब्रांडेड स्टूडियो लॉन्च करें',
    nav: {
      occasions: 'अवसर',
      howItWorks: 'कैसे काम करता है',
      expressQuality: 'एक्सप्रेस 4K गुणवत्ता',
      faq: 'सवाल-जवाब',
      ctaMobile: 'ब्लूप्रिंट $29',
      ctaDesktop: '$29 ब्लूप्रिंट शुरू करें',
    },
    hero: {
      eyebrow: '1+ घंटे की फ़ीचर फ़िल्में व मल्टी-एपिसोड सीरीज़ · ऐतिहासिक पुनर्रचना · ज़ीरो AI स्लॉप',
      titlePrefix: 'जीवन के सबसे अनमोल अध्यायों को बनाएं ',
      titleAccent: '1+ घंटे की 4K फ़िल्म या सीरीज़',
      titleSuffix: ' — आज ही डिलीवरी।',
      subtitleLead: '',
      subtitleHighlight1: 'पारिवारिक विरासत और ऐतिहासिक पुनर्रचनाओं',
      subtitleMid: ' से लेकर ',
      subtitleHighlight2: 'मल्टी-एपिसोड जीवनियाँ, शादियाँ और रिटायरमेंट',
      subtitleEnd:
        ' तक—बिना फ़िल्माए गए जीवन के अध्यायों को प्रामाणिक लोगों, स्थानों, संस्कृति और ऐतिहासिक संदर्भ के साथ 30–150 मिनट की फ़ीचर फ़िल्म या बिंज-योग्य मल्टी-एपिसोड सीरीज़ में पुनर्जीवित करें ($149 में 60 मिनट / 360 निर्देशित फ़्रेम तक शामिल), साथ में 1–3 मिनट का थिएट्रिकल ट्रेलर, वॉइस क्लोनिंग और मूल संगीत।',
      metric1Sub: 'ब्लूप्रिंट पास (100% क्रेडिट)',
      metric2Sub: '60 मिनट तक 4K फ़ीचर या सीरीज़ + ट्रेलर',
      metric3Val: '2–4 घंटे',
      metric3Sub: 'फोटो लॉक के बाद उसी दिन 4K',
      primaryCta: 'मेरा $29 स्टोरीबोर्ड ब्लूप्रिंट शुरू करें',
      secondaryCta: 'सभी अवसर देखें',
      trustWhop: 'आपके $29 का 100% 4K फिल्म में क्रेडिट',
      trustPrivacy: '100% निजी तस्वीरें — AI ट्रेनिंग में कभी उपयोग नहीं',
      trustLanguages: '14 नेटिव UI पोर्टल · 70+ भाषाओं में सांस्कृतिक रूप से लोकलाइज़्ड 4K मास्टर',
    },
    theater: {
      eyebrow: 'एक्सप्रेस 4K सिनेमा रील',
      watchSamplePrefix: 'सैंपल देखें',
      sameDayTagSuffix: 'उसी दिन 4K',
      formatToggle: {
        express4kLabel: '4K सिनेमा',
        express4kSub: 'आज ऑर्डर करें',
        fullMotionLabel: 'फुल मोशन',
        fullMotionSub: 'स्टूडियो प्रीव्यू',
        fullMotionEyebrow: 'फुल-मोशन सिनेमा प्रीव्यू',
        fullMotionTagSuffix: 'पार्टनर स्टूडियो टियर (केवल डेमो)',
        express4kNote:
          'स्मूद केन बर्न्स कैमरा मोशन, स्टूडियो वॉइस और संगीत के साथ 4K फ्रेम — नीचे तुरंत ऑर्डर के लिए उपलब्ध।',
        fullMotionNote:
          'लाइव-एक्शन AI मोशन और लिप-सिंक डायलॉग — यहाँ दोनों विकल्प देखें; फुल-मोशन फिल्में SceneFlow पार्टनर स्टूडियो द्वारा बनाई जाती हैं।',
        cardExpressBadge: '4K · उसी दिन',
        cardFullMotionBadge: 'फुल मोशन · डेमो',
        watchExpressPrefix: '4K सिनेमा चलाएँ',
        watchFullMotionPrefix: 'फुल मोशन चलाएँ',
        heroSwitchPrefix: 'दोनों फॉर्मेट देखें:',
        heroOrFullMotion: 'या फुल-मोशन सिनेमा',
      },
      tabs: [
        {
          id: 'family_legacy',
          label: 'जीवन और उत्सव',
          caption: 'पारिवारिक विरासत · शादियाँ · ग्रेजुएशन · रिटायरमेंट',
          priceUsd: 149,
          videoSlug: 'memoir',
        },
        {
          id: 'real_estate_express',
          label: 'रियल एस्टेट 4K',
          caption: 'प्रॉपर्टी तस्वीरों से वॉइस-ओवर 4K सिनेमा टूर',
          priceUsd: 149,
          videoSlug: 'realestate',
        },
        {
          id: 'brand_express',
          label: 'ब्रांड और क्लीनिक',
          caption: 'बिना शूट के विश्वसनीय होमपेज ब्रांड फिल्म',
          priceUsd: 199,
          videoSlug: 'brand',
        },
        {
          id: 'training_express',
          label: 'ट्रेनिंग और SOP',
          caption: 'लॉक प्रशिक्षक के साथ अपडेट करने में आसान 4K मॉड्यूल',
          priceUsd: 249,
          videoSlug: 'training',
        },
      ],
    },
    occasions: {
      eyebrow: 'क्यूरेटेड एक्सप्रेस 4K कलेक्शन',
      heading: 'हर खास पड़ाव बड़े पर्दे का हकदार है।',
      subtitle:
        'नीचे दिए 2-मिनट के वीडियो संक्षिप्त प्रीव्यू सैंपल हैं—आपके $149 पैकेज में एक वास्तविक 1+ घंटे की 4K फ़ीचर फ़िल्म या बिंज-योग्य मल्टी-एपिसोड सीरीज़ (60 मिनट / 360 निर्देशित फ़्रेम तक; 150 मिनट तक विस्तार योग्य) शामिल है जो युग-सटीक लोगों, स्थानों, संस्कृति और इतिहास के साथ अनफ़िल्माए अध्यायों को पुनर्जीवित करती है, साथ ही 1–3 मिनट का ट्रेलर। $29 ब्लूप्रिंट पास (100% क्रेडिट) से शुरुआत करें।',
      tabAll: 'सभी उदाहरण (4)',
      tabMilestones: 'जीवन के पड़ाव (1)',
      tabCommercial: 'व्यवसाय और प्रॉपर्टी (3)',
      groupMilestonesHeading: 'जीवन कथाएँ और विशेष अवसर',
      groupCommercialHeading: 'रियल एस्टेट, ब्रांड स्टोरी और ट्रेनिंग उदाहरण',
      groupCommercialSub:
        'प्रॉपर्टी टूर, फाउंडर ब्रांड स्टोरी और कॉर्पोरेट ट्रेनिंग के लिए 4K सिनेमा और फुल-मोशन प्रीव्यू दोनों देखें।',
      idealForLabel: 'उपयुक्त:',
      cardCta: '$29 ब्लूप्रिंट शुरू करें',
      offers: {
        family_legacy: {
          badge: 'सबसे लोकप्रिय · 1+ घंटे की फ़ीचर या सीरीज़',
          title: 'जीवन गाथा, पारिवारिक संस्मरण, शादियाँ, ग्रेजुएशन और अधिक',
          subtitle:
            'गहराई से कहानी कहें—प्रामाणिक लोगों, स्थानों, संस्कृति और ऐतिहासिक संदर्भ के साथ अनफ़िल्माए अध्यायों को पुनर्जीवित करते हुए एक अविस्मरणीय 1+ घंटे की (30–150 मिनट) फ़ीचर फ़िल्म या मल्टी-एपिसोड जीवन सीरीज़ बनाएँ। आपके $149 पैकेज में 60 मिनट (360 निर्देशित 4K फ़्रेम) तक और साझा करने योग्य 1–3 मिनट का थिएट्रिकल ट्रेलर शामिल है।',
          idealFor:
            '70वाँ/80वाँ जन्मदिन, पारिवारिक विरासत, मल्टी-एपिसोड जीवन सीरीज़, शादी व सालगिरह, ग्रेजुएशन, रिटायरमेंट और जीवन उत्सव',
          runtimeLabel: '60 मिनट तक फ़ीचर या मल्टी-एपिसोड सीरीज़ · + 1–3 मिनट ट्रेलर',
          turnaroundLabel: 'उसी दिन (फोटो लॉक के 2–4 घंटे में)',
          deliverables: [
            '60 मिनट तक 4K फ़ीचर या मल्टी-एपिसोड सीरीज़ (360 निर्देशित फ़्रेम; 150 मिनट तक विस्तार योग्य)',
            'परिवार और कार्यक्रम निमंत्रण के लिए साझा करने योग्य 1–3 मिनट का थिएट्रिकल ट्रेलर शामिल',
            'ऐतिहासिक पुनर्रचना: 28 वर्ष की उम्र का चित्रण, रिश्तेदारों की समानता, युग-विशेष स्थान और पारिवारिक धरोहरें',
            '70+ भाषाओं में क्षेत्रीय व दशक-विशिष्ट सांस्कृतिक/आर्थिक संदर्भ + मंचित पारिवारिक समारोह और परंपराएँ शामिल',
          ],
          titlePlaceholder: 'उदा., दादाजी का 80वाँ जन्मदिन सम्मान',
        },
        wedding_love: {
          badge: 'शादी और सालगिरह',
          title: 'प्रेम कहानियाँ, शादियाँ और सालगिरह',
          subtitle:
            'आपकी पहली मुलाकात, यादगार यात्राओं और परिवार के आशीर्वाद को संगीत, रिसेप्शन या 25वीं/50वीं सालगिरह के लिए भव्य 4K फिल्म में बदलें।',
          idealFor: 'संगीत, वेडिंग रिसेप्शन, 25वीं व 50वीं सालगिरह, सगाई फिल्म',
          runtimeLabel: '60 मिनट तक (360 फ्रेम) · + 1–3 मिनट ट्रेलर',
          turnaroundLabel: 'उसी दिन (फोटो लॉक के 2–4 घंटे में)',
          deliverables: [
            'स्टोरी ब्लूप्रिंट + परिवार व दोस्तों का कमेंट लिंक',
            'फोन से सीधे जोड़े की पसंदीदा तस्वीरें अपलोड करें',
            'भावपूर्ण नैरेशन, परिवेश ध्वनि और सिनेमैटिक संगीत',
            'वेन्यू प्रोजेक्टर और टीवी के लिए तैयार 4K MP4',
          ],
          titlePlaceholder: 'उदा., आरव और मीरा — हमारी प्रेम कहानी',
        },
        graduation_milestone: {
          badge: 'ग्रेजुएशन और उपलब्धियाँ',
          title: 'ग्रेजुएशन और युवा उपलब्धि सम्मान',
          subtitle:
            'स्कूल, कॉलेज या डिग्री की सफलता का जश्न मनाएँ—बचपन के पहले कदम और खेल जीत से लेकर स्नातक के गौरव तक की प्रेरणादायक 4K कहानी।',
          idealFor: 'स्कूल व यूनिवर्सिटी ग्रेजुएशन, सम्मान समारोह और फेयरवेल पार्टी',
          runtimeLabel: '60 मिनट तक (360 फ्रेम) · + 1–3 मिनट ट्रेलर',
          turnaroundLabel: 'उसी दिन (वीकेंड पार्टी के लिए तैयार)',
          deliverables: [
            'माइलस्टोन चिप्स के साथ 5-मिनट का आसान इंटरव्यू',
            'माता-पिता, कोच व दोस्तों से यादें जोड़ने का गेस्ट लिंक',
            'फोन फोटो अपलोड + नाम व कॉलेज उच्चारण गाइड',
            'पार्टी स्क्रीन व परिवार संग शेयर करने के लिए 4K MP4',
          ],
          titlePlaceholder: 'उदा., अनन्या की क्लास ऑफ़ 2026 यात्रा',
        },
        retirement_tribute: {
          badge: 'रिटायरमेंट और करियर विरासत',
          title: 'रिटायरमेंट और करियर सम्मान फिल्म',
          subtitle:
            '20–40 वर्षों के नेतृत्व, मार्गदर्शन और कार्यस्थल की अविस्मरणीय यादों को सहकर्मियों के संदेशों के साथ एक शानदार 4K सम्मान फिल्म में पिरोएँ।',
          idealFor: 'रिटायरमेंट डिनर, एग्जीक्यूटिव फेयरवेल, संस्थापक और सेवा सम्मान',
          runtimeLabel: '60 मिनट तक (360 फ्रेम) · + 1–3 मिनट ट्रेलर',
          turnaroundLabel: 'उसी दिन (फोटो लॉक के 2–4 घंटे में)',
          deliverables: [
            'सहकर्मियों की यादें जोड़ने के लिए निजी कमेंट लिंक',
            'करियर, टीम और खास उपलब्धियों की तस्वीरें अपलोड करें',
            'स्टूडियो नैरेशन + 10-सेकंड नाम व कंपनी उच्चारण गाइड',
            'बैंक्वेट स्क्रीन और विदाई समारोह के लिए 4K MP4 मास्टर',
          ],
          titlePlaceholder: 'उदा., 35 वर्ष की सेवा — कैप्टन राजेश शर्मा',
        },
        real_estate_express: {
          badge: 'रियल एस्टेट · उसी दिन 4K',
          title: 'एक्सप्रेस 4K प्रॉपर्टी लिस्टिंग फिल्म',
          subtitle:
            'मौजूदा प्रॉपर्टी तस्वीरों और लोकेशन की खूबियों को उसी दिन वॉइस-ओवर और संगीत के साथ शानदार 4K सिनेमा टूर में बदलें—बिना अतिरिक्त शूट के।',
          idealFor: 'आवासीय प्रॉपर्टी, लग्ज़री विला, बुटीक होटल और वेकेशन रेंटल',
          runtimeLabel: '60 मिनट तक (360 फ्रेम) · डीप टूर + 1–3 मिनट ट्रेलर',
          turnaroundLabel: 'उसी दिन (2–3 घंटे)',
          deliverables: [
            '~3 मिनट में कमरा-दर-कमरा स्टोरीबोर्ड ब्लूप्रिंट',
            'फोन या डेस्कटॉप से सीधे लिस्टिंग फोटो अपलोड करें',
            'अंतरराष्ट्रीय खरीदारों के लिए बहुभाषी डब विकल्प',
            'वर्चुअल फ़र्नीचर अपडेट, जीवंत पड़ोस लाइफ़स्टाइल स्टेजिंग और 70+ भाषाओं में लोकलाइज़्ड खरीदार नैरेशन शामिल',
          ],
          titlePlaceholder: 'उदा., 420 हार्बर क्रेस्ट लक्ज़री विला',
        },
        brand_express: {
          badge: 'व्यवसाय और क्लीनिक · उसी दिन 4K',
          title: 'एक्सप्रेस 4K ब्रांड और संस्थापक फिल्म',
          subtitle:
            '$5,000 के एजेंसी शूट के बिना अपनी वेबसाइट के लिए विश्वसनीय 4K ब्रांड स्टोरी बनाएँ—फोटोरियलिस्टिक दृश्य, स्पष्ट आवाज़ और संगीत के साथ।',
          idealFor: 'मेडिकल/डेंटल क्लीनिक, लॉ फर्म, स्थानीय व्यवसाय और स्टार्टअप संस्थापक',
          runtimeLabel: '60 मिनट तक (360 फ्रेम) · ब्रांड डॉक + 1–3 मिनट ट्रेलर',
          turnaroundLabel: 'उसी दिन (2–4 घंटे)',
          deliverables: [
            'विश्वास बढ़ाने वाला ब्लूप्रिंट + टीम रिव्यू लिंक',
            'संस्थापक, क्लीनिक/ऑफ़िस और ब्रांड विज़ुअल लॉक',
            'ब्रांड व लीडरशिप नामों के लिए 10-सेकंड उच्चारण गाइड',
            'स्थापना-युग का स्थानीय ऐतिहासिक संदर्भ और सक्रिय रोगी/ग्राहक सेवा दृश्यों की स्टेजिंग शामिल',
          ],
          titlePlaceholder: 'उदा., पैसिफिक फैमिली डेंटल — हमारी कहानी',
        },
        training_express: {
          badge: 'ट्रेनिंग और SOP · उसी दिन 4K',
          title: 'एक्सप्रेस 4K नैरेटेड ट्रेनिंग और SOP फिल्म',
          subtitle:
            'मैनुअल, ऑनबोर्डिंग या सेफ्टी नियमों को एक समान प्रशिक्षक के साथ स्पष्ट 4K ट्रेनिंग मॉड्यूल में बदलें—नियम बदलने पर मिनटों में अपडेट करें।',
          idealFor: 'कर्मचारी ऑनबोर्डिंग, कार्यस्थल सुरक्षा, क्लीनिक SOP और फ्रैंचाइज़ी',
          runtimeLabel: '60 मिनट तक (360 फ्रेम) · फुल कोर्स + 1–3 मिनट ट्रेलर',
          turnaroundLabel: 'उसी दिन (2–4 घंटे)',
          deliverables: [
            'अध्याय-वार ब्लूप्रिंट + स्टेकहोल्डर स्वीकृति लिंक',
            'लॉक प्रशिक्षक, यूनिफ़ॉर्म और कार्यस्थल निरंतरता',
            'तकनीकी शब्दों के लिए 10-सेकंड उच्चारण गाइड',
            'क्षेत्रीय अनुपालन और 70+ कार्यबल भाषाओं के अनुरूप लोकलाइज़्ड कार्यस्थल सुरक्षा/उपकरण परिदृश्य स्टेजिंग शामिल',
          ],
          titlePlaceholder: 'उदा., नए कर्मचारियों के लिए सुरक्षा प्रशिक्षण',
        },
      },
    },
    steps: {
      eyebrow: 'बिना लॉगिन का सहज अनुभव',
      heading: 'यादों से 4K फिल्म तक — केवल 3 आसान कदम',
      subtitle: 'कोई अकाउंट नहीं बनाना, कोई जटिल सॉफ्टवेयर नहीं, और हफ्तों का इंतज़ार नहीं।',
      items: [
        {
          tag: 'कदम 01 · आज $29',
          title: '5-मिनट गाइडेड कहानी और जीवंत ब्लूप्रिंट',
          body: '14-भाषा नेटिव पोर्टल के अंदर 70+ फ़िल्म भाषाओं (फ़्रेंच, हिंदी, स्पेनिश, जापानी आदि) में से किसी में भी अपनी कहानी साझा करें। ~3 मिनट में चित्रित व सुनाया गया ब्लूप्रिंट, पारिवारिक कमेंट लिंक और 4 AI संशोधन राउंड पाएँ।',
          highlight: 'आपके $29 का 100% अंतिम 4K फिल्म में क्रेडिट होता है →',
        },
        {
          tag: 'कदम 02 · शेष $120',
          title: 'फोन फोटो, उच्चारण और कॉन्टिन्यूटी लॉक',
          body: 'ब्लूप्रिंट स्वीकृत करें और Whop द्वारा शेष राशि पूरा कर अपनी निजी फोटो लाइब्रेरी खोलें। फोन से असली फोटो अपलोड करें (GPS हटाया गया) और 10-सेकंड नाम उच्चारण गाइड जोड़ें।',
          highlight: 'रेंडर से पहले हर नाम और चेहरा सत्यापित →',
        },
        {
          tag: 'कदम 03 · उसी दिन 4K',
          title: 'निजी स्क्रीनिंग रूम और ऑटोमैटिक 4K मास्टर',
          body: 'बिना लॉगिन के लिंक से फोन या टीवी पर अपनी पूरी आवाज़ व संगीत वाली 4K फिल्म देखें। Approve दबाते ही 4K MP4 मास्टर ऑटो-रेंडर होकर सीधे आपके ईमेल पर आ जाता है।',
          highlight: 'प्रोजेक्टर, स्मार्ट टीवी और परिवार संग शेयर करने को तैयार →',
        },
      ],
    },
    clarity: {
      badge: 'एक्सप्रेस 4K सिनेमा इतना प्रभावी क्यों है',
      heading: 'केन बर्न्स डॉक्यूमेंट्री सिनेमा और आधुनिक 4K स्टोरीटेलिंग का संगम',
      body: 'एक भावपूर्ण डॉक्यूमेंट्री फिल्म की ताकत, कस्टम फोटोरियलिस्टिक 4K दृश्य, युगों के पार चेहरों की निरंतरता, स्टूडियो वॉइस, परिवेश ध्वनि और मौलिक संगीत। यहाँ केवल एक्सप्रेस 4K सिनेमा पर ध्यान केंद्रित कर हम $2,500+ और हफ्तों के बजाय उसी दिन $149–$249 में शानदार गुणवत्ता देते हैं।',
      bullets: [
        'स्मूथ कैमरा मोशन के साथ फोटोरियलिस्टिक 4K दृश्य',
        'आपकी असली तस्वीरों का सहज समायोजन',
        'स्टूडियो नैरेशन, SFX और मौलिक संगीत',
        '100% व्यक्तिगत व व्यावसायिक अधिकार',
      ],
      partnerHeading: 'बाद में फुल-मोशन AI वीडियो चाहिए?',
      partnerBody1:
        'यह एक्सप्रेस स्टोरफ्रंट जानबूझकर केवल एक्सप्रेस 4K सिनेमा प्रदान करता है—ताकि गुणवत्ता एक समान और डिलीवरी उसी दिन रहे।',
      partnerBody2:
        'यदि आप बाद में चुनिंदा अध्यायों को फुल-मोशन वीडियो में अपग्रेड करना चाहें, तो आपका लॉक कॉन्टिन्यूटी वॉल्ट बिना दोबारा काम किए प्रमाणित SceneFlow पार्टनर को ट्रांसफर हो जाता है।',
      partnerPrimaryCta: 'एक्सप्रेस 4K ब्लूप्रिंट ऑर्डर करें ($29)',
      partnerSecondaryCta: 'वीडियो एजेंसियों के लिए →',
    },
    faq: {
      eyebrow: 'सवाल और जवाब',
      heading: 'हर ज़रूरी जानकारी',
      items: [
        {
          q: 'एक्सप्रेस 4K सिनेमा फिल्म क्या है?',
          a: 'यह एक फोटोरियलिस्टिक डॉक्यूमेंट्री-शैली की 4K फिल्म है जो आपकी असली तस्वीरों और कस्टम 4K दृश्यों को स्मूथ कैमरा मोशन, स्टूडियो आवाज़, साउंड इफेक्ट्स और मौलिक संगीत के साथ उसी दिन तैयार करती है।',
        },
        {
          q: '$29 स्टोरीबोर्ड ब्लूप्रिंट पास कैसे काम करता है?',
          a: 'Whop Checkout से $29 भुगतान करते ही आपका 5-मिनट का गाइडेड इंटरव्यू शुरू होता है। ~3 मिनट में आपको 4 AI संशोधन राउंड और पारिवारिक कमेंट लिंक के साथ चित्रित ब्लूप्रिंट मिलता है। पूरा $29 आपकी 4K फिल्म में जुड़ जाता है।',
        },
        {
          q: 'क्या परिवार के सदस्य या सहकर्मी भी अपनी यादें जोड़ सकते हैं?',
          a: 'हाँ! आपके पोर्टल में एक अलग गेस्ट कमेंट-ओनली लिंक होता है जिससे परिजन 70+ फ़िल्म भाषाओं में सुन सकते हैं (14-भाषा नेटिव पोर्टल UI के साथ) और बिना आपके राउंड खर्च किए सुझाव दे सकते हैं।',
        },
        {
          q: '14 नेटिव UI पोर्टल और 70+ सांस्कृतिक रूप से लोकलाइज़्ड फ़िल्म भाषाएँ एक साथ कैसे काम करती हैं?',
          a: '14 नेटिव पोर्टल में काम करें और 70+ भाषाओं में सांस्कृतिक रूप से प्रामाणिक फ़िल्में बनाएँ। 14 प्रमुख पोर्टल भाषाओं (अंग्रेज़ी, स्पेनिश, पुर्तगाली, हिंदी, चीनी, अरबी, थाई, जापानी, कोरियाई, जर्मन, फ़्रेंच, इतालवी, डच और रूसी) में प्रोजेक्ट की समीक्षा और प्रबंधन करें—जबकि SceneFlow का स्टोरी और विज़ुअल इंजन 70+ भाषाओं में सांस्कृतिक रूप से लोकलाइज़्ड 4K मास्टर तैयार करता है, जिनमें क्षेत्रीय ऐतिहासिक संदर्भ, स्थानीय वास्तुकला/इंटीरियर स्टेजिंग और नेटिव उच्चारण लॉक शामिल होते हैं।',
        },
        {
          q: 'खास नामों या शहरों का सही उच्चारण कैसे सुनिश्चित होगा?',
          a: 'कॉन्टिन्यूटी लाइब्रेरी में 10-सेकंड का फोनेटिक उच्चारण गाइड है, और आप 4K रेंडर से पहले स्क्रीनिंग रूम में पूरी आवाज़ वाली फिल्म खुद सुनकर स्वीकृत करते हैं।',
        },
        {
          q: 'क्या मेरी तस्वीरों का उपयोग AI ट्रेनिंग के लिए होता है?',
          a: 'कभी नहीं। अपलोड होते ही EXIF GPS डेटा हटा दिया जाता है और क्लाइंट की फाइलें कभी साझा मॉडल ट्रेनिंग में उपयोग नहीं होतीं।',
        },
        {
          q: 'क्या मैं बाद में फुल-मोशन वीडियो में अपग्रेड कर सकता हूँ?',
          a: 'हाँ, आपका लॉक प्रोजेक्ट बिना किसी दोबारा काम के प्रमाणित SceneFlow Studio पार्टनर के माध्यम से फुल-मोशन में अपग्रेड किया जा सकता है।',
        },
      ],
    },
    footer: {
      referenceTag: '· लाइव रेफरेंस स्टोरफ्रंट',
      body: 'यह स्टोरफ्रंट 100% SceneFlow Studio के व्हाइट-लेबल क्लाइंट पोर्टल और Whop Merchant of Record पर चलता है। स्टूडियो ऑपरेटर इसे अपने ब्रांड व डोमेन पर लॉन्च कर 100% क्लाइंट आय रख सकते हैं।',
      primaryCta: '$29 ब्लूप्रिंट पास शुरू करें',
      secondaryCta: 'इसे अपने ब्रांड के तहत चलाएँ →',
    },
    modal: {
      stepBadge: 'कदम 1 · ब्लूप्रिंट पास',
      linePass: 'स्टोरीबोर्ड ब्लूप्रिंट पास',
      lineBalance: 'बाद में एक्सप्रेस 4K शेष (केवल स्वीकृति पर)',
      lineTotal: 'कुल एक्सप्रेस 4K फिल्म',
      whopNotice: 'Whop (Merchant of Record) द्वारा सुरक्षित भुगतान',
      currencyNote: 'स्थानीय मुद्रा अनुमान दिखाया गया है; Whop USD ($29 आज) में भुगतान संसाधित करता है।',
      instantLinkNote: 'भुगतान के तुरंत बाद 5-मिनट के गाइडेड इंटरव्यू का मैजिक लिंक मिलता है।',
      fieldOccasion: 'अवसर / फिल्म शैली',
      fieldTitle: 'यह फिल्म किसके या किस अवसर के लिए है? (वैकल्पिक)',
      fieldName: 'आपका नाम *',
      fieldNamePlaceholder: 'आरव शर्मा',
      fieldLanguage: 'पोर्टल UI भाषा',
      fieldLanguageHint: "आपकी फिल्म और नैरेशन 70+ भाषाओं (जैसे फ़्रेंच, इटैलियन, जापानी, हिंदी आदि) में तैयार की जा सकती है।",
      whopRefBadge: "Whop द्वारा संसाधित भुगतान",
      fieldEmail: 'निजी स्टूडियो लिंक के लिए ईमेल *',
      fieldEmailPlaceholder: 'you@example.com',
      submitIdlePrefix: 'सुरक्षित भुगतान पर आगे बढ़ें —',
      submitBusy: 'सुरक्षित भुगतान खुल रहा है...',
      errorFallback: 'Whop Checkout शुरू नहीं हो सका। कृपया पुनः प्रयास करें।',
      errorNetwork: 'नेटवर्क त्रुटि। कृपया पुनः प्रयास करें।',
      totalOptionSuffix: 'कुल',
      todayOptionSuffix: 'आज',
    },
    orderPage: {
      whopBadgeShort: 'Whop MoR',
      whopBadgeFull: 'Whop Merchant of Record',
      loading: 'आपका Whop भुगतान सत्यापित हो रहा है...',
      notFound: 'ऑर्डर नहीं मिला',
      returnCta: 'Keepsake Cinema पर लौटें',
      confirmedTag: 'भुगतान सफल · अभी तैयार',
      unlockedTitle: 'आपकी एक्सप्रेस 4K फिल्म अनलॉक हो गई है!',
      welcomePrefix: 'स्वागत है,',
      unlockedBody:
        'एक्सप्रेस 4K शेष भुगतान के लिए धन्यवाद। आपकी निजी कॉन्टिन्यूटी फोटो लाइब्रेरी तैयार है—फोन से तस्वीरें अपलोड करें और 10-सेकंड उच्चारण गाइड जोड़ें।',
      passBody:
        'आपका स्टोरीबोर्ड ब्लूप्रिंट पास सक्रिय है और आपकी 4K फिल्म में 100% क्रेडिट है। अभी अपना गाइडेड इंटरव्यू शुरू करें या ईमेल में भेजा लिंक खोलें।',
      emailCopiedNotice: 'इस मैजिक लिंक की एक प्रति आपके ईमेल पर भी भेजी गई है।',
      ctaContinuity: 'मेरी कॉन्टिन्यूटी फोटो लाइब्रेरी खोलें',
      ctaIntake: 'मेरा 5-मिनट गाइडेड स्टोरी इंटरव्यू शुरू करें',
      finalizingTitle: 'आपका निजी पोर्टल तैयार हो रहा है...',
      pendingTitle: 'भुगतान प्रतीक्षारत',
      finalizingBody: 'हम आपका Whop भुगतान सत्यापित कर आपका निजी स्टूडियो लिंक तैयार कर रहे हैं।',
      pendingBody: 'अपना निजी स्टूडियो पोर्टल खोलने के लिए Whop भुगतान पूरा करें।',
      refreshBtn: 'स्थिति रीफ्रेश करें',
      resumeCheckoutPrefix: 'Whop Checkout जारी रखें',
    },
  },

  'zh-CN': {
    shortCode: '中文',
    nativeLabel: '简体中文',
    brandSubtitleMobile: '极速 4K 电影',
    brandSubtitleDesktop: '极速 4K 人生与重要时刻电影',
    topBarBadge: '白标示范门店 · 实时可体验',
    topBarSubtext: '· 专注极速 4K 电影版 · 由 SceneFlow Studio 驱动',
    topBarCtaMobile: '搭建我的工作室',
    topBarCtaDesktop: '在 SceneFlow 上搭建您自己的白标视频工作室',
    nav: {
      occasions: '适用场景',
      howItWorks: '制作流程',
      expressQuality: '4K 电影品质',
      faq: '常见问题',
      ctaMobile: '蓝图通行证 $29',
      ctaDesktop: '开启 $29 分镜蓝图',
    },
    hero: {
      eyebrow: '1小时+ 院线长片与多集剧集 · 年代情景重现 · 零 AI 粗制滥造',
      titlePrefix: '把人生最珍贵的篇章，铸成一部 ',
      titleAccent: '1小时+ 4K 电影或剧集',
      titleSuffix: ' — 今日即可交付。',
      subtitleLead: '从',
      subtitleHighlight1: '家族传记与历史年代重现',
      subtitleMid: '，到',
      subtitleHighlight2: '多集人物传记、婚礼庆典与荣休致敬',
      subtitleEnd:
        '——以真实还原的人物、场景、文化与历史背景，重现当年未曾拍下的人生篇章，打造 30–150 分钟长片电影或引人入胜的多集剧集（$149 含最高 60 分钟 / 360 帧导演级画面），另含 1–3 分钟院线预告片、声音克隆与原声配乐。',
      metric1Sub: '分镜蓝图通行证（100% 抵扣）',
      metric2Sub: '最高 60 分钟 4K 长片或剧集 + 预告片',
      metric3Val: '2–4 小时',
      metric3Sub: '锁定照片后当日交付 4K 母带',
      primaryCta: '开启我的 $29 分镜蓝图',
      secondaryCta: '浏览全部适用场景',
      trustWhop: '$29 全额抵扣最终 4K 电影费用',
      trustPrivacy: '照片 100% 私密 — 绝不用于训练公共 AI 模型',
      trustLanguages: '14 种原生界面门户 · 70+ 语言文化本地化 4K 母带',
    },
    theater: {
      eyebrow: '极速 4K 电影实拍样片',
      watchSamplePrefix: '播放样片',
      sameDayTagSuffix: '当日 4K',
      formatToggle: {
        express4kLabel: '4K 电影',
        express4kSub: '今日可订',
        fullMotionLabel: '全动态电影',
        fullMotionSub: '工作室预览',
        fullMotionEyebrow: '全动态 AI 电影预览',
        fullMotionTagSuffix: '合作工作室专享（仅演示）',
        express4kNote:
          '超清 4K 电影画面配丝滑 Ken Burns 运镜、棚录配音与原声配乐 — 本站支持当日自助下单。',
        fullMotionNote:
          '真人级 AI 动态镜头与口型同步对白 — 可在此对比两种方案；全动态影片由 SceneFlow 合作工作室定制交付。',
        cardExpressBadge: '4K · 当日交付',
        cardFullMotionBadge: '全动态 · 演示',
        watchExpressPrefix: '播放 4K 电影',
        watchFullMotionPrefix: '播放全动态电影',
        heroSwitchPrefix: '对比方案：',
        heroOrFullMotion: '或全动态电影',
      },
      tabs: [
        {
          id: 'family_legacy',
          label: '人生与庆典',
          caption: '家族传记 · 婚礼周年 · 毕业礼赞 · 荣休致敬',
          priceUsd: 149,
          videoSlug: 'memoir',
        },
        {
          id: 'real_estate_express',
          label: '房产 4K 导览',
          caption: '将房源静图升级为带旁白配乐的 4K 电影导览',
          priceUsd: 149,
          videoSlug: 'realestate',
        },
        {
          id: 'brand_express',
          label: '品牌与诊所',
          caption: '无需实拍团队的高信任官网品牌故事片',
          priceUsd: 199,
          videoSlug: 'brand',
        },
        {
          id: 'training_express',
          label: '培训与 SOP',
          caption: '锁定讲师形象、随时可快速更新的 4K 旁白课程',
          priceUsd: 249,
          videoSlug: 'training',
        },
      ],
    },
    occasions: {
      eyebrow: '精选极速 4K 电影系列',
      heading: '每一个高光时刻，都值得登上大银幕。',
      subtitle:
        '下方 2 分钟视频仅为精选短片示例——您的 $149 套餐包含真正的 1 小时+ 4K 长片电影或多集连续剧集（最长 60 分钟 / 360 帧导演级画面；可扩展至 150 分钟），以符合年代的人物、地点、文化与历史重现未曾拍摄的人生篇章，并附赠 1–3 分钟预告片。从 $29 蓝图通行证起步（100% 全额抵扣）。',
      tabAll: '全部示例 (4)',
      tabMilestones: '人生里程碑 (1)',
      tabCommercial: '商业与房产 (3)',
      groupMilestonesHeading: '人生故事与重要庆典',
      groupCommercialHeading: '房产导览、品牌故事与企业培训示例',
      groupCommercialSub:
        '一站对比高端房产、创始人品牌故事与企业 SOP 培训的 4K 极速电影与全动态预览效果。',
      idealForLabel: '适合场景：',
      cardCta: '开启 $29 蓝图',
      offers: {
        family_legacy: {
          badge: '最受欢迎 · 1小时+ 长片或剧集',
          title: '人生故事与家族回忆录、婚礼、毕业典礼等更多场景',
          subtitle:
            '深入叙事——打造一部令人难忘的 1 小时+（30–150 分钟）长片电影或多集人生剧集，以真实的人物、地点、文化与历史背景重现当年未曾拍摄的人生篇章。您的 $149 套餐包含最长 60 分钟（360 帧导演级 4K 画面）以及可分享的 1–3 分钟院线预告片。',
          idealFor: '70/80 岁大寿、家族传记、多集人生剧集、婚礼与周年纪念、毕业礼赞、荣休致敬与追思礼赞',
          runtimeLabel: '最长 60 分钟长片或多集剧集 · 含 1–3 分钟预告片',
          turnaroundLabel: '当日交付（确认照片后 2–4 小时）',
          deliverables: [
            '最长 60 分钟 4K 长片或多集剧集（360 帧导演级画面；可扩展至 150 分钟）',
            '随附可分享的 1–3 分钟院线预告片，适合亲友转发与活动邀请',
            '年代情景重现：28 岁青春还原、亲属容貌匹配、时代地标与传家信物',
            '含自动区域与年代文化/经济背景，以及跨 70+ 语言的家庭团聚与传统场景还原',
          ],
          titlePlaceholder: '例如：外公八十大寿人生电影',
        },
        wedding_love: {
          badge: '婚礼与周年纪念',
          title: '爱情故事、婚礼与周年电影',
          subtitle:
            '将相遇相知、难忘旅程、求婚瞬间与家人祝福化作影院级 4K 影片，随时在迎宾晚宴、婚宴或银婚/金婚庆典大屏播放。',
          idealFor: '婚宴开场、迎宾晚宴、25/50 周年纪念、求婚回忆片',
          runtimeLabel: '最长 60 分钟 (360 帧) · 含 1–3 分钟预告片',
          turnaroundLabel: '当日交付（确认照片后 2–4 小时）',
          deliverables: [
            '故事分镜蓝图 + 亲友伴郎伴娘留言收集链接',
            '手机直接上传情侣与求婚精选照片',
            '温暖旁白、细腻环境音与电影级原创配乐',
            '适配宴会大屏与家庭电视的 4K MP4 母带',
          ],
          titlePlaceholder: '例如：林溪与子涵——从初遇到永恒',
        },
        graduation_milestone: {
          badge: '毕业礼赞与成长记',
          title: '毕业季与青春成长纪念片',
          subtitle:
            '为高中、大学或硕博毕业献上动人 4K 成长电影——从蹒跚学步、赛场拼搏到深夜苦读与拨穗礼的荣耀时刻。',
          idealFor: '高中/大学毕业典礼、升学宴、奖学金晚宴与青春送别',
          runtimeLabel: '最长 60 分钟 (360 帧) · 含 1–3 分钟预告片',
          turnaroundLabel: '当日交付（周末派对前即可就绪）',
          deliverables: [
            '5 分钟引导访谈，内置成长里程碑灵感标签',
            '一键邀请父母、教练与同学通过访客链接补充寄语',
            '手机照片上传 + 姓名与校名发音指南',
            '高清 4K MP4，适合毕业派对投屏与亲友珍藏',
          ],
          titlePlaceholder: '例如：2026 届毕业成长记——林悦的青春',
        },
        retirement_tribute: {
          badge: '荣休致敬与职业传奇',
          title: '退休纪念与职业生涯电影',
          subtitle:
            '致敬 20–40 年的坚守、领导力与难忘职场点滴，通过专属链接轻松汇集同事祝福，打造体面感人的 4K 荣休礼赞。',
          idealFor: '荣休晚宴、高管欢送会、创始人致敬与资深员工纪念',
          runtimeLabel: '最长 60 分钟 (360 帧) · 含 1–3 分钟预告片',
          turnaroundLabel: '当日交付（确认照片后 2–4 小时）',
          deliverables: [
            '专属同事留言链接，轻松收集团队故事与祝福',
            '上传职业照片、团队合影与代表性里程碑',
            '专业旁白 + 10 秒人名与企业名称发音指南',
            '适合晚宴大屏与线上欢送会的 4K MP4 母带',
          ],
          titlePlaceholder: '例如：三十五载荣光——陈志远荣休纪念',
        },
        real_estate_express: {
          badge: '房产 · 当日 4K',
          title: '极速 4K 房产电影导览',
          subtitle:
            '将现有房源照片与社区亮点当日转化为配音配乐俱全的 4K 电影导览，无需等待天气或二次实地拍摄。',
          idealFor: '住宅房源、豪宅庄园、精品酒店与高端民宿',
          runtimeLabel: '最长 60 分钟 (360 帧) · 深度导览 + 1–3 分钟预告片',
          turnaroundLabel: '当日交付（2–3 小时）',
          deliverables: [
            '约 3 分钟生成逐空间分镜蓝图',
            '手机或电脑直接上传房源实拍图',
            '可选多语种配音，触达海外买家',
            '含虚拟家具焕新、社区活力生活场景呈现及 70+ 语言本地化买家解说',
          ],
          titlePlaceholder: '例如：海湾一号全景海景宅邸',
        },
        brand_express: {
          badge: '品牌与诊所 · 当日 4K',
          title: '极速 4K 创始人与品牌故事片',
          subtitle:
            '无需 $5,000 广告摄制费用，即可为官网打造极具信任感的 4K 品牌起源电影——写实画面、专业旁白与定制配乐一步到位。',
          idealFor: '医疗/口腔诊所、律所、本地企业、匠心品牌与公益机构',
          runtimeLabel: '最长 60 分钟 (360 帧) · 品牌纪录片 + 1–3 分钟预告片',
          turnaroundLabel: '当日交付（2–4 小时）',
          deliverables: [
            '高转化品牌故事蓝图 + 团队协作审阅链接',
            '锁定创始人形象、诊所/办公空间与品牌视觉',
            '10 秒品牌与高管姓名发音指南',
            '含创立年代当地历史背景还原与真实医患/客户服务场景呈现',
          ],
          titlePlaceholder: '例如：海岸家庭齿科——我们的初心',
        },
        training_express: {
          badge: '培训与 SOP · 当日 4K',
          title: '极速 4K 旁白培训与 SOP 课程',
          subtitle:
            '将员工手册、入职清单或安全规范转化为形象统一的 4K 旁白培训短片，制度更新时随时快速迭代。',
          idealFor: '新员工入职、安全生产培训、医疗 SOP 与连锁门店标准',
          runtimeLabel: '最长 60 分钟 (360 帧) · 完整培训课 + 1–3 分钟预告片',
          turnaroundLabel: '当日交付（2–4 小时）',
          deliverables: [
            '结构化章节蓝图 + 管理层签收链接',
            '讲师形象、制服与作业环境全片视觉连贯',
            '专业术语与缩写 10 秒发音指南',
            '含贴合区域合规标准与 70+ 员工语言的本地化职场安全与设备实操场景还原',
          ],
          titlePlaceholder: '例如：新员工安全规范与设备操作培训',
        },
      },
    },
    steps: {
      eyebrow: '零注册 · 全程浏览器直达',
      heading: '从口述回忆到 4K 电影大片，只需 3 步',
      subtitle: '无需注册账号，无需学习复杂剪辑软件，告别数周邮件拉锯。',
      items: [
        {
          tag: '第 1 步 · 今日 $29',
          title: '5 分钟引导访谈与实时分镜蓝图',
          body: '在 14 种语言原生门户中，用 70+ 影片语言（法语、日语、西班牙语、中文等）任一语音或文字讲述故事。约 3 分钟即可获得图文有声蓝图、亲友评论链接及 4 轮 AI 修改。',
          highlight: '$29 全额抵扣您的最终 4K 影片费用 →',
        },
        {
          tag: '第 2 步 · 尾款 $120',
          title: '手机传图、发音指南与视觉锁定',
          body: '批准蓝图并通过 Whop 支付尾款，立即解锁专属照片连贯库。直接从手机上传真实照片（自动清除 GPS），填写 10 秒人名/地名发音指南并锁定人物场景。',
          highlight: '渲染前逐一确认人物形象与姓名读音 →',
        },
        {
          tag: '第 3 步 · 当日 4K',
          title: '专属审片室与自动 4K 母带送达',
          body: '通过免登录审片室链接在手机或电视观看有声配乐成片。点击批准瞬间，云端引擎自动渲染 4K MP4 母带并将下载链接发送至您的邮箱。',
          highlight: '随时投影播放、电视观看与亲友分享 →',
        },
      ],
    },
    clarity: {
      badge: '极速 4K 电影为何如此动人',
      heading: '肯·伯恩斯纪录片质感 × 现代 4K 写实叙事',
      body: '兼具顶级纪录片的情感张力与定制 4K 写实画面、跨年代人物连贯性、影棚级配音、环境音效和原创配乐。本门店专注极速 4K 电影版，以 $149–$249 当日交付替代传统 $2,500+ 和数周等待。',
      bullets: [
        '写实 4K 画面搭配细腻电影运镜',
        '真实上传照片自然融入每一篇章',
        '影棚级旁白、环境音效与原创配乐',
        '100% 个人珍藏与商业使用授权',
      ],
      partnerHeading: '日后想升级全动态 AI 视频？',
      partnerBody1: '本极速门店刻意仅提供极速 4K 电影版，以确保画质高度稳定且当日交付。',
      partnerBody2:
        '若日后希望将精选章节升级为全动态 AI 视频或加入实拍访谈，您的视觉连贯库可零返工移交至 SceneFlow Studio 认证合作伙伴。',
      partnerPrimaryCta: '立即开启 4K 蓝图 ($29)',
      partnerSecondaryCta: '视频服务商合作 →',
    },
    faq: {
      eyebrow: '常见问题',
      heading: '您需要了解的一切',
      items: [
        {
          q: '什么是极速 4K 电影版？',
          a: '它是一部写实纪录片风格的 4K 电影，将您的真实照片与定制 4K 连续画面结合平滑运镜（Ken Burns）、影棚配音、层次环境音效与原创配乐，当日即可交付。',
        },
        {
          q: '$29 分镜蓝图通行证包含什么？',
          a: '通过 Whop 支付 $29 后立即进入 5 分钟语音/文字引导访谈，约 3 分钟获得图文有声分镜蓝图、4 轮 AI 修改及亲友评论链接。$29 将 100% 抵扣最终 4K 成片费用。',
        },
        {
          q: '家人或同事可以在定稿前补充故事吗？',
          a: '可以！门户提供独立的访客只评链接，亲友或同事可用 70+ 影片语言收听（支持 14 种原生门户界面）并留下回忆，不会消耗您的修改次数。',
        },
        {
          q: '14 种原生 UI 门户与 70+ 文化本地化影片语言如何协同运作？',
          a: '在 14 种原生门户中高效运营，在 70+ 语言中打造文化地道的高品质影片。您可以使用 14 种主流门户语言（英语、西班牙语、葡萄牙语、印地语、中文、阿拉伯语、泰语、日语、韩语、德语、法语、意大利语、荷兰语和俄语）审阅与管理项目；同时 SceneFlow 的故事与视觉引擎会以 70+ 语言生成文化本地化 4K 母带，涵盖贴合地域的历史背景、本土建筑与室内陈设以及母语级发音锁定。',
        },
        {
          q: '生僻姓氏、地名或品牌读音如何保证准确？',
          a: '照片连贯库内置 10 秒语音/文字发音指南；渲染 4K 母带前，您还会在专属审片室试听完整有声成片并亲自确认。',
        },
        {
          q: '我的家庭照片或企业资料会被用于训练 AI 吗？',
          a: '绝不会。上传照片时系统自动清除 EXIF GPS 位置信息，仅用于您的专属项目，永不用于训练共享 AI 模型。',
        },
        {
          q: '以后可以升级为全动态视频吗？',
          a: '可以。您在 SceneFlow 中锁定的人物、声音与剧本可随时零返工升级至认证合作伙伴的全动态方案。',
        },
      ],
    },
    footer: {
      referenceTag: '· 白标示范门店',
      body: '本门店 100% 基于 SceneFlow Studio 白标客户门户与 Whop Merchant of Record 驱动。视频服务商可在自有域名下上线同款品牌门店，并保留 100% 客户营收。',
      primaryCta: '开启 $29 蓝图通行证',
      secondaryCta: '用您自己的品牌运行此门店 →',
    },
    modal: {
      stepBadge: '第 1 步 · 蓝图通行证',
      linePass: '分镜蓝图通行证',
      lineBalance: '后续极速 4K 尾款（仅批准后支付）',
      lineTotal: '极速 4K 电影总价',
      whopNotice: '由 Whop（Merchant of Record）安全处理收款',
      currencyNote: '页面显示当地货币估算；Whop 结账按美元结算（今日 $29）。',
      instantLinkNote: '付款后即刻获得 5 分钟引导故事访谈的专属直达链接。',
      fieldOccasion: '适用场景 / 影片风格',
      fieldTitle: '这部电影致敬谁或哪一重要时刻？（选填）',
      fieldName: '您的姓名 *',
      fieldNamePlaceholder: '陈明轩',
      fieldLanguage: '门户界面语言',
      fieldLanguageHint: "影片与配音支持 70+ 语言（如法语、意大利语、日语、韩语等），可在访谈中自由指定。",
      whopRefBadge: "由 Whop 提供收款支持",
      fieldEmail: '接收专属门户链接的邮箱 *',
      fieldEmailPlaceholder: 'you@example.com',
      submitIdlePrefix: '前往安全结账 —',
      submitBusy: '正在打开安全结账...',
      errorFallback: '无法启动 Whop 结账，请重试。',
      errorNetwork: '网络异常，请稍后重试。',
      totalOptionSuffix: '总价',
      todayOptionSuffix: '今日',
    },
    orderPage: {
      whopBadgeShort: 'Whop 收款',
      whopBadgeFull: 'Whop Merchant of Record',
      loading: '正在确认您的 Whop 付款...',
      notFound: '未找到订单',
      returnCta: '返回 Keepsake Cinema',
      confirmedTag: '付款已确认 · 立即开启',
      unlockedTitle: '您的极速 4K 电影已解锁！',
      welcomePrefix: '欢迎您，',
      unlockedBody:
        '感谢完成极速 4K 尾款支付。您的专属照片连贯库已开启——请从手机上传真实照片并填写 10 秒发音指南，我们将在今日为您制作 4K 电影。',
      passBody:
        '您的分镜蓝图通行证已生效，并已 100% 抵扣最终 4K 电影费用。立即开始 5 分钟引导访谈，或查收我们刚刚发送到您邮箱的直达链接。',
      emailCopiedNotice: '此专属链接也已同步发送至您的邮箱，方便随时在手机或电脑继续。',
      ctaContinuity: '打开我的照片与视觉连贯库',
      ctaIntake: '开始我的 5 分钟引导故事访谈',
      finalizingTitle: '正在生成您的专属工作室门户...',
      pendingTitle: '等待完成付款',
      finalizingBody: '我们正在核验 Whop 付款并自动开通您的专属门户链接，通常只需数秒。',
      pendingBody: '完成 Whop 付款即可立即解锁您的专属门户。',
      refreshBtn: '刷新状态',
      resumeCheckoutPrefix: '继续 Whop 付款',
    },
  },

  ar: {
    shortCode: 'AR',
    nativeLabel: 'العربية',
    brandSubtitleMobile: 'أفلام سينما 4K سريعة',
    brandSubtitleDesktop: 'أفلام 4K سريعة للحياة والمناسبات الكبرى',
    topBarBadge: 'متجر عرض مباشر بالعلامة البيضاء',
    topBarSubtext: '· سينما 4K سريعة فقط · مدعوم بواسطة SceneFlow Studio',
    topBarCtaMobile: 'أطلق استوديوك',
    topBarCtaDesktop: 'أطلق استوديوك الخاص بعلامتك على SceneFlow',
    nav: {
      occasions: 'المناسبات',
      howItWorks: 'كيف يعمل',
      expressQuality: 'جودة 4K السريعة',
      faq: 'الأسئلة الشائعة',
      ctaMobile: 'مخطط $29',
      ctaDesktop: 'ابدأ مخطط $29',
    },
    hero: {
      eyebrow: 'أفلام طويلة +1 ساعة ومسلسلات متعددة الحلقات · إعادة تمثيل تاريخية · صفر رداءة ذكاء اصطناعي',
      titlePrefix: 'حوّل أعظم فصول الحياة إلى ',
      titleAccent: 'فيلم أو سلسلة 4K بطول ساعة+',
      titleSuffix: ' — يُسلَّم اليوم.',
      subtitleLead: 'من ',
      subtitleHighlight1: 'إرث العائلة وإعادة التمثيل التاريخي',
      subtitleMid: ' إلى ',
      subtitleHighlight2: 'السير الذاتية متعددة الحلقات وحفلات الزفاف والتقاعد',
      subtitleEnd:
        '—أعد تجسيد فصول الحياة التي لم تُصوَّر أبداً بشخصيات وأماكن وثقافة وسياق تاريخي أصيل في فيلم طويل مدته 30–150 دقيقة أو سلسلة متعددة الحلقات مشوّقة (حتى 60 دقيقة / 360 لقطة مُخرَجة مشمولة مقابل $149)، بالإضافة إلى إعلان سينمائي 1–3 دقائق واستنساخ الصوت والموسيقى التصويرية.',
      metric1Sub: 'بطاقة المخطط (تُخصم 100%)',
      metric2Sub: 'فيلم أو سلسلة 4K حتى 60 دقيقة + إعلان',
      metric3Val: '2–4 ساعات',
      metric3Sub: 'نسخة 4K نفس اليوم بعد الصور',
      primaryCta: 'ابدأ مخطط القصة الآن — $29',
      secondaryCta: 'تصفح جميع المناسبات',
      trustWhop: 'يُخصم 100% من مبلغ $29 من فيلم 4K النهائي',
      trustPrivacy: 'صورك خاصة 100% — لا تُستخدم أبداً لتدريب نماذج الذكاء الاصطناعي',
      trustLanguages: '14 بوابة واجهة أصلية · نسخ 4K ماستر موطّنة ثقافياً بأكثر من 70 لغة',
    },
    theater: {
      eyebrow: 'نماذج سينما 4K السريعة',
      watchSamplePrefix: 'شاهد النموذج',
      sameDayTagSuffix: '4K نفس اليوم',
      formatToggle: {
        express4kLabel: 'سينما 4K',
        express4kSub: 'اطلب اليوم',
        fullMotionLabel: 'حركة كاملة',
        fullMotionSub: 'معاينة الاستوديو',
        fullMotionEyebrow: 'معاينة سينما الحركة الكاملة',
        fullMotionTagSuffix: 'فئة الاستوديوهات الشريكة (عرض فقط)',
        express4kNote:
          'إطارات 4K واقعية مع حركة كاميرا سينمائية وصوت استوديو وموسيقى — متاح للطلب الذاتي اليوم أدناه.',
        fullMotionNote:
          'مشاهد حركة كاملة بالذكاء الاصطناعي وحوار متزامن — قارن الخيارين هنا؛ تُنتج أفلام الحركة الكاملة عبر استوديوهات SceneFlow الشريكة.',
        cardExpressBadge: '4K · نفس اليوم',
        cardFullMotionBadge: 'حركة كاملة · عرض',
        watchExpressPrefix: 'تشغيل سينما 4K',
        watchFullMotionPrefix: 'تشغيل الحركة الكاملة',
        heroSwitchPrefix: 'قارن الخيارات:',
        heroOrFullMotion: 'أو سينما الحركة الكاملة',
      },
      tabs: [
        {
          id: 'family_legacy',
          label: 'الحياة والمناسبات',
          caption: 'إرث العائلة · الزفاف · التخرج · التقاعد',
          priceUsd: 149,
          videoSlug: 'memoir',
        },
        {
          id: 'real_estate_express',
          label: 'العقارات 4K',
          caption: 'صور العقار تتحول إلى جولة سينمائية 4K ناطقة',
          priceUsd: 149,
          videoSlug: 'realestate',
        },
        {
          id: 'brand_express',
          label: 'العلامات والعيادات',
          caption: 'أفلام ثقة للعلامة التجارية بدون طاقم تصوير',
          priceUsd: 199,
          videoSlug: 'brand',
        },
        {
          id: 'training_express',
          label: 'التدريب والإجراءات',
          caption: 'وحدات تدريبية 4K سهلة التحديث بمدرب ثابت',
          priceUsd: 249,
          videoSlug: 'training',
        },
      ],
    },
    occasions: {
      eyebrow: 'مجموعات سينما 4K السريعة',
      heading: 'كل محطة عظيمة تستحق الشاشة الكبيرة.',
      subtitle:
        'مقاطع الدقيقتين أدناه مجرد عينات معاينة — باقتك بقيمة $149 تمنحك فيلماً سينمائياً حقيقياً بدقة 4K بطول ساعة+ أو سلسلة متعددة الحلقات مشوّقة (حتى 60 دقيقة / 360 لقطة مُخرَجة؛ قابلة للتمديد حتى 150 دقيقة) تعيد تجسيد الفصول غير المصوّرة بشخصيات وأماكن وثقافة وتاريخ دقيق لكل حقبة، بالإضافة إلى إعلان 1–3 دقائق. ابدأ ببطاقة المخطط مقابل $29 (تُخصم 100%).',
      tabAll: 'جميع الأمثلة (4)',
      tabMilestones: 'مناسبات الحياة (1)',
      tabCommercial: 'الأعمال والعقارات (3)',
      groupMilestonesHeading: 'قصص الحياة والمناسبات الخاصة',
      groupCommercialHeading: 'أمثلة العقارات وقصة العلامة التجارية والتدريب',
      groupCommercialSub:
        'استعرض سينما 4K (طلب اليوم) ومعاينات الحركة الكاملة للجولات العقارية وقصص المؤسسين وبرامج التدريب المؤسسي.',
      idealForLabel: 'مثالي لـ:',
      cardCta: 'ابدأ مخطط $29',
      offers: {
        family_legacy: {
          badge: 'الأكثر طلباً · فيلم أو سلسلة +1 ساعة',
          title: 'قصص الحياة والمذكرات العائلية، حفلات الزفاف، التخرج والمزيد',
          subtitle:
            'تعمّق في القصة — اروِ فيلماً طويلاً لا يُنسى بطول ساعة+ (30–150 دقيقة) أو سلسلة حياة متعددة الحلقات تعيد تجسيد الفصول غير المصوّرة بشخصيات وأماكن وثقافة وسياق تاريخي أصيل. تشمل باقة $149 ما يصل إلى 60 دقيقة (360 لقطة 4K مُخرَجة) بالإضافة إلى إعلان سينمائي 1–3 دقائق قابل للمشاركة.',
          idealFor:
            'أعياد الميلاد 70 و80، إرث العائلة، سلاسل الحياة متعددة الحلقات، حفلات الزفاف والذكرى السنوية، التخرج، التقاعد والاحتفاء بالحياة',
          runtimeLabel: 'فيلم طويل أو سلسلة متعددة الحلقات حتى 60 دقيقة · + إعلان 1–3 دقائق',
          turnaroundLabel: 'نفس اليوم (2–4 ساعات بعد اعتماد الصور)',
          deliverables: [
            'فيلم طويل 4K أو سلسلة متعددة الحلقات حتى 60 دقيقة (360 لقطة مُخرَجة؛ قابلة للتمديد حتى 150 دقيقة)',
            'إعلان سينمائي 1–3 دقائق قابل للمشاركة مع العائلة ودعوات المناسبات',
            'إعادة تمثيل تاريخية: استعادة ملامح سن 28، مطابقة الأقارب، مواقع الحقبة والمقتنيات العائلية',
            'يشمل سياقاً ثقافياً واقتصادياً تلقائياً حسب المنطقة والعقد الزمني + مشاهد تجمعات وتقاليد عائلية بأكثر من 70 لغة',
          ],
          titlePlaceholder: 'مثال: قصة الجد كريم في عيد ميلاده الثمانين',
        },
        wedding_love: {
          badge: 'الزفاف والذكرى السنوية',
          title: 'قصص الحب والزفاف وتجديد العهود',
          subtitle:
            'حوّل قصة تعارفكما وأجمل الرحلات ولحظات العائلة إلى فيلم 4K جاهز للعرض في حفل الزفاف أو عشاء الخطوبة أو الذكرى الفضية والذهبية.',
          idealFor: 'حفلات الزفاف، عشاء الخطوبة، اليوبيل الفضي والذهبي',
          runtimeLabel: 'حتى 60 دقيقة (360 إطاراً) · + إعلان 1–3 دقائق',
          turnaroundLabel: 'نفس اليوم (2–4 ساعات بعد اعتماد الصور)',
          deliverables: [
            'مخطط مصور + رابط لمشاركة ملاحظات العائلة والأصدقاء',
            'رفع صور الثنائي والخطوبة مباشرة من جوالك',
            'سرد دافئ ومؤثرات صوتية وموسيقى سينمائية',
            'ملف 4K MP4 جاهز لشاشات القاعات والتلفاز',
          ],
          titlePlaceholder: 'مثال: سارة وطارق — قصة حبنا',
        },
        graduation_milestone: {
          badge: 'التخرج والإنجازات',
          title: 'أفلام التخرج وبداية المرحلة الجديدة',
          subtitle:
            'احتفل بالتخرج الثانوي أو الجامعي بفيلم 4K مؤثر يروي الرحلة من خطوات الطفولة والإنجازات حتى لحظة التخرج.',
          idealFor: 'حفلات التخرج المدرسية والجامعية وولائم التكريم',
          runtimeLabel: 'حتى 60 دقيقة (360 إطاراً) · + إعلان 1–3 دقائق',
          turnaroundLabel: 'نفس اليوم (جاهز لحفل نهاية الأسبوع)',
          deliverables: [
            'مقابلة سريعة من 5 دقائق ببطاقات تذكير للمحطات',
            'جمع تهاني الأهل والمدربين والأصدقاء عبر رابط ضيوف',
            'رفع الصور من الجوال + دليل نطق الأسماء والجامعة',
            'ملف 4K MP4 نقي للعرض في الحفل والمشاركة',
          ],
          titlePlaceholder: 'مثال: رحلة ليلى — دفعة 2026',
        },
        retirement_tribute: {
          badge: 'التقاعد والإرث المهني',
          title: 'أفلام التقاعد وتكريم المسيرة المهنية',
          subtitle:
            'كرّم 20 إلى 40 عاماً من القيادة والعطاء بفيلم 4K أنيق يجمع ذكريات الزملاء وإنجازات المسيرة عبر رابط خاص واحد.',
          idealFor: 'حفلات التقاعد، تكريم القيادات والمؤسسين ووداع الزملاء',
          runtimeLabel: 'حتى 60 دقيقة (360 إطاراً) · + إعلان 1–3 دقائق',
          turnaroundLabel: 'نفس اليوم (2–4 ساعات بعد اعتماد الصور)',
          deliverables: [
            'رابط خاص للزملاء لإضافة ذكرياتهم وكلماتهم',
            'رفع صور المسيرة المهنية والفريق والمشاريع الكبرى',
            'سرد استوديو + دليل نطق الأسماء والشركة في 10 ثوانٍ',
            'نسخة 4K MP4 جاهزة لشاشات الحفل والاجتماعات',
          ],
          titlePlaceholder: 'مثال: 35 عاماً من العطاء — المهندس خالد المنصور',
        },
        real_estate_express: {
          badge: 'العقارات · 4K نفس اليوم',
          title: 'فيلم عقاري سريع بدقة 4K',
          subtitle:
            'حوّل صور العقار ومزايا الحي إلى جولة سينمائية 4K ناطقة وموسيقية في نفس اليوم دون انتظار الطقس أو طواقم تصوير.',
          idealFor: 'العقارات السكنية، الفلل الفاخرة، الفنادق البوتيكية والإيجارات',
          runtimeLabel: 'حتى 60 دقيقة (360 إطاراً) · جولة معمّقة + إعلان 1–3 د',
          turnaroundLabel: 'نفس اليوم (2–3 ساعات)',
          deliverables: [
            'مخطط مشاهد لكل غرفة خلال ~3 دقائق',
            'رفع صور العقار مباشرة من الجوال أو الحاسوب',
            'دبلجة اختيارية متعددة اللغات للمشترين الدوليين',
            'يشمل تحديث الأثاث افتراضياً، وتصوير نمط الحياة النشط في الحي، وسرداً موطّناً للمشترين بأكثر من 70 لغة',
          ],
          titlePlaceholder: 'مثال: فيلا إطلالة البحر الفاخرة',
        },
        brand_express: {
          badge: 'الأعمال والعيادات · 4K نفس اليوم',
          title: 'فيلم العلامة والمؤسس السريع 4K',
          subtitle:
            'امنح موقعك الإلكتروني قصة علامة تجارية تبني الثقة دون إنفاق $5,000 على تصوير تقليدي—بمرئيات 4K واقعية وسرد احترافي وموسيقى.',
          idealFor: 'العيادات الطبية والأسنان، مكاتب المحاماة، الشركات المحلية والمؤسسون',
          runtimeLabel: 'حتى 60 دقيقة (360 إطاراً) · وثائقي العلامة + إعلان 1–3 د',
          turnaroundLabel: 'نفس اليوم (2–4 ساعات)',
          deliverables: [
            'مخطط قصة موجه لبناء الثقة + رابط مراجعة للفريق',
            'تثبيت مظهر المؤسس والعيادة والهوية البصرية',
            'دليل نطق 10 ثوانٍ لأسماء العلامة والقيادات',
            'يشمل السياق التاريخي المحلي لفترة التأسيس وتصوير مشاهد رعاية المرضى والعملاء الحية',
          ],
          titlePlaceholder: 'مثال: عيادات الأفق لطب الأسنان — قصتنا',
        },
        training_express: {
          badge: 'التدريب والإجراءات · 4K نفس اليوم',
          title: 'وحدة تدريب وإجراءات سريعة 4K',
          subtitle:
            'حوّل أدلة العمل وإجراءات السلامة إلى وحدة تدريبية 4K واضحة بمدرب ثابت يسهل تحديثها كلما تغيّرت السياسات.',
          idealFor: 'تأهيل الموظفين، السلامة المهنية، إجراءات العيادات والامتيازات',
          runtimeLabel: 'حتى 60 دقيقة (360 إطاراً) · دورة كاملة + إعلان 1–3 د',
          turnaroundLabel: 'نفس اليوم (2–4 ساعات)',
          deliverables: [
            'مخطط منظم بالفصول + رابط اعتماد للمديرين',
            'ثبات بصري للمدرب والزي وموقع العمل',
            'دليل نطق للمصطلحات التقنية والاختصارات',
            'يشمل تمثيل سيناريوهات السلامة المهنية والمعدات الموطّنة وفق اللوائح الإقليمية وبأكثر من 70 لغة للقوى العاملة',
          ],
          titlePlaceholder: 'مثال: دليل السلامة وتأهيل الموظفين الجدد',
        },
      },
    },
    steps: {
      eyebrow: 'تجربة سلسة بدون تسجيل دخول',
      heading: 'من الذكريات المحكية إلى فيلم 4K في 3 خطوات بسيطة',
      subtitle: 'لا حاجة لإنشاء حساب أو برامج معقدة أو أسابيع من المراسلات.',
      items: [
        {
          tag: 'الخطوة 01 · $29 اليوم',
          title: 'مقابلة 5 دقائق ومخطط قصة تفاعلي',
          body: 'اختر محطات المناسبة واحكِ قصتك بأي من +70 لغة إنتاج (الفرنسية، العربية، الإنجليزية، اليابانية وغيرها) داخل بوابة أصلية بـ 14 لغة. خلال ~3 دقائق تستلم مخططاً مصوراً ومروياً + رابط عائلي و4 جولات تعديل.',
          highlight: 'يُخصم 100% من مبلغ $29 من سعر الفيلم النهائي ←',
        },
        {
          tag: 'الخطوة 02 · الرصيد $120',
          title: 'صور الجوال، دليل النطق وقفل الاستمرارية',
          body: 'اعتمد المخطط وأكمل الرصيد عبر Whop لفتح مكتبة الاستمرارية الخاصة بك. ارفع الصور من جوالك (مع حذف GPS) وأضف دليل نطق 10 ثوانٍ وثبّت الوجوه والأماكن.',
          highlight: 'مراجعة كل اسم وصورة قبل التصيير ←',
        },
        {
          tag: 'الخطوة 03 · 4K نفس اليوم',
          title: 'غرفة عرض خاصة وتصدير 4K تلقائي',
          body: 'شاهد فيلمك الصوتي الكامل على الجوال أو التلفاز عبر رابط خاص. فور الضغط على اعتماد، يتم تصيير النسخة الرئيسية 4K MP4 وإرسال رابط التحميل تلقائياً.',
          highlight: 'جاهز لشاشات الحفلات والتلفاز الذكي والمشاركة ←',
        },
      ],
    },
    clarity: {
      badge: 'لماذا تتفوق سينما 4K السريعة؟',
      heading: 'جمال السينما الوثائقية بأحدث سرد بصري بدقة 4K',
      body: 'تجمع بين التأثير العاطفي للأفلام الوثائقية ومشاهد 4K الواقعية المخصصة وثبات الوجوه عبر المراحل العمرية والسرد الاحترافي والموسيقى الأصلية. بتركيزنا على سينما 4K السريعة هنا، نقدّم جودة فائقة بسعر $149–$249 في نفس اليوم بدلاً من $2,500+ وأسابيع انتظار.',
      bullets: [
        'لقطات 4K واقعية بحركة كاميرا سينمائية ناعمة',
        'دمج صورك الحقيقية بسلاسة تامة',
        'سرد استوديو ومؤثرات وموسيقى أصلية',
        'حقوق ملكية شخصية وتجارية 100%',
      ],
      partnerHeading: 'هل ترغب بفيديو حركة كاملة لاحقاً؟',
      partnerBody1:
        'يقدّم هذا المتجر السريع سينما 4K السريعة فقط لضمان جودة متسقة وتسليم في نفس اليوم.',
      partnerBody2:
        'وإذا رغبت لاحقاً بترقية فصول مختارة إلى فيديو حركة كاملة بالذكاء الاصطناعي أو مقابلات حية، تنتقل مكتبتك المقفلة دون إعادة عمل إلى شريك معتمد في SceneFlow Studio.',
      partnerPrimaryCta: 'اطلب مخطط 4K السريع ($29)',
      partnerSecondaryCta: 'لوكالات الفيديو ←',
    },
    faq: {
      eyebrow: 'الأسئلة الشائعة',
      heading: 'كل ما تحتاج معرفته',
      items: [
        {
          q: 'ما هو فيلم سينما 4K السريعة بالضبط؟',
          a: 'هو فيلم وثائقي واقعي بدقة 4K يجمع صورك الحقيقية ومشاهد 4K مخصصة بحركة كاميرا ناعمة وأصوات استوديو ومؤثرات وموسيقى أصلية، ويُسلَّم في نفس اليوم.',
        },
        {
          q: 'كيف تعمل بطاقة المخطط المصور مقابل $29؟',
          a: 'تدفع $29 عبر Whop Checkout لتبدأ فوراً مقابلة مدتها 5 دقائق بالصوت أو الكتابة، وخلال ~3 دقائق تستلم مخططاً مصوراً ومروياً مع 4 جولات تعديل ورابط تعليقات للعائلة، ويُخصم المبلغ بالكامل من الفيلم النهائي.',
        },
        {
          q: 'هل يمكن للأقارب أو الزملاء إضافة قصص قبل الاعتماد؟',
          a: 'نعم! يوفر البورتال رابطاً مستقلاً للضيوف للتعليق فقط، ويمكنهم الاستماع بأكثر من 70 لغة إنتاج (مع بوابة أصلية بـ 14 لغة) وترك ذكرياتهم دون استهلاك جولاتك.',
        },
        {
          q: 'كيف تعمل البوابات الأصلية الـ 14 مع أكثر من 70 لغة فيلم موطّنة ثقافياً؟',
          a: 'أدر أعمالك عبر 14 بوابة أصلية وأنتج أفلاماً أصيلة ثقافياً بأكثر من 70 لغة. راجع وأدر مشاريعك بـ 14 لغة بوابة رئيسية (الإنجليزية، الإسبانية، البرتغالية، الهندية، الصينية، العربية، التايلاندية، اليابانية، الكورية، الألمانية، الفرنسية، الإيطالية، الهولندية، والروسية)—بينما ينتج محرك القصة والمرئيات في SceneFlow نسخ 4K ماستر موطّنة ثقافياً بأكثر من 70 لغة، مع سياق تاريخي دقيق للمنطقة، وتجهيز معماري وداخلي محلي، وتثبيت للنطق الأصلي.',
        },
        {
          q: 'كيف تضمنون نطق أسماء العائلة أو المدن بدقة؟',
          a: 'تتضمن مكتبة الاستمرارية دليل نطق سريع (10 ثوانٍ)، كما تشاهد الفيلم المروي كاملاً في غرفة العرض قبل تصيير نسخة 4K.',
        },
        {
          q: 'هل تُستخدم صوري لتدريب نماذج الذكاء الاصطناعي؟',
          a: 'أبداً. يتم حذف بيانات GPS EXIF تلقائياً عند الرفع ولا تُستخدم ملفات العملاء في تدريب أي نماذج مشتركة.',
        },
        {
          q: 'هل يمكنني الترقية لاحقاً إلى فيديو حركة كاملة؟',
          a: 'نعم، تنتقل الشخصيات والأصوات والقصة المقفلة دون إعادة عمل عبر أي شريك معتمد لدى SceneFlow Studio.',
        },
      ],
    },
    footer: {
      referenceTag: '· متجر عرض مباشر',
      body: 'يعمل هذا المتجر بالكامل على محرك بوابات العلامة البيضاء من SceneFlow Studio مع مدفوعات Whop Merchant of Record. يمكن لمزودي خدمات الفيديو إطلاق متجرهم الخاص بعلامتهم والاحتفاظ بكامل العائد.',
      primaryCta: 'ابدأ بطاقة المخطط $29',
      secondaryCta: 'شغّل هذا بعلامتك التجارية ←',
    },
    modal: {
      stepBadge: 'الخطوة 1 · بطاقة المخطط',
      linePass: 'بطاقة المخطط المصور',
      lineBalance: 'رصيد فيلم 4K السريع لاحقاً (عند الاعتماد فقط)',
      lineTotal: 'إجمالي فيلم سينما 4K',
      whopNotice: 'تتم المعالجة بأمان عبر Whop (Merchant of Record)',
      currencyNote: 'الأسعار معروضة بتقدير العملة المحلية؛ تتم التسوية في Whop بالدولار ($29 اليوم).',
      instantLinkNote: 'رابط فوري لمقابلة القصة الموجهة (5 دقائق) فور إتمام الدفع.',
      fieldOccasion: 'المناسبة / نمط الفيلم',
      fieldTitle: 'لمن أو لأي مناسبة يُهدى هذا الفيلم؟ (اختياري)',
      fieldName: 'اسمك *',
      fieldNamePlaceholder: 'كريم المنصور',
      fieldLanguage: 'لغة واجهة البوابة',
      fieldLanguageHint: "يمكن إنتاج الفيلم والسرد الصوتي بأكثر من 70 لغة (مثل الفرنسية والإيطالية واليابانية وغيرها) أثناء المقابلة.",
      whopRefBadge: "تتم معالجة المدفوعات عبر Whop",
      fieldEmail: 'بريدك الإلكتروني لروابط الاستوديو الخاصة *',
      fieldEmailPlaceholder: 'you@example.com',
      submitIdlePrefix: 'المتابعة إلى الدفع الآمن —',
      submitBusy: 'جاري فتح الدفع الآمن...',
      errorFallback: 'تعذّر بدء دفع Whop. يرجى المحاولة مجدداً.',
      errorNetwork: 'خطأ في الشبكة. يرجى المحاولة مجدداً.',
      totalOptionSuffix: 'الإجمالي',
      todayOptionSuffix: 'اليوم',
    },
    orderPage: {
      whopBadgeShort: 'Whop MoR',
      whopBadgeFull: 'Whop Merchant of Record',
      loading: 'جاري تأكيد دفعتك عبر Whop...',
      notFound: 'الطلب غير موجود',
      returnCta: 'العودة إلى Keepsake Cinema',
      confirmedTag: 'تم تأكيد الدفع · جاهز الآن',
      unlockedTitle: 'تم تفعيل فيلم سينما 4K السريع!',
      welcomePrefix: 'أهلاً بك،',
      unlockedBody:
        'شكراً لإتمام رصيد فيلم 4K السريع. مكتبة الاستمرارية الخاصة بك مفتوحة الآن—ارفع صورك من الجوال وأضف دليل النطق (10 ثوانٍ) لنبدأ الإنتاج اليوم.',
      passBody:
        'بطاقة المخطط المصور نشطة ومخصومة بالكامل من فيلم 4K. ابدأ مقابلتك الموجهة الآن أو افتح الرابط المرسل إلى بريدك الإلكتروني.',
      emailCopiedNotice: 'أرسلنا أيضاً نسخة خاصة من هذا الرابط إلى بريدك للعودة في أي وقت.',
      ctaContinuity: 'فتح مكتبة الصور والاستمرارية',
      ctaIntake: 'بدء مقابلة القصة الموجهة (5 دقائق)',
      finalizingTitle: 'جاري تجهيز بوابتك الخاصة...',
      pendingTitle: 'الدفع قيد الانتظار',
      finalizingBody: 'نؤكد دفعتك عبر Whop ونجهز رابط الاستوديو الخاص بك خلال ثوانٍ.',
      pendingBody: 'أكمل الدفع عبر Whop لفتح بوابتك الخاصة فوراً.',
      refreshBtn: 'تحديث الحالة',
      resumeCheckoutPrefix: 'استئناف الدفع في Whop',
    },
  },

  th: {
    shortCode: 'TH',
    nativeLabel: 'ไทย',
    brandSubtitleMobile: 'Express 4K ฟิล์ม',
    brandSubtitleDesktop: 'ภาพยนตร์ 4K ชีวิตและช่วงเวลาสำคัญ',
    topBarBadge: 'หน้าร้านตัวอย่าง White-Label ใช้งานจริง',
    topBarSubtext: '· เฉพาะ Express 4K ซีนีมา · ขับเคลื่อนโดย SceneFlow Studio',
    topBarCtaMobile: 'เปิดสตูดิโอของคุณ',
    topBarCtaDesktop: 'เปิดสตูดิโอแบรนด์ของคุณเองบน SceneFlow',
    nav: {
      occasions: 'โอกาสสำคัญ',
      howItWorks: 'ขั้นตอนการทำงาน',
      expressQuality: 'คุณภาพ 4K Express',
      faq: 'คำถามที่พบบ่อย',
      ctaMobile: 'บลูพรินต์ $29',
      ctaDesktop: 'เริ่มบลูพรินต์ $29',
    },
    hero: {
      eyebrow: 'ภาพยนตร์ยาว 1 ชม.+ และซีรีส์หลายตอน · จำลองฉากย้อนยุค · ไร้ AI Slop',
      titlePrefix: 'เปลี่ยนบทสำคัญที่สุดของชีวิตให้เป็น ',
      titleAccent: 'ภาพยนตร์หรือซีรีส์ 4K ยาว 1 ชม.+',
      titleSuffix: ' — ส่งมอบวันนี้',
      subtitleLead: 'ตั้งแต่',
      subtitleHighlight1: 'เรื่องราวครอบครัวและการจำลองเหตุการณ์ย้อนยุค',
      subtitleMid: ' ไปจนถึง',
      subtitleHighlight2: 'ชีวประวัติหลายตอน งานแต่งงาน และงานเกษียณ',
      subtitleEnd:
        '—ถ่ายทอดบทชีวิตที่ไม่เคยถูกบันทึกไว้ด้วยบุคคล สถานที่ วัฒนธรรม และบริบทประวัติศาสตร์ที่สมจริง ในรูปแบบภาพยนตร์ยาว 30–150 นาที หรือซีรีส์หลายตอนที่ชวนติดตาม (รวมสูงสุด 60 นาที / 360 เฟรมกำกับในราคา $149) พร้อมตัวอย่างภาพยนตร์ 1–3 นาที เสียงโคลน และดนตรีประกอบ',
      metric1Sub: 'บัตรสตอรี่บอร์ดบลูพรินต์ (หักคืน 100%)',
      metric2Sub: 'ภาพยนตร์หรือซีรีส์ 4K สูงสุด 60 นาที + ตัวอย่าง',
      metric3Val: '2–4 ชม.',
      metric3Sub: 'ได้ไฟล์ 4K วันเดียวกันหลังล็อกภาพ',
      primaryCta: 'เริ่มสตอรี่บอร์ดบลูพรินต์ของฉัน — $29',
      secondaryCta: 'ดูทุกโอกาสสำคัญ',
      trustWhop: 'ยอด $29 หักลดค่าภาพยนตร์ 4K เต็ม 100%',
      trustPrivacy: 'ภาพส่วนตัว 100% — ไม่นำไปใช้เทรน AI สาธารณะ',
      trustLanguages: 'พอร์ทัล UI เนทีฟ 14 ภาษา · มาสเตอร์ 4K ปรับบริบทวัฒนธรรมกว่า 70+ ภาษา',
    },
    theater: {
      eyebrow: 'ตัวอย่างภาพยนตร์ Express 4K',
      watchSamplePrefix: 'ชมตัวอย่าง',
      sameDayTagSuffix: '4K วันเดียวกัน',
      formatToggle: {
        express4kLabel: 'ภาพยนตร์ 4K',
        express4kSub: 'สั่งผลิตวันนี้',
        fullMotionLabel: 'ฟูลโมชัน',
        fullMotionSub: 'ตัวอย่างสตูดิโอ',
        fullMotionEyebrow: 'ตัวอย่างภาพยนตร์ฟูลโมชัน',
        fullMotionTagSuffix: 'ระดับสตูดิโอพาร์ตเนอร์ (ตัวอย่างเท่านั้น)',
        express4kNote:
          'ภาพ 4K สมจริงพร้อมการเคลื่อนกล้อง Ken Burns เสียงพากย์สตูดิโอและดนตรีประกอบ — สั่งผลิตด้วยตนเองได้ทันทีด้านล่าง',
        fullMotionNote:
          'ภาพเคลื่อนไหว AI เต็มรูปแบบพร้อมเสียงสนทนาซิงก์ปาก — เปรียบเทียบทั้ง 2 รูปแบบได้ที่นี่ โดยฟูลโมชันผลิตผ่านสตูดิโอพาร์ตเนอร์ของ SceneFlow',
        cardExpressBadge: '4K · วันเดียวกัน',
        cardFullMotionBadge: 'ฟูลโมชัน · ตัวอย่าง',
        watchExpressPrefix: 'เล่นภาพยนตร์ 4K',
        watchFullMotionPrefix: 'เล่นฟูลโมชัน',
        heroSwitchPrefix: 'เปรียบเทียบรูปแบบ:',
        heroOrFullMotion: 'หรือภาพยนตร์ฟูลโมชัน',
      },
      tabs: [
        {
          id: 'family_legacy',
          label: 'ชีวิตและโอกาสสำคัญ',
          caption: 'เรื่องราวครอบครัว · งานแต่ง · รับปริญญา · เกษียณอายุ',
          priceUsd: 149,
          videoSlug: 'memoir',
        },
        {
          id: 'real_estate_express',
          label: 'อสังหาฯ 4K',
          caption: 'เปลี่ยนภาพถ่ายบ้านเป็นทัวร์ภาพยนตร์ 4K พร้อมเสียงบรรยาย',
          priceUsd: 149,
          videoSlug: 'realestate',
        },
        {
          id: 'brand_express',
          label: 'แบรนด์และคลินิก',
          caption: 'ภาพยนตร์สร้างความน่าเชื่อถือหน้าเว็บโดยไม่ต้องยกกองถ่าย',
          priceUsd: 199,
          videoSlug: 'brand',
        },
        {
          id: 'training_express',
          label: 'อบรมและ SOP',
          caption: 'คอร์สอบรม 4K ล็อกวิทยากร อัปเดตเนื้อหาได้ทันที',
          priceUsd: 249,
          videoSlug: 'training',
        },
      ],
    },
    occasions: {
      eyebrow: 'คอลเลกชันภาพยนตร์ Express 4K',
      heading: 'ทุกช่วงเวลาสำคัญคู่ควรกับจอใหญ่',
      subtitle:
        'วิดีโอ 2 นาทีด้านล่างเป็นเพียงตัวอย่างสั้นๆ — แพ็กเกจ $149 ของคุณคือภาพยนตร์ยาว 4K กว่า 1 ชั่วโมงตัวจริง หรือซีรีส์หลายตอนที่ชวนติดตาม (สูงสุด 60 นาที / 360 เฟรมกำกับ; ขยายได้ถึง 150 นาที) จำลองบทชีวิตที่ไม่เคยถ่ายทำไว้ด้วยบุคคล สถานที่ วัฒนธรรม และประวัติศาสตร์ตรงยุค พร้อมตัวอย่าง 1–3 นาที เริ่มต้นด้วยบัตรบลูพรินต์ $29 (หักคืนเต็ม 100%)',
      tabAll: 'ตัวอย่างทั้งหมด (4)',
      tabMilestones: 'โอกาสสำคัญชีวิต (1)',
      tabCommercial: 'ธุรกิจและอสังหาฯ (3)',
      groupMilestonesHeading: 'เรื่องราวชีวิตและโอกาสสำคัญ',
      groupCommercialHeading: 'ตัวอย่างอสังหาริมทรัพย์ เรื่องราวแบรนด์ และการฝึกอบรม',
      groupCommercialSub:
        'เปรียบเทียบทั้งภาพยนตร์ 4K (สั่งผลิตวันนี้) และตัวอย่างฟูลโมชันสำหรับทัวร์อสังหาฯ เรื่องราวแบรนด์ และวิดีโอฝึกอบรมองค์กร',
      idealForLabel: 'เหมาะสำหรับ:',
      cardCta: 'เริ่มบลูพรินต์ $29',
      offers: {
        family_legacy: {
          badge: 'ยอดนิยม · ภาพยนตร์ยาวหรือซีรีส์ 1 ชม.+',
          title: 'เรื่องราวชีวิตและอนุสรณ์ครอบครัว งานแต่งงาน รับปริญญา และอีกมากมาย',
          subtitle:
            'เล่าเรื่องให้ลึกซึ้ง—สร้างภาพยนตร์ยาว 1 ชม.+ (30–150 นาที) หรือซีรีส์ชีวิตหลายตอนที่น่าจดจำ จำลองบทชีวิตที่ไม่เคยบันทึกไว้ด้วยบุคคล สถานที่ วัฒนธรรม และบริบทประวัติศาสตร์ที่สมจริง แพ็กเกจ $149 รวมสูงสุด 60 นาที (360 เฟรม 4K กำกับ) พร้อมตัวอย่างภาพยนตร์ 1–3 นาทีสำหรับแชร์',
          idealFor:
            'แซยิด 70/80 ปี, เรื่องราวครอบครัว, ซีรีส์ชีวประวัติหลายตอน, งานแต่งและวันครบรอบ, รับปริญญา, เกษียณอายุ และงานรำลึกชีวิต',
          runtimeLabel: 'ภาพยนตร์ยาวหรือซีรีส์หลายตอนสูงสุด 60 นาที · + ตัวอย่าง 1–3 นาที',
          turnaroundLabel: 'ส่งวันเดียวกัน (2–4 ชม. หลังล็อกภาพ)',
          deliverables: [
            'ภาพยนตร์ยาว 4K หรือซีรีส์หลายตอนสูงสุด 60 นาที (360 เฟรมกำกับ; ขยายได้ถึง 150 นาที)',
            'รวมตัวอย่างภาพยนตร์ 1–3 นาทีสำหรับแชร์ให้ครอบครัวและแนบการ์ดเชิญ',
            'จำลองฉากย้อนยุค: คืนวัย 28 ปี, เทียบเค้าโครงญาติ, สถานที่ตามยุคสมัย และของรักประจำตระกูล',
            'รวมบริบทวัฒนธรรมและเศรษฐกิจตามภูมิภาคและยุคสมัยอัตโนมัติ พร้อมจัดฉากการรวมญาติและประเพณีครอบครัวกว่า 70+ ภาษา',
          ],
          titlePlaceholder: 'เช่น เรื่องราวครบ 80 ปีของคุณปู่สมชาย',
        },
        wedding_love: {
          badge: 'งานแต่งและครบรอบ',
          title: 'เรื่องราวความรัก งานแต่ง และวันครบรอบ',
          subtitle:
            'ถ่ายทอดจุดเริ่มต้น ทริปประทับใจ และคำอวยพรจากครอบครัวเป็นภาพยนตร์ 4K พร้อมฉายในงานเลี้ยงฉลองสมรสหรือครบรอบแต่งงาน',
          idealFor: 'พรีเซนเทชันงานแต่ง, อาฟเตอร์ปาร์ตี้, ครบรอบ 25/50 ปี',
          runtimeLabel: 'สูงสุด 60 นาที (360 เฟรม) · + ตัวอย่าง 1–3 นาที',
          turnaroundLabel: 'ส่งวันเดียวกัน (2–4 ชม. หลังล็อกภาพ)',
          deliverables: [
            'สตอรี่บลูพรินต์ + ลิงก์รับโน้ตจากเพื่อนเจ้าบ่าวเจ้าสาว',
            'อัปโหลดภาพคู่และภาพขอแต่งงานจากมือถือได้ทันที',
            'เสียงบรรยายอบอุ่น ซาวด์บรรยากาศ และดนตรีโรแมนติก',
            'ไฟล์ 4K MP4 คมชัดพร้อมฉายขึ้นโปรเจกเตอร์ในงาน',
          ],
          titlePlaceholder: 'เช่น มินต์ & นัท — จากวันแรกสู่วันนี้',
        },
        graduation_milestone: {
          badge: 'รับปริญญาและการเติบโต',
          title: 'ภาพยนตร์ฉลองรับปริญญาและเส้นทางเติบโต',
          subtitle:
            'ฉลองความสำเร็จมัธยม มหาวิทยาลัย หรือปริญญาโท-เอก ตั้งแต่วัยเด็ก รางวัลกีฬา จนถึงความภาคภูมิใจในชุดครุย',
          idealFor: 'งานรับปริญญา, งานเลี้ยงแสดงความยินดี และงานอำลา',
          runtimeLabel: 'สูงสุด 60 นาที (360 เฟรม) · + ตัวอย่าง 1–3 นาที',
          turnaroundLabel: 'ส่งวันเดียวกัน (พร้อมฉายงานเลี้ยงสุดสัปดาห์)',
          deliverables: [
            'สัมภาษณ์นำทาง 5 นาทีพร้อมปุ่มช่วยนึกเหตุการณ์สำคัญ',
            'เชิญพ่อแม่ ครู และเพื่อนร่วมฝากข้อความผ่านลิงก์แขก',
            'อัปโหลดภาพจากมือถือ + คู่มือออกเสียงชื่อและสถาบัน',
            'ไฟล์ 4K MP4 คมชัดพร้อมเปิดในงานเลี้ยงและแชร์ครอบครัว',
          ],
          titlePlaceholder: 'เช่น เส้นทางความภูมิใจของมายด์ รุ่นปี 2026',
        },
        retirement_tribute: {
          badge: 'เกษียณอายุและเกียรติประวัติ',
          title: 'ภาพยนตร์มุทิตาจิตและเกียรติประวัติการทำงาน',
          subtitle:
            'เชิดชู 20–40 ปีแห่งความทุ่มเทและภาวะผู้นำ เป็นภาพยนตร์ 4K สุดประทับใจ พร้อมรวบรวมความทรงจำจากเพื่อนร่วมงานในลิงก์เดียว',
          idealFor: 'งานเลี้ยงเกษียณ, อำลาผู้บริหาร, เชิดชูผู้ก่อตั้งองค์กร',
          runtimeLabel: 'สูงสุด 60 นาที (360 เฟรม) · + ตัวอย่าง 1–3 นาที',
          turnaroundLabel: 'ส่งวันเดียวกัน (2–4 ชม. หลังล็อกภาพ)',
          deliverables: [
            'ลิงก์ส่วนตัวให้เพื่อนร่วมงานช่วยเติมเรื่องเล่าและคำอวยพร',
            'อัปโหลดภาพการทำงาน ทีมงาน และรางวัลสำคัญ',
            'เสียงพากย์สตูดิโอ + คู่มือออกเสียงชื่อคนและองค์กร 10 วิ',
            'ไฟล์ 4K MP4 พร้อมฉายจอใหญ่ในงานเลี้ยงมุทิตาจิต',
          ],
          titlePlaceholder: 'เช่น 35 ปีแห่งความภาคภูมิใจ — คุณวิชัย',
        },
        real_estate_express: {
          badge: 'อสังหาฯ · 4K วันเดียวกัน',
          title: 'ภาพยนตร์อสังหาฯ Express 4K',
          subtitle:
            'เปลี่ยนภาพถ่ายบ้านและจุดเด่นทำเลเป็นทัวร์ภาพยนตร์ 4K พร้อมเสียงบรรยายและดนตรีเสร็จภายในวันเดียว ไม่ต้องรอแดดหรือถ่ายซ้ำ',
          idealFor: 'บ้านเดี่ยว คอนโดหรู พูลวิลล่า โรงแรมบูทีค และที่พักตากอากาศ',
          runtimeLabel: 'สูงสุด 60 นาที (360 เฟรม) · ทัวร์เจาะลึก + ตัวอย่าง 1–3 นาที',
          turnaroundLabel: 'ส่งวันเดียวกัน (2–3 ชม.)',
          deliverables: [
            'สตอรี่บอร์ดบลูพรินต์รายห้องเสร็จใน ~3 นาที',
            'อัปโหลดภาพบ้านจากมือถือหรือคอมพิวเตอร์ได้ทันที',
            'เลือกเพิ่มพากย์หลายภาษาสำหรับผู้ซื้อต่างชาติได้',
            'รวมการอัปเดตเฟอร์นิเจอร์เสมือนจริง จัดฉากไลฟ์สไตล์ย่านที่อยู่อาศัยมีชีวิตชีวา และเสียงบรรยายสำหรับผู้ซื้อกว่า 70+ ภาษา',
          ],
          titlePlaceholder: 'เช่น บ้านหรูวิวทะเล ฮาร์เบอร์เครสต์ 420',
        },
        brand_express: {
          badge: 'ธุรกิจและคลินิก · 4K วันเดียวกัน',
          title: 'ภาพยนตร์แบรนด์และผู้ก่อตั้ง Express 4K',
          subtitle:
            'ยกระดับหน้าเว็บไซต์ด้วยเรื่องราวแบรนด์ที่สร้างความเชื่อมั่นโดยไม่ต้องจ่าย $5,000 ค่าโปรดักชัน—ภาพ 4K สมจริง เสียงพากย์คมชัด และดนตรีครบจบ',
          idealFor: 'คลินิกแพทย์/ทันตกรรม สำนักงานกฎหมาย ธุรกิจท้องถิ่น และผู้ก่อตั้งแบรนด์',
          runtimeLabel: 'สูงสุด 60 นาที (360 เฟรม) · สารคดีแบรนด์ + ตัวอย่าง 1–3 นาที',
          turnaroundLabel: 'ส่งวันเดียวกัน (2–4 ชม.)',
          deliverables: [
            'บลูพรินต์เน้นสร้างความน่าเชื่อถือ + ลิงก์ตรวจงานทีม',
            'ล็อกภาพลักษณ์ผู้ก่อตั้ง คลินิก/ออฟฟิศ และเอกลักษณ์แบรนด์',
            'คู่มือออกเสียงชื่อแบรนด์และผู้บริหาร 10 วินาที',
            'รวมบริบทประวัติศาสตร์ท้องถิ่นยุคก่อตั้ง พร้อมจัดฉากการดูแลผู้ป่วยและลูกค้าอย่างสมจริง',
          ],
          titlePlaceholder: 'เช่น คลินิกทันตกรรมแปซิฟิก — เรื่องราวของเรา',
        },
        training_express: {
          badge: 'อบรมและ SOP · 4K วันเดียวกัน',
          title: 'สื่ออบรมและ SOP พร้อมเสียง Express 4K',
          subtitle:
            'เปลี่ยนคู่มือพนักงานและมาตรฐานความปลอดภัยเป็นวิดีโออบรม 4K ที่เข้าใจง่าย ล็อกวิทยากรคงที่ และอัปเดตเมื่อเปลี่ยนนโยบายได้ทันที',
          idealFor: 'ปฐมนิเทศพนักงาน ความปลอดภัยโรงงาน SOP คลินิก และแฟรนไชส์',
          runtimeLabel: 'สูงสุด 60 นาที (360 เฟรม) · คอร์สเต็ม + ตัวอย่าง 1–3 นาที',
          turnaroundLabel: 'ส่งวันเดียวกัน (2–4 ชม.)',
          deliverables: [
            'บลูพรินต์แบ่งบทชัดเจน + ลิงก์อนุมัติผู้บริหาร',
            'ล็อกวิทยากร ยูนิฟอร์ม และสถานที่ทำงานต่อเนื่องทั้งเรื่อง',
            'คู่มือออกเสียงคำศัพท์เฉพาะทางและตัวย่อ 10 วินาที',
            'รวมการจัดฉากความปลอดภัยและอุปกรณ์การทำงานที่ปรับตามข้อบังคับภูมิภาคและภาษากว่า 70+ ภาษาของบุคลากร',
          ],
          titlePlaceholder: 'เช่น การอบรมความปลอดภัยพนักงานใหม่',
        },
      },
    },
    steps: {
      eyebrow: 'ใช้งานง่าย ไม่ต้องสมัครสมาชิก',
      heading: 'จากเรื่องเล่าสู่ภาพยนตร์ 4K ใน 3 ขั้นตอนง่ายๆ',
      subtitle: 'ไม่ต้องสร้างบัญชี ไม่ต้องเรียนโปรแกรมตัดต่อ และไม่ต้องรอส่งอีเมลไปมาหลายสัปดาห์',
      items: [
        {
          tag: 'ขั้นที่ 01 · วันนี้ $29',
          title: 'สัมภาษณ์นำทาง 5 นาที & บลูพรินต์มีชีวิต',
          body: 'แตะหัวข้อช่วยนึกแล้วเล่าเรื่องราวได้กว่า 70 ภาษาการผลิต (ฝรั่งเศส ญี่ปุ่น สเปน ไทย ฯลฯ) บนหน้าพอร์ทัลเนทีฟ 14 ภาษา ภายใน ~3 นาทีรับบลูพรินต์พร้อมภาพและเสียง ลิงก์ครอบครัว และปรับ AI 4 รอบ',
          highlight: 'ยอด $29 หักลดจากค่าภาพยนตร์ 4K เต็ม 100% →',
        },
        {
          tag: 'ขั้นที่ 02 · ส่วนต่าง $120',
          title: 'อัปโหลดรูปจากมือถือ คู่มือออกเสียง & ล็อกความต่อเนื่อง',
          body: 'อนุมัติบลูพรินต์และชำระส่วนต่างผ่าน Whop เพื่อเปิดคลังภาพส่วนตัว อัปโหลดรูปจริงจากมือถือ (ลบพิกัด GPS อัตโนมัติ) กรอกคู่มือออกเสียง 10 วิ แล้วล็อกหน้าตาและฉาก',
          highlight: 'ตรวจสอบทุกชื่อและภาพบุคคลก่อนเรนเดอร์จริง →',
        },
        {
          tag: 'ขั้นที่ 03 · 4K วันเดียวกัน',
          title: 'ห้องฉายส่วนตัว & เรนเดอร์มาสเตอร์ 4K อัตโนมัติ',
          body: 'รับชมภาพยนตร์ 4K พร้อมเสียงพากย์และดนตรีผ่านลิงก์ห้องฉายบนมือถือหรือทีวี ทันทีที่กดอนุมัติ ระบบจะเรนเดอร์ไฟล์ 4K MP4 และส่งลิงก์ดาวน์โหลดเข้าอีเมลทันที',
          highlight: 'พร้อมฉายจอโปรเจกเตอร์ สมาร์ตทีวี และแชร์ครอบครัว →',
        },
      ],
    },
    clarity: {
      badge: 'ทำไม Express 4K ซีนีมาจึงทรงพลัง',
      heading: 'เสน่ห์หนังสารคดีสไตล์ Ken Burns ผสานภาพเล่าเรื่อง 4K ยุคใหม่',
      body: 'ผสานอารมณ์ลึกซึ้งแบบสารคดีเข้ากับฉาก 4K สมจริงที่สร้างเฉพาะเรื่อง ความต่อเนื่องของใบหน้าในทุกช่วงวัย เสียงพากย์สตูดิโอ ซาวด์เอฟเฟกต์ และดนตรีต้นฉบับ ด้วยการโฟกัสเฉพาะ Express 4K ซีนีมา เราจึงส่งมอบงานคมชัดระดับพิพิธภัณฑ์ได้ในราคา $149–$249 ภายในวันเดียว แทน $2,500+ และรอนานหลายสัปดาห์',
      bullets: [
        'ภาพนิ่ง 4K สมจริงพร้อมการแพนกล้องนุ่มนวล',
        'ผสานภาพถ่ายจริงของคุณอย่างกลมกลืน',
        'เสียงบรรยายสตูดิโอ SFX และดนตรีต้นฉบับ',
        'สิทธิ์ใช้งานส่วนตัวและเชิงพาณิชย์ 100%',
      ],
      partnerHeading: 'อยากอัปเกรดเป็นวิดีโอเคลื่อนไหวเต็มรูปแบบทีหลัง?',
      partnerBody1:
        'หน้าร้าน Express นี้ให้บริการเฉพาะ Express 4K ซีนีมา เพื่อรักษาคุณภาพให้คงที่และส่งมอบได้ภายในวันเดียวกัน',
      partnerBody2:
        'หากต้องการอัปเกรดบางฉากเป็นวิดีโอเคลื่อนไหว AI เต็มรูปแบบในอนาคต คลังความต่อเนื่องของคุณสามารถโอนต่อให้พาร์ตเนอร์ที่ได้รับการรับรองของ SceneFlow Studio ได้ทันทีโดยไม่ต้องเริ่มใหม่',
      partnerPrimaryCta: 'สั่งทำบลูพรินต์ Express 4K ($29)',
      partnerSecondaryCta: 'สำหรับเอเจนซีวิดีโอ →',
    },
    faq: {
      eyebrow: 'คำถามที่พบบ่อย',
      heading: 'ทุกสิ่งที่คุณควรรู้',
      items: [
        {
          q: 'ภาพยนตร์ Express 4K ซีนีมาคืออะไร?',
          a: 'คือภาพยนตร์สไตล์สารคดี 4K สมจริงที่รวมภาพถ่ายจริงของคุณกับฉาก 4K ที่ล็อกความต่อเนื่อง พร้อมการแพนกล้องนุ่มนวล เสียงพากย์สตูดิโอ เอฟเฟกต์เสียง และดนตรีประกอบ ส่งมอบภายในวันเดียวกัน',
        },
        {
          q: 'บัตรสตอรี่บอร์ดบลูพรินต์ $29 ทำงานอย่างไร?',
          a: 'ชำระ $29 ผ่าน Whop Checkout แล้วเข้าสู่การสัมภาษณ์นำทาง 5 นาทีทันที ภายใน ~3 นาทีรับบลูพรินต์พร้อมภาพและเสียง สิทธิ์แก้ด้วย AI 4 รอบ และลิงก์คอมเมนต์สำหรับครอบครัว ยอด $29 หักลดจากราคาหนัง 4K เต็ม 100%',
        },
        {
          q: 'พี่น้อง คู่รัก หรือเพื่อนร่วมงานช่วยเติมเรื่องราวได้ไหม?',
          a: 'ได้! พอร์ทัลมีลิงก์สำหรับแขกแบบคอมเมนต์อย่างเดียว ญาติหรือเพื่อนสามารถฟังได้กว่า 70 ภาษาของภาพยนตร์ (บนหน้าพอร์ทัลเนทีฟ 14 ภาษา) โดยไม่กินรอบแก้ไขของคุณ',
        },
        {
          q: 'พอร์ทัล UI เนทีฟ 14 ภาษา และภาษาภาพยนตร์ที่ปรับบริบทวัฒนธรรมกว่า 70+ ภาษาทำงานร่วมกันอย่างไร?',
          a: 'บริหารงานได้ในพอร์ทัลเนทีฟ 14 ภาษา และผลิตภาพยนตร์ที่สมจริงทางวัฒนธรรมได้กว่า 70+ ภาษา ตรวจสอบและจัดการโปรเจกต์ได้ใน 14 ภาษาหลักของพอร์ทัล (อังกฤษ สเปน โปรตุเกส ฮินดี จีน อาหรับ ไทย ญี่ปุ่น เกาหลี เยอรมัน ฝรั่งเศส อิตาลี ดัตช์ และรัสเซีย) ขณะที่เอนจินเรื่องราวและภาพของ SceneFlow ผลิตมาสเตอร์ 4K ที่ปรับบริบทวัฒนธรรมกว่า 70+ ภาษา ครบถ้วนทั้งบริบทประวัติศาสตร์ตามภูมิภาค สถาปัตยกรรมและการตกแต่งท้องถิ่น และการล็อกการออกเสียงแบบเจ้าของภาษา',
        },
        {
          q: 'มั่นใจได้อย่างไรว่าชื่อคนหรือสถานที่จะออกเสียงถูกต้อง?',
          a: 'ในคลังภาพต่อเนื่องมีคู่มือออกเสียง 10 วินาทีให้พิมพ์หรืออัดเสียงบอก และคุณจะได้ตรวจฟังคัตเต็มในห้องฉายส่วนตัวก่อนเรนเดอร์ไฟล์ 4K',
        },
        {
          q: 'ภาพถ่ายครอบครัวหรือธุรกิจจะถูกนำไปเทรน AI หรือไม่?',
          a: 'ไม่เด็ดขาด ระบบจะลบพิกัด GPS EXIF อัตโนมัติทันทีที่อัปโหลด และไม่นำไฟล์ลูกค้าไปเทรนโมเดล AI ร่วม',
        },
        {
          q: 'อัปเกรดเป็นวิดีโอเคลื่อนไหวเต็มรูปแบบทีหลังได้ไหม?',
          a: 'ได้ โปรเจกต์ที่ล็อกตัวละครและเสียงไว้แล้วสามารถต่อยอดผ่านพาร์ตเนอร์รับรองของ SceneFlow Studio ได้โดยไม่ต้องเริ่มใหม่',
        },
      ],
    },
    footer: {
      referenceTag: '· หน้าร้านตัวอย่างใช้งานจริง',
      body: 'หน้าร้านนี้ทำงาน 100% บนระบบพอร์ทัล White-Label ของ SceneFlow Studio และระบบชำระเงิน Whop Merchant of Record ผู้ให้บริการวิดีโอสามารถเปิดหน้าร้านแบรนด์ตนเองและรับรายได้เต็ม 100%',
      primaryCta: 'เริ่มบัตรบลูพรินต์ $29',
      secondaryCta: 'เปิดระบบนี้ภายใต้แบรนด์ของคุณ →',
    },
    modal: {
      stepBadge: 'ขั้นที่ 1 · บัตรบลูพรินต์',
      linePass: 'บัตรสตอรี่บอร์ดบลูพรินต์',
      lineBalance: 'ส่วนต่าง Express 4K ภายหลัง (เมื่ออนุมัติเท่านั้น)',
      lineTotal: 'ราคารวมภาพยนตร์ Express 4K',
      whopNotice: 'ชำระเงินปลอดภัยผ่าน Whop (Merchant of Record)',
      currencyNote: 'แสดงราคาประมาณการเป็นเงินบาท; Whop ชำระเป็นสกุลดอลลาร์สหรัฐ ($29 วันนี้)',
      instantLinkNote: 'รับลิงก์สัมภาษณ์นำทาง 5 นาทีทันทีหลังชำระเงินสำเร็จ',
      fieldOccasion: 'โอกาสสำคัญ / สไตล์ภาพยนตร์',
      fieldTitle: 'ภาพยนตร์นี้จัดทำเพื่อใครหรือโอกาสใด? (ไม่บังคับ)',
      fieldName: 'ชื่อของคุณ *',
      fieldNamePlaceholder: 'ธนพล วัฒนา',
      fieldLanguage: 'ภาษาหน้าพอร์ทัล',
      fieldLanguageHint: "ภาพยนตร์และเสียงพากย์ผลิตได้กว่า 70 ภาษา (เช่น ฝรั่งเศส อิตาลี ญี่ปุ่น เกาหลี ฯลฯ) ระหว่างการสัมภาษณ์",
      whopRefBadge: "ระบบชำระเงินโดย Whop",
      fieldEmail: 'อีเมลสำหรับรับลิงก์สตูดิโอส่วนตัว *',
      fieldEmailPlaceholder: 'you@example.com',
      submitIdlePrefix: 'ดำเนินการชำระเงินอย่างปลอดภัย —',
      submitBusy: 'กำลังเปิดหน้าชำระเงิน...',
      errorFallback: 'ไม่สามารถเปิด Whop Checkout ได้ กรุณาลองอีกครั้ง',
      errorNetwork: 'เกิดข้อผิดพลาดของเครือข่าย กรุณาลองอีกครั้ง',
      totalOptionSuffix: 'รวมทั้งหมด',
      todayOptionSuffix: 'วันนี้',
    },
    orderPage: {
      whopBadgeShort: 'Whop MoR',
      whopBadgeFull: 'Whop Merchant of Record',
      loading: 'กำลังยืนยันการชำระเงิน Whop ของคุณ...',
      notFound: 'ไม่พบคำสั่งซื้อ',
      returnCta: 'กลับไปยัง Keepsake Cinema',
      confirmedTag: 'ยืนยันการชำระเงินแล้ว · พร้อมใช้งาน',
      unlockedTitle: 'ปลดล็อกภาพยนตร์ Express 4K ของคุณแล้ว!',
      welcomePrefix: 'ยินดีต้อนรับ,',
      unlockedBody:
        'ขอบคุณที่ชำระส่วนต่าง Express 4K คลังภาพต่อเนื่องส่วนตัวของคุณเปิดใช้งานแล้ว—อัปโหลดภาพจากมือถือและเพิ่มคู่มือออกเสียง 10 วินาทีเพื่อผลิตภาพยนตร์ 4K ภายในวันนี้',
      passBody:
        'บัตรสตอรี่บอร์ดบลูพรินต์ของคุณเปิดใช้งานแล้ว และหักลด 100% จากค่าภาพยนตร์ 4K เริ่มสัมภาษณ์นำทางได้เลยตอนนี้ หรือเปิดจากลิงก์ที่ส่งไปยังอีเมลของคุณ',
      emailCopiedNotice: 'เราได้ส่งสำเนาลิงก์ส่วนตัวนี้ไปยังอีเมลของคุณแล้วเพื่อกลับมาทำต่อได้ทุกเมื่อ',
      ctaContinuity: 'เปิดคลังภาพและความต่อเนื่องของฉัน',
      ctaIntake: 'เริ่มสัมภาษณ์เรื่องราวนำทาง 5 นาที',
      finalizingTitle: 'กำลังเตรียมพอร์ทัลสตูดิโอส่วนตัว...',
      pendingTitle: 'รอการชำระเงิน',
      finalizingBody: 'เรากำลังยืนยันยอดชำระ Whop และสร้างลิงก์สตูดิโอส่วนตัวให้คุณ ใช้เวลาเพียงไม่กี่วินาที',
      pendingBody: 'ชำระเงิน Whop ให้เสร็จสิ้นเพื่อปลดล็อกพอร์ทัลส่วนตัวของคุณทันที',
      refreshBtn: 'รีเฟรชสถานะ',
      resumeCheckoutPrefix: 'ดำเนินการชำระเงิน Whop ต่อ',
    },
  },

  ja: {
    shortCode: 'JA',
    nativeLabel: '日本語',
    brandSubtitleMobile: 'Express 4K 映画',
    brandSubtitleDesktop: 'Express 4K 人生・記念日シネマ',
    topBarBadge: 'ホワイトラベル実稼働デモストア',
    topBarSubtext: '· Express 4K シネマ専用 · Powered by SceneFlow Studio',
    topBarCtaMobile: 'スタジオを開設',
    topBarCtaDesktop: 'SceneFlowで自社ブランドスタジオを開設',
    nav: {
      occasions: '用途・シーン',
      howItWorks: '制作の流れ',
      expressQuality: 'Express 4K 品質',
      faq: 'よくある質問',
      ctaMobile: '$29 ブループリント',
      ctaDesktop: '$29 ブループリント開始',
    },
    hero: {
      eyebrow: '1時間超の長編映画＆マルチ話シリーズ · 時代再現ドラマ · AIスロップゼロ',
      titlePrefix: '人生のかけがえのない章を、',
      titleAccent: '1時間超の4K映画・シリーズ',
      titleSuffix: 'に — 本日中にお届け。',
      subtitleLead: '',
      subtitleHighlight1: '家族の自分史や歴史・時代再現',
      subtitleMid: 'から、',
      subtitleHighlight2: '複数話の伝記シリーズ、結婚式、定年退職',
      subtitleEnd:
        'まで——映像に残っていない人生の章を、本物らしい人物・場所・文化・時代背景とともに30〜150分の長編映画または一気見できる複数話シリーズとして再現（$149に最大60分／360演出フレーム込み）。さらに1〜3分の劇場風予告編、音声クローン、オリジナル音楽付き。',
      metric1Sub: 'ブループリントパス（全額充当）',
      metric2Sub: '最大60分の4K長編またはシリーズ＋予告編',
      metric3Val: '2〜4時間',
      metric3Sub: '写真ロック後、当日中に4K納品',
      primaryCta: '$29 ストーリーボード設計を始める',
      secondaryCta: 'すべての用途を見る',
      trustWhop: '$29 は4K本編代金に100%充当',
      trustPrivacy: '写真は100%非公開 — AI学習には一切不使用',
      trustLanguages: '14言語のネイティブUIポータル · 70+言語の文化的ローカライズ4Kマスター',
    },
    theater: {
      eyebrow: 'Express 4K シネマ・サンプル集',
      watchSamplePrefix: 'サンプルを再生',
      sameDayTagSuffix: '当日4K納品',
      formatToggle: {
        express4kLabel: '4K シネマ',
        express4kSub: '本日注文可',
        fullMotionLabel: 'フルモーション',
        fullMotionSub: 'スタジオ試写',
        fullMotionEyebrow: 'フルモーション・シネマ試写',
        fullMotionTagSuffix: 'パートナースタジオ上位プラン（デモ）',
        express4kNote:
          'フォトリアルな4Kフレームにケン・バーンズ演出、スタジオ音声、オリジナル楽曲を融合——下のフォームから当日注文できます。',
        fullMotionNote:
          '実写風のAIモーション＆リップシンク対話——両形式を比較試写できます。フルモーション本編はSceneFlow認定パートナーが制作します。',
        cardExpressBadge: '4K · 当日納品',
        cardFullMotionBadge: 'フルモーション · デモ',
        watchExpressPrefix: '4Kシネマ再生',
        watchFullMotionPrefix: 'フルモーション再生',
        heroSwitchPrefix: '形式を比較：',
        heroOrFullMotion: 'またはフルモーション・シネマ',
      },
      tabs: [
        {
          id: 'family_legacy',
          label: 'Harbor Books · 人生・記念日',
          caption: 'Harbor Books：パイク通りの50年 — 家族の自分史、結婚式、卒業、定年退職',
          priceUsd: 149,
          videoSlug: 'memoir',
        },
        {
          id: 'real_estate_express',
          label: '不動産 4K',
          caption: '物件写真をナレーション付き4Kプロパティ映画へ変換',
          priceUsd: 149,
          videoSlug: 'realestate',
        },
        {
          id: 'brand_express',
          label: '創業者・クリニック',
          caption: '撮影クルー不要で信頼を生むホームページ向けストーリー映画',
          priceUsd: 199,
          videoSlug: 'brand',
        },
        {
          id: 'training_express',
          label: '研修・SOP講座',
          caption: '講師の一貫性を保ち更新も容易なナレーション付き研修モジュール',
          priceUsd: 249,
          videoSlug: 'training',
        },
      ],
    },
    occasions: {
      eyebrow: '用途別 Express 4K コレクション',
      heading: 'すべての節目に、大画面の感動を。',
      subtitle:
        '下の2分動画は短いプレビュー試写です。$149のパッケージには本格的な1時間超の4K長編映画または一気見できる複数話シリーズ（最大60分／360演出フレーム、150分へ拡張可）が含まれ、時代考証に忠実な人物・場所・文化・歴史で未撮影の章を再現。さらに1〜3分の予告編付き。まずは$29のブループリントパス（100%充当）から始めましょう。',
      tabAll: 'すべて表示 (4)',
      tabMilestones: '人生・記念日 (1)',
      tabCommercial: 'ビジネス・不動産 (3)',
      groupMilestonesHeading: '人生の物語・記念日シネマ',
      groupCommercialHeading: '不動産・ブランドストーリー・企業研修サンプル',
      groupCommercialSub:
        '物件紹介、創業者・クリニックの物語、SOP研修向けに、4Kシネマ（当日注文）とフルモーション試写を比較できます。',
      idealForLabel: 'おすすめの用途：',
      cardCta: '$29 ブループリント開始',
      offers: {
        family_legacy: {
          badge: '一番人気 · 1時間超の長編またはシリーズ',
          title: '人生の記録・家族の自分史、結婚式、卒業、退職祝いなど',
          subtitle:
            '物語を深く描く——映像に残っていない章を本物らしい人物・場所・文化・時代背景で再現する、忘れられない1時間超（30〜150分）の長編映画または複数話の人生シリーズを制作します。$149パッケージに最大60分（360演出4Kフレーム）と共有しやすい1〜3分の劇場風予告編が含まれます。',
          idealFor: '古希・喜寿・傘寿祝い、家族の自分史、複数話の人生シリーズ、結婚記念日、卒業式、退職祝い、偲ぶ会',
          runtimeLabel: '最大60分の長編または複数話シリーズ · ＋1〜3分予告編',
          turnaroundLabel: '当日納品（写真ロック後2〜4時間）',
          deliverables: [
            '最大60分の4K長編または複数話シリーズ（360演出フレーム／150分まで拡張可能）',
            '家族や招待客に共有できる1〜3分の劇場風予告編付き',
            '時代再現：28歳への若返り再現、親族の面影マッチ、当時の街並みと家宝を忠実に再現',
            '地域・年代ごとの文化／経済的背景の自動反映と、70+言語対応の家族の団らん・伝統シーン演出を収録',
          ],
          titlePlaceholder: '例：マテオ祖父の80歳記念ストーリー',
        },
        wedding_love: {
          badge: 'ウェディング・結婚記念日',
          title: 'ラブストーリー・結婚式・バウリニューアル映画',
          subtitle:
            '出会いから思い出の旅、プロポーズ、家族の祝福までを長編4K映画（最大60分／360フレーム）と1〜3分の前夜祭・披露宴用予告編に仕立てます。',
          idealFor: '披露宴・二次会、銀婚式・金婚式、前夜祭、婚約記念ムービー',
          runtimeLabel: '最大60分（360フレーム）· ＋1〜3分予告編',
          turnaroundLabel: '当日納品（写真ロック後2〜4時間）',
          deliverables: [
            'ストーリー設計書＋家族・友人向けコメント収集リンク',
            'スマホからカップルの写真やプロポーズ写真を直接アップロード',
            '温かなナレーション、環境音、映画品質のオリジナル音楽',
            'ダウンロード可能な4K MP4本編＋1〜3分劇場風予告編',
          ],
          titlePlaceholder: '例：クレア＆ダニエル — リスボンから永遠へ',
        },
        graduation_milestone: {
          badge: '卒業・成人・門出',
          title: '卒業記念・成長の記録トリビュート映画',
          subtitle:
            '高校・大学・大学院の卒業を、章立ての深い4Kトリビュート映画（最大60分／360フレーム）と1〜3分のパーティー用予告編で祝福します。',
          idealFor: '高校・大学卒業祝い、謝恩会、部活引退記念、門出のパーティー',
          runtimeLabel: '最大60分（360フレーム）· ＋1〜3分予告編',
          turnaroundLabel: '当日納品（週末のパーティーにも間に合います）',
          deliverables: [
            '思い出チップを選ぶだけの5分ガイド付きインタビュー',
            'ゲスト用リンクで両親・恩師・兄弟からメッセージを収集',
            'スマホ写真アップロード＋名前・学校名の読み方ガイド',
            '鮮明な4K MP4本編＋1〜3分のシェア用パーティー予告編',
          ],
          titlePlaceholder: '例：マヤの2026年卒業までの歩み',
        },
        retirement_tribute: {
          badge: '定年退職・キャリア功績',
          title: '定年退職・キャリア功績トリビュート映画',
          subtitle:
            '20〜40年にわたるリーダーシップと仲間との思い出を、格調高い長編4Kトリビュート（最大60分／360フレーム）と1〜3分の祝賀会予告編で称えます。',
          idealFor: '定年退職祝賀会、役員退任、公務・医療功労表彰、創業者への感謝',
          runtimeLabel: '最大60分（360フレーム）· ＋1〜3分予告編',
          turnaroundLabel: '当日納品（写真ロック後2〜4時間）',
          deliverables: [
            '同僚が気軽にエピソードを寄せられるゲストコメントリンク',
            'キャリア写真、チーム集合写真、職場の節目をまとめて登録',
            'スタジオ品質ナレーション＋10秒の氏名・社名発音ガイド',
            '祝賀会の大型スクリーン対応4K MP4本編＋1〜3分予告編',
          ],
          titlePlaceholder: '例：35年の軌跡 — ロバート・ヘイズ船長',
        },
        real_estate_express: {
          badge: '不動産 · ディープ4Kツアー',
          title: 'Express 4K 物件紹介シネマ',
          subtitle:
            '60秒のスライドショーを超えた本格物件映画。各部屋、建築仕様、高級設備、屋外空間、学区や周辺環境まで深く案内する最大60分（360フレーム）の本編＋1〜3分のMLS・SNS予告編付き。',
          idealFor: '高級レジデンス、住宅販売、遠方購入者、ブティックホテル・別荘',
          runtimeLabel: '最大60分（360フレーム）· 詳細ツアー＋1〜3分予告編',
          turnaroundLabel: '当日納品（2〜3時間）',
          deliverables: [
            '物件と周辺環境を掘り下げる長編4Kツアー（最大60分／360フレーム）',
            '内見意欲を高める1〜3分のMLS・SNS用ハイライト予告編付き',
            '部屋ごとの魅力、設備、学区、暮らしのストーリーテリング',
            'バーチャル家具アップデート、活気ある近隣ライフスタイル演出、70+言語のローカライズ購入者ナレーションを収録',
          ],
          titlePlaceholder: '例：ハーバークレスト420 オーシャンビュー邸宅',
        },
        brand_express: {
          badge: '企業・クリニック · 長編4K',
          title: 'Express 4K 創業者・クリニック紹介映画',
          subtitle:
            'クリニック、法律事務所、ブランドの背景にある物語——創業の想い、顧客の変化、施設案内、チーム哲学までを最大60分（360フレーム）の本編＋高転換率の1〜3分トップページ予告編に収録。',
          idealFor: '医療・歯科クリニック、法律・会計事務所、地域企業、クラフトブランド、NPO',
          runtimeLabel: '最大60分（360フレーム）· ブランド映画＋1〜3分予告編',
          turnaroundLabel: '当日納品（2〜4時間）',
          deliverables: [
            '長編4K創業者・ブランドドキュメンタリー（最大60分／360フレーム）',
            '来訪者の信頼を掴む1〜3分のホームページ＆SNS予告編付き',
            '創業者、院内・オフィス、主力製品と固有名詞の発音を完全ロック',
            '創業当時の地域の歴史的背景と、実際の患者・顧客ケアシーンの演出を収録',
          ],
          titlePlaceholder: '例：パシフィックコースト歯科 — 私たちの歩み',
        },
        training_express: {
          badge: '企業研修・SOP · 4K講座',
          title: 'Express 4K ナレーション付き研修・SOP映画',
          subtitle:
            '50ページのマニュアルや安全規程を、わかりやすい多モジュール4K研修講座（最大60分／360フレーム、150分へ拡張可）へ変換。講師・機材の一貫性を保ち1〜3分の概要予告編も付属。',
          idealFor: '新入社員研修、安全衛生教育、医療SOP、フランチャイズ標準化、資格講座',
          runtimeLabel: '最大60分（360フレーム）· 本講座＋1〜3分概要',
          turnaroundLabel: '当日納品（2〜4時間）',
          deliverables: [
            '多モジュール4K研修コース（最大60分／360フレーム、拡張可能）',
            '経営層・新入社員向けの1〜3分概要トレーラー付き',
            '講師・制服・作業現場・安全設備のビジュアルを完全統一',
            '地域の法令・コンプライアンスと70+言語の現場スタッフに適合した職場安全・設備シナリオ演出を収録',
          ],
          titlePlaceholder: '例：新入社員向け 安全衛生・機材オンボーディング',
        },
      },
    },
    steps: {
      eyebrow: 'アカウント登録不要のスムーズ体験',
      heading: '語った思い出が4K映画になるまで、わずか3ステップ',
      subtitle: 'アカウント作成も複雑な編集ソフトも、何週間ものメール往復も不要です。',
      items: [
        {
          tag: 'Step 01 · 本日 $29',
          title: '5分のガイド付きインタビュー＆動く設計書',
          body: '思い出のヒントをタップしながら70以上の映画言語でストーリーを語るだけ（14言語ネイティブUI対応）。約3分でイラスト＆ナレーション付きのブループリント、家族コメントリンク、AI修正4回分が届きます。',
          highlight: '$29 は最終4K本編代金に100%充当されます →',
        },
        {
          tag: 'Step 02 · 残額 $120',
          title: 'スマホ写真・発音ガイド・一貫性ロック',
          body: 'ブループリント承認後、Whopで残額を決済して専用コンティニュイティ・ライブラリを解放。スマホから写真をアップロード（GPS自動削除）し、10秒の名前・地名発音ガイドを添えて全員の顔と場所を確定します。',
          highlight: 'レンダリング前にすべての氏名・人物を事前確認 →',
        },
        {
          tag: 'Step 03 · 当日4K納品',
          title: '専用試写室＆自動4Kマスター書き出し',
          body: 'ログイン不要の試写室リンクから、音声・音楽入りのExpress 4K映画をスマホやテレビで確認。承認をクリックした瞬間にクラウドが4K MP4マスターを書き出し、ダウンロードリンクを自動送信します。',
          highlight: '会場プロジェクター、大画面テレビ、家族共有に即対応 →',
        },
      ],
    },
    clarity: {
      badge: 'Express 4K シネマが選ばれる理由',
      heading: 'ドキュメンタリーの感動表現 × 最新4Kストーリーテリング',
      body: '本格ドキュメンタリーの情感に、特注フォトリアル4Kシーン、時代を超えた顔の一貫性、スタジオ品質のナレーション、環境音、専用スコアを融合。本ストアをExpress 4Kシネマに特化することで、$2,500+・納期3週間ではなく、$149–$249・当日納品で美術館品質の映像をお届けします。',
      bullets: [
        'フォトリアル4K静止画＋滑らかなカメラワーク',
        'お持ちの実写真を違和感なく自然に融合',
        'スタジオナレーション、SFX＆オリジナル音楽',
        '個人・商用利用権100%付属',
      ],
      partnerHeading: '後からフルモーションAI映像にしたくなったら？',
      partnerBody1:
        '本Expressストアは品質の安定と当日納品を守るため、意図的にExpress 4Kシネマのみを提供しています。',
      partnerBody2:
        'お気に入りの章をフルモーションAI動画へ拡張したり実写インタビューを追加したい時は、ロック済みのコンティニュイティ・ボールトを手戻りゼロで認定SceneFlowパートナースタジオへ引き継げます。',
      partnerPrimaryCta: 'Express 4K ブループリントを注文（$29）',
      partnerSecondaryCta: '映像制作会社・事業者の方へ →',
    },
    faq: {
      eyebrow: 'よくある質問',
      heading: 'ご注文前に知っておきたいこと',
      items: [
        {
          q: 'Express 4K シネマ映画とは具体的に何ですか？',
          a: 'お持ちの実写真と一貫性ロックされた特注4Kシーンを組み合わせ、滑らかなケン・バーンズ演出、スタジオ品質のナレーション＆登場人物音声、環境効果音、オリジナル音楽で仕上げるドキュメンタリー調4K映画です。従来の撮影クルーの数分の1の費用で当日中にお届けします。',
        },
        {
          q: '$29 のストーリーボード・ブループリントパスはどう機能しますか？',
          a: 'Whop Checkoutで$29を決済すると、すぐに5分間の音声／テキスト・ガイド付きインタビューを開始できます。約3分でイラスト＆ナレーション入りのブループリント、AI修正4回、家族向けコメント専用リンクが届きます。$29は全額4K本編に充当されます（$149の映画なら残額は$120のみ）。',
        },
        {
          q: '兄弟や配偶者、同僚も確定前にエピソードを追加できますか？',
          a: 'はい。ブループリント・ポータルにはゲスト専用のコメントリンクが付いています。親族や友人、同僚は70以上の映画言語（14言語ネイティブUI）で試聴し、あなたの修正回数を使わずに思い出を書き込めます。',
        },
        {
          q: '14言語のネイティブUIポータルと70+言語の文化的ローカライズ映画はどのように連携しますか？',
          a: '14のネイティブポータルで操作し、70+言語で文化的に本格的な映画を制作できます。14の主要ポータル言語（英語、スペイン語、ポルトガル語、ヒンディー語、中国語、アラビア語、タイ語、日本語、韓国語、ドイツ語、フランス語、イタリア語、オランダ語、ロシア語）でプロジェクトを確認・管理しながら、SceneFlowのストーリー＆ビジュアルエンジンが70+言語で文化的にローカライズされた4Kマスターを生成。地域に即した歴史的背景、現地の建築・内装演出、ネイティブ発音ロックまで備えています。',
        },
        {
          q: '珍しい苗字や地名、会社名の読み方は大丈夫ですか？',
          a: 'コンティニュイティ・ライブラリに10秒の発音ガイド機能があり、読み方を文字または音声で指定できます。さらに4Kマスター生成前に専用試写室で音声入りの本編をすべて確認できます。',
        },
        {
          q: '家族の写真や企業資料がAI学習に使われることはありますか？',
          a: '一切ありません。アップロード時に写真のEXIF GPS位置情報は自動削除され、プロジェクト専用として厳重に管理され、共有AIモデルの学習には決して使用されません。',
        },
        {
          q: '後からフルモーションAI映像や実写撮影を追加したくなったら？',
          a: '本ストアはスピードと明朗価格を守るためExpress 4K専用ですが、キャスト・音声・脚本はSceneFlow Studio内に保持されるため、いつでも認定パートナーを通じて手戻りゼロでフルモーションへアップグレード可能です。',
        },
      ],
    },
    footer: {
      referenceTag: '· 実稼働リファレンスストア',
      body: 'このストアはSceneFlow Studioのホワイトラベル顧客ポータルとWhop Merchant of Record決済で100%稼働しています。スタジオ事業者は独自ドメインで自社ブランドストアを開設し、売上の100%を自社収益として受け取れます。',
      primaryCta: '$29 ブループリントパスを開始',
      secondaryCta: '自社ブランドでこの仕組みを運営 →',
    },
    modal: {
      stepBadge: 'Step 1 · ブループリントパス',
      linePass: 'ストーリーボード・ブループリントパス',
      lineBalance: '承認後の Express 4K 残額（承認時のみ）',
      lineTotal: 'Express 4K 映画 合計金額',
      whopNotice: 'Whop（Merchant of Record）による安全な決済処理',
      currencyNote: '表示は日本円目安です。Whop MoRでは米ドル建て（本日 $29）で決済されます。',
      instantLinkNote: '決済完了直後に、5分間のガイド付きストーリーインタビュー用リンクが即発行されます。',
      fieldOccasion: '用途・映画スタイル',
      fieldTitle: 'どなた・何のための映画ですか？（任意）',
      fieldName: 'お名前 *',
      fieldNamePlaceholder: '佐藤 健太',
      fieldLanguage: 'ポータル表示言語',
      fieldLanguageHint: '映画本編とナレーションは、インタビュー中に70以上の言語（日本語、英語、フランス語、韓国語など）から選択して制作できます。',
      whopRefBadge: '決済処理：Whop',
      fieldEmail: '専用スタジオリンク送付先メール *',
      fieldEmailPlaceholder: 'you@example.com',
      submitIdlePrefix: '安全な決済へ進む —',
      submitBusy: '決済画面を開いています...',
      errorFallback: 'Whop決済を開始できませんでした。もう一度お試しください。',
      errorNetwork: '通信エラーが発生しました。もう一度お試しください。',
      totalOptionSuffix: '総額',
      todayOptionSuffix: '本日お支払い',
    },
    orderPage: {
      whopBadgeShort: 'Whop MoR',
      whopBadgeFull: 'Whop Merchant of Record',
      loading: 'Whop決済を確認しています...',
      notFound: 'ご注文が見つかりません',
      returnCta: 'Keepsake Cinema に戻る',
      confirmedTag: '決済確認済み · 今すぐ開始できます',
      unlockedTitle: 'Express 4K 映画が解放されました！',
      welcomePrefix: 'ようこそ、',
      unlockedBody:
        'Express 4Kの残額決済ありがとうございます。専用のコンティニュイティ写真ライブラリが有効になりました。スマホから実写真をアップロードし、10秒の名前・地名発音ガイドを登録すれば当日4K制作を開始できます。',
      passBody:
        'ストーリーボード・ブループリントパスが有効になり、全額がExpress 4K本編に充当されます。今すぐガイド付きインタビューを始めるか、メールでお送りした専用リンクから再開してください。',
      emailCopiedNotice:
        'この専用リンクの控えをメールにも送信しました。スマホやPCからいつでも再開できます。',
      ctaContinuity: 'コンティニュイティ写真ライブラリを開く',
      ctaIntake: '5分間のガイド付きインタビューを始める',
      finalizingTitle: '専用スタジオポータルを準備中...',
      pendingTitle: '決済手続き待ち',
      finalizingBody:
        'Whop決済を確認し、専用スタジオリンクを生成しています。通常は数秒で完了します。',
      pendingBody: 'Whop決済を完了すると、専用スタジオポータルが即座に解放されます。',
      refreshBtn: 'ステータスを更新',
      resumeCheckoutPrefix: 'Whop決済を再開する',
    },
  },

  ko: {
    shortCode: 'KO',
    nativeLabel: '한국어',
    brandSubtitleMobile: 'Express 4K 영화',
    brandSubtitleDesktop: 'Express 4K 인생 · 기념일 시네마',
    topBarBadge: '화이트라벨 라이브 레퍼런스 스토어',
    topBarSubtext: '· Express 4K 시네마 전용 · Powered by SceneFlow Studio',
    topBarCtaMobile: '내 스튜디오 시작',
    topBarCtaDesktop: 'SceneFlow에서 나만의 브랜드 스튜디오 시작',
    nav: {
      occasions: '기념일 · 분야',
      howItWorks: '제작 과정',
      expressQuality: 'Express 4K 품질',
      faq: '자주 묻는 질문',
      ctaMobile: '$29 블루프린트',
      ctaDesktop: '$29 블루프린트 시작',
    },
    hero: {
      eyebrow: '1시간+ 장편 영화 & 멀티 에피소드 시리즈 · 시대 재연 · 제로 AI 슬롭',
      titlePrefix: '인생의 가장 빛나는 장을 ',
      titleAccent: '1시간+ 4K 영화·시리즈',
      titleSuffix: '로 — 오늘 바로 완성.',
      subtitleLead: '',
      subtitleHighlight1: '가족의 일대기와 역사적 시대 재연',
      subtitleMid: '부터 ',
      subtitleHighlight2: '멀티 에피소드 전기, 결혼식, 정년퇴임',
      subtitleEnd:
        '까지—촬영되지 않았던 인생의 장을 진짜 같은 인물, 장소, 문화, 역사적 맥락과 함께 30~150분 장편 영화 또는 정주행형 멀티 에피소드 시리즈로 재현합니다($149에 최대 60분 / 360 연출 프레임 포함). 1~3분 극장판 예고편, 보이스 클로닝, 오리지널 스코어까지 함께 제공됩니다.',
      metric1Sub: '블루프린트 패스 (100% 차감)',
      metric2Sub: '최대 60분 4K 장편 또는 시리즈 + 예고편',
      metric3Val: '2–4시간',
      metric3Sub: '사진 잠금 후 당일 4K 납품',
      primaryCta: '$29 스토리보드 블루프린트 시작하기',
      secondaryCta: '모든 기념일 · 사례 보기',
      trustWhop: '$29 전액 최종 4K 영화 결제에 100% 차감',
      trustPrivacy: '100% 비공개 사진 — AI 학습에 절대 미사용',
      trustLanguages: '14개 네이티브 UI 포털 · 70+ 언어 문화 현지화 4K 마스터',
    },
    theater: {
      eyebrow: 'Express 4K 시네마 시사회',
      watchSamplePrefix: '샘플 감상',
      sameDayTagSuffix: '당일 4K 완성',
      formatToggle: {
        express4kLabel: '4K 시네마',
        express4kSub: '오늘 주문 가능',
        fullMotionLabel: '풀모션',
        fullMotionSub: '스튜디오 미리보기',
        fullMotionEyebrow: '풀모션 시네마 미리보기',
        fullMotionTagSuffix: '파트너 스튜디오 등급 (데모 전용)',
        express4kNote:
          '포토리얼 4K 프레임에 켄 번즈 카메라 무빙, 스튜디오 보이스와 오리지널 스코어 결합 — 아래에서 당일 주문 가능합니다.',
        fullMotionNote:
          '실사풍 AI 모션과 립싱크 대사 — 두 포맷을 여기서 비교해 보세요. 풀모션 본편은 SceneFlow 인증 파트너 스튜디오를 통해 제작됩니다.',
        cardExpressBadge: '4K · 당일',
        cardFullMotionBadge: '풀모션 · 데모',
        watchExpressPrefix: '4K 시네마 재생',
        watchFullMotionPrefix: '풀모션 재생',
        heroSwitchPrefix: '포맷 비교:',
        heroOrFullMotion: '또는 풀모션 시네마',
      },
      tabs: [
        {
          id: 'family_legacy',
          label: 'Harbor Books · 인생 & 기념일',
          caption: 'Harbor Books: 파이크 거리의 50년 — 가족 유산, 결혼식, 졸업 & 퇴임',
          priceUsd: 149,
          videoSlug: 'memoir',
        },
        {
          id: 'real_estate_express',
          label: '부동산 4K',
          caption: '매물 사진을 내레이션 4K 부동산 시네마로 전환',
          priceUsd: 149,
          videoSlug: 'realestate',
        },
        {
          id: 'brand_express',
          label: '창업자 & 클리닉',
          caption: '촬영팀 없이 신뢰를 쌓는 홈페이지 브랜드 오리진 필름',
          priceUsd: 199,
          videoSlug: 'brand',
        },
        {
          id: 'training_express',
          label: '교육 & SOP',
          caption: '강사 일관성을 유지하며 언제든 쉽게 갱신하는 내레이션 교육 모듈',
          priceUsd: 249,
          videoSlug: 'training',
        },
      ],
    },
    occasions: {
      eyebrow: '큐레이션 Express 4K 컬렉션',
      heading: '모든 소중한 순간은 대형 스크린에 담길 자격이 있습니다.',
      subtitle:
        '아래 2분 영상은 짧은 미리보기 샘플입니다. $149 패키지는 진정한 1시간+ 4K 장편 영화 또는 정주행형 멀티 에피소드 시리즈(최대 60분 / 360 연출 프레임, 150분 확장 가능)로, 시대에 충실한 인물·장소·문화·역사로 촬영되지 않았던 삶의 장을 재현하며 1~3분 예고편을 포함합니다. $29 블루프린트 패스(100% 차감)로 시작하세요.',
      tabAll: '전체 예시 (4)',
      tabMilestones: '인생 · 기념일 (1)',
      tabCommercial: '비즈니스 · 부동산 (3)',
      groupMilestonesHeading: '인생 이야기 & 기념일 영화',
      groupCommercialHeading: '부동산, 브랜드 스토리 & 기업 교육 예시',
      groupCommercialSub:
        '매물 소개, 창업자·클리닉 스토리, 내레이션 SOP 교육을 위한 4K 시네마(당일 주문)와 풀모션 미리보기를 비교해 보세요.',
      idealForLabel: '추천 대상:',
      cardCta: '$29 블루프린트 시작',
      offers: {
        family_legacy: {
          badge: '가장 인기 · 1시간+ 장편 또는 시리즈',
          title: '인생 스토리 & 가족 회고록, 결혼식, 졸업, 퇴임 기념',
          subtitle:
            '깊이 있게 담아내세요—촬영되지 않았던 인생의 장을 진짜 같은 인물, 장소, 문화, 역사적 맥락과 함께 재현하는 잊지 못할 1시간+(30~150분) 장편 영화 또는 멀티 에피소드 인생 시리즈를 제작합니다. $149 패키지에 최대 60분(360 연출 4K 프레임)과 공유용 1~3분 극장판 예고편이 포함됩니다.',
          idealFor:
            '칠순·팔순 잔치, 가족사 기록, 멀티 에피소드 인생 시리즈, 결혼식·기념일, 졸업식, 퇴임식 및 추모 상영',
          runtimeLabel: '최대 60분 장편 또는 멀티 에피소드 시리즈 · + 1–3분 예고편',
          turnaroundLabel: '당일 완성 (사진 잠금 후 2–4시간)',
          deliverables: [
            '최대 60분 4K 장편 또는 멀티 에피소드 시리즈 (360 연출 프레임 · 최대 150분 확장 가능)',
            '가족 및 초대장 공유용 1–3분 극장판 예고편 포함',
            '시대 재연: 28세 복원, 친인척 닮은꼴 매칭, 시대별 장소와 가보 재현',
            '지역·시대별 문화/경제적 배경 자동 반영 및 70+ 언어 가족 모임·전통 장면 연출 포함',
          ],
          titlePlaceholder: '예: 마테오 할아버지의 80번째 생신 이야기',
        },
        wedding_love: {
          badge: '결혼식 & 결혼기념일',
          title: '러브스토리, 결혼식 & 리마인드 웨딩 영화',
          subtitle:
            '첫 만남, 추억의 여행, 프러포즈, 가족의 축복을 장편 4K 영화(최대 60분 / 360 프레임)와 1~3분 식전·피로연 예고편으로 제작합니다.',
          idealFor: '식전 영상, 피로연, 은혼식·금혼식, 약혼 기념 영화',
          runtimeLabel: '최대 60분 (360 프레임) · + 1–3분 예고편',
          turnaroundLabel: '당일 완성 (사진 잠금 후 2–4시간)',
          deliverables: [
            '스토리 블루프린트 + 가족·하객 코멘트 수집 링크',
            '휴대폰에서 커플 및 프러포즈 사진 바로 업로드',
            '따뜻한 내레이션, 공간 음향 및 시네마틱 스코어',
            '다운로드용 4K MP4 본편 + 1–3분 극장 예고편',
          ],
          titlePlaceholder: '예: 클레어 & 다니엘 — 리스본에서 영원까지',
        },
        graduation_milestone: {
          badge: '졸업 & 성장 기념',
          title: '졸업 & 성년 기념 트리뷰트 영화',
          subtitle:
            '고등학교·대학교·대학원 졸업을 챕터별 장편 4K 헌정 영화(최대 60분 / 360 프레임)와 1~3분 파티 예고편으로 축하합니다.',
          idealFor: '고교·대학 졸업식, 장학 만찬, 졸업 파티 및 송별회',
          runtimeLabel: '최대 60분 (360 프레임) · + 1–3분 예고편',
          turnaroundLabel: '당일 완성 (주말 파티에도 바로 준비)',
          deliverables: [
            '추억 키워드 칩으로 5분 만에 끝내는 가이드 인터뷰',
            '게스트 링크로 부모님·은사·형제의 축하 메시지 수집',
            '휴대폰 사진 업로드 + 이름/학교 발음 가이드',
            '선명한 4K MP4 본편 + 공유용 1–3분 파티 예고편',
          ],
          titlePlaceholder: '예: 마야의 2026년 졸업 여정',
        },
        retirement_tribute: {
          badge: '정년퇴임 & 커리어 유산',
          title: '정년퇴임 & 커리어 업적 헌정 영화',
          subtitle:
            '20~40년의 리더십과 멘토링, 잊지 못할 동료들과의 순간을 깊이 있는 장편 4K 헌정 영화(최대 60분 / 360 프레임)와 1~3분 만찬 예고편으로 기립니다.',
          idealFor: '퇴임 만찬, 임원 송별회, 공직·군·소방 헌정, 창업자 감사 상영',
          runtimeLabel: '최대 60분 (360 프레임) · + 1–3분 예고편',
          turnaroundLabel: '당일 완성 (사진 잠금 후 2–4시간)',
          deliverables: [
            '동료들이 쉽게 에피소드를 남길 수 있는 게스트 코멘트 링크',
            '커리어 사진, 팀 단체 사진 및 직장 주요 순간 업로드',
            '스튜디오 내레이션 + 10초 이름/회사명 발음 가이드',
            '연회장 대형 스크린용 4K MP4 본편 + 1–3분 예고편',
          ],
          titlePlaceholder: '예: 35년의 리더십 — 로버트 헤이즈 선장',
        },
        real_estate_express: {
          badge: '부동산 · 딥다이브 4K',
          title: 'Express 4K 부동산 매물 소개 영화',
          subtitle:
            '60초 슬라이드쇼를 넘어 모든 방, 건축 업그레이드, 하이엔드 가전, 야외 공간, 학군과 동네 라이프스타일까지 깊이 안내하는 최대 60분(360 프레임) 본편 + 1~3분 MLS·SNS 예고편.',
          idealFor: '고급 주택, 주거 매물, 타지역 매수자, 부티크 호텔 & 휴양 숙소',
          runtimeLabel: '최대 60분 (360 프레임) · 심층 투어 + 1–3분 예고편',
          turnaroundLabel: '당일 완성 (2–3시간)',
          deliverables: [
            '심층 4K 매물 & 주변 입지 영화 (최대 60분 / 360 프레임)',
            '즉각적인 매수 관심을 끄는 1–3분 MLS·SNS 하이라이트 예고편',
            '방별 특징, 고급 가전, 학군 및 라이프스타일 스토리텔링',
            '가상 가구 업그레이드, 생동감 있는 동네 라이프스타일 연출 및 70+ 언어 현지화 매수자 내레이션 포함',
          ],
          titlePlaceholder: '예: 하버 크레스트 420 오션뷰 레지던스',
        },
        brand_express: {
          badge: '브랜드 & 클리닉 · 장편 4K',
          title: 'Express 4K 창업자 & 클리닉 브랜드 영화',
          subtitle:
            '클리닉, 로펌, 플래그십 브랜드의 탄생 배경부터 고객 변화 사례, 시설 투어, 팀 철학까지 최대 60분(360 프레임) 다큐와 전환율 높은 1~3분 홈페이지 예고편으로 완성합니다.',
          idealFor: '의료·치과 클리닉, 로펌, 장인 브랜드, 지역 기업 및 비영리 단체',
          runtimeLabel: '최대 60분 (360 프레임) · 브랜드 다큐 + 1–3분 예고편',
          turnaroundLabel: '당일 완성 (2–4시간)',
          deliverables: [
            '장편 4K 창업자 & 브랜드 다큐멘터리 (최대 60분 / 360 프레임)',
            '방문자를 고객으로 전환하는 1–3분 홈페이지 & SNS 예고편',
            '창업자, 병원/오피스, 핵심 제품 및 브랜드 발음 완벽 잠금',
            '창립 시기 지역 역사적 배경 및 생생한 환자/고객 케어 장면 연출 포함',
          ],
          titlePlaceholder: '예: 퍼시픽 코스트 패밀리 치과 — 우리의 이야기',
        },
        training_express: {
          badge: '기업 교육 & SOP · 4K 정규 과정',
          title: 'Express 4K 내레이션 교육 & SOP 영화',
          subtitle:
            '50쪽 분량의 매뉴얼, 온보딩 가이드, 안전 규정을 몰입감 높은 다모듈 4K 교육 과정(최대 60분 / 360 프레임, 150분 커리큘럼 확장 가능)과 1~3분 개요 예고편으로 전환합니다.',
          idealFor: '신입 온보딩, 산업 안전 교육, 병원 SOP, 프랜차이즈 매뉴얼 & 자격 과정',
          runtimeLabel: '최대 60분 (360 프레임) · 전체 과정 + 1–3분 개요',
          turnaroundLabel: '당일 완성 (2–4시간)',
          deliverables: [
            '다모듈 4K 교육 과정 (최대 60분 / 360 프레임, 확장 가능)',
            '경영진 및 신입사원용 1–3분 핵심 개요 예고편 포함',
            '강사, 유니폼, 작업 현장 및 안전 장비 비주얼 완벽 고정',
            '지역 컴플라이언스 및 70+ 현장 인력 언어에 맞춘 현지화 산업안전·장비 시나리오 연출 포함',
          ],
          titlePlaceholder: '예: 신입사원 안전 수칙 및 장비 온보딩',
        },
      },
    },
    steps: {
      eyebrow: '회원가입 없는 간편한 진행',
      heading: '구술 추억에서 4K 영화까지 단 3단계',
      subtitle: '계정 생성도, 복잡한 프로그램도, 몇 주씩 걸리는 이메일 왕복도 필요 없습니다.',
      items: [
        {
          tag: 'Step 01 · 오늘 $29',
          title: '5분 가이드 스토리 & 리빙 블루프린트',
          body: '기념일 추억 칩을 누르며 70개 이상 영화 언어 중 원하는 언어로 이야기를 들려주세요(14개 언어 네이티브 포털 UI 지원). 약 3분 후 일러스트·내레이션이 담긴 블루프린트, 가족 코멘트 링크, AI 수정 4회를 받게 됩니다.',
          highlight: '$29 전액이 최종 4K 영화 금액에서 100% 차감됩니다 →',
        },
        {
          tag: 'Step 02 · 잔액 $120',
          title: '휴대폰 사진, 발음 가이드 & 연속성 잠금',
          body: '블루프린트를 승인하고 Whop으로 잔액을 결제하면 비공개 연속성 라이브러리가 열립니다. 휴대폰 사진(GPS 자동 제거)을 올리고 10초 이름/지명 발음 가이드를 추가해 모든 인물과 배경을 확정하세요.',
          highlight: '렌더링 전 모든 가족 성함과 초상을 사전 검증 →',
        },
        {
          tag: 'Step 03 · 당일 4K 완성',
          title: '비공개 시사실 & 자동 4K 마스터 발급',
          body: '로그인 없는 시사실 링크로 음성과 음악이 입혀진 Express 4K 영화를 폰이나 TV에서 감상하세요. 승인을 누르는 즉시 클라우드 엔진이 4K MP4 마스터를 렌더링해 이메일로 다운로드 링크를 보냅니다.',
          highlight: '행사장 프로젝터, 스마트 TV, 가족 공유에 즉시 사용 →',
        },
      ],
    },
    clarity: {
      badge: 'Express 4K 시네마가 탁월한 이유',
      heading: '켄 번즈 다큐멘터리 감성과 현대 4K 스토리텔링의 만남',
      body: '다큐멘터리 영화의 깊은 울림에 맞춤 포토리얼 4K 장면, 세대를 잇는 얼굴 연속성, 스튜디오급 내레이션, 공간 음향, 오리지널 스코어를 결합했습니다. 이 스토어가 Express 4K 시네마에 집중하는 덕분에 $2,500+와 3주 대기 대신 $149–$249로 당일 박물관급 화질을 제공합니다.',
      bullets: [
        '포토리얼 4K 스틸 + 부드러운 카메라 무빙',
        '업로드한 실제 사진을 자연스럽게 블렌딩',
        '스튜디오 내레이션, SFX & 오리지널 음악',
        '100% 개인 및 상업적 공유 권리 포함',
      ],
      partnerHeading: '나중에 풀모션 AI 영상이 필요하신가요?',
      partnerBody1:
        '이 Express 스토어는 일관된 품질과 당일 납품을 유지하기 위해 Express 4K 시네마만 제공합니다.',
      partnerBody2:
        '마음에 드는 챕터를 풀모션 AI 영상으로 업그레이드하거나 실사 인터뷰를 추가하고 싶다면, 잠긴 연속성 볼트를 재작업 없이 언제든 인증된 SceneFlow 파트너 스튜디오로 이전할 수 있습니다.',
      partnerPrimaryCta: 'Express 4K 블루프린트 주문 ($29)',
      partnerSecondaryCta: '영상 에이전시 · 파트너 안내 →',
    },
    faq: {
      eyebrow: '자주 묻는 질문',
      heading: '궁금한 점을 모두 알려드립니다',
      items: [
        {
          q: 'Express 4K 시네마 영화는 정확히 어떤 형식인가요?',
          a: '실제 사진과 연속성이 잠긴 맞춤 4K 장면을 부드러운 켄 번즈 카메라 무빙, 스튜디오급 내레이션 및 캐릭터 보이스, 입체 환경음, 오리지널 음악과 결합한 다큐멘터리 스타일 4K 영화입니다. 기존 촬영팀 비용의 극히 일부로 당일 완성됩니다.',
        },
        {
          q: '$29 스토리보드 블루프린트 패스는 어떻게 이용하나요?',
          a: 'Whop Checkout으로 $29를 결제하면 즉시 5분 음성/텍스트 가이드 인터뷰가 시작됩니다. 약 3분 뒤 일러스트·내레이션이 포함된 블루프린트, AI 수정 4회, 가족·동료용 코멘트 전용 링크를 받습니다. $29 전액은 Express 4K 영화 결제에 차감됩니다($149 영화 기준 잔액 $120).',
        },
        {
          q: '최종 확정 전에 형제, 배우자, 동료도 이야기를 보탤 수 있나요?',
          a: '네! 블루프린트 포털에는 별도의 게스트 코멘트 전용 링크가 있습니다. 친척이나 친구, 동료가 70개+ 영화 언어(14개 언어 네이티브 UI)로 감상하고 내 수정 횟수를 차감하지 않고 추억을 남길 수 있습니다.',
        },
        {
          q: '14개 네이티브 UI 포털과 70+ 문화 현지화 영화 언어는 어떻게 함께 작동하나요?',
          a: '14개 네이티브 포털에서 운영하고, 70+ 언어로 문화적 진정성을 담은 영화를 제작하세요. 14개 핵심 포털 언어(영어, 스페인어, 포르투갈어, 힌디어, 중국어, 아랍어, 태국어, 일본어, 한국어, 독일어, 프랑스어, 이탈리아어, 네덜란드어, 러시아어)로 프로젝트를 검토·관리하는 동안, SceneFlow의 스토리 및 비주얼 엔진이 70+ 언어로 문화 현지화된 4K 마스터를 생성하며 지역별 역사적 맥락, 현지 건축·인테리어 연출, 원어민 발음 잠금까지 완벽하게 제공합니다.',
        },
        {
          q: '특이한 성씨나 지명, 회사명이 잘못 발음되면 어쩌죠?',
          a: '연속성 라이브러리에 10초 발음 가이드가 포함되어 있어 텍스트나 음성으로 정확한 발음을 지정할 수 있습니다. 또한 4K 마스터 렌더링 전 비공개 시사실에서 전체 음성을 직접 검수합니다.',
        },
        {
          q: '가족 사진이나 회사 자료가 AI 모델 학습에 사용되나요?',
          a: '절대 아닙니다. 업로드된 사진은 즉시 EXIF GPS 위치 정보가 자동 삭제되며, 고객 프로젝트 전용으로 비공개 유지되고 공용 AI 학습에 결코 사용되지 않습니다.',
        },
        {
          q: '나중에 풀모션 AI 영상이나 실사 촬영을 추가할 수 있나요?',
          a: '이 스토어는 빠른 당일 제작과 투명한 가격을 위해 Express 4K에 집중하지만, 인물·음성·스토리가 SceneFlow Studio에 잠겨 있어 언제든 인증 파트너 스튜디오를 통해 재작업 없이 풀모션으로 업그레이드할 수 있습니다.',
        },
      ],
    },
    footer: {
      referenceTag: '· 라이브 레퍼런스 스토어프런트',
      body: '이 스토어는 SceneFlow Studio 화이트라벨 클라이언트 포털 엔진과 Whop Merchant of Record 결제로 100% 구동됩니다. 스튜디오 운영자는 자체 도메인으로 브랜드 스토어를 오픈하고 고객 결제의 100%를 수익으로 보유할 수 있습니다.',
      primaryCta: '$29 블루프린트 패스 시작',
      secondaryCta: '내 브랜드로 이 스토어 운영하기 →',
    },
    modal: {
      stepBadge: 'Step 1 · 블루프린트 패스',
      linePass: '스토리보드 블루프린트 패스',
      lineBalance: '승인 후 Express 4K 잔액 (승인 시에만 결제)',
      lineTotal: 'Express 4K 영화 총액',
      whopNotice: 'Whop (Merchant of Record) 안전 결제 처리',
      currencyNote: '현지 통화 예상액으로 표시되며 Whop MoR은 USD(오늘 $29)로 결제됩니다.',
      instantLinkNote: '결제 직후 5분 가이드 스토리 인터뷰 매직 링크가 즉시 열립니다.',
      fieldOccasion: '기념일 / 영화 스타일',
      fieldTitle: '누구 또는 무엇을 기념하는 영화인가요? (선택)',
      fieldName: '성함 *',
      fieldNamePlaceholder: '김민준',
      fieldLanguage: '포털 UI 언어',
      fieldLanguageHint: '영화 본편과 내레이션은 가이드 인터뷰 중 70개+ 언어(한국어, 영어, 일본어, 프랑스어 등)로 제작할 수 있습니다.',
      whopRefBadge: '결제 대행: Whop',
      fieldEmail: '비공개 스튜디오 링크를 받을 이메일 *',
      fieldEmailPlaceholder: 'you@example.com',
      submitIdlePrefix: '안전 결제 계속하기 —',
      submitBusy: '안전 결제 창을 여는 중...',
      errorFallback: 'Whop 결제를 시작하지 못했습니다. 다시 시도해 주세요.',
      errorNetwork: '네트워크 오류가 발생했습니다. 다시 시도해 주세요.',
      totalOptionSuffix: '총액',
      todayOptionSuffix: '오늘 결제',
    },
    orderPage: {
      whopBadgeShort: 'Whop MoR',
      whopBadgeFull: 'Whop Merchant of Record',
      loading: 'Whop 결제를 확인하고 있습니다...',
      notFound: '주문을 찾을 수 없습니다',
      returnCta: 'Keepsake Cinema로 돌아가기',
      confirmedTag: '결제 확인 완료 · 바로 이용 가능',
      unlockedTitle: 'Express 4K 영화가 잠금 해제되었습니다!',
      welcomePrefix: '환영합니다,',
      unlockedBody:
        'Express 4K 잔액 결제를 완료해 주셔서 감사합니다. 비공개 연속성 사진 라이브러리가 열렸습니다—휴대폰 사진을 올리고 10초 발음 가이드를 추가하시면 당일 4K 시네마 제작이 시작됩니다.',
      passBody:
        '스토리보드 블루프린트 패스가 활성화되었으며 Express 4K 영화 결제에 100% 차감됩니다. 지금 바로 가이드 인터뷰를 시작하거나 이메일로 발송된 매직 링크를 열어주세요.',
      emailCopiedNotice:
        '언제든 휴대폰이나 PC에서 이어서 진행할 수 있도록 매직 링크 사본을 이메일로도 보내드렸습니다.',
      ctaContinuity: '내 연속성 사진 라이브러리 열기',
      ctaIntake: '5분 가이드 스토리 인터뷰 시작하기',
      finalizingTitle: '비공개 스튜디오 포털 준비 중...',
      pendingTitle: '결제 대기 중',
      finalizingBody:
        'Whop 결제를 확인하고 전용 스튜디오 링크를 생성 중입니다. 보통 몇 초 안에 완료됩니다.',
      pendingBody: 'Whop 결제를 완료하면 비공개 스튜디오 포털이 즉시 열립니다.',
      refreshBtn: '상태 새로고침',
      resumeCheckoutPrefix: 'Whop 결제 이어하기',
    },
  },

  de: {
    shortCode: 'DE',
    nativeLabel: 'Deutsch',
    brandSubtitleMobile: 'Express 4K Filme',
    brandSubtitleDesktop: 'Express 4K Lebens- & Meilensteinfilme',
    topBarBadge: 'Live-White-Label-Referenzshop',
    topBarSubtext: '· Nur Express 4K Kino · Powered by SceneFlow Studio',
    topBarCtaMobile: 'Eigenes Studio starten',
    topBarCtaDesktop: 'Eigenes Marken-Studio auf SceneFlow starten',
    nav: {
      occasions: 'Anlässe',
      howItWorks: 'So funktioniert’s',
      expressQuality: 'Express 4K Qualität',
      faq: 'FAQ',
      ctaMobile: '$29 Blueprint',
      ctaDesktop: '$29 Blueprint starten',
    },
    hero: {
      eyebrow: '1-Std.+-Spielfilme & Mehrteilige Serien · Historische Reenactments · Null AI-Slop',
      titlePrefix: 'Verwandeln Sie die schönsten Kapitel des Lebens in einen ',
      titleAccent: '1-Std.+-4K-Film oder eine Serie',
      titleSuffix: ' — heute geliefert.',
      subtitleLead: 'Von ',
      subtitleHighlight1: 'Familienchroniken & historischen Reenactments',
      subtitleMid: ' bis zu ',
      subtitleHighlight2: 'mehrteiligen Biografien, Hochzeiten und Ruhestandsfeiern',
      subtitleEnd:
        '—lassen Sie nie gefilmte Lebenskapitel mit authentischen Menschen, Orten, Kultur und historischem Kontext in einem 30–150-minütigen Spielfilm oder einer fesselnden mehrteiligen Serie wiederaufleben (bis zu 60 Min. / 360 inszenierte Frames für $149 inklusive), plus 1–3-Min.-Kinotrailer, Stimmenkloning und Originalmusik.',
      metric1Sub: 'Blueprint-Pass (100 % anrechenbar)',
      metric2Sub: 'Bis zu 60-Min.-4K-Film oder Serie + Trailer',
      metric3Val: '2–4 Std.',
      metric3Sub: 'Same-Day-4K nach Fotofreigabe',
      primaryCta: 'Meinen $29 Storyboard-Blueprint starten',
      secondaryCta: 'Alle Anlässe ansehen',
      trustWhop: '100 % der $29 werden auf Ihren 4K-Film angerechnet',
      trustPrivacy: '100 % private Fotos — niemals für KI-Training genutzt',
      trustLanguages: '14 native UI-Portale · Kulturell lokalisierte 4K-Master in 70+ Sprachen',
    },
    theater: {
      eyebrow: 'Express 4K Kino-Reel',
      watchSamplePrefix: 'Beispiel ansehen',
      sameDayTagSuffix: 'Same-Day 4K',
      formatToggle: {
        express4kLabel: '4K Kino',
        express4kSub: 'Heute bestellen',
        fullMotionLabel: 'Full Motion',
        fullMotionSub: 'Studio-Vorschau',
        fullMotionEyebrow: 'Full-Motion-Kino-Vorschau',
        fullMotionTagSuffix: 'Partner-Studio-Stufe (Nur Demo)',
        express4kNote:
          'Fotorealistische 4K-Frames mit Ken-Burns-Kamerafahrt, Studiostimmen & Score — unten zur Same-Day-Bestellung verfügbar.',
        fullMotionNote:
          'Live-Action-KI-Bewegung & lippensynchrone Dialoge — vergleichen Sie hier beide Formate; Full-Motion-Filme entstehen über SceneFlow Studio-Partner.',
        cardExpressBadge: '4K · Heute',
        cardFullMotionBadge: 'Full Motion · Demo',
        watchExpressPrefix: '4K Kino abspielen',
        watchFullMotionPrefix: 'Full Motion abspielen',
        heroSwitchPrefix: 'Formate vergleichen:',
        heroOrFullMotion: 'oder Full-Motion-Kino',
      },
      tabs: [
        {
          id: 'family_legacy',
          label: 'Harbor Books · Leben & Meilensteine',
          caption:
            'Harbor Books: Fünfzig Jahre in der Pike Street — Familienvermächtnis, Hochzeiten, Abschlüsse & Ruhestand',
          priceUsd: 149,
          videoSlug: 'memoir',
        },
        {
          id: 'real_estate_express',
          label: 'Immobilien 4K',
          caption: 'Immobilienfotos verwandelt in vertontes 4K-Objektkino',
          priceUsd: 149,
          videoSlug: 'realestate',
        },
        {
          id: 'brand_express',
          label: 'Gründer & Klinik',
          caption: 'Vertrauensbildende Homepage-Gründerfilme ohne Kamerateam',
          priceUsd: 199,
          videoSlug: 'brand',
        },
        {
          id: 'training_express',
          label: 'Schulung & SOP',
          caption: 'Vertonte Module mit konsistentem Trainer – jederzeit leicht aktualisierbar',
          priceUsd: 249,
          videoSlug: 'training',
        },
      ],
    },
    occasions: {
      eyebrow: 'Kuratierte Express-4K-Kollektionen',
      heading: 'Jeder Meilenstein verdient die große Leinwand.',
      subtitle:
        'Die 2-Minuten-Videos unten sind kurze Vorschauen — Ihr $149-Paket umfasst einen echten 1-Std.+-4K-Spielfilm ODER eine fesselnde mehrteilige Serie (bis zu 60 Min. / 360 inszenierte Frames; erweiterbar auf 150 Min.), die nie gefilmte Kapitel mit epochengerechten Menschen, Orten, Kultur & Geschichte zum Leben erweckt, plus einen 1–3-Min.-Trailer. Starten Sie mit einem $29 Blueprint-Pass (100 % anrechenbar).',
      tabAll: 'Alle Beispiele (4)',
      tabMilestones: 'Leben & Meilensteine (1)',
      tabCommercial: 'Business & Immobilien (3)',
      groupMilestonesHeading: 'Lebensgeschichten & Meilensteinfilme',
      groupCommercialHeading: 'Beispiele für Immobilien, Markenstory & Schulung',
      groupCommercialSub:
        'Entdecken Sie 4K Kino (Same-Day-Bestellung) und Full-Motion-Vorschauen für Immobilienexposés, Gründerfilme und vertonte SOP-Schulungen.',
      idealForLabel: 'Ideal für:',
      cardCta: '$29 Blueprint starten',
      offers: {
        family_legacy: {
          badge: 'Am beliebtesten · 1-Std.+-Film oder Serie',
          title: 'Lebensgeschichten & Familienmemoiren, Hochzeiten, Abschlüsse u. v. m.',
          subtitle:
            'Gehen Sie in die Tiefe — erzählen Sie einen unvergesslichen 1-Std.+-(30–150 Min.) Spielfilm oder eine mehrteilige Lebensserie, die nie gefilmte Kapitel mit authentischen Menschen, Orten, Kultur und historischem Kontext nachstellt. Ihr $149-Paket umfasst bis zu 60 Min. (360 inszenierte 4K-Frames) plus einen teilbaren 1–3-Min.-Kinotrailer.',
          idealFor:
            '70./80. Geburtstage, Familienchroniken, mehrteilige Lebensserien, Hochzeiten & Jubiläen, Abschlüsse, Ruhestand & Lebensfeiern',
          runtimeLabel: 'Bis zu 60 Min. Spielfilm ODER Mehrteilige Serie · + 1–3 Min. Trailer',
          turnaroundLabel: 'Am selben Tag (2–4 Std. nach Fotofreigabe)',
          deliverables: [
            'Bis zu 60 Min. 4K-Spielfilm ODER Mehrteilige Serie (360 inszenierte Frames; bis 150 Min. erweiterbar)',
            'Teilbarer 1–3-Min.-Kinotrailer für Familie und Einladungen inklusive',
            'Historische Reenactments: Verjüngung auf 28 Jahre, Familienähnlichkeit, Epochen-Schauplätze & Erbstücke',
            'Inkl. automatischem regionalem & jahrzehntspezifischem Kultur-/Wirtschaftskontext + inszenierten Familientreffen & Traditionen in 70+ Sprachen',
          ],
          titlePlaceholder: 'z. B. Opa Mateos Geschichte zum 80. Geburtstag',
        },
        wedding_love: {
          badge: 'Hochzeiten & Jubiläen',
          title: 'Liebesgeschichten, Hochzeiten & Eheversprechen',
          subtitle:
            'Verwandeln Sie Ihr Kennenlernen, Lieblingsreisen, den Antrag und Glückwünsche der Familie in einen 4K-Spielfilm (bis 60 Min. / 360 Frames) plus 1–3-Min.-Trailer.',
          idealFor: 'Polterabend, Hochzeitsfeier, Silber- & Goldhochzeit, Verlobungsfilme',
          runtimeLabel: 'Bis zu 60 Min. (360 Frames) · + 1–3 Min. Trailer',
          turnaroundLabel: 'Am selben Tag (2–4 Std. nach Fotofreigabe)',
          deliverables: [
            'Story-Blueprint + Kommentar-Link für Familie und Trauzeugen',
            'Lieblingsfotos als Paar und vom Antrag direkt vom Handy hochladen',
            'Warme Erzählstimme, atmosphärischer Klang & kinoreife Musik',
            '4K-MP4-Hauptfilm zum Download + 1–3-Min.-Kinotrailer',
          ],
          titlePlaceholder: 'z. B. Clara & Daniel — Von Lissabon für immer',
        },
        graduation_milestone: {
          badge: 'Abschlüsse & Erwachsenwerden',
          title: 'Abschluss- & Meilenstein-Tribute',
          subtitle:
            'Feiern Sie Abitur, Bachelor oder Master mit einem kapitelweisen 4K-Tributfilm (bis 60 Min. / 360 Frames) plus 1–3-Min.-Party-Trailer.',
          idealFor: 'Abitur- & Uni-Abschlüsse, Stipendienfeiern, Abschiedsfeiern',
          runtimeLabel: 'Bis zu 60 Min. (360 Frames) · + 1–3 Min. Trailer',
          turnaroundLabel: 'Am selben Tag (bereit für die Feier am Wochenende)',
          deliverables: [
            'Schnelles 5-Min.-Interview mit Meilenstein-Erinnerungsimpulsen',
            'Beiträge von Eltern, Lehrern & Geschwistern per Gäste-Link sammeln',
            'Handyfoto-Upload + Aussprachehilfe für Namen und Schulen',
            'Gestochen scharfer 4K-MP4-Film + 1–3-Min.-Trailer zum Teilen',
          ],
          titlePlaceholder: 'z. B. Mayas Weg zum Abschluss 2026',
        },
        retirement_tribute: {
          badge: 'Ruhestand & Lebenswerk',
          title: 'Ruhestands- & Karriere-Meilensteinfilme',
          subtitle:
            'Würdigen Sie 20–40 Jahre Führung, Mentoring und besondere Momente im Team in einem tiefgehenden 4K-Tributfilm (bis 60 Min. / 360 Frames) plus 1–3-Min.-Bankett-Trailer.',
          idealFor: 'Ruhestandsfeiern, Abschiede von Führungskräften, Ehrungen & Gründer-Tribute',
          runtimeLabel: 'Bis zu 60 Min. (360 Frames) · + 1–3 Min. Trailer',
          turnaroundLabel: 'Am selben Tag (2–4 Std. nach Fotofreigabe)',
          deliverables: [
            'Gäste-Kommentar-Link, damit Kollegen mühelos Anekdoten ergänzen',
            'Karrierefotos, Teamaufnahmen und Meilensteine einfach hochladen',
            'Studio-Erzählstimme + 10-Sek.-Aussprachehilfe für Namen/Firmen',
            '4K-MP4-Hauptfilm + 1–3-Min.-Trailer für Bankett-Leinwände',
          ],
          titlePlaceholder: 'z. B. 35 Jahre Führung — Kapitän Robert Hayes',
        },
        real_estate_express: {
          badge: 'Immobilien · Deep-Dive 4K',
          title: 'Express 4K Immobilien-Exposéfilm',
          subtitle:
            'Weit mehr als eine 60-Sekunden-Diashow: Führen Sie Käufer durch jeden Raum, architektonische Details, Markengeräte, Außenbereiche, Schulen und Viertel — bis 60 Min. (360 4K-Frames) plus 1–3-Min.-Trailer.',
          idealFor: 'Luxusanwesen, Wohnimmobilien, überregionale Käufer, Boutique-Hotels & Ferienhäuser',
          runtimeLabel: 'Bis zu 60 Min. (360 Frames) · Tiefentour + 1–3 Min. Trailer',
          turnaroundLabel: 'Am selben Tag (2–3 Std.)',
          deliverables: [
            'Detaillierter 4K-Objekt- & Viertelfilm (bis 60 Min. / 360 Frames)',
            '1–3-Min.-Highlight-Trailer für Portale & Social Media inklusive',
            'Raum-für-Raum-Storytelling zu Ausstattung, Schulen & Lebensgefühl',
            'Inkl. virtuellem Möbel-Update, lebendigem Nachbarschafts-Lifestyle-Staging & lokalisierter Käufer-Narration in 70+ Sprachen',
          ],
          titlePlaceholder: 'z. B. Residenz Harbor Crest 420 mit Meerblick',
        },
        brand_express: {
          badge: 'Markenstory & Kliniken · Langform 4K',
          title: 'Express 4K Gründer- & Praxisfilm',
          subtitle:
            'Erzählen Sie die ganze Dokumentargeschichte hinter Ihrer Klinik, Kanzlei oder Marke — Gründungsidee, Kundenerfolge, Rundgang und Teamphilosophie — bis 60 Min. (360 Frames) plus konversionsstarkem 1–3-Min.-Homepage-Trailer.',
          idealFor: 'Arzt-/Zahnarztpraxen, Kanzleien, Manufakturen, lokale Betriebe & Vereine',
          runtimeLabel: 'Bis zu 60 Min. (360 Frames) · Marken-Doku + 1–3 Min. Trailer',
          turnaroundLabel: 'Am selben Tag (2–4 Std.)',
          deliverables: [
            'Langform-4K-Gründer- & Markendokumentation (bis 60 Min. / 360 Frames)',
            '1–3-Min.-Homepage- & Social-Trailer für schnelle Kundenüberzeugung',
            'Fixierung von Gründer, Praxis/Büro, Kernprodukten & Namensaussprache',
            'Inkl. lokalem historischem Gründungskontext & lebendiger Inszenierung aktiver Patienten-/Kundenbetreuung',
          ],
          titlePlaceholder: 'z. B. Zahnarztpraxis Pazifikküste — Unsere Geschichte',
        },
        training_express: {
          badge: 'Schulung & SOPs · 4K-Komplettkurs',
          title: 'Express 4K Vertonter Schulungs- & SOP-Film',
          subtitle:
            'Verwandeln Sie 50-seitige Handbücher, Onboarding-Leitfäden oder Sicherheitsvorschriften in einen fesselnden 4K-Schulungskurs (bis 60 Min. / 360 Frames; erweiterbar auf 150 Min.) mit konsistentem Trainer & 1–3-Min.-Überblickstrailer.',
          idealFor: 'Mitarbeiter-Onboarding, Arbeitssicherheit, Praxis-SOPs, Franchise-Handbücher & Zertifizierungen',
          runtimeLabel: 'Bis zu 60 Min. (360 Frames) · Vollkurs + 1–3 Min. Überblick',
          turnaroundLabel: 'Am selben Tag (2–4 Std.)',
          deliverables: [
            'Mehrteiliger 4K-Schulungskurs (bis 60 Min. / 360 Frames; erweiterbar)',
            '1–3-Min.-Überblickstrailer für Leitung und neue Mitarbeiter inklusive',
            'Konsistente Darstellung von Trainer, Kleidung, Betrieb & Schutzausrüstung',
            'Inkl. lokalisiertem Arbeitssicherheits- & Ausrüstungs-Staging, angepasst an regionale Compliance & 70+ Belegschaftssprachen',
          ],
          titlePlaceholder: 'z. B. Sicherheits- & Geräte-Onboarding für neue Mitarbeiter',
        },
      },
    },
    steps: {
      eyebrow: 'Mühelos ganz ohne Login',
      heading: 'Von erzählten Erinnerungen zum 4K-Film in 3 einfachen Schritten',
      subtitle: 'Kein Konto anlegen, keine komplizierte Software und keine wochenlangen E-Mail-Schleifen.',
      items: [
        {
          tag: 'Schritt 01 · $29 heute',
          title: '5-Min.-Interview & Lebendiger Blueprint',
          body: 'Tippen Sie Erinnerungs-Impulse an und erzählen Sie Ihre Geschichte in einer von 70+ Filmsprachen (mit 14-sprachigem nativem Portal-UI). In ca. 3 Minuten erhalten Sie einen illustrierten, vertonten Blueprint + Familien-Kommentar-Link und 4 KI-Überarbeitungsrunden.',
          highlight: '100 % Ihrer $29 werden auf Ihren finalen 4K-Film angerechnet →',
        },
        {
          tag: 'Schritt 02 · $120 Restbetrag',
          title: 'Handyfotos, Aussprache & Continuity-Lock',
          body: 'Genehmigen Sie Ihren Blueprint und begleichen Sie den Restbetrag über Whop, um Ihre private Continuity-Bibliothek freizuschalten. Laden Sie Fotos vom Handy hoch (GPS entfernt), fügen Sie eine 10-Sek.-Aussprachehilfe hinzu und sichern Sie jedes Gesicht & jeden Ort.',
          highlight: 'Jeder Familienname und jedes Porträt vor dem Rendern geprüft →',
        },
        {
          tag: 'Schritt 03 · Same-Day 4K',
          title: 'Privater Vorführraum & Automatischer 4K-Master',
          body: 'Sehen Sie Ihren vertonten Express-4K-Kinofilm ohne Login auf Handy oder TV an. Sobald Sie auf Genehmigen klicken, rendert unsere Cloud-Engine Ihren 4K-MP4-Master und sendet Ihren Download-Link automatisch per E-Mail.',
          highlight: 'Sofort bereit für Saal-Beamer, Smart-TVs & Familiengruppen →',
        },
      ],
    },
    clarity: {
      badge: 'Warum Express 4K Kino so stark wirkt',
      heading: 'Ken-Burns-Dokumentarkino trifft modernes 4K-Storytelling',
      body: 'Verbinden Sie die emotionale Tiefe eines Dokumentarfilms mit maßgeschneiderten fotorealistischen 4K-Szenen, stabilen Gesichtern über Epochen, lebendiger Studio-Erzählung, Raumklang und eigener Filmmusik. Durch den klaren Fokus auf Express 4K Kino liefern wir Museumsqualität für $149–$249 am selben Tag statt $2,500+ und drei Wochen Wartezeit.',
      bullets: [
        'Fotorealistische 4K-Aufnahmen + sanfte Kamerafahrten',
        'Ihre hochgeladenen Originalfotos nahtlos integriert',
        'Studio-Erzählung, SFX & eigene Filmmusik',
        '100 % private und kommerzielle Nutzungsrechte',
      ],
      partnerHeading: 'Später Lust auf Full-Motion-KI-Video?',
      partnerBody1:
        'Dieser Express-Storefront bietet bewusst ausschließlich Express 4K Kino – für konstante Qualität und Lieferung am selben Tag.',
      partnerBody2:
        'Möchten Sie Lieblingskapitel auf Full-Motion-KI-Video aufrüsten oder echte Interviews ergänzen? Ihr gesicherter Continuity Vault wechselt jederzeit ohne Nacharbeit zu einem zertifizierten SceneFlow Studio-Partner.',
      partnerPrimaryCta: 'Express 4K Blueprint bestellen ($29)',
      partnerSecondaryCta: 'Für Videoagenturen →',
    },
    faq: {
      eyebrow: 'Fragen & Antworten',
      heading: 'Alles, was Sie wissen sollten',
      items: [
        {
          q: 'Was genau ist ein Express 4K Kinofilm?',
          a: 'Ein Express 4K Kinofilm ist ein fotorealistischer 4K-Film im Dokumentarstil, der Ihre echten Fotos und maßgeschneiderte 4K-Szenen mit sanften Ken-Burns-Kamerafahrten, Studio-Erzählung & Stimmen, feinen Umgebungsgeräuschen und eigener Musik kombiniert — am selben Tag geliefert zu einem Bruchteil klassischer Produktionskosten.',
        },
        {
          q: 'Wie funktioniert der $29 Storyboard-Blueprint-Pass?',
          a: 'Sie starten mit dem $29 Storyboard-Blueprint-Pass über Whop Checkout. Direkt nach der Zahlung beginnen Sie Ihr 5-minütiges Sprach- oder Textinterview. Nach ca. 3 Minuten erhalten Sie einen illustrierten, vertonten Storyboard-Blueprint mit 4 KI-Überarbeitungsrunden und einem Kommentar-Link für Familie oder Kollegen. Ihre vollen $29 werden auf den 4K-Film angerechnet (bei einem $149-Film bleiben nur $120 Restbetrag).',
        },
        {
          q: 'Können Geschwister, Partner oder Kollegen Geschichten beisteuern?',
          a: 'Ja! Ihr Blueprint-Portal enthält einen separaten Gäste-Kommentar-Link. Angehörige, Trauzeugen oder Kollegen können in über 70 Filmsprachen (mit 14-sprachiger nativer Portal-Oberfläche) mithören und Erinnerungen ergänzen, ohne Ihre Korrekturrunden zu verbrauchen.',
        },
        {
          q: 'Wie greifen die 14 nativen UI-Portale und 70+ kulturell lokalisierten Filmsprachen ineinander?',
          a: 'Arbeiten Sie in 14 nativen Portalen und produzieren Sie kulturell authentische Filme in über 70 Sprachen. Prüfen und verwalten Sie Projekte in 14 reichweitenstarken Portalsprachen (Englisch, Spanisch, Portugiesisch, Hindi, Chinesisch, Arabisch, Thailändisch, Japanisch, Koreanisch, Deutsch, Französisch, Italienisch, Niederländisch und Russisch)—während die Story- und Visual-Engine von SceneFlow kulturell lokalisierte 4K-Master in über 70 Sprachen erstellt, inklusive regional stimmigem historischem Kontext, lokaler Architektur-/Innenraum-Inszenierung und nativen Aussprache-Locks.',
        },
        {
          q: 'Was ist mit ungewöhnlichen Nachnamen, Orten oder Firmennamen?',
          a: 'Ihre Continuity-Bibliothek bietet eine 10-Sekunden-Aussprachehilfe (per Text oder Sprache). Außerdem prüfen Sie die komplett vertonte Fassung in Ihrem privaten Vorführraum, bevor der 4K-Master gerendert wird.',
        },
        {
          q: 'Werden meine Familienfotos oder Firmendaten jemals für KI-Training verwendet?',
          a: 'Niemals. Hochgeladene Fotos werden automatisch von EXIF-GPS-Daten bereinigt, bleiben streng privat in Ihrem Projekt und werden niemals zum Training gemeinsamer KI-Modelle genutzt.',
        },
        {
          q: 'Was, wenn ich später Full-Motion-KI-Szenen oder einen Live-Dreh möchte?',
          a: 'Dieser Storefront fokussiert sich auf Express 4K Kino für Tempo und faire Preise. Da Besetzung, Stimmen und Geschichte in SceneFlow Studio gesichert sind, können Sie ausgewählte Kapitel jederzeit über einen zertifizierten SceneFlow Studio-Partner ohne Nacharbeit aufrüsten.',
        },
      ],
    },
    footer: {
      referenceTag: '· Live-Referenz-Storefront',
      body: 'Dieser Storefront läuft zu 100 % auf der White-Label-Kundenportal-Engine von SceneFlow Studio mit Whop Merchant-of-Record-Checkout. Studio-Betreiber können ihren eigenen Marken-Shop unter eigener Domain starten und 100 % der Kundenumsätze behalten.',
      primaryCta: '$29 Blueprint-Pass starten',
      secondaryCta: 'Unter Ihrer eigenen Marke betreiben →',
    },
    modal: {
      stepBadge: 'Schritt 1 · Blueprint-Pass',
      linePass: 'Storyboard-Blueprint-Pass',
      lineBalance: 'Späterer Express-4K-Restbetrag (nur bei Freigabe)',
      lineTotal: 'Gesamtpreis Express 4K Film',
      whopNotice: 'Sicher abgewickelt über Whop (Merchant of Record)',
      currencyNote: 'Anzeige als Schätzwert in EUR; Whop MoR rechnet in USD ab ($29 heute).',
      instantLinkNote: 'Sofortiger Magic-Link zu Ihrem 5-Min.-Story-Interview direkt nach dem Checkout.',
      fieldOccasion: 'Anlass / Filmstil',
      fieldTitle: 'Wen oder was feiert dieser Film? (optional)',
      fieldName: 'Ihr Name *',
      fieldNamePlaceholder: 'Lukas Weber',
      fieldLanguage: 'Portal-UI-Sprache',
      fieldLanguageHint: 'Filme & Sprecher lassen sich während Ihres Interviews in über 70 Sprachen (Deutsch, Englisch, Französisch, Italienisch, Japanisch u. v. m.) produzieren.',
      whopRefBadge: 'Zahlungsabwicklung über Whop',
      fieldEmail: 'E-Mail für Ihre privaten Studio-Links *',
      fieldEmailPlaceholder: 'sie@beispiel.de',
      submitIdlePrefix: 'Weiter zum sicheren Checkout —',
      submitBusy: 'Sicherer Checkout wird geöffnet...',
      errorFallback: 'Whop Checkout konnte nicht gestartet werden. Bitte erneut versuchen.',
      errorNetwork: 'Netzwerkfehler beim Starten von Whop Checkout. Bitte erneut versuchen.',
      totalOptionSuffix: 'gesamt',
      todayOptionSuffix: 'heute',
    },
    orderPage: {
      whopBadgeShort: 'Whop MoR',
      whopBadgeFull: 'Whop Merchant of Record',
      loading: 'Ihr Whop-Checkout wird bestätigt...',
      notFound: 'Bestellung nicht gefunden',
      returnCta: 'Zurück zu Keepsake Cinema',
      confirmedTag: 'Zahlung bestätigt · Sofort startklar',
      unlockedTitle: 'Ihr Express 4K Film ist freigeschaltet!',
      welcomePrefix: 'Willkommen,',
      unlockedBody:
        'Vielen Dank für die Begleichung des Express-4K-Restbetrags. Ihre private Continuity-Fotobibliothek ist jetzt aktiv — laden Sie echte Fotos vom Handy hoch und ergänzen Sie eine 10-Sek.-Aussprachehilfe für Ihren Same-Day-4K-Kinofilm.',
      passBody:
        'Ihr Storyboard-Blueprint-Pass ist aktiv und wird zu 100 % auf Ihren Express-4K-Film angerechnet. Starten Sie jetzt Ihr geführtes Story-Interview oder öffnen Sie den Magic-Link in Ihrem Postfach.',
      emailCopiedNotice:
        'Eine private Kopie dieses Magic-Links wurde auch an Ihre E-Mail gesendet, damit Sie jederzeit am Handy oder Desktop weitermachen können.',
      ctaContinuity: 'Meine Continuity-Fotobibliothek öffnen',
      ctaIntake: 'Mein 5-Min.-Story-Interview starten',
      finalizingTitle: 'Ihr Studio-Portal wird eingerichtet...',
      pendingTitle: 'Checkout ausstehend',
      finalizingBody:
        'Wir bestätigen Ihre Whop-Zahlung und richten Ihren privaten Studio-Link ein. Dies dauert meist nur wenige Sekunden.',
      pendingBody: 'Schließen Sie Ihren Whop-Checkout ab, um Ihr privates Studio-Portal sofort freizuschalten.',
      refreshBtn: 'Status aktualisieren',
      resumeCheckoutPrefix: 'Whop-Checkout fortsetzen',
    },
  },

  fr: {
    shortCode: 'FR',
    nativeLabel: 'Français',
    brandSubtitleMobile: 'Films Express 4K',
    brandSubtitleDesktop: 'Films 4K de Vie & Grands Moments',
    topBarBadge: 'Vitrine de Référence en Marque Blanche',
    topBarSubtext: '· Cinéma Express 4K uniquement · Propulsée par SceneFlow Studio',
    topBarCtaMobile: 'Lancer votre studio',
    topBarCtaDesktop: 'Lancer votre propre studio de marque sur SceneFlow',
    nav: {
      occasions: 'Occasions',
      howItWorks: 'Comment ça marche',
      expressQuality: 'Qualité Express 4K',
      faq: 'FAQ',
      ctaMobile: 'Blueprint $29',
      ctaDesktop: 'Démarrer le Blueprint $29',
    },
    hero: {
      eyebrow: 'Longs Métrages 1 h+ & Séries Multi-Épisodes · Reconstitutions d’Époque · Zéro AI Slop',
      titlePrefix: 'Transformez les grands chapitres de la vie en un ',
      titleAccent: 'Film ou Série 4K d’1 h+',
      titleSuffix: ' — livré aujourd’hui.',
      subtitleLead: 'Des ',
      subtitleHighlight1: 'récits de famille & reconstitutions historiques',
      subtitleMid: ' aux ',
      subtitleHighlight2: 'biographies en épisodes, mariages et départs à la retraite',
      subtitleEnd:
        '—recréez les chapitres jamais filmés de votre vie avec des visages, lieux, cultures et contextes historiques authentiques dans un long métrage de 30–150 minutes ou une série multi-épisodes captivante (jusqu’à 60 min / 360 plans dirigés inclus à $149), plus une bande-annonce cinéma de 1–3 min, clonage vocal et bande originale.',
      metric1Sub: 'Pass Blueprint (100 % déduit)',
      metric2Sub: 'Film ou Série 4K jusqu’à 60 min + Bande-annonce',
      metric3Val: '2–4 h',
      metric3Sub: '4K le jour même après validation photo',
      primaryCta: 'Démarrer mon Storyboard Blueprint à $29',
      secondaryCta: 'Parcourir toutes les occasions',
      trustWhop: '100 % de vos $29 déduits de votre film 4K',
      trustPrivacy: 'Photos 100 % privées — jamais utilisées pour entraîner l’IA',
      trustLanguages: '14 portails UI natifs · Masters 4K localisés culturellement en 70+ langues',
    },
    theater: {
      eyebrow: 'Démo Cinéma Express 4K',
      watchSamplePrefix: 'Voir l’extrait',
      sameDayTagSuffix: '4K le jour même',
      formatToggle: {
        express4kLabel: 'Cinéma 4K',
        express4kSub: 'Commander aujourd’hui',
        fullMotionLabel: 'Full Motion',
        fullMotionSub: 'Aperçu Studio',
        fullMotionEyebrow: 'Aperçu Cinéma Full Motion',
        fullMotionTagSuffix: 'Gamme Studio Partenaire (Démo)',
        express4kNote:
          'Plans 4K photoréalistes avec mouvements Ken Burns, voix de studio et musique — disponible en commande immédiate ci-dessous.',
        fullMotionNote:
          'Mouvement IA live-action et dialogues synchronisés — comparez les deux formats ici ; les films Full Motion sont produits via nos Studios Partenaires SceneFlow.',
        cardExpressBadge: '4K · Jour même',
        cardFullMotionBadge: 'Full Motion · Démo',
        watchExpressPrefix: 'Lire Cinéma 4K',
        watchFullMotionPrefix: 'Lire Full Motion',
        heroSwitchPrefix: 'Comparer les formats :',
        heroOrFullMotion: 'ou Cinéma Full Motion',
      },
      tabs: [
        {
          id: 'family_legacy',
          label: 'Harbor Books · Vie & Étapes',
          caption:
            'Harbor Books : Cinquante ans sur Pike Street — Héritage familial, mariages, diplômes & retraites',
          priceUsd: 149,
          videoSlug: 'memoir',
        },
        {
          id: 'real_estate_express',
          label: 'Immobilier 4K',
          caption: 'Vos photos immobilières transformées en film 4K narré',
          priceUsd: 149,
          videoSlug: 'realestate',
        },
        {
          id: 'brand_express',
          label: 'Fondateur & Clinique',
          caption: 'Films d’origine rassurants pour page d’accueil, sans équipe de tournage',
          priceUsd: 199,
          videoSlug: 'brand',
        },
        {
          id: 'training_express',
          label: 'Formation & SOP',
          caption: 'Modules narrés à formateur constant, simples à mettre à jour',
          priceUsd: 249,
          videoSlug: 'training',
        },
      ],
    },
    occasions: {
      eyebrow: 'Collections Express 4K sélectionnées',
      heading: 'Chaque étape mérite le grand écran.',
      subtitle:
        'Les vidéos de 2 minutes ci-dessous sont de courts aperçus : votre forfait à $149 vous offre un véritable long métrage 4K d’1 h+ OU une série multi-épisodes captivante (jusqu’à 60 min / 360 plans dirigés ; extensible à 150 min) recréant les chapitres jamais filmés avec des personnes, lieux, cultures et décors historiques fidèles à chaque époque, plus une bande-annonce de 1–3 min. Démarrez avec un Pass Blueprint à $29 (100 % déduit).',
      tabAll: 'Tous les exemples (4)',
      tabMilestones: 'Vie & Étapes (1)',
      tabCommercial: 'Business & Immobilier (3)',
      groupMilestonesHeading: 'Histoires de vie & Films souvenirs',
      groupCommercialHeading: 'Exemples Immobilier, Histoire de Marque & Formation',
      groupCommercialSub:
        'Explorez les aperçus Cinéma 4K (commande aujourd’hui) et Full Motion pour vos annonces immobilières, films de fondateurs et formations SOP.',
      idealForLabel: 'Idéal pour :',
      cardCta: 'Démarrer le Blueprint $29',
      offers: {
        family_legacy: {
          badge: 'Le plus populaire · Film ou Série 1 h+',
          title: 'Histoires de vie & Mémoires familiales, Mariages, Diplômes et plus',
          subtitle:
            'Allez en profondeur : racontez un long métrage inoubliable d’1 h+ (30–150 min) ou une série biographique multi-épisodes recréant les chapitres jamais filmés avec des personnes, lieux, cultures et contextes historiques authentiques. Votre forfait $149 inclut jusqu’à 60 min (360 plans 4K dirigés) plus une bande-annonce cinéma partageable de 1–3 min.',
          idealFor:
            '70e/80e anniversaires, mémoires familiales, séries de vie multi-épisodes, mariages & noces d’or, diplômes, retraites & hommages',
          runtimeLabel: 'Long métrage OU Série Multi-Épisodes jusqu’à 60 min · + Bande-annonce 1–3 min',
          turnaroundLabel: 'Le jour même (2–4 h après validation photo)',
          deliverables: [
            'Long métrage 4K OU Série Multi-Épisodes jusqu’à 60 min (360 plans dirigés ; extensible à 150 min)',
            'Bande-annonce cinéma 1–3 min incluse à partager avec famille et invités',
            'Reconstitutions d’époque : rajeunissement à 28 ans, ressemblances familiales, lieux d’époque & objets de famille',
            'Inclut le contexte culturel et économique automatique par région et décennie + scènes de réunions familiales et traditions en 70+ langues',
          ],
          titlePlaceholder: 'ex. Les 80 ans de Grand-père Mateo',
        },
        wedding_love: {
          badge: 'Mariages & Anniversaires',
          title: 'Histoires d’amour, Mariages & Renouvellements de vœux',
          subtitle:
            'Transformez votre rencontre, vos voyages, la demande et les vœux de vos proches en un film 4K (jusqu’à 60 min / 360 plans) plus une bande-annonce de 1–3 min pour le dîner.',
          idealFor: 'Dîners de répétition, réceptions, noces d’argent et d’or, fiançailles',
          runtimeLabel: 'Jusqu’à 60 min (360 plans) · + Bande-annonce 1–3 min',
          turnaroundLabel: 'Le jour même (2–4 h après validation photo)',
          deliverables: [
            'Blueprint scénarisé + lien de commentaires pour la famille et les témoins',
            'Importez vos photos de couple et de demande directement depuis votre mobile',
            'Narration chaleureuse, ambiances sonores et musique cinématographique',
            'Long métrage MP4 4K téléchargeable + bande-annonce 1–3 min',
          ],
          titlePlaceholder: 'ex. Claire & Daniel — De Lisbonne pour toujours',
        },
        graduation_milestone: {
          badge: 'Diplômes & Passages de vie',
          title: 'Films hommage de Diplôme & Jeunesse',
          subtitle:
            'Célébrez le baccalauréat, la licence ou le master avec un film 4K chapitre par chapitre (jusqu’à 60 min / 360 plans) et une bande-annonce festive de 1–3 min.',
          idealFor: 'Remises de diplômes, galas, fêtes étudiantes et départs à l’étranger',
          runtimeLabel: 'Jusqu’à 60 min (360 plans) · + Bande-annonce 1–3 min',
          turnaroundLabel: 'Le jour même (prêt pour la fête du week-end)',
          deliverables: [
            'Entretien guidé rapide de 5 min avec repères de souvenirs',
            'Recueillez les mots des parents, coachs et proches via un lien invité',
            'Import mobile de vos photos + guide de prononciation des noms/écoles',
            'MP4 4K ultra-net + bande-annonce de fête 1–3 min facile à partager',
          ],
          titlePlaceholder: 'ex. Le parcours de Maya — Promotion 2026',
        },
        retirement_tribute: {
          badge: 'Retraites & Carrières',
          title: 'Films hommage de Retraite & Parcours',
          subtitle:
            'Saluez 20 à 40 ans de leadership, de mentorat et de moments d’équipe dans un film hommage 4K complet (jusqu’à 60 min / 360 plans) avec bande-annonce de 1–3 min.',
          idealFor: 'Pots de départ, adieux de dirigeants, hommages de service & fondateurs',
          runtimeLabel: 'Jusqu’à 60 min (360 plans) · + Bande-annonce 1–3 min',
          turnaroundLabel: 'Le jour même (2–4 h après validation photo)',
          deliverables: [
            'Lien invité pour permettre aux collègues d’ajouter leurs anecdotes facilement',
            'Importez photos de carrière, d’équipe et grands succès professionnels',
            'Voix de studio + guide de prononciation de 10 s pour noms et sociétés',
            'Long métrage MP4 4K + bande-annonce 1–3 min prête pour la salle',
          ],
          titlePlaceholder: 'ex. 35 ans d’engagement — Capitaine Robert Hayes',
        },
        real_estate_express: {
          badge: 'Immobilier · Immersion 4K',
          title: 'Film Express 4K de Propriété',
          subtitle:
            'Bien au-delà d’un diaporama de 60 secondes : faites découvrir chaque pièce, finitions, équipements haut de gamme, extérieurs, écoles et quartier — jusqu’à 60 min (360 plans 4K) + bande-annonce 1–3 min.',
          idealFor: 'Propriétés de prestige, résidences, acquéreurs à distance, hôtels boutique',
          runtimeLabel: 'Jusqu’à 60 min (360 plans) · Visite complète + Bande-annonce 1–3 min',
          turnaroundLabel: 'Le jour même (2–3 h)',
          deliverables: [
            'Visite immersive 4K du bien et du quartier (jusqu’à 60 min / 360 plans)',
            'Bande-annonce 1–3 min incluse pour portails immobiliers et réseaux sociaux',
            'Mise en valeur pièce par pièce, prestations, écoles et art de vivre',
            'Inclut le home staging virtuel du mobilier, la mise en scène de la vie de quartier et une narration acheteur localisée en 70+ langues',
          ],
          titlePlaceholder: 'ex. Villa Harbor Crest 420 — Vue Océan',
        },
        brand_express: {
          badge: 'Marques & Cliniques · Long Format 4K',
          title: 'Film Express 4K Fondateur & Clinique',
          subtitle:
            'Racontez le documentaire complet de votre clinique, cabinet ou marque — genèse, transformations clients, visite des lieux et philosophie — jusqu’à 60 min (360 plans) + bande-annonce homepage 1–3 min.',
          idealFor: 'Cliniques médicales/dentaires, cabinets d’avocats, artisans, PME & associations',
          runtimeLabel: 'Jusqu’à 60 min (360 plans) · Doc de marque + Bande-annonce 1–3 min',
          turnaroundLabel: 'Le jour même (2–4 h)',
          deliverables: [
            'Documentaire 4K fondateur & marque (jusqu’à 60 min / 360 plans)',
            'Bande-annonce page d’accueil & réseaux de 1–3 min pour convertir vite',
            'Verrouillage visuel du fondateur, des locaux, des produits & prononciations',
            'Inclut le contexte historique local de l’époque fondatrice et la mise en scène active de soins aux patients/clients',
          ],
          titlePlaceholder: 'ex. Clinique Dentaire Côte Pacifique — Notre Histoire',
        },
        training_express: {
          badge: 'Formation & SOP · Cours Complet 4K',
          title: 'Film Express 4K de Formation & Procédures SOP',
          subtitle:
            'Transformez manuels de 50 pages, livrets d’accueil ou protocoles sécurité en cours vidéo 4K multi-modules (jusqu’à 60 min / 360 plans ; extensible à 150 min) avec formateur verrouillé & aperçu 1–3 min.',
          idealFor: 'Intégration RH, sécurité au travail, protocoles cliniques, franchises & certifications',
          runtimeLabel: 'Jusqu’à 60 min (360 plans) · Cours complet + Aperçu 1–3 min',
          turnaroundLabel: 'Le jour même (2–4 h)',
          deliverables: [
            'Cours de formation 4K multi-modules (jusqu’à 60 min / 360 plans ; extensible)',
            'Bande-annonce de synthèse 1–3 min incluse pour direction et recrues',
            'Continuité verrouillée du formateur, des tenues, lieux et équipements',
            'Inclut des scénarios localisés de sécurité au travail et d’équipements adaptés aux normes régionales et à 70+ langues d’équipes',
          ],
          titlePlaceholder: 'ex. Sécurité & Prise de Poste des Nouveaux Collaborateurs',
        },
      },
    },
    steps: {
      eyebrow: 'Expérience fluide sans inscription',
      heading: 'De vos souvenirs racontés à un film 4K en 3 étapes simples',
      subtitle: 'Aucun compte à créer, aucun logiciel complexe et aucune semaine d’allers-retours par e-mail.',
      items: [
        {
          tag: 'Étape 01 · $29 aujourd’hui',
          title: 'Entretien guidé de 5 min & Blueprint vivant',
          body: 'Touchez des repères de souvenirs et racontez votre histoire dans l’une des 70+ langues de production (avec un portail natif en 14 langues). En ~3 minutes, recevez votre Blueprint illustré et narré + lien de commentaires familial et 4 tours de révision IA.',
          highlight: '100 % de vos $29 sont déduits de votre film 4K final →',
        },
        {
          tag: 'Étape 02 · Solde $120',
          title: 'Photos mobile, prononciation & verrou de continuité',
          body: 'Approuvez votre Blueprint et réglez le solde via Whop pour ouvrir votre bibliothèque de continuité privée. Importez vos photos depuis votre téléphone (GPS supprimé), ajoutez un guide de prononciation de 10 s et verrouillez chaque visage et décor.',
          highlight: 'Chaque nom de famille et portrait vérifiés avant le rendu →',
        },
        {
          tag: 'Étape 03 · 4K le jour même',
          title: 'Salle de projection privée & Master 4K automatique',
          body: 'Visionnez votre film Cinéma Express 4K narré et musicalisé sur mobile ou TV via un lien sans connexion. Dès que vous cliquez sur Approuver, notre moteur cloud génère votre master MP4 4K et vous envoie le lien de téléchargement.',
          highlight: 'Prêt pour vidéoprojecteurs, TV connectées & partage familial →',
        },
      ],
    },
    clarity: {
      badge: 'Pourquoi le Cinéma Express 4K fonctionne si bien',
      heading: 'La force du documentaire Ken Burns alliée à la narration 4K moderne',
      body: 'Imaginez l’émotion d’un grand documentaire enrichie de scènes 4K photoréalistes sur mesure, de visages fidèles à travers les époques, d’une narration de studio vivante, d’ambiances sonores et d’une musique originale. En nous consacrant exclusivement au Cinéma Express 4K ici, nous livrons une qualité musée pour $149–$249 le jour même au lieu de $2,500+ et trois semaines d’attente.',
      bullets: [
        'Plans 4K photoréalistes + mouvements de caméra fluides',
        'Vos vraies photos intégrées avec naturel',
        'Narration studio, effets sonores & musique originale',
        '100 % droits de partage personnel et commercial',
      ],
      partnerHeading: 'Envie de vidéo IA Full Motion plus tard ?',
      partnerBody1:
        'Cette vitrine Express propose volontairement le Cinéma Express 4K uniquement — garantissant qualité constante et livraison le jour même.',
      partnerBody2:
        'Vous souhaitez animer vos chapitres favoris en vidéo IA Full Motion ou intégrer des interviews filmées ? Votre coffre de continuité verrouillé se transfère sans reprise à un Studio Partenaire certifié SceneFlow à tout moment.',
      partnerPrimaryCta: 'Commander le Blueprint Express 4K ($29)',
      partnerSecondaryCta: 'Pour les agences vidéo →',
    },
    faq: {
      eyebrow: 'Questions & Réponses',
      heading: 'Tout ce qu’il faut savoir',
      items: [
        {
          q: 'Qu’est-ce qu’un Film Cinéma Express 4K exactement ?',
          a: 'Un Film Cinéma Express 4K est un film documentaire 4K photoréaliste mêlant vos vraies photos et des scènes 4K sur mesure à continuité verrouillée, avec mouvements Ken Burns fluides, narration et voix de studio, effets d’ambiance et bande originale. Livré le jour même pour une fraction du coût d’un tournage classique.',
        },
        {
          q: 'Comment fonctionne le Pass Storyboard Blueprint à $29 ?',
          a: 'Vous débutez par un Pass Storyboard Blueprint à $29 via Whop Checkout. Aussitôt après le règlement, vous accédez à notre entretien guidé voix ou texte de 5 minutes. En ~3 minutes vous recevez un Storyboard Blueprint illustré et narré avec 4 révisions IA et un lien commentaires pour vos proches. La totalité des $29 est déduite de votre Film Express 4K (un film à $149 ne laisse donc qu’un solde de $120).',
        },
        {
          q: 'Frères, sœurs, conjoints ou collègues peuvent-ils contribuer avant validation ?',
          a: 'Oui ! Votre portail inclut un lien Invité (commentaires uniquement). Proches, témoins ou collègues peuvent écouter dans plus de 70 langues de film (avec un portail natif en 14 langues) et ajouter leurs souvenirs sans consommer vos tours de révision.',
        },
        {
          q: 'Comment fonctionnent ensemble les 14 portails UI natifs et les 70+ langues de film localisées culturellement ?',
          a: 'Opérez dans 14 portails natifs. Produisez des films culturellement authentiques dans plus de 70 langues. Révisez et gérez vos projets dans 14 langues de portail majeures (anglais, espagnol, portugais, hindi, chinois, arabe, thaï, japonais, coréen, allemand, français, italien, néerlandais et russe)—tandis que le moteur narratif et visuel de SceneFlow produit des masters 4K localisés culturellement en 70+ langues, avec contexte historique fidèle à la région, mise en scène architecturale et intérieure locale, et verrous de prononciation native.',
        },
        {
          q: 'Et pour les noms de famille, villes ou marques difficiles à prononcer ?',
          a: 'Votre bibliothèque de continuité comprend un guide phonétique de 10 secondes (écrit ou parlé). Vous validez en outre l’intégralité du montage sonorisé dans votre salle de projection privée avant le rendu 4K final.',
        },
        {
          q: 'Mes photos familiales ou fichiers pros servent-ils à entraîner des modèles IA ?',
          a: 'Jamais. Les données GPS EXIF sont retirées automatiquement dès l’envoi ; vos fichiers restent strictement privés dans votre projet et ne sont jamais utilisés pour entraîner des modèles IA partagés.',
        },
        {
          q: 'Et si je souhaite ensuite des scènes Full Motion ou des interviews filmées ?',
          a: 'Cette vitrine se consacre exclusivement au Cinéma Express 4K pour préserver rapidité et tarif accessible. Comme vos personnages, voix et scénario sont déjà verrouillés dans SceneFlow Studio, vous pouvez faire évoluer certains chapitres en Full Motion via un Studio Partenaire certifié sans rien refaire.',
        },
      ],
    },
    footer: {
      referenceTag: '· Vitrine de référence en direct',
      body: 'Cette vitrine tourne à 100 % sur le portail client en marque blanche SceneFlow Studio avec paiement Whop Merchant of Record. Les studios peuvent lancer leur propre vitrine sous leur domaine et conserver 100 % de leur facturation client.',
      primaryCta: 'Démarrer le Pass Blueprint $29',
      secondaryCta: 'Exploiter sous votre propre marque →',
    },
    modal: {
      stepBadge: 'Étape 1 · Pass Blueprint',
      linePass: 'Pass Storyboard Blueprint',
      lineBalance: 'Solde Express 4K ultérieur (uniquement si approuvé)',
      lineTotal: 'Total Film Express 4K',
      whopNotice: 'Paiement sécurisé par Whop (Merchant of Record)',
      currencyNote: 'Estimation affichée en EUR ; Whop MoR encaisse en USD ($29 aujourd’hui).',
      instantLinkNote: 'Lien magique instantané vers votre entretien guidé de 5 min juste après le paiement.',
      fieldOccasion: 'Occasion / Style de film',
      fieldTitle: 'Qui ou quel moment ce film célèbre-t-il ? (facultatif)',
      fieldName: 'Votre nom *',
      fieldNamePlaceholder: 'Camille Laurent',
      fieldLanguage: 'Langue de l’interface du portail',
      fieldLanguageHint: 'Les films et la narration peuvent être produits en 70+ langues (français, anglais, italien, allemand, japonais, coréen, etc.) pendant votre entretien.',
      whopRefBadge: 'Paiements traités par Whop',
      fieldEmail: 'E-mail pour recevoir vos liens privés *',
      fieldEmailPlaceholder: 'vous@exemple.fr',
      submitIdlePrefix: 'Continuer vers le paiement sécurisé —',
      submitBusy: 'Ouverture du paiement sécurisé...',
      errorFallback: 'Impossible de lancer Whop Checkout. Veuillez réessayer.',
      errorNetwork: 'Erreur réseau lors du lancement de Whop Checkout. Veuillez réessayer.',
      totalOptionSuffix: 'au total',
      todayOptionSuffix: 'aujourd’hui',
    },
    orderPage: {
      whopBadgeShort: 'Whop MoR',
      whopBadgeFull: 'Whop Merchant of Record',
      loading: 'Confirmation de votre paiement Whop...',
      notFound: 'Commande introuvable',
      returnCta: 'Retour à Keepsake Cinema',
      confirmedTag: 'Paiement confirmé · Prêt maintenant',
      unlockedTitle: 'Votre Film Express 4K est débloqué !',
      welcomePrefix: 'Bienvenue,',
      unlockedBody:
        'Merci d’avoir réglé le solde Express 4K. Votre bibliothèque photo de continuité est prête : importez vos vraies photos depuis votre téléphone et ajoutez un guide de prononciation de 10 s pour lancer la production de votre film 4K aujourd’hui.',
      passBody:
        'Votre Pass Storyboard Blueprint est actif et déduit à 100 % de votre Film Express 4K. Démarrez votre entretien guidé dès maintenant ou ouvrez le lien magique envoyé par e-mail.',
      emailCopiedNotice:
        'Une copie privée de ce lien magique vient également d’être envoyée à votre adresse e-mail pour reprendre sur mobile ou ordinateur.',
      ctaContinuity: 'Ouvrir ma bibliothèque photo de continuité',
      ctaIntake: 'Démarrer mon entretien guidé de 5 min',
      finalizingTitle: 'Préparation de votre portail studio...',
      pendingTitle: 'Paiement en attente',
      finalizingBody:
        'Nous confirmons votre règlement Whop et activons votre lien studio privé. Cela ne prend généralement que quelques secondes.',
      pendingBody: 'Finalisez votre paiement Whop pour débloquer instantanément votre portail studio privé.',
      refreshBtn: 'Actualiser le statut',
      resumeCheckoutPrefix: 'Reprendre le paiement Whop',
    },
  },

  it: {
    shortCode: 'IT',
    nativeLabel: 'Italiano',
    brandSubtitleMobile: 'Film Express 4K',
    brandSubtitleDesktop: 'Film 4K di Vita e Grandi Traguardi',
    topBarBadge: 'Vetrina di Riferimento White-Label Live',
    topBarSubtext: '· Solo Cinema Express 4K · Powered by SceneFlow Studio',
    topBarCtaMobile: 'Lancia il tuo studio',
    topBarCtaDesktop: 'Lancia il tuo studio brandizzato su SceneFlow',
    nav: {
      occasions: 'Occasioni',
      howItWorks: 'Come funziona',
      expressQuality: 'Qualità Express 4K',
      faq: 'FAQ',
      ctaMobile: 'Blueprint $29',
      ctaDesktop: 'Avvia Blueprint $29',
    },
    hero: {
      eyebrow: 'Lungometraggi 1+ Ora & Serie Multi-Episodio · Ricostruzioni d’Epoca · Zero AI Slop',
      titlePrefix: 'Trasforma i capitoli più belli della vita in un ',
      titleAccent: 'Film o Serie 4K di 1+ Ora',
      titleSuffix: ' — consegnato oggi.',
      subtitleLead: 'Da ',
      subtitleHighlight1: 'storie di famiglia e ricostruzioni storiche',
      subtitleMid: ' a ',
      subtitleHighlight2: 'biografie multi-episodio, matrimoni e pensionamenti',
      subtitleEnd:
        '—ricrea capitoli di vita mai filmati con persone, luoghi, cultura e contesto storico autentici in un lungometraggio da 30–150 minuti o una serie multi-episodio avvincente (fino a 60 min / 360 frame diretti inclusi a $149), più un trailer cinematografico da 1–3 min, clonazione vocale e colonna sonora.',
      metric1Sub: 'Blueprint Pass (100% scalato)',
      metric2Sub: 'Film o Serie 4K fino a 60 min + Trailer',
      metric3Val: '2–4 ore',
      metric3Sub: '4K in giornata dopo conferma foto',
      primaryCta: 'Avvia il mio Storyboard Blueprint da $29',
      secondaryCta: 'Esplora tutte le occasioni',
      trustWhop: '100% dei $29 scalati dal tuo film 4K',
      trustPrivacy: 'Foto 100% private — mai usate per addestrare l’IA',
      trustLanguages: '14 portali UI nativi · Master 4K localizzati culturalmente in 70+ lingue',
    },
    theater: {
      eyebrow: 'Reel Cinema Express 4K',
      watchSamplePrefix: 'Guarda esempio',
      sameDayTagSuffix: '4K in giornata',
      formatToggle: {
        express4kLabel: 'Cinema 4K',
        express4kSub: 'Ordina oggi',
        fullMotionLabel: 'Full Motion',
        fullMotionSub: 'Anteprima Studio',
        fullMotionEyebrow: 'Anteprima Cinema Full-Motion',
        fullMotionTagSuffix: 'Livello Studio Partner (Solo Demo)',
        express4kNote:
          'Fotogrammi 4K fotorealistici con movimenti Ken Burns, voci da studio e colonna sonora — ordinabile oggi stesso qui sotto.',
        fullMotionNote:
          'Movimento IA live-action e dialoghi sincronizzati — confronta qui entrambi i formati; i film Full-Motion sono prodotti tramite Studio Partner SceneFlow.',
        cardExpressBadge: '4K · Oggi',
        cardFullMotionBadge: 'Full Motion · Demo',
        watchExpressPrefix: 'Guarda Cinema 4K',
        watchFullMotionPrefix: 'Guarda Full Motion',
        heroSwitchPrefix: 'Confronta i formati:',
        heroOrFullMotion: 'o Cinema Full-Motion',
      },
      tabs: [
        {
          id: 'family_legacy',
          label: 'Harbor Books · Vita & Traguardi',
          caption:
            'Harbor Books: Cinquant’anni su Pike Street — Storia di famiglia, matrimoni, lauree e pensionamenti',
          priceUsd: 149,
          videoSlug: 'memoir',
        },
        {
          id: 'real_estate_express',
          label: 'Immobiliare 4K',
          caption: 'Foto dell’immobile trasformate in cinema 4K narrato',
          priceUsd: 149,
          videoSlug: 'realestate',
        },
        {
          id: 'brand_express',
          label: 'Fondatore & Clinica',
          caption: 'Film di presentazione ad alta fiducia per la homepage, senza troupe',
          priceUsd: 199,
          videoSlug: 'brand',
        },
        {
          id: 'training_express',
          label: 'Formazione & SOP',
          caption: 'Moduli narrati con formatore coerente, facili da aggiornare',
          priceUsd: 249,
          videoSlug: 'training',
        },
      ],
    },
    occasions: {
      eyebrow: 'Collezioni Express 4K selezionate',
      heading: 'Ogni traguardo merita il grande schermo.',
      subtitle:
        'I video da 2 minuti qui sotto sono brevi anteprime: il pacchetto da $149 include un vero lungometraggio 4K di 1+ ora OPPURE una serie multi-episodio avvincente (fino a 60 min / 360 frame diretti; espandibile a 150 min) che ricrea capitoli mai filmati con persone, luoghi, cultura e storia fedeli all’epoca, più un trailer da 1–3 min. Inizia con un Blueprint Pass da $29 (100% scalato).',
      tabAll: 'Tutti gli esempi (4)',
      tabMilestones: 'Vita & Traguardi (1)',
      tabCommercial: 'Business & Immobiliare (3)',
      groupMilestonesHeading: 'Storie di vita e Film commemorativi',
      groupCommercialHeading: 'Esempi Immobiliare, Brand Story e Formazione',
      groupCommercialSub:
        'Esplora anteprime Cinema 4K (ordine in giornata) e Full-Motion per annunci immobiliari, storie di fondatori e corsi SOP narrati.',
      idealForLabel: 'Ideale per:',
      cardCta: 'Avvia Blueprint $29',
      offers: {
        family_legacy: {
          badge: 'Più richiesto · Film o Serie 1+ Ora',
          title: 'Storie di vita e Memorie di famiglia, Matrimoni, Lauree e altro',
          subtitle:
            'Vai in profondità: racconta un indimenticabile lungometraggio di 1+ ora (30–150 min) o una serie biografica multi-episodio ricreando capitoli mai filmati con persone, luoghi, cultura e contesto storico autentici. Il pacchetto $149 include fino a 60 min (360 frame 4K diretti) più un trailer cinematografico condivisibile da 1–3 min.',
          idealFor:
            '70°/80° compleanno, memorie familiari, serie biografiche multi-episodio, matrimoni e anniversari, lauree, pensionamenti e commemorazioni',
          runtimeLabel: 'Lungometraggio O Serie Multi-Episodio fino a 60 min · + Trailer 1–3 min',
          turnaroundLabel: 'In giornata (2–4 ore dopo conferma foto)',
          deliverables: [
            'Lungometraggio 4K O Serie Multi-Episodio fino a 60 min (360 frame diretti; estendibile a 150 min)',
            'Trailer cinematografico condivisibile 1–3 min incluso per inviti e famiglia',
            'Ricostruzioni d’epoca: ringiovanimento a 28 anni, somiglianze familiari, luoghi storici e cimeli',
            'Include contesto culturale/economico automatico per regione e decennio + scene di riunioni familiari e tradizioni in 70+ lingue',
          ],
          titlePlaceholder: 'es. La storia degli 80 anni di Nonno Mateo',
        },
        wedding_love: {
          badge: 'Matrimoni & Anniversari',
          title: 'Storie d’amore, Matrimoni e Rinnovi delle promesse',
          subtitle:
            'Trasforma il primo incontro, i viaggi del cuore, la proposta e gli auguri di famiglia in un film 4K (fino a 60 min / 360 frame) più trailer da 1–3 min per la cena.',
          idealFor: 'Cene pre-nozze, ricevimenti, nozze d’argento e d’oro, fidanzamenti',
          runtimeLabel: 'Fino a 60 min (360 frame) · + Trailer 1–3 min',
          turnaroundLabel: 'In giornata (2–4 ore dopo conferma foto)',
          deliverables: [
            'Story Blueprint + link per commenti di familiari e testimoni',
            'Carica le foto di coppia e della proposta direttamente dallo smartphone',
            'Narrazione calorosa, ambienti sonori e colonna sonora cinematografica',
            'Lungometraggio MP4 4K scaricabile + trailer 1–3 min',
          ],
          titlePlaceholder: 'es. Chiara & Daniele — Da Lisbona per sempre',
        },
        graduation_milestone: {
          badge: 'Lauree & Crescita',
          title: 'Tributi di Laurea e Traguardi giovanili',
          subtitle:
            'Festeggia maturità, laurea triennale o magistrale con un film tributo 4K capitolo per capitolo (fino a 60 min / 360 frame) più trailer 1–3 min per la festa.',
          idealFor: 'Lauree, diplomi, feste di classe, borse di studio e partenze',
          runtimeLabel: 'Fino a 60 min (360 frame) · + Trailer 1–3 min',
          turnaroundLabel: 'In giornata (pronto per la festa del weekend)',
          deliverables: [
            'Intervista guidata di 5 min con spunti rapidi sui ricordi chiave',
            'Raccogli dediche di genitori, insegnanti e fratelli con un link ospiti',
            'Upload foto da smartphone + guida pronuncia nomi e scuole',
            'MP4 4K cristallino + trailer 1–3 min condivisibile per la festa',
          ],
          titlePlaceholder: 'es. Il percorso di Maya — Laurea 2026',
        },
        retirement_tribute: {
          badge: 'Pensionamento & Carriera',
          title: 'Film tributo per Pensionamento e Carriera',
          subtitle:
            'Celebra 20–40 anni di guida, mentoring e ricordi sul lavoro con un film 4K ricco e curato (fino a 60 min / 360 frame) più trailer 1–3 min per la cena aziendale.',
          idealFor: 'Cene di pensionamento, saluti a dirigenti, tributi a fondatori e servizio',
          runtimeLabel: 'Fino a 60 min (360 frame) · + Trailer 1–3 min',
          turnaroundLabel: 'In giornata (2–4 ore dopo conferma foto)',
          deliverables: [
            'Link ospiti affinché i colleghi aggiungano facilmente aneddoti',
            'Carica foto di carriera, scatti di squadra e traguardi aziendali',
            'Narrazione da studio + guida pronuncia di 10 s per nomi e aziende',
            'Lungometraggio MP4 4K + trailer 1–3 min pronto per maxischermi',
          ],
          titlePlaceholder: 'es. 35 anni di leadership — Capitano Roberto Conti',
        },
        real_estate_express: {
          badge: 'Immobiliare · Deep-Dive 4K',
          title: 'Film Express 4K per Annunci Immobiliari',
          subtitle:
            'Molto più di uno slideshow di 60 secondi: accompagna gli acquirenti stanza per stanza tra finiture, elettrodomestici di pregio, esterni, scuole e quartiere — fino a 60 min (360 frame 4K) + trailer 1–3 min.',
          idealFor: 'Residenze di lusso, immobili residenziali, acquirenti a distanza, boutique hotel',
          runtimeLabel: 'Fino a 60 min (360 frame) · Tour completo + Trailer 1–3 min',
          turnaroundLabel: 'In giornata (2–3 ore)',
          deliverables: [
            'Film 4K approfondito dell’immobile e del quartiere (fino a 60 min / 360 frame)',
            'Trailer 1–3 min incluso per portali immobiliari e social',
            'Racconto stanza per stanza di ristrutturazioni, dotazioni, scuole e stile di vita',
            'Include restyling virtuale degli arredi, staging attivo dello stile di vita di quartiere e narrazione localizzata per acquirenti in 70+ lingue',
          ],
          titlePlaceholder: 'es. Residenza Harbor Crest 420 Vista Mare',
        },
        brand_express: {
          badge: 'Brand Story & Cliniche · Longform 4K',
          title: 'Film Express 4K per Fondatori e Cliniche',
          subtitle:
            'Racconta il documentario completo della tua clinica, studio o brand — storia del fondatore, risultati dei clienti, visita degli ambienti e filosofia — fino a 60 min (360 frame) + trailer homepage 1–3 min.',
          idealFor: 'Cliniche mediche/dentistiche, studi legali, artigiani, PMI e associazioni',
          runtimeLabel: 'Fino a 60 min (360 frame) · Brand Doc + Trailer 1–3 min',
          turnaroundLabel: 'In giornata (2–4 ore)',
          deliverables: [
            'Documentario 4K fondatore e brand (fino a 60 min / 360 frame)',
            'Trailer homepage e social 1–3 min incluso per convertire i visitatori',
            'Blocco visivo di fondatore, sede, prodotti chiave e pronunce',
            'Include contesto storico locale dell’epoca di fondazione e messa in scena attiva dell’assistenza a pazienti/clienti',
          ],
          titlePlaceholder: 'es. Studio Dentistico Costa Pacifica — La Nostra Storia',
        },
        training_express: {
          badge: 'Formazione & SOP · Corso Completo 4K',
          title: 'Film Express 4K di Formazione e Procedure SOP',
          subtitle:
            'Trasforma manuali da 50 pagine, guide onboarding o protocolli di sicurezza in un corso 4K multi-modulo coinvolgente (fino a 60 min / 360 frame; estendibile a 150 min) con formatore fisso e panoramica 1–3 min.',
          idealFor: 'Onboarding dipendenti, sicurezza sul lavoro, SOP cliniche, franchising e corsi',
          runtimeLabel: 'Fino a 60 min (360 frame) · Corso completo + Panoramica 1–3 min',
          turnaroundLabel: 'In giornata (2–4 ore)',
          deliverables: [
            'Corso di formazione 4K multi-modulo (fino a 60 min / 360 frame; estendibile)',
            'Trailer panoramico 1–3 min incluso per direzione e neoassunti',
            'Continuità visiva di formatore, divise, ambienti e attrezzature',
            'Include scenari localizzati di sicurezza sul lavoro e attrezzature adattati alle normative regionali e a 70+ lingue del personale',
          ],
          titlePlaceholder: 'es. Sicurezza e Onboarding Attrezzature per Neoassunti',
        },
      },
    },
    steps: {
      eyebrow: 'Esperienza fluida senza registrazione',
      heading: 'Dai tuoi ricordi raccontati a un film 4K in 3 semplici passaggi',
      subtitle: 'Nessun account da creare, nessun software complicato e nessuna settimana di email avanti e indietro.',
      items: [
        {
          tag: 'Fase 01 · $29 oggi',
          title: 'Intervista guidata di 5 min e Blueprint vivo',
          body: 'Tocca gli spunti per l’occasione e racconta la tua storia in una delle 70+ lingue di produzione (con portale nativo in 14 lingue). In ~3 minuti ricevi un Blueprint illustrato e narrato + link commenti famiglia e 4 revisioni IA.',
          highlight: '100% dei tuoi $29 vengono scalati dal film 4K finale →',
        },
        {
          tag: 'Fase 02 · Saldo $120',
          title: 'Foto da smartphone, pronuncia e blocco continuità',
          body: 'Approva il Blueprint e completa il saldo via Whop per aprire la tua Libreria di Continuità privata. Carica le foto dal telefono (dati GPS rimossi), aggiungi la guida pronuncia di 10 s e blocca ogni volto e ambiente.',
          highlight: 'Ogni nome di famiglia e ritratto verificato prima del rendering →',
        },
        {
          tag: 'Fase 03 · 4K in giornata',
          title: 'Sala proiezione privata e Master 4K automatico',
          body: 'Guarda il tuo film Cinema Express 4K narrato e musicato su telefono o TV tramite un link senza login. Appena clicchi Approva, il motore cloud genera il master 4K MP4 e ti invia subito il link di download via email.',
          highlight: 'Pronto per proiettori, smart TV e condivisione in famiglia →',
        },
      ],
    },
    clarity: {
      badge: 'Perché Cinema Express 4K funziona così bene',
      heading: 'La forza del documentario Ken Burns incontra lo storytelling 4K moderno',
      body: 'Unisci l’emozione di un documentario cinematografico a scene 4K fotorealistiche su misura, volti coerenti nel tempo, narrazione da studio, suoni d’ambiente e musica originale. Concentrandoci qui esclusivamente su Cinema Express 4K, consegniamo qualità da museo a $149–$249 in giornata invece di $2,500+ e tre settimane d’attesa.',
      bullets: [
        'Scene 4K fotorealistiche + movimenti di camera fluidi',
        'Le tue foto reali integrate con naturalezza',
        'Narrazione da studio, SFX e colonna sonora originale',
        '100% diritti di condivisione personale e commerciale',
      ],
      partnerHeading: 'Vuoi video IA Full-Motion più avanti?',
      partnerBody1:
        'Questa vetrina Express offre intenzionalmente solo Cinema Express 4K, garantendo qualità costante e consegna in giornata.',
      partnerBody2:
        'Desideri trasformare i capitoli preferiti in video IA Full-Motion o aggiungere interviste girate dal vivo? Il tuo Vault di Continuità bloccato passa senza rilavorazioni a uno Studio Partner certificato SceneFlow in qualsiasi momento.',
      partnerPrimaryCta: 'Ordina Blueprint Express 4K ($29)',
      partnerSecondaryCta: 'Per agenzie video →',
    },
    faq: {
      eyebrow: 'Domande frequenti',
      heading: 'Tutto quello che c’è da sapere',
      items: [
        {
          q: 'Che cos’è esattamente un film Cinema Express 4K?',
          a: 'È un film 4K fotorealistico in stile documentario che unisce le tue foto reali a scene 4K su misura con continuità bloccata, movimenti Ken Burns fluidi, narrazione e voci da studio, effetti ambientali e colonna sonora originale. Consegnato in giornata a una frazione del costo di una troupe.',
        },
        {
          q: 'Come funziona lo Storyboard Blueprint Pass da $29?',
          a: 'Inizi con uno Storyboard Blueprint Pass da $29 su Whop Checkout. Subito dopo il pagamento accedi all’intervista guidata vocale o testuale di 5 minuti. In ~3 minuti ricevi uno Storyboard Blueprint illustrato e narrato con 4 revisioni IA e un link solo-commenti per famiglia o colleghi. L’intero importo di $29 viene scalato dal film Express 4K (per un film da $149 restano solo $120 di saldo).',
        },
        {
          q: 'Fratelli, coniugi o colleghi possono contribuire prima del blocco finale?',
          a: 'Sì! Il portale include un link Ospiti solo-commenti. Parenti, testimoni o colleghi possono ascoltare in oltre 70 lingue del film (con portale nativo in 14 lingue) e aggiungere ricordi senza consumare i tuoi giri di revisione.',
        },
        {
          q: 'Come lavorano insieme i 14 portali UI nativi e le 70+ lingue di film localizzate culturalmente?',
          a: 'Opera in 14 portali nativi. Produci film culturalmente autentici in oltre 70 lingue. Rivedi e gestisci i progetti in 14 lingue di portale ad alto impatto (inglese, spagnolo, portoghese, hindi, cinese, arabo, thailandese, giapponese, coreano, tedesco, francese, italiano, olandese e russo)—mentre il motore narrativo e visivo di SceneFlow realizza master 4K localizzati culturalmente in oltre 70 lingue, completi di contesto storico fedele alla regione, ambientazione architettonica e d’interni locale e blocchi di pronuncia nativa.',
        },
        {
          q: 'Come gestite cognomi, paesi o nomi aziendali particolari?',
          a: 'La Libreria di Continuità include una guida fonetica di 10 secondi (scritta o vocale). Inoltre rivedi l’intero montato doppiato nella tua sala proiezione privata prima che venga renderizzato il master 4K.',
        },
        {
          q: 'Le mie foto di famiglia o i file aziendali vengono mai usati per addestrare IA?',
          a: 'Mai. Le foto caricate vengono ripulite automaticamente dai dati GPS EXIF, restano strettamente private nel tuo progetto e non vengono mai usate per addestrare modelli IA condivisi.',
        },
        {
          q: 'E se in seguito volessi scene Full-Motion IA o riprese dal vivo?',
          a: 'Questa vetrina si dedica solo a Cinema Express 4K per mantenere tempi rapidi e costi chiari. Poiché cast, voci e storia sono salvati in SceneFlow Studio, puoi potenziare singoli capitoli in Full-Motion tramite uno Studio Partner certificato senza ricominciare da capo.',
        },
      ],
    },
    footer: {
      referenceTag: '· Vetrina di riferimento live',
      body: 'Questa vetrina gira al 100% sul portale clienti white-label di SceneFlow Studio con checkout Whop Merchant of Record. Gli operatori video possono lanciare la propria vetrina brandizzata sul proprio dominio e trattenere il 100% degli incassi.',
      primaryCta: 'Avvia Blueprint Pass $29',
      secondaryCta: 'Gestiscilo con il tuo brand →',
    },
    modal: {
      stepBadge: 'Fase 1 · Blueprint Pass',
      linePass: 'Storyboard Blueprint Pass',
      lineBalance: 'Saldo Express 4K successivo (solo se approvato)',
      lineTotal: 'Totale Film Express 4K',
      whopNotice: 'Pagamento sicuro elaborato da Whop (Merchant of Record)',
      currencyNote: 'Importo stimato in EUR; Whop MoR addebita in USD ($29 oggi).',
      instantLinkNote: 'Link magico immediato alla tua intervista guidata di 5 min subito dopo il checkout.',
      fieldOccasion: 'Occasione / Stile del film',
      fieldTitle: 'Chi o cosa celebra questo film? (facoltativo)',
      fieldName: 'Il tuo nome *',
      fieldNamePlaceholder: 'Marco Rossi',
      fieldLanguage: 'Lingua interfaccia portale',
      fieldLanguageHint: 'Film e narrazione possono essere prodotti in oltre 70 lingue (italiano, inglese, francese, tedesco, giapponese, coreano e altre) durante l’intervista.',
      whopRefBadge: 'Pagamenti gestiti da Whop',
      fieldEmail: 'Email per i tuoi link privati dello studio *',
      fieldEmailPlaceholder: 'tu@esempio.it',
      submitIdlePrefix: 'Procedi al checkout sicuro —',
      submitBusy: 'Apertura checkout sicuro...',
      errorFallback: 'Impossibile avviare Whop Checkout. Riprova.',
      errorNetwork: 'Errore di rete nell’avvio di Whop Checkout. Riprova.',
      totalOptionSuffix: 'totale',
      todayOptionSuffix: 'oggi',
    },
    orderPage: {
      whopBadgeShort: 'Whop MoR',
      whopBadgeFull: 'Whop Merchant of Record',
      loading: 'Conferma del checkout Whop in corso...',
      notFound: 'Ordine non trovato',
      returnCta: 'Torna a Keepsake Cinema',
      confirmedTag: 'Pagamento confermato · Pronto ora',
      unlockedTitle: 'Il tuo Film Express 4K è sbloccato!',
      welcomePrefix: 'Benvenuto,',
      unlockedBody:
        'Grazie per aver completato il saldo Express 4K. La tua Libreria Foto di Continuità è attiva: carica le foto reali dal telefono e aggiungi una guida pronuncia di 10 s per avviare la produzione del tuo Film 4K in giornata.',
      passBody:
        'Il tuo Storyboard Blueprint Pass è attivo e scalato al 100% dal tuo Film Express 4K. Avvia ora l’intervista guidata o apri il link magico che ti abbiamo appena inviato via email.',
      emailCopiedNotice:
        'Abbiamo inviato una copia privata di questo link magico anche alla tua email per riprendere da telefono o computer quando vuoi.',
      ctaContinuity: 'Apri la mia Libreria Foto di Continuità',
      ctaIntake: 'Avvia l’intervista guidata di 5 minuti',
      finalizingTitle: 'Configurazione del portale studio...',
      pendingTitle: 'Checkout in attesa',
      finalizingBody:
        'Stiamo confermando il pagamento Whop e preparando il tuo link privato dello studio. Di solito richiede pochi secondi.',
      pendingBody: 'Completa il checkout Whop per sbloccare subito il tuo portale studio privato.',
      refreshBtn: 'Aggiorna stato',
      resumeCheckoutPrefix: 'Riprendi il checkout Whop',
    },
  },

  nl: {
    shortCode: 'NL',
    nativeLabel: 'Nederlands',
    brandSubtitleMobile: 'Express 4K Films',
    brandSubtitleDesktop: 'Express 4K Levens- & Mijlpaalfilms',
    topBarBadge: 'Live White-Label Referentieshop',
    topBarSubtext: '· Alleen Express 4K Cinema · Powered by SceneFlow Studio',
    topBarCtaMobile: 'Start jouw studio',
    topBarCtaDesktop: 'Lanceer jouw eigen merkstudio op SceneFlow',
    nav: {
      occasions: 'Gelegenheden',
      howItWorks: 'Hoe het werkt',
      expressQuality: 'Express 4K Kwaliteit',
      faq: 'Veelgestelde vragen',
      ctaMobile: '$29 Blueprint',
      ctaDesktop: 'Start $29 Blueprint',
    },
    hero: {
      eyebrow: '1+ Uur Speelfilms & Meerdelige Series · Historische Reconstructies · Nul AI Slop',
      titlePrefix: 'Maak van de mooiste hoofdstukken van het leven een ',
      titleAccent: '4K-film of serie van 1+ uur',
      titleSuffix: ' — vandaag geleverd.',
      subtitleLead: 'Van ',
      subtitleHighlight1: 'familiegeschiedenissen & historische reconstructies',
      subtitleMid: ' tot ',
      subtitleHighlight2: 'meerdelige biografieën, bruiloften en pensioenen',
      subtitleEnd:
        '—breng nooit gefilmde levenshoofdstukken tot leven met authentieke mensen, locaties, cultuur en historische context in een speelfilm van 30–150 minuten of een meeslepende meerdelige serie (tot 60 min / 360 geregisseerde frames inbegrepen voor $149), plus een bioscooptrailer van 1–3 min, stemkloning en filmmuziek.',
      metric1Sub: 'Blueprint Pass (100% verrekend)',
      metric2Sub: 'Tot 60-min 4K-film of serie + Trailer',
      metric3Val: '2–4 uur',
      metric3Sub: 'Vandaag nog in 4K na fotobevestiging',
      primaryCta: 'Start mijn $29 Storyboard Blueprint',
      secondaryCta: 'Bekijk alle gelegenheden',
      trustWhop: '100% van de $29 wordt verrekend met je 4K-film',
      trustPrivacy: '100% privéfoto’s — nooit gebruikt voor AI-training',
      trustLanguages: '14 native UI-portalen · Cultureel gelokaliseerde 4K-masters in 70+ talen',
    },
    theater: {
      eyebrow: 'Express 4K Cinema Reel',
      watchSamplePrefix: 'Bekijk voorbeeld',
      sameDayTagSuffix: 'Vandaag in 4K',
      formatToggle: {
        express4kLabel: '4K Cinema',
        express4kSub: 'Bestel vandaag',
        fullMotionLabel: 'Full Motion',
        fullMotionSub: 'Studio-voorbeeld',
        fullMotionEyebrow: 'Full-Motion Cinema Voorbeeld',
        fullMotionTagSuffix: 'Partner Studio-niveau (Alleen demo)',
        express4kNote:
          'Fotorealistische 4K-frames met Ken Burns-camerabeweging, studiostemmen & score — hieronder direct te bestellen voor levering vandaag.',
        fullMotionNote:
          'Live-action AI-beweging & lipsync-dialoog — vergelijk hier beide formaten; Full-Motion films worden gemaakt via SceneFlow Studio Partners.',
        cardExpressBadge: '4K · Vandaag',
        cardFullMotionBadge: 'Full Motion · Demo',
        watchExpressPrefix: 'Speel 4K Cinema',
        watchFullMotionPrefix: 'Speel Full Motion',
        heroSwitchPrefix: 'Vergelijk formaten:',
        heroOrFullMotion: 'of Full-Motion Cinema',
      },
      tabs: [
        {
          id: 'family_legacy',
          label: 'Harbor Books · Leven & Mijlpalen',
          caption:
            'Harbor Books: Vijftig jaar op Pike Street — Familieverhaal, bruiloften, diploma’s & pensioen',
          priceUsd: 149,
          videoSlug: 'memoir',
        },
        {
          id: 'real_estate_express',
          label: 'Vastgoed 4K',
          caption: 'Woningfoto’s omgetoverd tot ingesproken 4K-vastgoedcinema',
          priceUsd: 149,
          videoSlug: 'realestate',
        },
        {
          id: 'brand_express',
          label: 'Oprichter & Kliniek',
          caption: 'Vertrouwenwekkende homepage-verhalen zonder filmploeg',
          priceUsd: 199,
          videoSlug: 'brand',
        },
        {
          id: 'training_express',
          label: 'Training & SOP',
          caption: 'Ingesproken modules met vaste trainer, altijd eenvoudig te updaten',
          priceUsd: 249,
          videoSlug: 'training',
        },
      ],
    },
    occasions: {
      eyebrow: 'Geselecteerde Express 4K Collecties',
      heading: 'Elke mijlpaal verdient het grote scherm.',
      subtitle:
        'De video’s van 2 minuten hieronder zijn korte voorproefjes — jouw $149-pakket omvat een echte 4K-speelfilm van 1+ uur OF een meeslepende meerdelige serie (tot 60 min / 360 geregisseerde frames; uitbreidbaar tot 150 min) die nooit gefilmde hoofdstukken nabootst met tijdseigen mensen, locaties, cultuur & geschiedenis, plus een trailer van 1–3 min. Start met een $29 Blueprint Pass (100% verrekend).',
      tabAll: 'Alle voorbeelden (4)',
      tabMilestones: 'Leven & Mijlpalen (1)',
      tabCommercial: 'Zakelijk & Vastgoed (3)',
      groupMilestonesHeading: 'Levensverhalen & Mijlpaalfilms',
      groupCommercialHeading: 'Voorbeelden Vastgoed, Merkverhaal & Training',
      groupCommercialSub:
        'Bekijk 4K Cinema (vandaag te bestellen) en Full-Motion voorbeelden voor woningen, oprichtersverhalen en ingesproken SOP-trainingen.',
      idealForLabel: 'Ideaal voor:',
      cardCta: 'Start $29 Blueprint',
      offers: {
        family_legacy: {
          badge: 'Meest gekozen · 1+ Uur Film of Serie',
          title: 'Levensverhalen & Familieherinneringen, Bruiloften, Diploma’s en meer',
          subtitle:
            'Ga de diepte in — vertel een onvergetelijke 1+ uur durende (30–150 min) speelfilm of meerdelige levensserie die nooit gefilmde hoofdstukken tot leven brengt met authentieke mensen, locaties, cultuur en historische context. Jouw $149-pakket bevat tot 60 min (360 geregisseerde 4K-frames) plus een deelbare bioscooptrailer van 1–3 min.',
          idealFor:
            '70e/80e verjaardagen, familiekronieken, meerdelige levensseries, bruiloften & jubilea, afstuderen, pensioen & herdenkingen',
          runtimeLabel: 'Tot 60 min Speelfilm OF Meerdelige Serie · + 1–3 min Trailer',
          turnaroundLabel: 'Vandaag nog (2–4 uur na fotobevestiging)',
          deliverables: [
            'Tot 60 min 4K-speelfilm OF Meerdelige Serie (360 geregisseerde frames; tot 150 min uitbreidbaar)',
            'Deelbare bioscooptrailer van 1–3 min inbegrepen voor familie en uitnodigingen',
            'Historische reconstructies: verjonging naar 28 jaar, familiegelijkenis, tijdseigen locaties & erfstukken',
            'Inclusief automatische regionale & decenniumspecifieke culturele/economische context + geënsceneerde familiebijeenkomsten en tradities in 70+ talen',
          ],
          titlePlaceholder: 'bijv. Opa Mateo’s verhaal voor zijn 80e verjaardag',
        },
        wedding_love: {
          badge: 'Bruiloften & Jubilea',
          title: 'Liefdesverhalen, Bruiloften & Geloften',
          subtitle:
            'Verander jullie ontmoeting, mooiste reizen, aanzoek en familiewensen in een 4K-speelfilm (tot 60 min / 360 frames) plus een trailer van 1–3 min voor het diner.',
          idealFor: 'Repetitiediners, huwelijksfeesten, 25- & 50-jarige jubilea, verlovingen',
          runtimeLabel: 'Tot 60 min (360 frames) · + 1–3 min Trailer',
          turnaroundLabel: 'Vandaag nog (2–4 uur na fotobevestiging)',
          deliverables: [
            'Story Blueprint + commentaarlink voor familie en getuigen',
            'Upload favoriete koppel- en aanzoekfoto’s direct vanaf je telefoon',
            'Warme vertelstem, sfeervolle geluiden & cinematische score',
            'Downloadbare 4K MP4-speelfilm + 1–3 min bioscooptrailer',
          ],
          titlePlaceholder: 'bijv. Claire & Daniel — Van Lissabon voor altijd',
        },
        graduation_milestone: {
          badge: 'Diploma’s & Volwassen worden',
          title: 'Afstudeer- & Mijlpaal-eerbetoon',
          subtitle:
            'Vier middelbare school, hbo of universiteit met een hoofdstuk-voor-hoofdstuk 4K-film (tot 60 min / 360 frames) plus een feesttrailer van 1–3 min.',
          idealFor: 'Diploma-uitreikingen, afstudeerfeesten, gala’s & uitzwaaimomenten',
          runtimeLabel: 'Tot 60 min (360 frames) · + 1–3 min Trailer',
          turnaroundLabel: 'Vandaag nog (klaar voor het feest van dit weekend)',
          deliverables: [
            'Snelle begeleide intake van 5 min met handige herinneringstips',
            'Verzamel bijdragen van ouders, coaches & broers/zussen via gastenlink',
            'Foto’s uploaden via telefoon + uitspraakgids voor namen en scholen',
            'Haarscherpe 4K MP4-film + deelbare feesttrailer van 1–3 min',
          ],
          titlePlaceholder: 'bijv. Maya’s reis naar haar diploma 2026',
        },
        retirement_tribute: {
          badge: 'Pensioen & Loopbaan',
          title: 'Pensioen- & Carrière-mijlpaalfilms',
          subtitle:
            'Eer 20–40 jaar leiderschap, mentorschap en onvergetelijke werkmomenten in een rijke 4K-eerbetoonfilm (tot 60 min / 360 frames) plus 1–3 min bankettrailer.',
          idealFor: 'Pensioendiners, directieafscheid, jubilea & eerbetonen aan oprichters',
          runtimeLabel: 'Tot 60 min (360 frames) · + 1–3 min Trailer',
          turnaroundLabel: 'Vandaag nog (2–4 uur na fotobevestiging)',
          deliverables: [
            'Deel een gastenlink zodat collega’s eenvoudig anekdotes toevoegen',
            'Upload carrièrefoto’s, teamfoto’s & hoogtepunten van de werkvloer',
            'Studiovertelling + 10-seconden uitspraakgids voor namen/bedrijven',
            '4K MP4-hoofdfilm + 1–3 min trailer klaar voor zaalschermen',
          ],
          titlePlaceholder: 'bijv. 35 jaar leiderschap — Kapitein Robert Hayes',
        },
        real_estate_express: {
          badge: 'Vastgoed · Deep-Dive 4K',
          title: 'Express 4K Woning- & Vastgoedfilm',
          subtitle:
            'Ga veel verder dan een diavoorstelling van 60 seconden: neem kopers mee langs elke kamer, renovaties, luxe keuken, tuin, scholen en buurt — tot 60 min (360 4K-frames) + 1–3 min overzichtstrailer.',
          idealFor: 'Luxe villa’s, woningaanbod, internationale kopers, boetiekhotels & vakantiewoningen',
          runtimeLabel: 'Tot 60 min (360 frames) · Uitgebreide tour + 1–3 min Trailer',
          turnaroundLabel: 'Vandaag nog (2–3 uur)',
          deliverables: [
            'Uitgebreide 4K woning- & buurtfilm (tot 60 min / 360 frames)',
            '1–3 min Funda/MLS- & social-highlighttrailer voor directe kopersaandacht',
            'Kamer-voor-kamer verhaal over afwerking, apparatuur, scholen & leefstijl',
            'Inclusief virtuele meubelupdates, levendige buurtleefstijl-staging & gelokaliseerde kopersnarratie in 70+ talen',
          ],
          titlePlaceholder: 'bijv. Harbor Crest 420 Villa met Zeezicht',
        },
        brand_express: {
          badge: 'Merkverhaal & Klinieken · Longform 4K',
          title: 'Express 4K Oprichters- & Praktijkfilm',
          subtitle:
            'Vertel de volledige documentaire achter jouw kliniek, kantoor of merk — ontstaan, klantresultaten, rondleiding en teamvisie — tot 60 min (360 frames) plus een sterke 1–3 min homepage-trailer.',
          idealFor: 'Medische/tandartspraktijken, advocatenkantoren, makers, mkb & stichtingen',
          runtimeLabel: 'Tot 60 min (360 frames) · Merkdocu + 1–3 min Trailer',
          turnaroundLabel: 'Vandaag nog (2–4 uur)',
          deliverables: [
            'Longform 4K oprichters- & merkdocumentaire (tot 60 min / 360 frames)',
            '1–3 min homepage- & socialtrailer inbegrepen om bezoekers te overtuigen',
            'Vergrendel oprichter, kliniek/kantoor, kernproducten & merkuitspraak',
            'Inclusief lokale historische oprichtingscontext & actieve patiënt-/klantzorgscènes',
          ],
          titlePlaceholder: 'bijv. Tandartspraktijk Pacific Coast — Ons Verhaal',
        },
        training_express: {
          badge: 'Training & SOP · Volledige 4K Cursus',
          title: 'Express 4K Ingesproken Trainings- & SOP-film',
          subtitle:
            'Zet handboeken van 50 pagina’s, inwerkprogramma’s of veiligheidsprotocollen om in een heldere 4K-trainingscursus in modules (tot 60 min / 360 frames; tot 150 min uitbreidbaar) met vaste trainer & 1–3 min overzichtstrailer.',
          idealFor: 'Medewerkersonboarding, arbeidsveiligheid, kliniek-SOP’s, franchises & certificering',
          runtimeLabel: 'Tot 60 min (360 frames) · Volledige cursus + 1–3 min Overzicht',
          turnaroundLabel: 'Vandaag nog (2–4 uur)',
          deliverables: [
            '4K-trainingscursus in meerdere modules (tot 60 min / 360 frames; uitbreidbaar)',
            '1–3 min overzichtstrailer voor management en nieuwe collega’s inbegrepen',
            'Consistente trainer, werkkleding, werkvloer & veiligheidsuitrusting',
            'Inclusief gelokaliseerde werkplekveiligheids- en apparatuurscenario’s afgestemd op regionale regelgeving & 70+ personeelstalen',
          ],
          titlePlaceholder: 'bijv. Veiligheids- & Apparatuuronboarding Nieuwe Medewerkers',
        },
      },
    },
    steps: {
      eyebrow: 'Moeiteloze ervaring zonder account',
      heading: 'Van vertelde herinneringen naar een 4K-film in 3 simpele stappen',
      subtitle: 'Geen account aanmaken, geen ingewikkelde software en geen wekenlang heen en weer mailen.',
      items: [
        {
          tag: 'Stap 01 · $29 vandaag',
          title: 'Begeleid verhaal van 5 min & Levend Blueprint',
          body: 'Tik geheugensteuntjes aan en vertel je verhaal in een van de 70+ filmtalen (met een native portaal in 14 talen). Binnen ~3 minuten ontvang je een geïllustreerd, ingesproken Blueprint + familie-commentaarlink en 4 AI-revisierondes.',
          highlight: '100% van je $29 wordt verrekend met je uiteindelijke 4K-film →',
        },
        {
          tag: 'Stap 02 · $120 restbedrag',
          title: 'Telefoonfoto’s, uitspraak & continuïteitslock',
          body: 'Keur je Blueprint goed en voldoe het restbedrag via Whop om je privé Continuity-bibliotheek te openen. Upload foto’s vanaf je telefoon (GPS verwijderd), voeg een 10-sec. uitspraakgids toe en vergrendel elk gezicht en elke locatie.',
          highlight: 'Elke familienaam en elk portret gecontroleerd vóór het renderen →',
        },
        {
          tag: 'Stap 03 · Vandaag nog in 4K',
          title: 'Privé-filmzaal & Automatische 4K Master',
          body: 'Bekijk je ingesproken, van muziek voorziene Express 4K-film op telefoon of tv via een directe link zonder inloggen. Zodra je op Goedkeuren klikt, rendert onze cloudengine je 4K MP4-master en mailt automatisch je downloadlink.',
          highlight: 'Direct klaar voor zaalprojectoren, smart-tv’s & delen met familie →',
        },
      ],
    },
    clarity: {
      badge: 'Waarom Express 4K Cinema zo sterk werkt',
      heading: 'Ken Burns documentairecinema ontmoet moderne 4K-storytelling',
      body: 'Combineer de emotionele kracht van een documentaire met op maat gemaakte fotorealistische 4K-scènes, consistente gezichten door de tijd, levensechte studiovertelling, omgevingsgeluid en originele filmmuziek. Door op deze storefront exclusief te focussen op Express 4K Cinema leveren we museumkwaliteit voor $149–$249 op dezelfde dag in plaats van $2,500+ en drie weken wachten.',
      bullets: [
        'Fotorealistische 4K-beelden + vloeiende camerabewegingen',
        'Echte geüploade foto’s naadloos verweven',
        'Studiovertelling, SFX & originele muziek',
        '100% persoonlijke en commerciële deelrechten',
      ],
      partnerHeading: 'Later toch Full-Motion AI-video?',
      partnerBody1:
        'Deze Express-storefront biedt bewust alleen Express 4K Cinema — voor constante kwaliteit en levering op dezelfde dag.',
      partnerBody2:
        'Wil je favoriete hoofdstukken upgraden naar Full-Motion AI-video of live interviews toevoegen? Je vergrendelde Continuity Vault wordt zonder herwerk op elk moment overgedragen aan een gecertificeerde SceneFlow Studio Partner.',
      partnerPrimaryCta: 'Bestel Express 4K Blueprint ($29)',
      partnerSecondaryCta: 'Voor videobureaus →',
    },
    faq: {
      eyebrow: 'Vragen & Antwoorden',
      heading: 'Alles wat je moet weten',
      items: [
        {
          q: 'Wat is een Express 4K Cinema Film precies?',
          a: 'Een Express 4K Cinema Film is een fotorealistische 4K-film in documentairestijl die jouw echte foto’s en op maat gemaakte 4K-scènes met vaste continuïteit combineert met vloeiende Ken Burns-camerabewegingen, studiostemmen, gelaagde geluidseffecten en een originele score — vandaag nog geleverd voor een fractie van traditionele kosten.',
        },
        {
          q: 'Hoe werkt de $29 Storyboard Blueprint Pass?',
          a: 'Je start met een $29 Storyboard Blueprint Pass via Whop Checkout. Direct na betaling start je het 5-minuten durende spraak- of tekstinterview. Binnen ~3 minuten ontvang je een geïllustreerd, ingesproken Storyboard Blueprint met 4 AI-revisierondes en een commentaarlink voor familie of collega’s. De volledige $29 wordt verrekend met je Express 4K Film (voor een $149-film blijft slechts $120 over).',
        },
        {
          q: 'Kunnen familieleden, partners of collega’s verhalen toevoegen vóór afronding?',
          a: 'Ja! Je Blueprint-portaal bevat een aparte gastenlink (alleen reageren). Familie, getuigen of collega’s kunnen meeluisteren in 70+ filmtalen (met een native portaal in 14 talen) en herinneringen achterlaten zonder jouw revisierondes te verbruiken.',
        },
        {
          q: 'Hoe werken de 14 native UI-portalen en 70+ cultureel gelokaliseerde filmtalen samen?',
          a: 'Werk in 14 native portalen. Produceer cultureel authentieke films in 70+ talen. Beoordeel en beheer projecten in 14 veelgebruikte portaaltalen (Engels, Spaans, Portugees, Hindi, Chinees, Arabisch, Thais, Japans, Koreaans, Duits, Frans, Italiaans, Nederlands en Russisch)—terwijl de verhaal- en beeldengine van SceneFlow cultureel gelokaliseerde 4K-masters produceert in 70+ talen, compleet met regionaal nauwkeurige historische context, lokale architectuur- en interieurstaging en native uitspraaklocks.',
        },
        {
          q: 'Hoe zit het met lastige achternamen, plaatsnamen of bedrijfsnamen?',
          a: 'Je Continuity-bibliotheek bevat een fonetische uitspraakgids van 10 seconden (typen of inspreken). Bovendien bekijk en beluister je de hele versie in je privé-filmzaal voordat de 4K-master wordt gerenderd.',
        },
        {
          q: 'Worden mijn familiefoto’s of bedrijfsbestanden ooit gebruikt om AI te trainen?',
          a: 'Nooit. Bij het uploaden worden EXIF GPS-locatiegegevens automatisch verwijderd; je bestanden blijven strikt privé binnen jouw project en worden nooit gebruikt om gedeelde AI-modellen te trainen.',
        },
        {
          q: 'Wat als ik later Full-Motion AI-scènes of echte filmopnamen wil toevoegen?',
          a: 'Deze storefront levert uitsluitend Express 4K Cinema om snelheid en prijs scherp te houden. Omdat jouw personages, stemmen en script al vastliggen in SceneFlow Studio, kun je geselecteerde hoofdstukken op elk moment via een gecertificeerde Studio Partner upgraden zonder dubbel werk.',
        },
      ],
    },
    footer: {
      referenceTag: '· Live Referentie-Storefront',
      body: 'Deze storefront draait 100% op de white-label klantportaal-engine van SceneFlow Studio met Whop Merchant of Record-checkout. Studio-ondernemers kunnen hun eigen merkstorefront onder eigen domein starten en 100% van de klantomzet behouden.',
      primaryCta: 'Start $29 Blueprint Pass',
      secondaryCta: 'Draai dit onder jouw eigen merk →',
    },
    modal: {
      stepBadge: 'Stap 1 · Blueprint Pass',
      linePass: 'Storyboard Blueprint Pass',
      lineBalance: 'Later Express 4K restbedrag (alleen bij goedkeuring)',
      lineTotal: 'Totaal Express 4K Film',
      whopNotice: 'Veilig verwerkt door Whop (Merchant of Record)',
      currencyNote: 'Weergegeven als schatting in EUR; Whop MoR rekent af in USD ($29 vandaag).',
      instantLinkNote: 'Directe magische link naar je begeleide interview van 5 min meteen na betaling.',
      fieldOccasion: 'Gelegenheid / Filmstijl',
      fieldTitle: 'Wie of wat staat centraal in deze film? (optioneel)',
      fieldName: 'Jouw naam *',
      fieldNamePlaceholder: 'Sanne de Vries',
      fieldLanguage: 'Taal van het portaal',
      fieldLanguageHint: 'Films en vertelling kunnen tijdens het interview worden geproduceerd in 70+ talen (Nederlands, Engels, Frans, Duits, Japans, Koreaans enz.).',
      whopRefBadge: 'Betalingen verwerkt door Whop',
      fieldEmail: 'E-mailadres voor jouw privé studio-links *',
      fieldEmailPlaceholder: 'jij@voorbeeld.nl',
      submitIdlePrefix: 'Doorgaan naar veilig afrekenen —',
      submitBusy: 'Veilig afrekenen openen...',
      errorFallback: 'Kon Whop Checkout niet starten. Probeer het opnieuw.',
      errorNetwork: 'Netwerkfout bij starten van Whop Checkout. Probeer het opnieuw.',
      totalOptionSuffix: 'totaal',
      todayOptionSuffix: 'vandaag',
    },
    orderPage: {
      whopBadgeShort: 'Whop MoR',
      whopBadgeFull: 'Whop Merchant of Record',
      loading: 'Je Whop-betaling wordt bevestigd...',
      notFound: 'Bestelling niet gevonden',
      returnCta: 'Terug naar Keepsake Cinema',
      confirmedTag: 'Betaling bevestigd · Direct klaar',
      unlockedTitle: 'Je Express 4K Film is ontgrendeld!',
      welcomePrefix: 'Welkom,',
      unlockedBody:
        'Bedankt voor het voldoen van het Express 4K restbedrag. Je privé Continuity-fotobibliotheek staat klaar — upload echte foto’s vanaf je telefoon en voeg een uitspraakgids van 10 sec. toe voor jouw Same-Day 4K Cinema Film.',
      passBody:
        'Je Storyboard Blueprint Pass is actief en wordt 100% verrekend met je Express 4K Film. Start direct je begeleide verhaalinterview of open de magische link die we zojuist hebben gemaild.',
      emailCopiedNotice:
        'Een privékopie van deze magische link is ook naar je e-mail gestuurd, zodat je altijd op telefoon of laptop verder kunt.',
      ctaContinuity: 'Open mijn Continuity-fotobibliotheek',
      ctaIntake: 'Start mijn begeleide verhaalinterview van 5 min',
      finalizingTitle: 'Je studioportaal wordt klaargezet...',
      pendingTitle: 'Betaling in afwachting',
      finalizingBody:
        'We bevestigen je Whop-betaling en activeren je privé studiolink. Dit duurt meestal maar enkele seconden.',
      pendingBody: 'Rond je Whop-betaling af om direct toegang te krijgen tot je privé studioportaal.',
      refreshBtn: 'Status vernieuwen',
      resumeCheckoutPrefix: 'Whop-betaling hervatten',
    },
  },

  ru: {
    shortCode: 'RU',
    nativeLabel: 'Русский',
    brandSubtitleMobile: 'Express 4K Фильмы',
    brandSubtitleDesktop: 'Express 4K Фильмы о жизни и событиях',
    topBarBadge: 'Живая демо-витрина White-Label',
    topBarSubtext: '· Только Express 4K Кино · На платформе SceneFlow Studio',
    topBarCtaMobile: 'Запустить студию',
    topBarCtaDesktop: 'Запустите собственную студию под своим брендом на SceneFlow',
    nav: {
      occasions: 'Поводы',
      howItWorks: 'Как это работает',
      expressQuality: 'Качество Express 4K',
      faq: 'Вопросы',
      ctaMobile: 'План за $29',
      ctaDesktop: 'Начать план за $29',
    },
    hero: {
      eyebrow: 'Полнометражные фильмы от 1 ч и многосерийные сериалы · Исторические реконструкции · Ноль AI Slop',
      titlePrefix: 'Превратите главные главы жизни в ',
      titleAccent: '4K-фильм или сериал от 1 часа',
      titleSuffix: ' — готов уже сегодня.',
      subtitleLead: 'От ',
      subtitleHighlight1: 'семейных хроник и исторических реконструкций',
      subtitleMid: ' до ',
      subtitleHighlight2: 'многосерийных биографий, свадеб и проводов на пенсию',
      subtitleEnd:
        '—воссоздайте неснятые главы жизни с достоверными людьми, локациями, культурой и историческим контекстом в полнометражном фильме на 30–150 минут или захватывающем многосерийном сериале (до 60 мин / 360 постановочных кадров включены за $149), плюс кинотрейлер на 1–3 мин, клонирование голоса и саундтрек.',
      metric1Sub: 'Пропуск на план-раскадровку (100% в зачёт)',
      metric2Sub: '4K-фильм или сериал до 60 мин + Трейлер',
      metric3Val: '2–4 ч',
      metric3Sub: '4K в тот же день после загрузки фото',
      primaryCta: 'Начать план-раскадровку за $29',
      secondaryCta: 'Смотреть все поводы',
      trustWhop: '100% от $29 засчитывается в стоимость 4K-фильма',
      trustPrivacy: '100% приватность фото — никогда не обучают ИИ',
      trustLanguages: '14 нативных UI-порталов · Культурно локализованные 4K-мастера на 70+ языках',
    },
    theater: {
      eyebrow: 'Подборка Express 4K Кино',
      watchSamplePrefix: 'Смотреть пример',
      sameDayTagSuffix: '4K сегодня',
      formatToggle: {
        express4kLabel: '4K Кино',
        express4kSub: 'Заказать сегодня',
        fullMotionLabel: 'Full Motion',
        fullMotionSub: 'Превью студии',
        fullMotionEyebrow: 'Превью Full-Motion Кино',
        fullMotionTagSuffix: 'Уровень партнёрской студии (Демо)',
        express4kNote:
          'Фотореалистичные 4K-кадры с плавным движением камеры Ken Burns, студийными голосами и музыкой — доступно к заказу сегодня ниже.',
        fullMotionNote:
          'Живое ИИ-движение и синхронизированная речь — сравните оба формата здесь; фильмы Full-Motion производятся через партнёров SceneFlow Studio.',
        cardExpressBadge: '4K · Сегодня',
        cardFullMotionBadge: 'Full Motion · Демо',
        watchExpressPrefix: 'Смотреть 4K Кино',
        watchFullMotionPrefix: 'Смотреть Full Motion',
        heroSwitchPrefix: 'Сравнить форматы:',
        heroOrFullMotion: 'или Full-Motion Кино',
      },
      tabs: [
        {
          id: 'family_legacy',
          label: 'Harbor Books · Жизнь и даты',
          caption:
            'Harbor Books: Пятьдесят лет на Пайк-стрит — Семейная история, свадьбы, выпускные и юбилеи',
          priceUsd: 149,
          videoSlug: 'memoir',
        },
        {
          id: 'real_estate_express',
          label: 'Недвижимость 4K',
          caption: 'Фотографии объекта превращаются в озвученное 4K-кино о недвижимости',
          priceUsd: 149,
          videoSlug: 'realestate',
        },
        {
          id: 'brand_express',
          label: 'Основатель и клиника',
          caption: 'Вызывающие доверие фильмы для главной страницы без съёмочной группы',
          priceUsd: 199,
          videoSlug: 'brand',
        },
        {
          id: 'training_express',
          label: 'Обучение и SOP',
          caption: 'Озвученные модули с постоянным инструктором, легко обновлять в любой момент',
          priceUsd: 249,
          videoSlug: 'training',
        },
      ],
    },
    occasions: {
      eyebrow: 'Коллекции Express 4K Кино',
      heading: 'Каждая важная веха достойна большого экрана.',
      subtitle:
        'Двухминутные видео ниже — короткие примеры. Ваш пакет за $149 включает настоящий полнометражный 4K-фильм от 1 часа ИЛИ захватывающий многосерийный сериал (до 60 мин / 360 постановочных кадров; расширение до 150 мин), воссоздающий неснятые главы с точными для эпохи людьми, локациями, культурой и историей, плюс трейлер на 1–3 мин. Начните с пропуска Blueprint за $29 (100% в зачёт).',
      tabAll: 'Все примеры (4)',
      tabMilestones: 'Жизнь и даты (1)',
      tabCommercial: 'Бизнес и недвижимость (3)',
      groupMilestonesHeading: 'Истории жизни и памятные фильмы',
      groupCommercialHeading: 'Примеры: Недвижимость, История бренда и Обучение',
      groupCommercialSub:
        'Сравните 4K Кино (заказ сегодня) и студийные превью Full-Motion для объектов недвижимости, историй основателей и курсов SOP.',
      idealForLabel: 'Идеально для:',
      cardCta: 'Начать план за $29',
      offers: {
        family_legacy: {
          badge: 'Хит · Фильм или Сериал от 1 ч',
          title: 'Истории жизни и семейные хроники, свадьбы, выпускные и другое',
          subtitle:
            'Раскройте историю глубоко — создайте незабываемый полнометражный фильм от 1 часа (30–150 мин) или многосерийный сериал о жизни, воссоздающий неснятые главы с достоверными людьми, локациями, культурой и историческим контекстом. В пакет за $149 входит до 60 мин (360 постановочных 4K-кадров) плюс готовый к отправке кинотрейлер на 1–3 мин.',
          idealFor:
            '70- и 80-летие, семейная летопись, многосерийные биографии, свадьбы и годовщины, выпускные, юбилеи и вечера памяти',
          runtimeLabel: 'Фильм ИЛИ Многосерийный сериал до 60 мин · + Трейлер 1–3 мин',
          turnaroundLabel: 'В тот же день (2–4 ч после загрузки фото)',
          deliverables: [
            'Полнометражный 4K-фильм ИЛИ Многосерийный сериал до 60 мин (360 постановочных кадров; расширение до 150 мин)',
            'Кинотрейлер 1–3 мин для рассылки родным и приглашённым в комплекте',
            'Исторические реконструкции: омоложение до 28 лет, сходство родных, локации эпохи и реликвии',
            'Включает автоматический культурный и экономический контекст региона и эпохи + постановочные семейные встречи и традиции на 70+ языках',
          ],
          titlePlaceholder: 'напр., История 80-летия дедушки Матео',
        },
        wedding_love: {
          badge: 'Свадьбы и годовщины',
          title: 'Истории любви, свадьбы и обновление клятв',
          subtitle:
            'Превратите знакомство, любимые путешествия, предложение и напутствия близких в полнометражный 4K-фильм (до 60 мин / 360 кадров) плюс трейлер 1–3 мин для банкета.',
          idealFor: 'Предсвадебные ужины, банкеты, серебряные и золотые свадьбы, помолвки',
          runtimeLabel: 'До 60 мин (360 кадров) · + Трейлер 1–3 мин',
          turnaroundLabel: 'В тот же день (2–4 ч после загрузки фото)',
          deliverables: [
            'Сценарный план + ссылка для комментариев и пожеланий родных',
            'Загружайте фото пары и предложения прямо со смартфона',
            'Тёплое повествование, атмосферный звук и кинематографическая музыка',
            'Скачиваемый 4K MP4-фильм + кинотрейлер 1–3 мин',
          ],
          titlePlaceholder: 'напр., Клэр и Даниэль — Из Лиссабона навсегда',
        },
        graduation_milestone: {
          badge: 'Выпускные и взросление',
          title: 'Фильмы-посвящения к выпускному',
          subtitle:
            'Отпразднуйте окончание школы, вуза или магистратуры глубоким 4K-фильмом по главам (до 60 мин / 360 кадров) и праздничным трейлером на 1–3 мин.',
          idealFor: 'Школьные и университетские выпускные, награждения и проводы',
          runtimeLabel: 'До 60 мин (360 кадров) · + Трейлер 1–3 мин',
          turnaroundLabel: 'В тот же день (успеете к празднику на выходных)',
          deliverables: [
            'Быстрое 5-минутное интервью с подсказками важных вех',
            'Соберите тёплые слова родителей, наставников и друзей по гостевой ссылке',
            'Загрузка фото с телефона + подсказка произношения имён и школ',
            'Чёткий 4K MP4-фильм + трейлер 1–3 мин для соцсетей и семьи',
          ],
          titlePlaceholder: 'напр., Путь Майи — Выпуск 2026',
        },
        retirement_tribute: {
          badge: 'Выход на пенсию и карьера',
          title: 'Фильмы к выходу на пенсию и юбилею карьеры',
          subtitle:
            'Отметьте 20–40 лет лидерства, наставничества и ярких рабочих моментов в полнометражном 4K-фильме (до 60 мин / 360 кадров) с банкетным трейлером 1–3 мин.',
          idealFor: 'Проводы на пенсию, чествование руководителей, заслуженных специалистов и основателей',
          runtimeLabel: 'До 60 мин (360 кадров) · + Трейлер 1–3 мин',
          turnaroundLabel: 'В тот же день (2–4 ч после загрузки фото)',
          deliverables: [
            'Гостевая ссылка, чтобы коллеги легко добавили памятные истории',
            'Загрузите карьерные снимки, фото команды и рабочие победы',
            'Студийный диктор + 10-сек. подсказка произношения фамилий и компаний',
            '4K MP4-фильм + трейлер 1–3 мин, готовые для экранов банкетного зала',
          ],
          titlePlaceholder: 'напр., 35 лет лидерства — Капитан Роберт Хейс',
        },
        real_estate_express: {
          badge: 'Недвижимость · Глубокий 4K-тур',
          title: 'Express 4K Фильм об объекте недвижимости',
          subtitle:
            'Намного больше 60-секундного слайд-шоу: проведите покупателя по каждой комнате, ремонту, премиальной технике, территории, школам и району — до 60 мин (360 кадров 4K) + трейлер 1–3 мин.',
          idealFor: 'Элитные дома, жилая недвижимость, иногородние покупатели, бутик-отели и виллы',
          runtimeLabel: 'До 60 мин (360 кадров) · Полный тур + Трейлер 1–3 мин',
          turnaroundLabel: 'В тот же день (2–3 ч)',
          deliverables: [
            'Подробный 4K-фильм об объекте и районе (до 60 мин / 360 кадров)',
            'Трейлер 1–3 мин для каталогов и соцсетей в комплекте',
            'Покомнатный рассказ об отделке, технике, школах и образе жизни',
            'Включает виртуальное обновление мебели, живую постановку атмосферы района и локализованную озвучку для покупателей на 70+ языках',
          ],
          titlePlaceholder: 'напр., Резиденция Harbor Crest 420 с видом на океан',
        },
        brand_express: {
          badge: 'Бренд и клиники · Полный метр 4K',
          title: 'Express 4K Фильм об основателе и клинике',
          subtitle:
            'Расскажите полноценную документальную историю вашей клиники, фирмы или бренда — замысел основателя, кейсы клиентов, обзор пространства и философия команды — до 60 мин (360 кадров) + трейлер 1–3 мин для главной страницы.',
          idealFor: 'Медицинские/стоматологические клиники, юрфирмы, крафтовые бренды и НКО',
          runtimeLabel: 'До 60 мин (360 кадров) · Док. фильм + Трейлер 1–3 мин',
          turnaroundLabel: 'В тот же день (2–4 ч)',
          deliverables: [
            'Полнометражный 4K-фильм об основателе и бренде (до 60 мин / 360 кадров)',
            'Трейлер 1–3 мин для сайта и соцсетей, повышающий конверсию',
            'Фиксация облика основателя, клиники/офиса, продуктов и произношения названий',
            'Включает локальный исторический контекст эпохи основания и живые сцены заботы о пациентах и клиентах',
          ],
          titlePlaceholder: 'напр., Семейная стоматология Pacific Coast — Наша история',
        },
        training_express: {
          badge: 'Обучение и SOP · Полный 4K-курс',
          title: 'Express 4K Озвученный курс обучения и SOP',
          subtitle:
            'Превратите 50-страничные регламенты, пособия по адаптации или протоколы безопасности в наглядный многомодульный 4K-курс (до 60 мин / 360 кадров; расширение до 150 мин) с постоянным инструктором и обзором 1–3 мин.',
          idealFor: 'Онбординг сотрудников, охрана труда, клинические SOP, франшизы и сертификация',
          runtimeLabel: 'До 60 мин (360 кадров) · Полный курс + Обзор 1–3 мин',
          turnaroundLabel: 'В тот же день (2–4 ч)',
          deliverables: [
            'Многомодульный 4K-курс обучения (до 60 мин / 360 кадров; расширяемый)',
            'Обзорный трейлер 1–3 мин для руководства и новых сотрудников в комплекте',
            'Единый образ инструктора, формы, цеха/офиса и защитного оборудования',
            'Включает локализованные сценарии охраны труда и работы с оборудованием под региональные нормы и 70+ языков сотрудников',
          ],
          titlePlaceholder: 'напр., Вводный инструктаж по безопасности и оборудованию',
        },
      },
    },
    steps: {
      eyebrow: 'Удобный процесс без регистрации',
      heading: 'От рассказанных воспоминаний до 4K-фильма за 3 простых шага',
      subtitle: 'Никаких аккаунтов, сложных программ и недель переписки по почте.',
      items: [
        {
          tag: 'Шаг 01 · $29 сегодня',
          title: '5-минутное интервью и живой план-раскадровка',
          body: 'Выбирайте подсказки и расскажите историю на любом из 70+ языков производства (нативный портал доступен на 14 языках). Через ~3 минуты вы получите иллюстрированный озвученный план + ссылку для комментариев семьи и 4 раунда ИИ-правок.',
          highlight: '100% ваших $29 засчитываются в итоговый 4K-фильм →',
        },
        {
          tag: 'Шаг 02 · Остаток $120',
          title: 'Фото с телефона, произношение и фиксация облика',
          body: 'Утвердите план и оплатите остаток через Whop, чтобы открыть приватную библиотеку преемственности. Загрузите фото с телефона (GPS удаляется автоматически), добавьте 10-сек. подсказку имён и закрепите лица и места.',
          highlight: 'Каждая фамилия и портрет проверяются до начала рендера →',
        },
        {
          tag: 'Шаг 03 · 4K в тот же день',
          title: 'Приватный кинозал и автоматический 4K-мастер',
          body: 'Посмотрите озвученный Express 4K-фильм с музыкой на телефоне или ТВ по прямой ссылке без логина. Как только вы нажмёте «Утвердить», облачный движок отрендерит 4K MP4-мастер и сразу пришлёт ссылку на скачивание.',
          highlight: 'Готово для проекторов, Smart TV и семейного просмотра →',
        },
      ],
    },
    clarity: {
      badge: 'Почему Express 4K Кино работает так убедительно',
      heading: 'Сила документального кино Кена Бёрнса и современное 4K-повествование',
      body: 'Представьте эмоциональную глубину документального фильма в сочетании с индивидуальными фотореалистичными 4K-сценами, узнаваемыми лицами через десятилетия, живой студийной озвучкой, объёмным звуком и авторской музыкой. Фокусируясь на Express 4K Кино, мы даём музейное качество за $149–$249 в тот же день вместо $2,500+ и трёх недель ожидания.',
      bullets: [
        'Фотореалистичные 4K-кадры + плавные движения камеры',
        'Ваши реальные фотографии органично вплетены в фильм',
        'Студийный диктор, SFX и оригинальная музыка',
        '100% права на личный и коммерческий показ',
      ],
      partnerHeading: 'Понадобится Full-Motion ИИ-видео позже?',
      partnerBody1:
        'Эта Express-витрина намеренно предлагает только Express 4K Кино — ради стабильного качества и выдачи в тот же день.',
      partnerBody2:
        'Захотите оживить избранные главы в Full-Motion ИИ-видео или добавить живые интервью? Ваше хранилище преемственности без переделок передаётся сертифицированному партнёру SceneFlow Studio в любой момент.',
      partnerPrimaryCta: 'Заказать Express 4K План ($29)',
      partnerSecondaryCta: 'Для видеоагентств →',
    },
    faq: {
      eyebrow: 'Вопросы и ответы',
      heading: 'Всё, что важно знать',
      items: [
        {
          q: 'Что именно представляет собой фильм Express 4K Кино?',
          a: 'Это фотореалистичный документальный 4K-фильм, объединяющий ваши настоящие фото и созданные на заказ 4K-сцены с фиксацией преемственности, плавными проездами камеры Ken Burns, студийной озвучкой, атмосферными эффектами и оригинальным саундтреком — готовый в тот же день за малую долю стоимости съёмок.',
        },
        {
          q: 'Как работает пропуск Storyboard Blueprint за $29?',
          a: 'Вы начинаете с оплаты $29 через Whop Checkout и сразу переходите к 5-минутному голосовому или текстовому интервью. Через ~3 минуты получаете иллюстрированный озвученный план с 4 раундами ИИ-правок и ссылкой для комментариев семьи или коллег. Вся сумма $29 засчитывается в Express 4K-фильм (для фильма за $149 остаток составит всего $120).',
        },
        {
          q: 'Могут ли родственники, супруги или коллеги добавить свои воспоминания?',
          a: 'Да! В портале есть отдельная гостевая ссылка только для комментариев. Близкие или коллеги могут прослушать черновик на любом из 70+ языков фильма (с нативным интерфейсом на 14 языках) и оставить истории, не расходуя ваши раунды правок.',
        },
        {
          q: 'Как сочетаются 14 нативных UI-порталов и 70+ культурно локализованных языков фильмов?',
          a: 'Работайте в 14 нативных порталах и создавайте культурно достоверные фильмы на 70+ языках. Просматривайте проекты и управляйте ими на 14 ключевых языках портала (английском, испанском, португальском, хинди, китайском, арабском, тайском, японском, корейском, немецком, французском, итальянском, нидерландском и русском), пока сценарный и визуальный движок SceneFlow выпускает культурно локализованные 4K-мастера на 70+ языках — с точным историческим контекстом региона, локальной архитектурой и интерьерами, а также фиксацией нативного произношения.',
        },
        {
          q: 'А как быть со сложными фамилиями, городами или названиями компаний?',
          a: 'В библиотеке преемственности есть 10-секундная фонетическая подсказка (текстом или голосом). Кроме того, вы полностью просматриваете озвученную версию в приватном кинозале до финального рендера 4K.',
        },
        {
          q: 'Используются ли семейные фото или корпоративные файлы для обучения ИИ?',
          a: 'Никогда. При загрузке EXIF GPS-координаты удаляются автоматически; файлы остаются строго приватными внутри вашего проекта и никогда не используются для обучения общих моделей ИИ.',
        },
        {
          q: 'Что если позже я захочу сцены Full-Motion ИИ или живую съёмку?',
          a: 'Эта витрина специализируется на Express 4K ради скорости и доступной цены. Поскольку персонажи, голоса и история уже закреплены в SceneFlow Studio, вы можете в любой момент расширить нужные главы до Full-Motion через сертифицированного партнёра без повторной работы.',
        },
      ],
    },
    footer: {
      referenceTag: '· Живая демо-витрина',
      body: 'Эта витрина на 100% работает на движке клиентского портала White-Label от SceneFlow Studio с оплатой Whop Merchant of Record. Владельцы студий могут запустить собственный бренд на своём домене и оставлять себе 100% клиентской выручки.',
      primaryCta: 'Начать план за $29',
      secondaryCta: 'Запустить под своим брендом →',
    },
    modal: {
      stepBadge: 'Шаг 1 · Пропуск Blueprint',
      linePass: 'Пропуск Storyboard Blueprint',
      lineBalance: 'Последующий остаток Express 4K (только после утверждения)',
      lineTotal: 'Итого за Express 4K Фильм',
      whopNotice: 'Безопасная оплата через Whop (Merchant of Record)',
      currencyNote: 'Отображается ориентировочная сумма в RUB; Whop MoR списывает в USD ($29 сегодня).',
      instantLinkNote: 'Мгновенная магическая ссылка на 5-минутное интервью сразу после оплаты.',
      fieldOccasion: 'Повод / Стиль фильма',
      fieldTitle: 'Кому или чему посвящён фильм? (необязательно)',
      fieldName: 'Ваше имя *',
      fieldNamePlaceholder: 'Алексей Смирнов',
      fieldLanguage: 'Язык интерфейса портала',
      fieldLanguageHint: 'Фильм и озвучку можно создать на 70+ языках (русском, английском, французском, немецком, японском, корейском и др.) во время интервью.',
      whopRefBadge: 'Платежи обрабатывает Whop',
      fieldEmail: 'Email для приватных ссылок студии *',
      fieldEmailPlaceholder: 'you@example.com',
      submitIdlePrefix: 'Перейти к безопасной оплате —',
      submitBusy: 'Открытие безопасной оплаты...',
      errorFallback: 'Не удалось открыть Whop Checkout. Попробуйте ещё раз.',
      errorNetwork: 'Сетевая ошибка при запуске Whop Checkout. Попробуйте ещё раз.',
      totalOptionSuffix: 'всего',
      todayOptionSuffix: 'сегодня',
    },
    orderPage: {
      whopBadgeShort: 'Whop MoR',
      whopBadgeFull: 'Whop Merchant of Record',
      loading: 'Подтверждаем вашу оплату Whop...',
      notFound: 'Заказ не найден',
      returnCta: 'Вернуться в Keepsake Cinema',
      confirmedTag: 'Оплата подтверждена · Готово к работе',
      unlockedTitle: 'Ваш Express 4K Фильм разблокирован!',
      welcomePrefix: 'Добро пожаловать,',
      unlockedBody:
        'Спасибо за оплату остатка Express 4K. Ваша приватная библиотека фотографий уже открыта — загрузите реальные снимки с телефона и добавьте 10-сек. подсказку произношения, чтобы мы создали ваш 4K-фильм уже сегодня.',
      passBody:
        'Ваш пропуск Storyboard Blueprint активен и на 100% засчитывается в стоимость Express 4K-фильма. Начните интервью прямо сейчас или откройте магическую ссылку, которую мы отправили на почту.',
      emailCopiedNotice:
        'Приватная копия этой ссылки также отправлена на ваш email — вы сможете продолжить с телефона или компьютера в любое время.',
      ctaContinuity: 'Открыть библиотеку фотографий преемственности',
      ctaIntake: 'Начать 5-минутное интервью по истории',
      finalizingTitle: 'Готовим ваш студийный портал...',
      pendingTitle: 'Ожидание оплаты',
      finalizingBody:
        'Подтверждаем платёж Whop и создаём вашу приватную студийную ссылку. Обычно это занимает несколько секунд.',
      pendingBody: 'Завершите оплату в Whop, чтобы мгновенно открыть приватный студийный портал.',
      refreshBtn: 'Обновить статус',
      resumeCheckoutPrefix: 'Продолжить оплату Whop',
    },
  },
}
