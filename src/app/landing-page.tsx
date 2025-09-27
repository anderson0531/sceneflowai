'use client'

import { FinalCTA as CTA } from './components/FinalCTA'
import { FAQ } from './components/FAQ'
import { Footer } from './components/Footer'
import { Header } from './components/Header'
import { HowItWorks } from './components/HowItWorks'
import { Testimonials } from './components/Testimonials'
import { Features } from './components/Features'
import { SocialProof } from './components/SocialProof'
import { Waitlist } from './components/Waitlist'


export function LandingPage() {
  return (
    <div className="bg-gray-950 text-white">
      <Header />
      <main>
        <CTA />
        <SocialProof />
        <HowItWorks />
        <Features />
        <Testimonials />
        <FAQ />
        <Waitlist />
      </main>
      <Footer />
    </div>
  )
}
