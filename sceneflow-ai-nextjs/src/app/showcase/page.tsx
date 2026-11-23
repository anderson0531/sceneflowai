import type { Metadata } from 'next'
import { KeepsakeCinemaStorefront } from '@/components/showcase/KeepsakeCinemaStorefront'

export const metadata: Metadata = {
  title: 'Keepsake Cinema — Same-Day Express 4K Milestone & Life Films | Powered by SceneFlow Studio',
  description:
    'Live White-Label Reference Storefront powered by SceneFlow Studio. Order a $29 Storyboard Blueprint Pass and receive a Same-Day Express 4K Cinema Film for family legacies, weddings, graduations, retirements, real estate, or brands.',
}

export default function ShowcaseStorefrontPage() {
  return <KeepsakeCinemaStorefront />
}
