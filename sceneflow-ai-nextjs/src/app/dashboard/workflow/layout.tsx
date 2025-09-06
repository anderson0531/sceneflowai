import { WorkflowNavigator } from '@/components/workflow/WorkflowNavigator'

export default function WorkflowLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <WorkflowNavigator />
      {children}
    </>
  )
}
