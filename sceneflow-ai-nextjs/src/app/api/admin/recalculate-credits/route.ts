import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isDemoMode } from '@/lib/env'
import { Project } from '@/models/Project'
import {
  IMAGE_CREDITS,
  VIDEO_CREDITS,
  AUDIO_CREDITS,
} from '@/lib/credits/creditCosts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// =============================================================================
// CREDIT CALCULATION CONSTANTS
// =============================================================================

const TREATMENT_VISUAL_CREDITS = {
  heroImage: 15,
  characterPortrait: 10,
  actEstablishing: 15,
  keyProp: 10,
} as const

// =============================================================================
// TYPES
// =============================================================================

interface AssetCount {
  treatmentImages: number
  sceneImages: number
  frameImages: number
  videos: number
  audioMinutes: number
  voiceClones: number
}

interface CreditBreakdown {
  treatmentVisuals: number
  sceneImages: number
  frameImages: number
  videos: number
  audio: number
  voiceClones: number
  total: number
}

interface DebugInfo {
  metadataKeys: string[]
  scenesLocation: string | null
  sceneCount: number
  firstSceneKeys: string[]
  hasCreationHub: boolean
  creationHubSceneCount: number
  sampleSegmentKeys: string[]
}

interface ProjectRecalculation {
  projectId: string
  title: string
  previousCreditsUsed: number
  newCreditsUsed: number
  assetCounts: AssetCount
  breakdown: CreditBreakdown
  updated: boolean
  debug?: DebugInfo
}

// =============================================================================
// ASSET COUNTING FUNCTIONS
// =============================================================================

function countTreatmentVisuals(metadata: Record<string, any>): { count: number; credits: number } {
  const visuals = metadata.visuals || metadata.treatmentVisuals
  if (!visuals) return { count: 0, credits: 0 }
  
  let count = 0
  let credits = 0
  
  // Hero image
  if (visuals.heroImage?.url || visuals.heroImage?.imageUrl) {
    count++
    credits += TREATMENT_VISUAL_CREDITS.heroImage
  }
  
  // Character portraits
  const portraits = visuals.characterPortraits || []
  const portraitCount = portraits.filter((p: any) => p?.imageUrl || p?.url).length
  count += portraitCount
  credits += portraitCount * TREATMENT_VISUAL_CREDITS.characterPortrait
  
  // Act anchors (establishing shots)
  const actAnchors = visuals.actAnchors || []
  const anchorCount = actAnchors.filter((a: any) => 
    a?.establishingShot?.url || a?.establishingShot?.imageUrl || a?.imageUrl
  ).length
  count += anchorCount
  credits += anchorCount * TREATMENT_VISUAL_CREDITS.actEstablishing
  
  // Key prop
  if (visuals.keyProp?.url || visuals.keyProp?.imageUrl) {
    count++
    credits += TREATMENT_VISUAL_CREDITS.keyProp
  }
  
  return { count, credits }
}

function countSceneAssets(metadata: Record<string, any>): {
  sceneImages: number
  frameImages: number
  videos: number
  sceneImageCredits: number
  frameCredits: number
  videoCredits: number
} {
  let sceneImages = 0
  let frameImages = 0
  let videos = 0
  
  // Get scenes from various possible locations
  const scenes = metadata.scenes || metadata.guide?.scenes || []
  
  for (const scene of scenes) {
    // Scene image - check all possible URL fields
    if (
      scene.imageUrl || 
      scene.generatedImage || 
      scene.generatedImageUrl ||
      scene.referenceImageUrl ||
      scene.sceneImageUrl
    ) {
      sceneImages++
    }
    
    // Segments
    const segments = scene.segments || []
    for (const segment of segments) {
      // Start/end frames - check both convenience accessor AND nested references object
      const hasStartFrame = segment.startFrameUrl || segment.references?.startFrameUrl
      const hasEndFrame = segment.endFrameUrl || segment.references?.endFrameUrl
      if (hasStartFrame) frameImages++
      if (hasEndFrame) frameImages++
      
      // Video asset - check activeAssetUrl with assetType or fallback fields
      const hasVideo = (
        (segment.activeAssetUrl && segment.assetType === 'video') ||
        segment.videoUrl ||
        segment.references?.videoUrl
      )
      if (hasVideo) {
        videos++
      }
    }
  }
  
  // Also check creationHub for additional assets
  const creationHub = metadata.creationHub
  if (creationHub?.scenes) {
    for (const [sceneId, sceneData] of Object.entries(creationHub.scenes)) {
      const assets = (sceneData as any)?.assets || []
      for (const asset of assets) {
        if (asset.type === 'generated_video') videos++
        if (asset.type === 'generated_image') {
          // Could be frame or scene image - count as frame
          frameImages++
        }
      }
    }
  }
  
  return {
    sceneImages,
    frameImages,
    videos,
    sceneImageCredits: sceneImages * IMAGE_CREDITS.SCENE_REFERENCE,
    frameCredits: frameImages * IMAGE_CREDITS.FRAME_GENERATION,
    // Default to VEO_FAST since we can't detect quality from existing assets
    videoCredits: videos * VIDEO_CREDITS.VEO_FAST,
  }
}

