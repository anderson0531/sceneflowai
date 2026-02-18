import { create } from 'zustand'

/**
 * Processing overlay operation types
 * Each type has its own animation theme and progress messages
 * 
 * @global This is a global reference for consistent processing toasts across the app
 */
export type OperationType = 
  | 'script-review'        // Audience resonance analysis
  | 'script-generation'    // Writing/generating script
  | 'script-optimization'  // Optimizing/revising script
  | 'scene-revision'       // Revising individual scene
  | 'scene-analysis'       // Scene audience resonance analysis
  | 'series-analysis'      // Series resonance analysis
  | 'series-fix'           // Applying fix to series
  | 'series-edit'          // Editing series storyline
  | 'series-generation'    // Generating series episodes
  | 'image-generation'     // Generating images
  | 'video-generation'     // Generating video
  | 'audio-generation'     // Generating audio/TTS
  | 'character-generation' // Creating characters
  | 'character-enhance'    // Enhancing character reference image
  | 'keyframe-generation'  // Movie production keyframe generation
  | 'storyboard-production' // Storyboard scene image generation
  | 'analysis'             // General analysis
  | 'export'               // Exporting content
  | 'default'              // Generic processing

/**
 * Progress phase - represents current stage of operation
 */
export interface ProgressPhase {
  id: string
  label: string
  progress: number // 0-100 when this phase completes
}

/**
 * Configuration for different operation types
 */
export interface OperationConfig {
  title: string
  phases: ProgressPhase[]
  animationType: 'audience' | 'script' | 'image' | 'video' | 'audio' | 'series' | 'repair' | 'series-craft' | 'photographer' | 'storyboard' | 'magnifying-glass' | 'generic'
}

/**
 * Pre-defined operation configurations
 * 
 * @global Reference for all processing overlay configurations
 * - Each operation type has themed animations and phase-based progress messages
 * - Progress phases provide meaningful feedback about what's happening
 * - Animation types determine the visual representation
 */
