'use client'

// Landing page with dedicated Header component
import dynamic from 'next/dynamic'
import { Header } from './components/Header'
import { HeroSection } from './components/HeroSection'
import { TrustSignals } from './components/TrustSignals'
import { SocialProof } from './components/SocialProof'
const ProblemSolution = dynamic(() => import('./components/ProblemSolution').then(m => m.ProblemSolution), { ssr: false })
const DemocratizationSection = dynamic(() => import('./components/DemocratizationSection').then(m => m.DemocratizationSection), { ssr: false })
const HowItWorks = dynamic(() => import('./components/HowItWorks').then(m => m.HowItWorks), { ssr: false })
const FeatureHighlight = dynamic(() => import('./components/FeatureHighlight').then(m => m.FeatureHighlight), { ssr: false })
const TargetAudience = dynamic(() => import('./components/TargetAudience').then(m => m.TargetAudience), { ssr: false })
const Pricing = dynamic(() => import('./components/Pricing').then(m => m.Pricing), { ssr: false })
const FAQ = dynamic(() => import('./components/FAQ').then(m => m.FAQ), { ssr: false })
import { FinalCTA } from './components/FinalCTA'
import { Footer } from './components/Footer'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Header />
      <HeroSection />
      <TrustSignals />
      <SocialProof />
      <ProblemSolution />
      <DemocratizationSection />
      <HowItWorks />
      <FeatureHighlight />
      <TargetAudience />
      <Pricing />
      <FAQ />
      <FinalCTA />
      <Footer />
    </div>
  )
}
