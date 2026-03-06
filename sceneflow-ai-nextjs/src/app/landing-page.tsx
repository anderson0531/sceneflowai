'use client'

// Landing page with dedicated Header component - "Living Pipeline" Ecosystem Architecture
import dynamic from 'next/dynamic'
import { Header } from './components/Header'
import { HeroSection } from './components/HeroSection'
import { TrustSignals } from './components/TrustSignals'
import { EngineeringTrust } from '@/components/landing/EngineeringTrust'

// New "Living Pipeline" Ecosystem Sections
const ModularShowcase = dynamic(() => import('@/components/landing/ModularShowcase'), { ssr: false })
const ShowrunnerEngineSection = dynamic(() => import('@/components/landing/ShowrunnerEngineSection').then(m => m.ShowrunnerEngineSection), { ssr: false })
const UnifiedWorkflow = dynamic(() => import('@/components/landing/UnifiedWorkflow'), { ssr: false })
const PricingCredits = dynamic(() => import('@/components/landing/PricingCredits'), { ssr: false })

// Value Proposition Sections - Streamlined for clarity and conversion
const SlotMachineSection = dynamic(() => import('@/components/landing/SlotMachineSection'), { ssr: false })
const HowItWorks = dynamic(() => import('./components/HowItWorks').then(m => m.HowItWorks), { ssr: false })
// Storyteller Mode - Audio-first creator targeting
const CreatorFastTrackHero = dynamic(() => import('@/components/landing/CreatorFastTrackHero').then(m => m.CreatorFastTrackHero), { ssr: false })
const StorytellerFeatureSection = dynamic(() => import('@/components/landing/StorytellerFeatureSection').then(m => m.StorytellerFeatureSection), { ssr: false })
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

export default function LandingPage() {
  return (
    <div id="main-content" className="min-h-screen bg-gray-950 text-white overflow-x-hidden">
      <Header />
      <FloatingNav />
      <FloatingCTA />
      <ExitIntentPopup />
      
      {/* 1. Hero: "Stop Gambling on AI Video" + Pipeline Animation */}
      <HeroSection />
      
      {/* 2. Trust: Powered by Google Cloud credibility */}
      <TrustSignals />
      
      {/* 3. Old Way vs SceneFlow Way - Establish the "Why" immediately */}
      <UnifiedWorkflow />
      
      {/* 4. Problem: Slot machine metaphor - why current tools fail */}
      <SlotMachineSection />
      
      {/* 5. Solution: Financial Firewall™ - The differentiator */}
      <FinancialFirewallSection />
      
      {/* 6. How: Simple 4-step process */}
      <HowItWorks />
      
      {/* 7. Modular Showcase: 4 modules with standalone value + ecosystem bonuses */}
      <ModularShowcase />
      
      {/* 7.5. Showrunner Engine: Series production for YouTube franchises */}
      <ShowrunnerEngineSection />
      
      {/* 8. Storyteller Mode: Audio-first creator targeting */}
      <CreatorFastTrackHero />
      <StorytellerFeatureSection />
      
      {/* 8.5. Value Calculator: Cost, Time, and Expertise savings */}
      <ProductivityValueSection />
      
      {/* 9. Technical: Frame-anchored architecture */}
      <FrameAnchoredSection />
      
      {/* 10. Features: All-in-one platform capabilities */}
      <FeatureHighlight />
      
      {/* 11. Templates Gallery: Quick Start for new users */}
      <TemplatesGallery />
      
      {/* 12. Testimonials: Creator stories */}
      <TestimonialsSection />
      
      {/* 13. Proof: Real use cases with video demos */}
      <UseCasesSection />
      
      {/* 14. Coffee Break: Lifestyle benefit - positioned right before pricing */}
      <AutomationSection />
      
      {/* 15. Pricing: Usage-based credits with project calculator */}
      <PricingCredits />
      
      {/* 15. Engineering: Platform trust and security */}
      <EngineeringTrust />
      
      {/* 16. FAQ: Objection handling */}
      <FAQ />
      
      {/* 17. Final CTA: Conversion */}
      <FinalCTA />
      
      {/* 18. Footer: Navigation */}
      <Footer />
    </div>
  )
}
