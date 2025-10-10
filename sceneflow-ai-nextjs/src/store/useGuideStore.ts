import { create } from 'zustand';
import { ProductionGuide, Beat, CharacterProfile, ViewMode, BeatFunction, EmotionalCharge, BoneyardItem, FilmTreatmentDetails } from '@/types/productionGuide';

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
  beatSheet: [],
  treatmentDetails: {
    title: '',
    logline: '',
    synopsis: '',
    keyCharacters: '',
    toneAndStyle: '',
    themes: '',
    visualLanguage: '',
    billboardImageUrl: null
  }
};

interface GuideState {
  guide: ProductionGuide;
  // Project initialization
  initializeProject: (projectData: Partial<ProductionGuide>) => void;
  resetProject: () => void;
  // Project metadata updates
  updateTitle: (title: string) => void;
  // Content updates
  updateTreatment: (newTreatment: string) => void;
  updateTreatmentDetails: (updates: Partial<FilmTreatmentDetails>) => void;
  setScenesOutline: (scenes: any[]) => void;
  setFullScriptText: (text: string | null) => void;
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
  // New: treatment variants
  setTreatmentVariants: (variants: Array<{ id: string; label?: string; content: string; visual_style?: string; tone_description?: string; target_audience?: string }>) => void;
  selectTreatmentVariant: (id: string) => void;
  useTreatmentVariant: (id: string) => void;
  updateTreatmentVariant: (id: string, patch: any) => void;
  addTreatmentVariant: (variant: any) => void;
  cloneTreatmentVariant: (id: string) => any | null;
  lastEdit?: { variantId: string; before: any } | null;
  setLastEdit: (e: { variantId: string; before: any } | null) => void;
  undoLastEdit: () => void;
  // UI feedback for Apply
  justAppliedVariantId?: string;
  appliedAt?: number;
  markJustApplied: (variantId: string) => void;
}

