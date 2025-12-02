import { z } from 'zod'
import { callLLM, LLMConfig, Provider } from '@/services/llmGateway'

export const V2BlueprintSchema = z.object({
  // Top-level summary
  logline: z.string(),
  synopsis: z.string(),
  coreThemes: z.array(z.string()),
  structure: z.enum(['3-Act Structure','5-Act Structure','Hero\'s Journey','Documentary Structure','Series Structure','Experimental Structure','Debate Structure']).optional().default('3-Act Structure'),
  durationSeconds: z.number().int().positive().optional(),

  // Consolidated creative vision under treatment
  treatment: z.object({
    project_info: z.object({
      title: z.string(),
      writer_name: z.string().optional(),
      contact: z.string().optional(),
      wga_registration: z.string().optional(),
    }),
    logline: z.string(),
    target_audience: z.object({
      primary_demographic: z.string(),
      psychographics: z.string(),
      viewing_context: z.string(),
    }),
    genre: z.array(z.string()),
    tone_style: z.array(z.string()),
    themes: z.array(z.string()),
    visual_language: z.array(z.string()),
    estimated_duration: z.string(),
    character_breakdown: z.object({
      main: z.array(z.object({
        name: z.string(),
        role: z.string(),
        description: z.string(),
        motivations: z.array(z.string()).optional(),
        arc: z.string().optional(),
        concrete_details: z.array(z.string()).optional(),
      })),
      supporting: z.array(z.object({
        name: z.string(),
        role: z.string(),
        description: z.string(),
        motivations: z.array(z.string()).optional(),
        concrete_details: z.array(z.string()).optional(),
      })).optional(),
    })
  }).optional(),

  // Characters (mirror of treatment breakdown, kept for compatibility)
  characters: z.array(z.object({
    name: z.string(),
    role: z.enum(['Protagonist','Antagonist','Supporting','Narrator','Expert','Host']).optional().default('Supporting'),
    description: z.string(),
    importance: z.enum(['High','Medium','Low']).optional().default('Medium'),
    key_traits: z.array(z.string()).optional()
  })),

  // Beats with richer scene structure
  beats: z.array(z.object({
    act: z.string(),
    number: z.number(),
    act_title: z.string().optional(),
    beat_title: z.string(),
    scene_elements: z.object({
      visual: z.string(),
      audio: z.string(),
      narrative_point: z.string(),
    }),
    duration_seconds: z.number().int().positive().optional(),
    key_elements: z.array(z.string()).optional(),
  })),

  // Internal-only reasoning (not surfaced to UI)
  internal_reasoning: z.string().optional(),
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
  variants: z.number().int().min(1).max(4).optional().default(1),
  detailMode: z.enum(['compact','narrative']).optional().default('narrative'),
})

export type V2BlueprintRequestType = z.infer<typeof V2BlueprintRequest>