function countAudioAssets(metadata: Record<string, any>): {
  audioMinutes: number
  audioCredits: number
} {
  let audioMinutes = 0
  
  // Check scenes for voiceover audio
  const scenes = metadata.scenes || metadata.guide?.scenes || []
  for (const scene of scenes) {
    // Scene-level audio
    if (scene.audioUrl || scene.voiceoverUrl) {
      // Estimate 30 seconds per scene audio
      audioMinutes += 0.5
    }
    
    // Segment-level audio - check both direct fields and references
    const segments = scene.segments || []
    for (const segment of segments) {
      const hasAudio = (
        segment.audioUrl || 
        segment.voiceoverUrl ||
        segment.references?.audioUrl ||
        segment.references?.voiceoverUrl
      )
      if (hasAudio) {
        // Each segment is ~8 seconds
        audioMinutes += 8 / 60
      }
    }
  }
  
  // Check creationHub for audio assets
  const creationHub = metadata.creationHub
  if (creationHub?.scenes) {
    for (const [sceneId, sceneData] of Object.entries(creationHub.scenes)) {
      const assets = (sceneData as any)?.assets || []
      for (const asset of assets) {
        if (asset.type === 'generated_audio' || asset.type === 'user_audio') {
          const duration = asset.durationSec || 8
          audioMinutes += duration / 60
        }
      }
    }
  }
  
  return {
    audioMinutes: Math.ceil(audioMinutes),
    audioCredits: Math.ceil(audioMinutes) * AUDIO_CREDITS.TTS_PER_MINUTE,
  }
}

// =============================================================================
// MAIN CALCULATION FUNCTION
// =============================================================================

function calculateProjectCredits(project: Project): {
  assetCounts: AssetCount
  breakdown: CreditBreakdown
  totalCredits: number
  debug: DebugInfo
} {
  const metadata = project.metadata || {}
  
  // Debug: Collect metadata structure info
  const metadataKeys = Object.keys(metadata)
  
  // Find scenes from multiple possible locations
  let scenesLocation: string | null = null
  let scenes: any[] = []
  
  if (metadata.scenes && Array.isArray(metadata.scenes) && metadata.scenes.length > 0) {
    scenesLocation = 'metadata.scenes'
    scenes = metadata.scenes
  } else if (metadata.guide?.scenes && Array.isArray(metadata.guide.scenes) && metadata.guide.scenes.length > 0) {
    scenesLocation = 'metadata.guide.scenes'
    scenes = metadata.guide.scenes
  } else if (metadata.filmTreatment?.scenes && Array.isArray(metadata.filmTreatment.scenes)) {
    scenesLocation = 'metadata.filmTreatment.scenes'
    scenes = metadata.filmTreatment.scenes
  } else if (metadata.script?.scenes && Array.isArray(metadata.script.scenes)) {
    scenesLocation = 'metadata.script.scenes'
    scenes = metadata.script.scenes
  } else if (metadata.storyboard?.scenes && Array.isArray(metadata.storyboard.scenes)) {
    scenesLocation = 'metadata.storyboard.scenes'
    scenes = metadata.storyboard.scenes
  }
  
  const firstSceneKeys = scenes.length > 0 ? Object.keys(scenes[0]) : []
  const hasCreationHub = !!metadata.creationHub
  const creationHubSceneCount = metadata.creationHub?.scenes 
    ? Object.keys(metadata.creationHub.scenes).length 
    : 0
  
  // Get sample segment keys for debugging
  let sampleSegmentKeys: string[] = []
  if (scenes.length > 0) {
    const firstScene = scenes[0]
    const segments = firstScene.segments || firstScene.shots || []
    if (segments.length > 0) {
      sampleSegmentKeys = Object.keys(segments[0])
    }
  }
  
  // Count treatment visuals
  const treatment = countTreatmentVisuals(metadata)
  
  // Count scene assets with explicit scenes array
  const sceneAssets = countSceneAssetsFromScenes(scenes, metadata.creationHub)
  
  // Count audio with explicit scenes array
  const audio = countAudioFromScenes(scenes, metadata.creationHub)
  
  // Voice clones are tracked at user level, not project - set to 0
  const voiceClones = 0
  
  const assetCounts: AssetCount = {
    treatmentImages: treatment.count,
    sceneImages: sceneAssets.sceneImages,
    frameImages: sceneAssets.frameImages,
    videos: sceneAssets.videos,
    audioMinutes: audio.audioMinutes,
    voiceClones,
  }
  
  const breakdown: CreditBreakdown = {
    treatmentVisuals: treatment.credits,
    sceneImages: sceneAssets.sceneImageCredits,
    frameImages: sceneAssets.frameCredits,
    videos: sceneAssets.videoCredits,
    audio: audio.audioCredits,
    voiceClones: 0,
    total: 0,
  }
  
  breakdown.total = 
    breakdown.treatmentVisuals +
    breakdown.sceneImages +
    breakdown.frameImages +
    breakdown.videos +
    breakdown.audio
  
  return {
    assetCounts,
    breakdown,
    totalCredits: breakdown.total,
    debug: {
      metadataKeys,
      scenesLocation,
      sceneCount: scenes.length,
      firstSceneKeys,
      hasCreationHub,
      creationHubSceneCount,
      sampleSegmentKeys,
    }
  }
}

