import { WorkflowNavigator } from '@/components/workflow/WorkflowNavigator'

export default function WorkflowLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-sf-background text-sf-text-primary">
      <WorkflowNavigator />
      
      <main className="max-w-7xl mx-auto p-4 sm:p-8">
        {children}
      </main>
    </div>
  )
}
