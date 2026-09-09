/**
 * Flagship production listen-only shares for the landing pipeline walk.
 * Empty values show placeholder cards — do not reuse expired review links.
 */

export const PRODUCTION_PIPELINE_DEMO = {
  blueprintShareToken: '',
  scriptResonanceShareToken: '',
  screeningRoomSlug: '',
} as const

export type PipelineDemoStageId = 'blueprint' | 'script-ar' | 'screening-room'

export const PIPELINE_DEMO_STAGES: PipelineDemoStageId[] = [
  'blueprint',
  'script-ar',
  'screening-room',
]

export function getPipelineDemoBlueprintHref(): string | null {
  const token = PRODUCTION_PIPELINE_DEMO.blueprintShareToken.trim()
  return token ? `/blueprint/share/${encodeURIComponent(token)}` : null
}

export function getPipelineDemoScriptARHref(): string | null {
  const token = PRODUCTION_PIPELINE_DEMO.scriptResonanceShareToken.trim()
  return token ? `/share/script-resonance/${encodeURIComponent(token)}` : null
}

export function getPipelineDemoScreeningHref(): string | null {
  const slug = PRODUCTION_PIPELINE_DEMO.screeningRoomSlug.trim()
  return slug ? `/share/screening-room/${encodeURIComponent(slug)}` : null
}

export function getPipelineDemoHref(stage: PipelineDemoStageId): string | null {
  switch (stage) {
    case 'blueprint':
      return getPipelineDemoBlueprintHref()
    case 'script-ar':
      return getPipelineDemoScriptARHref()
    case 'screening-room':
      return getPipelineDemoScreeningHref()
  }
}

export function getPipelineDemoNextStage(
  stage: PipelineDemoStageId
): PipelineDemoStageId | null {
  const index = PIPELINE_DEMO_STAGES.indexOf(stage)
  if (index < 0 || index >= PIPELINE_DEMO_STAGES.length - 1) return null
  return PIPELINE_DEMO_STAGES[index + 1] ?? null
}

export function matchPipelineDemoStage(tokenOrSlug: string): PipelineDemoStageId | null {
  const value = tokenOrSlug.trim()
  if (!value) return null
  if (
    PRODUCTION_PIPELINE_DEMO.blueprintShareToken &&
    value === PRODUCTION_PIPELINE_DEMO.blueprintShareToken
  ) {
    return 'blueprint'
  }
  if (
    PRODUCTION_PIPELINE_DEMO.scriptResonanceShareToken &&
    value === PRODUCTION_PIPELINE_DEMO.scriptResonanceShareToken
  ) {
    return 'script-ar'
  }
  if (
    PRODUCTION_PIPELINE_DEMO.screeningRoomSlug &&
    value === PRODUCTION_PIPELINE_DEMO.screeningRoomSlug
  ) {
    return 'screening-room'
  }
  return null
}
