import { create } from 'zustand';
import { InteractionMode } from '@/types/story';

interface PreferencesState {
  interactionMode: InteractionMode;
  setInteractionMode: (mode: InteractionMode) => void;
  toggleInteractionMode: () => void;
}

export const usePreferences = create<PreferencesState>((set, get) => ({
  interactionMode: 'Guidance', // Default to expert mode for safety
  
  setInteractionMode: (mode: InteractionMode) => {
    set({ interactionMode: mode });
  },
  
  toggleInteractionMode: () => {
    const current = get().interactionMode;
    set({ interactionMode: current === 'CoPilot' ? 'Guidance' : 'CoPilot' });
  },
}));
