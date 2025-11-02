export interface Asset {
  id: string;
  type: 'image' | 'video' | 'audio' | 'text';
  src: string; // Vercel Blob URL
  durationInFrames: number;
  title: string;
  metadata: { width?: number; height?: number; sampleRate?: number };
}

export interface Clip {
  id: string;
  assetId: string;
  trackId: string;
  startFrame: number;
  durationInFrames: number;
  trimStartFrame: number;
  trimEndFrame: number;
  effects: Effect[];
  volume?: number;
  opacity?: number;
}

export interface Effect {
  id: string;
  type: 'kenBurns' | 'fade' | 'crossfade' | 'transition';
  params: Record<string, any>;
}

export interface Track {
  id: string;
  type: 'video' | 'audio' | 'text';
  name: string;
  clips: Clip[];
  locked: boolean;
  visible: boolean;
}

export interface ProjectState {
  id: string;
  title: string;
  fps: number;
  width: number;
  height: number;
  durationInFrames: number;
  assets: Asset[];
  tracks: Track[];
  currentFrame: number;
  zoom: number;
}

