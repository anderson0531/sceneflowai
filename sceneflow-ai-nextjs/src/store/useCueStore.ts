import { create } from 'zustand';

export interface CueContext {
  type: 'text' | 'beatCard' | 'character';
  id?: string;
  content: string;
}

interface CueState {
  isSidebarOpen: boolean;
  activeContext: CueContext | null;
  // Actions
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
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
    invokeCue: store.invokeCue,
    clearContext: store.clearContext,
  };
};
