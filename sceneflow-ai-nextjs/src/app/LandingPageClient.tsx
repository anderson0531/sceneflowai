'use client'

import dynamic from 'next/dynamic'
import { Header } from './components/Header'
import { HeroSection } from './components/HeroSection'
import { EngineeringTrust } from '@/components/landing/EngineeringTrust'

const PricingCredits = dynamic(() => import('@/components/landing/PricingCredits'), { ssr: false })

const ValuePropStrip = dynamic(() => import('@/components/landing/ValuePropStrip').then(m => m.ValuePropStrip), { ssr: false })
const AudiencePathStrip = dynamic(() => import('@/components/landing/AudiencePathStrip').then(m => m.AudiencePathStrip), { ssr: false })
const InstitutionalRoiSection = dynamic(() => import('@/components/landing/InstitutionalRoiSection').then(m => m.InstitutionalRoiSection), { ssr: false })
const WhySceneFlowSection = dynamic(() => import('@/components/landing/WhySceneFlowSection').then(m => m.WhySceneFlowSection), { ssr: false })
const OneTakePipelineSection = dynamic(() => import('@/components/landing/OneTakePipelineSection').then(m => m.OneTakePipelineSection), { ssr: false })
const SlotMachineSection = dynamic(() => import('@/components/landing/SlotMachineSection'), { ssr: false })
const HowItWorks = dynamic(() => import('./components/HowItWorks').then(m => m.HowItWorks), { ssr: false })
const UseCasesSection = dynamic(() => import('@/components/landing/UseCasesSection'), { ssr: false })
const CoreCapabilitiesSection = dynamic(() => import('@/components/landing/CoreCapabilitiesSection').then(m => m.CoreCapabilitiesSection), { ssr: false })
const FeatureStoryboardSection = dynamic(() => import('@/components/landing/FeatureStoryboardSection'), { ssr: false })
const FloatingNav = dynamic(() => import('@/components/landing/FloatingNav'), { ssr: false })
const FloatingCTA = dynamic(() => import('@/components/landing/FloatingCTA'), { ssr: false })
const ExitIntentPopup = dynamic(() => import('@/components/landing/ExitIntentPopup'), { ssr: false })
import { FAQ } from './components/FAQ'
import { FinalCTA } from './components/FinalCTA'
import { Footer } from './components/Footer'

export default function LandingPageClient() {
  return (
    <div id="main-content" className="min-h-screen bg-gray-950 text-white overflow-x-hidden">
      <Header />
      <FloatingNav />
      <FloatingCTA />
      <ExitIntentPopup />

      <HeroSection />

      <AudiencePathStrip />

      <ValuePropStrip />

      <WhySceneFlowSection />

      <OneTakePipelineSection />

      <SlotMachineSection />

      <HowItWorks />

      <UseCasesSection />

      <InstitutionalRoiSection />

      <CoreCapabilitiesSection />

      <FeatureStoryboardSection />

      <EngineeringTrust />

      <PricingCredits />

      <FAQ />

      <FinalCTA />

      <Footer />
    </div>
  )
}
