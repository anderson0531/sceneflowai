'use client'

import CueCommandCenter from './components/CueCommandCenter'
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

               {/* Section 2: Plan & Credits (Below Analytics, Above Projects) */}
               <div className="mt-6 md:mt-8">
                 <PlanAndCreditsWidget />
               </div>

               {/* Section 3: Recent Projects (Full Width) */}
               <div className="mt-6 md:mt-8">
                 <ProductionProjectsTable />
               </div>

               {/* Section 4: Important Status Cards (2-Column Layout) */}
               <div className="mt-6 md:mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                 
                 {/* Left Column: Production Resources */}
                 <div className="space-y-6 md:space-y-8">
                   <ResourcesOverviewWidget />
                 </div>

                 {/* Right Column: Video Generation (BYOK) */}
                 <div className="space-y-6 md:space-y-8">
                   <BYOKIntegrationStatus />
                 </div>
                 
               </div>
      </div>
    </div>
  )
}
