import { NextRequest, NextResponse } from 'next/server'
import { listEdgeVoices, type EdgeVoiceGender } from '@/lib/tts/edgeTtsVoices'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const lang = searchParams.get('lang') || undefined
  const genderParam = searchParams.get('gender')
  const gender =
    genderParam === 'male' || genderParam === 'female'
      ? (genderParam as EdgeVoiceGender)
      : genderParam === 'all'
        ? 'all'
        : undefined

  const voices = listEdgeVoices({ lang, gender })

  return NextResponse.json({
    success: true,
    voices: voices.map((v) => ({
      id: v.id,
      name: v.name,
      gender: v.gender,
      language: v.language,
      description: v.description,
    })),
  })
}
