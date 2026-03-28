import { create } from 'zustand';

interface StorylineGeneratorState {
  title: string;
  concept: string;
  marketContext: any;
  setSeriesGenerationInput: (data: { title: string; concept: string; marketContext: any }) => void;
}

export const useStorylineGeneratorStore = create<StorylineGeneratorState>((set) => ({
  title: '',
  concept: '',
  marketContext: null,
  setSeriesGenerationInput: (data) => set(data),
}));
