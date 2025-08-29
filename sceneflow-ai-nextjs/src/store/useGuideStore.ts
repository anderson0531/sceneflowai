import { create } from 'zustand';
import { ProductionGuide, Beat, CharacterProfile, ViewMode, BeatFunction, EmotionalCharge, BoneyardItem } from '@/types/productionGuide';

// Dynamic project initialization - no hardcoded data
const initialGuide: ProductionGuide = {
  projectId: '',
  title: '',
  beatTemplate: 'debate-educational', // Default template
  viewMode: 'kanban',
  boneyard: [],
  boneyardCollapsed: true,
  filmTreatment: '',
  characters: [],
  beatSheet: []
};

interface GuideState {
  guide: ProductionGuide;
  // Project initialization
  initializeProject: (projectData: Partial<ProductionGuide>) => void;
  resetProject: () => void;
  // Content updates
  updateTreatment: (newTreatment: string) => void;
  updateCharacter: (updatedCharacter: CharacterProfile) => void;
  // This function handles both reordering and moving beats between Acts
  updateBeats: (newBeats: Beat[]) => void;
  updateBeat: (beatId: string, updates: Partial<Beat>) => void;
  addBeat: (beat: Beat) => void;
  setBeatTemplate: (templateId: string) => void;
  applyBeatTemplate: (templateId: string, preserveExistingBeats?: boolean) => void;
  setViewMode: (mode: ViewMode) => void;
  updateBeatTiming: (beatId: string, timing: { estimatedDuration?: number; startTime?: number; pacing?: Beat['pacing']; importance?: Beat['importance'] }) => void;
  recalculateTimeline: () => void;
  // Beat operations
  splitBeat: (beatId: string, splitPoint?: string) => { beat1: Beat; beat2: Beat };
  mergeBeats: (beatIds: string[]) => Beat;
  deleteBeat: (beatId: string) => void;
  // Boneyard operations
  moveToBoneyard: (beatId: string, reason: string) => void;
  restoreFromBoneyard: (boneyardItemId: string, targetAct: string) => void;
  addToBoneyard: (beat: Beat, reason: string, source: BoneyardItem['source']) => void;
  removeFromBoneyard: (boneyardItemId: string) => void;
  toggleBoneyard: () => void;
  clearBoneyard: () => void;
}