export const OPERATION_CONFIGS: Record<OperationType, OperationConfig> = {
  'script-review': {
    title: 'Analyzing Resonance',
    animationType: 'audience',
    phases: [
      { id: 'init', label: 'Initializing analysis...', progress: 5 },
      { id: 'parse', label: 'Parsing script structure...', progress: 15 },
      { id: 'analyze-narrative', label: 'Analyzing narrative arcs...', progress: 30 },
      { id: 'analyze-characters', label: 'Evaluating character dynamics...', progress: 45 },
      { id: 'audience-feedback', label: 'Simulating audience reactions...', progress: 60 },
      { id: 'optimize', label: 'Identifying optimization opportunities...', progress: 75 },
      { id: 'resonance', label: 'Calculating resonance scores...', progress: 90 },
      { id: 'finalize', label: 'Finalizing analysis...', progress: 98 },
    ]
  },
  'script-generation': {
    title: 'Writing Script',
    animationType: 'script',
    phases: [
      { id: 'init', label: 'Preparing creative workspace...', progress: 5 },
      { id: 'outline', label: 'Drafting story outline...', progress: 20 },
      { id: 'scenes-1', label: 'Writing scenes 1-5...', progress: 40 },
      { id: 'scenes-2', label: 'Writing scenes 6-10...', progress: 55 },
      { id: 'scenes-3', label: 'Writing remaining scenes...', progress: 70 },
      { id: 'dialogue', label: 'Polishing dialogue...', progress: 85 },
      { id: 'finalize', label: 'Finalizing script...', progress: 98 },
    ]
  },
  'script-optimization': {
    title: 'Optimizing Script',
    animationType: 'script',
    phases: [
      { id: 'init', label: 'Analyzing current script...', progress: 10 },
      { id: 'feedback', label: 'Processing feedback...', progress: 25 },
      { id: 'revise-1', label: 'Revising scenes 1-5...', progress: 45 },
      { id: 'revise-2', label: 'Revising scenes 6-10...', progress: 60 },
      { id: 'revise-3', label: 'Revising remaining scenes...', progress: 75 },
      { id: 'polish', label: 'Polishing narrative flow...', progress: 90 },
      { id: 'finalize', label: 'Finalizing optimizations...', progress: 98 },
    ]
  },
  'scene-revision': {
    title: 'Revising Scene',
    animationType: 'script',
    phases: [
      { id: 'init', label: 'Analyzing instructions...', progress: 10 },
      { id: 'understand', label: 'Understanding context...', progress: 25 },
      { id: 'revise', label: 'Revising scene content...', progress: 50 },
      { id: 'dialogue', label: 'Refining dialogue...', progress: 70 },
      { id: 'polish', label: 'Polishing details...', progress: 88 },
      { id: 'finalize', label: 'Finalizing revision...', progress: 98 },
    ]
  },
  'scene-analysis': {
    title: 'Analyzing Scene',
    animationType: 'magnifying-glass',
    phases: [
      { id: 'init', label: 'Preparing analysis...', progress: 8 },
      { id: 'parse', label: 'Parsing scene structure...', progress: 18 },
      { id: 'analyze-dialogue', label: 'Reviewing dialogue...', progress: 32 },
      { id: 'analyze-action', label: 'Examining action beats...', progress: 48 },
      { id: 'audience-feedback', label: 'Simulating audience response...', progress: 65 },
      { id: 'recommendations', label: 'Generating recommendations...', progress: 82 },
      { id: 'scoring', label: 'Calculating resonance score...', progress: 92 },
      { id: 'finalize', label: 'Finalizing analysis...', progress: 98 },
    ]
  },
  'series-analysis': {
    title: 'Analyzing Series',
    animationType: 'series',
    phases: [
      { id: 'init', label: 'Initializing series analysis...', progress: 5 },
      { id: 'parse', label: 'Parsing episode structure...', progress: 15 },
      { id: 'analyze-episodes', label: 'Analyzing episode arcs...', progress: 30 },
      { id: 'analyze-characters', label: 'Evaluating character development...', progress: 45 },
      { id: 'audience-feedback', label: 'Simulating audience reactions...', progress: 60 },
      { id: 'continuity', label: 'Checking story continuity...', progress: 75 },
      { id: 'resonance', label: 'Calculating resonance scores...', progress: 90 },
      { id: 'finalize', label: 'Finalizing analysis...', progress: 98 },
    ]
  },
  'series-fix': {
    title: 'Fixing Series',
    animationType: 'repair',
    phases: [
      { id: 'init', label: 'Analyzing issue...', progress: 10 },
      { id: 'identify', label: 'Identifying affected content...', progress: 25 },
      { id: 'generate', label: 'Generating improvements...', progress: 50 },
      { id: 'apply', label: 'Applying fixes...', progress: 75 },
      { id: 'verify', label: 'Verifying changes...', progress: 90 },
      { id: 'finalize', label: 'Finalizing fix...', progress: 98 },
    ]
  },
  'series-edit': {
    title: 'Editing Storyline',
    animationType: 'script',
    phases: [
      { id: 'init', label: 'Analyzing current storyline...', progress: 10 },
      { id: 'identify', label: 'Identifying target elements...', progress: 25 },
      { id: 'generate', label: 'Generating changes...', progress: 50 },
      { id: 'apply', label: 'Applying edits...', progress: 75 },
      { id: 'verify', label: 'Verifying continuity...', progress: 90 },
      { id: 'finalize', label: 'Finalizing storyline...', progress: 98 },
    ]
  },
  'series-generation': {
    title: 'Crafting Series Episodes',
    animationType: 'series-craft',
    phases: [
      { id: 'init', label: 'Preparing creative workspace...', progress: 5 },
      { id: 'concept', label: 'Developing series concept...', progress: 15 },
      { id: 'characters', label: 'Creating cast of characters...', progress: 30 },
      { id: 'arcs', label: 'Crafting story arcs...', progress: 45 },
      { id: 'episodes', label: 'Writing episode outlines...', progress: 65 },
      { id: 'details', label: 'Adding episode details...', progress: 80 },
      { id: 'polish', label: 'Polishing storylines...', progress: 92 },
      { id: 'finalize', label: 'Finalizing series...', progress: 98 },
    ]
  },
  'image-generation': {
    title: 'Generating Images',
    animationType: 'image',
    phases: [
      { id: 'init', label: 'Preparing image prompts...', progress: 10 },
      { id: 'compose', label: 'Composing visual elements...', progress: 30 },
      { id: 'render', label: 'Rendering images...', progress: 60 },
      { id: 'enhance', label: 'Enhancing details...', progress: 85 },
      { id: 'finalize', label: 'Finalizing images...', progress: 98 },
    ]
  },
  'video-generation': {
    title: 'Generating Video',
    animationType: 'video',
    phases: [
      { id: 'init', label: 'Preparing video assets...', progress: 5 },
      { id: 'frames', label: 'Processing frames...', progress: 25 },
      { id: 'motion', label: 'Adding motion effects...', progress: 50 },
      { id: 'compose', label: 'Compositing scenes...', progress: 75 },
      { id: 'encode', label: 'Encoding video...', progress: 90 },
      { id: 'finalize', label: 'Finalizing video...', progress: 98 },
    ]
  },
  'audio-generation': {
    title: 'Generating Audio',
    animationType: 'audio',
    phases: [
      { id: 'init', label: 'Preparing audio synthesis...', progress: 10 },
      { id: 'voices', label: 'Generating voice tracks...', progress: 40 },
      { id: 'effects', label: 'Adding sound effects...', progress: 65 },
      { id: 'mix', label: 'Mixing audio tracks...', progress: 85 },
      { id: 'finalize', label: 'Finalizing audio...', progress: 98 },
    ]
  },
  'character-generation': {
    title: 'Creating Characters',
    animationType: 'image',
    phases: [
      { id: 'init', label: 'Analyzing character traits...', progress: 15 },
      { id: 'design', label: 'Designing character appearance...', progress: 40 },
      { id: 'render', label: 'Rendering character images...', progress: 70 },
      { id: 'variations', label: 'Creating variations...', progress: 90 },
      { id: 'finalize', label: 'Finalizing characters...', progress: 98 },
    ]
  },
  'keyframe-generation': {
    title: 'Generating Keyframe',
    animationType: 'video',
    phases: [
      { id: 'setup', label: 'Setting up the shot...', progress: 10 },
      { id: 'compose', label: 'Composing the frame...', progress: 25 },
      { id: 'direct', label: 'Directing the scene...', progress: 45 },
      { id: 'capture', label: 'Capturing the moment...', progress: 65 },
      { id: 'grade', label: 'Color grading...', progress: 80 },
      { id: 'polish', label: 'Final polish...', progress: 92 },
      { id: 'finalize', label: 'Locking keyframe...', progress: 98 },
    ]
  },
  'storyboard-production': {
    title: 'Storyboard Production',
    animationType: 'storyboard',
    phases: [
      { id: 'analyze', label: 'Reading scene description...', progress: 10 },
      { id: 'layout', label: 'Planning frame layout...', progress: 20 },
      { id: 'sketch', label: 'Sketching composition...', progress: 35 },
      { id: 'characters', label: 'Adding characters...', progress: 50 },
      { id: 'details', label: 'Drawing scene details...', progress: 65 },
      { id: 'refine', label: 'Refining artwork...', progress: 80 },
      { id: 'color', label: 'Applying colors...', progress: 92 },
      { id: 'finalize', label: 'Finalizing frame...', progress: 98 },
    ]
  },
  'character-enhance': {
    title: 'Enhancing Portrait',
    animationType: 'photographer',
    phases: [
      { id: 'analyze', label: 'Analyzing source image...', progress: 10 },
      { id: 'lighting', label: 'Setting up studio lighting...', progress: 25 },
      { id: 'prompt', label: 'Building headshot prompt...', progress: 40 },
      { id: 'generate', label: 'Generating professional headshot...', progress: 70 },
      { id: 'retouch', label: 'Professional retouching...', progress: 85 },
      { id: 'finalize', label: 'Finalizing enhancement...', progress: 98 },
    ]
  },
  'analysis': {
    title: 'Analyzing Content',
    animationType: 'generic',
    phases: [
      { id: 'init', label: 'Starting analysis...', progress: 15 },
      { id: 'process', label: 'Processing data...', progress: 50 },
      { id: 'evaluate', label: 'Evaluating results...', progress: 80 },
      { id: 'finalize', label: 'Completing analysis...', progress: 98 },
    ]
  },
  'export': {
    title: 'Exporting Content',
    animationType: 'generic',
    phases: [
      { id: 'init', label: 'Preparing export...', progress: 10 },
      { id: 'compile', label: 'Compiling assets...', progress: 40 },
      { id: 'package', label: 'Packaging content...', progress: 70 },
      { id: 'finalize', label: 'Finalizing export...', progress: 98 },
    ]
  },
  'default': {
    title: 'Processing',
    animationType: 'generic',
    phases: [
      { id: 'init', label: 'Starting...', progress: 10 },
      { id: 'process', label: 'Processing...', progress: 50 },
      { id: 'finalize', label: 'Completing...', progress: 98 },
    ]
  }
}

