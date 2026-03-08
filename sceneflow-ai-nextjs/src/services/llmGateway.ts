import { z } from 'zod'
import { generateText } from '@/lib/vertexai/gemini'
import { SCENEFLOW_CREATIVE_SYSTEM_INSTRUCTION } from '@/lib/vertexai/safety'
import { safeParseJsonFromText } from '@/lib/safeJson'

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
  /** Custom system instruction (default: SceneFlow creative context) */
  systemInstruction?: string
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
    return JSON.stringify(safeParseJsonFromText(content))
  }

  // Use Vertex AI for Gemini (pay-as-you-go, no free tier limits)
  // Safety settings are automatically applied via getDefaultGeminiSafetySettings()
  const result = await generateText(prompt, {
    model,
    temperature,
    topP: 0.9,
    maxOutputTokens,
    timeoutMs,
    responseMimeType: 'application/json',
    systemInstruction: config.systemInstruction || 
      `${SCENEFLOW_CREATIVE_SYSTEM_INSTRUCTION}\n\nOutput Format: Return ONLY valid JSON that matches the requested schema. No prose.`
  })
  
  if (!result.text) throw new Error('Gemini returned empty content')
  return JSON.stringify(safeParseJsonFromText(result.text))
}
