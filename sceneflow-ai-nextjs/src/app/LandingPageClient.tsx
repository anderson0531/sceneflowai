'use client'

import dynamic from 'next/dynamic'
import { useLocale } from 'next-intl'
import { Header } from './components/Header'
import { ImaginePossibilitiesHero } from '@/components/landing/ImaginePossibilitiesHero'
import StudioGuidedTourSection from '@/components/landing/StudioGuidedTourSection'
import ProductionExamplesSection from '@/components/landing/ProductionExamplesSection'
import { LongformCinemaCraftShowcase } from '@/components/showcase/LongformCinemaCraftShowcase'
import { VideoServicesSpotlightSection } from '@/components/landing/VideoServicesSpotlightSection'
import KeyFeaturesSection from '@/components/landing/KeyFeaturesSection'
import StudioAcademyGuaranteeStrip from '@/components/landing/StudioAcademyGuaranteeStrip'
import PricingCredits from '@/components/landing/PricingCredits'
import { TrustSafeguardSection } from '@/components/landing/TrustSafeguardSection'
import { ForFilmmakersSection } from '@/components/landing/ForFilmmakersSection'
import { PersistLandingLocale } from '@/components/i18n/PersistLandingLocale'
import { FinalCTA } from './components/FinalCTA'
import { Footer } from './components/Footer'
import { isPrelaunchAccessModeEnabled } from '@/lib/billing/prelaunchAccess'
import { resolveClientPortalLocale } from '@/lib/intake/clientPortalCopy'

const FloatingCTA = dynamic(() => import('@/components/landing/FloatingCTA'), { ssr: false })
const ExitIntentPopup = dynamic(() => import('@/components/landing/ExitIntentPopup'), { ssr: false })

export default function LandingPageClient() {
  const locale = useLocale()
  const prelaunchOnly = isPrelaunchAccessModeEnabled()

  return (
    <div id="main-content" className="min-h-screen bg-gray-950 text-white overflow-x-clip">
      <PersistLandingLocale />
      <Header />
      <FloatingCTA />
      {prelaunchOnly ? <ExitIntentPopup /> : null}

      {/* 1. Full-Bleed Cinematic 6-Genre Dubbed Trailer Showcase */}
      <ImaginePossibilitiesHero />

      {/* 2. Guided 4-Room Studio Visual Tour (Creator / Business Lens) */}
      <StudioGuidedTourSection />

      {/* 3. Playable Production Examples Across 6 Genres */}
      <ProductionExamplesSection />

      {/* 4. Featured Interactive Longform Blueprint · 1-Hour+ Feature OR Multi-Episode Series */}
      <LongformCinemaCraftShowcase
        variant="studio"
        locale={resolveClientPortalLocale(locale)}
      />

      {/* 5. Video Business Engine & Monthly Profit Estimator */}
      <VideoServicesSpotlightSection />

      {/* 6. Curated Studio Capabilities Explorer */}
      <KeyFeaturesSection />

      {/* 7. Zero-Learning-Curve Studio Academy Onboarding + Pricing */}
      <StudioAcademyGuaranteeStrip />
      <PricingCredits />

      {/* 8. Trust, IP Safeguard & Google Cloud Infrastructure + Originals Seed */}
      <TrustSafeguardSection />
      <ForFilmmakersSection />

      {/* 9. High-Contrast Final CTA & Footer */}
      <FinalCTA />
      <Footer />
    </div>
  )
}
