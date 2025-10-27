import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 300

type SimpleBeat = {
  act: string
  beat_title: string
  scene: string
  duration_seconds?: number
}

type SimpleBlueprint = {
  title: string
  logline: string
  synopsis: string
  structure: 'Series Structure' | 'Documentary Structure' | '3-Act Structure' | '5-Act Structure'
  genre: string[]
  tone: string[]
  visual_language: string[]
  audience: {
    primary_demographic: string
    psychographics: string
    viewing_context: string
  }
  beats: SimpleBeat[]
}

function toPrompt(input: string) {
  return `Generate a captivating Film Treatment as JSON.

SCHEMA:
{
  "title": string,
  "logline": string (one sentence hook),
  "synopsis": string (max 60 words),
  "structure": "3-Act Structure" | "5-Act Structure" | "Documentary Structure" | "Series Structure",
  "genre": string[] (2-4 specific sub-genres),
  "tone": string[] (3-6 vivid adjectives),
  "visual_language": string[] (4-6 concrete techniques),
  "audience": {
    "primary_demographic": string,
    "psychographics": string,
    "viewing_context": string
  },
  "beats": [
    {
      "act": string,
      "beat_title": string,
      "scene": string (rich sensory detail),
      "duration_seconds": number
    }
  ]
}

RULES:
- Generate 6-8 compelling beats with strong narrative arc
- Prioritize memorable characters and emotional hooks
- NO placeholders - infer all values
- Return ONLY valid JSON

INPUT: ${input}`
}

function stripCodeFences(text: string): string {
  return text.replace(/^```json\s*\n?|^```\s*\n?|```\s*$/gm, '').trim()
}

function extractJson(text: string): string {
  const cleaned = stripCodeFences(text)
  // Try parsing directly first
  try { JSON.parse(cleaned); return cleaned } catch {}
  // Find the first '{' and last '}' and attempt to parse the slice
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start >= 0 && end > start) {
    const candidate = cleaned.slice(start, end + 1)
    try { JSON.parse(candidate); return candidate } catch {}
  }
  // Attempt simple bracket balancing
  let buffer = ''
  let depth = 0
  let started = false
  for (const ch of cleaned) {
    if (ch === '{') { depth++; started = true }
    if (started) buffer += ch
    if (ch === '}') { depth--; if (depth === 0 && started) break }
  }
  if (buffer) {
    try { JSON.parse(buffer); return buffer } catch {}
  }
  // Give up; return original for higher-level error handling
  return cleaned
}

export async function POST(req: NextRequest) {
  const reqId = crypto.randomUUID()
  try {
    const body = await req.json()
    const input = String(body?.input || '')
    const variantsRequested = Math.max(1, Math.min(5, Number(body?.variants || 1)))
    if (!input) return NextResponse.json({ success: false, error: 'Missing input' }, { status: 400 })

    const provider = process.env.GOOGLE_GEMINI_API_KEY || process.env.GOOGLE_API_KEY ? 'gemini' : 'openai'
    const model = provider === 'gemini' ? (process.env.GEMINI_MODEL || 'gemini-2.5-flash') : (process.env.OPENAI_MODEL || 'gpt-4.1')
    
    console.log(`[Blueprint V3] Generating ${variantsRequested} variant(s) - model: ${model}`)
    const prompt = toPrompt(input)

    async function generateOne(): Promise<SimpleBlueprint> {
      let jsonText = ''
      if (provider === 'gemini') {
        const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GOOGLE_GEMINI_API_KEY || process.env.GOOGLE_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        })
        const data = await resp.json()
        jsonText = data?.candidates?.[0]?.content?.parts?.[0]?.text || ''
      } else {
        const resp = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
          body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }] })
        })
        const data = await resp.json()
        jsonText = data?.choices?.[0]?.message?.content || ''
      }
      if (!jsonText || typeof jsonText !== 'string') throw new Error('Empty model response')
      const repaired = extractJson(jsonText)
      const parsed: SimpleBlueprint = JSON.parse(repaired)
      return parsed
    }

    // Generate with retries until we reach the requested variant count (cap extra attempts)
    const target = variantsRequested
    const maxAttempts = target + 1  // Only 1 retry max for speed
    const results: SimpleBlueprint[] = []
    let attempts = 0
    while (results.length < target && attempts < maxAttempts) {
      const remaining = target - results.length
      const settled = await Promise.allSettled(Array.from({ length: remaining }, () => generateOne()))
      for (const s of settled) {
        if (s.status === 'fulfilled' && s.value) results.push(s.value)
      }
      attempts++
    }

    if (!results.length) throw new Error('No valid variants generated')

    const payload = target === 1 ? results[0] : results.slice(0, target)

    return NextResponse.json({ success: true, data: payload, debug: { api: 'v3-blueprint', provider, model, reqId, variants: target } }, {
      headers: {
        'x-sf-api': 'v3-blueprint',
        'x-sf-provider': provider,
        'x-sf-model': model,
        'x-sf-variants': String(target),
        'x-sf-request-id': reqId,
        'cache-control': 'no-store',
      }
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Unknown error', debug: { api: 'v3-blueprint', reqId } }, { status: 400, headers: { 'x-sf-request-id': reqId, 'cache-control': 'no-store' } })
  }
}


