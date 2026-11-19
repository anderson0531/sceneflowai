import { NextRequest, NextResponse } from 'next/server'
import { del } from '@vercel/blob'
import '@/models'
import { assertProjectAccess, getAuthenticatedUserId } from '@/lib/projectAccess'
import { canRoleDeleteProject } from '@/lib/producer/teamGovernance'
import { collectPurgeableDraftMedia, estimateProjectStorage } from '@/lib/producer/agencyOps'
import { purgeProjectClientUploads } from '@/lib/producer/producerProfileService'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteCtx = { params: Promise<{ id: string }> }

/**
 * POST /api/projects/[id]/purge-drafts
 *
 * 1-click "Archive & Purge Draft Intermediates" storage reclaimer:
 * - Preserves final rendered masters, active/selected segment takes, Blueprint JSON,
 *   and Continuity Bible references.
 * - Removes superseded intermediate candidate video takes and obsolete storyboard image versions.
 * - Best-effort deletes unreferenced Vercel Blob files.
 * - Optionally purges raw client upload staging files and marks the project `archived`.
 */
export async function POST(req: NextRequest, ctx: RouteCtx) {
  try {
    const actorUserId = await getAuthenticatedUserId(req)
    if (!actorUserId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await ctx.params
    if (!id) {
      return NextResponse.json({ success: false, error: 'Project ID is required' }, { status: 400 })
    }

    const access = await assertProjectAccess(id, actorUserId)
    if (!access.ok) {
      return NextResponse.json({ success: false, error: access.error }, { status: access.status })
    }

    if (!canRoleDeleteProject(access.accessRole)) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Only the Workspace Owner or a Workspace Admin can purge intermediate media assets.',
        },
        { status: 403 }
      )
    }

    const body = await req.json().catch(() => ({}))
    const archiveProject = body.archiveProject !== false
    const purgeRawClientUploads = body.purgeRawClientUploads === true

    const project = access.project
    const rawMeta = ((project.metadata || {}) as Record<string, any>)
    const plan = collectPurgeableDraftMedia(rawMeta)

    // Best-effort delete unreferenced Vercel Blob candidate URLs
    const vercelBlobUrls = plan.removedBlobUrls.filter((u) =>
      /\.public\.blob\.vercel-storage\.com/i.test(u)
    )
    if (vercelBlobUrls.length > 0 && process.env.BLOB_READ_WRITE_TOKEN) {
      await del(vercelBlobUrls).catch((err) => {
        console.warn('[purge-drafts] Best-effort Vercel Blob delete warning:', err)
      })
    }

    let removedClientUploadCount = 0
    if (purgeRawClientUploads) {
      const ownerId = String((project as { user_id?: string }).user_id || actorUserId)
      const uploadPurge = await purgeProjectClientUploads({
        projectId: project.id,
        ownerUserId: ownerId,
      })
      removedClientUploadCount = uploadPurge.deletedCount
    }

    const postPurgeEstimate = estimateProjectStorage(plan.cleanedMetadata, 0)
    const nextMetadata: Record<string, any> = {
      ...plan.cleanedMetadata,
      storageBytes: postPurgeEstimate.totalBytes,
      storagePurgedAt: new Date().toISOString(),
    }

    await project.update({
      ...(archiveProject ? { status: 'archived' } : {}),
      metadata: nextMetadata as any,
    })

    return NextResponse.json({
      success: true,
      projectId: project.id,
      archived: archiveProject,
      removedTakeCount: plan.removedTakeCount,
      removedBlobCount: vercelBlobUrls.length,
      removedClientUploadCount,
      estimatedBytesReclaimed: plan.estimatedBytesReclaimed,
      remainingStorageBytes: postPurgeEstimate.totalBytes,
    })
  } catch (err: unknown) {
    console.error('[POST /api/projects/[id]/purge-drafts] Error:', err)
    const message = err instanceof Error ? err.message : 'Failed to purge draft intermediates'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
