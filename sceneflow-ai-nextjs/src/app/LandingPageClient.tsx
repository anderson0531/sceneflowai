'use client'

import dynamic from 'next/dynamic'
import { Header } from './components/Header'
import { ImaginePossibilitiesHero } from '@/components/landing/ImaginePossibilitiesHero'
import { CreatorAndBusinessGatewaySection } from '@/components/landing/CreatorAndBusinessGatewaySection'
import { DirectorOperatingSystemSection } from '@/components/landing/DirectorOperatingSystemSection'
import { VideoServicesSpotlightSection } from '@/components/landing/VideoServicesSpotlightSection'
import { LandingSectionCollapseProvider } from '@/components/landing/LandingSectionCollapse'
import { FullStudioDirectoryDrawer } from '@/components/landing/FullStudioDirectoryDrawer'
import { PersistLandingLocale } from '@/components/i18n/PersistLandingLocale'
import { FinalCTA } from './components/FinalCTA'
import { Footer } from './components/Footer'

const ProductionExamplesSection = dynamic(
  () => import('@/components/landing/ProductionExamplesSection'),
  { ssr: false }
)
const StudioGuidedTourSection = dynamic(
  () => import('@/components/landing/StudioGuidedTourSection'),
  { ssr: false }
)
const KeyFeaturesSection = dynamic(
  () => import('@/components/landing/KeyFeaturesSection'),
  { ssr: false }
)
const StudioAcademyGuaranteeStrip = dynamic(
  () => import('@/components/landing/StudioAcademyGuaranteeStrip'),
  { ssr: false }
)
const PricingCredits = dynamic(() => import('@/components/landing/PricingCredits'), { ssr: false })
const InfrastructureSection = dynamic(
  () => import('@/components/landing/InfrastructureSection'),
  { ssr: false }
)
const TrustSafeguardSection = dynamic(
  () => import('@/components/landing/TrustSafeguardSection').then((m) => m.TrustSafeguardSection),
  { ssr: false }
)
const ForFilmmakersSection = dynamic(
  () => import('@/components/landing/ForFilmmakersSection').then((m) => m.ForFilmmakersSection),
  { ssr: false }
)
const FloatingNav = dynamic(() => import('@/components/landing/FloatingNav'), { ssr: false })
const FloatingCTA = dynamic(() => import('@/components/landing/FloatingCTA'), { ssr: false })
const ExitIntentPopup = dynamic(() => import('@/components/landing/ExitIntentPopup'), { ssr: false })

export default function LandingPageClient() {
  return (
    <div id="main-content" className="min-h-screen bg-gray-950 text-white overflow-x-hidden">
      <PersistLandingLocale />
      <Header />
      <FloatingCTA />
      <ExitIntentPopup />

      {/* 1. Top Cinematic 6-Genre Dubbed Trailer Showcase */}
      <ImaginePossibilitiesHero />

      {/* 2. Dual-Audience Gateway: Video Service Businesses + Creators & Filmmakers */}
      <CreatorAndBusinessGatewaySection />

      {/* 3. The 5 Studio Superpowers Interactive Bento (+ 30s Host Clips on Demand) */}
      <DirectorOperatingSystemSection />

      {/* 4. Dedicated Video Services Business Engine & Monthly Income Estimator */}
      <VideoServicesSpotlightSection />

      <LandingSectionCollapseProvider>
        <FloatingNav />

        {/* 5. Playable Production Examples Across 6 Genres */}
        <ProductionExamplesSection />

        {/* 6. Guided 4-Room Sandbox Visual Tour + Progressive 30-Feature Directory */}
        <StudioGuidedTourSection />
        <FullStudioDirectoryDrawer>
          <KeyFeaturesSection />
        </FullStudioDirectoryDrawer>

        {/* 7. Zero-Learning-Curve Studio Academy Guarantee */}
        <StudioAcademyGuaranteeStrip />

        {/* 8. Membership, Continuity Vault, Pricing & Trust */}
        <PricingCredits />
        <InfrastructureSection />
        <TrustSafeguardSection />
      </LandingSectionCollapseProvider>

      <ForFilmmakersSection />

      <FinalCTA />

      <Footer />
    </div>
  )
}
