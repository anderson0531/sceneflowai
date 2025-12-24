'use client'

// Landing page with dedicated Header component - Optimized structure (13 sections)
import dynamic from 'next/dynamic'
import { Header } from './components/Header'
import { HeroSection } from './components/HeroSection'
import { TrustSignals } from './components/TrustSignals'
// Value Proposition Sections - Streamlined for clarity and conversion
const SlotMachineSection = dynamic(() => import('@/components/landing/SlotMachineSection'), { ssr: false })
const HowItWorks = dynamic(() => import('./components/HowItWorks').then(m => m.HowItWorks), { ssr: false })
const FinancialFirewallSection = dynamic(() => import('@/components/landing/FinancialFirewallSection'), { ssr: false })
const FrameAnchoredSection = dynamic(() => import('@/components/landing/FrameAnchoredSection'), { ssr: false })
const AutomationSection = dynamic(() => import('@/components/landing/AutomationSection'), { ssr: false })
const FeatureHighlight = dynamic(() => import('./components/FeatureHighlight').then(m => m.FeatureHighlight), { ssr: false })
const TestimonialsSection = dynamic(() => import('@/components/landing/TestimonialsSection'), { ssr: false })
const UseCasesSection = dynamic(() => import('@/components/landing/UseCasesSection'), { ssr: false })
const Pricing = dynamic(() => import('./components/Pricing').then(m => m.Pricing), { ssr: false })
const FAQ = dynamic(() => import('./components/FAQ').then(m => m.FAQ), { ssr: false })
const FloatingNav = dynamic(() => import('@/components/landing/FloatingNav'), { ssr: false })
const FloatingCTA = dynamic(() => import('@/components/landing/FloatingCTA'), { ssr: false })
import { FinalCTA } from './components/FinalCTA'
import { Footer } from './components/Footer'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Header />
      <FloatingNav />
      <FloatingCTA />
      {/* 1. Hero: Value prop + Social proof badges */}
      <HeroSection />
      {/* 2. Trust: Powered by Google Cloud credibility */}
      <TrustSignals />
      {/* 3. Problem: Slot machine metaphor - why current tools fail */}
      <SlotMachineSection />
      {/* 4. How: Simple 3-step process - moved earlier per optimization */}
      <HowItWorks />
      {/* 5. Solution: Financial safety with budget controls */}
      <FinancialFirewallSection />
      {/* 6. Technical: Frame-anchored architecture + precision features */}
      <FrameAnchoredSection />
      {/* 7. Automation: One-click generation for complete production workflow */}
      <AutomationSection />
      {/* 8. Features: All-in-one platform capabilities */}
      <FeatureHighlight />
      {/* 9. Testimonials: Creator stories and social proof */}
      <TestimonialsSection />
      {/* 10. Proof: Real use cases with video demos by persona */}
      <UseCasesSection />
      {/* 11. Pricing: Clear value tiers */}
      <Pricing />
      {/* 12. FAQ: Objection handling */}
      <FAQ />
      {/* 13. Final CTA: Conversion */}
      <FinalCTA />
      {/* 14. Footer: Navigation */}
      <Footer />
    </div>
  )
}
