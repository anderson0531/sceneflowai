import { useTemplateStore } from '@/store/templateStore'
import type { EnhancedAppState } from '@/store/enhancedStore'
import { TemplateSchema, type Template } from '@/types/templates'
import registry from '@/templates/index.json'

export function withTemplatePrompt(base: string): string {
  const tmpl = useTemplateStore.getState().currentTemplate
  if (!tmpl) return base
  return `${tmpl.trim()}\n\n---\n\n${base}`
}

export function getCurrentTemplate(): string {
  return useTemplateStore.getState().currentTemplate || ''
}

export function getCurrentStructuredTemplate(): Template | null {
  try {
    const stored = localStorage.getItem('currentStructuredTemplate')
    if (stored) {
      return JSON.parse(stored) as Template
    }
  } catch (e) {
    console.warn('Failed to parse stored template:', e)
  }
  return null
}

export function formatCoreConceptAsTemplate(core: EnhancedAppState['coreConcept']): string {
  const title = core.title || 'Untitled Concept'
  const premise = core.premise || ''
  const audience = core.targetAudience || ''
  const message = core.keyMessage || ''
  const genre = core.genre || ''
  const tone = core.tone || ''
  const platform = core.platform || ''
  const duration = core.duration ? String(core.duration) : ''

  return `Title: ${title}\n\nCore Premise:\n${premise}\n\nAttributes (inline):\n- Target Audience: ${audience}\n- Key Message / CTA: ${message}\n- Genre / Format: ${genre}\n- Tone / Mood: ${tone}\n- Intended Platform: ${platform}\n- Estimated Duration: ${duration}`
}

export type TemplateMeta = {
  id: string; name: string; category: string; use_case: string; structure: string; path: string;
  platform: string; orientation: string; duration: number; tone: string; tags: string[]
}

export const templateRegistry: { schemaVersion: string; templates: TemplateMeta[] } = registry as any

export async function loadTemplateByPath(path: string): Promise<Template> {
  try {
    const response = await fetch(`/api/templates/${path}`)
    if (!response.ok) {
      throw new Error(`Failed to load template: ${response.statusText}`)
    }
    const data = await response.json()
    const validatedTemplate = TemplateSchema.parse(data)
    return validatedTemplate
  } catch (error) {
    console.error(`Error loading template from ${path}:`, error)
    throw error
  }
}

/**
 * Comprehensive storyboard readiness auto-population
 * Eliminates blank canvas paralysis by ensuring ALL readiness attributes are populated
 */
export async function hydrateReadinessFromTemplate(t: Template, setAttributes: (updater: any)=>void) {
  setAttributes((prev: any) => {
    const next: any = { ...(prev || {}) }
    const r = t.storyboard_readiness
    
    // Core Storyboard Readiness - ALL fields must be populated to eliminate BCP
    if (r.beats) next.sr_beats = { value: r.beats, source: 'template' }
    if (r.act_structure) next.sr_actStructure = { value: r.act_structure, source: 'template' }
    if (r.runtime_sec) next.sr_runtime = { value: String(r.runtime_sec), source: 'template' }
    if (r.scene_count) next.sr_sceneCount = { value: String(r.scene_count), source: 'template' }
    if (r.characters) next.sr_characters = { value: r.characters, source: 'template' }
    if (r.locations) next.sr_locations = { value: r.locations, source: 'template' }
    if (r.visual_style) next.sr_visualStyle = { value: r.visual_style, source: 'template' }
    if (r.cinematography) next.sr_cinematography = { value: r.cinematography, source: 'template' }
    if (r.audio) next.sr_audio = { value: r.audio, source: 'template' }
    if (r.pacing) next.sr_pacing = { value: r.pacing, source: 'template' }
    if (r.platform_deliverables) next.sr_platformDeliverables = { value: r.platform_deliverables, source: 'template' }
    if (r.branding) next.sr_branding = { value: r.branding, source: 'template' }
    if (r.props_continuity) next.sr_propsContinuity = { value: r.props_continuity, source: 'template' }
    if (r.accessibility) next.sr_accessibility = { value: r.accessibility, source: 'template' }
    if (r.hints) next.sr_storyboardHints = { value: r.hints, source: 'template' }
    
    // Enhanced Core Concept population from template
    if (t.template_name) next.title = { value: t.template_name, source: 'template' }
    if (t.use_case) next.premise = { value: t.use_case, source: 'template' }
    if (t.target_audience) next.targetAudience = { value: t.target_audience, source: 'template' }
    if (t.tone) next.tone = { value: t.tone, source: 'template' }
    if (t.platform) next.platform = { value: t.platform, source: 'template' }
    if (t.estimated_duration) next.duration = { value: t.estimated_duration, source: 'template' }
    if (t.narrative_structure) next.genre = { value: t.narrative_structure, source: 'template' }
    
    // Store the template scenes for storyboard generation
    next.templateScenes = { value: t.scenes, source: 'template' }
    
    // Mark template as applied to track usage
    next.templateApplied = { value: true, source: 'template' }
    next.templateSource = { value: t.template_id, source: 'template' }
    
    return next
  })
}

/**
 * Enhanced template application that eliminates blank canvas paralysis
 * Automatically populates ALL storyboard readiness attributes
 */
export async function applyTemplateToProject(templatePath: string, setAttributes: (updater: any)=>void): Promise<boolean> {
  try {
    const template = await loadTemplateByPath(templatePath)
    if (!template) {
      console.error('Failed to load template for application')
      return false
    }

    // Store the full template data for storyboard generation
    localStorage.setItem('currentStructuredTemplate', JSON.stringify(template))
    
    // Auto-populate ALL storyboard readiness attributes to eliminate BCP
    await hydrateReadinessFromTemplate(template, setAttributes)
    
    console.log('Template applied successfully with complete storyboard readiness population')
    return true
  } catch (error) {
    console.error('Error applying template:', error)
    return false
  }
}

/**
 * Validate template completeness to ensure no blank canvas paralysis
 * Every template must have ALL storyboard readiness attributes populated
 */
export function validateTemplateCompleteness(template: Template): { isValid: boolean; missingFields: string[] } {
  const requiredFields = [
    'beats', 'act_structure', 'runtime_sec', 'scene_count', 'characters', 
    'locations', 'visual_style', 'cinematography', 'audio', 'pacing', 
    'platform_deliverables', 'branding', 'props_continuity', 'accessibility', 'hints'
  ]
  
  const missingFields: string[] = []
  
  requiredFields.forEach(field => {
    if (!template.storyboard_readiness[field as keyof typeof template.storyboard_readiness]) {
      missingFields.push(field)
    }
  })
  
  return {
    isValid: missingFields.length === 0,
    missingFields
  }
}

/**
 * Get template preview with storyboard readiness summary
 * Shows users exactly what will be auto-populated
 */
export function getTemplateReadinessPreview(template: Template) {
  const readiness = template.storyboard_readiness
  const completeness = validateTemplateCompleteness(template)
  
  return {
    template: template.template_name,
    category: template.category,
    useCase: template.use_case,
    completeness: completeness.isValid ? 'Complete' : 'Incomplete',
    missingFields: completeness.missingFields,
    readinessSummary: {
      structure: `${readiness.act_structure} structure with ${readiness.scene_count} scenes`,
      duration: `${readiness.runtime_sec} seconds`,
      visual: `${readiness.visual_style} style with ${readiness.cinematography} cinematography`,
      audio: readiness.audio,
      pacing: readiness.pacing,
      locations: readiness.locations,
      characters: readiness.characters,
      branding: readiness.branding,
      accessibility: readiness.accessibility
    }
  }
}


