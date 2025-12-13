/**
 * API Route: Analyze Narration Beats
 * 
 * Splits scene narration into visual beats for video generation.
 * Used when adding beat-matched establishing shots.
 */

import { NextRequest, NextResponse } from 'next/server'
import { analyzeNarrationBeats, AnalyzeNarrationInput } from '@/lib/ai/narrationBeatAnalyzer'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const { 
      narrationText, 
      sceneHeading, 
      sceneDescription, 
      sceneImageUrl,
      estimatedDuration,
      mode = 'beat-matched',
      characterDescriptions 
    } = body
    
    if (!narrationText || narrationText.trim().length === 0) {
      return NextResponse.json(
        { error: 'Narration text is required' },
        { status: 400 }
      )
    }
    
    if (!sceneHeading) {
      return NextResponse.json(
        { error: 'Scene heading is required' },
        { status: 400 }
      )
    }
    
    const input: AnalyzeNarrationInput = {
      narrationText: narrationText.trim(),
      sceneHeading,
      sceneDescription,
      sceneImageUrl,
      estimatedDuration,
      mode: mode === 'single-shot' ? 'single-shot' : 'beat-matched',
      characterDescriptions,
    }
    
    const analysis = await analyzeNarrationBeats(input)
    
    return NextResponse.json({
      success: true,
      analysis,
    })
  } catch (error) {
    console.error('Error analyzing narration beats:', error)
    return NextResponse.json(
      { error: 'Failed to analyze narration', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
