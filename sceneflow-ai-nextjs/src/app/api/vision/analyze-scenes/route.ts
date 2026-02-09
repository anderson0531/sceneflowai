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
  recommendations: SceneRecommendation[]
}

interface SceneRecommendation {
  text: string
  category: string // Matches script-level categories: Dialogue Issues, Narration/Description Issues, etc.
  targetElement?: string // The specific line, action, or element to change
  impact: 'structural' | 'polish' // structural = requires rewrite, polish = minor adjustment
}

interface AudienceReviewContext {
  overallScore: number
  categories?: { name: string; score: number; weight: number }[]
  recommendations?: { text: string; priority: string; category?: string }[]
  improvements?: string[]
}

interface AnalyzeScenesRequest {
  projectId: string
  script: {
    title?: string
    logline?: string
    scenes: any[]
    characters?: any[]
  }
  audienceReview?: AudienceReviewContext
}

export async function POST(req: NextRequest) {
  try {
    const { projectId, script, audienceReview }: AnalyzeScenesRequest = await req.json()

    if (!projectId || !script?.scenes?.length) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const sceneCount = script.scenes.length
    console.log(`[Scene Analysis] Analyzing ${sceneCount} scenes for project: ${projectId}`)

    const sceneAnalysis = await generateSceneAnalysis(script, audienceReview)

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

async function generateSceneAnalysis(script: any, audienceReview?: AudienceReviewContext): Promise<SceneAnalysis[]> {
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

  // Build script-level context from audienceReview
  let scriptContext = ''
  if (audienceReview) {
    scriptContext = `
## SCRIPT-LEVEL ANALYSIS CONTEXT (from overall review)
The script received an overall Audience Resonance score of ${audienceReview.overallScore}/100.

${audienceReview.categories && audienceReview.categories.length > 0 ? `
Category Scores:
${audienceReview.categories.map(c => `- ${c.name}: ${c.score}/100 (weight: ${c.weight}%)`).join('\n')}
` : ''}

${audienceReview.recommendations && audienceReview.recommendations.length > 0 ? `
Script-Level Issues Identified:
${audienceReview.recommendations.map(r => `- [${r.priority}] ${r.category || 'General'}: ${r.text}`).join('\n')}

IMPORTANT: Your scene-level analysis should identify WHERE these script-level issues occur. 
For each script-level recommendation, identify which specific scenes exhibit this problem.
` : ''}

${audienceReview.improvements && audienceReview.improvements.length > 0 ? `
Required Improvements:
${audienceReview.improvements.map(i => `- ${i}`).join('\n')}
` : ''}

SCORE CALIBRATION:
- The overall script score is ${audienceReview.overallScore}. Scene scores should be consistent with this.
- If the script overall is ${audienceReview.overallScore}, individual scenes should average around that score.
- Some scenes may score higher/lower, but avoid inflating all scenes to 85+ when overall is ${audienceReview.overallScore}.
`
  }

  const prompt = `You are an expert screenplay analyst. Analyze each scene in this script and provide detailed, actionable feedback.

Script: ${script.title || 'Untitled Script'}
Logline: ${script.logline || 'No logline provided'}
Total Scenes: ${sceneCount}
${scriptContext}

${sceneDetails}

For EACH scene (1 through ${sceneCount}), provide:

1. **score** (1-100): Overall quality score - USE THIS CALIBRATION:
   - 90-100: Exceptional - production ready, masterful execution
   - 80-89: Strong - minor polish needed, works well
   - 75-79: Good - solid foundation, some refinement needed
   - 65-74: Fair - has potential but needs noticeable work  
   - 55-64: Needs Work - significant issues to address
   - Below 55: Major Revision - fundamental problems
   
   Note: Be honest and calibrated. A scene that "works but has issues" is 70-79, not 85+.

2. **pacing**: slow / moderate / fast
   - Consider dialogue density, action beats, tension buildup

3. **tension**: low / medium / high
   - Consider conflict, stakes, dramatic irony

4. **characterDevelopment**: minimal / moderate / strong
   - Consider character reveals, growth moments, depth

5. **visualPotential**: low / medium / high
   - Consider cinematographic opportunities, memorable imagery

6. **notes**: One sentence identifying what works well AND/OR the most impactful improvement needed

7. **recommendations**: Array of 2-4 specific, actionable fixes. CRITICAL REQUIREMENTS:
   - Each must quote or reference SPECIFIC content from the scene
   - Each must specify the category of issue (e.g., "Dialogue Issues", "Narration/Description Issues", "Pacing Issues")
   - Each should include the targetElement (the specific line, action, or element to change)
   - Each MUST specify impact level:
     * "structural" = requires rewriting/restructuring (e.g., condense dialogue, reorder beats, convert narration to action)
     * "polish" = minor adjustment to existing content (e.g., add emotional tag, tweak word choice)
   
   STRUCTURAL EXAMPLES (impact: "structural"):
   - { "text": "Condense the initial confrontation - combine Ben's first two speeches into one", "category": "Pacing Issues", "targetElement": "Lines 13-15", "impact": "structural" }
   - { "text": "Replace narration 'Sarah felt torn' with visual action showing hesitation through body language", "category": "Narration/Description Issues", "targetElement": "Narration about Sarah's feelings", "impact": "structural" }
   - { "text": "Rewrite Alexander's dialogue to be subtly manipulative instead of directly dismissive", "category": "Dialogue Issues", "targetElement": "ALEXANDER: I understand your concern", "impact": "structural" }
   
   POLISH EXAMPLES (impact: "polish"):
   - { "text": "Add [hesitantly] tag to SARAH's line to convey internal conflict", "category": "Dialogue Issues", "targetElement": "SARAH: I'll do it", "impact": "polish" }
   - { "text": "Strengthen the visual description of the security guards' synchronized movements", "category": "Narration/Description Issues", "targetElement": "Action describing guards", "impact": "polish" }

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
      "recommendations": [
        { "text": "Replace 'She was nervous' with visual cues - trembling hands, avoiding eye contact", "category": "Narration/Description Issues", "targetElement": "Narration: She was nervous", "impact": "structural" },
        { "text": "Add a beat before JOHN's reveal to build suspense", "category": "Pacing Issues", "targetElement": "JOHN: I'm your father", "impact": "structural" }
      ]
    }
  ]
}

CRITICAL REMINDERS:
- Analyze ALL ${sceneCount} scenes
- Be constructive but HONEST - calibrate scores realistically
- Every recommendation must reference specific content from the scene
- Mark issues that require REWRITING as "structural", minor tweaks as "polish"
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
      recommendations: Array.isArray(sa.recommendations) ? sa.recommendations.map((rec: any) => {
        // Normalize recommendations to include impact field
        if (typeof rec === 'string') {
          return { text: rec, category: 'General', impact: 'structural' as const }
        }
        return {
          text: rec.text || rec,
          category: rec.category || 'General',
          targetElement: rec.targetElement,
          impact: rec.impact === 'polish' ? 'polish' as const : 'structural' as const // Default to structural
        }
      }) : []
    }))
  } catch (parseError) {
    console.error('[Scene Analysis] JSON parse error:', parseError)
    console.error('[Scene Analysis] Response preview:', jsonText.substring(0, 500))
    return []
  }
}
