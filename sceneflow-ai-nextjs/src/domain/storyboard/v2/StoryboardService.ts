import { z } from 'zod'
import { callLLM, LLMConfig, Provider } from '@/services/llmGateway'

export const V2StoryboardRequest = z.object({
  beats: z.array(z.object({ act: z.string(), number: z.number(), title: z.string(), description: z.string() })),
  provider: z.union([z.literal('openai'), z.literal('gemini')]).optional(),
  model: z.string().optional(),
})

export const V2StoryboardSchema = z.object({
  frames: z.array(z.object({
    beat: z.number(),
    frame_title: z.string(),
    frame_description: z.string(),
    visual_prompt: z.string().optional(),
    audio_prompt: z.string().optional(),
  }))
})

export type V2Storyboard = z.infer<typeof V2StoryboardSchema>
export type V2StoryboardRequestType = z.infer<typeof V2StoryboardRequest>

export async function analyzeStoryboardV2(req: V2StoryboardRequestType): Promise<{ data: V2Storyboard; provider: Provider; model: string }> {
  const hasGemini = !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY)
  const hasOpenAI = !!process.env.OPENAI_API_KEY
  const provider: Provider = ((): Provider => {
    if (req.provider === 'gemini' || req.provider === 'openai') return req.provider
    if (hasGemini) return 'gemini'
    if (hasOpenAI) return 'openai'
    return 'gemini'
  })()
  const model = req.model || (provider === 'openai' ? (process.env.OPENAI_MODEL || 'gpt-4.1') : (process.env.GEMINI_MODEL || 'gemini-3.0-flash'))

  const prompt = `You are a storyboard artist. For each beat, propose 1-3 concise storyboard frames. Return ONLY JSON:\n\n{
  "frames": [{
    "beat": number,
    "frame_title": string,
    "frame_description": string,
    "visual_prompt"?: string,
    "audio_prompt"?: string
  }]
}\n\nRULES: No prose. Keep descriptions short and production-ready.`

  const cfg: LLMConfig = { provider, model }
  const raw = await callLLM(cfg, prompt + `\n\nINPUT:\n` + JSON.stringify({ beats: req.beats }))
  const data = V2StoryboardSchema.parse(JSON.parse(raw))
  return { data, provider, model }
}


