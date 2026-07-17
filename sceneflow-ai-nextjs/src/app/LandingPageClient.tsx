'use client'

import dynamic from 'next/dynamic'
import { Header } from './components/Header'
import { HeroSection } from './components/HeroSection'
import { LandingSectionCollapseProvider } from '@/components/landing/LandingSectionCollapse'

const PipelinePillarsSection = dynamic(
  () => import('@/components/landing/PipelinePillarsSection'),
  { ssr: false }
)
const UseCasesSection = dynamic(() => import('@/components/landing/UseCasesSection'), { ssr: false })
const KeyFeaturesSection = dynamic(() => import('@/components/landing/KeyFeaturesSection'), { ssr: false })
const PricingCredits = dynamic(() => import('@/components/landing/PricingCredits'), { ssr: false })
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

      <LandingSectionCollapseProvider>
        <FloatingNav />

        <UseCasesSection />
        <PipelinePillarsSection />
        <KeyFeaturesSection />
        <PricingCredits />
      </LandingSectionCollapseProvider>

      <FinalCTA />

      <Footer />
    </div>
  )
}
