/**
 * Storage Delete API
 * 
 * POST /api/storage/delete
 * 
 * Permanently deletes specified files from storage.
 * This action cannot be undone.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { deleteFiles, formatBytes } from '@/services/StorageManagementService'

export const runtime = 'nodejs'
export const maxDuration = 60

interface DeleteRequest {
  fileIds: string[]
  confirm?: boolean
}

interface DeleteResponse {
  success: boolean
  filesDeleted: number
  bytesFreed: number
  bytesFreedFormatted: string
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

    const body = await request.json() as DeleteRequest

    // Validate request
    if (!body.fileIds || !Array.isArray(body.fileIds) || body.fileIds.length === 0) {
      return NextResponse.json(
        { error: 'Missing required field: fileIds (array of file IDs)' },
        { status: 400 }
      )
    }

    // Require confirmation for delete operations
    if (!body.confirm) {
      return NextResponse.json(
        { error: 'Delete requires confirmation. Set confirm: true to proceed.' },
        { status: 400 }
      )
    }

    console.log(`[Storage Delete] Deleting ${body.fileIds.length} files for user ${userId}`)

    // Delete files
    const result = await deleteFiles(userId, body.fileIds)

    const response: DeleteResponse = {
      success: result.success,
      filesDeleted: result.filesDeleted,
      bytesFreed: result.bytesFreed,
      bytesFreedFormatted: formatBytes(result.bytesFreed),
      error: result.error,
    }

    if (!result.success) {
      return NextResponse.json(response, { status: 500 })
    }

    console.log(`[Storage Delete] Deleted ${result.filesDeleted} files, freed ${response.bytesFreedFormatted}`)

    return NextResponse.json(response)

  } catch (error) {
    console.error('[Storage Delete] Error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to delete files',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}
