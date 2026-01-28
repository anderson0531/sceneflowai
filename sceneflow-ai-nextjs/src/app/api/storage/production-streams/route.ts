/**
 * Production Streams Storage API
 * 
 * GET /api/storage/production-streams
 * 
 * Returns storage information for production streams (animatics and videos)
 * for a specific project or all projects.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Storage } from '@google-cloud/storage'
import { formatBytes } from '@/services/StorageManagementService'
import type { StreamType } from '@/types/productionStreams'

export const runtime = 'nodejs'
export const maxDuration = 30

// =============================================================================
// Types
// =============================================================================

interface ProductionStreamFile {
  id: string
  fileName: string
  path: string
  streamType: StreamType
  projectId: string
  sceneId?: string
  sizeBytes: number
  sizeFormatted: string
  storageClass: string
  createdAt: string
  lastAccessedAt: string
  url?: string
}

interface ProductionStreamsStorageResponse {
  success: boolean
  projectId?: string
  files: ProductionStreamFile[]
  summary: {
    totalFiles: number
    totalBytes: number
    totalFormatted: string
    byStreamType: {
      animatic: { count: number; bytes: number; formatted: string }
      video: { count: number; bytes: number; formatted: string }
    }
    byStorageClass: {
      standard: { count: number; bytes: number }
      nearline: { count: number; bytes: number }
      coldline: { count: number; bytes: number }
    }
  }
}

// =============================================================================
// GCS Client
// =============================================================================

let storageClient: Storage | null = null

function getStorageClient(): Storage {
  if (!storageClient) {
    storageClient = new Storage({
      projectId: process.env.GOOGLE_CLOUD_PROJECT,
    })
  }
  return storageClient
}

const BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'sceneflow-production'

// =============================================================================
// Helper Functions
// =============================================================================

function detectStreamType(fileName: string, path: string): StreamType {
  // Check file name or path for indicators
  if (fileName.includes('animatic') || path.includes('/animatic/')) {
    return 'animatic'
  }
  if (fileName.includes('video') || path.includes('/video/')) {
    return 'video'
  }
  // Default based on extension
  const ext = fileName.split('.').pop()?.toLowerCase()
  if (ext === 'mp4' || ext === 'webm' || ext === 'mov') {
    return 'video'
  }
  return 'animatic'
}

function extractProjectId(path: string): string | undefined {
  // Path pattern: users/{userId}/projects/{projectId}/...
  const match = path.match(/projects\/([^/]+)/)
  return match ? match[1] : undefined
}

function extractSceneId(path: string): string | undefined {
  // Path pattern: .../scenes/{sceneId}/...
  const match = path.match(/scenes\/([^/]+)/)
  return match ? match[1] : undefined
}

// =============================================================================
// API Handler
// =============================================================================

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
    const projectId = searchParams.get('projectId')

    console.log(`[Production Streams Storage] Fetching for user ${userId}${projectId ? `, project ${projectId}` : ''}`)

    const storage = getStorageClient()
    const bucket = storage.bucket(BUCKET_NAME)

    // Build prefix for listing files
    let prefix = `users/${userId}/`
    if (projectId) {
      prefix = `users/${userId}/projects/${projectId}/`
    }

    // Get all files under the prefix
    const [files] = await bucket.getFiles({
      prefix,
    })

    // Filter for production stream files (video/audio)
    const streamExtensions = ['.mp4', '.webm', '.mov', '.avi']
    const streamFiles = files.filter(file => {
      return streamExtensions.some(ext => file.name.toLowerCase().endsWith(ext))
    })

    // Process files
    const productionFiles: ProductionStreamFile[] = []
    const summary = {
      totalFiles: 0,
      totalBytes: 0,
      totalFormatted: '',
      byStreamType: {
        animatic: { count: 0, bytes: 0, formatted: '' },
        video: { count: 0, bytes: 0, formatted: '' },
      },
      byStorageClass: {
        standard: { count: 0, bytes: 0 },
        nearline: { count: 0, bytes: 0 },
        coldline: { count: 0, bytes: 0 },
      },
    }

    for (const file of streamFiles) {
      const [metadata] = await file.getMetadata()
      const sizeBytes = parseInt(metadata.size as string, 10) || 0
      const storageClass = (metadata.storageClass as string || 'STANDARD').toUpperCase()
      const fileName = file.name.split('/').pop() || file.name
      const streamType = detectStreamType(fileName, file.name)
      const fileProjectId = extractProjectId(file.name)
      const sceneId = extractSceneId(file.name)

      // Skip if filtering by project and doesn't match
      if (projectId && fileProjectId !== projectId) {
        continue
      }

      const streamFile: ProductionStreamFile = {
        id: file.name, // Use full path as ID
        fileName,
        path: file.name,
        streamType,
        projectId: fileProjectId || '',
        sceneId,
        sizeBytes,
        sizeFormatted: formatBytes(sizeBytes),
        storageClass,
        createdAt: metadata.timeCreated as string || '',
        lastAccessedAt: metadata.updated as string || '',
      }

      productionFiles.push(streamFile)

      // Update summary
      summary.totalFiles++
      summary.totalBytes += sizeBytes

      // By stream type
      summary.byStreamType[streamType].count++
      summary.byStreamType[streamType].bytes += sizeBytes

      // By storage class
      const classKey = storageClass.toLowerCase() as 'standard' | 'nearline' | 'coldline'
      if (classKey in summary.byStorageClass) {
        summary.byStorageClass[classKey].count++
        summary.byStorageClass[classKey].bytes += sizeBytes
      }
    }

    // Format totals
    summary.totalFormatted = formatBytes(summary.totalBytes)
    summary.byStreamType.animatic.formatted = formatBytes(summary.byStreamType.animatic.bytes)
    summary.byStreamType.video.formatted = formatBytes(summary.byStreamType.video.bytes)

    // Sort by creation date (newest first)
    productionFiles.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    const response: ProductionStreamsStorageResponse = {
      success: true,
      projectId: projectId || undefined,
      files: productionFiles,
      summary,
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('[Production Streams Storage] Error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to get production streams storage',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/storage/production-streams
 * 
 * Delete specific production stream files.
 */
