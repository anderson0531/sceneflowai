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
  /**
   * Language the revision must be authored in. When omitted the studio uses
   * the project's content-stamped locale, or English.
   */
  storyLocale?: string
  /** Prefill the Assistant intent field. */
  initialIntent?: string
  /**
   * Full-balance rewrite into English: prefill the fixed intent, force
   * storyLocale=en, and start the job when the dialog opens.
   */
  rewriteToEnglish?: boolean
}
