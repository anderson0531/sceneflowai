import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 120
export const runtime = 'nodejs'

interface AnalyzeScriptRequest {
  projectId: string
  script: any
  characters: any[]
  compact?: boolean
}

export async function POST(req: NextRequest) {
  try {
    const { projectId, script, characters, compact }: AnalyzeScriptRequest = await req.json()
    
    if (!projectId || !script) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    
    console.log('[Script Analysis] Analyzing script for project:', projectId)
    
    const recommendations = await analyzeScript(script, characters, !!compact)
    
    return NextResponse.json({
      success: true,
      recommendations,
      generatedAt: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('[Script Analysis] Error:', error)
    const msg = String(error?.message || '')
    const isTimeout = msg.includes('fetch failed') || msg.toLowerCase().includes('timeout')
    const status = isTimeout ? 504 : 500
    const diagnosticId = `ana-${Date.now()}`
    if (isTimeout) console.error('[Script Analysis] Diagnostic ID:', diagnosticId)
    return NextResponse.json({ error: msg || 'Failed to analyze script', diagnosticId }, { status })
  }
}

async function analyzeScript(script: any, characters: any[], compact: boolean): Promise<any[]> {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY
  if (!apiKey) throw new Error('Google API key not configured')
  
  const limit = compact ? 12 : script.scenes?.length || 0
  const sceneSummaries = (script.scenes || []).slice(0, limit).map((scene: any, idx: number) => {
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
          temperature: 0.2,
          maxOutputTokens: compact ? 2048 : 4096,
          responseMimeType: 'application/json'
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

  const parts = (data.candidates || [])
    .map((c: any) => c?.content?.parts?.[0]?.text)
    .filter((t: any) => typeof t === 'string' && t.trim().length > 0)
  const analysisText = parts[0] || ''

  if (!analysisText) {
    // Safety/finish reason diagnostics
    const finish = data.candidates?.[0]?.finishReason
    if (finish === 'SAFETY') {
      console.error('[Script Analysis] Response blocked by safety filters', data.candidates?.[0]?.safetyRatings)
      throw new Error('Analysis blocked by content safety filters')
    }
    throw new Error('No analysis generated')
  }

  const finish = data.candidates?.[0]?.finishReason

  // Try JSON first (code fence, raw, or balanced)
  const extractBalancedJson = (text: string): string => {
    const start = text.indexOf('{')
    if (start === -1) return ''
    const chars = Array.from(text)
    let depth = 0
    let inStr = false
    let esc = false
    for (let i = start; i < chars.length; i++) {
      const c = chars[i]
      if (inStr) {
        if (esc) { esc = false }
        else if (c === '\\') { esc = true }
        else if (c === '"') { inStr = false }
      } else {
        if (c === '"') inStr = true
        else if (c === '{') depth++
        else if (c === '}') {
          depth--
          if (depth === 0) return chars.slice(start, i + 1).join('')
        }
      }
    }
    return depth > 0 ? chars.slice(start).join('') + '}'.repeat(depth) : ''
  }

  const normalizeForJson = (input: string): string => {
    let s = input.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    s = s
      .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
      .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
      .replace(/[\u2013\u2014]/g, '-')
    s = s.replace(/,\s*(\]|\})/g, '$1')
    return s
  }

  try {
    const fence = analysisText.match(/```json\s*([\s\S]*?)\s*```/i)
    const rawJson = fence ? fence[1] : (analysisText.trim().startsWith('{') ? analysisText : '')
    const candidate = rawJson || extractBalancedJson(analysisText)
    if (candidate) {
      const parsed = JSON.parse(normalizeForJson(candidate))
      return parsed?.recommendations || []
    }
  } catch (e) {
    // If the model hit token limit, retry once with compact mode
    if (finish === 'MAX_TOKENS' && !compact) {
      console.warn('[Script Analysis] MAX_TOKENS reached. Retrying with compact prompt...')
      return await analyzeScript(script, characters, true)
    }
    console.warn('[Script Analysis] JSON parsing failed, falling back to tagged sections')
  }

  // Tagged fallback: split by [Problem]
  const blocks: string[] = analysisText.split(/\n\s*\[Problem\]\s*:\s*/i).map((s: string) => s.trim()).filter(Boolean)
  const toList = (src: string): string[] => {
    if (!src) return []
    const numbered = src.match(/\n?\s*\d+\.[\s\S]*?(?=\n\s*\d+\.|$)/g)
    if (numbered) return numbered.map(i => i.replace(/^\s*\d+\.\s*/, '').trim()).filter(Boolean)
    return src.split(/\n\s*-\s+|\n\*\s+|\n+/).map(x => x.trim()).filter(Boolean)
  }
  const recs = blocks.map((block: string, idx: number) => {
    const problem = block.split(/\n\s*\[Impact\]\s*:/i)[0]?.replace(/^\s*\[?Problem\]?\s*:\s*/i, '').trim()
    const impactMatch = block.match(/\[Impact\]\s*:\s*([\s\S]*?)(?=\n\s*\[[A-Za-z]+\]\s*:|$)/i)
    const solutionMatch = block.match(/\[Solution\]\s*:\s*([\s\S]*?)(?=\n\s*\[[A-Za-z]+\]\s*:|$)/i)
    const examplesMatch = block.match(/\[Examples?\]\s*:\s*([\s\S]*?)(?=\n\s*\[[A-Za-z]+\]\s*:|$)/i)
    const impact = (impactMatch?.[1] || '').trim()
    const actions = toList((solutionMatch?.[1] || '').trim())
    const examples = toList((examplesMatch?.[1] || '').trim()).slice(0, 3)

    const descriptionSections: string[] = []
    if (problem) descriptionSections.push(`[Problem]: ${problem}`)
    if (impact) descriptionSections.push(`[Impact]: ${impact}`)
    if (actions.length) descriptionSections.push('[Solution]:\n' + actions.map((a, i) => `${i + 1}. ${a}`).join('\n'))
    if (examples.length) descriptionSections.push('[Examples]:\n' + examples.map(e => `- ${e}`).join('\n'))

    return {
      id: `rec-${idx + 1}`,
      title: (problem?.match(/^[^.?!]+[.?!]?/)?.[0] || 'Recommendation').trim(),
      description: descriptionSections.join('\n\n'),
      priority: 'medium',
      category: 'clarity'
    }
  }).filter((r: any) => r.description)

  return recs
}

