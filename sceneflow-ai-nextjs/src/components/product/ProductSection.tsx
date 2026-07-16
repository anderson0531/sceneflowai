'use client'

import { cn } from '@/lib/utils'

export interface ProductSectionProps {
  label: string
  children: React.ReactNode
  action?: React.ReactNode
  className?: string
}

export function ProductSection({ label, children, action, className }: ProductSectionProps) {
  return (
    <section className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between gap-2 px-1">
        <h2 className="text-xs font-medium uppercase tracking-wider text-gray-500">{label}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}
