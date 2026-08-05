'use client'

import TopProgressBar from '@/components/ui/TopProgressBar'
import { useBlueprintTtsContext } from '@/contexts/BlueprintTtsContext'

/** Top-of-page progress while blueprint voice narration is generating. */
export function BlueprintTtsProgressBar() {
  const { generationProgress } = useBlueprintTtsContext()

  if (!generationProgress) return null

  const pct =
    generationProgress.total > 0
      ? Math.round((generationProgress.current / generationProgress.total) * 100)
      : 0

  return <TopProgressBar visible progress={pct} />
}
