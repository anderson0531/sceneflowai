import { NextRequest } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 300

type Role = 'system' | 'user'
interface Message { role: Role; content: string }

const SYSTEM_PROMPT = `You are the SceneFlow AI Outline Generator, acting as an expert Assistant Director and Script Supervisor. Your task is to analyze a concept treatment and break it down into a comprehensive, production-ready scene-by-scene outline.

RULES:
1. Identify major narrative beats and divide the story into individual scenes.
2. A new scene is required whenever the location or time changes.
3. Sluglines must follow the format: INT. or EXT. LOCATION - TIME (e.g., DAY, NIGHT, LATER).

OUTPUT FORMAT:
You MUST return the output strictly as a JSON object containing a single key named "scenes", which holds an array of scene objects.

Each object in the "scenes" array must adhere to the following TypeScript interface:

interface Scene {
  id: string; // Unique identifier (e.g., "s1", "s2")
  slugline: string; // e.g., "INT. WAREHOUSE - NIGHT"
  characters: string[]; // Characters present in the scene
  summary: string; // A detailed, action-oriented paragraph summarizing the plot progression and key emotional beats.
  objective: string; // The narrative purpose of the scene.
}`

async function callOpenAIJson(messages: Message[], apiKey: string): Promise<any> {
  const body = {
    model: 'gpt-4o',
    messages,
    temperature: 0.5,
    response_format: { type: 'json_object' },
  }
  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })
  if (!resp.ok) {
    const txt = await resp.text().catch(() => 'unknown error')
    throw new Error(`OpenAI JSON error: ${resp.status} ${txt}`)
  }
  const json = await resp.json()
  const content: string | undefined = json?.choices?.[0]?.message?.content
  if (!content) throw new Error('No content from OpenAI')
  return JSON.parse(content)
}

async function callGeminiJson(messages: Message[], apiKey: string): Promise<any> {
  // Convert to Gemini format
  const contents = messages.map(m => ({
    role: m.role === 'system' ? 'user' : (m.role === 'user' ? 'user' : 'model'),
    parts: [{ text: m.content }]
  }))
  // Force JSON by instruction
  contents.unshift({ role: 'user', parts: [{ text: 'Return ONLY valid JSON with a root key "scenes" as specified. No prose.' }]})

  const body = {
    contents,
    generationConfig: {
      temperature: 0.5,
      responseMimeType: 'application/json'
    }
  }
  const model = 'gemini-2.5-flash'
  const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  })
  if (!resp.ok) {
    const txt = await resp.text().catch(() => 'unknown error')
    throw new Error(`Gemini JSON error: ${resp.status} ${txt}`)
  }
  const json = await resp.json()
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('No content from Gemini')
  return JSON.parse(text)
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'OPENAI_API_KEY not configured' }), { status: 500 })
    }

    const data = await req.json().catch(() => ({}))
    const treatment: string = data?.treatment || ''
    if (!treatment || typeof treatment !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing treatment' }), { status: 400 })
    }

    const messages: Message[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `Treatment:\n${treatment}\n\nReturn ONLY valid JSON as specified.` },
    ]

    let result: any | null = null
    // Try OpenAI first
    try {
      result = await callOpenAIJson(messages, apiKey)
    } catch (errOpenAI) {
      // Fallback to Gemini if available
      const geminiKey = process.env.GEMINI_API_KEY
      if (!geminiKey) throw errOpenAI
      try {
        result = await callGeminiJson(messages, geminiKey)
      } catch (errGemini) {
        // As last resort, attempt to extract JSON from OpenAI error text if any
        const text = String(errOpenAI)
        const match = text.match(/\{[\s\S]*\}/)
        if (match) {
          try { result = JSON.parse(match[0]) } catch {}
        }
        if (!result) throw errGemini
      }
    }
    if (!result?.scenes || !Array.isArray(result.scenes)) {
      return new Response(JSON.stringify({ error: 'Model did not return scenes[]' }), { status: 502 })
    }
    return new Response(JSON.stringify({ scenes: result.scenes }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: 'Outline generation failed', details: e?.message || String(e) }), { status: 500 })
  }
}


