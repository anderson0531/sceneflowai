'use client'

import { CueCommandBar } from './components/CueCommandBar'
import { BudgetHealthWidget } from './components/BudgetHealthWidget'
import { ActiveProjectsContainer } from './components/ActiveProjectsContainer'
import { SpendingAnalyticsWidget } from './components/SpendingAnalyticsWidget'
import { QuickActionsGrid } from './components/QuickActionsGrid'
import { BYOKIntegrationStatus } from './components/BYOKIntegrationStatus'

export default function ClientDashboard() {
  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Row 1: Cue Command Bar */}
        <CueCommandBar />
        
        {/* Row 2: Budget Health Widget */}
        <BudgetHealthWidget 
          availableCredits={5400}
          usedCredits={2100}
          monthlyCredits={7500}
          projectedRequired={3200}
          estimatedCostUSD={32}
          projectsNearLimit={3}
        />
        
        {/* Row 3: Active Projects with Scores & Next Steps */}
        <ActiveProjectsContainer />
        
        {/* Row 4: Analytics + Quick Actions Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SpendingAnalyticsWidget />
          <QuickActionsGrid />
        </div>
        
        {/* Row 5: BYOK Status */}
        <BYOKIntegrationStatus />
      </div>
    </div>
  )
}
