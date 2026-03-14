/**
 * FFmpeg Elastic Render Utility
 * 
 * Generates FFmpeg filter strings for LML elastic segment rendering.
 * Used during export/download to bake freeze-frame + Ken Burns effects
 * directly into the video files.
 * 
 * Key filters:
 * - tpad: Extends video with cloned last frame (stop_mode=clone)
 * - zoompan: Applies Ken Burns micro-zoom on the extended frames
 * 
 * NOTE: This utility generates filter strings only — actual FFmpeg execution
 * requires an environment with FFmpeg installed (not available on Vercel
 * serverless). For production deployment, this should be called from:
 * - A dedicated rendering microservice
 * - An AWS Lambda with FFmpeg layer
 * - A self-hosted worker with FFmpeg binary
 * 
 * @see /SCENEFLOW_AI_DESIGN_DOCUMENT.md for architecture decisions
 */

import type { SegmentDynamicsResult, LMLConfig, DEFAULT_LML_CONFIG } from '@/components/vision/scene-production/types'

// ============================================================================
// Types
// ============================================================================

export interface FFmpegFilterConfig {
  /** FFmpeg video filter string (for -vf flag) */
  videoFilter: string
  /** FFmpeg audio filter string (for -af flag, optional) */
  audioFilter?: string
  /** Description of what the filter does */
  description: string
  /** Expected output duration in seconds */
  outputDuration: number
}

export interface ElasticRenderPlan {
  /** Segment index */
  segmentIndex: number
  /** Input video file path/URL */
  inputPath: string
  /** Output video file path */
  outputPath: string
  /** FFmpeg filter configuration */
  filters: FFmpegFilterConfig
  /** Whether this segment needs processing (EXACT segments can be copied) */
  needsProcessing: boolean
  /** LML mode for this segment */
  mode: 'EXACT' | 'SMART_PAD' | 'FREEZE_EXTEND'
}

// ============================================================================
// Filter Generators
// ============================================================================

/**
 * Generate FFmpeg tpad filter for extending video with last frame clone.
 * 
 * tpad=stop_mode=clone:stop_duration=X
 * Clones the last video frame for X seconds, creating a clean freeze-frame.
 * 
 * @param extensionSeconds - Duration to extend in seconds
 * @returns FFmpeg tpad filter string
 */
export function generateTpadFilter(extensionSeconds: number): string {
  if (extensionSeconds <= 0) return ''
  // Round to 3 decimal places for FFmpeg precision
  const duration = Math.round(extensionSeconds * 1000) / 1000
  return `tpad=stop_mode=clone:stop_duration=${duration}`
}

/**
 * Generate FFmpeg zoompan filter for Ken Burns micro-zoom effect.
 * 
 * Applied ONLY to the freeze-frame extension portion.
 * Uses zoompan with precise start/end zoom to create subtle motion.
 * 
 * @param extensionSeconds - Duration of the zoom effect
 * @param startScale - Starting zoom level (e.g., 1.0)
 * @param endScale - Ending zoom level (e.g., 1.01)
 * @param fps - Output frame rate (default 30)
 * @returns FFmpeg zoompan filter string
 */
export function generateZoompanFilter(
  extensionSeconds: number,
  startScale: number = 1.0,
  endScale: number = 1.01,
  fps: number = 30
): string {
  if (extensionSeconds <= 0) return ''
  
  const totalFrames = Math.ceil(extensionSeconds * fps)
  // zoompan requires zoom expressed as multiplier (e.g., 1.0 to 1.01)
  // z=lerp(startScale, endScale, progress)
  const zoomExpr = `'${startScale}+(${endScale}-${startScale})*(on/${totalFrames})'`
  
  return `zoompan=z=${zoomExpr}:d=${totalFrames}:fps=${fps}:s=1920x1080`
}

/**
 * Generate a 50ms audio fade-out for clean anchor transitions.
 * Applied at the end of each extended segment's audio.
 * 
 * @param totalDuration - Total segment duration (base + extension)
 * @param rampDuration - Fade duration in seconds (default 0.05 = 50ms)
 * @returns FFmpeg audio filter string
 */
export function generateGainRampDown(
  totalDuration: number,
  rampDuration: number = 0.05
): string {
  const fadeStart = Math.max(0, totalDuration - rampDuration)
  return `afade=t=out:st=${fadeStart.toFixed(3)}:d=${rampDuration.toFixed(3)}`
}

// ============================================================================
// Composite Filter Builder
// ============================================================================

/**
 * Build complete FFmpeg filter configuration for a segment based on its LML dynamics.
 * 
 * @param dynamics - SegmentDynamicsResult from analyzeSceneLML
 * @param fps - Output frame rate
 * @returns FFmpegFilterConfig with appropriate filters
 */
