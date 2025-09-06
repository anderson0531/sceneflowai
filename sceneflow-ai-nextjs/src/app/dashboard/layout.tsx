 'use client'

import { Header } from '@/components/layout/Header'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-sf-background text-white">
      {/* Global header always visible, including Spark Studio */}
      <Header />
      <div className="px-4 sm:px-6 lg:px-8 py-4">
        {children}
      </div>
    </div>
  )
}