export const useGuideStore = create<GuideState>((set) => ({
  guide: initialGuide,
  
  // Project initialization
  initializeProject: (projectData) => set((state) => ({
    guide: {
      ...state.guide,
      ...projectData,
      projectId: projectData.projectId || `project-${Date.now()}`,
      title: projectData.title || 'Untitled Project',
      filmTreatment: projectData.filmTreatment || '',
      characters: projectData.characters || [],
      beatSheet: projectData.beatSheet || []
    }
  })),
  
  resetProject: () => set(() => ({
    guide: initialGuide
  })),
  
  updateTreatment: (newTreatment) => set((state) => ({
    guide: { ...state.guide, filmTreatment: newTreatment }
  })),
  updateCharacter: (updatedCharacter) => set((state) => ({
    guide: {
        ...state.guide,
        characters: state.guide.characters.map(c =>
            c.id === updatedCharacter.id ? updatedCharacter : c
        )
    }
  })),
  updateBeats: (newBeats) => set((state) => ({
    guide: { ...state.guide, beatSheet: newBeats }
  })),
  updateBeat: (beatId, updates) => set((state) => ({
    guide: {
      ...state.guide,
      beatSheet: state.guide.beatSheet.map(beat =>
        beat.id === beatId ? { ...beat, ...updates } : beat
      )
    }
  })),
  addBeat: (beat) => set((state) => ({
    guide: {
      ...state.guide,
      beatSheet: [...state.guide.beatSheet, beat]
    }
  })),
  setBeatTemplate: (templateId) => set((state) => ({
    guide: {
      ...state.guide,
      beatTemplate: templateId
    }
  })),
  applyBeatTemplate: (templateId, preserveExistingBeats = false) => set((state) => {
    const newGuide = {
      ...state.guide,
      beatTemplate: templateId
    };
    
    if (!preserveExistingBeats) {
      // Clear existing beats when applying new template
      newGuide.beatSheet = [];
    }
    
    return { guide: newGuide };
  }),
  setViewMode: (mode) => set((state) => ({
    guide: {
      ...state.guide,
      viewMode: mode
    }
  })),
  updateBeatTiming: (beatId, timing) => set((state) => ({
    guide: {
      ...state.guide,
      beatSheet: state.guide.beatSheet.map(beat =>
        beat.id === beatId ? { ...beat, ...timing } : beat
      )
    }
  })),
  recalculateTimeline: () => set((state) => {
    // Recalculate start times based on duration order
    const sortedBeats = [...state.guide.beatSheet].sort((a, b) => (a.startTime || 0) - (b.startTime || 0));
    let currentTime = 0;
    
    const updatedBeats = sortedBeats.map(beat => {
      const updatedBeat = { ...beat, startTime: currentTime };
      currentTime += beat.estimatedDuration || 0;
      return updatedBeat;
    });
    
    return {
      guide: {
        ...state.guide,
        beatSheet: updatedBeats
      }
    };
  }),
  
  // Beat operations
  splitBeat: (beatId, splitPoint) => {
    let beat1: Beat, beat2: Beat;
    
    set((state) => {
      const originalBeat = state.guide.beatSheet.find(b => b.id === beatId);
      if (!originalBeat) throw new Error('Beat not found');
      
      const now = new Date();
      beat1 = {
        ...originalBeat,
        id: `${beatId}-part1`,
        title: `${originalBeat.title} (Part 1)`,
        summary: splitPoint || originalBeat.summary.substring(0, Math.floor(originalBeat.summary.length / 2)),
        childBeatIds: [`${beatId}-part2`],
        estimatedDuration: Math.ceil((originalBeat.estimatedDuration || 1) / 2),
        modifiedAt: now
      };
      
      beat2 = {
        ...originalBeat,
        id: `${beatId}-part2`,
        title: `${originalBeat.title} (Part 2)`,
        summary: originalBeat.summary.substring(Math.floor(originalBeat.summary.length / 2)),
        parentBeatId: beatId,
        estimatedDuration: Math.floor((originalBeat.estimatedDuration || 1) / 2),
        startTime: (originalBeat.startTime || 0) + Math.ceil((originalBeat.estimatedDuration || 1) / 2),
        createdAt: now,
        modifiedAt: now
      };
      
      const updatedBeats = state.guide.beatSheet.map(beat => 
        beat.id === beatId ? beat1 : beat
      );
      updatedBeats.splice(updatedBeats.findIndex(b => b.id === beat1.id) + 1, 0, beat2);
      
      return {
        guide: {
          ...state.guide,
          beatSheet: updatedBeats
        }
      };
    });
    
    return { beat1: beat1!, beat2: beat2! };
  },
  
  mergeBeats: (beatIds) => {
    let mergedBeat: Beat;
    
    set((state) => {
      const beatsToMerge = state.guide.beatSheet.filter(b => beatIds.includes(b.id));
      if (beatsToMerge.length < 2) throw new Error('Need at least 2 beats to merge');
      
      const primaryBeat = beatsToMerge[0];
      const now = new Date();
      
      mergedBeat = {
        ...primaryBeat,
        id: `merged-${Date.now()}`,
        title: beatsToMerge.map(b => b.title).join(' + '),
        summary: beatsToMerge.map(b => b.summary).join('\n\n'),
        charactersPresent: [...new Set(beatsToMerge.flatMap(b => b.charactersPresent))],
        keywords: [...new Set(beatsToMerge.flatMap(b => b.keywords || []))],
        estimatedDuration: beatsToMerge.reduce((sum, b) => sum + (b.estimatedDuration || 0), 0),
        childBeatIds: beatIds,
        modifiedAt: now
      };
      
      const updatedBeats = state.guide.beatSheet.filter(b => !beatIds.includes(b.id));
      updatedBeats.splice(
        Math.min(...beatIds.map(id => state.guide.beatSheet.findIndex(b => b.id === id))),
        0,
        mergedBeat
      );
      
      return {
        guide: {
          ...state.guide,
          beatSheet: updatedBeats
        }
      };
    });
    
    return mergedBeat!;
  },
  
  deleteBeat: (beatId) => set((state) => ({
    guide: {
      ...state.guide,
      beatSheet: state.guide.beatSheet.filter(beat => beat.id !== beatId)
    }
  })),
  
  // Boneyard operations
  moveToBoneyard: (beatId, reason) => set((state) => {
    const beat = state.guide.beatSheet.find(b => b.id === beatId);
    if (!beat) return state;
    
    const boneyardItem: BoneyardItem = {
      id: `boneyard-${Date.now()}`,
      beat: { ...beat, isInBoneyard: true, boneyardReason: reason },
      reason,
      addedAt: new Date(),
      source: 'user_moved'
    };
    
    return {
      guide: {
        ...state.guide,
        beatSheet: state.guide.beatSheet.filter(b => b.id !== beatId),
        boneyard: [...(state.guide.boneyard || []), boneyardItem]
      }
    };
  }),
  
  restoreFromBoneyard: (boneyardItemId, targetAct) => set((state) => {
    const boneyardItem = state.guide.boneyard?.find(item => item.id === boneyardItemId);
    if (!boneyardItem) return state;
    
    const restoredBeat = {
      ...boneyardItem.beat,
      act: targetAct,
      isInBoneyard: false,
      boneyardReason: undefined,
      modifiedAt: new Date()
    };
    
    return {
      guide: {
        ...state.guide,
        beatSheet: [...state.guide.beatSheet, restoredBeat],
        boneyard: (state.guide.boneyard || []).filter(item => item.id !== boneyardItemId)
      }
    };
  }),
  
  addToBoneyard: (beat, reason, source) => set((state) => {
    const boneyardItem: BoneyardItem = {
      id: `boneyard-${Date.now()}`,
      beat: { ...beat, isInBoneyard: true, boneyardReason: reason, createdAt: new Date() },
      reason,
      addedAt: new Date(),
      source
    };
    
    return {
      guide: {
        ...state.guide,
        boneyard: [...(state.guide.boneyard || []), boneyardItem]
      }
    };
  }),
  
  removeFromBoneyard: (boneyardItemId) => set((state) => ({
    guide: {
      ...state.guide,
      boneyard: (state.guide.boneyard || []).filter(item => item.id !== boneyardItemId)
    }
  })),
  
  toggleBoneyard: () => set((state) => ({
    guide: {
      ...state.guide,
      boneyardCollapsed: !state.guide.boneyardCollapsed
    }
  })),
  
  clearBoneyard: () => set((state) => ({
    guide: {
      ...state.guide,
      boneyard: []
    }
  })),
}));
