import { useMemo } from 'react';
import { FullProjectParameters } from '@/lib/credits/calculateFullProjectCredits';

/**
 * Vision phase data structure from project.metadata.visionPhase
 */
interface VisionPhaseData {
  guide?: {
    beatSheet?: Array<{
      estimatedDuration?: number;
      [key: string]: any;
    }>;
    scenesOutline?: any[];
  };
  script?: {
    script?: {
      scenes?: Array<{
        duration?: number;
        dialogue?: any[];
        sfx?: any[];
        music?: any;
        narration?: any;
        [key: string]: any;
      }>;
    };
  };
  scenes?: any[];
}

/**
 * Hook to extract and calculate project cost parameters from actual project data
 * after script generation. This provides real counts instead of default estimates.
 * 
 * @param visionPhaseData - The project's visionPhase metadata containing script/scenes data
 */
export function useProjectCosts(visionPhaseData?: VisionPhaseData | null): Partial<FullProjectParameters> | null {
  return useMemo(() => {
    // Return null if no visionPhase data available
    if (!visionPhaseData) {
      return null;
    }

    // Get scenes from script.script.scenes (primary) or visionPhase.scenes (fallback)
    const scenes = visionPhaseData.script?.script?.scenes || 
                   visionPhaseData.scenes || 
                   [];
    
    // Get beatSheet for duration calculations if scenes don't have duration
    const beats = visionPhaseData.guide?.beatSheet || [];

    // Return null if no scenes data yet
    if (scenes.length === 0 && beats.length === 0) {
      return null;
    }

    // Calculate scene count - prefer scenes array, fallback to beats
    const sceneCount = scenes.length > 0 ? scenes.length : beats.length;
    
    if (sceneCount === 0) {
      return null;
    }

    // Calculate total duration from scenes (duration in seconds) or beats (estimatedDuration in minutes)
    let totalMinutes = 0;
    
    if (scenes.length > 0) {
      // Scenes have duration in seconds
      const totalSeconds = scenes.reduce((sum: number, scene: any) => {
        const duration = Number(scene.duration) || 30; // Default 30 seconds per scene
        return sum + duration;
      }, 0);
      totalMinutes = totalSeconds / 60;
    } else if (beats.length > 0) {
      // Beats have estimatedDuration in minutes
      totalMinutes = beats.reduce((sum: number, beat: any) => {
        return sum + (Number(beat.estimatedDuration) || 0.5); // Default 30 seconds per beat
      }, 0);
    }
    
    // Ensure we have a reasonable duration (minimum 1 minute)
    totalMinutes = Math.max(1, totalMinutes);

    // Estimate segments per scene from duration
    // Assumption: Each segment is ~8 seconds of video
    const avgDurationPerScene = (totalMinutes * 60) / sceneCount;
    const avgSegmentsPerScene = Math.max(1, Math.ceil(avgDurationPerScene / 8));

    // Count dialogue lines from scenes
    let dialogueLines = 0;
    let soundEffects = 0;
    let musicTracks = 0;
    let narrationCount = 0;

    if (scenes.length > 0) {
      scenes.forEach((scene: any) => {
        // Count dialogue lines
        if (scene.dialogue && Array.isArray(scene.dialogue)) {
          dialogueLines += scene.dialogue.length;
        }
        
        // Count sound effects
        if (scene.sfx && Array.isArray(scene.sfx)) {
          soundEffects += scene.sfx.length;
        }
        
        // Count music tracks (presence of music)
        if (scene.music) {
          musicTracks += 1;
        }
        
        // Count narration
        if (scene.narration) {
          narrationCount += 1;
        }
      });
    } else {
      // Fallback estimation based on scene count if scenes not available
      dialogueLines = sceneCount * 5; // Estimate 5 lines per scene
      soundEffects = Math.ceil(sceneCount * 2); // Estimate 2 SFX per scene
      musicTracks = Math.max(1, Math.ceil(sceneCount / 3)); // Estimate 1 music track per 3 scenes
      narrationCount = Math.ceil(sceneCount * 0.3); // Estimate 30% of scenes have narration
    }

    // Calculate key frames based on segments
    const totalSegments = sceneCount * avgSegmentsPerScene;
    const keyFramesPerSegment = 1; // At least 1 key frame per segment
    const keyFrames = totalSegments * keyFramesPerSegment;
    
    // Ensure all values are valid numbers
    const safeTotalMinutes = Math.max(1, Math.ceil(totalMinutes) || 1);
    const safeSceneCount = Math.max(1, sceneCount);
    const safeSegments = Math.max(1, avgSegmentsPerScene);
    const safeKeyFrames = Math.max(30, keyFrames);

    return {
      scenes: {
        count: safeSceneCount,
        segmentsPerScene: safeSegments,
        takesPerSegment: 2, // Default to 2 takes as requested
      },
      video: {
        totalMinutes: safeTotalMinutes,
      },
      images: {
        keyFrames: safeKeyFrames,
      },
      audio: {
        totalMinutes: safeTotalMinutes,
        dialogueLines: dialogueLines || 0,
        soundEffects: soundEffects || 0,
        musicTracks: musicTracks || 0,
      },
      voice: {
        voiceMinutes: safeTotalMinutes,
      },
      upscale: {
        upscaleMinutes: safeTotalMinutes, // Default to upscaling full duration
      },
    };
  }, [visionPhaseData]);
}
