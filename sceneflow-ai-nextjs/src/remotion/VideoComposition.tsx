import React from 'react';
import { AbsoluteFill, Img, Audio, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { useEditorStore } from '@/store/editorStore';
import { Clip } from '@/types/editor';

export const VideoComposition: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const { tracks, assets } = useEditorStore();
  
  const getAsset = (assetId: string) => assets.find(a => a.id === assetId);
  
  const renderClip = (clip: Clip) => {
    const asset = getAsset(clip.assetId);
    if (!asset) {
      console.warn(`[VideoComposition] Asset not found for clip ${clip.id}`);
      return null;
    }
    
    // Validate asset src
    if (!asset.src || asset.src.trim() === '') {
      console.warn(`[VideoComposition] Invalid asset src for clip ${clip.id}`);
      return null;
    }
    
    const isVisible = frame >= clip.startFrame && frame < clip.startFrame + clip.durationInFrames;
    if (!isVisible) return null;
    
    const localFrame = frame - clip.startFrame;
    
    // Ken Burns effect
    if (clip.effects.some(e => e.type === 'kenBurns')) {
      const scale = interpolate(localFrame, [0, clip.durationInFrames], [1, 1.2], {
        extrapolateRight: 'clamp',
        extrapolateLeft: 'clamp'
      });
      const translateX = interpolate(localFrame, [0, clip.durationInFrames], [0, -50], {
        extrapolateRight: 'clamp',
        extrapolateLeft: 'clamp'
      });
      
      return (
        <AbsoluteFill key={clip.id} style={{ transform: `scale(${scale}) translateX(${translateX}px)` }}>
          <Img src={asset.src} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </AbsoluteFill>
      );
    }
    
    // Fade effect
    const fadeEffect = clip.effects.find(e => e.type === 'fade');
    let opacity = clip.opacity ?? 1;
    if (fadeEffect) {
      if (fadeEffect.params.direction === 'in') {
        opacity = interpolate(localFrame, [0, 30], [0, 1], {
          extrapolateRight: 'clamp',
          extrapolateLeft: 'clamp'
        });
      } else if (fadeEffect.params.direction === 'out') {
        opacity = interpolate(localFrame, [clip.durationInFrames - 30, clip.durationInFrames], [1, 0], {
          extrapolateRight: 'clamp',
          extrapolateLeft: 'clamp'
        });
      }
    }
    
    if (asset.type === 'image') {
      return (
        <AbsoluteFill key={clip.id} style={{ opacity }}>
          <Img src={asset.src} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </AbsoluteFill>
      );
    }
    
    if (asset.type === 'video') {
      return (
        <AbsoluteFill key={clip.id} style={{ opacity }}>
          <video src={asset.src} style={{ width: '100%', height: '100%', objectFit: 'cover' }} autoPlay muted loop />
        </AbsoluteFill>
      );
    }
    
    if (asset.type === 'audio') {
      return <Audio key={clip.id} src={asset.src} volume={clip.volume ?? 1} startFrom={clip.trimStartFrame} />;
    }
    
    return null;
  };
  
  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      {tracks.map(track => track.clips.map(renderClip))}
    </AbsoluteFill>
  );
};

