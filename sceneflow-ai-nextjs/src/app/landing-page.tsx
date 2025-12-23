'use client'

// Landing page with dedicated Header component
import dynamic from 'next/dynamic'
import { Header } from './components/Header'
import { HeroSection } from './components/HeroSection'
import { TrustSignals } from './components/TrustSignals'
import { SocialProof } from './components/SocialProof'
const ProblemSolution = dynamic(() => import('./components/ProblemSolution').then(m => m.ProblemSolution), { ssr: false })
// Value Proposition Sections
const SlotMachineSection = dynamic(() => import('@/components/landing/SlotMachineSection'), { ssr: false })
const FinancialFirewallSection = dynamic(() => import('@/components/landing/FinancialFirewallSection'), { ssr: false })
const OneTakeSection = dynamic(() => import('@/components/landing/OneTakeSection'), { ssr: false })
const DemocratizationSection = dynamic(() => import('./components/DemocratizationSection').then(m => m.DemocratizationSection), { ssr: false })
const HowItWorks = dynamic(() => import('./components/HowItWorks').then(m => m.HowItWorks), { ssr: false })
const FrameAnchoredSection = dynamic(() => import('@/components/landing/FrameAnchoredSection'), { ssr: false })
const FeatureHighlight = dynamic(() => import('./components/FeatureHighlight').then(m => m.FeatureHighlight), { ssr: false })
const ProsumerEconomySection = dynamic(() => import('@/components/landing/ProsumerEconomySection'), { ssr: false })
const Pricing = dynamic(() => import('./components/Pricing').then(m => m.Pricing), { ssr: false })
const FAQ = dynamic(() => import('./components/FAQ').then(m => m.FAQ), { ssr: false })
const FloatingNav = dynamic(() => import('@/components/landing/FloatingNav'), { ssr: false })
import { FinalCTA } from './components/FinalCTA'
import { Footer } from './components/Footer'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Header />
      <FloatingNav />
      <HeroSection />
      <TrustSignals />
      <SocialProof />
      <ProblemSolution />
      {/* Value Proposition Flow: Problem → Solution → How → Technical → Market */}
      <SlotMachineSection />
      <FinancialFirewallSection />
      <OneTakeSection />
      <DemocratizationSection />
      <HowItWorks />
      <FrameAnchoredSection />
      <FeatureHighlight />
      <ProsumerEconomySection />
      <Pricing />
      <FAQ />
      <FinalCTA />
      <Footer />
    </div>
  )
}
