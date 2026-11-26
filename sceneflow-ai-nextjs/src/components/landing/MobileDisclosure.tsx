'use client'

import React, { useEffect, useId, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

const SHOW_HIDE_LABELS: Record<string, { show: string; hide: string }> = {
  en: { show: 'Show', hide: 'Hide' },
  es: { show: 'Mostrar', hide: 'Ocultar' },
  pt: { show: 'Mostrar', hide: 'Ocultar' },
  hi: { show: 'दिखाएँ', hide: 'छिपाएँ' },
  'zh-CN': { show: '展开', hide: '收起' },
  zh: { show: '展开', hide: '收起' },
  ar: { show: 'عرض', hide: 'إخفاء' },
  th: { show: 'แสดง', hide: 'ซ่อน' },
  ja: { show: '表示', hide: '閉じる' },
  ko: { show: '보기', hide: '숨기기' },
  de: { show: 'Anzeigen', hide: 'Ausblenden' },
  fr: { show: 'Afficher', hide: 'Masquer' },
  it: { show: 'Mostra', hide: 'Nascondi' },
  nl: { show: 'Tonen', hide: 'Verbergen' },
  ru: { show: 'Показать', hide: 'Скрыть' },
}

const ACCENT_STYLES = {
  cyan: {
    button:
      'border-cyan-500/30 bg-slate-900/85 hover:border-cyan-400/50 hover:bg-slate-900 text-white',
    pill: 'bg-cyan-500/15 text-cyan-200 border-cyan-400/30',
    chevron: 'text-cyan-300',
  },
  emerald: {
    button:
      'border-emerald-500/30 bg-slate-900/85 hover:border-emerald-400/50 hover:bg-slate-900 text-white',
    pill: 'bg-emerald-500/15 text-emerald-200 border-emerald-400/30',
    chevron: 'text-emerald-300',
  },
  amber: {
    button:
      'border-amber-500/30 bg-slate-900/85 hover:border-amber-400/50 hover:bg-slate-900 text-white',
    pill: 'bg-amber-500/15 text-amber-200 border-amber-400/30',
    chevron: 'text-amber-300',
  },
  indigo: {
    button:
      'border-indigo-500/30 bg-slate-900/85 hover:border-indigo-400/50 hover:bg-slate-900 text-white',
    pill: 'bg-indigo-500/15 text-indigo-200 border-indigo-400/30',
    chevron: 'text-indigo-300',
  },
  gold: {
    button:
      'border-[#DFB473]/30 bg-[#0D111C]/95 hover:border-[#DFB473]/55 hover:bg-[#111626] text-white',
    pill: 'bg-[#DFB473]/15 text-[#F0CB92] border-[#DFB473]/30',
    chevron: 'text-[#F0CB92]',
  },
} as const

export interface MobileDisclosureProps {
  title: string
  subtitle?: string
  badge?: string
  icon?: React.ReactNode
  locale?: string
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
  hashTargetId?: string
  testId?: string
  accent?: keyof typeof ACCENT_STYLES
  className?: string
  contentClassName?: string
  showLabel?: string
  hideLabel?: string
  children: React.ReactNode
}

/**
 * Progressive-disclosure wrapper for mobile screens (< md / 768px).
 * - On mobile (< md): collapses heavy secondary content behind a sleek, thumb-friendly toggle bar.
 * - On tablet/desktop (md+): the toggle bar is hidden (`md:hidden`) and children render normally (`md:block`).
 * - Keeps children mounted in the DOM so SEO, deep links, and automated tests stay intact with zero hydration flash.
 */
export function MobileDisclosure({
  title,
  subtitle,
  badge,
  icon,
  locale = 'en',
  defaultOpen = false,
  open,
  onOpenChange,
  hashTargetId,
  testId,
  accent = 'cyan',
  className,
  contentClassName,
  showLabel,
  hideLabel,
  children,
}: MobileDisclosureProps) {
  const reactId = useId()
  const panelId = `mobile-disclosure-${reactId}`
  const [internalOpen, setInternalOpen] = useState(defaultOpen)
  const isControlled = typeof open === 'boolean'
  const isOpen = isControlled ? open : internalOpen

  const setOpenState = (next: boolean) => {
    if (!isControlled) {
      setInternalOpen(next)
    }
    onOpenChange?.(next)
  }

  useEffect(() => {
    if (!hashTargetId || typeof window === 'undefined') return
    const checkHash = () => {
      const current = window.location.hash.replace(/^#/, '')
      if (current === hashTargetId) {
        setOpenState(true)
      }
    }
    const onCustomOpen = (event: Event) => {
      const targetId = (event as CustomEvent<string>).detail
      if (targetId === hashTargetId) {
        setOpenState(true)
      }
    }
    checkHash()
    window.addEventListener('hashchange', checkHash)
    window.addEventListener('sceneflow:open-mobile-disclosure', onCustomOpen)
    return () => {
      window.removeEventListener('hashchange', checkHash)
      window.removeEventListener('sceneflow:open-mobile-disclosure', onCustomOpen)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hashTargetId])

  const labels = SHOW_HIDE_LABELS[locale] ?? SHOW_HIDE_LABELS[locale.split('-')[0]] ?? SHOW_HIDE_LABELS.en
  const resolvedShow = showLabel ?? labels.show
  const resolvedHide = hideLabel ?? labels.hide
  const palette = ACCENT_STYLES[accent]

  return (
    <div className={className} data-testid={testId}>
      <button
        type="button"
        title={`${title} (${isOpen ? resolvedHide : resolvedShow})`}
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => setOpenState(!isOpen)}
        className={cn(
          'md:hidden flex w-full items-center justify-between gap-3 rounded-xl border px-3.5 py-3 text-start transition-colors cursor-pointer',
          palette.button
        )}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          {icon ? <span className="shrink-0">{icon}</span> : null}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-bold leading-snug text-white whitespace-normal break-words">
                {title}
              </span>
              {badge ? (
                <span
                  className={cn(
                    'inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold',
                    palette.pill
                  )}
                >
                  {badge}
                </span>
              ) : null}
            </div>
            {subtitle ? (
              <p className="!mb-0 mt-0.5 text-[11px] leading-snug text-slate-400 line-clamp-1">
                {subtitle}
              </p>
            ) : null}
          </div>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-slate-300">
          <span>{isOpen ? resolvedHide : resolvedShow}</span>
          <ChevronDown
            className={cn(
              'h-4 w-4 shrink-0 transition-transform duration-200',
              palette.chevron,
              isOpen && 'rotate-180'
            )}
            aria-hidden
          />
        </span>
      </button>

      <div
        id={panelId}
        data-mobile-disclosure-open={isOpen ? 'true' : 'false'}
        className={cn(contentClassName, isOpen ? 'mt-3 block' : 'hidden md:block')}
      >
        {children}
      </div>
    </div>
  )
}

export function openMobileDisclosureById(hashTargetId: string) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('sceneflow:open-mobile-disclosure', { detail: hashTargetId }))
}

export default MobileDisclosure
