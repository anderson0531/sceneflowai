import { NextRequest } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 300

type Role = 'system' | 'user'
interface Message { role: Role; content: string }

const SYSTEM_PROMPT = `You are the SceneFlow AI Script Generator, acting as a professional Screenwriter. Your task is to transform a specific chunk of a scene outline into a fully realized screenplay segment.

FORMATTING:
You MUST adhere strictly to Fountain syntax.
- Sluglines in ALL CAPS (must match the outline exactly).
- Action lines in present tense, visual and concise.
- Character names in ALL CAPS.
- Dialogue immediately follows the character name.
- Parentheticals in parentheses (e.g., (whispering)).

RULES:
1. Write the scenes provided in the 'outline_chunk' ONLY. Do not summarize or skip scenes.
2. Use the 'previous_scene_summary' to ensure a smooth narrative transition and continuity.
3. Use the 'treatment_context' to maintain consistent character voices and tone.
4. Expand the summaries into vivid action and compelling dialogue. Show, don't tell.

OUTPUT:
Provide the output as a plain text string formatted using Fountain syntax. Start immediately with the first scene in the chunk.`

async function callOpenAIStream(messages: Message[], apiKey: string): Promise<Response> {
  const body = {
    model: 'gpt-4o',
    messages,
    temperature: 0.7,
    stream: true,
  }
  return fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return new Response('OPENAI_API_KEY not configured', { status: 500 })
  }
  const data = await req.json().catch(() => ({}))
  const outlineChunk = data?.outline_chunk
  const treatmentContext = data?.treatment_context || ''
  const previousSummary = data?.previous_scene_summary || ''
  if (!Array.isArray(outlineChunk) || outlineChunk.length === 0) {
    return new Response('outline_chunk required', { status: 400 })
  }

  const outlineJson = JSON.stringify(outlineChunk)
  const userPrompt = [
    `Context (treatment summary): ${treatmentContext}`,
    `Previous scene summary: ${previousSummary}`,
    `Outline chunk (JSON): ${outlineJson}`,
    'Write only the Fountain text for these scenes. Do not include explanations.',
  ].join('\n\n')

  const messages: Message[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userPrompt },
  ]

  const upstream = await callOpenAIStream(messages, apiKey)
  if (!upstream.ok || !upstream.body) {
    const txt = await upstream.text().catch(() => 'stream failed')
    return new Response(`Upstream error: ${txt}`, { status: upstream.status || 502 })
  }

  // Proxy the streamed response as text
  const readable = upstream.body
  const decoder = new TextDecoder()
  const encoder = new TextEncoder()

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = readable.getReader()
      let buffer = ''
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          // OpenAI event stream sends lines starting with 'data:'; extract content chunks
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''
          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed.startsWith('data:')) continue
            const payload = trimmed.slice(5).trim()
            if (payload === '[DONE]') continue
            try {
              const json = JSON.parse(payload)
              const delta = json?.choices?.[0]?.delta?.content
              if (delta) controller.enqueue(encoder.encode(delta))
            } catch {}
          }
        }
        if (buffer) {
          try {
            const json = JSON.parse(buffer.replace(/^data:\s*/, ''))
            const delta = json?.choices?.[0]?.delta?.content
            if (delta) controller.enqueue(encoder.encode(delta))
          } catch {}
        }
      } catch (e) {
        controller.error(e)
        return
      }
      controller.close()
    }
  })

  return new Response(stream, {
    status: 200,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
  })
}


