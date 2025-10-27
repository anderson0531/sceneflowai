import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60
export const runtime = 'nodejs'

interface AnalyzeScriptRequest {
  projectId: string
  script: any
  characters: any[]
}

export async function POST(req: NextRequest) {
  try {
    const { projectId, script, characters }: AnalyzeScriptRequest = await req.json()
    
    if (!projectId || !script) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    
    console.log('[Script Analysis] Analyzing script for project:', projectId)
    
    const recommendations = await analyzeScript(script, characters)
    
    return NextResponse.json({
      success: true,
      recommendations,
      generatedAt: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('[Script Analysis] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to analyze script' },
      { status: 500 }
    )
  }
}

async function analyzeScript(script: any, characters: any[]) {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY
  if (!apiKey) throw new Error('Google API key not configured')
  
  const sceneSummaries = script.scenes?.map((scene: any, idx: number) => {
    const dialogueCount = scene.dialogue?.length || 0
    const duration = scene.duration || 0
    return `Scene ${idx + 1}: ${scene.heading || 'Untitled'} (${duration}s, ${dialogueCount} dialogue)`
  }).join('\n') || 'No scenes'
  
  const prompt = `You are an expert script doctor. Analyze this script and provide specific, actionable recommendations for improvement.

SCRIPT OVERVIEW:
Total Scenes: ${script.scenes?.length || 0}
Characters: ${characters?.map((c: any) => c.name).join(', ') || 'None'}

SCENES:
${sceneSummaries}

FULL SCRIPT:
${JSON.stringify(script, null, 2)}

ANALYSIS TASK:
Identify 4-8 specific issues or opportunities for improvement. Focus on:
- Pacing problems (scenes too long/short, uneven flow)
- Character development gaps or inconsistencies
- Weak dialogue or on-the-nose exposition
- Missing emotional beats or unclear motivations
- Visual storytelling opportunities
- Scene transitions that need smoothing
- Tone inconsistencies
- Structural issues

For each recommendation, provide:
- A clear, specific title
- Detailed description of the issue
- Priority (high, medium, low)
- Category (pacing, dialogue, character, visual, structure, tone, emotion)

Return JSON:
{
  "recommendations": [
    {
      "id": "rec-1",
      "title": "Strengthen Act 2 turning point",
      "description": "Scene 5 lacks a clear decision point for the protagonist. Add a moment where they must choose between two conflicting values.",
      "priority": "high",
      "category": "structure"
    }
  ]
}

Be specific and actionable. Reference actual scenes when possible.`

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 4096
        }
      })
    }
  )
  
  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`)
  }
  
  const data = await response.json()
  const analysisText = data.candidates?.[0]?.content?.parts?.[0]?.text
  
  if (!analysisText) {
    throw new Error('No analysis generated')
  }
  
  // Extract JSON
  let jsonText = analysisText.trim()
  const codeBlockMatch = jsonText.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/)
  if (codeBlockMatch) {
    jsonText = codeBlockMatch[1].trim()
  }
  
  const analysis = JSON.parse(jsonText)
  return analysis.recommendations || []
}

