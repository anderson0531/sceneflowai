import { WorkflowTabs } from '@/components/workflow/WorkflowTabs'

export default function WorkflowLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <WorkflowTabs />
      {children}
    </>
  )
}
