'use client'

import { Header } from './components/Header'
import { HeroSection } from './components/HeroSection'
import { ProblemSolution } from './components/ProblemSolution'
import { HowItWorks } from './components/HowItWorks'
import { FeatureHighlight } from './components/FeatureHighlight'
import { TargetAudience } from './components/TargetAudience'
import { Pricing } from './components/Pricing'
import { FAQ } from './components/FAQ'
import { FinalCTA } from './components/FinalCTA'
import { Footer } from './components/Footer'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Header />
      <HeroSection />
      <ProblemSolution />
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
