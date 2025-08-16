import { WorkflowNavigator } from '@/components/workflow/WorkflowNavigator'
import { DashboardHeader } from '../components/DashboardHeader'

export default function WorkflowLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader />
      <WorkflowNavigator />
      
      <main className="max-w-7xl mx-auto p-4 sm:p-8">
        {children}
      </main>
    </div>
  )
}
