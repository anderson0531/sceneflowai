export type ServicePlaybookVerticalId =
  | 'video_memoir'
  | 'real_estate_tour'
  | 'education_module'
  | 'brand_story'

export interface PlaybookPackageTier {
  name: string
  suggestedPriceUsd: number
  scopeSummary: string
  estCredits: number
}

export interface ServiceInABoxPlaybook {
  id: ServicePlaybookVerticalId
  title: string
  roleTag: string
  recommendedClientPriceUsd: number
  recommendedCreditCap: number
  defaultMaxRounds: number
  defaultMaxTurns: number
  partnerTargetAudience: string
  partnerEmailSubject: string
  partnerPitchBodyTemplate: string
  rateCardTiers: readonly [PlaybookPackageTier, PlaybookPackageTier, PlaybookPackageTier]
}

export const SERVICE_IN_A_BOX_PLAYBOOKS: Record<
  ServicePlaybookVerticalId,
  ServiceInABoxPlaybook
> = {
  video_memoir: {
    id: 'video_memoir',
    title: 'Video Memoirs & Family Legacy',
    roleTag: '★ Flagship High-Margin Wedge',
    recommendedClientPriceUsd: 599,
    recommendedCreditCap: 3400,
    defaultMaxRounds: 2,
    defaultMaxTurns: 10,
    partnerTargetAudience:
      'Estate planning attorneys, senior living community directors, milestone event planners & funeral directors',
    partnerEmailSubject:
      '20% Referral Partnership — Custom Family Legacy & Milestone Tribute Films ({brand})',
    partnerPitchBodyTemplate: `Hi [Partner Name],

I run {brand}, a bespoke biographical film studio creating heirloom Life Story Memoirs and 50th Anniversary Tributes for local families.

Traditionally, documentary crews charge $2,500–$5,000+ for multi-era family biographies—pricing out 90% of families. Our guided story-intake and multi-age continuity studio blends treasured family photographs with tasteful era re-enactments and multilingual editions starting at $349–$599, delivered in 5 business days via a private zero-login Screening Room.

We partner with select local advisors and communities on a clean 20% referral commission (or wholesale preferred rate) for every family tribute commissioned.

May I send you a 3-minute private sample film to preview on your phone?

Warm regards,
{brand}`,
    rateCardTiers: [
      {
        name: 'Milestone Tribute (5 min)',
        suggestedPriceUsd: 349,
        scopeSummary: 'Single-chapter anniversary/birthday tribute · 75% archival photos + 1080p→4K clips · 1 language',
        estCredits: 1800,
      },
      {
        name: 'Family Memoir (12 min)',
        suggestedPriceUsd: 599,
        scopeSummary: 'Multi-age cast continuity (Youth → Present) + era re-enactments · 2 family languages',
        estCredits: 3400,
      },
      {
        name: 'Legacy Documentary (20 min)',
        suggestedPriceUsd: 1250,
        scopeSummary: 'Multi-chapter 4K biography + heirloom prop locks + 4 localized family language streams',
        estCredits: 7200,
      },
    ],
  },
  real_estate_tour: {
    id: 'real_estate_tour',
    title: 'Real Estate & Hospitality Walkthroughs',
    roleTag: '↻ Repeat Monthly Broker Retainer',
    recommendedClientPriceUsd: 299,
    recommendedCreditCap: 1500,
    defaultMaxRounds: 2,
    defaultMaxTurns: 8,
    partnerTargetAudience:
      'Real estate photography studios, luxury residential brokers, home stagers & boutique hotels',
    partnerEmailSubject:
      'Turn Existing Listing Photos into Narrated Multilingual Video Tours in 24h ({brand})',
    partnerPitchBodyTemplate: `Hi [Broker / Photographer Name],

At {brand}, we help top-producing listing teams and property photographers turn existing MLS listing stills into scored, narrated cinema walkthroughs—plus instant Spanish, Mandarin, Arabic, or Portuguese versions for cross-border buyers—with zero extra on-site shoot time or weather delays.

Packages start at $199–$299 per listing (or monthly 4-listing broker retainers), and we offer real estate photography partners a 20% wholesale margin on every add-on video upgrade.

Would you like me to turn one of your current active listings into a complimentary 60-second sample tour today?

Best,
{brand}`,
    rateCardTiers: [
      {
        name: 'MLS Photo Walkthrough (90s)',
        suggestedPriceUsd: 199,
        scopeSummary: 'Scored & narrated 1080p property tour from listing photos · 1 language',
        estCredits: 1000,
      },
      {
        name: 'Luxury Property Tour (2 min)',
        suggestedPriceUsd: 299,
        scopeSummary: '4K upscaled walkthrough + neighborhood lifestyle beats · 2 languages',
        estCredits: 1500,
      },
      {
        name: 'International Estate Pack (3 min)',
        suggestedPriceUsd: 549,
        scopeSummary: 'Master tour + 9:16 social reels + 4 international buyer language streams',
        estCredits: 2800,
      },
    ],
  },
  education_module: {
    id: 'education_module',
    title: 'Corporate Training & Multilingual SOPs',
    roleTag: '↻ Sticky B2B Retainer',
    recommendedClientPriceUsd: 950,
    recommendedCreditCap: 4000,
    defaultMaxRounds: 2,
    defaultMaxTurns: 10,
    partnerTargetAudience:
      'Fractional HR/L&D consultants, workplace safety auditors, clinic networks & franchise groups',
    partnerEmailSubject:
      'Multilingual Video SOPs & Onboarding Modules at 70% Lower Cost ({brand})',
    partnerPitchBodyTemplate: `Hi [HR / Operations Lead],

{brand} helps multi-site clinics, manufacturers, and hospitality groups convert dry PDF SOPs into standardized, presenter-locked onboarding and safety video modules—localized across English, Spanish, Hindi, Mandarin, Portuguese, Arabic, and 70+ workforce languages.

Because our presenter and workplace sets stay locked in a digital Continuity Vault, whenever a compliance rule changes we can update a single 30-second beat in minutes without reshooting. Modules start at $599–$950 vs. $3,000+ for live crews, with a 20% referral fee for HR/safety consultants.

Open to a quick 5-minute sample using one page of your current onboarding manual?

Best regards,
{brand}`,
    rateCardTiers: [
      {
        name: 'Single SOP Module (5 min)',
        suggestedPriceUsd: 599,
        scopeSummary: 'Locked instructor presenter & workplace set · 1 primary workforce language',
        estCredits: 2400,
      },
      {
        name: 'Multilingual Safety Course (10 min)',
        suggestedPriceUsd: 950,
        scopeSummary: 'Standardized compliance module delivered in 3 native workforce languages',
        estCredits: 4000,
      },
      {
        name: 'Curriculum Pack (20 min)',
        suggestedPriceUsd: 1800,
        scopeSummary: 'Multi-chapter onboarding series across 6+ employee languages + annual beat updates',
        estCredits: 7800,
      },
    ],
  },
  brand_story: {
    id: 'brand_story',
    title: 'Founder Brand Stories & 9:16 Social Packs',
    roleTag: '↻ White-Label Web & Ad Agency Fulfillment',
    recommendedClientPriceUsd: 650,
    recommendedCreditCap: 2800,
    defaultMaxRounds: 2,
    defaultMaxTurns: 8,
    partnerTargetAudience:
      'Local web design shops, SEO/paid-social agencies, medical/dental practices & law firms',
    partnerEmailSubject:
      'White-Label Homepage Brand Films + 9:16 Social Cutdowns for Your Clients ({brand})',
    partnerPitchBodyTemplate: `Hi [Agency Owner / Founder],

Most local clinics, law firms, and SMB websites launch without a compelling homepage video because a $5,000+ live agency shoot breaks their budget.

At {brand}, we fulfill white-label 2-minute Founder / Practice Brand Films paired with automatic 9:16 vertical ad cutdowns for $399–$650—complete with zero-login client intake and frame-accurate Screening Room approvals under your brand. Web and marketing agencies keep a 20%–30% wholesale margin on every site build.

Can I share a quick link showing how our white-label client review flow works?

Best,
{brand}`,
    rateCardTiers: [
      {
        name: 'SMB / Clinic Trust Spot (60s)',
        suggestedPriceUsd: 399,
        scopeSummary: 'Homepage trust explainer + 1 automatic 9:16 vertical social cutdown',
        estCredits: 1600,
      },
      {
        name: 'Founder Origin Film (2 min)',
        suggestedPriceUsd: 650,
        scopeSummary: 'Cinematic founder/brand story + 2 vertical 9:16 cutdowns for Reels/Shorts',
        estCredits: 2800,
      },
      {
        name: 'Growth Ad Pack',
        suggestedPriceUsd: 1200,
        scopeSummary: 'Master brand story + 4 multilingual paid-social hook variations',
        estCredits: 5600,
      },
    ],
  },
}

export function formatPlaybookPitch(
  verticalId: ServicePlaybookVerticalId,
  brandName?: string | null
): { subject: string; body: string; rateCardText: string } {
  const playbook =
    SERVICE_IN_A_BOX_PLAYBOOKS[verticalId] ?? SERVICE_IN_A_BOX_PLAYBOOKS.video_memoir
  const cleanBrand = (brandName || '').trim() || 'Your Studio Name'
  const replaceBrand = (template: string) => template.replace(/\{brand\}/g, cleanBrand)

  const rateCardLines = [
    `${cleanBrand} — ${playbook.title} Packages`,
    ...playbook.rateCardTiers.map(
      (t, idx) => `${idx + 1}. ${t.name}: $${t.suggestedPriceUsd.toLocaleString('en-US')} — ${t.scopeSummary}`
    ),
  ]

  return {
    subject: replaceBrand(playbook.partnerEmailSubject),
    body: replaceBrand(playbook.partnerPitchBodyTemplate),
    rateCardText: rateCardLines.join('\n'),
  }
}
