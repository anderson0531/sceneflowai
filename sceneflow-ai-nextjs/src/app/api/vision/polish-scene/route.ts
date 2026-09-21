import { NextRequest, NextResponse } from 'next/server'
import { analyzeScenePolish } from '@/lib/script/scenePolish'
import { resolveRequestStoryLocale } from '@/i18n/server/requestLocale'
import { localeDirective } from '@/lib/prompts/localeDirective'

export const maxDuration = 60
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const { projectId, sceneIndex, scene, context } = await req.json()

    if (!projectId || sceneIndex === undefined || !scene) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { storyLocale, properNouns } = await resolveRequestStoryLocale(req, { projectId })
    const languageBlock = localeDirective(storyLocale, {
      properNouns,
      note: 'The JSON keys, "priority" values, "category" values, and beatIndices stay exactly as specified.',
    })

    const polishAnalysis = await analyzeScenePolish({
      scene,
      previousScene: context?.previousScene ?? null,
      nextScene: context?.nextScene ?? null,
      languageBlock,
    })

    return NextResponse.json({
      success: true,
      sceneIndex,
      polishAnalysis,
    })
  } catch (error) {
    console.error('[Scene Polish] Error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to polish scene',
      },
      { status: 500 }
    )
  }
}
