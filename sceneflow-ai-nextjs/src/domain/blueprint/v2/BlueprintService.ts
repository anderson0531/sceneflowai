import { z } from 'zod'
import { callLLM, LLMConfig, Provider } from '@/services/llmGateway'

export const V2BlueprintSchema = z.object({
  logline: z.string(),
  synopsis: z.string(),
  coreThemes: z.array(z.string()),
  structure: z.enum(['3-Act Structure','5-Act Structure','Hero\'s Journey','Documentary Structure','Series Structure','Experimental Structure','Debate Structure']).optional().default('3-Act Structure'),
  genre: z.string().optional(),
  durationSeconds: z.number().int().positive().optional(),
  audience: z.string().optional(),
  tone: z.string().optional(),
  treatment: z.object({
    project_info: z.object({
      title: z.string(),
      genre: z.string().optional(),
      writer_name: z.string().optional(),
      contact: z.string().optional(),
      wga_registration: z.string().optional(),
    }),
    logline: z.string(),
    target_audience: z.string(),
    genre: z.string().optional(),
    tone_style: z.string(),
    themes: z.array(z.string()),
    visual_language: z.string(),
    estimated_duration: z.string(),
    character_breakdown: z.object({
      main: z.array(z.object({
        name: z.string(),
        role: z.string(),
        description: z.string(),
        motivations: z.string().optional(),
        arc: z.string().optional(),
      })),
      supporting: z.array(z.object({
        name: z.string(),
        role: z.string(),
        description: z.string(),
      })).optional(),
    })
  }).optional(),
  characters: z.array(z.object({
    name: z.string(),
    role: z.enum(['Protagonist','Antagonist','Supporting','Narrator','Expert','Host']).optional().default('Supporting'),
    description: z.string(),
    importance: z.enum(['High','Medium','Low']).optional().default('Medium'),
    key_traits: z.array(z.string()).optional()
  })),
  beats: z.array(z.object({
    act: z.string(),
    number: z.number(),
    title: z.string(),
    description: z.string(),
    act_title: z.string().optional(),
    act_duration_seconds: z.number().int().positive().optional(),
    duration_estimate: z.string().optional(),
    key_elements: z.array(z.string()).optional(),
  }))
})

export type V2Blueprint = z.infer<typeof V2BlueprintSchema>

export const V2BlueprintRequest = z.object({
  input: z.string().min(1),
  targetAudience: z.string().optional(),
  keyMessage: z.string().optional(),
  tone: z.string().optional(),
  genre: z.string().optional(),
  duration: z.number().optional(),
  platform: z.string().optional(),
  provider: z.union([z.literal('openai'), z.literal('gemini')]).optional(),
  model: z.string().optional(),
  variantHint: z.enum(['topic','story']).optional(),
})

export type V2BlueprintRequestType = z.infer<typeof V2BlueprintRequest>

export async function analyzeBlueprintV2(req: V2BlueprintRequestType): Promise<{ data: V2Blueprint; provider: Provider; model: string; }>{
  const hasGemini = !!(process.env.GOOGLE_GEMINI_API_KEY || process.env.GOOGLE_API_KEY)
  const hasOpenAI = !!process.env.OPENAI_API_KEY
  const provider: Provider = ((): Provider => {
    if (req.provider === 'gemini' || req.provider === 'openai') return req.provider
    if (hasGemini) return 'gemini'
    if (hasOpenAI) return 'openai'
    return 'gemini'
  })()
  const model = req.model || (provider === 'openai' ? (process.env.OPENAI_MODEL || 'gpt-4.1') : (process.env.GEMINI_MODEL || 'gemini-2.5-flash'))

  const modeHint = req.variantHint ? `\nMODE_HINT: ${req.variantHint}` : ''
  const prompt = `You are a professional story analyst. Return ONLY compact JSON matching this schema exactly (no prose). Keep fields concise.${modeHint}

{
  "logline": string,
  "synopsis": string,
  "coreThemes": string[],
  "structure": "3-Act Structure" | "5-Act Structure" | "Hero's Journey" | "Documentary Structure" | "Series Structure" | "Experimental Structure" | "Debate Structure",
  "genre"?: string,
  "durationSeconds"?: number,
  "audience"?: string,
  "tone"?: string,
  "treatment"?: {
    "project_info": { "title": string, "genre"?: string, "writer_name"?: string, "contact"?: string, "wga_registration"?: string },
    "logline": string,
    "target_audience": string,
    "genre"?: string,
    "tone_style": string,
    "themes": string[],
    "visual_language": string,
    "estimated_duration": string,
    "character_breakdown": {
      "main": [{ "name": string, "role": string, "description": string, "motivations"?: string, "arc"?: string }],
      "supporting"?: [{ "name": string, "role": string, "description": string }]
    }
  },
  "characters": [{ "name": string, "role": "Protagonist" | "Antagonist" | "Supporting" | "Narrator" | "Expert" | "Host", "description": string, "importance": "High" | "Medium" | "Low", "key_traits"?: string[] }],
  "beats": [{ "act": string, "number": number, "title": string, "description": string, "act_title"?: string, "act_duration_seconds"?: number, "duration_estimate"?: string, "key_elements"?: string[] }]
}

CRITICAL RULES:
- Never copy script content verbatim; write original summaries.
- Keep synopsis <= 50 words.
- Separate beats from synopsis.
- Align beats with the selected structure (5-Act => 5 acts, ≥3 beats/act; Debate => Opening, Initial Arguments, Rebuttals, Direct Engagement, Resolution).
- Include act_title for each beat and repeat act_duration_seconds per beat of the same act.
- Reflect true duration where possible.
- Use beat descriptions that mirror the INPUT’s beats.
 - If MODE_HINT is 'topic', emphasize distinct creative directions (genre/tone) while remaining faithful to input themes.
 - If MODE_HINT is 'story', strictly preserve the creator’s storyline and characters.

INPUT:
${req.input}`

  const cfg: LLMConfig = { provider, model }
  const raw = await callLLM(cfg, prompt)

  function sanitizeJsonString(input: string): string {
    let s = input.trim()
    // unify quotes
    s = s.replace(/[“”]/g, '"').replace(/[‘’]/g, "'")
    // remove trailing commas before } or ]
    s = s.replace(/,\s*(\]|\})/g, '$1')
    // ensure keys are quoted (basic heuristic)
    s = s.replace(/(\{|,|\s)([A-Za-z0-9_]+)\s*:/g, '$1"$2":')
    return s
  }

  function tryParse(input: string): any {
    try {
      return JSON.parse(input)
    } catch (e) {
      const repaired = sanitizeJsonString(input)
      return JSON.parse(repaired)
    }
  }

  const data = V2BlueprintSchema.parse(tryParse(raw))
  return { data, provider, model }
}


