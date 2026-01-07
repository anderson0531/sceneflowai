import { z } from 'zod'

const BeatSchema = z.object({
  title: z.string().min(1).catch('Beat'),
  intent: z.string().optional(),
  synopsis: z.string().optional(),
  minutes: z.coerce.number().min(0.25).catch(1),
})

const DecisionSchema = z.object({
  decision: z.string(),
  why: z.string(),
  impact: z.string(),
})

const TreatmentSchema = z.object({
  title: z.string().optional(),
  logline: z.string().optional(),
  genre: z.string().optional(),
  format_length: z.string().optional(),
  target_audience: z.string().optional(),
  audience: z.string().optional(),
  synopsis: z.string().optional(),
  setting: z.string().optional(),
  protagonist: z.string().optional(),
  antagonist: z.string().optional(),
  themes: z
    .union([z.array(z.string()), z.string()])
    .transform((v) => (Array.isArray(v) ? v : v ? [v] : []))
    .catch([] as string[]),
  beats: z
    .union([z.array(BeatSchema), z.any()])
    .transform((v) => (Array.isArray(v) ? v : []))
    .catch([] as z.infer<typeof BeatSchema>[]),
  visual_style: z.string().optional(),
  style: z.string().optional(),
  tone_description: z.string().optional(),
  tone: z.string().optional(),
  mood_references: z.array(z.string()).optional(),
  character_descriptions: z
    .array(
      z.object({
        name: z.string().optional(),
        role: z.string().optional(),
        subject: z.string().optional(),
        ethnicity: z.string().optional(),
        keyFeature: z.string().optional(),
        hairStyle: z.string().optional(),
        hairColor: z.string().optional(),
        eyeColor: z.string().optional(),
        expression: z.string().optional(),
        build: z.string().optional(),
        description: z.string().optional(),
        image_prompt: z.string().optional(),
        // Psychological depth fields
        externalGoal: z.string().optional(),
        internalNeed: z.string().optional(),
        fatalFlaw: z.string().optional(),
        arcStartingState: z.string().optional(),
        arcShift: z.string().optional(),
        arcEndingState: z.string().optional(),
      })
    )
    .optional(),
  
  // Narrative reasoning fields (REQUIRED by prompt but optional in schema for backwards compatibility)
  character_focus: z.string().optional(),
  key_decisions: z.array(DecisionSchema).optional(),
  story_strengths: z.string().optional(),
  user_adjustments: z.string().optional(),
})

export type RepairedTreatment = z.infer<typeof TreatmentSchema>

export function repairTreatment(input: unknown): RepairedTreatment {
  const parsed = TreatmentSchema.parse(input)
  if (!parsed.target_audience && parsed.audience) {
    parsed.target_audience = String(parsed.audience)
  }
  if (!parsed.visual_style && parsed.style) {
    parsed.visual_style = parsed.style
  }
  return parsed
}


