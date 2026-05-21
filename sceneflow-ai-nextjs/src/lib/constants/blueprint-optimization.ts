/**
 * Blueprint section optimization templates (guided AI edits).
 * Shared by BlueprintRefineDialog (resonance recommendations mode).
 */

export type BlueprintSection =
  | 'tips'
  | 'core'
  | 'story'
  | 'tone'
  | 'beats'
  | 'characters'

export interface BlueprintOptimizationTemplate {
  id: string
  label: string
  description: string
  instruction: string
  icon: string
}

export const BLUEPRINT_SECTION_TEMPLATES: Record<
  BlueprintSection,
  BlueprintOptimizationTemplate[]
> = {
  tips: [
    {
      id: 'add-twist',
      icon: '✨',
      label: 'Add Unexpected Twist',
      description: 'Subvert expectations in the hook',
      instruction:
        'Add an unexpected twist to the logline that subverts audience expectations.',
    },
    {
      id: 'raise-stakes',
      icon: '⚡',
      label: 'Raise the Stakes',
      description: 'Increase urgency and tension',
      instruction:
        'Increase the personal and external stakes to create more urgency and tension.',
    },
    {
      id: 'unique-hook',
      icon: '🎯',
      label: 'Unique Hook',
      description: 'Stand out in the genre',
      instruction:
        'Create a distinctive hook that makes this story stand out in the genre.',
    },
  ],
  core: [
    {
      id: 'sharpen-logline',
      icon: '✏️',
      label: 'Sharpen Logline',
      description: 'Stronger hook and stakes',
      instruction:
        'Make the logline more compelling with a stronger hook and clearer stakes.',
    },
    {
      id: 'clarify-genre',
      icon: '🎬',
      label: 'Clarify Genre',
      description: 'Align genre signals',
      instruction:
        'Ensure genre expectations are clear and consistent throughout.',
    },
    {
      id: 'refine-title',
      icon: '💡',
      label: 'Stronger Title',
      description: 'More memorable title',
      instruction:
        'Suggest a more memorable, evocative title that captures the essence.',
    },
  ],
  story: [
    {
      id: 'deepen-protagonist',
      icon: '👤',
      label: 'Deepen Protagonist',
      description: 'Motivation and conflict',
      instruction:
        'Give the protagonist more depth, clearer motivation, and internal conflict.',
    },
    {
      id: 'strengthen-antagonist',
      icon: '⚔️',
      label: 'Strengthen Antagonist',
      description: 'Meaningful opposition',
      instruction:
        'Make the antagonist more formidable and their opposition more meaningful.',
    },
    {
      id: 'add-conflict',
      icon: '🔥',
      label: 'Add Conflict',
      description: 'Raise central conflict',
      instruction: 'Increase the central conflict and raise the stakes.',
    },
    {
      id: 'expand-setting',
      icon: '🗺️',
      label: 'Expand Setting',
      description: 'Vivid world-building',
      instruction: 'Add more vivid details to the setting and world-building.',
    },
  ],
  tone: [
    {
      id: 'unify-tone',
      icon: '🎨',
      label: 'Unify Tone',
      description: 'Consistent tone',
      instruction: 'Ensure consistent tone throughout all story elements.',
    },
    {
      id: 'visual-clarity',
      icon: '👁️',
      label: 'Visual Clarity',
      description: 'Actionable visual direction',
      instruction: 'Make visual style directions more specific and actionable.',
    },
    {
      id: 'theme-depth',
      icon: '💭',
      label: 'Deepen Themes',
      description: 'Richer thematic layers',
      instruction: 'Explore themes with more nuance and complexity.',
    },
  ],
  beats: [
    {
      id: 'improve-pacing',
      icon: '⏱️',
      label: 'Improve Pacing',
      description: 'Better beat flow',
      instruction: 'Adjust beat durations for better pacing and flow.',
    },
    {
      id: 'stronger-climax',
      icon: '📈',
      label: 'Stronger Climax',
      description: 'More impactful peak',
      instruction: 'Make the climax more impactful and satisfying.',
    },
    {
      id: 'clear-resolution',
      icon: '✅',
      label: 'Clear Resolution',
      description: 'Satisfying ending',
      instruction: 'Ensure a satisfying and meaningful resolution.',
    },
  ],
  characters: [
    {
      id: 'add-depth',
      icon: '🧠',
      label: 'Psychological Depth',
      description: 'Wants vs needs, flaws',
      instruction:
        'Add more internal conflict, wants vs needs, and character flaws.',
    },
    {
      id: 'strengthen-arcs',
      icon: '📖',
      label: 'Strengthen Arcs',
      description: 'Earned transformation',
      instruction:
        'Make character transformations more pronounced and earned.',
    },
    {
      id: 'relationship-dynamics',
      icon: '🤝',
      label: 'Relationships',
      description: 'Richer dynamics',
      instruction:
        'Enrich the relationships and dynamics between characters.',
    },
  ],
}

export const FIX_SECTION_LABELS: Record<string, string> = {
  core: 'Core (title, logline, genre)',
  story: 'Story (synopsis, characters setup)',
  tone: 'Tone & visual style',
  beats: 'Story beats',
  characters: 'Character descriptions',
}
