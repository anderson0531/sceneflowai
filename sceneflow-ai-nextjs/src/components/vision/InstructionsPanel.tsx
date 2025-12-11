'use client'

import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Wand2, Edit, Zap, Heart, Eye, Target, Lightbulb, Trash2 } from 'lucide-react'

interface InstructionsPanelProps {
  instruction: string
  onInstructionChange: (instruction: string) => void
  // Optional: for multi-instruction support
  maxInstructions?: number
}

const MAX_INSTRUCTIONS_DEFAULT = 5

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

// Count instructions (numbered lines starting with digit+period)
function countInstructions(text: string): number {
  if (text.trim() === '') return 0
  const numberedLines = text.match(/^\d+\.\s/gm)
  return numberedLines ? numberedLines.length : (text.trim() ? 1 : 0)
}

export function InstructionsPanel({ 
  instruction, 
  onInstructionChange,
  maxInstructions = MAX_INSTRUCTIONS_DEFAULT
}: InstructionsPanelProps) {
  const instructionCount = countInstructions(instruction)
  const canAddMore = instructionCount < maxInstructions

  // Append instruction with numbered format
  const appendInstruction = (newText: string) => {
    if (!canAddMore) return
    
    if (instruction.trim() === '') {
      onInstructionChange(`1. ${newText}`)
    } else {
      const nextNum = instructionCount + 1
      onInstructionChange(`${instruction}\n\n${nextNum}. ${newText}`)
    }
  }

  // Clear all instructions
  const clearInstructions = () => {
    onInstructionChange('')
  }

  return (
    <div className="space-y-4">
      {/* Instruction Templates */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold flex items-center gap-1">
            <Wand2 className="w-4 h-4 text-blue-600" />
            Common Revisions
          </h3>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {instructionCount}/{maxInstructions} instructions
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {INSTRUCTION_TEMPLATES.map(template => (
            <Button
              key={template.id}
              size="sm"
              variant="outline"
              onClick={() => appendInstruction(template.text)}
              disabled={!canAddMore}
              className={`justify-start text-left h-auto py-2 px-3 hover:bg-blue-50 dark:hover:bg-blue-900/20 ${
                !canAddMore ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <div className="flex items-start gap-2 w-full">
                <div className="text-blue-600 dark:text-blue-400 mt-0.5">
                  {template.icon}
                </div>
                <div className="text-left">
                  <div className="font-medium text-xs text-gray-900 dark:text-gray-100">
                    + {template.label}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
                    {template.description}
                  </div>
                </div>
              </div>
            </Button>
          ))}
        </div>
        {!canAddMore && (
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
            Maximum {maxInstructions} instructions reached. Clear some to add more.
          </p>
        )}
      </div>

      {/* Custom Instruction */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold flex items-center gap-1">
            <Edit className="w-4 h-4 text-green-600" />
            Custom Instructions
          </h3>
          {instructionCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearInstructions}
              className="h-6 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
            >
              <Trash2 className="w-3 h-3 mr-1" />
              Clear All
            </Button>
          )}
        </div>
        <Textarea
          value={instruction}
          onChange={(e) => onInstructionChange(e.target.value)}
          placeholder="Click buttons above to add instructions, or type custom ones here...

Instructions are automatically numbered for clarity:
1. First instruction
2. Second instruction
3. Third instruction"
          className="min-h-[180px] text-sm"
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          Combine up to {maxInstructions} instructions per revision for efficient editing. More specific = better results.
        </p>
      </div>

      {/* Tips */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
        <h4 className="text-xs font-semibold text-blue-900 dark:text-blue-100 mb-2">
          💡 Multi-Instruction Tips
        </h4>
        <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
          <li>• Combine related changes in one revision</li>
          <li>• Use Common Revisions buttons to build instructions</li>
          <li>• Add review recommendations from the review tabs</li>
          <li>• {maxInstructions} instructions per update is optimal for quality</li>
        </ul>
      </div>
    </div>
  )
}
