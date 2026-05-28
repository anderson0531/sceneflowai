import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserId, assertProjectAccess } from '@/lib/projectAccess'
import { updateProjectBudgetFields } from '@/lib/credits/projectBudget'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params
    const ownerUserId = await getAuthenticatedUserId(request)

    if (!ownerUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const access = await assertProjectAccess(projectId, ownerUserId)
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status })
    }

    const body = await request.json()
    const { creditsUsed, creditsBudget } = body ?? {}

    if (creditsUsed === undefined && creditsBudget === undefined) {
      return NextResponse.json(
        { error: 'Provide creditsUsed and/or creditsBudget' },
        { status: 400 }
      )
    }

    const result = await updateProjectBudgetFields(projectId, { creditsUsed, creditsBudget })

    return NextResponse.json({
      success: true,
      projectId,
      ...result,
    })
  } catch (error: any) {
    console.error('[Projects Budget PATCH] Error:', error)
    const message = error?.message || 'Failed to update project budget'
    const status = message === 'Project not found' ? 404 : message.includes('must be') ? 400 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
