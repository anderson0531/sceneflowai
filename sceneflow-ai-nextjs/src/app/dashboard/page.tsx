'use client'

import { DashboardHeader } from './components/DashboardHeader'
import { HeroBanner } from './components/HeroBanner'
import { Launchpad } from './components/Launchpad'
import { StudioUtilities } from './components/StudioUtilities'
import { CreditStatus } from './components/CreditStatus'
import { ProjectHub } from './components/ProjectHub'
import { CueAssistantWidget } from '@/components/dashboard/CueAssistantWidget'

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader />
      
      <main className="max-w-7xl mx-auto p-4 sm:p-8 space-y-8">
        <HeroBanner userName="Demo User" />
        <Launchpad />
        <StudioUtilities />
        <CreditStatus />
        <ProjectHub />
      </main>
      
      <CueAssistantWidget />
    </div>
  )
}
