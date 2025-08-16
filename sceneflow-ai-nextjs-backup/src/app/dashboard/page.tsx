'use client'

import { HeroBanner } from '@/components/dashboard/HeroBanner'
import { Launchpad } from '@/components/dashboard/Launchpad'
import { StudioUtilities } from '@/components/dashboard/StudioUtilities'
import { CreditStatus } from '@/components/dashboard/CreditStatus'
import { ProjectHub } from '@/components/dashboard/ProjectHub'

export default function DashboardPage() {
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Hero Banner */}
      <HeroBanner userName="Demo Creator" />
      
      {/* Quick Actions Launchpad */}
      <Launchpad />
      
      {/* Studio Utilities */}
      <StudioUtilities />
      
      {/* Credit Status */}
      <CreditStatus />
      
      {/* Project Hub */}
      <ProjectHub />
    </div>
  )
}
