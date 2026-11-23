/**
 * 7-Language Localization Pack for Keepsake Cinema (`/showcase` & `/showcase/order/[orderId]`)
 * Supported locales: en (USD), es (MXN), pt (BRL), hi (INR), zh-CN (CNY), ar (SAR, RTL), th (THB).
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
    tabMilestones: string
    tabCommercial: string
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

export function getShowcaseVideoSlugLocale(locale: ClientPortalLocale): string {
  return locale === 'zh-CN' ? 'zh' : locale
}

export function getLocalizedShowcaseVideoUrl(videoSlug: string, locale: ClientPortalLocale): string {
  const code = getShowcaseVideoSlugLocale(locale)
  return `/landing/video-services/videos/express-${videoSlug}-${code}.mp4`
}

export function getShowcaseVideoPosterUrl(videoSlug: string): string {
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
      eyebrow: 'Same-Day 4K Cinema · Zero Crews · 70+ Film Languages',
      titlePrefix: 'Turn Life’s Greatest Chapters Into a ',
      titleAccent: '4K Cinema Film',
      titleSuffix: ' — Delivered Today.',
      subtitleLead: 'From ',
      subtitleHighlight1: 'family legacies & milestone birthdays',
      subtitleMid: ' to ',
      subtitleHighlight2: 'weddings, graduations, and retirements',
      subtitleEnd:
        '—transform treasured photos and spoken memories into a photorealistic panned 4K film with studio voices, soundscapes, and musical score.',
      metric1Sub: 'Blueprint Pass (100% credited)',
      metric2Sub: 'Express 4K Milestone Film',
      metric3Val: '2–4 hrs',
      metric3Sub: 'Same-day 4K after photo lock',
      primaryCta: 'Start My $29 Storyboard Blueprint',
      secondaryCta: 'Browse All Occasions',
      trustWhop: '100% of $29 credited toward your 4K film',
      trustPrivacy: '100% private photos — never used to train AI',
      trustLanguages: 'Produce films in 70+ languages (7 portal UIs)',
    },
    theater: {
      eyebrow: 'Express 4K Cinema Reel',
      watchSamplePrefix: 'Watch Sample',
      sameDayTagSuffix: 'Same-Day 4K',
      tabs: [
        {
          id: 'family_legacy',
          label: 'Life & Milestones',
          caption: 'Family Legacy · Weddings · Graduations · Retirements',
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
        'Start any film with a $29 Storyboard Blueprint Pass (100% credited toward your finished 4K film). Review illustrated chapters with loved ones before paying the remaining Express 4K balance.',
      tabMilestones: 'Life Milestones (4)',
      tabCommercial: 'Business & Property (3)',
      idealForLabel: 'Ideal for:',
      cardCta: 'Start $29 Blueprint',
      offers: {
        family_legacy: {
          badge: 'Most Popular · Family Legacy',
          title: 'Life Stories & Family Memoirs',
          subtitle:
            'Preserve a parent’s or grandparent’s journey—from childhood roots to today—blending real family photos with photorealistic era scenes, warm narration, and bespoke score.',
          idealFor: '70th/80th birthdays, parents & grandparents, celebrations of life, family reunions',
          runtimeLabel: '5–8 min · 4K Cinema',
          turnaroundLabel: 'Same-Day (2–4 hrs after photo lock)',
          deliverables: [
            'Illustrated & narrated Storyboard Blueprint in ~3 min',
            'Private comment-only sharing link for siblings & relatives',
            'Continuity photo library + 10-second name pronunciation guide',
            'Auto-rendered 4K MP4 Master delivered to your inbox',
          ],
          titlePlaceholder: 'e.g., Grandpa Mateo’s 80th Birthday Story',
        },
        wedding_love: {
          badge: 'Weddings & Anniversaries',
          title: 'Love Stories, Weddings & Vow Renewals',
          subtitle:
            'Turn how you met, favorite trips, proposals, and family blessings into a theater-worthy 4K film ready to screen at the rehearsal dinner, reception, or 25th/50th anniversary.',
          idealFor: 'Rehearsal dinners, wedding receptions, 25th & 50th anniversaries, engagement films',
          runtimeLabel: '5–7 min · 4K Cinema',
          turnaroundLabel: 'Same-Day (2–4 hrs after photo lock)',
          deliverables: [
            'Story Blueprint + family/wedding-party comment triage link',
            'Upload favorite couple & proposal photos right from your phone',
            'Warm narration, ambient soundscapes & cinematic score',
            'Downloadable 4K MP4 ready for venue projectors & TVs',
          ],
          titlePlaceholder: 'e.g., Claire & Daniel — From Lisbon to Forever',
        },
        graduation_milestone: {
          badge: 'Graduations & Coming-of-Age',
          title: 'Graduation & Coming-of-Age Tributes',
          subtitle:
            'Celebrate high school, college, or graduate school with a moving 4K story—from first steps and sports wins to late-night study sessions and cap-and-gown pride.',
          idealFor: 'High school & university graduations, scholarship banquets, senior night & send-offs',
          runtimeLabel: '4–6 min · 4K Cinema',
          turnaroundLabel: 'Same-Day (ready for the weekend party)',
          deliverables: [
            'Fast 5-minute guided intake with milestone memory-jogger chips',
            'Gather notes from parents, coaches & siblings via guest link',
            'Phone photo uploads + name/school pronunciation guide',
            'Crisp 4K MP4 ready for graduation parties & family sharing',
          ],
          titlePlaceholder: 'e.g., Maya’s Class of 2026 Journey',
        },
        retirement_tribute: {
          badge: 'Retirements & Career Legacy',
          title: 'Retirement & Career Milestone Films',
          subtitle:
            'Honor 20–40 years of leadership, mentorship, and unforgettable workplace moments in a polished 4K tribute film—complete with colleague anecdotes gathered via one private link.',
          idealFor: 'Retirement dinners, executive farewells, military/first-responder honors, founder tributes',
          runtimeLabel: '5–8 min · 4K Cinema',
          turnaroundLabel: 'Same-Day (2–4 hrs after photo lock)',
          deliverables: [
            'Share a guest comment link so teammates can add stories easily',
            'Upload career photos, team shots & workplace milestones',
            'Studio narration + 10-second name/company pronunciation guide',
            '4K MP4 master ready for banquet screens & Zoom farewells',
          ],
          titlePlaceholder: 'e.g., 35 Years of Leadership — Captain Robert Hayes',
        },
        real_estate_express: {
          badge: 'Real Estate · Same-Day 4K',
          title: 'Express 4K Property Listing Film',
          subtitle:
            'Transform existing MLS listing photos and neighborhood highlights into a voiced, scored 4K cinema tour the same day—zero weather delays or extra camera crews.',
          idealFor: 'Residential listings, luxury estates, boutique hotels & vacation rentals',
          runtimeLabel: '90 sec · 4K Cinema',
          turnaroundLabel: 'Same-Day (2–3 hrs)',
          deliverables: [
            'Room-by-room Storyboard Blueprint in ~3 min',
            'Upload MLS listing stills directly from phone or desktop',
            'Optional multilingual dubs for international buyers',
            'Commercial-licensed 4K MP4 ready for MLS & social',
          ],
          titlePlaceholder: 'e.g., 420 Harbor Crest Oceanview Residence',
        },
        brand_express: {
          badge: 'Business & Clinics · Same-Day 4K',
          title: 'Express 4K Founder & Practice Film',
          subtitle:
            'Give your website a trustworthy, cinema-grade homepage story without a $5,000 agency shoot—combining photorealistic visuals, crisp narration, and music in 4K.',
          idealFor: 'Medical/dental clinics, law firms, craft founders, local businesses & nonprofits',
          runtimeLabel: '90 sec–2 min · 4K Cinema',
          turnaroundLabel: 'Same-Day (2–4 hrs)',
          deliverables: [
            'Conversion-focused Storyboard Blueprint + team review link',
            'Lock founder, clinic/office & signature brand visuals',
            '10-second brand & leadership pronunciation guide',
            '100% commercial-licensed 4K MP4 master',
          ],
          titlePlaceholder: 'e.g., Pacific Coast Family Dental — Our Story',
        },
        training_express: {
          badge: 'Training & SOPs · Same-Day 4K',
          title: 'Express 4K Narrated Training & SOP Film',
          subtitle:
            'Convert manuals, onboarding checklists, or safety protocols into a clear, instructor-locked 4K narrated training module—easy to update whenever policies change.',
          idealFor: 'Employee onboarding, workplace safety, clinic SOPs & franchise playbooks',
          runtimeLabel: '5 min · 4K Cinema',
          turnaroundLabel: 'Same-Day (2–4 hrs)',
          deliverables: [
            'Structured chapter Blueprint + stakeholder sign-off link',
            'Locked presenter, uniform & workplace visual library',
            'Technical terminology & acronym pronunciation guide',
            'LMS-ready 4K MP4 master with commercial ownership',
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
          body: 'Tap occasion memory-joggers and tell your story in any of 70+ film languages (French, Spanish, Japanese, Arabic & more) inside a 7-language native portal. In ~3 minutes, receive an illustrated, narrated Blueprint + family comment link and 4 AI revision rounds.',
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
          a: 'Yes! Your Blueprint Portal includes a separate Guest Comment-Only link. Relatives, bridesmaids, classmates, or coworkers can listen in any of 70+ film languages (with a 7-language portal UI) and leave memories without spending your revision rounds or approving anything.',
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
      eyebrow: 'Cine 4K el Mismo Día · Cero Cámaras · 70+ Idiomas de Producción',
      titlePrefix: 'Convierte los Grandes Capítulos de la Vida en una ',
      titleAccent: 'Película de Cine 4K',
      titleSuffix: ' — Entregada Hoy.',
      subtitleLead: 'Desde ',
      subtitleHighlight1: 'legados familiares y cumpleaños especiales',
      subtitleMid: ' hasta ',
      subtitleHighlight2: 'bodas, graduaciones y jubilaciones',
      subtitleEnd:
        '—transforma fotos entrañables y recuerdos contados con tu voz en un filme 4K fotorrealista con movimiento de cámara, voces de estudio, ambiente sonoro y música original.',
      metric1Sub: 'Pase Blueprint (100% acreditado)',
      metric2Sub: 'Filme Express 4K Completo',
      metric3Val: '2–4 h',
      metric3Sub: 'Master 4K el mismo día',
      primaryCta: 'Iniciar Mi Blueprint con Storyboard — $29',
      secondaryCta: 'Ver Todas las Ocasiones',
      trustWhop: '100% de tus $29 acreditados a tu filme 4K',
      trustPrivacy: 'Fotos 100% privadas — nunca usadas para entrenar IA',
      trustLanguages: 'Produce filmes en 70+ idiomas (interfaz en 7 idiomas)',
    },
    theater: {
      eyebrow: 'Muestra de Cine Express 4K',
      watchSamplePrefix: 'Ver Muestra',
      sameDayTagSuffix: '4K el Mismo Día',
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
        'Inicia cualquier filme con un Pase Blueprint con Storyboard de $29 (100% acreditado a tu película 4K). Revisa los capítulos ilustrados con tus seres queridos antes de cubrir el saldo Express 4K.',
      tabMilestones: 'Momentos de Vida (4)',
      tabCommercial: 'Negocios e Inmuebles (3)',
      idealForLabel: 'Ideal para:',
      cardCta: 'Iniciar Blueprint $29',
      offers: {
        family_legacy: {
          badge: 'Más Popular · Legado Familiar',
          title: 'Historias de Vida y Memorias Familiares',
          subtitle:
            'Preserva la trayectoria de padres o abuelos combinando fotos reales con escenas fotorrealistas de época, narración cálida y banda sonora a medida.',
          idealFor: 'Cumpleaños 70/80, padres y abuelos, homenajes de vida, reuniones familiares',
          runtimeLabel: '5–8 min · Cine 4K',
          turnaroundLabel: 'Mismo día (2–4 h tras aprobar fotos)',
          deliverables: [
            'Blueprint ilustrado y narrado en ~3 minutos',
            'Enlace privado de comentarios para hermanos y familiares',
            'Biblioteca de fotos + guía de pronunciación de 10 segundos',
            'Master 4K MP4 renderizado automáticamente en tu correo',
          ],
          titlePlaceholder: 'ej., Los 80 Años del Abuelo Mateo',
        },
        wedding_love: {
          badge: 'Bodas y Aniversarios',
          title: 'Historias de Amor, Bodas y Renovación de Votos',
          subtitle:
            'Convierte cómo se conocieron, viajes inolvidables y bendiciones familiares en un filme 4K listo para proyectar en la cena de ensayo, boda o aniversario.',
          idealFor: 'Cenas de ensayo, recepciones, bodas de plata y oro, compromisos',
          runtimeLabel: '5–7 min · Cine 4K',
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
          runtimeLabel: '4–6 min · Cine 4K',
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
          runtimeLabel: '5–8 min · Cine 4K',
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
          runtimeLabel: '90 seg · Cine 4K',
          turnaroundLabel: 'Mismo día (2–3 h)',
          deliverables: [
            'Blueprint por espacios listo en ~3 minutos',
            'Sube fotos del inmueble directo desde móvil o computadora',
            'Versiones opcionales en otros idiomas para compradores globales',
            'Master 4K MP4 con licencia comercial para MLS y redes',
          ],
          titlePlaceholder: 'ej., Residencia Vista al Mar 420',
        },
        brand_express: {
          badge: 'Empresas y Clínicas · 4K Mismo Día',
          title: 'Filme Express 4K de Marca y Fundador',
          subtitle:
            'Dale a tu sitio web una historia principal que inspire confianza sin gastar $5,000 en un rodaje—combinando visuales 4K fotorrealistas, narración y música.',
          idealFor: 'Clínicas médicas/dentales, despachos legales, pymes y fundadores',
          runtimeLabel: '90 seg–2 min · Cine 4K',
          turnaroundLabel: 'Mismo día (2–4 h)',
          deliverables: [
            'Blueprint enfocado en conversión + enlace de revisión de equipo',
            'Bloqueo visual de fundador, clínica/oficina e identidad',
            'Guía de pronunciación de 10 segundos para marcas y directivos',
            'Master 4K MP4 con 100% derechos comerciales',
          ],
          titlePlaceholder: 'ej., Clínica Dental Costa del Pacífico — Nuestra Historia',
        },
        training_express: {
          badge: 'Capacitación y SOP · 4K Mismo Día',
          title: 'Módulo Express 4K de Capacitación Narrada',
          subtitle:
            'Convierte manuales, protocolos de seguridad o guías de inducción en un módulo 4K claro con instructor consistente—fácil de actualizar al cambiar normas.',
          idealFor: 'Inducción de personal, seguridad industrial, protocolos clínicos y franquicias',
          runtimeLabel: '5 min · Cine 4K',
          turnaroundLabel: 'Mismo día (2–4 h)',
          deliverables: [
            'Blueprint por capítulos + enlace de validación interna',
            'Instructor, uniformes y entorno bloqueados con continuidad',
            'Guía de pronunciación para términos técnicos y siglas',
            'Master 4K MP4 listo para LMS con propiedad comercial',
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
          body: 'Toca fichas de momentos clave y cuenta tu historia en cualquiera de 70+ idiomas de producción (francés, español, italiano, japonés y más) dentro de un portal en 7 idiomas. En ~3 min recibes tu Blueprint ilustrado y narrado + enlace familiar y 4 rondas IA.',
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
          a: 'Sí. Tu portal incluye un enlace separado de solo comentarios para invitados. Pueden escuchar en cualquiera de 70+ idiomas de película (con interfaz en 7 idiomas) y dejar recuerdos sin gastar tus rondas.',
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
      eyebrow: 'Cinema 4K no Mesmo Dia · Zero Equipe · 70+ Idiomas de Produção',
      titlePrefix: 'Transforme os Grandes Capítulos da Vida em um ',
      titleAccent: 'Filme de Cinema 4K',
      titleSuffix: ' — Entregue Hoje.',
      subtitleLead: 'De ',
      subtitleHighlight1: 'legados familiares e aniversários marcantes',
      subtitleMid: ' a ',
      subtitleHighlight2: 'casamentos, formaturas e aposentadorias',
      subtitleEnd:
        '—transforme fotos queridas e memórias faladas em um filme 4K fotorrealista com movimento suave de câmera, vozes de estúdio, sons ambientes e trilha original.',
      metric1Sub: 'Passe Blueprint (100% abatido)',
      metric2Sub: 'Filme Express 4K Completo',
      metric3Val: '2–4 h',
      metric3Sub: 'Master 4K no mesmo dia',
      primaryCta: 'Iniciar Meu Blueprint com Storyboard — $29',
      secondaryCta: 'Explorar Todas as Ocasiões',
      trustWhop: '100% dos $29 abatidos no seu filme 4K',
      trustPrivacy: 'Fotos 100% privadas — nunca usadas para treinar IA',
      trustLanguages: 'Produza filmes em 70+ idiomas (portal em 7 idiomas)',
    },
    theater: {
      eyebrow: 'Amostra de Cinema Express 4K',
      watchSamplePrefix: 'Assistir Amostra',
      sameDayTagSuffix: '4K no Mesmo Dia',
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
        'Comece qualquer filme com um Passe Blueprint com Storyboard de $29 (100% creditado no seu filme 4K final). Revise os capítulos ilustrados com quem você ama antes de pagar o saldo Express 4K.',
      tabMilestones: 'Marcos de Vida (4)',
      tabCommercial: 'Negócios e Imóveis (3)',
      idealForLabel: 'Ideal para:',
      cardCta: 'Iniciar Blueprint $29',
      offers: {
        family_legacy: {
          badge: 'Mais Popular · Legado Familiar',
          title: 'Histórias de Vida e Memórias de Família',
          subtitle:
            'Preserve a jornada de pais ou avós unindo fotos reais da família a cenas fotorrealistas de época, narração calorosa e trilha sob medida.',
          idealFor: 'Aniversários de 70/80 anos, pais e avós, homenagens de vida, encontros em família',
          runtimeLabel: '5–8 min · Cinema 4K',
          turnaroundLabel: 'Mesmo dia (2–4 h após aprovar fotos)',
          deliverables: [
            'Blueprint ilustrado e narrado em ~3 minutos',
            'Link privado somente comentários para irmãos e parentes',
            'Biblioteca de fotos + guia de pronúncia de 10 segundos',
            'Master 4K MP4 renderizado automaticamente no seu e-mail',
          ],
          titlePlaceholder: 'ex., Os 80 Anos do Vovô Mateus',
        },
        wedding_love: {
          badge: 'Casamentos e Bodas',
          title: 'Histórias de Amor, Casamentos e Bodas',
          subtitle:
            'Transforme como vocês se conheceram, viagens marcantes e pedidos de casamento em um filme 4K pronto para exibir no jantar, recepção ou bodas de prata/ouro.',
          idealFor: 'Jantares de ensaio, recepções, bodas de 25 e 50 anos, noivados',
          runtimeLabel: '5–7 min · Cinema 4K',
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
          runtimeLabel: '4–6 min · Cinema 4K',
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
          runtimeLabel: '5–8 min · Cinema 4K',
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
          runtimeLabel: '90 seg · Cinema 4K',
          turnaroundLabel: 'Mesmo dia (2–3 h)',
          deliverables: [
            'Blueprint ambiente por ambiente em ~3 minutos',
            'Envie fotos do imóvel direto do celular ou computador',
            'Versões multilíngues opcionais para compradores internacionais',
            'Master 4K MP4 com licença comercial para portais e redes',
          ],
          titlePlaceholder: 'ex., Residência Vista Mar 420',
        },
        brand_express: {
          badge: 'Empresas e Clínicas · 4K Mesmo Dia',
          title: 'Filme Express 4K de Marca e Fundador',
          subtitle:
            'Dê ao seu site um filme institucional confiável sem gastar $5,000 em produtora—combinando visuais 4K fotorrealistas, narração impecável e trilha.',
          idealFor: 'Clínicas médicas/odontológicas, escritórios, negócios locais e fundadores',
          runtimeLabel: '90 seg–2 min · Cinema 4K',
          turnaroundLabel: 'Mesmo dia (2–4 h)',
          deliverables: [
            'Blueprint focado em conversão + link de revisão da equipe',
            'Continuidade visual de fundador, clínica/escritório e marca',
            'Guia de pronúncia de 10 segundos para marcas e sócios',
            'Master 4K MP4 com 100% direitos comerciais',
          ],
          titlePlaceholder: 'ex., Clínica Odontológica Costa Azul — Nossa História',
        },
        training_express: {
          badge: 'Treinamento e POP · 4K Mesmo Dia',
          title: 'Módulo Express 4K de Treinamento Narrado',
          subtitle:
            'Converta manuais, integrações e normas de segurança em um módulo 4K claro com instrutor fixo—fácil de atualizar sempre que o processo mudar.',
          idealFor: 'Onboarding de equipes, segurança do trabalho, clínicas e franquias',
          runtimeLabel: '5 min · Cinema 4K',
          turnaroundLabel: 'Mesmo dia (2–4 h)',
          deliverables: [
            'Blueprint em capítulos + link de aprovação dos gestores',
            'Instrutor, uniforme e ambiente travados com continuidade',
            'Guia de pronúncia para termos técnicos e siglas',
            'Master 4K MP4 pronto para LMS com direitos comerciais',
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
          body: 'Toque em lembretes da ocasião e conte sua história em qualquer um dos 70+ idiomas de filme (francês, português, italiano, japonês e mais) em um portal em 7 idiomas. Em ~3 min receba seu Blueprint ilustrado e narrado + link familiar e 4 rodadas IA.',
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
          a: 'Sim! Seu portal inclui um link separado somente para comentários. Parentes ou colegas podem ouvir em qualquer um dos 70+ idiomas de produção (interface em 7 idiomas) sem consumir suas rodadas.',
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
      eyebrow: 'उसी दिन 4K सिनेमा · कोई कैमरा क्रू नहीं · 70+ फ़िल्म भाषाएँ',
      titlePrefix: 'जीवन के सबसे अनमोल अध्यायों को बनाएं ',
      titleAccent: '4K सिनेमा फिल्म',
      titleSuffix: ' — आज ही डिलीवरी।',
      subtitleLead: '',
      subtitleHighlight1: 'पारिवारिक विरासत और खास जन्मदिनों',
      subtitleMid: ' से लेकर ',
      subtitleHighlight2: 'शादियों, ग्रेजुएशन और रिटायरमेंट',
      subtitleEnd:
        ' तक—अपनी अनमोल तस्वीरों और यादों को स्टूडियो वॉइस, साउंडस्केप और मौलिक संगीत के साथ फोटोरियलिस्टिक 4K फिल्म में बदलें।',
      metric1Sub: 'ब्लूप्रिंट पास (100% क्रेडिट)',
      metric2Sub: 'पूर्ण एक्सप्रेस 4K फिल्म',
      metric3Val: '2–4 घंटे',
      metric3Sub: 'फोटो लॉक के बाद उसी दिन 4K',
      primaryCta: 'मेरा $29 स्टोरीबोर्ड ब्लूप्रिंट शुरू करें',
      secondaryCta: 'सभी अवसर देखें',
      trustWhop: 'आपके $29 का 100% 4K फिल्म में क्रेडिट',
      trustPrivacy: '100% निजी तस्वीरें — AI ट्रेनिंग में कभी उपयोग नहीं',
      trustLanguages: '70+ भाषाओं में फिल्म बनाएँ (7 पोर्टल UI भाषाएँ)',
    },
    theater: {
      eyebrow: 'एक्सप्रेस 4K सिनेमा रील',
      watchSamplePrefix: 'सैंपल देखें',
      sameDayTagSuffix: 'उसी दिन 4K',
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
        'किसी भी फिल्म की शुरुआत $29 स्टोरीबोर्ड ब्लूप्रिंट पास से करें (आपकी अंतिम 4K फिल्म में 100% समायोजित)। शेष राशि देने से पहले परिवार के साथ चित्रित अध्याय देखें।',
      tabMilestones: 'जीवन के पड़ाव (4)',
      tabCommercial: 'व्यवसाय और प्रॉपर्टी (3)',
      idealForLabel: 'उपयुक्त:',
      cardCta: '$29 ब्लूप्रिंट शुरू करें',
      offers: {
        family_legacy: {
          badge: 'सबसे लोकप्रिय · पारिवारिक विरासत',
          title: 'जीवन गाथा और पारिवारिक संस्मरण',
          subtitle:
            'माता-पिता या दादा-दादी की जीवन यात्रा को असली पारिवारिक तस्वीरों, फोटोरियलिस्टिक दृश्यों, आत्मीय आवाज़ और मौलिक संगीत के साथ संजोएँ।',
          idealFor: '70वाँ/80वाँ जन्मदिन, माता-पिता व दादा-दादी, श्रद्धांजलि व पारिवारिक मिलन',
          runtimeLabel: '5–8 मिनट · 4K सिनेमा',
          turnaroundLabel: 'उसी दिन (फोटो लॉक के 2–4 घंटे में)',
          deliverables: [
            '~3 मिनट में चित्रित व सुनाया गया स्टोरीबोर्ड ब्लूप्रिंट',
            'भाई-बहनों व रिश्तेदारों के लिए निजी कमेंट-ओनली लिंक',
            'फोटो लाइब्रेरी + 10-सेकंड नाम उच्चारण गाइड',
            'ऑटो-रेंडर 4K MP4 मास्टर सीधे आपके ईमेल पर',
          ],
          titlePlaceholder: 'उदा., दादाजी का 80वाँ जन्मदिन सम्मान',
        },
        wedding_love: {
          badge: 'शादी और सालगिरह',
          title: 'प्रेम कहानियाँ, शादियाँ और सालगिरह',
          subtitle:
            'आपकी पहली मुलाकात, यादगार यात्राओं और परिवार के आशीर्वाद को संगीत, रिसेप्शन या 25वीं/50वीं सालगिरह के लिए भव्य 4K फिल्म में बदलें।',
          idealFor: 'संगीत, वेडिंग रिसेप्शन, 25वीं व 50वीं सालगिरह, सगाई फिल्म',
          runtimeLabel: '5–7 मिनट · 4K सिनेमा',
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
          runtimeLabel: '4–6 मिनट · 4K सिनेमा',
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
          runtimeLabel: '5–8 मिनट · 4K सिनेमा',
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
          runtimeLabel: '90 सेकंड · 4K सिनेमा',
          turnaroundLabel: 'उसी दिन (2–3 घंटे)',
          deliverables: [
            '~3 मिनट में कमरा-दर-कमरा स्टोरीबोर्ड ब्लूप्रिंट',
            'फोन या डेस्कटॉप से सीधे लिस्टिंग फोटो अपलोड करें',
            'अंतरराष्ट्रीय खरीदारों के लिए बहुभाषी डब विकल्प',
            'व्यावसायिक लाइसेंस के साथ 4K MP4 मास्टर',
          ],
          titlePlaceholder: 'उदा., 420 हार्बर क्रेस्ट लक्ज़री विला',
        },
        brand_express: {
          badge: 'व्यवसाय और क्लीनिक · उसी दिन 4K',
          title: 'एक्सप्रेस 4K ब्रांड और संस्थापक फिल्म',
          subtitle:
            '$5,000 के एजेंसी शूट के बिना अपनी वेबसाइट के लिए विश्वसनीय 4K ब्रांड स्टोरी बनाएँ—फोटोरियलिस्टिक दृश्य, स्पष्ट आवाज़ और संगीत के साथ।',
          idealFor: 'मेडिकल/डेंटल क्लीनिक, लॉ फर्म, स्थानीय व्यवसाय और स्टार्टअप संस्थापक',
          runtimeLabel: '90 सेकंड–2 मिनट · 4K सिनेमा',
          turnaroundLabel: 'उसी दिन (2–4 घंटे)',
          deliverables: [
            'विश्वास बढ़ाने वाला ब्लूप्रिंट + टीम रिव्यू लिंक',
            'संस्थापक, क्लीनिक/ऑफ़िस और ब्रांड विज़ुअल लॉक',
            'ब्रांड व लीडरशिप नामों के लिए 10-सेकंड उच्चारण गाइड',
            '100% व्यावसायिक अधिकारों के साथ 4K MP4 मास्टर',
          ],
          titlePlaceholder: 'उदा., पैसिफिक फैमिली डेंटल — हमारी कहानी',
        },
        training_express: {
          badge: 'ट्रेनिंग और SOP · उसी दिन 4K',
          title: 'एक्सप्रेस 4K नैरेटेड ट्रेनिंग और SOP फिल्म',
          subtitle:
            'मैनुअल, ऑनबोर्डिंग या सेफ्टी नियमों को एक समान प्रशिक्षक के साथ स्पष्ट 4K ट्रेनिंग मॉड्यूल में बदलें—नियम बदलने पर मिनटों में अपडेट करें।',
          idealFor: 'कर्मचारी ऑनबोर्डिंग, कार्यस्थल सुरक्षा, क्लीनिक SOP और फ्रैंचाइज़ी',
          runtimeLabel: '5 मिनट · 4K सिनेमा',
          turnaroundLabel: 'उसी दिन (2–4 घंटे)',
          deliverables: [
            'अध्याय-वार ब्लूप्रिंट + स्टेकहोल्डर स्वीकृति लिंक',
            'लॉक प्रशिक्षक, यूनिफ़ॉर्म और कार्यस्थल निरंतरता',
            'तकनीकी शब्दों के लिए 10-सेकंड उच्चारण गाइड',
            'व्यावसायिक अधिकारों के साथ LMS-रेडी 4K MP4',
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
          body: '7-भाषा पोर्टल के अंदर 70+ फ़िल्म भाषाओं (फ़्रेंच, हिंदी, स्पेनिश, जापानी आदि) में से किसी में भी अपनी कहानी साझा करें। ~3 मिनट में चित्रित व सुनाया गया ब्लूप्रिंट, पारिवारिक कमेंट लिंक और 4 AI संशोधन राउंड पाएँ।',
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
          a: 'हाँ! आपके पोर्टल में एक अलग गेस्ट कमेंट-ओनली लिंक होता है जिससे परिजन 70+ फ़िल्म भाषाओं में सुन सकते हैं (7 UI भाषाओं के साथ) और बिना आपके राउंड खर्च किए सुझाव दे सकते हैं।',
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
      eyebrow: '当日交付 4K 电影 · 零摄制组 · 70+ 影片制作语言',
      titlePrefix: '把人生最珍贵的篇章，铸成一部 ',
      titleAccent: '4K 电影大片',
      titleSuffix: ' — 今日即可交付。',
      subtitleLead: '从',
      subtitleHighlight1: '家族传记与长辈寿诞纪念',
      subtitleMid: '，到',
      subtitleHighlight2: '婚礼爱情、毕业礼赞与荣休致敬',
      subtitleEnd:
        '——将珍藏照片与口述回忆，转化为写实运镜 4K 电影，配以影棚级旁白、环境音效与定制原声配乐。',
      metric1Sub: '分镜蓝图通行证（100% 抵扣）',
      metric2Sub: '完整极速 4K 纪念电影',
      metric3Val: '2–4 小时',
      metric3Sub: '锁定照片后当日交付 4K 母带',
      primaryCta: '开启我的 $29 分镜蓝图',
      secondaryCta: '浏览全部适用场景',
      trustWhop: '$29 全额抵扣最终 4K 电影费用',
      trustPrivacy: '照片 100% 私密 — 绝不用于训练公共 AI 模型',
      trustLanguages: '支持 70+ 影片配音语言（7 种原生门户界面）',
    },
    theater: {
      eyebrow: '极速 4K 电影实拍样片',
      watchSamplePrefix: '播放样片',
      sameDayTagSuffix: '当日 4K',
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
        '任何影片均以 $29 分镜蓝图通行证起步（全额抵扣最终 4K 成片费用）。与家人或团队先审阅带插画与配音的章节蓝图，满意后再支付极速 4K 尾款。',
      tabMilestones: '人生里程碑 (4)',
      tabCommercial: '商业与房产 (3)',
      idealForLabel: '适合场景：',
      cardCta: '开启 $29 蓝图',
      offers: {
        family_legacy: {
          badge: '最受欢迎 · 家族传记',
          title: '人生故事与家族回忆录',
          subtitle:
            '珍藏父母或长辈从童年至今的人生旅程，将真实老照片与写实年代画面、温暖旁白及定制配乐无缝融合。',
          idealFor: '70/80 岁大寿、父母长辈纪念、家族聚会与人生礼赞',
          runtimeLabel: '5–8 分钟 · 4K 电影',
          turnaroundLabel: '当日交付（确认照片后 2–4 小时）',
          deliverables: [
            '约 3 分钟生成图文并茂的有声分镜蓝图',
            '独立亲友评论链接，家人可补充回忆且不消耗修改次数',
            '连贯性照片库 + 10 秒姓名/地名发音指南',
            '审批后自动渲染 4K MP4 母带并邮件送达下载链接',
          ],
          titlePlaceholder: '例如：外公八十大寿人生电影',
        },
        wedding_love: {
          badge: '婚礼与周年纪念',
          title: '爱情故事、婚礼与周年电影',
          subtitle:
            '将相遇相知、难忘旅程、求婚瞬间与家人祝福化作影院级 4K 影片，随时在迎宾晚宴、婚宴或银婚/金婚庆典大屏播放。',
          idealFor: '婚宴开场、迎宾晚宴、25/50 周年纪念、求婚回忆片',
          runtimeLabel: '5–7 分钟 · 4K 电影',
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
          runtimeLabel: '4–6 分钟 · 4K 电影',
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
          runtimeLabel: '5–8 分钟 · 4K 电影',
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
          runtimeLabel: '90 秒 · 4K 电影',
          turnaroundLabel: '当日交付（2–3 小时）',
          deliverables: [
            '约 3 分钟生成逐空间分镜蓝图',
            '手机或电脑直接上传房源实拍图',
            '可选多语种配音，触达海外买家',
            '含商业授权的 4K MP4，适配房源平台与社媒',
          ],
          titlePlaceholder: '例如：海湾一号全景海景宅邸',
        },
        brand_express: {
          badge: '品牌与诊所 · 当日 4K',
          title: '极速 4K 创始人与品牌故事片',
          subtitle:
            '无需 $5,000 广告摄制费用，即可为官网打造极具信任感的 4K 品牌起源电影——写实画面、专业旁白与定制配乐一步到位。',
          idealFor: '医疗/口腔诊所、律所、本地企业、匠心品牌与公益机构',
          runtimeLabel: '90 秒–2 分钟 · 4K 电影',
          turnaroundLabel: '当日交付（2–4 小时）',
          deliverables: [
            '高转化品牌故事蓝图 + 团队协作审阅链接',
            '锁定创始人形象、诊所/办公空间与品牌视觉',
            '10 秒品牌与高管姓名发音指南',
            '100% 商业授权 4K MP4 母带',
          ],
          titlePlaceholder: '例如：海岸家庭齿科——我们的初心',
        },
        training_express: {
          badge: '培训与 SOP · 当日 4K',
          title: '极速 4K 旁白培训与 SOP 课程',
          subtitle:
            '将员工手册、入职清单或安全规范转化为形象统一的 4K 旁白培训短片，制度更新时随时快速迭代。',
          idealFor: '新员工入职、安全生产培训、医疗 SOP 与连锁门店标准',
          runtimeLabel: '5 分钟 · 4K 电影',
          turnaroundLabel: '当日交付（2–4 小时）',
          deliverables: [
            '结构化章节蓝图 + 管理层签收链接',
            '讲师形象、制服与作业环境全片视觉连贯',
            '专业术语与缩写 10 秒发音指南',
            '适配 LMS 系统的商业授权 4K MP4 母带',
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
          body: '在 7 种语言原生门户中，用 70+ 影片语言（法语、日语、西班牙语、中文等）任一语音或文字讲述故事。约 3 分钟即可获得图文有声蓝图、亲友评论链接及 4 轮 AI 修改。',
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
          a: '可以！门户提供独立的访客只评链接，亲友或同事可用 70+ 影片语言收听（支持 7 种门户界面）并留下回忆，不会消耗您的修改次数。',
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
      eyebrow: 'سينما 4K في نفس اليوم · بدون طاقم تصوير · +70 لغة إنتاج',
      titlePrefix: 'حوّل أعظم فصول الحياة إلى ',
      titleAccent: 'فيلم سينمائي بدقة 4K',
      titleSuffix: ' — يُسلَّم اليوم.',
      subtitleLead: 'من ',
      subtitleHighlight1: 'إرث العائلة وأعياد الميلاد المميزة',
      subtitleMid: ' إلى ',
      subtitleHighlight2: 'حفلات الزفاف والتخرج والتقاعد',
      subtitleEnd:
        '—حوّل الصور الثمينة والذكريات المحكية إلى فيلم 4K واقعي بحركة كاميرا ناعمة وأصوات استوديو ومؤثرات وموسيقى أصلية.',
      metric1Sub: 'بطاقة المخطط (تُخصم 100%)',
      metric2Sub: 'فيلم مناسبات 4K كامل',
      metric3Val: '2–4 ساعات',
      metric3Sub: 'نسخة 4K نفس اليوم بعد الصور',
      primaryCta: 'ابدأ مخطط القصة الآن — $29',
      secondaryCta: 'تصفح جميع المناسبات',
      trustWhop: 'يُخصم 100% من مبلغ $29 من فيلم 4K النهائي',
      trustPrivacy: 'صورك خاصة 100% — لا تُستخدم أبداً لتدريب نماذج الذكاء الاصطناعي',
      trustLanguages: 'أنتج أفلامك بأكثر من 70 لغة (بوابة بـ 7 لغات)',
    },
    theater: {
      eyebrow: 'نماذج سينما 4K السريعة',
      watchSamplePrefix: 'شاهد النموذج',
      sameDayTagSuffix: '4K نفس اليوم',
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
        'ابدأ أي فيلم ببطاقة المخطط المصور مقابل $29 (تُحتسب بالكامل ضمن سعر فيلم 4K النهائي). راجع الفصول المصورة مع أحبائك قبل سداد الرصيد المتبقي.',
      tabMilestones: 'مناسبات الحياة (4)',
      tabCommercial: 'الأعمال والعقارات (3)',
      idealForLabel: 'مثالي لـ:',
      cardCta: 'ابدأ مخطط $29',
      offers: {
        family_legacy: {
          badge: 'الأكثر طلباً · إرث العائلة',
          title: 'قصص الحياة والمذكرات العائلية',
          subtitle:
            'احفظ رحلة الوالدين أو الأجداد عبر دمج صور العائلة الحقيقية مع مشاهد حقب واقعية وسرد دافئ وموسيقى خاصة.',
          idealFor: 'أعياد الميلاد 70 و80، تكريم الوالدين والأجداد، اللقاءات العائلية',
          runtimeLabel: '5–8 دقائق · سينما 4K',
          turnaroundLabel: 'نفس اليوم (2–4 ساعات بعد اعتماد الصور)',
          deliverables: [
            'مخطط قصة مصور ومروي خلال ~3 دقائق',
            'رابط خاص للتعليقات فقط للإخوة والأقارب',
            'مكتبة صور + دليل نطق للأسماء في 10 ثوانٍ',
            'تصدير تلقائي لملف 4K MP4 يُرسل لبريدك',
          ],
          titlePlaceholder: 'مثال: قصة الجد كريم في عيد ميلاده الثمانين',
        },
        wedding_love: {
          badge: 'الزفاف والذكرى السنوية',
          title: 'قصص الحب والزفاف وتجديد العهود',
          subtitle:
            'حوّل قصة تعارفكما وأجمل الرحلات ولحظات العائلة إلى فيلم 4K جاهز للعرض في حفل الزفاف أو عشاء الخطوبة أو الذكرى الفضية والذهبية.',
          idealFor: 'حفلات الزفاف، عشاء الخطوبة، اليوبيل الفضي والذهبي',
          runtimeLabel: '5–7 دقائق · سينما 4K',
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
          runtimeLabel: '4–6 دقائق · سينما 4K',
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
          runtimeLabel: '5–8 دقائق · سينما 4K',
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
          runtimeLabel: '90 ثانية · سينما 4K',
          turnaroundLabel: 'نفس اليوم (2–3 ساعات)',
          deliverables: [
            'مخطط مشاهد لكل غرفة خلال ~3 دقائق',
            'رفع صور العقار مباشرة من الجوال أو الحاسوب',
            'دبلجة اختيارية متعددة اللغات للمشترين الدوليين',
            'ملف 4K MP4 بترخيص تجاري كامل',
          ],
          titlePlaceholder: 'مثال: فيلا إطلالة البحر الفاخرة',
        },
        brand_express: {
          badge: 'الأعمال والعيادات · 4K نفس اليوم',
          title: 'فيلم العلامة والمؤسس السريع 4K',
          subtitle:
            'امنح موقعك الإلكتروني قصة علامة تجارية تبني الثقة دون إنفاق $5,000 على تصوير تقليدي—بمرئيات 4K واقعية وسرد احترافي وموسيقى.',
          idealFor: 'العيادات الطبية والأسنان، مكاتب المحاماة، الشركات المحلية والمؤسسون',
          runtimeLabel: '90 ثانية–دقيقتان · سينما 4K',
          turnaroundLabel: 'نفس اليوم (2–4 ساعات)',
          deliverables: [
            'مخطط قصة موجه لبناء الثقة + رابط مراجعة للفريق',
            'تثبيت مظهر المؤسس والعيادة والهوية البصرية',
            'دليل نطق 10 ثوانٍ لأسماء العلامة والقيادات',
            'نسخة 4K MP4 بملكية تجارية 100%',
          ],
          titlePlaceholder: 'مثال: عيادات الأفق لطب الأسنان — قصتنا',
        },
        training_express: {
          badge: 'التدريب والإجراءات · 4K نفس اليوم',
          title: 'وحدة تدريب وإجراءات سريعة 4K',
          subtitle:
            'حوّل أدلة العمل وإجراءات السلامة إلى وحدة تدريبية 4K واضحة بمدرب ثابت يسهل تحديثها كلما تغيّرت السياسات.',
          idealFor: 'تأهيل الموظفين، السلامة المهنية، إجراءات العيادات والامتيازات',
          runtimeLabel: '5 دقائق · سينما 4K',
          turnaroundLabel: 'نفس اليوم (2–4 ساعات)',
          deliverables: [
            'مخطط منظم بالفصول + رابط اعتماد للمديرين',
            'ثبات بصري للمدرب والزي وموقع العمل',
            'دليل نطق للمصطلحات التقنية والاختصارات',
            'ملف 4K MP4 جاهز لأنظمة التعلم بترخيص تجاري',
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
          body: 'اختر محطات المناسبة واحكِ قصتك بأي من +70 لغة إنتاج (الفرنسية، العربية، الإنجليزية، اليابانية وغيرها) داخل بوابة بـ 7 لغات. خلال ~3 دقائق تستلم مخططاً مصوراً ومروياً + رابط عائلي و4 جولات تعديل.',
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
          a: 'نعم! يوفر البورتال رابطاً مستقلاً للضيوف للتعليق فقط، ويمكنهم الاستماع بأكثر من 70 لغة إنتاج (مع واجهة بـ 7 لغات) وترك ذكرياتهم دون استهلاك جولاتك.',
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
      eyebrow: 'ภาพยนตร์ 4K ส่งวันเดียวกัน · ไม่ต้องยกกองถ่าย · ผลิตได้กว่า 70 ภาษา',
      titlePrefix: 'เปลี่ยนบทสำคัญที่สุดของชีวิตให้เป็น ',
      titleAccent: 'ภาพยนตร์ซีนีมา 4K',
      titleSuffix: ' — ส่งมอบวันนี้',
      subtitleLead: 'ตั้งแต่',
      subtitleHighlight1: 'เรื่องราวครอบครัวและวันเกิดครบรอบสำคัญ',
      subtitleMid: ' ไปจนถึง',
      subtitleHighlight2: 'งานแต่งงาน รับปริญญา และงานเกษียณ',
      subtitleEnd:
        '—เปลี่ยนภาพถ่ายล้ำค่าและคำบอกเล่าให้เป็นหนัง 4K สมจริงพร้อมแพนกล้องนุ่มนวล เสียงพากย์สตูดิโอ ซาวด์เอฟเฟกต์ และดนตรีประกอบ',
      metric1Sub: 'บัตรสตอรี่บอร์ดบลูพรินต์ (หักคืน 100%)',
      metric2Sub: 'ภาพยนตร์ Express 4K ฉบับสมบูรณ์',
      metric3Val: '2–4 ชม.',
      metric3Sub: 'ได้ไฟล์ 4K วันเดียวกันหลังล็อกภาพ',
      primaryCta: 'เริ่มสตอรี่บอร์ดบลูพรินต์ของฉัน — $29',
      secondaryCta: 'ดูทุกโอกาสสำคัญ',
      trustWhop: 'ยอด $29 หักลดค่าภาพยนตร์ 4K เต็ม 100%',
      trustPrivacy: 'ภาพส่วนตัว 100% — ไม่นำไปใช้เทรน AI สาธารณะ',
      trustLanguages: 'ผลิตภาพยนตร์ได้ 70+ ภาษา (หน้าเว็บ 7 ภาษา)',
    },
    theater: {
      eyebrow: 'ตัวอย่างภาพยนตร์ Express 4K',
      watchSamplePrefix: 'ชมตัวอย่าง',
      sameDayTagSuffix: '4K วันเดียวกัน',
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
        'เริ่มต้นทุกเรื่องด้วยบัตรสตอรี่บอร์ดบลูพรินต์ $29 (นำไปหักลดค่าหนัง 4K เต็มจำนวน 100%) ตรวจบทภาพพร้อมครอบครัวก่อนชำระยอดส่วนต่าง',
      tabMilestones: 'โอกาสสำคัญชีวิต (4)',
      tabCommercial: 'ธุรกิจและอสังหาฯ (3)',
      idealForLabel: 'เหมาะสำหรับ:',
      cardCta: 'เริ่มบลูพรินต์ $29',
      offers: {
        family_legacy: {
          badge: 'ยอดนิยม · มรดกครอบครัว',
          title: 'เรื่องราวชีวิตและอนุสรณ์ครอบครัว',
          subtitle:
            'บันทึกเส้นทางชีวิตของคุณพ่อคุณแม่หรือปู่ย่าตายาย ผสานภาพถ่ายจริงกับฉากย้อนยุคสมจริง เสียงบรรยายอบอุ่น และดนตรีประกอบเฉพาะเรื่อง',
          idealFor: 'แซยิด 70/80 ปี, คุณพ่อคุณแม่และญาติผู้ใหญ่, งานรวมญาติและรำลึกชีวิต',
          runtimeLabel: '5–8 นาที · ซีนีมา 4K',
          turnaroundLabel: 'ส่งวันเดียวกัน (2–4 ชม. หลังล็อกภาพ)',
          deliverables: [
            'สตอรี่บอร์ดบลูพรินต์พร้อมภาพและเสียงใน ~3 นาที',
            'ลิงก์ส่วนตัวให้พี่น้องและญาติฝากความทรงจำแบบคอมเมนต์อย่างเดียว',
            'คลังภาพต่อเนื่อง + คู่มือออกเสียงชื่อเฉพาะ 10 วินาที',
            'เรนเดอร์ไฟล์ 4K MP4 อัตโนมัติส่งตรงเข้าอีเมล',
          ],
          titlePlaceholder: 'เช่น เรื่องราวครบ 80 ปีของคุณปู่สมชาย',
        },
        wedding_love: {
          badge: 'งานแต่งและครบรอบ',
          title: 'เรื่องราวความรัก งานแต่ง และวันครบรอบ',
          subtitle:
            'ถ่ายทอดจุดเริ่มต้น ทริปประทับใจ และคำอวยพรจากครอบครัวเป็นภาพยนตร์ 4K พร้อมฉายในงานเลี้ยงฉลองสมรสหรือครบรอบแต่งงาน',
          idealFor: 'พรีเซนเทชันงานแต่ง, อาฟเตอร์ปาร์ตี้, ครบรอบ 25/50 ปี',
          runtimeLabel: '5–7 นาที · ซีนีมา 4K',
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
          runtimeLabel: '4–6 นาที · ซีนีมา 4K',
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
          runtimeLabel: '5–8 นาที · ซีนีมา 4K',
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
          runtimeLabel: '90 วินาที · ซีนีมา 4K',
          turnaroundLabel: 'ส่งวันเดียวกัน (2–3 ชม.)',
          deliverables: [
            'สตอรี่บอร์ดบลูพรินต์รายห้องเสร็จใน ~3 นาที',
            'อัปโหลดภาพบ้านจากมือถือหรือคอมพิวเตอร์ได้ทันที',
            'เลือกเพิ่มพากย์หลายภาษาสำหรับผู้ซื้อต่างชาติได้',
            'ไฟล์ 4K MP4 ลิขสิทธิ์เชิงพาณิชย์พร้อมลงประกาศ',
          ],
          titlePlaceholder: 'เช่น บ้านหรูวิวทะเล ฮาร์เบอร์เครสต์ 420',
        },
        brand_express: {
          badge: 'ธุรกิจและคลินิก · 4K วันเดียวกัน',
          title: 'ภาพยนตร์แบรนด์และผู้ก่อตั้ง Express 4K',
          subtitle:
            'ยกระดับหน้าเว็บไซต์ด้วยเรื่องราวแบรนด์ที่สร้างความเชื่อมั่นโดยไม่ต้องจ่าย $5,000 ค่าโปรดักชัน—ภาพ 4K สมจริง เสียงพากย์คมชัด และดนตรีครบจบ',
          idealFor: 'คลินิกแพทย์/ทันตกรรม สำนักงานกฎหมาย ธุรกิจท้องถิ่น และผู้ก่อตั้งแบรนด์',
          runtimeLabel: '90 วิ–2 นาที · ซีนีมา 4K',
          turnaroundLabel: 'ส่งวันเดียวกัน (2–4 ชม.)',
          deliverables: [
            'บลูพรินต์เน้นสร้างความน่าเชื่อถือ + ลิงก์ตรวจงานทีม',
            'ล็อกภาพลักษณ์ผู้ก่อตั้ง คลินิก/ออฟฟิศ และเอกลักษณ์แบรนด์',
            'คู่มือออกเสียงชื่อแบรนด์และผู้บริหาร 10 วินาที',
            'ไฟล์ 4K MP4 พร้อมสิทธิ์ใช้งานเชิงพาณิชย์ 100%',
          ],
          titlePlaceholder: 'เช่น คลินิกทันตกรรมแปซิฟิก — เรื่องราวของเรา',
        },
        training_express: {
          badge: 'อบรมและ SOP · 4K วันเดียวกัน',
          title: 'สื่ออบรมและ SOP พร้อมเสียง Express 4K',
          subtitle:
            'เปลี่ยนคู่มือพนักงานและมาตรฐานความปลอดภัยเป็นวิดีโออบรม 4K ที่เข้าใจง่าย ล็อกวิทยากรคงที่ และอัปเดตเมื่อเปลี่ยนนโยบายได้ทันที',
          idealFor: 'ปฐมนิเทศพนักงาน ความปลอดภัยโรงงาน SOP คลินิก และแฟรนไชส์',
          runtimeLabel: '5 นาที · ซีนีมา 4K',
          turnaroundLabel: 'ส่งวันเดียวกัน (2–4 ชม.)',
          deliverables: [
            'บลูพรินต์แบ่งบทชัดเจน + ลิงก์อนุมัติผู้บริหาร',
            'ล็อกวิทยากร ยูนิฟอร์ม และสถานที่ทำงานต่อเนื่องทั้งเรื่อง',
            'คู่มือออกเสียงคำศัพท์เฉพาะทางและตัวย่อ 10 วินาที',
            'ไฟล์ 4K MP4 พร้อมอัปขึ้นระบบ LMS เชิงพาณิชย์',
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
          body: 'แตะหัวข้อช่วยนึกแล้วเล่าเรื่องราวได้กว่า 70 ภาษาการผลิต (ฝรั่งเศส ญี่ปุ่น สเปน ไทย ฯลฯ) บนหน้าพอร์ทัล 7 ภาษา ภายใน ~3 นาทีรับบลูพรินต์พร้อมภาพและเสียง ลิงก์ครอบครัว และปรับ AI 4 รอบ',
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
          a: 'ได้! พอร์ทัลมีลิงก์สำหรับแขกแบบคอมเมนต์อย่างเดียว ญาติหรือเพื่อนสามารถฟังได้กว่า 70 ภาษาของภาพยนตร์ (บนหน้าพอร์ทัล 7 ภาษา) โดยไม่กินรอบแก้ไขของคุณ',
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
}
