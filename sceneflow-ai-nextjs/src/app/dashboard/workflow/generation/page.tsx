'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { VideoPreview } from '@/components/editor/VideoPreview';
import { Timeline } from '@/components/editor/Timeline';
import { AssetPanel } from '@/components/editor/AssetPanel';
import { EffectsPanel } from '@/components/editor/EffectsPanel';
import { AnimaticStreamsPanel } from '@/components/export/AnimaticStreamsPanel';
import { useEditorStore } from '@/store/editorStore';
import { Button } from '@/components/ui/Button';
import { Download, ArrowLeft, Loader } from 'lucide-react';

export default function PolishPage() {
  const router = useRouter();
  const { currentProject } = useStore();
  const { loadProject, durationInFrames } = useEditorStore();
  const [isRendering, setIsRendering] = useState(false);
  
  useEffect(() => {
    if (!currentProject) {
      router.push('/dashboard');
      return;
    }
    
    // Load generated scenes from previous step
    const scenes = (currentProject.metadata as any)?.visionPhase?.scenes || [];
    
    // Initialize Full Video Studio project
    const assets = scenes.map((scene: any, idx: number) => ({
      id: `asset-${idx}`,
      type: scene.videoUrl ? 'video' : 'image' as const,
      src: scene.videoUrl || scene.imageUrl,
      durationInFrames: scene.videoUrl ? 300 : 150,
      title: `Scene ${scene.sceneNumber}`,
      metadata: {}
    }));
    
    const videoTrack = {
      id: 'video-track-1',
      type: 'video' as const,
      name: 'Video',
      clips: assets.map((asset: any, idx: number) => ({
        id: `clip-${idx}`,
        assetId: asset.id,
        trackId: 'video-track-1',
        startFrame: idx * asset.durationInFrames,
        durationInFrames: asset.durationInFrames,
        trimStartFrame: 0,
        trimEndFrame: asset.durationInFrames,
        effects: []
      })),
      locked: false,
      visible: true
    };
    
    loadProject({
      id: currentProject.id,
      title: currentProject.title,
      fps: 30,
      width: 1920,
      height: 1080,
      durationInFrames: assets.reduce((sum: number, a: any) => sum + a.durationInFrames, 0),
      assets,
      tracks: [videoTrack],
      currentFrame: 0,
      zoom: 1
    });
  }, [currentProject, loadProject, router]);
  
  const handleRender = async () => {
    setIsRendering(true);
    try {
      // Start rendering job
      const response = await fetch('/api/editor/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: currentProject?.id })
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || data.message || 'Render failed');
      }
      
      if (data.videoUrl) {
        // Immediate result (unlikely for Shotstack)
        window.open(data.videoUrl, '_blank');
        setIsRendering(false);
        return;
      }
      
      // Poll for status
      const statusUrl = data.statusUrl;
      if (!statusUrl) {
        throw new Error('No status URL returned');
      }
      
      // Poll every 5 seconds
      const pollInterval = setInterval(async () => {
        try {
          const statusRes = await fetch(statusUrl);
          const statusData = await statusRes.json();
          
          if (statusData.status === 'completed') {
            clearInterval(pollInterval);
            setIsRendering(false);
            if (statusData.final_video_url) {
              window.open(statusData.final_video_url, '_blank');
            }
          } else if (statusData.status === 'failed') {
            clearInterval(pollInterval);
            setIsRendering(false);
            console.error('Render failed:', statusData.error);
            alert('Render failed: ' + (statusData.error || 'Unknown error'));
          }
          // Continue polling if queued or processing
        } catch (e) {
          console.error('Polling error:', e);
          clearInterval(pollInterval);
          setIsRendering(false);
        }
      }, 5000);
      
    } catch (error) {
      console.error('Render failed:', error);
      setIsRendering(false);
      alert('Render failed. See console for details.');
    }
  };
  
  return (
    <div className="h-screen flex flex-col bg-gray-950">
      {/* Header */}
      <div className="h-16 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-xl font-bold text-white">Full Video Studio</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleRender} disabled={isRendering}>
            {isRendering ? (
              <>
                <Loader className="w-4 h-4 mr-2 animate-spin" />
                Rendering...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Export Video
              </>
            )}
          </Button>
        </div>
      </div>
      
      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Asset Panel + Animatic Streams */}
        <div className="w-64 bg-gray-900 border-r border-gray-800 overflow-y-auto flex flex-col">
          <AssetPanel />
          {currentProject?.id && (
            <AnimaticStreamsPanel 
              projectId={currentProject.id} 
              className="mt-4 mx-2 mb-4"
            />
          )}
        </div>
        
        {/* Center: Preview */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 p-4">
            <VideoPreview />
          </div>
          
          {/* Timeline */}
          <div className="h-64 border-t border-gray-800">
            <Timeline />
          </div>
        </div>
        
        {/* Right: Effects Panel */}
        <div className="w-64 bg-gray-900 border-l border-gray-800 overflow-y-auto">
          <EffectsPanel />
        </div>
      </div>
    </div>
  );
}
