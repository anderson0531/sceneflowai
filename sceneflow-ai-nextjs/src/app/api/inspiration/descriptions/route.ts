import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { appendSceneFlowCta } from '@/lib/premiere/distributionMetadata'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json()) as {
      projectTitle?: string
      locale?: string
      platform?: string
      includeSceneFlowCta?: boolean
      synopsis?: string
    }

    const locale = body.locale || 'en'
    const platform = body.platform || 'YouTube'
    const title = body.projectTitle || 'Untitled project'
    const synopsis = body.synopsis?.trim() || `A video created with SceneFlow AI.`

    const description = appendSceneFlowCta(
      `${synopsis}\n\nOptimized for ${platform}.`,
      locale,
      body.includeSceneFlowCta !== false
    )

    const tags = ['SceneFlow', platform.toLowerCase(), locale]

    return NextResponse.json({
      success: true,
      locale,
      title: `${title} | ${platform}`,
      description,
      tags,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to generate description'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
