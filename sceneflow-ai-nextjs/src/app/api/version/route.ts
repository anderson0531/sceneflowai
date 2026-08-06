import { NextResponse } from 'next/server'
import { getGeminiTextModel, normalizeGeminiTextModel } from '@/lib/config/modelConfig'

export async function GET() {
  return NextResponse.json({
    commit: '0b38294',
    timestamp: Date.now(),
    blueprintVariants: 1,
    model: normalizeGeminiTextModel(process.env.GEMINI_MODEL || getGeminiTextModel('flash')),
    api: 'v3',
    beats: '6-8'
  })
}
