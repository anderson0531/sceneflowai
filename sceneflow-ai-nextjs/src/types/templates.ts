import { z } from 'zod'

export const SceneSchema = z.object({
  scene_number: z.number().int().min(1),
  scene_name: z.string().min(1),
  scene_duration: z.number().int().min(1),
  description: z.string().min(1),
  visual_notes: z.string().default(''),
  character_details: z.string().default(''),
  camera_details: z.string().default(''),
  on_screen_text: z.string().default(''),
  audio_notes: z.string().default(''),
  transition_notes: z.string().default(''),
})

export const TemplateSchema = z.object({
  schemaVersion: z.literal('1.0'),
  template_id: z.string(),
  template_name: z.string(),
  category: z.enum(['marketing_promotional','explainer_educational','short_form_social','testimonial_brand','film_scene']),
  use_case: z.string(),
  narrative_structure: z.enum(['ps_cta','hv_cta','three_act']),
  target_audience: z.string(),
  estimated_duration: z.number().int().min(5),
  tone: z.enum(['professional','humorous','inspirational','friendly','serious']),
  cta_type: z.enum(['learn_more','sign_up','shop_now','subscribe','follow']),
  platform: z.enum(['youtube','tiktok','instagram','linkedin','web']),
  orientation: z.enum(['16:9','9:16','1:1']),
  tags: z.array(z.string()).default([]),
  storyboard_readiness: z.object({
    beats: z.string(), act_structure: z.string(), runtime_sec: z.number().int(), scene_count: z.number().int(),
    characters: z.string(), locations: z.string(), visual_style: z.string(), cinematography: z.string(),
    audio: z.string(), pacing: z.string(), platform_deliverables: z.string(), branding: z.string(),
    props_continuity: z.string(), accessibility: z.string(), hints: z.string(),
  }),
  scenes: z.array(SceneSchema).min(3),
})

export type Template = z.infer<typeof TemplateSchema>
export type Scene = z.infer<typeof SceneSchema>