interface OverlayState {
  isVisible: boolean
  message: string
  estimatedDuration: number
  startTime: number | null
  operationType: OperationType
  currentPhaseIndex: number
  actualProgress: number // For tracking real API progress if available
  customStatus: string | null // For dynamic status from SSE
  estimatedRemainingSeconds: number | null // For dynamic time estimate from SSE
  
  // Enhanced show with operation type
  show: (message: string, estimatedDuration: number, operationType?: OperationType) => void
  hide: () => void
  
  // Update progress directly (for real progress tracking)
  setProgress: (progress: number) => void
  setPhase: (phaseIndex: number) => void
  setStatus: (status: string, remainingSeconds?: number) => void
}

export const useOverlayStore = create<OverlayState>((set) => ({
  isVisible: false,
  message: 'Processing...',
  estimatedDuration: 0,
  startTime: null,
  operationType: 'default',
  currentPhaseIndex: 0,
  actualProgress: 0,
  customStatus: null,
  estimatedRemainingSeconds: null,
  
  show: (message: string, estimatedDuration: number, operationType: OperationType = 'default') =>
    set({ 
      isVisible: true, 
      message, 
      estimatedDuration, 
      startTime: Date.now(),
      operationType,
      currentPhaseIndex: 0,
      actualProgress: 0,
      customStatus: null,
      estimatedRemainingSeconds: null
    }),
    
  hide: () =>
    set({ 
      isVisible: false, 
      message: 'Processing...', 
      estimatedDuration: 0, 
      startTime: null,
      operationType: 'default',
      currentPhaseIndex: 0,
      actualProgress: 0,
      customStatus: null,
      estimatedRemainingSeconds: null
    }),
    
  setProgress: (progress: number) => set({ actualProgress: progress }),
  setPhase: (phaseIndex: number) => set({ currentPhaseIndex: phaseIndex }),
  setStatus: (status: string, remainingSeconds?: number) => set({ 
    customStatus: status, 
    estimatedRemainingSeconds: remainingSeconds ?? null 
  })
}))


