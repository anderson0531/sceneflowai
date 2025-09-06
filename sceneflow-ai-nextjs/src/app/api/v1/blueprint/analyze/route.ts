import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { callLLM, LLMConfig, Provider } from '@/services/llmGateway'

const RequestSchema = z.object({
  input: z.string().min(1),
  targetAudience: z.string().optional(),
  keyMessage: z.string().optional(),
  tone: z.string().optional(),
  genre: z.string().optional(),
  duration: z.number().optional(),
  platform: z.string().optional(),
  provider: z.union([z.literal('openai'), z.literal('gemini')]).optional(),
  model: z.string().optional(),
})

const BlueprintSchema = z.object({
  logline: z.string(),
  synopsis: z.string(),
  coreThemes: z.array(z.string()),
  structure: z.string(),
  characters: z.array(z.object({
    name: z.string(),
    role: z.string(),
    description: z.string(),
  })),
  beats: z.array(z.object({
    act: z.string(),
    number: z.number(),
    title: z.string(),
    description: z.string(),
  }))
})

export async function POST(request: NextRequest) {
  const reqId = crypto.randomUUID()
  try {
    const body = await request.json()
    const data = RequestSchema.parse(body)

    // Resolve provider/model with safe fallback based on available keys
    const hasGemini = !!(process.env.GOOGLE_GEMINI_API_KEY || process.env.GOOGLE_API_KEY)
    const hasOpenAI = !!process.env.OPENAI_API_KEY
    const resolvedProvider: Provider = ((): Provider => {
      if (data.provider === 'gemini' || data.provider === 'openai') return data.provider
      if (hasGemini) return 'gemini'
      if (hasOpenAI) return 'openai'
      return 'gemini'
    })()
    const model = data.model || (resolvedProvider === 'openai' ? (process.env.OPENAI_MODEL || 'gpt-4.1') : (process.env.GEMINI_MODEL || 'gemini-2.5-flash'))

    if (resolvedProvider === 'gemini' && !hasGemini) {
      if (hasOpenAI) {
        // transparently switch to OpenAI
        return await POST(new NextRequest(request.url, {
          method: 'POST',
          body: JSON.stringify({ ...data, provider: 'openai', model }),
          headers: request.headers
        }))
      }
      throw new Error('Google Gemini API key not configured')
    }
    if (resolvedProvider === 'openai' && !hasOpenAI) {
      if (hasGemini) {
        return await POST(new NextRequest(request.url, {
          method: 'POST',
          body: JSON.stringify({ ...data, provider: 'gemini' }),
          headers: request.headers
        }))
      }
      throw new Error('OpenAI API key not configured')
    }

    const cfg: LLMConfig = { provider: resolvedProvider, model }

    const prompt = `You are a professional story analyst. Analyze the INPUT and return ONLY JSON match this schema:\n\n{
  "logline": string,
  "synopsis": string, // <= 50 words, original summary; do NOT copy input
  "coreThemes": string[],
  "structure": "3-Act Structure" | "5-Act Structure" | "Hero's Journey" | "Documentary Structure" | "Series Structure",
  "characters": [{ "name": string, "role": string, "description": string }],
  "beats": [{ "act": string, "number": number, "title": string, "description": string }]
}

CRITICAL RULES:
- Never copy script content verbatim; write original summaries.
- Keep synopsis <= 50 words.
- Separate beats from synopsis; beats are structural notes.

CONTEXT:\nTarget Audience: ${data.targetAudience || 'General'}\nKey Message: ${data.keyMessage || 'Not specified'}\nTone: ${data.tone || 'Professional'}\nGenre: ${data.genre || 'Documentary'}\nDuration: ${data.duration || 60}s\nPlatform: ${data.platform || 'Multi-platform'}\n\nINPUT:\n${data.input}`

    const raw = await callLLM(cfg, prompt)
    const parsed = BlueprintSchema.parse(JSON.parse(raw))

    return NextResponse.json({ success: true, data: parsed, debug: { api: 'v1-blueprint', provider: resolvedProvider, model, reqId } }, {
      headers: {
        'x-sf-api': 'v1-blueprint',
        'x-sf-provider': resolvedProvider,
        'x-sf-model': model,
        'x-sf-request-id': reqId,
        'cache-control': 'no-store',
      }
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Unknown error', debug: { api: 'v1-blueprint', reqId } }, { status: 400, headers: { 'x-sf-request-id': reqId, 'cache-control': 'no-store' } })
  }
}