export async function analyzeBlueprintV2(req: V2BlueprintRequestType): Promise<{ data: V2Blueprint; provider: Provider; model: string; }>{
  const hasGemini = !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY || process.env.GOOGLE_API_KEY)
  const hasOpenAI = !!process.env.OPENAI_API_KEY
  const provider: Provider = ((): Provider => {
    if (req.provider === 'gemini' || req.provider === 'openai') return req.provider
    if (hasGemini) return 'gemini'
    if (hasOpenAI) return 'openai'
    return 'gemini'
  })()
  const model = req.model || (provider === 'openai'
    ? (process.env.OPENAI_MODEL || 'gpt-4.1')
    : (process.env.GEMINI_MODEL || 'gemini-3.0-flash'))

  const modeHint = req.variantHint ? `\nMODE_HINT: ${req.variantHint}` : ''
  const narrativeIntro = req.detailMode === 'narrative' ? `\nOUTPUT STYLE: high-detail narrative. Use rich, concrete language, and fill arrays with 3–5 items.` : ''
  const prompt = `You are a professional story analyst. Return ONLY JSON (no comments or prose) matching this schema exactly. Fill every field; never leave placeholders. If information is missing, infer a sensible value from INPUT.${modeHint}${narrativeIntro}

{
  "logline": string,
  "synopsis": string,
  "coreThemes": string[],
  "structure": "3-Act Structure" | "5-Act Structure" | "Hero's Journey" | "Documentary Structure" | "Series Structure" | "Experimental Structure" | "Debate Structure",
  "durationSeconds": number,
  "treatment"?: {
    "project_info": { "title": string, "writer_name"?: string, "contact"?: string, "wga_registration"?: string },
    "logline": string,
    "target_audience": {
      "primary_demographic": string,
      "psychographics": string,
      "viewing_context": string
    },
    "genre": string[],
    "tone_style": string[],
    "themes": string[],
    "visual_language": string[],
    "estimated_duration": string,
    "character_breakdown": {
      "main": [{ "name": string (CRITICAL: Full name in Title Case, e.g., "Brian Anderson Sr", "Dr. Sarah Martinez"), "role": string, "description": string, "motivations"?: string[], "arc"?: string, "concrete_details"?: string[] }],
      "supporting"?: [{ "name": string (CRITICAL: Full name in Title Case), "role": string, "description": string, "motivations"?: string[], "concrete_details"?: string[] }]
    }
  },
  "characters": [{ "name": string, "role": "Protagonist" | "Antagonist" | "Supporting" | "Narrator" | "Expert" | "Host", "description": string, "importance": "High" | "Medium" | "Low", "key_traits"?: string[] }],
  "beats": [{
    "act": string,
    "number": number,
    "act_title"?: string,
    "beat_title": string,
    "scene_elements": { "visual": string, "audio": string, "narrative_point": string },
    "duration_seconds"?: number,
    "key_elements"?: string[]
  }],
  "internal_reasoning"?: string
}

OUTPUT REQUIREMENTS:
- Never copy script content verbatim; write original summaries.
- Keep synopsis <= 50 words.
- Separate beats from synopsis.
- Align beats with the selected structure (5-Act => 5 acts, ≥3 beats/act; Debate => Opening, Initial Arguments, Rebuttals, Direct Engagement, Resolution).
- Include act_title for each beat and repeat act_duration_seconds per beat of the same act.
- Reflect true duration where possible.
- Use beat descriptions that mirror the INPUT’s beats.
 - If MODE_HINT is 'topic', emphasize distinct creative directions (genre/tone) while remaining faithful to input themes.
 - If MODE_HINT is 'story', strictly preserve the creator’s storyline and characters.
 - Do not return placeholders like "Unspecified"; infer best-fit values for genre, audience, and duration.
 - For characters, include at least 3 well-differentiated entries with roles relevant to the format (e.g., Host, Expert, Subject) and 1–2 sentences of description each.
 - For beats, produce at least 4 beats per act for 3-Act/Series/Documentary and 5–7 for 5-Act; each beat must include scene_elements.visual/audio/narrative_point. Add key_elements (3–6) and duration_seconds.
 - Ensure treatment.target_audience fields and arrays (genre, tone_style, visual_language) are always present and informative.

CHARACTER NAMING REQUIREMENTS (CRITICAL):
- Use FULL character names in Title Case (e.g., "Brian Anderson Sr", "Dr. Sarah Martinez")
- NO abbreviations or nicknames as primary names
- Be consistent: use exact same spelling throughout
- Include suffixes if applicable (Sr, Jr, III)
- Avoid ALL CAPS or lowercase
- Character names must be unique and clearly identify each person

INPUT:\n${req.input}`

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

export async function analyzeBlueprintV2Batch(req: V2BlueprintRequestType): Promise<{ items: V2Blueprint[]; provider: Provider; model: string; }>{
  const hasGemini = !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY || process.env.GOOGLE_API_KEY)
  const hasOpenAI = !!process.env.OPENAI_API_KEY
  const provider: Provider = ((): Provider => {
    if (req.provider === 'gemini' || req.provider === 'openai') return req.provider
    if (hasGemini) return 'gemini'
    if (hasOpenAI) return 'openai'
    return 'gemini'
  })()
  const model = req.model || (provider === 'openai' ? (process.env.OPENAI_MODEL || 'gpt-4.1') : (process.env.GEMINI_MODEL || 'gemini-3.0-flash'))

  const count = Math.min(Math.max(req.variants || 1, 1), 4)
  const modeHint = req.variantHint ? `\nMODE_HINT: ${req.variantHint}` : ''
  const prompt = `You are a professional story ideation system. Return ONLY JSON with this shape:${modeHint}

{
  "items": [/* ${count} items conforming to V2Blueprint schema */]
}

RULES:
- Produce ${count} distinct, high-quality variants when MODE_HINT is 'topic'. For 'story', produce variations that preserve core characters/conflict.
- Keep synopsis <= 50 words; do not copy input verbatim.
- Separate beats from synopsis; include act_title and act_duration_seconds.

INPUT:\n${req.input}`

  const cfg: LLMConfig = { provider, model }
  const raw = await callLLM(cfg, prompt)

  function sanitizeJsonString(input: string): string {
    let s = input.trim()
    s = s.replace(/[“”]/g, '"').replace(/[‘’]/g, "'")
    s = s.replace(/,\s*(\]|\})/g, '$1')
    s = s.replace(/(\{|,|\s)([A-Za-z0-9_]+)\s*:/g, '$1"$2":')
    return s
  }
  function tryParse(input: string): any {
    try { return JSON.parse(input) } catch {
      return JSON.parse(sanitizeJsonString(input))
    }
  }
  const parsed = tryParse(raw)
  const itemsData = Array.isArray(parsed?.items) ? parsed.items : (Array.isArray(parsed) ? parsed : [])
  const items: V2Blueprint[] = itemsData.map((x: any) => V2BlueprintSchema.parse(x))
  if (!items.length) throw new Error('No items returned')
  return { items, provider, model }
}
