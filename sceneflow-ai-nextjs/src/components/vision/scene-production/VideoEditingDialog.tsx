'use client'

/**
 * VideoEditingDialog
 * 
 * This module re-exports the refactored VideoEditingDialogV2 component which features:
 * - Split-view layout (40% controls, 60% preview)
 * - Smart Prompt tab with constraint-based UI (camera, performance, visual style, magic edit)
 * - Video prompt compiler that converts settings to optimized Veo 3.1 prompts
 * - History tab for take management
 * 
 * @see VideoEditingDialogV2.tsx for the full implementation
 * @see SmartPromptModules.tsx for the accordion control modules
 * @see videoPromptCompiler.ts for the prompt compilation logic
 */

export { 
  VideoEditingDialog, 
  type VideoEditingDialogProps,
  type VideoEditingTab,
  type SelectedReference 
} from './VideoEditingDialogV2'
