'use client'

// Landing page with dedicated Header component - Optimized structure (12 sections)
import dynamic from 'next/dynamic'
import { Header } from './components/Header'
import { HeroSection } from './components/HeroSection'
import { TrustSignals } from './components/TrustSignals'
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
const Pricing = dynamic(() => import('./components/Pricing').then(m => m.Pricing), { ssr: false })
const FAQ = dynamic(() => import('./components/FAQ').then(m => m.FAQ), { ssr: false })
const FloatingNav = dynamic(() => import('@/components/landing/FloatingNav'), { ssr: false })
const FloatingCTA = dynamic(() => import('@/components/landing/FloatingCTA'), { ssr: false })
const ExitIntentPopup = dynamic(() => import('@/components/landing/ExitIntentPopup'), { ssr: false })
import { FinalCTA } from './components/FinalCTA'
import { Footer } from './components/Footer'

export default function LandingPage() {
  return (
    <div id="main-content" className="min-h-screen bg-gray-950 text-white overflow-x-hidden">
      <Header />
      <FloatingNav />
      <FloatingCTA />
      <ExitIntentPopup />
      {/* 1. Hero: Value prop + Social proof badges */}
      <HeroSection />
      {/* 2. Trust: Powered by Google Cloud credibility */}
      <TrustSignals />
      {/* 3. Problem: Slot machine metaphor - why current tools fail */}
      <SlotMachineSection />
      {/* 4. How: Simple 3-step process - moved earlier per optimization */}
      <HowItWorks />
      {/* 5. Storyteller Mode: Audio-first creator targeting - Faceless channels & podcasters */}
      <CreatorFastTrackHero />
      <StorytellerFeatureSection />
      {/* 6. Solution: Financial safety with budget controls */}
      <FinancialFirewallSection />
      {/* 6.5. Value Calculator: Cost, Time, and Expertise savings */}
      <ProductivityValueSection />
      {/* 7. Technical: Frame-anchored architecture + precision features */}
      <FrameAnchoredSection />
      {/* 8. Automation: One-click generation for complete production workflow */}
      <AutomationSection />
      {/* 9. Features: All-in-one platform capabilities */}
      <FeatureHighlight />
      {/* 10. Testimonials: Creator stories and social proof */}
      <TestimonialsSection />
      {/* 11. Proof: Real use cases with video demos by persona */}
      <UseCasesSection />
      {/* 12. Pricing: Full production value tiers with animatic features */}
      <Pricing />
      {/* 13. FAQ: Objection handling */}
      <FAQ />
      {/* 14. Final CTA: Conversion */}
      <FinalCTA />
      {/* 15. Footer: Navigation */}
      <Footer />
    </div>
  )
}
