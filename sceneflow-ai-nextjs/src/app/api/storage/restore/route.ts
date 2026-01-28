/**
 * Storage Restore API
 * 
 * POST /api/storage/restore
 * 
 * Restores files from cold storage (Nearline/Coldline) back to standard storage.
 * This operation costs credits and may take time depending on storage class.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { restoreFromArchive, getRestoreProgress } from '@/services/StorageManagementService'
import { User } from '@/models/User'
import { STORAGE_LIMITS } from '@/lib/credits/guardrails'

export const runtime = 'nodejs'
export const maxDuration = 60

interface RestoreRequest {
  fileIds: string[]
}

interface RestoreResponse {
  success: boolean
  filesRestored: number
  creditsCost: number
  creditsRemaining: number
  estimatedTimeMinutes: number
  error?: string
}

interface RestoreProgressResponse {
  success: boolean
  progress: Array<{
    fileId: string
    progress: number
    storageClass: string
  }>
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id || session?.user?.email
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json() as RestoreRequest

    // Validate request
    if (!body.fileIds || !Array.isArray(body.fileIds) || body.fileIds.length === 0) {
      return NextResponse.json(
        { error: 'Missing required field: fileIds (array of file IDs)' },
        { status: 400 }
      )
    }

    // Get user's current credits
    const user = await User.findByPk(userId)
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const availableCredits = user.credits || 0
    const estimatedCost = STORAGE_LIMITS.RESTORE_CREDITS * body.fileIds.length

    // Check if user has enough credits before attempting restore
    if (availableCredits < estimatedCost) {
      return NextResponse.json(
        { 
          error: 'Insufficient credits for restore operation',
          creditsCost: estimatedCost,
          creditsAvailable: availableCredits,
        },
        { status: 402 }
      )
    }

    console.log(`[Storage Restore] Restoring ${body.fileIds.length} files for user ${userId}`)

    // Restore files
    const result = await restoreFromArchive(userId, body.fileIds, availableCredits)

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          filesRestored: 0,
          creditsCost: result.creditsCost,
          creditsRemaining: availableCredits,
          estimatedTimeMinutes: 0,
          error: result.error,
        } as RestoreResponse,
        { status: 500 }
      )
    }

    // Deduct credits for successful restore
    const newCredits = availableCredits - result.creditsCost
    user.credits = newCredits
    await user.save()

    console.log(`[Storage Restore] Restored ${result.filesRestored} files, charged ${result.creditsCost} credits`)

    const response: RestoreResponse = {
      success: true,
      filesRestored: result.filesRestored,
      creditsCost: result.creditsCost,
      creditsRemaining: newCredits,
      estimatedTimeMinutes: result.estimatedTimeMinutes,
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('[Storage Restore] Error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to restore files',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/storage/restore?fileIds=id1,id2
 * 
 * Get restore progress for files being restored from cold storage.
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id || session?.user?.email
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const fileIdsParam = searchParams.get('fileIds')
    
    if (!fileIdsParam) {
      return NextResponse.json(
        { error: 'Missing required query parameter: fileIds' },
        { status: 400 }
      )
    }

    const fileIds = fileIdsParam.split(',').filter(id => id.trim())
    
    if (fileIds.length === 0) {
      return NextResponse.json(
        { error: 'fileIds must contain at least one file ID' },
        { status: 400 }
      )
    }

    const progress = await getRestoreProgress(userId, fileIds)

    const response: RestoreProgressResponse = {
      success: true,
      progress,
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('[Storage Restore Progress] Error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to get restore progress',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}
