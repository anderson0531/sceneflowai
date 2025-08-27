import React from 'react'
import { DashboardHeader } from './components/DashboardHeader'
import { WorkflowNavigation } from '@/components/workflow/WorkflowNavigation'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader />
      
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar - Workflow Navigation */}
          <div className="lg:col-span-1">
            <div className="sticky top-6">
              <WorkflowNavigation />
            </div>
          </div>
          
          {/* Main Content Area */}
          <div className="lg:col-span-3">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}





