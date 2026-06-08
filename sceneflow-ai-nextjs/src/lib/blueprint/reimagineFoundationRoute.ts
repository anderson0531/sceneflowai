import type { ReimagineFoundationField } from '@/components/vision/ReimagineFoundationDialog'

export function buildBlueprintReimagineUrl(input: {
  blueprintProjectId: string
  productionProjectId: string
  focus?: ReimagineFoundationField
}): string {
  const params = new URLSearchParams({
    reimagine: 'foundation',
    returnProjectId: input.productionProjectId,
  })
  if (input.focus) params.set('focus', input.focus)
  return `/dashboard/studio/${input.blueprintProjectId}?${params.toString()}`
}

export function resolveBlueprintProjectId(metadata: Record<string, unknown> | null | undefined): string | null {
  if (!metadata) return null
  const sourceId = metadata.sourceBlueprintProjectId
  if (typeof sourceId === 'string' && sourceId.trim()) return sourceId.trim()
  return null
}