export async function DELETE(request: NextRequest) {
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

    const body = await request.json() as { fileIds: string[]; confirm?: boolean }

    if (!body.fileIds || !Array.isArray(body.fileIds) || body.fileIds.length === 0) {
      return NextResponse.json(
        { error: 'Missing required field: fileIds' },
        { status: 400 }
      )
    }

    if (!body.confirm) {
      return NextResponse.json(
        { error: 'Delete requires confirmation. Set confirm: true to proceed.' },
        { status: 400 }
      )
    }

    console.log(`[Production Streams Storage] Deleting ${body.fileIds.length} files for user ${userId}`)

    const storage = getStorageClient()
    const bucket = storage.bucket(BUCKET_NAME)

    let filesDeleted = 0
    let bytesFreed = 0
    const errors: string[] = []

    for (const fileId of body.fileIds) {
      // Verify the file belongs to this user
      if (!fileId.startsWith(`users/${userId}/`)) {
        errors.push(`Permission denied: ${fileId}`)
        continue
      }

      try {
        const file = bucket.file(fileId)
        const [exists] = await file.exists()
        
        if (!exists) {
          errors.push(`File not found: ${fileId}`)
          continue
        }

        const [metadata] = await file.getMetadata()
        const size = parseInt(metadata.size as string, 10) || 0

        await file.delete()

        filesDeleted++
        bytesFreed += size
      } catch (err) {
        errors.push(`Failed to delete ${fileId}: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }
    }

    console.log(`[Production Streams Storage] Deleted ${filesDeleted} files, freed ${formatBytes(bytesFreed)}`)

    return NextResponse.json({
      success: filesDeleted > 0,
      filesDeleted,
      bytesFreed,
      bytesFreedFormatted: formatBytes(bytesFreed),
      errors: errors.length > 0 ? errors : undefined,
    })

  } catch (error) {
    console.error('[Production Streams Storage Delete] Error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to delete production stream files',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}
