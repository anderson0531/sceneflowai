import { create } from 'zustand';

interface AIContextState {
  context: string | null;
  isOpen: boolean;
  setContext: (context: string, openPanel?: boolean) => void;
  clearContext: () => void;
  togglePanel: (isOpen: boolean) => void;
}

export const useAIContextStore = create<AIContextState>((set) => ({
  context: null,
  isOpen: true,
  setContext: (context, openPanel = false) => set({ context, isOpen: openPanel ? true : undefined }),
  clearContext: () => set({ context: null }),
  togglePanel: (isOpen) => set({ isOpen }),
}));
