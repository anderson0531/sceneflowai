import { NextRequest, NextResponse } from 'next/server'
import Project from '../../../../../models/Project'
import { sequelize } from '../../../../../config/database'
import { resolveStoryboardScenes } from '../../../../../lib/storyboard/resolveStoryboardScenes'
import { validateAndCleanSceneAudio } from '../../../../../lib/audio/cleanupAudio'
import { findActiveShareProject } from '../../../../../lib/storyboard/shareProjectLookup'

export const runtime = 'nodejs'
export const maxDuration = 30

function sanitizeAudienceResonance(review: unknown) {
  if (!review || typeof review !== 'object') return undefined
  const r = review as Record<string, unknown>
  if (typeof r.overallScore !== 'number') return undefined
  return {
    overallScore: r.overallScore,
    categories: Array.isArray(r.categories) ? r.categories : undefined,
    analysis: typeof r.analysis === 'string' ? r.analysis : undefined,
    strengths: Array.isArray(r.strengths) ? r.strengths : undefined,
    improvements: Array.isArray(r.improvements) ? r.improvements : undefined,
    targetDemographic: typeof r.targetDemographic === 'string' ? r.targetDemographic : undefined,
    emotionalImpact: typeof r.emotionalImpact === 'string' ? r.emotionalImpact : undefined,
    showVsTellRatio: typeof r.showVsTellRatio === 'number' ? r.showVsTellRatio : undefined,
    generatedAt: typeof r.generatedAt === 'string' ? r.generatedAt : undefined,
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shareToken: string }> }
) {
  try {
    const { shareToken } = await params
    
    if (!shareToken) {
      return NextResponse.json({ error: 'Share token required' }, { status: 400 })
    }

    await sequelize.authenticate()
    
    const project = await findActiveShareProject(shareToken)

    if (!project) {
      console.log(`[Get Shared Project] Share token/slug not found or inactive: ${shareToken}`)
      return NextResponse.json({ error: 'Share link not found or expired' }, { status: 404 })
    }

    // Determine which link was used and increment view count
    const isStoryboard = (project.metadata?.storyboardShareLink?.shareToken === shareToken || project.metadata?.storyboardShareLink?.slug === shareToken)
    const metadataKey = isStoryboard ? 'storyboardShareLink' : 'screeningRoomShareLink'
    const shareLink = project.metadata[metadataKey]
    
    // Make sure we pass the exact token used for feedback linking back
    const actualShareToken = shareLink.shareToken
    
    shareLink.viewCount = (shareLink.viewCount || 0) + 1
    await project.update({
      metadata: {
        ...project.metadata,
        [metadataKey]: shareLink
      }
    })

    const md = project.metadata || {}
    const visionPhase = md.visionPhase || {}
    const storyboardRevision =
      md.storyboardRevision && typeof md.storyboardRevision.version === 'number'
        ? md.storyboardRevision
        : { version: 1, updatedAt: (project as any).updatedAt?.toISOString?.() || new Date().toISOString() }

    const resolvedScenes = resolveStoryboardScenes({
      script: visionPhase.script,
      visionPhaseScenes: visionPhase.scenes,
    }).map((scene) => validateAndCleanSceneAudio(scene).cleanedScene)

    const script = visionPhase.script
      ? {
          ...visionPhase.script,
          script: {
            ...(visionPhase.script.script || {}),
            scenes: resolvedScenes,
          },
          scenes: resolvedScenes,
        }
      : { script: { scenes: resolvedScenes }, scenes: resolvedScenes }

    const audienceResonance = sanitizeAudienceResonance(visionPhase?.reviews?.audience)

    // Return only necessary data (no sensitive info)
    const sharedData = {
      title: project.title,
      script,
      scenes: resolvedScenes,
      visionPhaseScenes: visionPhase.scenes,
      characters: visionPhase.characters,
      sceneProductionState: visionPhase.production?.scenes,
      allowedFeatures: shareLink.allowedFeatures,
      shareToken: actualShareToken, // Pass this back so the feedback API can find it
      storyboardRevision,
      audienceResonance,
    }

    console.log(`[Get Shared Project] Serving shared project: ${project.title} (views: ${shareLink.viewCount})`)

    return NextResponse.json({
      success: true,
      project: sharedData
    })
  } catch (error: any) {
    console.error('[Get Shared Project] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to load shared project' },
      { status: 500 }
    )
  }
}
