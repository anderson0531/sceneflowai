import '@/models'
import { Project } from '@/models/Project'
import { sequelize } from '@/config/database'
import type { AudienceResonanceReview } from './types'

const MAX_REVIEW_HISTORY = 5

/**
 * Persists a review by writing only review fields.
 *
 * Deliberately never touches `script`, `scenes`, or `characters`. A background
 * job finishes after the user may have kept editing, and the server's stale
 * guard only rejects payloads with an *older* scriptUpdatedAt — a late job
 * carrying script data would therefore win and destroy newer edits. Restricting
 * the write to review metadata is what makes running this in the background safe.
 */
export async function persistAudienceReview(input: {
  projectId: string
  review: AudienceResonanceReview
}): Promise<{ saved: boolean; stale: boolean }> {
  const { projectId, review } = input

  return sequelize.transaction(async (transaction) => {
    const project = await Project.findByPk(projectId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    })
    if (!project) return { saved: false, stale: false }

    const metadata: Record<string, any> = { ...(project.metadata || {}) }
    const visionPhase: Record<string, any> = { ...(metadata.visionPhase || {}) }

    // The script may have changed while the job ran. Record it rather than
    // discarding the work — scene numbers may no longer line up, so the UI
    // offers a re-run instead of silently presenting misaligned results.
    const currentScriptUpdatedAt: string | null = visionPhase.scriptUpdatedAt ?? null
    const stale = Boolean(
      review.baseScriptUpdatedAt &&
        currentScriptUpdatedAt &&
        new Date(currentScriptUpdatedAt).getTime() >
          new Date(review.baseScriptUpdatedAt).getTime()
    )

    const previousAudience = visionPhase.reviews?.audience
    const history = Array.isArray(visionPhase.reviewHistory) ? visionPhase.reviewHistory : []
    const nextHistory =
      previousAudience?.overallScore !== undefined
        ? [
            {
              score: previousAudience.overallScore,
              generatedAt: previousAudience.generatedAt ?? visionPhase.reviews?.lastUpdated,
              dimensionalScores: (previousAudience.categories || []).map(
                (c: { name: string; score: number }) => ({ name: c.name, score: c.score })
              ),
            },
            ...history,
          ].slice(0, MAX_REVIEW_HISTORY)
        : history

    visionPhase.reviews = {
      director: null,
      audience: { ...review, stale },
      lastUpdated: review.generatedAt,
    }
    visionPhase.reviewHistory = nextHistory
    metadata.visionPhase = visionPhase

    project.metadata = metadata
    project.changed('metadata', true)
    await project.save({ transaction })

    return { saved: true, stale }
  })
}

/** Script and audience context a background analysis run needs. */
export async function loadScriptForAnalysis(projectId: string): Promise<{
  script: { title?: string; logline?: string; scenes: any[]; characters?: any[] }
  targetDemographic?: string
  format?: string
  contentIntent?: string
  treatment?: { character_descriptions?: Array<{ name?: string; role?: string }> }
  previousScores?: { overallScore: number; categories: any[] }
  scriptUpdatedAt: string | null
} | null> {
  const project = await Project.findByPk(projectId)
  if (!project) return null

  const metadata: Record<string, any> = project.metadata || {}
  const visionPhase: Record<string, any> = metadata.visionPhase || {}
  const storedScript = visionPhase.script || {}
  const scenes = storedScript.script?.scenes || storedScript.scenes || []
  const characters = visionPhase.characters || storedScript.characters || []
  const filmTreatment = metadata.filmTreatmentVariant
  const previousAudience = visionPhase.reviews?.audience

  return {
    script: {
      title: storedScript.title || project.title,
      logline: storedScript.logline,
      scenes,
      characters,
    },
    targetDemographic: metadata.targetDemographic || project.target_audience || undefined,
    format: metadata.format || filmTreatment?.format || 'short-film',
    contentIntent: metadata.contentIntent,
    treatment: filmTreatment
      ? { character_descriptions: filmTreatment.character_descriptions || characters }
      : undefined,
    previousScores:
      previousAudience?.overallScore !== undefined
        ? {
            overallScore: previousAudience.overallScore,
            categories: previousAudience.categories || [],
          }
        : undefined,
    scriptUpdatedAt: visionPhase.scriptUpdatedAt ?? null,
  }
}