// Helper: Count scene assets from explicit scenes array
function countSceneAssetsFromScenes(scenes: any[], creationHub: any): {
  sceneImages: number
  frameImages: number
  videos: number
  sceneImageCredits: number
  frameCredits: number
  videoCredits: number
} {
  let sceneImages = 0
  let frameImages = 0
  let videos = 0
  
  for (const scene of scenes) {
    // Scene image - check all possible URL fields
    if (
      scene.imageUrl || 
      scene.generatedImage || 
      scene.generatedImageUrl ||
      scene.referenceImageUrl ||
      scene.sceneImageUrl ||
      scene.image?.url ||
      scene.thumbnailUrl ||
      scene.thumbnail
    ) {
      sceneImages++
    }
    
    // Segments (may be called segments or shots)
    const segments = scene.segments || scene.shots || []
    for (const segment of segments) {
      // Start/end frames - check multiple locations
      const hasStartFrame = segment.startFrameUrl || 
        segment.references?.startFrameUrl ||
        segment.keyframeUrl ||
        segment.thumbnailUrl
      const hasEndFrame = segment.endFrameUrl || segment.references?.endFrameUrl
      if (hasStartFrame) frameImages++
      if (hasEndFrame) frameImages++
      
      // Video asset - check multiple locations
      const hasVideo = (
        (segment.activeAssetUrl && segment.assetType === 'video') ||
        segment.videoUrl ||
        segment.references?.videoUrl ||
        segment.generatedVideoUrl
      )
      if (hasVideo) {
        videos++
      }
    }
  }
  
  // Also check creationHub for additional assets
  if (creationHub?.scenes) {
    for (const [sceneId, sceneData] of Object.entries(creationHub.scenes)) {
      const assets = (sceneData as any)?.assets || []
      for (const asset of assets) {
        if (asset.type === 'generated_video') videos++
        if (asset.type === 'generated_image') {
          frameImages++
        }
      }
    }
  }
  
  return {
    sceneImages,
    frameImages,
    videos,
    sceneImageCredits: sceneImages * IMAGE_CREDITS.SCENE_REFERENCE,
    frameCredits: frameImages * IMAGE_CREDITS.FRAME_GENERATION,
    videoCredits: videos * VIDEO_CREDITS.VEO_FAST,
  }
}

// Helper: Count audio from explicit scenes array
function countAudioFromScenes(scenes: any[], creationHub: any): {
  audioMinutes: number
  audioCredits: number
} {
  let audioMinutes = 0
  
  for (const scene of scenes) {
    // Scene-level audio
    if (scene.audioUrl || scene.voiceoverUrl || scene.narrationAudio) {
      audioMinutes += 0.5
    }
    
    // Segment-level audio
    const segments = scene.segments || scene.shots || []
    for (const segment of segments) {
      const hasAudio = (
        segment.audioUrl || 
        segment.voiceoverUrl ||
        segment.references?.audioUrl ||
        segment.references?.voiceoverUrl
      )
      if (hasAudio) {
        audioMinutes += 8 / 60
      }
    }
  }
  
  // Check creationHub for audio assets
  if (creationHub?.scenes) {
    for (const [sceneId, sceneData] of Object.entries(creationHub.scenes)) {
      const assets = (sceneData as any)?.assets || []
      for (const asset of assets) {
        if (asset.type === 'generated_audio' || asset.type === 'user_audio') {
          const duration = asset.durationSec || 8
          audioMinutes += duration / 60
        }
      }
    }
  }
  
  return {
    audioMinutes: Math.ceil(audioMinutes),
    audioCredits: Math.ceil(audioMinutes) * AUDIO_CREDITS.TTS_PER_MINUTE,
  }
}

