'use client';

import { Player } from '@remotion/player';
import { VideoComposition } from '@/remotion/VideoComposition';
import { useEditorStore } from '@/store/editorStore';
import { Loader } from 'lucide-react';
import { useState } from 'react';

export function VideoPreview() {
  const { fps, width, height, durationInFrames, currentFrame, setCurrentFrame } = useEditorStore();
  const [playbackRate, setPlaybackRate] = useState(1);
  const [loop, setLoop] = useState(true);
  
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
        {/* Playback Controls */}
        <div className="absolute top-4 right-4 z-10 flex gap-2">
          <select
            value={playbackRate}
            onChange={(e) => setPlaybackRate(Number(e.target.value))}
            className="bg-gray-800 text-white px-3 py-1.5 rounded text-sm border border-gray-700 hover:border-gray-600 transition-colors"
          >
            <option value={0.25}>0.25x</option>
            <option value={0.5}>0.5x</option>
            <option value={1}>1x</option>
            <option value={1.5}>1.5x</option>
            <option value={2}>2x</option>
          </select>
          <button
            onClick={() => setLoop(!loop)}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              loop ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Loop
          </button>
        </div>
        
        <Player
          component={VideoComposition}
          durationInFrames={durationInFrames}
          compositionWidth={width}
          compositionHeight={height}
          fps={fps}
          controls
          loop={loop}
          playbackRate={playbackRate}
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

