'use client'

import React from 'react'
import { FileText, Film, Camera, Clapperboard, ChevronDown, ChevronUp, Lightbulb, Layers } from 'lucide-react'
import { cn } from '@/lib/utils'

export type WorkflowStep = 'dialogueAction' | 'directorsChair' | 'storyboardPreViz' | 'segmentBuilder' | 'callAction'

interface SceneWorkflowCoPilotProps {
  activeStep: WorkflowStep | null
  isCollapsed?: boolean
  onToggleCollapse?: () => void
}

export const guidanceContent: Record<WorkflowStep, {
  title: string
  icon: React.ReactNode
  goal: string
  whyItMatters: string
  howItWorks: string[]
  toolsAndTips: string[]
  bestPractice: string
  tip: string
}> = {
  dialogueAction: {
    title: 'Script',
    icon: <FileText className="w-5 h-5 text-sf-primary" />,
    goal: 'Finalize the scene script.',
    whyItMatters: 'The script is the foundation. Changes made here automatically update everything else. Locking the script now prevents costly regeneration later.',
    howItWorks: [
      'Edit narration and dialogue directly in the script',
      'Use AI Review (Score) to get feedback from professional Director and Audience perspectives',
      'Use the AI assistant to professionally revise dialogue, improve pacing, or adjust tone'
    ],
    toolsAndTips: [
      'Edit Scene: Click "Scene" to edit narration, dialogue, and action in a rich editor',
      'Get Review: Click "Get Review" to score your scene from Director & Audience perspectives',
      'AI Review (Score): Analyzes pacing, structure, emotional impact, and engagement',
      'AI Assistant: Use to revise dialogue and improve script quality',
      'Audio Generation: Generate voice narration and character dialogue',
      'Delete Audio: When you change voices, delete old audio first to force fresh generation'
    ],
    bestPractice: 'Do not proceed until the script is locked and you have achieved a satisfactory AI Score.',
    tip: 'Finalizing the script early prevents costly rework later in the workflow.'
  },
  directorsChair: {
    title: 'Direction',
    icon: <Film className="w-5 h-5 text-sf-primary" />,
    goal: 'Define the cinematic vision and technical execution of the scene.',
    whyItMatters: 'This direction is used directly as the input prompt for storyboards and final video generation. Precision here is key.',
    howItWorks: [
      'Click "Generate AI Direction" to analyze your script and references',
      'The AI generates detailed direction including camera work, lighting, talent blocking, and audio cues',
      'Review and edit the direction manually or regenerate with adjustments'
    ],
    toolsAndTips: [
      'Camera: Angles, movement, lens choice, and focus',
      'Lighting: Mood, time of day, key/fill/backlight, color temperature',
      'Scene: Location, key props, atmosphere',
      'Talent: Blocking, key actions, emotional beats',
      'Audio: Priorities and considerations for SFX and music'
    ],
    bestPractice: 'Read the generated direction carefully. Does it match your vision? You can edit manually or prompt the AI to regenerate with adjustments.',
    tip: 'This direction is used directly as the input prompt for storyboards and final video. Precision here is key.'
  },
  storyboardPreViz: {
    title: 'Frame',
    icon: <Camera className="w-5 h-5 text-sf-primary" />,
    goal: 'Visualize the scene and gather feedback before final video generation.',
    whyItMatters: 'This is your checkpoint! Video generation is intensive. Making changes to the storyboard is fast; making changes to the video is slow and costly.',
    howItWorks: [
      'Generate Storyboard: Creates images based on Director\'s Chair direction and Reference Library',
      'The Screening Room: Click \'Play\' to watch the Pre-Viz—the storyboard timed with generated voice, music, and SFX',
      'Sharing: Share the Pre-Viz link with collaborators for feedback'
    ],
    toolsAndTips: [
      'Generate Storyboard: Creates images based on your direction',
      'The Screening Room: Preview the complete Pre-Viz with audio',
      'Sharing: Get feedback from collaborators before final generation'
    ],
    bestPractice: 'If changes are needed, go back to the previous steps (Script or Direction) and regenerate the storyboard.',
    tip: 'Making changes to the storyboard is fast; making changes to the video is slow and costly.'
  },
  segmentBuilder: {
    title: 'Segments',
    icon: <Layers className="w-5 h-5 text-sf-primary" />,
    goal: 'Build intelligent video segments based on scene content and audio timing.',
    whyItMatters: 'Proper segmentation is the foundation for high-quality video generation. AI analyzes narration, dialogue, and scene changes to create optimal segment boundaries.',
    howItWorks: [
      'AI Analysis: Automatically segments the scene based on narration, dialogue timing, and scene changes',
      'Preview & Adjust: Review proposed segments on the timeline; drag edges to fine-tune boundaries',
      'Prompt Review: Edit video generation prompts (cinematography only - scene content is locked)',
      'Finalize: Lock segments and proceed to Key Frames for each segment'
    ],
    toolsAndTips: [
      'Scene Bible: The scene description, narration, and dialogue are read-only during segmentation',
      'Duration Limits: Segments are optimized for 4-8 seconds (Veo 3.1 optimal range)',
      'Audio Alignment: Drag segment edges to snap to narration/dialogue boundaries',
      'Guardrails: The system will warn if your prompts introduce content not in the script',
      'Cinematography: Focus edits on camera movement, lighting, and pacing'
    ],
    bestPractice: 'Review the AI-generated segments before editing. If the script needs changes, go back to the Script tab first.',
    tip: 'Scene content is locked during segmentation to prevent accidental script changes. Edit the scene in the Script tab if needed.'
  },
  callAction: {
    title: 'Call Action',
    icon: <Clapperboard className="w-5 h-5 text-sf-primary" />,
    goal: 'Generate and assemble the final video segments.',
    whyItMatters: 'This is where your vision becomes reality. Careful review and editing of prompts ensures high-quality, consistent output.',
    howItWorks: [
      'Scene Breakdown: The AI automatically divides the scene into short segments (clips)',
      'Duration Settings: Adjust segment lengths (default 8s) based on your video generation platform capabilities',
      'Prompt Editing: Review and edit the exact prompt used for each video segment for fine-tuned control',
      'Generation Options: Generate AI video, generate static images, or upload your own footage for each segment',
      'Timeline Review: Review the assembled scene on the timeline, complete with tracks for speech, SFX, and music'
    ],
    toolsAndTips: [
      'Segment Breakdown: Automatic division into manageable clips',
      'Prompt Editing: Fine-tune the exact prompt for each segment',
      'Generation Options: Choose between AI video, static images, or uploaded footage',
      'Timeline: Review assembled scene with all audio tracks'
    ],
    bestPractice: 'Start by generating a few key segments to check the quality and consistency before generating the entire scene.',
    tip: 'Review and edit prompts carefully—this is your last chance to fine-tune before generation.'
  }
}