// =============================================================================
// API HANDLERS
// =============================================================================

/**
 * GET /api/admin/recalculate-credits
 * Recalculate credits for all projects (dry run by default)
 * 
 * Query params:
 *   - dryRun: boolean (default: true) - Preview without updating
 *   - userId: string (optional) - Filter to specific user's projects
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions as any)
    if (!session && !isDemoMode()) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        message: 'Admin access required'
      }, { status: 401 })
    }

    const searchParams = req.nextUrl.searchParams
    const dryRun = searchParams.get('dryRun') !== 'false'
    const userId = searchParams.get('userId')

    // Build query
    const whereClause: any = {}
    if (userId) {
      whereClause.user_id = userId
    }

    // Get all projects
    const projects = await Project.findAll({ where: whereClause })
    
    const results: ProjectRecalculation[] = []
    let totalUpdated = 0
    let totalPreviousCredits = 0
    let totalNewCredits = 0

    for (const project of projects) {
      const previousCreditsUsed = project.metadata?.creditsUsed || 0
      const { assetCounts, breakdown, totalCredits, debug } = calculateProjectCredits(project)
      
      const result: ProjectRecalculation = {
        projectId: project.id,
        title: project.title,
        previousCreditsUsed,
        newCreditsUsed: totalCredits,
        assetCounts,
        breakdown,
        updated: false,
        debug,
      }

      if (!dryRun && totalCredits !== previousCreditsUsed) {
        // Update project metadata
        const updatedMetadata = {
          ...project.metadata,
          creditsUsed: totalCredits,
          creditsRecalculatedAt: new Date().toISOString(),
          creditBreakdown: breakdown,
        }
        
        await project.update({ metadata: updatedMetadata })
        result.updated = true
        totalUpdated++
      }

      totalPreviousCredits += previousCreditsUsed
      totalNewCredits += totalCredits
      results.push(result)
    }

    return NextResponse.json({
      success: true,
      dryRun,
      summary: {
        projectsProcessed: projects.length,
        projectsUpdated: totalUpdated,
        totalPreviousCredits,
        totalNewCredits,
        creditDifference: totalNewCredits - totalPreviousCredits,
      },
      projects: results,
      timestamp: new Date().toISOString(),
    })

  } catch (error: any) {
    console.error('[Admin Recalculate Credits] GET Error:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 })
  }
}

/**
 * POST /api/admin/recalculate-credits
 * Recalculate credits for a single project
 * 
 * Body: {
 *   projectId: string - Project ID to recalculate
 *   dryRun?: boolean - Preview without updating (default: false)
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions as any)
    if (!session && !isDemoMode()) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        message: 'Admin access required'
      }, { status: 401 })
    }

    const body = await req.json()
    const { projectId, dryRun = false } = body

    if (!projectId) {
      return NextResponse.json({
        error: 'Missing projectId',
        message: 'projectId is required',
      }, { status: 400 })
    }

    // Get project
    const project = await Project.findByPk(projectId)
    if (!project) {
      return NextResponse.json({
        error: 'Project not found',
        message: `No project found with ID: ${projectId}`,
      }, { status: 404 })
    }

    const previousCreditsUsed = project.metadata?.creditsUsed || 0
    const { assetCounts, breakdown, totalCredits, debug } = calculateProjectCredits(project)

    let updated = false
    if (!dryRun) {
      const updatedMetadata = {
        ...project.metadata,
        creditsUsed: totalCredits,
        creditsRecalculatedAt: new Date().toISOString(),
        creditBreakdown: breakdown,
      }
      
      await project.update({ metadata: updatedMetadata })
      updated = true
    }

    return NextResponse.json({
      success: true,
      dryRun,
      project: {
        projectId: project.id,
        title: project.title,
        previousCreditsUsed,
        newCreditsUsed: totalCredits,
        creditDifference: totalCredits - previousCreditsUsed,
        assetCounts,
        breakdown,
        updated,
        debug,
      },
      timestamp: new Date().toISOString(),
    })

  } catch (error: any) {
    console.error('[Admin Recalculate Credits] POST Error:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 })
  }
}
