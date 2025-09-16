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

    const result = await callOpenAIJson(messages, apiKey)
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


