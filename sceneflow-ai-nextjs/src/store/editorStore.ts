import { create } from 'zustand';
import { ProjectState, Clip, Track, Asset } from '@/types/editor';

interface EditorState extends ProjectState {
  // Actions
  addAsset: (asset: Asset) => void;
  removeAsset: (assetId: string) => void;
  addClip: (clip: Clip) => void;
  updateClip: (clipId: string, updates: Partial<Clip>) => void;
  removeClip: (clipId: string) => void;
  moveClip: (clipId: string, newTrackId: string, newStartFrame: number) => void;
  addTrack: (track: Track) => void;
  setCurrentFrame: (frame: number) => void;
  setZoom: (zoom: number) => void;
  loadProject: (project: ProjectState) => void;
  resetProject: () => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  // Initial state
  id: '',
  title: '',
  fps: 30,
  width: 1920,
  height: 1080,
  durationInFrames: 0,
  assets: [],
  tracks: [],
  currentFrame: 0,
  zoom: 1,
  
  // Actions
  addAsset: (asset) => set((state) => ({ assets: [...state.assets, asset] })),
  removeAsset: (assetId) => set((state) => ({
    assets: state.assets.filter(a => a.id !== assetId)
  })),
  addClip: (clip) => set((state) => {
    const track = state.tracks.find(t => t.id === clip.trackId);
    if (!track) return state;
    return {
      tracks: state.tracks.map(t =>
        t.id === clip.trackId
          ? { ...t, clips: [...t.clips, clip] }
          : t
      )
    };
  }),
  updateClip: (clipId, updates) => set((state) => ({
    tracks: state.tracks.map(track => ({
      ...track,
      clips: track.clips.map(clip =>
        clip.id === clipId ? { ...clip, ...updates } : clip
      )
    }))
  })),
  removeClip: (clipId) => set((state) => ({
    tracks: state.tracks.map(track => ({
      ...track,
      clips: track.clips.filter(c => c.id !== clipId)
    }))
  })),
  moveClip: (clipId, newTrackId, newStartFrame) => set((state) => {
    // Find the clip in the tracks
    let clipToMove: Clip | null = null;
    let oldTrackId = '';
    
    for (const track of state.tracks) {
      const clip = track.clips.find(c => c.id === clipId);
      if (clip) {
        clipToMove = clip;
        oldTrackId = track.id;
        break;
      }
    }
    
    if (!clipToMove) return state;
    
    // Remove from old track and add to new track
    return {
      tracks: state.tracks.map(track => {
        if (track.id === oldTrackId) {
          return {
            ...track,
            clips: track.clips.filter(c => c.id !== clipId)
          };
        }
        if (track.id === newTrackId) {
          return {
            ...track,
            clips: [...track.clips, { ...clipToMove!, trackId: newTrackId, startFrame: newStartFrame }]
          };
        }
        return track;
      })
    };
  }),
  addTrack: (track) => set((state) => ({ tracks: [...state.tracks, track] })),
  setCurrentFrame: (frame) => set({ currentFrame: frame }),
  setZoom: (zoom) => set({ zoom }),
  loadProject: (project) => set(project),
  resetProject: () => set({
    id: '',
    title: '',
    assets: [],
    tracks: [],
    currentFrame: 0,
    zoom: 1,
    durationInFrames: 0,
    fps: 30,
    width: 1920,
    height: 1080
  })
}));

