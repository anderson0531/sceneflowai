'use client'

import { CueCommandCenter } from './components/CueCommandCenter'
import { ProductionProjectsTable } from './components/ProductionProjectsTable'
import { PlanAndCreditsWidget } from './components/PlanAndCreditsWidget'
import { BYOKIntegrationStatus } from './components/BYOKIntegrationStatus'
import { ResourcesOverviewWidget } from './components/ResourcesOverviewWidget'

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        
        {/* Section 1: Cue Command Center (Full Width, Focal Point) */}
        <CueCommandCenter />

               {/* Section 2: Dashboard Grid (2-Column Layout) */}
       <div className="mt-6 md:mt-8 grid grid-cols-1 xl:grid-cols-3 gap-6 md:gap-8">
         
         {/* Primary Workflow Area (2/3 width) */}
         <div className="xl:col-span-2">
           <ProductionProjectsTable />
         </div>

         {/* Status Sidebar (1/3 width) */}
         <div className="xl:col-span-1 space-y-6 md:space-y-8">
           <PlanAndCreditsWidget />
           <ResourcesOverviewWidget />
           <BYOKIntegrationStatus />
         </div>
         
       </div>
      </div>
    </div>
  )
}
