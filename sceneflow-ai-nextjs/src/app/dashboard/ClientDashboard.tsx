'use client'

import CueCommandCenter from './components/CueCommandCenter'
import { ProductionProjectsTable } from './components/ProductionProjectsTable'
import { PlanAndCreditsWidget } from './components/PlanAndCreditsWidget'
import { BYOKIntegrationStatus } from './components/BYOKIntegrationStatus'
import { ResourcesOverviewWidget } from './components/ResourcesOverviewWidget'

export default function ClientDashboard() {
  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        <CueCommandCenter />
        <div className="mt-6 md:mt-8">
          <PlanAndCreditsWidget />
        </div>
        <div className="mt-6 md:mt-8">
          <ProductionProjectsTable />
        </div>
        <div className="mt-6 md:mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
          <div className="space-y-6 md:space-y-8">
            <ResourcesOverviewWidget />
          </div>
          <div className="space-y-6 md:space-y-8">
            <BYOKIntegrationStatus />
          </div>
        </div>
      </div>
    </div>
  )
}
