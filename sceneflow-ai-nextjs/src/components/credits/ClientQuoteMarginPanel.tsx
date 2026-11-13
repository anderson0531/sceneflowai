'use client'

import React, { useMemo, useState } from 'react'
import { useLocale } from 'next-intl'
import { Briefcase, Check, ChevronDown, DollarSign, ShieldAlert } from 'lucide-react'
import {
  calculateClientQuoteMargin,
  SERVICE_PROVIDER_PRESETS,
  type FullProjectParameters,
  type ServiceVerticalPresetId,
} from '@/lib/credits/projectCalculator'
import {
  formatPortalCopy,
  resolveClientPortalLocale,
} from '@/lib/intake/clientPortalCopy'

interface ClientQuoteMarginPanelProps {
  baseProjectCredits: number
  hybridVideoShare: number
  onApplyPresetParams: (params: FullProjectParameters, presetId: ServiceVerticalPresetId) => void
  onChangeHybridVideoShare: (share: number) => void
  onApplyCreditCeiling?: (ceilingCredits: number, clientOrderMeta: Record<string, unknown>) => void
}

const PRESET_BUTTONS: Array<{ id: ServiceVerticalPresetId; label: string }> = [
  { id: 'hybrid_memoir_15m', label: '15m Hybrid Memoir ($300)' },
  { id: 'real_estate_tour_90s', label: '90s Real Estate Tour ($199)' },
  { id: 'education_module_5m', label: '5m Training Module ($399)' },
  { id: 'brand_story_2m', label: '2m Brand Story ($450)' },
]

export function ClientQuoteMarginPanel({
  baseProjectCredits,
  hybridVideoShare,
  onApplyPresetParams,
  onChangeHybridVideoShare,
  onApplyCreditCeiling,
}: ClientQuoteMarginPanelProps) {
  const rawLocale = useLocale()
  const locale = resolveClientPortalLocale(rawLocale)

  const [clientPriceUsd, setClientPriceUsd] = useState<number>(300)
  const [includedRounds, setIncludedRounds] = useState<number>(2)
  const [selectedPreset, setSelectedPreset] = useState<ServiceVerticalPresetId | null>(null)

  const analysis = useMemo(
    () =>
      calculateClientQuoteMargin({
        baseProjectCredits,
        clientPriceUsd,
        includedRevisionRounds: includedRounds,
      }),
    [baseProjectCredits, clientPriceUsd, includedRounds]
  )

  const handleSelectPreset = (id: ServiceVerticalPresetId) => {
    const spec = SERVICE_PROVIDER_PRESETS[id]
    setSelectedPreset(id)
    setClientPriceUsd(spec.suggestedRetailUsd)
    setIncludedRounds(spec.defaultRevisionRounds)
    onApplyPresetParams(spec.params, id)
  }

  return (
    <details className="group rounded-xl border border-purple-500/30 bg-purple-950/15 p-4">
      <summary className="cursor-pointer flex items-center justify-between gap-2 text-sm font-semibold text-purple-200">
        <span className="flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-purple-400" />
          {formatPortalCopy(locale, 'clientQuotePanelTitle')}
        </span>
        <ChevronDown className="w-4 h-4 text-purple-300 group-open:rotate-180 transition-transform" />
      </summary>

      <div className="mt-4 space-y-4">
        <p className="text-xs text-slate-400">
          {formatPortalCopy(locale, 'clientQuotePanelSubtitle')}
        </p>

        <div className="flex flex-wrap gap-2">
          {PRESET_BUTTONS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => handleSelectPreset(p.id)}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                selectedPreset === p.id
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              {formatPortalCopy(locale, 'clientRetailPrice')}
            </label>
            <div className="relative">
              <DollarSign className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="number"
                min={0}
                step={10}
                value={clientPriceUsd}
                onChange={(e) => setClientPriceUsd(Math.max(0, Number(e.target.value) || 0))}
                className="w-full rounded-lg bg-slate-900 border border-slate-700 pl-7 pr-3 py-1.5 text-sm text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">
              {formatPortalCopy(locale, 'includedRevisions')}
            </label>
            <input
              type="number"
              min={0}
              max={10}
              value={includedRounds}
              onChange={(e) =>
                setIncludedRounds(Math.min(10, Math.max(0, Number(e.target.value) || 0)))
              }
              className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-1.5 text-sm text-white"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between text-xs text-slate-300 mb-1">
            <span>{formatPortalCopy(locale, 'hybridAiVideoMix')}</span>
            <span className="font-semibold text-purple-300">
              {Math.round(hybridVideoShare * 100)}% AI Video /{' '}
              {100 - Math.round(hybridVideoShare * 100)}% Archival Photos
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={Math.round(hybridVideoShare * 100)}
            onChange={(e) => onChangeHybridVideoShare(Number(e.target.value) / 100)}
            className="w-full accent-purple-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-900/90 border border-slate-800 p-3">
          <div>
            <div className="text-[11px] text-slate-400">
              {formatPortalCopy(locale, 'estimatedSceneFlowCogs')}
            </div>
            <div className="text-base font-bold text-white">
              ${analysis.sceneFlowCogsUsd.toFixed(2)}
            </div>
            <div className="text-[11px] text-slate-500">
              {analysis.recommendedCreditCeiling.toLocaleString()} cr
            </div>
          </div>

          <div>
            <div className="text-[11px] text-slate-400">
              {formatPortalCopy(locale, 'estimatedNetProfit')}
            </div>
            <div
              className={`text-base font-bold ${
                analysis.healthyMargin ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              ${analysis.providerGrossProfitUsd.toFixed(2)} ({analysis.providerGrossMarginPercent}%)
            </div>
            {!analysis.healthyMargin && (
              <div className="text-[11px] text-amber-300 flex items-center gap-1 mt-0.5">
                <ShieldAlert className="w-3 h-3" />
                Suggested floor: ${analysis.suggestedRetailFloorUsd}
              </div>
            )}
          </div>
        </div>

        {onApplyCreditCeiling && (
          <button
            type="button"
            onClick={() =>
              onApplyCreditCeiling(analysis.recommendedCreditCeiling, {
                clientOrder: {
                  isClientProject: true,
                  clientPriceUsd,
                  maxFeedbackRounds: includedRounds,
                  creditBudgetCap: analysis.recommendedCreditCeiling,
                  enforceHardCap: true,
                },
              })
            }
            className="w-full rounded-lg bg-purple-600 hover:bg-purple-500 px-3 py-2 text-xs font-semibold text-white flex items-center justify-center gap-1.5 transition"
          >
            <Check className="w-3.5 h-3.5" />
            {formatPortalCopy(locale, 'applyProjectCeiling', {
              credits: analysis.recommendedCreditCeiling.toLocaleString(),
            })}
          </button>
        )}
      </div>
    </details>
  )
}
