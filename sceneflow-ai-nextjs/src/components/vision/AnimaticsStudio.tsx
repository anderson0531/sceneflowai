'use client';

import { X } from 'lucide-react';
import { VideoPreview } from '@/components/editor/VideoPreview';
import { Timeline } from '@/components/editor/Timeline';
import { useEditorStore } from '@/store/editorStore';
import { useEffect } from 'react';

interface AnimaticsStudioProps {
  scenes: any[];
  onClose: () => void;
}

export function AnimaticsStudio({ scenes, onClose }: AnimaticsStudioProps) {
  const { loadProject, resetProject } = useEditorStore();
  
  useEffect(() => {
    // Initialize project from storyboard scenes
    const assets = scenes.map((scene, idx) => ({
      id: `asset-${idx}`,
      type: 'image' as const,
      src: scene.imageUrl,
      durationInFrames: 150, // 5 seconds at 30fps
      title: `Scene ${scene.sceneNumber}`,
      metadata: {}
    }));
    
    const videoTrack = {
      id: 'video-track-1',
      type: 'video' as const,
      name: 'Video',
      clips: assets.map((asset, idx) => ({
        id: `clip-${idx}`,
        assetId: asset.id,
        trackId: 'video-track-1',
        startFrame: idx * 150,
        durationInFrames: 150,
        trimStartFrame: 0,
        trimEndFrame: 150,
        effects: [{ id: `effect-${idx}`, type: 'kenBurns' as const, params: {} }]
      })),
      locked: false,
      visible: true
    };
    
    loadProject({
      id: 'animatics-project',
      title: 'Storyboard Animatics',
      fps: 30,
      width: 1920,
      height: 1080,
      durationInFrames: assets.length * 150,
      assets,
      tracks: [videoTrack],
      currentFrame: 0,
      zoom: 1
    });
    
    return () => resetProject();
  }, [scenes, loadProject, resetProject]);
  
  return (
    <div className="fixed inset-0 z-50 bg-black">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="h-16 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-4">
          <h2 className="text-xl font-bold text-white">Animatics Studio</h2>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        {/* Preview */}
        <div className="flex-1 flex">
          <div className="flex-1">
            <VideoPreview />
          </div>
        </div>
        
        {/* Timeline */}
        <div className="h-64 border-t border-gray-800">
          <Timeline />
        </div>
      </div>
    </div>
  );
}

