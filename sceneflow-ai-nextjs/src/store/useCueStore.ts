import { create } from 'zustand';

export interface CueContext {
  type: 'text' | 'beatCard' | 'character' | 'template' | 'analysis' | 'pacing' | 'conflict' | 'consistency';
  id?: string;
  content: string;
  // Optional payload for passing rich context (e.g., idea input, generated ideas)
  payload?: any;
}

interface CueState {
  isSidebarOpen: boolean;
  activeContext: CueContext | null;
  // Actions
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setSidebarVisibility: (isVisible: boolean) => void;
  invokeCue: (context: CueContext) => void;
  clearContext: () => void;
}

export const useCueStore = create<CueState>((set, get) => ({
  isSidebarOpen: false,
  activeContext: null,

  toggleSidebar: () => {
    set((state) => ({ isSidebarOpen: !state.isSidebarOpen }));
  },

  setSidebarOpen: (open: boolean) => {
    set({ isSidebarOpen: open });
  },

  setSidebarVisibility: (isVisible: boolean) => {
    set({ isSidebarOpen: isVisible });
  },

  invokeCue: (context: CueContext) => {
    set({
      activeContext: context,
      isSidebarOpen: true,
    });
  },

  clearContext: () => {
    set({ activeContext: null });
  },
}));

// Custom hook for easy access to Cue functionality
export const useCue = () => {
  const store = useCueStore();
  
  return {
    // State
    isSidebarOpen: store.isSidebarOpen,
    activeContext: store.activeContext,
    
    // Actions
    toggleSidebar: store.toggleSidebar,
    setSidebarOpen: store.setSidebarOpen,
    setSidebarVisibility: store.setSidebarVisibility,
    invokeCue: store.invokeCue,
    clearContext: store.clearContext,
  };
};
