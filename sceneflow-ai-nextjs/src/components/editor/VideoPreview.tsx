'use client';

import { Player } from '@remotion/player';
import { VideoComposition } from '@/remotion/VideoComposition';
import { useEditorStore } from '@/store/editorStore';

export function VideoPreview() {
  const { fps, width, height, durationInFrames, currentFrame, setCurrentFrame } = useEditorStore();
  
  return (
    <div className="w-full h-full bg-black flex items-center justify-center">
      <Player
        component={VideoComposition}
        durationInFrames={durationInFrames}
        compositionWidth={width}
        compositionHeight={height}
        fps={fps}
        controls
        style={{ width: '100%', maxHeight: '100%' }}
        inputProps={{}}
        onFrameUpdate={setCurrentFrame}
        initialFrame={currentFrame}
      />
    </div>
  );
}

