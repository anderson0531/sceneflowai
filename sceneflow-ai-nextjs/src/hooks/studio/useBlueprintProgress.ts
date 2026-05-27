'use client'

import { useMemo } from 'react'
import {
  calculateBlueprintProgress,
  type BlueprintProgressInput,
} from '@/lib/blueprint/blueprintProgress'

export function useBlueprintProgress(input: BlueprintProgressInput) {
  return useMemo(() => calculateBlueprintProgress(input), [
    input.hasBlueprint,
    input.isGenerating,
    input.hasConceptInput,
    input.audienceDefinition,
    input.savedBlueprintAR,
    input.shareUrl,
    input.hasShareLink,
    input.heroRegenerated,
    input.audioPreviewed,
  ])
}
