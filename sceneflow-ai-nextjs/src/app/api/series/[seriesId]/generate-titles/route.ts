import { NextRequest, NextResponse } from 'next/server'
import '@/models'
import { Series } from '@/models/Series'
import { sequelize } from '@/config/database'
import { callLLM } from '@/services/llmGateway'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ seriesId: string }>
}

function safeParseJSON(text: string): any {
  let cleaned = text.trim()
  if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7)
  else if (cleaned.startsWith('```')) cleaned = cleaned.slice(3)
  if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3)
  cleaned = cleaned.trim()
  
  try {
    return JSON.parse(cleaned)
  } catch (e) {
    const firstBrace = cleaned.indexOf('[')
    const lastBrace = cleaned.lastIndexOf(']')
    
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      let json = cleaned.slice(firstBrace, lastBrace + 1)
      return JSON.parse(json)
    }
    throw new Error('Invalid JSON from LLM')
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { seriesId } = await params
  
  try {
    await sequelize.authenticate()
    
    const series = await Series.findByPk(seriesId)
    if (!series) {
      return NextResponse.json({ success: false, error: 'Series not found' }, { status: 404 })
    }
    
    const logline = series.logline || series.production_bible?.logline || ''
    const synopsis = series.production_bible?.synopsis || ''
    const genre = series.genre || ''

    if (!logline && !synopsis) {
      return NextResponse.json({
        success: false,
        error: 'Not enough series context to generate titles. Add a logline or storyline first.'
      }, { status: 400 })
    }
    
    const prompt = `You are an expert TV series showrunner and marketing executive.
Based on the following series concept, brainstorm 5 highly engaging, marketable, and creative titles for this series.

Genre: ${genre}
Logline: ${logline}
Synopsis (excerpt): ${synopsis.slice(0, 500)}

Requirements:
- Provide exactly 5 distinct title options.
- Ensure they are punchy and memorable.
- Output ONLY a valid JSON array of strings. No markdown formatting, no explanation.

Example Output:
["The Hidden Code", "Echoes of Tomorrow", "Neon Shadows", "Quantum State", "The Protocol"]`

    const response = await callLLM(
      { 
        provider: 'gemini', 
        model: 'gemini-2.5-flash',
        maxOutputTokens: 1024,
        temperature: 0.8
      },
      prompt
    )
    
    const titles = safeParseJSON(response)
    
    if (!Array.isArray(titles) || titles.length === 0) {
      throw new Error('LLM did not return an array of titles')
    }
    
    return NextResponse.json({
      success: true,
      titles
    })
    
  } catch (error) {
    console.error(`[POST /api/series/${seriesId}/generate-titles] Error:`, error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate titles'
    }, { status: 500 })
  }
}