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
      
      {/* 3. Problem: Slot machine metaphor - why current tools fail */}
      <SlotMachineSection />
      
      {/* 4. Solution: Financial Firewall™ - The differentiator */}
      <FinancialFirewallSection />
      
      {/* 5. Old Way vs SceneFlow Way - Now that problem is established */}
      <UnifiedWorkflow />
      
      {/* 6. How: Five Phases to Cinematic Excellence */}
      <HowItWorks />
      
      {/* 7. Modular Showcase: 5 tools with standalone value + ecosystem bonuses */}
      <ModularShowcase />
      
      {/* 8. Testimonials: Creator stories - moved earlier for social proof */}
      <TestimonialsSection />
      
      {/* 9. Storyteller Mode: Audio-first creator targeting */}
      <CreatorFastTrackHero />
      
      {/* 10. Value Calculator: Cost, Time, and Expertise savings */}
      <ProductivityValueSection />
      
      {/* 11. Technical: Frame-anchored architecture */}
      <FrameAnchoredSection />
      
      {/* 12. Features: All-in-one platform capabilities */}
      <FeatureHighlight />
      
      {/* 13. Production Showcase: Versatile formats, styles, and resolutions */}
      <TemplatesGallery />
      
      {/* 14. Proof: Real use cases with video demos */}
      <UseCasesSection />
      
      {/* 15. Coffee Break: Lifestyle benefit - positioned right before pricing */}
      <AutomationSection />
      
      {/* 16. Pricing: Usage-based credits with project calculator */}
      <PricingCredits />
      
      {/* 17. Engineering: Platform trust and security */}
      <EngineeringTrust />
      
      {/* 18. FAQ: Objection handling */}
      <FAQ />
      
      {/* 19. Final CTA: Conversion */}
      <FinalCTA />
      
      {/* 20. Footer: Navigation */}
      <Footer />
    </div>
  )
}
