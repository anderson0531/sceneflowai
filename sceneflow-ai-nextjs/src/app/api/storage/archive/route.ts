/**
 * Storage Archive API
 * 
 * POST /api/storage/archive
 * 
 * Archives specified files to cold storage (Nearline/Coldline)
 * to reduce storage costs while keeping files accessible.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { archiveFiles } from '@/services/StorageManagementService'

export const runtime = 'nodejs'
export const maxDuration = 60

interface ArchiveRequest {
  fileIds: string[]
  targetClass?: 'NEARLINE' | 'COLDLINE'
}

interface ArchiveResponse {
  success: boolean
  filesArchived: number
  bytesFreed: number
  newStorageClass: string
  error?: string
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

    const body = await request.json() as ArchiveRequest

    // Validate request
    if (!body.fileIds || !Array.isArray(body.fileIds) || body.fileIds.length === 0) {
      return NextResponse.json(
        { error: 'Missing required field: fileIds (array of file IDs)' },
        { status: 400 }
      )
    }

    // Validate target class
    const targetClass = body.targetClass || 'NEARLINE'
    if (!['NEARLINE', 'COLDLINE'].includes(targetClass)) {
      return NextResponse.json(
        { error: 'Invalid targetClass. Must be NEARLINE or COLDLINE.' },
        { status: 400 }
      )
    }

    console.log(`[Storage Archive] Archiving ${body.fileIds.length} files for user ${userId} to ${targetClass}`)

    // Archive files
    const result = await archiveFiles(userId, body.fileIds, targetClass)

    const response: ArchiveResponse = {
      success: result.success,
      filesArchived: result.filesArchived,
      bytesFreed: result.bytesFreed,
      newStorageClass: result.newStorageClass,
      error: result.error,
    }

    if (!result.success) {
      return NextResponse.json(response, { status: 500 })
    }

    console.log(`[Storage Archive] Archived ${result.filesArchived} files`)

    return NextResponse.json(response)

  } catch (error) {
    console.error('[Storage Archive] Error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to archive files',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}
