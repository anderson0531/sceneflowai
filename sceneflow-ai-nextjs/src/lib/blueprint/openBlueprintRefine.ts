import type { BlueprintAudienceRecommendation } from '@/lib/types/audienceResonance'

export type OpenBlueprintRefineOptions = {
  resonanceRecommendations?: BlueprintAudienceRecommendation[]
  initialActiveTab?: string
  /** Called after variant patch is applied to the guide store (e.g. mark AR recs applied). */
  onApplyExtra?: (patch: Record<string, unknown>) => void
}
