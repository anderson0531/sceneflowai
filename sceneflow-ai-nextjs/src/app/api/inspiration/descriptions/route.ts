import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  generateYouTubeMetadata,
  translateYouTubeMetadata,
} from '@/lib/publish/youtubeMetadataGenerator'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id && !session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json()) as {
      action?: 'generate' | 'translate'
      projectTitle?: string
      locale?: string
      platform?: string
      includeSceneFlowCta?: boolean
      synopsis?: string
      genre?: string
      unitKind?: string
      unitLabel?: string
      sceneHeadings?: string[]
      targetLanguages?: string[]
      sourceLanguage?: string
      sourceTitle?: string
      sourceDescription?: string
      sourceTags?: string[]
    }

    if (body.action === 'translate') {
      const sourceLanguage = body.sourceLanguage || body.locale || 'en'
      const targetLanguages = Array.isArray(body.targetLanguages) ? body.targetLanguages : []
      if (!body.sourceTitle?.trim()) {
        return NextResponse.json(
          { error: 'sourceTitle is required to translate metadata' },
          { status: 400 }
        )
      }
      const result = await translateYouTubeMetadata({
        sourceLanguage,
        sourceTitle: body.sourceTitle,
        sourceDescription: body.sourceDescription || '',
        sourceTags: body.sourceTags,
        targetLanguages,
        includeSceneFlowCta: body.includeSceneFlowCta !== false,
      })
      const primary = result.translations[sourceLanguage]
      return NextResponse.json({
        success: true,
        locale: sourceLanguage,
        title: primary?.title || body.sourceTitle,
        description: primary?.description || body.sourceDescription || '',
        tags: primary?.tags || body.sourceTags || [],
        translations: result.translations,
        usedAi: result.usedAi,
      })
    }

    const locale = body.locale || 'en'
    const generated = await generateYouTubeMetadata({
      projectTitle: body.projectTitle,
      synopsis: body.synopsis,
      genre: body.genre,
      unitKind: body.unitKind,
      unitLabel: body.unitLabel,
      sceneHeadings: body.sceneHeadings,
      locale,
      platform: body.platform || 'YouTube',
      includeSceneFlowCta: body.includeSceneFlowCta !== false,
      targetLanguages: body.targetLanguages,
    })

    return NextResponse.json({
      success: true,
      locale,
      title: generated.primary.title,
      description: generated.primary.description,
      tags: generated.primary.tags,
      translations: generated.translations,
      usedAi: generated.usedAi,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to generate description'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
