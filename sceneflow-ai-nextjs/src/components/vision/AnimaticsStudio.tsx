'use client';

import { X, Download, Loader } from 'lucide-react';
import { VideoPreview } from '@/components/editor/VideoPreview';
import { Timeline } from '@/components/editor/Timeline';
import { useEditorStore } from '@/store/editorStore';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';

interface AnimaticsStudioProps {
  scenes: any[];
  onClose: () => void;
}

export function AnimaticsStudio({ scenes, onClose }: AnimaticsStudioProps) {
  const { loadProject, resetProject } = useEditorStore();
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  
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
  
  const handleExport = async () => {
    setIsExporting(true);
    setExportError(null);
    
    try {
      const response = await fetch('/api/editor/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: 'animatics-project' })
      });
      
      if (!response.ok) {
        throw new Error('Export failed');
      }
      
      const { videoUrl, message } = await response.json();
      
      if (videoUrl && videoUrl !== 'https://placeholder-video-url.example.com') {
        // Open video in new tab or trigger download
        window.open(videoUrl, '_blank');
      } else {
        // Show message for placeholder implementation
        alert(message || 'Video rendering is being implemented. This feature will be available soon.');
      }
    } catch (error) {
      console.error('Export error:', error);
      setExportError('Failed to export video. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };
  
  return (
    <div className="fixed inset-0 z-50 bg-black">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="h-16 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-4">
          <h2 className="text-xl font-bold text-white">Animatics Studio</h2>
          <div className="flex items-center gap-3">
            {exportError && (
              <span className="text-red-400 text-sm">{exportError}</span>
            )}
            <Button
              onClick={handleExport}
              disabled={isExporting}
              className="flex items-center gap-2"
            >
              {isExporting ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Export MP4
                </>
              )}
            </Button>
            <button 
              onClick={onClose} 
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
        
        {/* Preview - constrained height to prevent overflow */}
        <div className="flex-1 min-h-0 flex overflow-hidden">
          <div className="flex-1 overflow-hidden">
            <VideoPreview />
          </div>
        </div>
        
        {/* Timeline - reduced height for better visibility */}
        <div className="h-48 border-t border-gray-800 flex-shrink-0">
          <Timeline />
        </div>
      </div>
    </div>
  );
}

