'use client'

import React from 'react'
import { Clock, Film, Layers, Palette, Target } from 'lucide-react'

type Props = {
  title: string
  logline?: string
  heroImageUrl?: string
  genre?: string
  runtimeLabel?: string
  chapterCount?: number
  visualStyle?: string
  visionStatement?: string
  intendedImpact?: string
  accentColor?: string
}

export function BlueprintReviewHero({
  title,
  logline,
  heroImageUrl,
  genre,
  runtimeLabel,
  chapterCount,
  visualStyle,
  visionStatement,
  intendedImpact,
  accentColor,
}: Props) {
  const pills = [
    genre?.trim() ? { icon: Film, label: genre.trim() } : null,
    runtimeLabel?.trim() ? { icon: Clock, label: runtimeLabel.trim() } : null,
    typeof chapterCount === 'number' && chapterCount > 0
      ? {
          icon: Layers,
          label: `${chapterCount} ${chapterCount === 1 ? 'Chapter' : 'Chapters'}`,
        }
      : null,
    visualStyle?.trim() ? { icon: Palette, label: visualStyle.trim() } : null,
  ].filter(Boolean) as Array<{ icon: React.ComponentType<{ className?: string }>; label: string }>

  return (
    <div className="space-y-3">
      <div className="relative w-full aspect-[16/9] min-h-[240px] sm:min-h-[330px] max-h-[min(62vh,540px)] rounded-2xl overflow-hidden border border-gray-800/80 shadow-2xl shadow-black/50">
        {heroImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- blob/CDN URLs; avoids Image domain edge cases on share links
          <img
            src={heroImageUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-center"
            loading="eager"
            decoding="async"
          />
        ) : (
          <div
            className="absolute inset-0 bg-gradient-to-br from-purple-900/55 via-slate-900 to-gray-950"
            style={
              accentColor
                ? {
                    backgroundImage: `radial-gradient(circle at 20% 20%, ${accentColor}33 0%, transparent 55%), linear-gradient(135deg, rgba(15,23,42,0.96), rgba(3,7,18,1))`,
                  }
                : undefined
            }
            aria-hidden
          />
        )}

        {/* Top subtle vignette for metadata pills */}
        {pills.length > 0 && (
          <div className="absolute inset-x-0 top-0 p-4 sm:p-5 flex flex-wrap items-center gap-2 bg-gradient-to-b from-gray-950/75 via-gray-950/25 to-transparent">
            {pills.map((pill, idx) => {
              const Icon = pill.icon
              return (
                <span
                  key={`${pill.label}-${idx}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/55 backdrop-blur-md px-3 py-1 text-xs font-medium text-gray-100 shadow-sm"
                >
                  <Icon className="h-3.5 w-3.5 text-cyan-300 shrink-0" />
                  <span className="truncate max-w-[220px]">{pill.label}</span>
                </span>
              )
            })}
          </div>
        )}

        {/* Bottom legibility scrim */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[50%] sm:h-[44%] bg-gradient-to-t from-gray-950 via-gray-950/70 to-transparent"
          aria-hidden
        />
        <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6">
          <h1 className="sf-page-title drop-shadow-lg">{title}</h1>
          {logline?.trim() ? (
            <p className="mt-2 text-base sm:text-lg text-gray-200/95 italic leading-relaxed max-w-3xl drop-shadow-md line-clamp-3">
              {logline}
            </p>
          ) : null}
        </div>
      </div>

      {/* Confirmed Project Vision callout when captured during Client Intake */}
      {(visionStatement?.trim() || intendedImpact?.trim()) && (
        <div className="rounded-xl border border-emerald-500/25 bg-gradient-to-r from-emerald-950/40 via-slate-900/80 to-slate-900/80 px-4 py-3.5 flex items-start gap-3">
          <div className="h-8 w-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-0.5">
            <Target className="h-4 w-4 text-emerald-300" />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-300">
              Confirmed Project Vision
            </div>
            {visionStatement?.trim() ? (
              <p className="text-sm text-gray-100 leading-relaxed">
                {visionStatement.trim()}
              </p>
            ) : null}
            {intendedImpact?.trim() ? (
              <p className="text-xs text-emerald-200/85">
                <span className="font-semibold">Intended Impact:</span>{' '}
                {intendedImpact.trim()}
              </p>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}
