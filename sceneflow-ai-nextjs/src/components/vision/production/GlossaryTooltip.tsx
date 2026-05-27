'use client'

import React from 'react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { glossaryTooltip, PRODUCTION_GLOSSARY } from '@/lib/production/productionGlossary'
import { cn } from '@/lib/utils'
import { HelpCircle } from 'lucide-react'

type GlossaryKey = keyof typeof PRODUCTION_GLOSSARY

interface GlossaryTooltipProps {
  term: GlossaryKey
  children?: React.ReactNode
  className?: string
  side?: 'top' | 'right' | 'bottom' | 'left'
}

export function GlossaryTooltip({
  term,
  children,
  className,
  side = 'top',
}: GlossaryTooltipProps) {
  const entry = PRODUCTION_GLOSSARY[term]
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn('inline-flex items-center gap-1 cursor-help', className)}>
            {children ?? entry.term}
            <HelpCircle className="w-3 h-3 opacity-50" aria-hidden />
          </span>
        </TooltipTrigger>
        <TooltipContent side={side} className="max-w-xs text-xs">
          {glossaryTooltip(term)}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
