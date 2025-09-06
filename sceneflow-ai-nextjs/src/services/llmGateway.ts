import { z } from 'zod'

export type Provider = 'openai' | 'gemini'

export interface LLMConfig {
  provider: Provider
  model: string
  apiKey?: string
  organization?: string
}

export const JsonResponseSchema = z.string().min(2)

export async function callLLM(config: LLMConfig, prompt: string): Promise<string> {
  const { provider, model } = config

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

  // default gemini
  const apiKey = config.apiKey || process.env.GOOGLE_GEMINI_API_KEY || process.env.GOOGLE_API_KEY
  if (!apiKey) throw new Error('Google Gemini API key not configured')
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 60000)
  const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: controller.signal,
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        topP: 0.9,
        responseMimeType: 'application/json'
      }
    }),
  }).finally(() => clearTimeout(timeout))
  if (!resp.ok) throw new Error(`Gemini API error: ${resp.status}`)
  const json = await resp.json()
  const text: string | undefined = json?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('Gemini returned empty content')
  return normalizeToJsonString(text)
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


