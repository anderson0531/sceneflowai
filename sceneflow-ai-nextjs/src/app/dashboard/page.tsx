'use client'

import { HeroBanner } from './components/HeroBanner'
import { Launchpad } from './components/Launchpad'
import { StudioUtilities } from './components/StudioUtilities'
import { CreditStatus } from './components/CreditStatus'
import { ProjectHub } from './components/ProjectHub'

export default function DashboardPage() {
  return (
    <section className="max-w-7xl mx-auto p-4 sm:p-8 space-y-8">
      <HeroBanner userName="Demo User" />
      <Launchpad />
      <StudioUtilities />
      <CreditStatus />
      <ProjectHub />
    </section>
  )
}
