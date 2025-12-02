import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    commit: '0b38294',
    timestamp: Date.now(),
    blueprintVariants: 1,
    model: process.env.GEMINI_MODEL || 'gemini-3.0-flash',
    api: 'v3',
    beats: '6-8'
  })
}

