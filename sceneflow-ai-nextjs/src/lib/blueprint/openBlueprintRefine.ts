import type {
  BlueprintAudienceRecommendation,
  BlueprintFixSection,
} from '@/lib/types/audienceResonance'

export type OpenBlueprintRefineOptions = {
  resonanceRecommendations?: BlueprintAudienceRecommendation[]
  /** Section focus when opening from a section pencil */
  initialActiveTab?: string
  initialScope?: BlueprintFixSection | 'all'
  /** Called after variant patch is applied to the guide store (e.g. mark AR recs applied). */
  onApplyExtra?: (patch: Record<string, unknown>) => void
}
