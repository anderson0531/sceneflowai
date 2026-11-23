import React, { Suspense } from 'react'
import type { Metadata } from 'next'
import { KeepsakeCinemaStorefront } from '@/components/showcase/KeepsakeCinemaStorefront'

export const metadata: Metadata = {
  title: 'Keepsake Cinema — Same-Day Express 4K Milestone & Life Films | Powered by SceneFlow Studio',
  description:
    'Live White-Label Reference Storefront powered by SceneFlow Studio in 7 languages. Order a $29 Storyboard Blueprint Pass and receive a Same-Day Express 4K Cinema Film for family legacies, weddings, graduations, retirements, real estate, or brands.',
}

export default function ShowcaseStorefrontPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#06080E] flex items-center justify-center text-slate-300 text-sm">
          Loading Keepsake Cinema...
        </div>
      }
    >
      <KeepsakeCinemaStorefront />
    </Suspense>
  )
}
