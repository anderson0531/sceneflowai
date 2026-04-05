import type { ArbitrageHeatMapData, LanguageOpportunity } from '@/lib/visionary/types'

/**
 * When the user picks target regions up front, keep only those markets (one best row per code)
 * and align topRegions with the same set. Falls back to the original map if nothing matches.
 */
export function narrowArbitrageToTargetRegions(
  arbitrageMap: ArbitrageHeatMapData,
  targetRegions: string[] | undefined | null
): ArbitrageHeatMapData {
  if (!targetRegions?.length || !arbitrageMap?.opportunities?.length) {
    return arbitrageMap
  }

  const codes = targetRegions.map((c) => String(c).toUpperCase()).filter(Boolean)
  const opps = arbitrageMap.opportunities

  const byRegion = new Map<string, LanguageOpportunity[]>()
  for (const o of opps) {
    const r = String(o.region || '').toUpperCase()
    if (!r) continue
    if (!byRegion.has(r)) byRegion.set(r, [])
    byRegion.get(r)!.push(o)
  }

  const ordered: LanguageOpportunity[] = []
  for (const code of codes) {
    const list = byRegion.get(code)
    if (!list?.length) continue
    const best = [...list].sort(
      (a, b) => (b.arbitrageScore ?? 0) - (a.arbitrageScore ?? 0)
    )[0]
    ordered.push(best)
  }

  if (ordered.length === 0) {
    return arbitrageMap
  }

  const topFromModel = arbitrageMap.topRegions || []
  const filteredTop = topFromModel.filter((tr) =>
    codes.includes(String(tr.region || '').toUpperCase())
  )

  const topRegions =
    filteredTop.length > 0
      ? [...filteredTop].sort(
          (a, b) =>
            codes.indexOf(String(a.region).toUpperCase()) -
            codes.indexOf(String(b.region).toUpperCase())
        )
      : ordered.map((o) => ({
          region: o.region,
          regionName: o.regionName,
          totalArbitrageScore: o.arbitrageScore ?? 0,
          topLanguages: [o.languageName].filter(Boolean),
        }))

  return {
    ...arbitrageMap,
    opportunities: ordered,
    topRegions,
  }
}
