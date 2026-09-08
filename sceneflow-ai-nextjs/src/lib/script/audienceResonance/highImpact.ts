/** Stable id matching `normalizeRecommendation` in scene-optimization.ts. */
export function recommendationId(rec: unknown, fallbackIndex = 0): string {
  if (typeof rec === 'string') {
    return `rec-${rec.substring(0, 30).replace(/\s+/g, '-').toLowerCase()}`
  }
  if (rec && typeof rec === 'object') {
    const item = rec as { id?: string; text?: string }
    if (typeof item.id === 'string' && item.id) return item.id
    if (typeof item.text === 'string' && item.text) {
      return `rec-${item.text.substring(0, 30).replace(/\s+/g, '-').toLowerCase()}`
    }
  }
  return `rec-${fallbackIndex}`
}

export function recommendationText(rec: unknown): string {
  if (typeof rec === 'string') return rec
  if (rec && typeof rec === 'object' && typeof (rec as { text?: string }).text === 'string') {
    return (rec as { text: string }).text
  }
  return ''
}

/** A recommendation is high-impact when priority is high or it deducts 10+ points. */
export function recommendationIsHighImpact(rec: unknown): boolean {
  if (!rec || typeof rec !== 'object') return false
  const item = rec as { priority?: string; pointsDeducted?: number }
  if (item.priority === 'high') return true
  return typeof item.pointsDeducted === 'number' && item.pointsDeducted >= 10
}

export function isRecommendationApplied(
  rec: unknown,
  appliedIds: string[] | undefined,
  fallbackIndex = 0
): boolean {
  if (!appliedIds || appliedIds.length === 0) return false
  return appliedIds.includes(recommendationId(rec, fallbackIndex))
}

export function sceneHasHighImpactIssue(scene: {
  recommendations?: unknown[]
  appliedRecommendationIds?: string[]
} | null | undefined): boolean {
  const recs = scene?.recommendations
  if (!Array.isArray(recs) || recs.length === 0) return false
  const applied = scene?.appliedRecommendationIds
  return recs.some((rec, i) => {
    if (isRecommendationApplied(rec, applied, i)) return false
    return recommendationIsHighImpact(rec)
  })
}

/** 0-based scene index of the first high-impact scene, or null. */
export function firstHighImpactSceneIndex(
  scenes: Array<{ sceneNumber?: number; recommendations?: unknown[]; appliedRecommendationIds?: string[] }>
): number | null {
  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i]
    if (!sceneHasHighImpactIssue(scene)) continue
    const n = scene.sceneNumber
    if (typeof n === 'number' && n > 0) return n - 1
    return i
  }
  return null
}

export type TopImpactSceneInput = {
  sceneNumber?: number
  sceneHeading?: string
  heading?: string | { text?: string }
  recommendations?: unknown[]
  appliedRecommendationIds?: string[]
  audienceAnalysis?: {
    recommendations?: unknown[]
    appliedRecommendationIds?: string[]
  }
}

export type TopImpactIssue = {
  recId: string
  rec: {
    text: string
    priority?: string
    pointsDeducted?: number
    category?: string
  }
  sceneIndex: number
  sceneNum: number
  heading: string
  applied: boolean
}

function headingFromScene(scene: TopImpactSceneInput, sceneNum: number): string {
  if (typeof scene.sceneHeading === 'string' && scene.sceneHeading) return scene.sceneHeading
  if (typeof scene.heading === 'string' && scene.heading) return scene.heading
  if (scene.heading && typeof scene.heading === 'object' && typeof scene.heading.text === 'string') {
    return scene.heading.text
  }
  return `Scene ${sceneNum}`
}

function recsFromScene(scene: TopImpactSceneInput): {
  recs: unknown[]
  appliedIds: string[]
} {
  if (Array.isArray(scene.recommendations) && scene.recommendations.length > 0) {
    return {
      recs: scene.recommendations,
      appliedIds: scene.appliedRecommendationIds || [],
    }
  }
  const analysis = scene.audienceAnalysis
  return {
    recs: analysis?.recommendations || [],
    appliedIds: analysis?.appliedRecommendationIds || scene.appliedRecommendationIds || [],
  }
}

/** Flatten scene recs with pointsDeducted > 0, sorted desc. Default top 5. */
export function collectTopImpactIssues(
  scenes: TopImpactSceneInput[],
  options?: { excludeApplied?: boolean; limit?: number }
): TopImpactIssue[] {
  const excludeApplied = options?.excludeApplied !== false
  const limit = options?.limit ?? 5
  const all: TopImpactIssue[] = []

  scenes.forEach((scene, index) => {
    const { recs, appliedIds } = recsFromScene(scene)
    const sceneNum =
      typeof scene.sceneNumber === 'number' && scene.sceneNumber > 0 ? scene.sceneNumber : index + 1
    const heading = headingFromScene(scene, sceneNum)

    recs.forEach((raw, recIndex) => {
      if (!raw || typeof raw !== 'object') return
      const rec = raw as {
        text?: string
        priority?: string
        pointsDeducted?: number
        category?: string
      }
      if (typeof rec.pointsDeducted !== 'number' || rec.pointsDeducted <= 0) return
      const recId = recommendationId(raw, recIndex)
      const applied = appliedIds.includes(recId)
      if (excludeApplied && applied) return
      all.push({
        recId,
        rec: {
          text: rec.text || '',
          priority: rec.priority,
          pointsDeducted: rec.pointsDeducted,
          category: rec.category,
        },
        sceneIndex: sceneNum - 1,
        sceneNum,
        heading,
        applied,
      })
    })
  })

  all.sort((a, b) => (b.rec.pointsDeducted || 0) - (a.rec.pointsDeducted || 0))
  return limit > 0 ? all.slice(0, limit) : all
}

/** Keep applied ids that still match the new rec set by id or text. */
export function preserveAppliedRecommendationIds(
  previous:
    | { recommendations?: unknown[]; appliedRecommendationIds?: string[] }
    | null
    | undefined,
  nextRecs: unknown[]
): string[] {
  const prevApplied = previous?.appliedRecommendationIds || []
  if (prevApplied.length === 0) return []

  const prevRecs = previous?.recommendations || []
  const prevIdToText = new Map<string, string>()
  prevRecs.forEach((rec, i) => {
    prevIdToText.set(recommendationId(rec, i), recommendationText(rec).trim().toLowerCase())
  })

  const nextIds = new Set(nextRecs.map((rec, i) => recommendationId(rec, i)))
  const nextTexts = new Set(
    nextRecs.map((rec) => recommendationText(rec).trim().toLowerCase()).filter(Boolean)
  )

  return prevApplied.filter((id) => {
    if (nextIds.has(id)) return true
    const text = prevIdToText.get(id)
    return Boolean(text && nextTexts.has(text))
  })
}

export function mergeAppliedRecommendationIds(
  existing: string[] | undefined,
  toAdd: string[]
): string[] {
  const next = new Set(existing || [])
  for (const id of toAdd) {
    if (id) next.add(id)
  }
  return Array.from(next)
}
