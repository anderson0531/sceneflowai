'use client'

import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

const CLAMP_CLASS = {
  2: 'line-clamp-2',
  3: 'line-clamp-3',
} as const

const SHORT_ROLE_LABELS = new Set([
  'lead',
  'supporting',
  'minor',
  'character',
  'narrator',
  'protagonist',
  'antagonist',
  'background',
])

/** One-word catalog labels stay inline; story-role sentences get a clamp + Show more. */
export function isShortCharacterRole(role?: string | null): boolean {
  const trimmed = role?.trim() ?? ''
  if (!trimmed) return true
  if (SHORT_ROLE_LABELS.has(trimmed.toLowerCase())) return true
  return trimmed.split(/\s+/).length <= 1
}

export function ExpandableText({
  text,
  lines = 3,
  className = '',
  empty,
  onTextClick,
}: {
  text?: string | null
  lines?: 2 | 3
  className?: string
  empty?: ReactNode
  onTextClick?: (event: MouseEvent<HTMLParagraphElement>) => void
}) {
  const trimmed = text?.trim() ?? ''
  const [expanded, setExpanded] = useState(false)
  const [overflows, setOverflows] = useState(trimmed.length > 80)
  const ref = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el || expanded) return
    setOverflows(el.scrollHeight > el.clientHeight + 1 || trimmed.length > 80)
  }, [trimmed, expanded, lines])

  if (!trimmed) {
    return empty ? <p className={className}>{empty}</p> : null
  }

  return (
    <div>
      <p
        ref={ref}
        className={`${className} ${expanded ? '' : CLAMP_CLASS[lines]}`.trim()}
        onClick={onTextClick}
      >
        {trimmed}
      </p>
      {overflows ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            setExpanded((open) => !open)
          }}
          className="flex items-center gap-1 mt-0.5 text-[10px] font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
        >
          {expanded ? (
            <>
              <span>Show less</span>
              <ChevronUp className="w-3 h-3" />
            </>
          ) : (
            <>
              <span>Show more</span>
              <ChevronDown className="w-3 h-3" />
            </>
          )}
        </button>
      ) : null}
    </div>
  )
}
