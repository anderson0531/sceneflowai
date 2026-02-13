import { z } from 'zod'
import { generateText } from '@/lib/vertexai/gemini'

export type Provider = 'openai' | 'gemini'

export interface LLMConfig {
  provider: Provider
  model: string
  apiKey?: string
  organization?: string
  /** Maximum output tokens for generation (default: 8192) */
  maxOutputTokens?: number
  /** Temperature for generation (default: 0.2) */
  temperature?: number
  /** Timeout in ms (default: 90000) */
  timeoutMs?: number
}

export const JsonResponseSchema = z.string().min(2)

export async function callLLM(config: LLMConfig, prompt: string): Promise<string> {
  const { provider, model, maxOutputTokens = 8192, temperature = 0.2, timeoutMs } = config

  if (provider === 'openai') {
    const apiKey = config.apiKey || process.env.OPENAI_API_KEY
    if (!apiKey) throw new Error('OpenAI API key not configured')
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        ...(config.organization ? { 'OpenAI-Organization': config.organization } : {}),
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [
          { role: 'system', content: 'Return ONLY valid JSON that matches the requested schema. No prose.' },
          { role: 'user', content: prompt },
        ],
      }),
    })
    if (!resp.ok) throw new Error(`OpenAI API error: ${resp.status}`)
    const json = await resp.json()
    const content: string | undefined = json?.choices?.[0]?.message?.content
    if (!content) throw new Error('OpenAI returned empty content')
    return normalizeToJsonString(content)
  }

  // Use Vertex AI for Gemini (pay-as-you-go, no free tier limits)
  const result = await generateText(prompt, {
    model,
    temperature,
    topP: 0.9,
    maxOutputTokens,
    timeoutMs,
    responseMimeType: 'application/json',
    systemInstruction: 'Return ONLY valid JSON that matches the requested schema. No prose.'
  })
  
  if (!result.text) throw new Error('Gemini returned empty content')
  return normalizeToJsonString(result.text)
}

function normalizeToJsonString(raw: string): string {
  let s = raw.trim()
  // strip ```json ... ``` fences
  if (s.startsWith('```')) {
    s = s.replace(/^```[a-zA-Z]*\n?/, '').replace(/```\s*$/, '').trim()
  }
  // extract first JSON object or array
  const start = Math.min(...[...['{', '[']].map(ch => s.indexOf(ch)).filter(i => i >= 0))
  if (start > 0) s = s.slice(start)
  // find matching closing brace/bracket
  try {
    // quick attempt
    JSON.parse(s)
    return s
  } catch {
    // try to truncate to last closing brace/bracket
    const lastObj = s.lastIndexOf('}')
    const lastArr = s.lastIndexOf(']')
    const end = Math.max(lastObj, lastArr)
    if (end > 0) {
      const candidate = s.slice(0, end + 1)
      JSON.parse(candidate)
      return candidate
    }
    throw new Error('LLM returned non-JSON content')
  }
}


