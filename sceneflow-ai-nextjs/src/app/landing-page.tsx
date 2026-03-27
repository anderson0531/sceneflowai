'use client'

// Landing page with dedicated Header component - "Living Pipeline" Ecosystem Architecture
import dynamic from 'next/dynamic'
import { Header } from './components/Header'
import { HeroSection } from './components/HeroSection'
import { TrustSignals } from './components/TrustSignals'
import { EngineeringTrust } from '@/components/landing/EngineeringTrust'

// New "Living Pipeline" Ecosystem Sections
const ModularShowcase = dynamic(() => import('@/components/landing/ModularShowcase'), { ssr: false })
const UnifiedWorkflow = dynamic(() => import('@/components/landing/UnifiedWorkflow'), { ssr: false })
const PricingCredits = dynamic(() => import('@/components/landing/PricingCredits'), { ssr: false })

// Value Proposition Sections - Streamlined for clarity and conversion
const SlotMachineSection = dynamic(() => import('@/components/landing/SlotMachineSection'), { ssr: false })
const HowItWorks = dynamic(() => import('./components/HowItWorks').then(m => m.HowItWorks), { ssr: false })
// Storyteller Mode - Audio-first creator targeting
const CreatorFastTrackHero = dynamic(() => import('@/components/landing/CreatorFastTrackHero').then(m => m.CreatorFastTrackHero), { ssr: false })
const FinancialFirewallSection = dynamic(() => import('@/components/landing/FinancialFirewallSection'), { ssr: false })
const ProductivityValueSection = dynamic(() => import('./components/ProductivityValueSection'), { ssr: false })
const FrameAnchoredSection = dynamic(() => import('@/components/landing/FrameAnchoredSection'), { ssr: false })
const AutomationSection = dynamic(() => import('@/components/landing/AutomationSection'), { ssr: false })
const FeatureHighlight = dynamic(() => import('./components/FeatureHighlight').then(m => m.FeatureHighlight), { ssr: false })
const TestimonialsSection = dynamic(() => import('@/components/landing/TestimonialsSection'), { ssr: false })
const UseCasesSection = dynamic(() => import('@/components/landing/UseCasesSection'), { ssr: false })
const TemplatesGallery = dynamic(() => import('@/components/landing/TemplatesGallery'), { ssr: false })
const FloatingNav = dynamic(() => import('@/components/landing/FloatingNav'), { ssr: false })
const FloatingCTA = dynamic(() => import('@/components/landing/FloatingCTA'), { ssr: false })
const ExitIntentPopup = dynamic(() => import('@/components/landing/ExitIntentPopup'), { ssr: false })
import { FAQ } from './components/FAQ'
import { FinalCTA } from './components/FinalCTA'
import { Footer } from './components/Footer'
import { ThreePillars } from '@/components/landing/ThreePillars'
import { OutcomeGallery } from '@/components/landing/OutcomeGallery'

export default function LandingPage() {
  return (
    <div id="main-content" className="min-h-screen bg-gray-950 text-white overflow-x-hidden">
      <Header />
      <FloatingNav />
      <FloatingCTA />
      <ExitIntentPopup />
      
      {/* 1. Hero: "Your Vision, Rendered. Without the Friction." */}
      <HeroSection />
      
      {/* 2. Trust: Powered by Google Cloud credibility */}
      <TrustSignals />
      
      {/* 3. The "Three Pillars": Creator, Business, Educator */}
      <ThreePillars />

      {/* 4. The "Invisible Studio" - Business Protections */}
      <FinancialFirewallSection /> {/* Reframed as "Budget Certainty" */}
      <FrameAnchoredSection /> {/* Reframed as "Brand Protection" */}

      {/* 5. "Stop Gambling. Start Producing." (Previously SlotMachineSection) */}
      <SlotMachineSection />

      {/* 6. Outcome Gallery: Real Results */}
      <OutcomeGallery />
      
      {/* 7. How It Works - Moved down */}
      <HowItWorks />
      
      {/* 8. Testimonials: Social Proof */}
      <TestimonialsSection />

      {/* 9. Use Cases */}
      <UseCasesSection />

      {/* 10. Pricing */}
      <PricingCredits />

      {/* 11. FAQ: Objection handling */}
      <FAQ />
      
      {/* 12. Final CTA: "From Prompter to Director" */}
      <FinalCTA />
      
      {/* 13. Footer: Navigation */}
      <Footer />
    </div>
  )
}