export function buildSegmentFilters(
  dynamics: SegmentDynamicsResult,
  fps: number = 30
): FFmpegFilterConfig {
  const { mode, extension, baseDuration, displayDuration, visualEffect, applyGainRampDown: needsRamp } = dynamics
  
  // EXACT: No processing needed — stream copy
  if (mode === 'EXACT') {
    return {
      videoFilter: '',
      description: `Segment ${dynamics.segmentIndex + 1}: No extension needed (audio fits within video)`,
      outputDuration: baseDuration,
    }
  }
  
  // SMART_PAD: Just tpad, no zoompan
  if (mode === 'SMART_PAD') {
    const videoFilter = generateTpadFilter(extension)
    const audioFilter = needsRamp ? generateGainRampDown(displayDuration) : undefined
    
    return {
      videoFilter,
      audioFilter,
      description: `Segment ${dynamics.segmentIndex + 1}: Smart pad +${extension.toFixed(2)}s (last frame clone, no zoom)`,
      outputDuration: displayDuration,
    }
  }
  
  // FREEZE_EXTEND: tpad + zoompan for Ken Burns micro-zoom
  const tpadFilter = generateTpadFilter(extension)
  const zoompanFilter = visualEffect.type === 'kenburns'
    ? generateZoompanFilter(extension, visualEffect.scale[0], visualEffect.scale[1], fps)
    : ''
  
  // Combine filters: tpad first (extends the video), then zoompan on the extended portion
  // For full compositing, we'd use complex filtergraph with trim+concat
  // For now, tpad handles the extension and zoompan adds the subtle motion
  const videoFilters = [tpadFilter, zoompanFilter].filter(Boolean)
  const videoFilter = videoFilters.join(',')
  
  const audioFilter = needsRamp ? generateGainRampDown(displayDuration) : undefined
  
  return {
    videoFilter,
    audioFilter,
    description: `Segment ${dynamics.segmentIndex + 1}: Freeze extend +${extension.toFixed(2)}s (Ken Burns ${visualEffect.scale[0]}→${visualEffect.scale[1]})`,
    outputDuration: displayDuration,
  }
}

// ============================================================================
// Render Plan Builder
// ============================================================================

/**
 * Build a complete elastic render plan for all segments in a scene.
 * 
 * Generates FFmpeg commands for each segment that needs processing.
 * EXACT segments can be stream-copied (no re-encoding needed).
 * 
 * @param segmentDynamics - Array of SegmentDynamicsResult from analyzeSceneLML
 * @param inputPaths - Array of input video file paths (one per segment)
 * @param outputDir - Directory for output files
 * @param fps - Output frame rate
 * @returns Array of ElasticRenderPlan entries
 */
export function buildElasticRenderPlan(
  segmentDynamics: SegmentDynamicsResult[],
  inputPaths: string[],
  outputDir: string,
  fps: number = 30
): ElasticRenderPlan[] {
  return segmentDynamics.map((dynamics, idx) => {
    const inputPath = inputPaths[idx] || ''
    const outputPath = `${outputDir}/segment_${String(idx).padStart(3, '0')}_elastic.mp4`
    const filters = buildSegmentFilters(dynamics, fps)
    
    return {
      segmentIndex: idx,
      inputPath,
      outputPath,
      filters,
      needsProcessing: dynamics.mode !== 'EXACT',
      mode: dynamics.mode,
    }
  })
}

/**
 * Generate a complete FFmpeg command for a single segment render.
 * 
 * @param plan - ElasticRenderPlan for the segment
 * @returns Complete FFmpeg command string
 */
export function generateFFmpegCommand(plan: ElasticRenderPlan): string {
  if (!plan.needsProcessing) {
    // Stream copy — no re-encoding
    return `ffmpeg -i "${plan.inputPath}" -c copy "${plan.outputPath}"`
  }
  
  const parts = ['ffmpeg', '-i', `"${plan.inputPath}"`]
  
  if (plan.filters.videoFilter) {
    parts.push('-vf', `"${plan.filters.videoFilter}"`)
  }
  
  if (plan.filters.audioFilter) {
    parts.push('-af', `"${plan.filters.audioFilter}"`)
  }
  
  // Output settings
  parts.push(
    '-c:v', 'libx264',
    '-preset', 'medium',
    '-crf', '18',
    '-c:a', 'aac',
    '-b:a', '192k',
    `"${plan.outputPath}"`
  )
  
  return parts.join(' ')
}

/**
 * Generate FFmpeg concat file content for joining all processed segments.
 * 
 * @param plans - Array of render plans (in sequence order)
 * @returns Content for FFmpeg concat demuxer file
 */
export function generateConcatFile(plans: ElasticRenderPlan[]): string {
  return plans
    .sort((a, b) => a.segmentIndex - b.segmentIndex)
    .map(plan => `file '${plan.outputPath}'`)
    .join('\n')
}

/**
 * Generate the final concat command to join all segments.
 * 
 * @param concatFilePath - Path to the concat list file
 * @param outputPath - Final output video path
 * @returns FFmpeg concat command string
 */
export function generateConcatCommand(
  concatFilePath: string,
  outputPath: string
): string {
  return `ffmpeg -f concat -safe 0 -i "${concatFilePath}" -c copy "${outputPath}"`
}
