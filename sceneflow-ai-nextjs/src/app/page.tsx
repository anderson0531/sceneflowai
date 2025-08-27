'use client'

import { useEffect } from 'react'
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
import { useAuth } from '@/contexts/AuthContext'

export default function HomePage() {
  const { isAuthenticated, isLoading } = useAuth()

  useEffect(() => {
    // Redirect authenticated users to dashboard
    if (isAuthenticated && !isLoading) {
      window.location.href = '/dashboard/'
    }
  }, [isAuthenticated, isLoading])

  // Show loading or redirect if user is authenticated
  if (isLoading) {
    return (
      <div className="min-h-screen bg-sf-background text-sf-text-primary flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sf-primary mx-auto mb-4"></div>
          <p className="text-sf-text-secondary">Loading...</p>
        </div>
      </div>
    )
  }

  // Don't render landing page if user is authenticated (they'll be redirected)
  if (isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-sf-background text-sf-text-primary">
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
