import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createDesignedGeminiVoice } from '@/lib/tts/geminiDesignedVoiceTts'
import { DESIGNED_VOICE_TTS_MODEL } from '@/lib/tts/geminiVoiceDesign'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json()) as {
      description?: string
      displayName?: string
      languageCode?: string
      retainVoiceIds?: string[]
    }
    const description = body.description?.trim() ?? ''
    if (description.length < 12) {
      return NextResponse.json({ error: 'A voice description is required' }, { status: 400 })
    }

    const created = await createDesignedGeminiVoice({
      description,
      displayName: body.displayName?.trim() || 'SceneFlow character',
      languageCode: body.languageCode,
      retainVoiceIds: Array.isArray(body.retainVoiceIds) ? body.retainVoiceIds : [],
    })

    return NextResponse.json({
      provider: 'google',
      voiceId: created.voiceId,
      voiceName: body.displayName?.trim() || 'Designed voice',
      prompt: description,
      designPrompt: description,
      model: DESIGNED_VOICE_TTS_MODEL,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Voice Design failed'
    console.error('[Voice Design]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
