'use client'

import { Zap, Target, Edit, Heart, Eye, Wand2, Lightbulb } from 'lucide-react'
import { ReactNode } from 'react'

/**
 * Shared scene optimization/revision templates
 * Used by both OptimizeSceneDialog and InstructionsPanel
 */

export interface SceneOptimizationTemplate {
  id: string
  icon: string        // Emoji for OptimizeSceneDialog
  label: string
  description: string
  instruction: string
}

export const SCENE_OPTIMIZATION_TEMPLATES: SceneOptimizationTemplate[] = [
  {
    id: 'increase-tension',
    icon: '⚡',
    label: 'Increase Tension',
    description: 'Add conflict and raise stakes',
    instruction: 'Increase the tension and conflict in this scene. Raise the stakes and add more dramatic weight. Add obstacles and heighten the sense of urgency.'
  },
  {
    id: 'improve-pacing',
    icon: '⏱️',
    label: 'Improve Pacing',
    description: 'Tighten or expand timing',
    instruction: 'Improve the pacing of this scene. Tighten slow sections and expand moments that need more breathing room. Focus on the key beats.'
  },
  {
    id: 'enhance-dialogue',
    icon: '💬',
    label: 'Enhance Dialogue',
    description: 'Make dialogue more natural',
    instruction: 'Polish the dialogue to be more natural and character-authentic. Add subtext and remove on-the-nose exposition. Make each line reveal character.'
  },
  {
    id: 'add-emotion',
    icon: '❤️',
    label: 'Add Emotion',
    description: 'Increase emotional impact',
    instruction: 'Increase the emotional impact of this scene. Deepen the emotional beats and character reactions. Add vulnerability and authentic emotional responses.'
  },
  {
    id: 'clarify-action',
    icon: '👁️',
    label: 'Clarify Action',
    description: 'Make action clearer',
    instruction: 'Clarify the action and visual storytelling. Make it clearer what is happening and how it looks on screen. Ensure motivations are explicit.'
  },
  {
    id: 'visual-storytelling',
    icon: '🎬',
    label: 'Visual Storytelling',
    description: "Show don't tell",
    instruction: 'Enhance visual storytelling. Show emotions and story beats through action and imagery rather than dialogue or narration. Let the visuals carry the story.'
  },
  {
    id: 'add-humor',
    icon: '😄',
    label: 'Add Humor',
    description: 'Inject comedic elements',
    instruction: 'Add appropriate humor or levity to this scene while maintaining the overall tone. Find organic moments for wit and comic relief.'
  },
  {
    id: 'deepen-character',
    icon: '👤',
    label: 'Deepen Character',
    description: 'Add character development',
    instruction: 'Deepen character development in this scene. Show more of who the characters are through their choices, reactions, and internal conflicts.'
  }
]

// Map of Lucide icons for InstructionsPanel (React components)
export const TEMPLATE_LUCIDE_ICONS: Record<string, ReactNode> = {
  'increase-tension': null,  // Will be set in component using <Zap />
  'improve-pacing': null,
  'enhance-dialogue': null,
  'add-emotion': null,
  'clarify-action': null,
  'visual-storytelling': null,
  'add-humor': null,
  'deepen-character': null
}

// Get template by ID
export function getTemplateById(id: string): SceneOptimizationTemplate | undefined {
  return SCENE_OPTIMIZATION_TEMPLATES.find(t => t.id === id)
}

// Get all template IDs
export function getTemplateIds(): string[] {
  return SCENE_OPTIMIZATION_TEMPLATES.map(t => t.id)
}

/**
 * Recommendation priority levels for scene analysis
 */
export type RecommendationPriority = 'critical' | 'high' | 'medium' | 'optional'

export interface PriorityBadgeConfig {
  emoji: string
  color: string
  label: string
}

export const PRIORITY_BADGES: Record<RecommendationPriority, PriorityBadgeConfig> = {
  critical: { 
    emoji: '🔴', 
    color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', 
    label: 'Critical' 
  },
  high: { 
    emoji: '🟡', 
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400', 
    label: 'High' 
  },
  medium: { 
    emoji: '🔵', 
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400', 
    label: 'Medium' 
  },
  optional: { 
    emoji: '⚪', 
    color: 'bg-gray-100 text-gray-600 dark:bg-gray-800/50 dark:text-gray-400', 
    label: 'Optional' 
  }
}

/**
 * Scene analysis/score interfaces
 */
export interface SceneAnalysis {
  score: number
  pacing: 'slow' | 'moderate' | 'fast'
  tension: 'low' | 'medium' | 'high'
  characterDevelopment: 'minimal' | 'moderate' | 'strong'
  visualPotential: 'low' | 'medium' | 'high'
  notes: string
  recommendations: SceneRecommendation[]
}

export interface SceneRecommendation {
  id?: string
  text: string
  priority?: RecommendationPriority
  category?: string
}

/**
 * Normalize recommendation to standard format
 * Handles both string and object formats from API
 */
export function normalizeRecommendation(rec: string | SceneRecommendation): SceneRecommendation {
  if (typeof rec === 'string') {
    return { 
      text: rec, 
      priority: 'medium' as RecommendationPriority,
      id: `rec-${rec.substring(0, 30).replace(/\s+/g, '-').toLowerCase()}`
    }
  }
  return { 
    ...rec, 
    priority: rec.priority || 'medium',
    id: rec.id || `rec-${(rec.text || '').substring(0, 30).replace(/\s+/g, '-').toLowerCase()}`
  }
}

/**
 * Get score color based on value
 */
export function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-600 dark:text-green-400'
  if (score >= 70) return 'text-blue-600 dark:text-blue-400'
  if (score >= 60) return 'text-yellow-600 dark:text-yellow-400'
  return 'text-red-600 dark:text-red-400'
}

export function getScoreBgColor(score: number): string {
  if (score >= 80) return 'bg-green-100 dark:bg-green-900/30'
  if (score >= 70) return 'bg-blue-100 dark:bg-blue-900/30'
  if (score >= 60) return 'bg-yellow-100 dark:bg-yellow-900/30'
  return 'bg-red-100 dark:bg-red-900/30'
}

/**
 * Maximum instructions limit
 */
export const MAX_INSTRUCTIONS = 5

/**
 * Count numbered instructions in text
 */
export function countInstructions(text: string): number {
  if (text.trim() === '') return 0
  const numberedLines = text.match(/^\d+\.\s/gm)
  return numberedLines ? numberedLines.length : (text.trim() ? 1 : 0)
}
