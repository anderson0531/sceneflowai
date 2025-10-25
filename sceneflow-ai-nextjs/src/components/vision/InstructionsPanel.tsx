'use client'

import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Wand2, Edit, Zap, Heart, Eye, Target, Lightbulb } from 'lucide-react'

interface InstructionsPanelProps {
  instruction: string
  onInstructionChange: (instruction: string) => void
}

const INSTRUCTION_TEMPLATES = [
  {
    id: 'increase-tension',
    label: 'Increase Tension',
    description: 'Add conflict and raise stakes',
    text: 'Increase the tension and conflict in this scene. Add obstacles and raise the stakes for the characters.',
    icon: <Zap className="w-3 h-3" />
  },
  {
    id: 'improve-pacing',
    label: 'Improve Pacing',
    description: 'Tighten or expand timing',
    text: 'Improve the pacing of this scene. Remove unnecessary elements and focus on the key beats.',
    icon: <Target className="w-3 h-3" />
  },
  {
    id: 'enhance-dialogue',
    label: 'Enhance Dialogue',
    description: 'Make dialogue more natural',
    text: 'Make the dialogue more natural and character-specific. Add subtext and remove on-the-nose lines.',
    icon: <Edit className="w-3 h-3" />
  },
  {
    id: 'add-emotion',
    label: 'Add Emotion',
    description: 'Increase emotional impact',
    text: 'Increase the emotional impact of this scene. Add vulnerability and authentic character reactions.',
    icon: <Heart className="w-3 h-3" />
  },
  {
    id: 'clarify-action',
    label: 'Clarify Action',
    description: 'Make action clearer',
    text: 'Clarify what is happening in this scene. Make the action and character motivations more explicit.',
    icon: <Eye className="w-3 h-3" />
  },
  {
    id: 'visual-storytelling',
    label: 'Visual Storytelling',
    description: 'Show don\'t tell',
    text: 'Improve visual storytelling. Show character emotions and story beats through action rather than dialogue.',
    icon: <Wand2 className="w-3 h-3" />
  },
  {
    id: 'add-humor',
    label: 'Add Humor',
    description: 'Inject comedic elements',
    text: 'Add appropriate humor and wit to this scene to make it more entertaining and engaging.',
    icon: <Lightbulb className="w-3 h-3" />
  },
  {
    id: 'deepen-character',
    label: 'Deepen Character',
    description: 'Add character development',
    text: 'Add more character depth and development. Show internal conflict and character growth.',
    icon: <Heart className="w-3 h-3" />
  }
]

export function InstructionsPanel({ instruction, onInstructionChange }: InstructionsPanelProps) {
  return (
    <div className="space-y-4">
      {/* Instruction Templates */}
      <div>
        <h3 className="text-sm font-semibold mb-2 flex items-center gap-1">
          <Wand2 className="w-4 h-4 text-blue-600" />
          Common Revisions
        </h3>
        <div className="grid grid-cols-1 gap-2">
          {INSTRUCTION_TEMPLATES.map(template => (
            <Button
              key={template.id}
              size="sm"
              variant="outline"
              onClick={() => onInstructionChange(template.text)}
              className="justify-start text-left h-auto py-3 px-3 hover:bg-blue-50 dark:hover:bg-blue-900/20"
            >
              <div className="flex items-start gap-2 w-full">
                <div className="text-blue-600 dark:text-blue-400 mt-0.5">
                  {template.icon}
                </div>
                <div className="text-left">
                  <div className="font-medium text-xs text-gray-900 dark:text-gray-100">
                    {template.label}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {template.description}
                  </div>
                </div>
              </div>
            </Button>
          ))}
        </div>
      </div>

      {/* Custom Instruction */}
      <div>
        <h3 className="text-sm font-semibold mb-2 flex items-center gap-1">
          <Edit className="w-4 h-4 text-green-600" />
          Custom Instructions
        </h3>
        <Textarea
          value={instruction}
          onChange={(e) => onInstructionChange(e.target.value)}
          placeholder="Describe how you want to revise this scene...

Examples:
• Make the dialogue more tense and add a reveal at the end
• Add more visual details and improve the pacing
• Focus on character emotions and internal conflict
• Make the scene more cinematic with better shot descriptions"
          className="min-h-[200px] text-sm"
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          Be specific about what to change. The more detailed your instructions, the better the results.
        </p>
      </div>

      {/* Tips */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
        <h4 className="text-xs font-semibold text-blue-900 dark:text-blue-100 mb-2">
          💡 Pro Tips
        </h4>
        <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
          <li>• Be specific about which elements to change</li>
          <li>• Mention the tone or mood you want to achieve</li>
          <li>• Reference specific characters or plot points</li>
          <li>• Consider the scene's role in the overall story</li>
        </ul>
      </div>
    </div>
  )
}
