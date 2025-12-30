import { useMemo } from 'react';
import { useGuideStore } from '@/store/useGuideStore';
import { FullProjectParameters } from '@/lib/credits/calculateFullProjectCredits';
import { Beat } from '@/types/productionGuide';

/**
 * Hook to extract and calculate project cost parameters from actual project data
 * after script generation. This provides real counts instead of default estimates.
 */
export function useProjectCosts(projectId?: string): Partial<FullProjectParameters> | null {
  const guide = useGuideStore((s) => s.guide);

  return useMemo(() => {
    // Return null if no project or no script data yet
    if (!guide || !guide.beatSheet || guide.beatSheet.length === 0) {
      return null;
    }

    const beats = guide.beatSheet;
    const scenes = guide.scenesOutline || [];

    // Calculate scene count from beatSheet
    const sceneCount = beats.length;

    // Estimate segments per scene from duration
    // Assumption: Each segment is ~8 seconds of video
    const avgSegmentsPerScene = beats.length > 0
      ? Math.round(
          beats.reduce((sum, beat) => {
            const durationMinutes = beat.estimatedDuration || 0.5; // Default 30 seconds
            const durationSeconds = durationMinutes * 60;
            const segments = Math.max(1, Math.ceil(durationSeconds / 8));
            return sum + segments;
          }, 0) / beats.length
        )
      : 3;

    // Calculate total project duration in minutes
    const totalMinutes = beats.reduce((sum, beat) => {
      return sum + (beat.estimatedDuration || 0.5); // Default 30 seconds per beat
    }, 0);

    // Count dialogue lines from scenes if available
    let dialogueLines = 0;
    let soundEffects = 0;
    let musicTracks = 0;

    if (scenes && Array.isArray(scenes)) {
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
      });
    } else {
      // Fallback estimation based on scene count if scenes outline not available
      dialogueLines = sceneCount * 5; // Estimate 5 lines per scene
      soundEffects = Math.ceil(sceneCount * 2); // Estimate 2 SFX per scene
      musicTracks = Math.max(1, Math.ceil(sceneCount / 3)); // Estimate 1 music track per 3 scenes
    }

    // Count narration from beats or scenes
    let narrationCount = 0;
    if (scenes && Array.isArray(scenes)) {
      narrationCount = scenes.filter((scene: any) => scene.narration).length;
    } else {
      // Estimate: 30% of beats have narration
      narrationCount = Math.ceil(sceneCount * 0.3);
    }

    // Calculate key frames based on segments
    const totalSegments = sceneCount * avgSegmentsPerScene;
    const keyFramesPerSegment = 1; // At least 1 key frame per segment
    const keyFrames = totalSegments * keyFramesPerSegment;

    return {
      scenes: {
        count: sceneCount,
        segmentsPerScene: avgSegmentsPerScene,
        takesPerSegment: 2, // Default to 2 takes as requested
      },
      video: {
        totalMinutes: Math.ceil(totalMinutes),
      },
      images: {
        keyFrames: Math.max(30, keyFrames), // Minimum 30 key frames
      },
      audio: {
        totalMinutes: Math.ceil(totalMinutes),
        dialogueLines: dialogueLines,
        soundEffects: soundEffects,
        musicTracks: musicTracks,
      },
      voice: {
        voiceMinutes: Math.ceil(totalMinutes),
      },
      upscale: {
        upscaleMinutes: Math.ceil(totalMinutes), // Default to upscaling full duration
      },
    };
  }, [guide, projectId]);
}
