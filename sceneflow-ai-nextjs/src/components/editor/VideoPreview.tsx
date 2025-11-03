'use client';

import { Player } from '@remotion/player';
import { VideoComposition } from '@/remotion/VideoComposition';
import { useEditorStore } from '@/store/editorStore';
import { Loader } from 'lucide-react';

export function VideoPreview() {
  const { fps, width, height, durationInFrames, currentFrame, setCurrentFrame } = useEditorStore();
  
  // Don't render Player until we have valid duration
  if (durationInFrames <= 0) {
    return (
      <div className="w-full h-full bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader className="w-8 h-8 text-gray-400 animate-spin" />
          <p className="text-gray-400 text-sm">Loading video composition...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="w-full h-full bg-black flex items-center justify-center">
      <div className="relative w-full h-full">
        <Player
          component={VideoComposition}
          durationInFrames={durationInFrames}
          compositionWidth={width}
          compositionHeight={height}
          fps={fps}
          controls
          style={{ 
            width: '100%', 
            height: '100%'
          }}
          inputProps={{}}
          onFrameUpdate={setCurrentFrame}
          initialFrame={currentFrame}
          acknowledgeRemotionLicense
        />
      </div>
    </div>
  );
}

