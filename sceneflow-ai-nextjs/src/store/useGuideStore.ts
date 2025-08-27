import { create } from 'zustand';
import { ProductionGuide, Beat, CharacterProfile, ViewMode, BeatFunction, EmotionalCharge, BoneyardItem } from '@/types/productionGuide';

// Mock data initialization (replace with actual AI generation result)
const initialGuide: ProductionGuide = {
  projectId: 'crispr-debate-001',
  title: 'CRISPR Gene Editing Debate',
  beatTemplate: 'debate-educational', // Default to current structure
  viewMode: 'kanban', // Default view mode
  boneyard: [], // Initialize empty boneyard
  boneyardCollapsed: true, // Start collapsed
  filmTreatment: `
    <h1>CRISPR Gene Editing Debate</h1>
    <p><strong>Logline:</strong> A compelling video that tackles the profound technological and ethical challenges of CRISPR gene editing through a debate between an optimistic technologist and his cautious, experienced father.</p>
    <p><strong>Synopsis:</strong> This video explores the complex intersection of innovation and caution in biotechnology through a personal family dynamic, making the complex subject matter accessible and relatable.</p>
    <p><strong>Target Audience:</strong> Science enthusiasts, students, general public interested in biotechnology and ethics</p>
    <p><strong>Genre:</strong> Educational/Documentary</p>
    <p><strong>Tone:</strong> Thoughtful, balanced, engaging</p>
    <p><strong>Duration:</strong> 15-20 minutes</p>
    <h2>Story Structure</h2>
    <p>The video follows a structured debate format that mirrors the three-act structure of traditional storytelling. Act I establishes the context and introduces the central conflict between technological optimism and ethical caution. Act II explores both perspectives in depth, with each character presenting their case. Act III finds common ground and presents a balanced conclusion.</p>
    <h2>Key Themes</h2>
    <p>The narrative explores several interconnected themes: the tension between progress and responsibility, the role of family dynamics in complex discussions, the importance of balanced perspectives in scientific advancement, and the need for thoughtful consideration of new technologies.</p>
  `,
  characters: [
    {
      id: 'alex-1',
      name: 'Alex',
      archetype: 'The Optimistic Technologist',
      primaryMotivation: 'Advance biotechnology for human benefit',
      internalConflict: 'Balancing innovation with responsibility',
      externalConflict: 'Convincing others of technology\'s potential',
      arc: {
        act1: 'Alex introduces CRISPR technology with enthusiasm, focusing on its potential to cure diseases and improve human life.',
        act2: 'Alex faces challenges as ethical concerns are raised, forcing him to consider the broader implications of his work.',
        act3: 'Alex learns to balance his optimism with responsibility, finding common ground with his father\'s concerns.'
      }
    },
    {
      id: 'dr-anderson-1',
      name: 'Dr. Anderson',
      archetype: 'The Cautious Experienced Father',
      primaryMotivation: 'Ensure responsible development of technology',
      internalConflict: 'Supporting son while maintaining ethical standards',
      externalConflict: 'Balancing progress with safety concerns',
      arc: {
        act1: 'Dr. Anderson expresses concern about the rapid pace of technological advancement and potential risks.',
        act2: 'Dr. Anderson presents his case for caution, drawing on his experience and understanding of scientific history.',
        act3: 'Dr. Anderson recognizes the value of innovation while maintaining his commitment to responsible development.'
      }
    }
  ],
  beatSheet: [
    {
      id: 'beat-1',
      title: 'Introduction to CRISPR',
      summary: 'Establish the context of CRISPR gene editing technology and its potential impact on medicine, agriculture, and human evolution.',
      charactersPresent: ['alex-1', 'dr-anderson-1'],
      structuralPurpose: 'Set up the debate and establish stakes',
      act: 'ACT_I',
      estimatedDuration: 3,
      startTime: 0,
      pacing: 'medium',
      importance: 'high',
      beatFunction: 'setup',
      emotionalCharge: 'neutral',
      keywords: ['CRISPR', 'gene editing', 'technology', 'potential'],
      productionTags: {
        location: 'Modern Laboratory',
        locationType: 'INT',
        timeOfDay: 'DAY',
        mood: 'Professional'
      }
    },
    {
      id: 'beat-2',
      title: 'The Debate Setup',
      summary: 'Alex presents his optimistic view of CRISPR\'s potential while Dr. Anderson expresses concerns about safety and ethics.',
      charactersPresent: ['alex-1', 'dr-anderson-1'],
      structuralPurpose: 'Establish the central conflict between progress and caution',
      act: 'ACT_I',
      estimatedDuration: 2,
      startTime: 3,
      pacing: 'fast',
      importance: 'critical',
      beatFunction: 'inciting_incident',
      emotionalCharge: 'negative',
      keywords: ['conflict', 'debate', 'opposing views', 'tension'],
      productionTags: {
        location: 'Conference Room',
        locationType: 'INT',
        timeOfDay: 'DAY',
        mood: 'Tense'
      }
    },
    {
      id: 'beat-3',
      title: 'Technological Optimism',
      summary: 'Alex argues for the benefits: curing genetic diseases, improving agriculture, advancing scientific knowledge, and enhancing human capabilities.',
      charactersPresent: ['alex-1'],
      structuralPurpose: 'Present the case for progress and innovation',
      act: 'ACT_IIA',
      estimatedDuration: 4,
      startTime: 5,
      pacing: 'medium',
      importance: 'high',
      beatFunction: 'rising_action',
      emotionalCharge: 'positive',
      keywords: ['innovation', 'benefits', 'progress', 'hope'],
      productionTags: {
        location: 'Research Facility',
        locationType: 'INT',
        timeOfDay: 'DAY',
        mood: 'Inspiring'
      }
    },
    {
      id: 'beat-4',
      title: 'Ethical Caution',
      summary: 'Dr. Anderson raises concerns about safety, unintended consequences, ethical boundaries, and the need for careful regulation.',
      charactersPresent: ['dr-anderson-1'],
      structuralPurpose: 'Present the case for caution and responsibility',
      act: 'ACT_IIA',
      estimatedDuration: 4,
      startTime: 9,
      pacing: 'medium',
      importance: 'high',
      beatFunction: 'conflict',
      emotionalCharge: 'negative',
      keywords: ['ethics', 'caution', 'responsibility', 'regulation'],
      productionTags: {
        location: 'University Office',
        locationType: 'INT',
        timeOfDay: 'AFTERNOON',
        mood: 'Serious'
      }
    },
    {
      id: 'beat-5',
      title: 'Finding Common Ground',
      summary: 'Both characters work toward understanding each other\'s perspectives, recognizing the value of both innovation and caution.',
      charactersPresent: ['alex-1', 'dr-anderson-1'],
      structuralPurpose: 'Resolve the conflict through dialogue and mutual understanding',
      act: 'ACT_IIB',
      estimatedDuration: 3,
      startTime: 13,
      pacing: 'slow',
      importance: 'critical',
      beatFunction: 'turning_point',
      emotionalCharge: 'positive',
      keywords: ['understanding', 'compromise', 'balance', 'wisdom'],
      productionTags: {
        location: 'Garden Patio',
        locationType: 'EXT',
        timeOfDay: 'EVENING',
        mood: 'Peaceful'
      }
    },
    {
      id: 'beat-6',
      title: 'Conclusion',
      summary: 'Synthesize the debate into a balanced view of responsible innovation, emphasizing the importance of both progress and ethical consideration.',
      charactersPresent: ['alex-1', 'dr-anderson-1'],
      structuralPurpose: 'Provide closure and key takeaways for viewers',
      act: 'ACT_III',
      estimatedDuration: 2,
      startTime: 16,
      pacing: 'medium',
      importance: 'high',
      beatFunction: 'resolution',
      emotionalCharge: 'positive',
      keywords: ['synthesis', 'balance', 'responsibility', 'future'],
      productionTags: {
        location: 'Modern Laboratory',
        locationType: 'INT',
        timeOfDay: 'DAY',
        mood: 'Hopeful'
      }
    }
  ]
};

interface GuideState {
  guide: ProductionGuide;
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
