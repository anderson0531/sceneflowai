import { NextRequest, NextResponse } from 'next/server'
import { generateText } from '@/lib/vertexai/gemini'

export const maxDuration = 120
export const runtime = 'nodejs'

interface SceneAnalysis {
  sceneNumber: number
  sceneHeading: string
  score: number
  pacing: 'slow' | 'moderate' | 'fast'
  tension: 'low' | 'medium' | 'high'
  characterDevelopment: 'minimal' | 'moderate' | 'strong'
  visualPotential: 'low' | 'medium' | 'high'
  notes: string
  recommendations: string[]
}

interface AnalyzeScenesRequest {
  projectId: string
  script: {
    title?: string
    logline?: string
    scenes: any[]
    characters?: any[]
  }
}

export async function POST(req: NextRequest) {
  try {
    const { projectId, script }: AnalyzeScenesRequest = await req.json()

    if (!projectId || !script?.scenes?.length) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const sceneCount = script.scenes.length
    console.log(`[Scene Analysis] Analyzing ${sceneCount} scenes for project: ${projectId}`)

    const sceneAnalysis = await generateSceneAnalysis(script)

    console.log(`[Scene Analysis] Generated analysis for ${sceneAnalysis.length} scenes`)

    return NextResponse.json({
      success: true,
      sceneAnalysis,
      sceneCount,
      generatedAt: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('[Scene Analysis] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to analyze scenes' },
      { status: 500 }
    )
  }
}

async function generateSceneAnalysis(script: any): Promise<SceneAnalysis[]> {
  const sceneCount = script.scenes?.length || 0
  
  if (sceneCount === 0) {
    return []
  }

  // Build detailed scene content for analysis
  const sceneDetails = script.scenes.map((scene: any, idx: number) => {
    const heading = scene.heading || 'Untitled'
    const action = scene.action || 'No action'
    const narration = scene.narration || ''
    const dialogueLines = (scene.dialogue || []).map((d: any) => 
      `    ${d.character || 'UNKNOWN'}: ${d.line || ''}`
    ).join('\n')
    const duration = scene.duration || 0
    
    return `=== SCENE ${idx + 1}: ${heading} ===
Duration: ${duration}s
Action: ${action}
${narration ? `Narration: ${narration}` : ''}
${dialogueLines ? `Dialogue:\n${dialogueLines}` : 'No dialogue'}
---`
  }).join('\n\n')

  const prompt = `You are an expert screenplay analyst. Analyze each scene in this script and provide detailed feedback.

Script: ${script.title || 'Untitled Script'}
Logline: ${script.logline || 'No logline provided'}
Total Scenes: ${sceneCount}

${sceneDetails}

For EACH scene (1 through ${sceneCount}), provide:

1. **score** (1-100): Overall quality score
   - 90-100: Exceptional scene, production ready
   - 80-89: Strong scene with minor polish needed
   - 70-79: Good foundation, needs refinement
   - 60-69: Has potential but needs significant work
   - Below 60: Needs major revision

2. **pacing**: slow / moderate / fast
   - Consider dialogue density, action beats, tension buildup

3. **tension**: low / medium / high
   - Consider conflict, stakes, dramatic irony

4. **characterDevelopment**: minimal / moderate / strong
   - Consider character reveals, growth moments, depth

5. **visualPotential**: low / medium / high
   - Consider cinematographic opportunities, memorable imagery

6. **notes**: One sentence identifying what works well OR the most impactful improvement needed

7. **recommendations**: Array of 2-4 specific, actionable fixes. Each should be:
   - Concrete and self-contained
   - Directly implementable by a revision AI
   - Examples:
     * "Add subtext to Sarah's dialogue — she agrees too quickly without showing internal conflict"
     * "Replace the narration explaining the mood with a visual action beat"
     * "Extend the beat before John's revelation to build more suspense"

OUTPUT FORMAT - Return ONLY valid JSON (no markdown, no code fences):
{
  "sceneAnalysis": [
    {
      "sceneNumber": 1,
      "sceneHeading": "INT. LOCATION - TIME",
      "score": 75,
      "pacing": "moderate",
      "tension": "medium",
      "characterDevelopment": "moderate",
      "visualPotential": "high",
      "notes": "Strong visual opening but dialogue needs more subtext",
      "recommendations": ["Add a beat of hesitation before...", "Replace exposition with action..."]
    }
  ]
}

IMPORTANT:
- Analyze ALL ${sceneCount} scenes
- Be constructive but honest
- Focus on actionable improvements
- Ensure JSON is valid with proper escaping`

  // Token budget: 500 tokens per scene for detailed analysis
  const tokenBudget = Math.min(32000, 4000 + sceneCount * 500)
  
  console.log(`[Scene Analysis] Calling Gemini with ${tokenBudget} token budget for ${sceneCount} scenes`)

  const result = await generateText(prompt, {
    model: 'gemini-2.5-flash',
    temperature: 0.3, // Slightly creative for better recommendations
    maxOutputTokens: tokenBudget,
    thinkingBudget: 0
  })

  if (!result.text) {
    console.error('[Scene Analysis] Empty response from Gemini')
    return []
  }

  console.log(`[Scene Analysis] Raw response length: ${result.text.length}`)

  // Parse JSON response
  let jsonText = result.text.trim()
  
  // Extract from markdown code blocks if present
  const codeBlockMatch = jsonText.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/)
  if (codeBlockMatch) {
    jsonText = codeBlockMatch[1].trim()
  }

  try {
    const parsed = JSON.parse(jsonText)
    const analyses = parsed.sceneAnalysis || parsed.scenes || []
    
    // Validate and normalize each scene analysis
    return analyses.map((sa: any, idx: number) => ({
      sceneNumber: sa.sceneNumber || idx + 1,
      sceneHeading: sa.sceneHeading || script.scenes[idx]?.heading || 'Unknown',
      score: Math.min(100, Math.max(1, sa.score || 70)),
      pacing: ['slow', 'moderate', 'fast'].includes(sa.pacing) ? sa.pacing : 'moderate',
      tension: ['low', 'medium', 'high'].includes(sa.tension) ? sa.tension : 'medium',
      characterDevelopment: ['minimal', 'moderate', 'strong'].includes(sa.characterDevelopment) ? sa.characterDevelopment : 'moderate',
      visualPotential: ['low', 'medium', 'high'].includes(sa.visualPotential) ? sa.visualPotential : 'medium',
      notes: sa.notes || 'No specific notes',
      recommendations: Array.isArray(sa.recommendations) ? sa.recommendations : []
    }))
  } catch (parseError) {
    console.error('[Scene Analysis] JSON parse error:', parseError)
    console.error('[Scene Analysis] Response preview:', jsonText.substring(0, 500))
    return []
  }
}
