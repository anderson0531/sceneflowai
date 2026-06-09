'use client'

import React from 'react'
import { FileText, Film, Camera, Clapperboard, ChevronDown, ChevronUp, Lightbulb, Layers, Sparkles } from 'lucide-react'
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
    title: 'Script — Foundation',
    icon: <FileText className="w-5 h-5 text-sf-primary" />,
    goal: 'Finalize script, audio, and references before pre-vis and video production.',
    whyItMatters: 'Foundation work happens here: writing, Audience Resonance review, voice casting, and timeline prep. Lock the script when ready so Express and production stay stable.',
    howItWorks: [
      'Edit narration, dialogue, and action in the Script tab',
      'Run Audience Resonance (aim for 85+) and apply targeted fixes',
      'Generate scene audio and assign voices from the Reference Library',
      'Use Screening Room — Preview (live) to review the animatic before exporting MP4s',
    ],
    toolsAndTips: [
      'Pre-Vis ready checklist: assign voices and add references (shown in Pre-Visualization panel)',
      'Express All Scenes: one project-level CTA for Direction → Audio → pre-vis frames',
      'Express: one project-level CTA for Direction → Audio → Pre-vis frames',
      'Screening Room = live preview; Production Streams = finished MP4 exports',
    ],
    bestPractice: 'Assign voices and key references before running Express — the Pre-Vis panel shows what is missing.',
    tip: 'You only see Script and Action tabs — Direction, pre-vis, and Beat Frames live inside those phases.',
  },
  directorsChair: {
    title: 'Direction (in Script phase)',
    icon: <Film className="w-5 h-5 text-sf-primary" />,
    goal: 'Define cinematic direction that feeds pre-vis and Beat Frame generation.',
    whyItMatters: 'Direction is generated automatically during Express or from the script. It drives camera, lighting, and blocking for consistent pre-vis frames.',
    howItWorks: [
      'Express generates direction per scene, or generate manually from the script',
      'Review camera, lighting, talent blocking, and audio cues',
      'Edit direction before re-running pre-vis generation',
    ],
    toolsAndTips: [
      'Direction lives in the Script tab workflow — no separate tab',
      'Changes to direction may require regenerating pre-vis frames',
    ],
    bestPractice: 'Confirm direction matches your vision before building pre-vis.',
    tip: 'Direction is an input to Express, not a separate production phase.',
  },
  storyboardPreViz: {
    title: 'Pre-vis — Pre-visualization phase',
    icon: <Camera className="w-5 h-5 text-sf-primary" />,
    goal: 'Build pre-vis frames for every beat and share for approval.',
    whyItMatters: 'Pre-vis frames are still images per beat — fast to change. Video and Beat Frames come later in the Action tab.',
    howItWorks: [
      'Run Build Pre-vis (Express) at project level when script is locked',
      'Review frames in the pre-vis gallery; share link for stakeholder approval',
      'Screening Room — Preview (live): pre-vis timed with audio (not exported MP4)',
    ],
    toolsAndTips: [
      'Pre-vis Frame = still image for a beat (Express output)',
      'Approve pre-vis before opening Action tab video work',
      'Gallery is the single pre-vis truth — video production lives in Action',
    ],
    bestPractice: 'Share pre-vis for review before investing in Beat Frames and video.',
    tip: 'Making pre-vis changes is fast; re-rendering MP4 streams is slow.',
  },
  segmentBuilder: {
    title: 'Beats (internal)',
    icon: <Layers className="w-5 h-5 text-sf-primary" />,
    goal: 'Understand how beats drive cuts — managed automatically in the beat-first pipeline.',
    whyItMatters: 'Beats are script units (dialogue, narration, action). Express and production derive pre-vis frames and beat clips from them.',
    howItWorks: [
      'Beats are created from your script automatically',
      'Pre-vis frames attach to beats via Express',
      'Action tab derives beat clips for Beat Frames and video generation',
    ],
    toolsAndTips: [
      'Beat = script unit; Beat Frame = start/end pair for F2V',
      'No separate Beats tab — work in Script and Action only',
    ],
    bestPractice: 'Edit the script in the Script tab if beat boundaries need to change at the source.',
    tip: 'Segment Builder is not a user-facing step in the simplified workflow.',
  },
  callAction: {
    title: 'Action — Production phase',
    icon: <Clapperboard className="w-5 h-5 text-sf-primary" />,
    goal: 'Beat Frames → Mixer → Production Streams → Final Cut.',
    whyItMatters: 'This is canonical video production: Beat Frames for F2V, Director Console for beat video, Mixer for preview/export, Streams for finished MP4s.',
    howItWorks: [
      'Beat Frames: generate start/end pairs per beat clip (renamed from keyframes)',
      'Director Console: generate AI video beats (FTV recommended)',
      'Production Mixer: one Output control (Animatic | Video × language), elastic timing',
      'Production Streams — Export (MP4): review renders, re-render when beats change',
    ],
    toolsAndTips: [
      'Output selector syncs Mixer and Streams panel',
      'Render Stream opens unified export: Fast (WebM) / Broadcast (MP4) / Cloud',
      'After render: Play in Streams or Send to Final Cut',
      'Baseline language drives timeline; other languages show duration delta',
    ],
    bestPractice: 'Complete Beat Frames before switching Output to Video. Gate video until start + end frames exist.',
    tip: 'Do not use the gallery production panel — open Action tab for video work.',
  },
}

export function SceneWorkflowCoPilot({ activeStep, isCollapsed = false, onToggleCollapse }: SceneWorkflowCoPilotProps) {
  if (!activeStep) {
    return null
  }

  const content = guidanceContent[activeStep]

  return (
    <div className="border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900 overflow-hidden">
      <button
        onClick={onToggleCollapse}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {content.icon}
          <span>Co-Pilot: {content.title}</span>
        </div>
        {isCollapsed ? (
          <ChevronDown className="w-4 h-4 text-gray-500" />
        ) : (
          <ChevronUp className="w-4 h-4 text-gray-500" />
        )}
      </button>

      {!isCollapsed && (
        <div className="px-4 pb-4 space-y-4 border-t border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2 text-[11px] text-gray-500 uppercase tracking-wide">
            <Sparkles className="w-3.5 h-3.5" />
            Foundation → Pre-vis → Production → Final Cut
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Goal:</h4>
            <p className="text-sm text-gray-700 dark:text-gray-300">{content.goal}</p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Why it Matters:</h4>
            <p className="text-sm text-gray-700 dark:text-gray-300">{content.whyItMatters}</p>
          </div>

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

          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-2">
              <Lightbulb className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-1">Best Practice:</h4>
                <p className="text-sm text-blue-800 dark:text-blue-200">{content.bestPractice}</p>
              </div>
            </div>
          </div>

          {content.tip && (
            <p className="text-xs text-gray-500 italic">{content.tip}</p>
          )}
        </div>
      )}
    </div>
  )
}
