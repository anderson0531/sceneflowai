import { NextRequest, NextResponse } from 'next/server'
import ClientAssetSubmission from '@/models/ClientAssetSubmission'
import { assertProjectAccess, getAuthenticatedUserId } from '@/lib/projectAccess'
import { promoteCustomerSubmissionToContinuity } from '@/lib/continuity/continuityPortalService'
import { ensureProducerPlatformSchema } from '@/lib/database/migrateProducerPlatform'

export const runtime = 'nodejs'

type RouteCtx = { params: Promise<{ token: string }> }

export async function GET(req: NextRequest, ctx: RouteCtx) {
  try {
    await ctx.params
    const actorUserId = await getAuthenticatedUserId(req)
    if (!actorUserId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    const projectId = req.nextUrl.searchParams.get('projectId')?.trim()
    if (!projectId) {
      return NextResponse.json({ success: false, error: 'projectId is required' }, { status: 400 })
    }
    const access = await assertProjectAccess(projectId, actorUserId)
    if (!access.ok) {
      return NextResponse.json({ success: false, error: access.error }, { status: access.status })
    }

    await ensureProducerPlatformSchema()
    const rows = await ClientAssetSubmission.findAll({
      where: { project_id: projectId },
      order: [['created_at', 'DESC']],
    })

    return NextResponse.json({
      success: true,
      submissions: rows,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to list submissions'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest, ctx: RouteCtx) {
  try {
    await ctx.params
    const actorUserId = await getAuthenticatedUserId(req)
    if (!actorUserId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const submissionId = String(body.submissionId || '').trim()
    const projectId = String(body.projectId || '').trim()
    if (!submissionId || !projectId) {
      return NextResponse.json(
        { success: false, error: 'submissionId and projectId are required' },
        { status: 400 }
      )
    }

    const access = await assertProjectAccess(projectId, actorUserId)
    if (!access.ok) {
      return NextResponse.json({ success: false, error: access.error }, { status: access.status })
    }

    const promoted = await promoteCustomerSubmissionToContinuity({
      submissionId,
      ownerUserId: access.billingOwnerUserId || actorUserId,
      saveToReusableVault: body.saveToReusableVault !== false,
      clientGroupSlug: body.clientGroupSlug,
    })

    if (!promoted.ok) {
      return NextResponse.json({ success: false, error: promoted.error }, { status: promoted.status })
    }

    return NextResponse.json({
      success: true,
      blobUrl: promoted.blobUrl,
      referenceAssetId: promoted.referenceAssetId,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to promote submission'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