export const useGuideStore = create<GuideState>((set) => ({
  guide: initialGuide,
  lastEdit: null,
  setLastEdit: (e) => set({ lastEdit: e }),
  undoLastEdit: () => set((state) => {
    const le = (state as any).lastEdit
    if (!le) return state as any
    const list = ((state.guide as any).treatmentVariants || []) as any[]
    const idx = list.findIndex((v: any) => v.id === le.variantId)
    if (idx === -1) return { ...(state as any), lastEdit: null }
    const restored = [...list]
    restored[idx] = { ...restored[idx], ...le.before, updatedAt: Date.now() }
    return {
      guide: { ...(state.guide as any), treatmentVariants: restored },
      lastEdit: null
    } as any
  }),
  justAppliedVariantId: undefined,
  appliedAt: undefined,
  markJustApplied: (variantId) => {
    set({ justAppliedVariantId: variantId, appliedAt: Date.now() })
    // Auto-clear after 2s if still pointing to same variant
    setTimeout(() => {
      set((s: any) => (s.justAppliedVariantId === variantId ? { justAppliedVariantId: undefined, appliedAt: undefined } : s))
    }, 2000)
  },
  
  // Project initialization
  initializeProject: (projectData) => {
    // Store: Initializing project with data
    return set((state) => {
      const newGuide = {
        ...state.guide,
        ...projectData,
        projectId: projectData.projectId || `project-${Date.now()}`,
        title: projectData.title || 'Untitled Project',
        filmTreatment: projectData.filmTreatment || '',
        characters: projectData.characters || [],
        beatSheet: projectData.beatSheet || []
      } as any;
      // Store: New guide state
      return { guide: newGuide };
    });
  },
  
  updateTitle: (title) => set((state) => ({
    guide: { ...state.guide, title }
  })),
  
  resetProject: () => set(() => ({
    guide: initialGuide
  })),
  
  updateTreatment: (newTreatment) => set((state) => ({
    guide: { ...state.guide, filmTreatment: newTreatment }
  })),
  updateTreatmentDetails: (updates) => set((state) => ({
    guide: { ...state.guide, treatmentDetails: { ...(state.guide.treatmentDetails || {} as any), ...updates } }
  })),
  setScenesOutline: (scenes) => set((state) => ({
    guide: { ...state.guide, scenesOutline: scenes }
  })),
  setFullScriptText: (text) => set((state) => ({
    guide: { ...state.guide, fullScriptText: text }
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
    } as any;
    
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
      const updatedBeat = { ...beat, startTime: currentTime } as any;
      currentTime += beat.estimatedDuration || 0;
      return updatedBeat;
    });
    
    return {
      guide: {
        ...state.guide,
        beatSheet: updatedBeats
      }
    } as any;
  }),
  
  // Beat operations
  splitBeat: (beatId, splitPoint) => {
    let beat1: Beat, beat2: Beat;
    
    set((state) => {
      const originalBeat = state.guide.beatSheet.find(b => b.id === beatId) as any;
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
      } as any;
      
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
      } as any;
      
      const updatedBeats = state.guide.beatSheet.map(beat => 
        (beat as any).id === beatId ? (beat1 as any) : beat
      );
      updatedBeats.splice(updatedBeats.findIndex((b: any) => b.id === (beat1 as any).id) + 1, 0, beat2 as any);
      
      return {
        guide: {
          ...state.guide,
          beatSheet: updatedBeats
        }
      } as any;
    });
    
    return { beat1: beat1!, beat2: beat2! };
  },
  
  mergeBeats: (beatIds) => {
    let mergedBeat: Beat;
    
    set((state) => {
      const beatsToMerge = state.guide.beatSheet.filter((b: any) => beatIds.includes(b.id));
      if (beatsToMerge.length < 2) throw new Error('Need at least 2 beats to merge');
      
      const primaryBeat = beatsToMerge[0];
      const now = new Date();
      
      mergedBeat = {
        ...primaryBeat,
        id: `merged-${Date.now()}`,
        title: beatsToMerge.map((b: any) => b.title).join(' + '),
        summary: beatsToMerge.map((b: any) => b.summary).join('\n\n'),
        charactersPresent: [...new Set(beatsToMerge.flatMap((b: any) => b.charactersPresent))],
        keywords: [...new Set(beatsToMerge.flatMap((b: any) => b.keywords || []))],
        estimatedDuration: beatsToMerge.reduce((sum: number, b: any) => sum + (b.estimatedDuration || 0), 0),
        childBeatIds: beatIds,
        modifiedAt: now
      } as any;
      
      const updatedBeats = state.guide.beatSheet.filter((b: any) => !beatIds.includes(b.id));
      updatedBeats.splice(
        Math.min(...beatIds.map(id => state.guide.beatSheet.findIndex((b: any) => b.id === id))),
        0,
        mergedBeat as any
      );
      
      return {
        guide: {
          ...state.guide,
          beatSheet: updatedBeats
        }
      } as any;
    });
    
    return mergedBeat!;
  },
  
  deleteBeat: (beatId) => set((state) => ({
    guide: {
      ...state.guide,
      beatSheet: state.guide.beatSheet.filter((beat: any) => (beat as any).id !== beatId)
    }
  })),
  
  // Boneyard operations
  moveToBoneyard: (beatId, reason) => set((state) => {
    const beat = state.guide.beatSheet.find((b: any) => (b as any).id === beatId);
    if (!beat) return state as any;
    
    const boneyardItem: BoneyardItem = {
      id: `boneyard-${Date.now()}`,
      beat: { ...(beat as any), isInBoneyard: true, boneyardReason: reason },
      reason,
      addedAt: new Date(),
      source: 'user_moved'
    } as any;
    
    return {
      guide: {
        ...state.guide,
        beatSheet: state.guide.beatSheet.filter((b: any) => (b as any).id !== beatId),
        boneyard: [...(state.guide.boneyard || []), boneyardItem]
      }
    } as any;
  }),
  
  restoreFromBoneyard: (boneyardItemId, targetAct) => set((state) => {
    const boneyardItem = (state.guide.boneyard || []).find((item: any) => item.id === boneyardItemId) as any;
    if (!boneyardItem) return state as any;
    
    const restoredBeat = {
      ...boneyardItem.beat,
      act: targetAct,
      isInBoneyard: false,
      boneyardReason: undefined,
      modifiedAt: new Date()
    } as any;
    
    return {
      guide: {
        ...state.guide,
        beatSheet: [...state.guide.beatSheet, restoredBeat],
        boneyard: (state.guide.boneyard || []).filter((item: any) => item.id !== boneyardItemId)
      }
    } as any;
  }),
  
  addToBoneyard: (beat, reason, source) => set((state) => {
    const boneyardItem: BoneyardItem = {
      id: `boneyard-${Date.now()}`,
      beat: { ...(beat as any), isInBoneyard: true, boneyardReason: reason, createdAt: new Date() },
      reason,
      addedAt: new Date(),
      source
    } as any;
    
    return {
      guide: {
        ...state.guide,
        boneyard: [...(state.guide.boneyard || []), boneyardItem]
      }
    } as any;
  }),
  
  removeFromBoneyard: (boneyardItemId) => set((state) => ({
    guide: {
      ...state.guide,
      boneyard: (state.guide.boneyard || []).filter((item: any) => item.id !== boneyardItemId)
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
  
  // New: treatment variants
  setTreatmentVariants: (variants) => set((state) => ({
    guide: { ...(state.guide as any), treatmentVariants: variants, selectedTreatmentId: variants?.[0]?.id }
  })),
  selectTreatmentVariant: (id) => set((state) => ({
    guide: { ...(state.guide as any), selectedTreatmentId: id }
  })),
  useTreatmentVariant: (id) => set((state) => {
    const variants = ((state.guide as any).treatmentVariants || []) as Array<{ id: string; content: string; visual_style?: string; tone_description?: string; target_audience?: string; title?: string; logline?: string; synopsis?: string; style?: string; tone?: string; themes?: any; mood_references?: string[]; character_descriptions?: any; }>
    const found = variants.find(v => v.id === id)
    if (!found) return state as any
    return {
      guide: {
        ...(state.guide as any),
        filmTreatment: String(found.content || ''),
        treatmentDetails: {
          ...((state.guide as any).treatmentDetails || {}),
          visual_style: found.visual_style || found.style,
          tone_description: found.tone_description || found.tone,
          target_audience: found.target_audience
        },
        treatmentStructured: {
          title: found.title,
          logline: found.logline,
          synopsis: found.synopsis,
          style: found.style,
          tone: found.tone,
          themes: found.themes,
          mood_references: found.mood_references,
          character_descriptions: found.character_descriptions
        }
      }
    } as any
  }),
  updateTreatmentVariant: (id, patch) => set((state) => {
    const list = ((state.guide as any).treatmentVariants || []) as any[]
    const idx = list.findIndex((v: any) => v.id === id)
    if (idx === -1) return state as any
    const before = list[idx]
    const updated = [...list]
    updated[idx] = { ...before, ...patch, updatedAt: Date.now() }
    return { guide: { ...(state.guide as any), treatmentVariants: updated }, lastEdit: { variantId: id, before } } as any
  }),
  addTreatmentVariant: (variant) => set((state) => {
    const list = ((state.guide as any).treatmentVariants || []) as any[]
    const next = [...list, variant]
    return { guide: { ...(state.guide as any), treatmentVariants: next } } as any
  }),
  cloneTreatmentVariant: (id) => {
    let cloned: any = null
    set((state) => {
      const list = ((state.guide as any).treatmentVariants || []) as any[]
      const src = list.find(v => v.id === id)
      if (!src) return state as any
      const newId = `${id}′`
      cloned = { ...src, id: newId, label: `${src.label || src.id}′` }
      const next = [...list, cloned]
      return { guide: { ...(state.guide as any), treatmentVariants: next, selectedTreatmentId: newId } } as any
    })
    return cloned
  }
}));
