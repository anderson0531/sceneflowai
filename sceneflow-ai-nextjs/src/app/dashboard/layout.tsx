'use client'
export const dynamic = 'force-dynamic'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-full overflow-hidden">
      {children}
    </div>
  )
}
