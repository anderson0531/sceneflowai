'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Sparkles,
  Eye,
  ChevronLeft,
  ChevronRight,
  Zap,
  Coins,
  MapPin,
  ExternalLink,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ScreenshotHotspot } from '@/config/help/helpAcademyConfig'

interface AnnotatedStudioScreenshotProps {
  screenshotSrc: string
  screenshotAlt: string
  hotspots: ScreenshotHotspot[]
  /** Initial hotspot number (1-based) to highlight */
  initialHotspotNumber?: number
  /** Compact layout for the slide-over JIT Help Drawer */
  compact?: boolean
  /** Callback when a live studio action is triggered (e.g., to close the JIT drawer) */
  onActionTriggered?: (hotspot: ScreenshotHotspot) => void
}

export function AnnotatedStudioScreenshot({
  screenshotSrc,
  screenshotAlt,
  hotspots,
  initialHotspotNumber = 1,
  compact = false,
  onActionTriggered,
}: AnnotatedStudioScreenshotProps) {
  const [activeNumber, setActiveNumber] = useState<number>(initialHotspotNumber)
  const [spotlightEnabled, setSpotlightEnabled] = useState<boolean>(true)

  useEffect(() => {
    setActiveNumber(initialHotspotNumber)
  }, [initialHotspotNumber, screenshotSrc])

  const activeHotspot =
    hotspots.find((h) => h.number === activeNumber) || hotspots[0]

  const handleStep = (delta: number) => {
    if (!hotspots.length) return
    const currentIndex = hotspots.findIndex((h) => h.number === activeNumber)
    const nextIndex = (currentIndex + delta + hotspots.length) % hotspots.length
    setActiveNumber(hotspots[nextIndex].number)
  }

  const handleTriggerAction = (hotspot: ScreenshotHotspot) => {
    if (hotspot.actionEvent && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(hotspot.actionEvent))
    }
    if (onActionTriggered) {
      onActionTriggered(hotspot)
    }
  }

  return (
    <div className="rounded-2xl border border-slate-700/80 bg-slate-950/90 overflow-hidden shadow-2xl">
      {/* Top Screenshot Chrome Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-slate-900/90 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30"
            title={`Interactive UI map with ${hotspots.length} clickable control hotspots`}
          >
            <MapPin className="w-3 h-3" />
            Interactive UI Map ({hotspots.length} Hotspots)
          </span>
          {!compact && (
            <span className="text-xs text-slate-400 hidden sm:inline">
              Click any numbered pin or button below to inspect controls
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSpotlightEnabled((v) => !v)}
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all border',
              spotlightEnabled
                ? 'bg-purple-500/20 text-purple-200 border-purple-500/40'
                : 'bg-slate-800/70 text-slate-400 border-slate-700 hover:text-slate-200'
            )}
            title="Toggle Spotlight X-Ray highlight around the active UI area"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Spotlight {spotlightEnabled ? 'On' : 'Off'}</span>
          </button>

          <div className="flex items-center rounded-lg border border-slate-700 bg-slate-800/60 overflow-hidden">
            <button
              type="button"
              onClick={() => handleStep(-1)}
              className="p-1 text-slate-300 hover:text-white hover:bg-slate-700/60 transition-colors"
              aria-label="Previous hotspot"
              title="Previous hotspot control"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span
              className="px-2 text-[11px] font-semibold text-slate-300"
              title={
                activeHotspot
                  ? `Hotspot ${activeHotspot.number} of ${hotspots.length}: ${activeHotspot.label}`
                  : undefined
              }
            >
              {activeHotspot ? `${activeHotspot.number}/${hotspots.length}` : '0/0'}
            </span>
            <button
              type="button"
              onClick={() => handleStep(1)}
              className="p-1 text-slate-300 hover:text-white hover:bg-slate-700/60 transition-colors"
              aria-label="Next hotspot"
              title="Next hotspot control"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Annotated Screenshot Viewport (16:9 Aspect Ratio) */}
      <div className="relative w-full aspect-[16/9] bg-slate-950 select-none overflow-hidden">
        <img
          src={screenshotSrc}
          alt={screenshotAlt}
          className="w-full h-full object-cover"
          draggable={false}
        />

        {/* Spotlight Highlight Box */}
        {spotlightEnabled && activeHotspot && (
          <div
            className="pointer-events-none absolute rounded-xl border-2 border-cyan-400 transition-all duration-300 ease-out"
            style={{
              left: `${activeHotspot.spotlight.left}%`,
              top: `${activeHotspot.spotlight.top}%`,
              width: `${activeHotspot.spotlight.width}%`,
              height: `${activeHotspot.spotlight.height}%`,
              boxShadow:
                '0 0 0 9999px rgba(2, 6, 23, 0.58), 0 0 28px 4px rgba(6, 182, 212, 0.45)',
            }}
          />
        )}

        {/* Numbered Hotspot Pins with Hover Tooltips */}
        {hotspots.map((hotspot) => {
          const isSelected = hotspot.number === activeNumber
          const tooltipText = `${hotspot.number}. ${hotspot.label} (${hotspot.locationTag}) — ${hotspot.summary}`
          return (
            <button
              key={hotspot.id}
              type="button"
              onClick={() => setActiveNumber(hotspot.number)}
              style={{
                left: `${hotspot.x}%`,
                top: `${hotspot.y}%`,
              }}
              aria-label={`Inspect hotspot ${hotspot.number}: ${hotspot.label}`}
              title={tooltipText}
              className={cn(
                'group absolute -translate-x-1/2 -translate-y-1/2 z-20 flex items-center justify-center rounded-full font-extrabold transition-all duration-200 focus:outline-none',
                compact ? 'w-7 h-7 text-xs' : 'w-8 h-8 text-xs sm:w-9 sm:h-9 sm:text-sm',
                isSelected
                  ? 'bg-cyan-400 text-slate-950 ring-4 ring-cyan-400/40 scale-110 shadow-lg shadow-cyan-500/50'
                  : 'bg-slate-900/95 text-white border-2 border-cyan-400/80 hover:bg-cyan-500 hover:text-slate-950 hover:scale-105 shadow-md'
              )}
            >
              {isSelected && (
                <span className="pointer-events-none absolute inset-0 rounded-full bg-cyan-400 animate-ping opacity-30" />
              )}
              <span className="relative">{hotspot.number}</span>

              {/* Visual Floating Hover Tooltip on Pin */}
              <span
                role="tooltip"
                className="pointer-events-none absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-150 z-30 whitespace-nowrap rounded-lg bg-slate-950/95 border border-cyan-500/50 px-2.5 py-1 text-[11px] font-bold text-cyan-200 shadow-xl"
              >
                {hotspot.number}. {hotspot.label}
              </span>
            </button>
          )
        })}
      </div>

      {/* Hotspot Selector Grid — Full Uncropped Labels + Tooltips */}
      <div
        className={cn(
          'grid gap-2 px-4 py-3 bg-slate-900/80 border-t border-slate-800',
          compact
            ? 'grid-cols-1 sm:grid-cols-2'
            : 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-4'
        )}
      >
        {hotspots.map((hotspot) => {
          const isSelected = hotspot.number === activeNumber
          const fullTooltip = `${hotspot.number}. ${hotspot.label} (${hotspot.locationTag}) — ${hotspot.summary}`
          return (
            <button
              key={hotspot.id}
              type="button"
              onClick={() => setActiveNumber(hotspot.number)}
              title={fullTooltip}
              aria-label={`${hotspot.number}. ${hotspot.label}`}
              className={cn(
                'group relative flex items-center gap-2 px-3 py-2 rounded-xl text-left text-[11px] sm:text-xs font-semibold leading-snug transition-all',
                isSelected
                  ? 'bg-cyan-500/20 text-cyan-100 border border-cyan-500/50 shadow-sm'
                  : 'bg-slate-800/60 text-slate-300 border border-slate-700/60 hover:text-white hover:bg-slate-800 hover:border-slate-600'
              )}
            >
              <span
                className={cn(
                  'w-5 h-5 rounded-full text-[11px] font-extrabold flex items-center justify-center flex-shrink-0 transition-colors',
                  isSelected
                    ? 'bg-cyan-400 text-slate-950'
                    : 'bg-slate-700 text-slate-200 group-hover:bg-cyan-500/30 group-hover:text-cyan-200'
                )}
              >
                {hotspot.number}
              </span>
              <span className="flex-1 break-words">{hotspot.label}</span>
            </button>
          )
        })}
      </div>

      {/* Active Hotspot Detailed Callout */}
      {activeHotspot && (
        <div className="p-4 sm:p-5 bg-gradient-to-br from-slate-900 via-slate-900/95 to-slate-950 border-t border-slate-800/80">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-2">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-cyan-400 text-slate-950 text-xs font-black">
                  {activeHotspot.number}
                </span>
                <h4 className="text-sm sm:text-base font-bold text-white">
                  {activeHotspot.label}
                </h4>
                <span
                  className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700"
                  title={`Screen location: ${activeHotspot.locationTag}`}
                >
                  {activeHotspot.locationTag}
                </span>
                {activeHotspot.creditNote && (
                  <span
                    className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-medium"
                    title={`Estimated credit usage: ${activeHotspot.creditNote}`}
                  >
                    <Coins className="w-3 h-3" />
                    {activeHotspot.creditNote}
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {activeHotspot.summary}
              </p>
            </div>

            {/* Optional 1-Click Live Studio Trigger */}
            {activeHotspot.actionLabel && (
              <div className="flex-shrink-0">
                {activeHotspot.actionHref ? (
                  <Link
                    href={activeHotspot.actionHref}
                    onClick={() => onActionTriggered?.(activeHotspot)}
                    title={`${activeHotspot.actionLabel} — ${activeHotspot.label}`}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-colors shadow-sm"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>{activeHotspot.actionLabel}</span>
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleTriggerAction(activeHotspot)}
                    title={`Trigger in studio: ${activeHotspot.actionLabel}`}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-colors shadow-sm"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>{activeHotspot.actionLabel}</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Pro Tip Footer inside Callout */}
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-500/10 border border-amber-500/25 px-3 py-2">
            <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-200/90">
              <strong className="text-amber-300 font-semibold">Studio Pro-Tip: </strong>
              {activeHotspot.proTip}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
