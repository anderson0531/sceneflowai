'use client'

// Landing page with dedicated Header component - "Living Pipeline" Ecosystem Architecture
import dynamic from 'next/dynamic'
import { Header } from './components/Header'
import { HeroSection } from './components/HeroSection'
import { TrustSignals } from './components/TrustSignals'
import { EngineeringTrust } from '@/components/landing/EngineeringTrust'

const PricingCredits = dynamic(() => import('@/components/landing/PricingCredits'), { ssr: false })

const SlotMachineSection = dynamic(() => import('@/components/landing/SlotMachineSection'), { ssr: false })
const HowItWorks = dynamic(() => import('./components/HowItWorks').then(m => m.HowItWorks), { ssr: false })
const UseCasesSection = dynamic(() => import('@/components/landing/UseCasesSection'), { ssr: false })
const FeatureStoryboardSection = dynamic(() => import('@/components/landing/FeatureStoryboardSection'), { ssr: false })
const FloatingNav = dynamic(() => import('@/components/landing/FloatingNav'), { ssr: false })
const FloatingCTA = dynamic(() => import('@/components/landing/FloatingCTA'), { ssr: false })
const ExitIntentPopup = dynamic(() => import('@/components/landing/ExitIntentPopup'), { ssr: false })
import { FAQ } from './components/FAQ'
import { FinalCTA } from './components/FinalCTA'
import { Footer } from './components/Footer'

export default function LandingPage() {
  return (
    <div id="main-content" className="min-h-screen bg-gray-950 text-white overflow-x-hidden">
      <Header />
      <FloatingNav />
      <FloatingCTA />
      <ExitIntentPopup />
      
      {/* 1. Hero: "Your Vision, Rendered. Without the Friction." */}
      <HeroSection />
      
      {/* 2. Trust strip */}
      <TrustSignals />

      {/* 3. Traditional vs SceneFlow barrier comparison */}
      <SlotMachineSection />

      {/* 4. How it works in plain language */}
      <HowItWorks />

      {/* 5. Broad use cases */}
      <UseCasesSection />

      {/* 6. Feature storyboard with short-segment placeholders */}
      <FeatureStoryboardSection />

      {/* 7. Platform trust for startups and enterprise reviewers */}
      <EngineeringTrust />

      {/* 8. Pricing and budget control */}
      <PricingCredits />

      {/* 9. FAQ */}
      <FAQ />
      
      {/* 10. Final CTA */}
      <FinalCTA />
      
      {/* 11. Footer */}
      <Footer />
    </div>
  )
}