export function SceneWorkflowCoPilot({ activeStep, isCollapsed = false, onToggleCollapse }: SceneWorkflowCoPilotProps) {
  if (!activeStep) {
    return null
  }

  const content = guidanceContent[activeStep]

  return (
    <div className="border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900 overflow-hidden">
      {/* Header */}
      <button
        onClick={onToggleCollapse}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {content.icon}
          <span>AI Co-Pilot: {content.title}</span>
        </div>
        {isCollapsed ? (
          <ChevronDown className="w-4 h-4 text-gray-500" />
        ) : (
          <ChevronUp className="w-4 h-4 text-gray-500" />
        )}
      </button>

      {!isCollapsed && (
        <div className="px-4 pb-4 space-y-4 border-t border-gray-200 dark:border-gray-800">
          {/* Goal */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Goal:</h4>
            <p className="text-sm text-gray-700 dark:text-gray-300">{content.goal}</p>
          </div>

          {/* Why it Matters */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Why it Matters:</h4>
            <p className="text-sm text-gray-700 dark:text-gray-300">{content.whyItMatters}</p>
          </div>

          {/* How it Works */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">How it Works:</h4>
            <ul className="space-y-1.5 text-sm text-gray-700 dark:text-gray-300">
              {content.howItWorks.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-sf-primary mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Tools & Tips */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Tools & Tips:</h4>
            <ul className="space-y-1.5 text-sm text-gray-700 dark:text-gray-300">
              {content.toolsAndTips.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-sf-primary mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Best Practice */}
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-2">
              <Lightbulb className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-1">Best Practice:</h4>
                <p className="text-sm text-blue-800 dark:text-blue-200">{content.bestPractice}</p>
              </div>
            </div>
          </div>

          {/* Tip */}
          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <div className="flex items-start gap-2">
              <span className="text-amber-600 dark:text-amber-400 text-lg">💡</span>
              <div>
                <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-300 mb-1">Tip:</h4>
                <p className="text-sm text-amber-800 dark:text-amber-200">{content.tip}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

