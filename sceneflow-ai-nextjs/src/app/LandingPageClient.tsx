'use client'

import dynamic from 'next/dynamic'
import { Header } from './components/Header'
import { HeroSection } from './components/HeroSection'
import { TwoModesSection } from '@/components/landing/TwoModesSection'
import { LandingSectionCollapseProvider } from '@/components/landing/LandingSectionCollapse'

const UseCasesSection = dynamic(() => import('@/components/landing/UseCasesSection'), { ssr: false })
const ProductionExamplesSection = dynamic(
  () => import('@/components/landing/ProductionExamplesSection'),
  { ssr: false }
)
const KeyFeaturesSection = dynamic(() => import('@/components/landing/KeyFeaturesSection'), { ssr: false })
const PricingCredits = dynamic(() => import('@/components/landing/PricingCredits'), { ssr: false })
const InfrastructureSection = dynamic(
  () => import('@/components/landing/InfrastructureSection'),
  { ssr: false }
)
const TrustSafeguardSection = dynamic(
  () => import('@/components/landing/TrustSafeguardSection').then((m) => m.TrustSafeguardSection),
  { ssr: false }
)
const FloatingNav = dynamic(() => import('@/components/landing/FloatingNav'), { ssr: false })
const FloatingCTA = dynamic(() => import('@/components/landing/FloatingCTA'), { ssr: false })
const ExitIntentPopup = dynamic(() => import('@/components/landing/ExitIntentPopup'), { ssr: false })
import { FinalCTA } from './components/FinalCTA'
import { Footer } from './components/Footer'

export default function LandingPageClient() {
  return (
    <div id="main-content" className="min-h-screen bg-gray-950 text-white overflow-x-hidden">
      <Header />
      <FloatingCTA />
      <ExitIntentPopup />

      <HeroSection />
      <TwoModesSection />

      <LandingSectionCollapseProvider>
        <FloatingNav />

        <UseCasesSection />
        <ProductionExamplesSection />
        <KeyFeaturesSection />
        <PricingCredits />
        <InfrastructureSection />
        <TrustSafeguardSection />
      </LandingSectionCollapseProvider>

      <FinalCTA />

      <Footer />
    </div>
  )
}
