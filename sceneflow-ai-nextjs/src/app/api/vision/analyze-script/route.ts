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
  
  const prompt = `You are an expert script doctor. Analyze this script and provide 4–8 specific, actionable recommendations.

SCRIPT OVERVIEW:
Total Scenes: ${script.scenes?.length || 0}
Characters: ${characters?.map((c: any) => c.name).join(', ') || 'None'}

SCENES:
${sceneSummaries}

FULL SCRIPT:
${JSON.stringify(script, null, 2)}

OUTPUT REQUIREMENTS:
- For each recommendation, produce the following clearly delimited sections using these exact tags:
  [Problem]: One short paragraph describing the issue.
  [Impact]: One short paragraph explaining why it matters.
  [Solution]: 2–4 concrete actions the writer should take (numbered list preferred).
  [Examples]: 1–3 brief examples referencing specific scenes/lines.

IMPORTANT:
- Do not include additional prose between sections.
- Keep each section concise and readable with natural line breaks.
- If you also return JSON, ensure it matches this schema exactly:
{
  "recommendations": [
    {
      "id": "string",
      "title": "string",
      "priority": "high" | "medium" | "low",
      "category": "pacing" | "dialogue" | "character" | "visual" | "structure" | "tone" | "emotion" | "clarity",
      "problem": "string",
      "impact": "string",
      "actions": ["string", "string"],
      "examples": ["string", "string"]
    }
  ]
}

Be specific and actionable. Reference actual scenes when possible.`

  console.log('[Script Analysis] Sending prompt (first 500 chars):', prompt.substring(0, 500))
  console.log('[Script Analysis] API endpoint:', `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`)

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 8192  // Increased to accommodate longer responses
        },
        safetySettings: [
          {
            category: 'HARM_CATEGORY_HARASSMENT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
          },
          {
            category: 'HARM_CATEGORY_HATE_SPEECH',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
          },
          {
            category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
          },
          {
            category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
          }
        ]
      })
    }
  )
  
  if (!response.ok) {
    const errorText = await response.text()
    console.error('[Script Analysis] Gemini API error:', response.status, errorText)
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`)
  }
  
  const data = await response.json()
  console.log('[Script Analysis] Full API response:', JSON.stringify(data, null, 2))
  console.log('[Script Analysis] Candidates:', data.candidates)
  console.log('[Script Analysis] First candidate:', data.candidates?.[0])

  const analysisText = data.candidates?.[0]?.content?.parts?.[0]?.text

  if (!analysisText) {
    console.error('[Script Analysis] No text found in response')
    console.error('[Script Analysis] Response structure:', {
      hasCandidates: !!data.candidates,
      candidatesLength: data.candidates?.length,
      firstCandidate: data.candidates?.[0],
      hasContent: !!data.candidates?.[0]?.content,
      hasParts: !!data.candidates?.[0]?.content?.parts,
      partsLength: data.candidates?.[0]?.content?.parts?.length,
      finishReason: data.candidates?.[0]?.finishReason,
      safetyRatings: data.candidates?.[0]?.safetyRatings
    })
    
    // Check if response was blocked by safety filters
    if (data.candidates?.[0]?.finishReason === 'SAFETY') {
      console.error('[Script Analysis] Response blocked by safety filters')
      console.error('[Script Analysis] Safety ratings:', data.candidates[0].safetyRatings)
      throw new Error('Analysis blocked by content safety filters. Please adjust script content and try again.')
    }

    // Check for other finish reasons
    const finishReason = data.candidates?.[0]?.finishReason
    if (finishReason && finishReason !== 'STOP') {
      console.error('[Script Analysis] Response finished with reason:', finishReason)
      throw new Error(`Analysis generation failed: ${finishReason}. Please try again or reduce script size.`)
    }
    
    throw new Error('No analysis generated from Gemini API. Check logs for details.')
  }

  // Check if response was blocked by safety filters (additional check after text exists)
  if (data.candidates?.[0]?.finishReason === 'SAFETY') {
    console.error('[Script Analysis] Response blocked by safety filters')
    console.error('[Script Analysis] Safety ratings:', data.candidates[0].safetyRatings)
    throw new Error('Analysis blocked by content safety filters')
  }

  // Check if response was truncated
  if (data.candidates?.[0]?.finishReason === 'MAX_TOKENS') {
    console.warn('[Script Analysis] Response truncated due to MAX_TOKENS')
    console.warn('[Script Analysis] Usage:', data.usageMetadata)
  }
  
  // Extract JSON
  let jsonText = analysisText.trim()
  const codeBlockMatch = jsonText.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/)
  if (codeBlockMatch) {
    jsonText = codeBlockMatch[1].trim()
  }
  
  try {
    const analysis = JSON.parse(jsonText)
    return analysis.recommendations || []
  } catch (parseError) {
    console.error('[Script Analysis] JSON parse error:', parseError)
    console.error('[Script Analysis] Text to parse:', jsonText.substring(0, 500))
    throw new Error('Failed to parse analysis response as JSON. The AI response may be malformed.')
  }
}

