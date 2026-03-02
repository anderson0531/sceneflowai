'use client'

import dynamic from 'next/dynamic'
import { Suspense } from 'react'

// Loading fallback
function LoadingFallback() {
  return (
    <div className="min-h-[200px] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

// Dynamically import evolution sections with no SSR
const EvolutionHero = dynamic(
  () => import('@/components/landing/EvolutionHero').then(mod => ({ default: mod.EvolutionHero })),
  { ssr: false, loading: LoadingFallback }
)

const PainPointsSection = dynamic(
  () => import('@/components/landing/PainPointsSection').then(mod => ({ default: mod.PainPointsSection })),
  { ssr: false, loading: LoadingFallback }
)

const SolutionSection = dynamic(
  () => import('@/components/landing/SolutionSection').then(mod => ({ default: mod.SolutionSection })),
  { ssr: false, loading: LoadingFallback }
)

const DifferentiatorsSection = dynamic(
  () => import('@/components/landing/DifferentiatorsSection').then(mod => ({ default: mod.DifferentiatorsSection })),
  { ssr: false, loading: LoadingFallback }
)

const EvolutionCTA = dynamic(
  () => import('@/components/landing/EvolutionCTA').then(mod => ({ default: mod.EvolutionCTA })),
  { ssr: false, loading: LoadingFallback }
)

// Import shared navigation components
const FloatingNav = dynamic(
  () => import('@/components/landing/FloatingNav').then(mod => ({ default: mod.FloatingNav })),
  { ssr: false }
)

const LandingFooter = dynamic(
  () => import('@/components/landing/LandingFooter').then(mod => ({ default: mod.LandingFooter })),
  { ssr: false }
)

/**
 * Evolution Landing Page
 * 
 * A focused landing page telling the SceneFlow AI evolution story
 * from the original Hookify AI concept to the production-ready platform.
 * 
 * Optimized for:
 * - Google Startup Application
 * - New subscriber conversion
 * - Investor pitch support
 */
export default function EvolutionLandingPage() {
  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <Suspense fallback={null}>
        <FloatingNav />
      </Suspense>

      {/* Hero Section - The Hook */}
      <Suspense fallback={<LoadingFallback />}>
        <EvolutionHero />
      </Suspense>

      {/* Pain Points - The Problem */}
      <Suspense fallback={<LoadingFallback />}>
        <PainPointsSection />
      </Suspense>

      {/* Solution - The Workflow */}
      <Suspense fallback={<LoadingFallback />}>
        <SolutionSection />
      </Suspense>

      {/* Differentiators - Why Us */}
      <Suspense fallback={<LoadingFallback />}>
        <DifferentiatorsSection />
      </Suspense>

      {/* CTA - The Ask */}
      <Suspense fallback={<LoadingFallback />}>
        <EvolutionCTA />
      </Suspense>

      {/* Footer */}
      <Suspense fallback={null}>
        <LandingFooter />
      </Suspense>
    </main>
  )
}
