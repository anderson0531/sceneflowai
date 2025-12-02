import { z } from 'zod'
import { callLLM, LLMConfig, Provider } from '@/services/llmGateway'

export const V2DirectionRequest = z.object({
  blueprint: z.object({
    logline: z.string(),
    synopsis: z.string(),
    characters: z.array(z.object({ name: z.string(), role: z.string(), description: z.string() })).default([]),
    beats: z.array(z.object({ act: z.string(), number: z.number(), title: z.string(), description: z.string() })).default([]),
  }),
  style: z.object({ tone: z.string().optional(), visualStyle: z.string().optional() }).optional(),
  provider: z.union([z.literal('openai'), z.literal('gemini')]).optional(),
  model: z.string().optional(),
})

export const V2DirectionSchema = z.object({
  directorNotes: z.array(z.string()),
  sceneDirections: z.array(z.object({
    beat: z.number(),
    camera: z.array(z.string()).optional(),
    lighting: z.array(z.string()).optional(),
    sound: z.array(z.string()).optional(),
    performance: z.array(z.string()).optional(),
  }))
})

export type V2Direction = z.infer<typeof V2DirectionSchema>
export type V2DirectionRequestType = z.infer<typeof V2DirectionRequest>

export async function analyzeDirectionV2(req: V2DirectionRequestType): Promise<{ data: V2Direction; provider: Provider; model: string; }>{
  const hasGemini = !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY)
  const hasOpenAI = !!process.env.OPENAI_API_KEY
  const provider: Provider = ((): Provider => {
    if (req.provider === 'gemini' || req.provider === 'openai') return req.provider
    if (hasGemini) return 'gemini'
    if (hasOpenAI) return 'openai'
    return 'gemini'
  })()
  const model = req.model || (provider === 'openai' ? (process.env.OPENAI_MODEL || 'gpt-4.1') : (process.env.GEMINI_MODEL || 'gemini-3.0-flash'))

  const prompt = `You are a film director. Convert the blueprint beats into concise, actionable direction. Return ONLY JSON:\n\n{
  "directorNotes": string[],
  "sceneDirections": [{
    "beat": number,
    "camera"?: string[],
    "lighting"?: string[],
    "sound"?: string[],
    "performance"?: string[]
  }]
}

RULES:\n- Keep notes short and practical.\n- Suggest camera setups, lighting cues, and performance beats without prose.\n- Only JSON.`

  const cfg: LLMConfig = { provider, model }
  const raw = await callLLM(cfg, prompt + `\n\nINPUT:\n` + JSON.stringify(req.blueprint))
  const data = V2DirectionSchema.parse(JSON.parse(raw))
  return { data, provider, model }
}


