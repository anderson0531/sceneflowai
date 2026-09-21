'use client'

import { TrendingDown } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'
import { recommendationText } from '@/lib/script/audienceResonance/highImpact'

export function HighImpactSceneBanner({
  recommendations,
  onReview,
}: {
  recommendations: unknown[]
  onReview: () => void
}) {
  const tStudio = useTranslations('production.studio')
  const count = recommendations.length
  if (count === 0) return null

  const firstText = recommendationText(recommendations[0]).trim()
  const extraCount = count - 1

  return (
    <div
      role="status"
      data-testid="high-impact-scene-banner"
      className="mt-2 mb-1 flex flex-wrap items-start justify-between gap-3 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-rose-100">
          <TrendingDown className="h-3.5 w-3.5 shrink-0 text-rose-300" />
          {tStudio('highImpactBannerTitle')}
        </p>
        <p className="mt-1 text-[11px] leading-relaxed text-rose-100/80">
          {tStudio('highImpactBannerBody', { count })}
        </p>
        {firstText ? (
          <p className="mt-1 text-xs leading-relaxed text-rose-50/90 line-clamp-3">
            {firstText}
            {extraCount > 0 ? (
              <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-wide text-rose-200/80">
                {tStudio('highImpactMoreCount', { count: extraCount })}
              </span>
            ) : null}
          </p>
        ) : null}
      </div>
      <Button
        type="button"
        size="sm"
        onClick={(e) => {
          e.stopPropagation()
          onReview()
        }}
        className="h-7 shrink-0 text-xs bg-rose-500 text-white border-rose-400 hover:bg-rose-400 hover:border-rose-300"
      >
        {tStudio('highImpactReview')}
      </Button>
    </div>
  )
}
