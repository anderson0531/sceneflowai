'use client'

import { cn } from '@/lib/utils'

export interface ProductPageShellProps {
  children: React.ReactNode
  className?: string
  /** Default max-w-7xl content width */
  constrained?: boolean
}

export function ProductPageShell({
  children,
  className,
  constrained = true,
}: ProductPageShellProps) {
  return (
    <div className={cn('min-h-full bg-gray-950 text-white p-4 md:p-8', className)}>
      <div className={cn(constrained && 'max-w-7xl mx-auto')}>{children}</div>
    </div>
  )
}
