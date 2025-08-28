'use client'

import { HeroBanner } from './components/HeroBanner'
import { DashboardOverview } from './components/DashboardOverview'
import { CurrentPlan } from './components/CurrentPlan'
import { ProjectHub } from './components/ProjectHub'

export default function DashboardPage() {
  return (
    <section className="max-w-7xl mx-auto p-4 sm:p-8 space-y-8">
      <HeroBanner userName="Demo User" />
      <DashboardOverview />
      <CurrentPlan />
      <ProjectHub />
    </section>
  )
}
