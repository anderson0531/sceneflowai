import { beatContentFingerprint, getSceneBeats } from '@/lib/script/beatMigration'
import type { SceneBeat } from '@/lib/script/segmentTypes'
import type { PolishRecommendation, PolishSceneInput, ScenePolishAnalysis } from './types'

export function polishAnalyzedAtMs(
  analysis: { analyzedAt?: string } | null | undefined
): number {
  if (!analysis?.analyzedAt) return 0
  const t = new Date(analysis.analyzedAt).getTime()
  return Number.isFinite(t) ? t : 0
}

/**
 * Keep the newer polishAnalysis so a SAVE-QUEUE PUT cannot wipe a background
 * job that finished while the client still held an older scene snapshot.
 */
export function pickNewerPolishAnalysis<T extends {
  analyzedAt?: string
  appliedRecommendationIds?: string[]
}>(
  incoming: T | null | undefined,
  existing: T | null | undefined
): T | undefined {
  if (!incoming && !existing) return undefined
  if (!incoming) return existing ?? undefined
  if (!existing) return incoming
  if (polishAnalyzedAtMs(existing) > polishAnalyzedAtMs(incoming)) {
    return existing
  }
  const incomingIds = incoming.appliedRecommendationIds
  const existingIds = existing.appliedRecommendationIds
  if ((!incomingIds || incomingIds.length === 0) && existingIds && existingIds.length > 0) {
    return { ...incoming, appliedRecommendationIds: existingIds }
  }
  return incoming
}

/** Beats + heading + description only — no frames, audio, or production media. */
export function slimPolishScene(
  scene: PolishSceneInput | null | undefined
): PolishSceneInput | null {
  if (!scene) return null
  const heading = polishSceneHeading(scene)
  const description = polishSceneDescription(scene)
  const keyProps = polishSceneKeyProps(scene)
  const beats = getSceneBeats(scene as Record<string, unknown>)
  const id = typeof scene.id === 'string' ? scene.id : undefined
  const sceneId = typeof scene.sceneId === 'string' ? scene.sceneId : undefined
  return {
    ...(id ? { id } : {}),
    ...(sceneId ? { sceneId } : {}),
    heading,
    visualDescription: description,
    sceneDirection: {
      sceneDescription: description,
      scene: { keyProps },
    },
    beats,
  }
}

export function polishSceneHeading(scene: PolishSceneInput | null | undefined): string {
  const heading = scene?.heading
  if (typeof heading === 'string' && heading.trim()) return heading.trim()
  if (heading && typeof heading === 'object' && typeof (heading as { text?: string }).text === 'string') {
    const text = (heading as { text: string }).text.trim()
    if (text) return text
  }
  return 'Untitled'
}

export function polishSceneDescription(scene: PolishSceneInput | null | undefined): string {
  const directed = scene?.sceneDirection?.sceneDescription
  if (typeof directed === 'string' && directed.trim()) return directed.trim()
  for (const value of [scene?.visualDescription, scene?.action, scene?.summary]) {
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return ''
}

export function polishSceneKeyProps(scene: PolishSceneInput | null | undefined): string[] {
  const props = scene?.sceneDirection?.scene?.keyProps
  if (!Array.isArray(props)) return []
  return props.filter((prop): prop is string => typeof prop === 'string' && prop.trim().length > 0)
}

function formatBeatDirection(beat: SceneBeat): string {
  const d = beat.beatDirection
  if (!d) return ''
  const parts: string[] = []
  if (Array.isArray(d.castInFrame)) {
    parts.push(`cast: ${d.castInFrame.length > 0 ? d.castInFrame.join(', ') : 'nobody on camera'}`)
  }
  if (d.blocking) parts.push(`blocking: ${d.blocking}`)
  if (d.emotion) parts.push(`emotion: ${d.emotion}`)
  if (d.gaze) parts.push(`gaze: ${d.gaze}`)
  if (d.keyProps && d.keyProps.length > 0) parts.push(`props: ${d.keyProps.join(', ')}`)
  if (d.propInteraction) parts.push(`prop-interaction: ${d.propInteraction}`)
  if (d.frozenMoment) parts.push(`frozen: ${d.frozenMoment}`)
  if (d.transition) parts.push(`trans: ${d.transition}`)
  return parts.length > 0 ? `\n     direction — ${parts.join(' • ')}` : ''
}

export function formatPolishBeat(beat: SceneBeat, index: number): string {
  const excluded = beat.excluded ? ' [EXCLUDED — do not flag issues on this beat]' : ''
  const direction = formatBeatDirection(beat)
  if (beat.kind === 'action') {
    return `${index + 1}. [beatId:${beat.beatId}] action${excluded}: ${beat.actionDescription ?? ''}${direction}`
  }
  return `${index + 1}. [beatId:${beat.beatId}] ${beat.kind}${excluded} ${beat.character ?? ''}: ${
    beat.line ?? ''
  }${direction}`
}

export function formatPolishBeats(scene: PolishSceneInput | null | undefined): string {
  const beats = getSceneBeats(scene as Record<string, unknown> | null)
  if (!beats.length) {
    return 'No beats yet — there is no beat timeline to polish.'
  }
  return beats.map((beat, index) => formatPolishBeat(beat, index)).join('\n')
}

export function formatPolishEdgeBeat(
  scene: PolishSceneInput | null | undefined,
  edge: 'first' | 'last'
): string {
  const beats = getSceneBeats(scene as Record<string, unknown> | null)
  if (!beats.length) return 'none'
  const index = edge === 'first' ? 0 : beats.length - 1
  return formatPolishBeat(beats[index], index)
}

/**
 * Content+direction fingerprint so Polish can tell when beats moved after analysis.
 * Includes prop/blocking fields AR never sees.
 */
export function scenePolishBeatFingerprint(scene: PolishSceneInput | null | undefined): string {
  const beats = getSceneBeats(scene as Record<string, unknown> | null)
  return beats
    .map((beat, index) => {
      const d = beat.beatDirection
      return [
        index,
        beat.excluded ? 'x' : '',
        beatContentFingerprint(beat),
        (d?.keyProps || []).join(','),
        d?.propInteraction || '',
        d?.blocking || '',
        d?.frozenMoment || '',
        d?.transition || '',
      ].join('|')
    })
    .join('\n')
}

export function isPolishAnalysisStale(
  analysis: { beatFingerprint?: string; stale?: boolean } | null | undefined,
  scene: PolishSceneInput | null | undefined
): boolean {
  if (!analysis) return false
  if (analysis.stale) return true
  if (!analysis.beatFingerprint) return false
  return analysis.beatFingerprint !== scenePolishBeatFingerprint(scene)
}

export function pendingPolishRecommendations(
  analysis: Pick<ScenePolishAnalysis, 'recommendations' | 'appliedRecommendationIds'> | null | undefined
): PolishRecommendation[] {
  if (!analysis?.recommendations?.length) return []
  const applied = new Set(analysis.appliedRecommendationIds || [])
  return analysis.recommendations.filter((rec) => rec.text.trim().length > 0 && !applied.has(rec.id))
}
