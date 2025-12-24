/**
 * Review History API
 * 
 * Endpoints for managing scene review history persistence.
 * Stores review history in project metadata for cross-session continuity.
 */

import { NextRequest, NextResponse } from 'next/server'
import Project from '@/models/Project'
import { 
  getReviewHistoryFromMetadata, 
  updateSceneReviewState, 
  resetAllSceneStates,
  resetSceneState,
  prepareMetadataUpdate,
  getReviewHistorySummary,
  createEmptyReviewHistory
} from '@/lib/review-history'
import { RecommendationPriority } from '@/types/story'

export const maxDuration = 30
export const runtime = 'nodejs'

// GET: Load review history for a project
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json(
        { error: 'Missing projectId parameter' },
        { status: 400 }
      )
    }

    const project = await Project.findByPk(projectId)
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    const reviewHistory = getReviewHistoryFromMetadata(project.metadata, projectId)
    const summary = getReviewHistorySummary(reviewHistory)

    return NextResponse.json({
      success: true,
      reviewHistory,
      summary
    })
  } catch (error: any) {
    console.error('[Review History] GET error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to load review history' },
      { status: 500 }
    )
  }
}

// POST: Update review history (apply recommendation, update scores)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { 
      projectId, 
      sceneIndex, 
      action,
      directorScore,
      audienceScore,
      appliedRecommendationId,
      appliedRecommendationPriority,
      isConverged
    } = body

    if (!projectId || sceneIndex === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: projectId, sceneIndex' },
        { status: 400 }
      )
    }

    const project = await Project.findByPk(projectId)
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    let reviewHistory = getReviewHistoryFromMetadata(project.metadata, projectId)

    switch (action) {
      case 'update':
        reviewHistory = updateSceneReviewState(reviewHistory, sceneIndex, {
          directorScore,
          audienceScore,
          appliedRecommendationId,
          appliedRecommendationPriority: appliedRecommendationPriority as RecommendationPriority,
          isConverged
        })
        break
        
      case 'reset-scene':
        reviewHistory = resetSceneState(reviewHistory, sceneIndex)
        break
        
      case 'reset-all':
        reviewHistory = resetAllSceneStates(reviewHistory)
        break
        
      default:
        // Default to update if no action specified
        reviewHistory = updateSceneReviewState(reviewHistory, sceneIndex, {
          directorScore,
          audienceScore,
          appliedRecommendationId,
          appliedRecommendationPriority: appliedRecommendationPriority as RecommendationPriority,
          isConverged
        })
    }

    // Save updated metadata
    const updatedMetadata = prepareMetadataUpdate(project.metadata, reviewHistory)
    await project.update({ metadata: updatedMetadata })

    const summary = getReviewHistorySummary(reviewHistory)

    return NextResponse.json({
      success: true,
      reviewHistory,
      summary
    })
  } catch (error: any) {
    console.error('[Review History] POST error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update review history' },
      { status: 500 }
    )
  }
}

// DELETE: Reset review history (all scenes or specific scene)
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get('projectId')
    const sceneIndexParam = searchParams.get('sceneIndex')

    if (!projectId) {
      return NextResponse.json(
        { error: 'Missing projectId parameter' },
        { status: 400 }
      )
    }

    const project = await Project.findByPk(projectId)
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    let reviewHistory = getReviewHistoryFromMetadata(project.metadata, projectId)

    if (sceneIndexParam !== null && sceneIndexParam !== undefined) {
      // Reset specific scene
      const sceneIndex = parseInt(sceneIndexParam, 10)
      reviewHistory = resetSceneState(reviewHistory, sceneIndex)
      console.log(`[Review History] Reset scene ${sceneIndex} for project ${projectId}`)
    } else {
      // Reset all scenes
      reviewHistory = resetAllSceneStates(reviewHistory)
      console.log(`[Review History] Reset all scenes for project ${projectId}`)
    }

    // Save updated metadata
    const updatedMetadata = prepareMetadataUpdate(project.metadata, reviewHistory)
    await project.update({ metadata: updatedMetadata })

    const summary = getReviewHistorySummary(reviewHistory)

    return NextResponse.json({
      success: true,
      message: sceneIndexParam ? `Scene ${sceneIndexParam} review history reset` : 'All review history reset',
      reviewHistory,
      summary
    })
  } catch (error: any) {
    console.error('[Review History] DELETE error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to reset review history' },
      { status: 500 }
    )
  }
}
