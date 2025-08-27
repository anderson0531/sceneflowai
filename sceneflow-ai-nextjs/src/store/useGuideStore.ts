import { create } from 'zustand';
import { ProductionGuide, Beat, CharacterProfile } from '@/types/productionGuide';

// Mock data initialization (replace with actual AI generation result)
const initialGuide: ProductionGuide = {
  projectId: 'crispr-debate-001',
  title: 'CRISPR Gene Editing Debate',
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
      act: 'ACT_I'
    },
    {
      id: 'beat-2',
      title: 'The Debate Setup',
      summary: 'Alex presents his optimistic view of CRISPR\'s potential while Dr. Anderson expresses concerns about safety and ethics.',
      charactersPresent: ['alex-1', 'dr-anderson-1'],
      structuralPurpose: 'Establish the central conflict between progress and caution',
      act: 'ACT_I'
    },
    {
      id: 'beat-3',
      title: 'Technological Optimism',
      summary: 'Alex argues for the benefits: curing genetic diseases, improving agriculture, advancing scientific knowledge, and enhancing human capabilities.',
      charactersPresent: ['alex-1'],
      structuralPurpose: 'Present the case for progress and innovation',
      act: 'ACT_IIA'
    },
    {
      id: 'beat-4',
      title: 'Ethical Caution',
      summary: 'Dr. Anderson raises concerns about safety, unintended consequences, ethical boundaries, and the need for careful regulation.',
      charactersPresent: ['dr-anderson-1'],
      structuralPurpose: 'Present the case for caution and responsibility',
      act: 'ACT_IIA'
    },
    {
      id: 'beat-5',
      title: 'Finding Common Ground',
      summary: 'Both characters work toward understanding each other\'s perspectives, recognizing the value of both innovation and caution.',
      charactersPresent: ['alex-1', 'dr-anderson-1'],
      structuralPurpose: 'Resolve the conflict through dialogue and mutual understanding',
      act: 'ACT_IIB'
    },
    {
      id: 'beat-6',
      title: 'Conclusion',
      summary: 'Synthesize the debate into a balanced view of responsible innovation, emphasizing the importance of both progress and ethical consideration.',
      charactersPresent: ['alex-1', 'dr-anderson-1'],
      structuralPurpose: 'Provide closure and key takeaways for viewers',
      act: 'ACT_III'
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
}));
