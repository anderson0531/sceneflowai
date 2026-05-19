'use client'

import React from 'react'
import { Globe, Users, GraduationCap, Building2, UserRound } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  type AudienceTargetProfile,
  type AudienceIntent,
  type TargetAgeRange,
  REGION_OPTIONS,
  AGE_RANGE_OPTIONS,
  GENDER_OPTIONS,
  EDUCATION_OPTIONS,
  COMMUNITY_OPTIONS,
  formatTargetAudienceForPrompt,
  normalizeAudienceIntent,
  ageRangeToDemographic,
} from '@/lib/types/audienceResonance'

type TargetField = keyof AudienceTargetProfile

interface TargetAudienceSelectorProps {
  value: AudienceTargetProfile
  onChange: (field: TargetField, value: string) => void
  variant?: 'default' | 'compact'
  className?: string
  showSummary?: boolean
}

function ChipGroup<T extends string>({
  options,
  value,
  onSelect,
  columns = 2,
}: {
  options: { value: T; label: string }[]
  value: T
  onSelect: (v: T) => void
  columns?: 2 | 3 | 4
}) {
  const colClass =
    columns === 4
      ? 'grid-cols-2 sm:grid-cols-4'
      : columns === 3
        ? 'grid-cols-2 sm:grid-cols-3'
        : 'grid-cols-2'

  return (
    <div className={cn('grid gap-1.5', colClass)}>
      {options.map((opt) => {
        const selected = value === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onSelect(opt.value)}
            className={cn(
              'rounded-lg border px-2.5 py-2 text-left text-xs font-medium transition-all',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50',
              selected
                ? 'border-cyan-500/60 bg-cyan-500/15 text-cyan-100 shadow-sm shadow-cyan-500/10'
                : 'border-slate-700/60 bg-slate-800/40 text-slate-300 hover:border-slate-500 hover:bg-slate-800/70'
            )}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

function FieldSection({
  icon,
  label,
  hint,
  children,
  compact,
}: {
  icon: React.ReactNode
  label: string
  hint?: string
  children: React.ReactNode
  compact?: boolean
}) {
  return (
    <div className={cn(compact ? 'space-y-1.5' : 'space-y-2')}>
      <div className="flex items-start gap-2">
        <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-800/80 text-slate-400">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            {label}
          </p>
          {hint ? <p className="text-[10px] text-slate-500 leading-snug">{hint}</p> : null}
        </div>
      </div>
      <div className="pl-8">{children}</div>
    </div>
  )
}

export function TargetAudienceSelector({
  value,
  onChange,
  variant = 'default',
  className,
  showSummary = true,
}: TargetAudienceSelectorProps) {
  const compact = variant === 'compact'
  const summaryIntent = normalizeAudienceIntent(value as Partial<AudienceIntent>)

  return (
    <div className={cn('space-y-4', compact && 'space-y-3', className)}>
      {showSummary ? (
        <p className="rounded-lg border border-slate-700/50 bg-slate-900/50 px-3 py-2 text-[11px] leading-relaxed text-slate-400">
          <span className="font-medium text-slate-300">Model context: </span>
          {formatTargetAudienceForPrompt(summaryIntent)}
        </p>
      ) : null}

      <FieldSection
        icon={<Globe className="h-3.5 w-3.5" />}
        label="Region"
        hint="Geographic market for cultural and distribution fit"
        compact={compact}
      >
        <ChipGroup
          options={REGION_OPTIONS}
          value={value.region}
          onSelect={(v) => onChange('region', v)}
          columns={compact ? 2 : 4}
        />
      </FieldSection>

      <FieldSection
        icon={<Users className="h-3.5 w-3.5" />}
        label="Age range"
        compact={compact}
      >
        <ChipGroup
          options={AGE_RANGE_OPTIONS}
          value={value.ageRange}
          onSelect={(v) => onChange('ageRange', v)}
          columns={compact ? 2 : 3}
        />
      </FieldSection>

      <FieldSection
        icon={<UserRound className="h-3.5 w-3.5" />}
        label="Gender"
        compact={compact}
      >
        <ChipGroup
          options={GENDER_OPTIONS}
          value={value.gender}
          onSelect={(v) => onChange('gender', v)}
          columns={2}
        />
      </FieldSection>

      <FieldSection
        icon={<GraduationCap className="h-3.5 w-3.5" />}
        label="Education"
        compact={compact}
      >
        <ChipGroup
          options={EDUCATION_OPTIONS}
          value={value.educationLevel}
          onSelect={(v) => onChange('educationLevel', v)}
          columns={compact ? 2 : 3}
        />
      </FieldSection>

      <FieldSection
        icon={<Building2 className="h-3.5 w-3.5" />}
        label="Community"
        hint="Urban, academic, family, professional, and more"
        compact={compact}
      >
        <ChipGroup
          options={COMMUNITY_OPTIONS}
          value={value.community}
          onSelect={(v) => onChange('community', v)}
          columns={compact ? 2 : 3}
        />
      </FieldSection>
    </div>
  )
}

export function applyTargetAudienceChange(
  intent: AudienceIntent,
  field: TargetField,
  value: string
): AudienceIntent {
  const next = { ...intent, [field]: value } as AudienceIntent
  if (field === 'ageRange') {
    next.targetDemographic = ageRangeToDemographic(value as TargetAgeRange)
  }
  return next
}
