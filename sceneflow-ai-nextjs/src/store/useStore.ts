import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface User {
  id: string;
  email: string;
  name: string;
  userType: 'filmmaker' | 'content-creator' | 'business' | 'educator';
  credits: number;
  monthlyCredits: number;
  subscriptionTier: 'trial' | 'creator' | 'pro' | 'studio';
  hasBYOK: boolean;
  projects: Project[];
  ideas: Idea[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Scene {
  id: string;
  title: string;
  description: string;
  duration: number;
  visualNotes: string;
  audioNotes: string;
  order: number;
}

export interface Direction {
  id: string;
  sceneId: string;
  cameraAngle: string;
  movement: string;
  lighting: string;
  props: string;
  talent: string;
  notes: string;
}

export interface VideoVersion {
  id: string;
  name: string;
  status: 'processing' | 'completed' | 'failed';
  progress: number;
  duration: number;
  quality: string;
  createdAt: string;
  thumbnail?: string;
}

export interface GenerationSettings {
  quality: string;
  format: string;
  aspectRatio: string;
  frameRate: string;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  currentStep: WorkflowStep;
  progress: number; // 0-100
  status: 'draft' | 'in-progress' | 'completed' | 'archived';
  createdAt: Date;
  updatedAt: Date;
  completedSteps: WorkflowStep[];
  metadata: {
    genre?: string;
    duration?: number;
    targetAudience?: string;
    style?: string;
    concept?: string;
    keyMessage?: string;
    tone?: string;
    scenes?: Scene[];
    directions?: Direction[];
    videoVersions?: VideoVersion[];
    generationSettings?: GenerationSettings;
    selectedIdea?: any;
    storyboard?: any[];
    storyboardMetadata?: any;
    notes?: string[];
    prompts?: string[];
    changelog?: { id: string; timestamp: string; action: string; details?: string }[];
    // Enhanced project structure
    projectType?: 'short' | 'medium' | 'long';
    storyStructure?: 'linear' | 'three-act' | 'hero-journey' | 'save-the-cat' | 'custom';
    targetRuntime?: number;
    budget?: number;
    acts?: any[];
    currentChapter?: string;
    globalElements?: {
      characters?: any[];
      locations?: any[];
      props?: any[];
      visualStyle?: any;
      tone?: string;
      theme?: string;
    };
  };
}

export interface Idea {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export type WorkflowStep = 'ideation' | 'storyboard' | 'scene-direction' | 'video-generation';

export interface BYOKSettings {
  llmProvider: {
    name: 'google-gemini' | 'openai' | 'anthropic';
    apiKey: string;
    isConfigured: boolean;
  };
  imageGenerationProvider: {
    name: 'google-gemini' | 'openai-dalle' | 'stability-ai';
    apiKey: string;
    isConfigured: boolean;
  };
  videoGenerationProvider: {
    name: 'google-veo' | 'runway' | 'pika-labs';
    apiKey: string;
    isConfigured: boolean;
  };
}

interface AppState {
  // User state
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Project state
  currentProject: Project | null;
  projects: Project[];
  setProjects: (projects: Project[]) => void;
  
  // Workflow state
  currentStep: WorkflowStep;
  stepProgress: Record<WorkflowStep, number>; // 0-100 for each step
  
  // BYOK settings
  byokSettings: BYOKSettings;
  
  // UI state
  sidebarOpen: boolean;
  theme: 'light' | 'dark' | 'system';
  cueAssistantOpen: boolean;
  
  // Cue Assistant state
  cueConversation: {
    messages: Array<{
      id: string;
      type: 'user' | 'assistant';
      content: string;
      timestamp: Date;
    }>;
    hasUnreadNotifications: boolean;
    lastProjectRatingChange: Date | null;
  };
  
  // Actions
  setUser: (user: User | null) => void;
  setAuthenticated: (status: boolean) => void;
  setLoading: (loading: boolean) => void;
  
  setCurrentProject: (project: Project | null) => void;
  addProject: (project: Project) => void;
  updateProject: (projectId: string, updates: Partial<Project>) => void;
  deleteProject: (projectId: string) => void;
  
  setCurrentStep: (step: WorkflowStep) => void;
  updateStepProgress: (step: WorkflowStep, progress: number) => void;
  advanceToNextStep: () => void;
  canAdvanceToStep: (step: WorkflowStep) => boolean;
  
  updateBYOKSettings: (provider: keyof BYOKSettings, settings: Partial<BYOKSettings[keyof BYOKSettings]>) => void;
  setBYOKProvider: (provider: keyof BYOKSettings, name: string, apiKey: string) => void;
  appendCurrentProjectNote: (note: string) => void;
  applyCueSuggestion: (opts: { content: string; addNote?: boolean; addStoryboard?: boolean; addDirections?: boolean; addPrompts?: boolean; creditsCost?: number }) => void;
  spendCredits: (amount: number) => void;
  
  setSidebarOpen: (open: boolean) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setCueAssistantOpen: (open: boolean) => void;
  
  // Cue Assistant actions
  addCueMessage: (message: { type: 'user' | 'assistant'; content: string }) => void;
  clearCueConversation: () => void;
  setCueNotification: (hasNotifications: boolean) => void;
  markNotificationsAsRead: () => void;
  
  // Computed values
  getCurrentStepProgress: () => number;
  getOverallProgress: () => number;
  getNextStep: () => WorkflowStep | null;
}

export const useStore = create<AppState>((set, get) => ({
  // Initial state
  user: null,
  isAuthenticated: false,
  isLoading: false,
  currentProject: null,
  projects: [],
  setProjects: (projects) => set({ projects }),
  currentStep: 'ideation',
  stepProgress: {
    'ideation': 0,
    'storyboard': 0,
    'scene-direction': 0,
    'video-generation': 0
  },
  byokSettings: {
    llmProvider: { name: 'google-gemini', apiKey: '', isConfigured: false },
    imageGenerationProvider: { name: 'google-gemini', apiKey: '', isConfigured: false },
    videoGenerationProvider: { name: 'google-veo', apiKey: '', isConfigured: false }
  },
  sidebarOpen: true,
  theme: 'system',
  cueAssistantOpen: true,
  cueConversation: {
    messages: [],
    hasUnreadNotifications: false,
    lastProjectRatingChange: null
  },

  // Actions
  setUser: (user) => set({ user }),
  setAuthenticated: (status) => set({ isAuthenticated: status }),
  setLoading: (loading) => set({ isLoading: loading }),
  
  setCurrentProject: (project) => set({ currentProject: project }),
  addProject: (project) => set((state) => ({ 
    projects: [...state.projects, project] 
  })),
  updateProject: (projectId, updates) => set((state) => ({
    projects: state.projects.map(p => 
      p.id === projectId ? { ...p, ...updates, updatedAt: new Date() } : p
    ),
    currentProject: state.currentProject?.id === projectId 
      ? { ...state.currentProject, ...updates, updatedAt: new Date() }
      : state.currentProject
  })),
  deleteProject: (projectId) => set((state) => ({
    projects: state.projects.filter(p => p.id !== projectId),
    currentProject: state.currentProject?.id === projectId ? null : state.currentProject
  })),
  
  setCurrentStep: (step) => set({ currentStep: step }),
  updateStepProgress: (step, progress) => set((state) => ({
    stepProgress: { ...state.stepProgress, [step]: progress }
  })),
  advanceToNextStep: () => {
    const steps: WorkflowStep[] = ['ideation', 'storyboard', 'scene-direction', 'video-generation']
    const current = get().currentStep
    const currentIndex = steps.indexOf(current)
    if (currentIndex < steps.length - 1) {
      set({ currentStep: steps[currentIndex + 1] })
    }
  },
  canAdvanceToStep: (step) => {
    const steps: WorkflowStep[] = ['ideation', 'storyboard', 'scene-direction', 'video-generation']
    const current = get().currentStep
    const currentIndex = steps.indexOf(current)
    const targetIndex = steps.indexOf(step)
    return targetIndex <= currentIndex + 1
  },
  
  updateBYOKSettings: (provider, settings) => set((state) => ({
    byokSettings: {
      ...state.byokSettings,
      [provider]: { ...state.byokSettings[provider], ...settings }
    }
  })),
  setBYOKProvider: (provider, name, apiKey) => set((state) => ({
    byokSettings: {
      ...state.byokSettings,
      [provider]: { name, apiKey, isConfigured: !!apiKey }
    }
  })),
  appendCurrentProjectNote: (note) => set((state) => {
    if (!state.currentProject) return state
    const notes = [...(state.currentProject.metadata.notes || []), note]
    return {
      currentProject: {
        ...state.currentProject,
        metadata: { ...state.currentProject.metadata, notes }
      }
    }
  }),
  applyCueSuggestion: (opts) => {
    // Implementation for applying Cue suggestions
    console.log('Applying Cue suggestion:', opts)
  },
  spendCredits: (amount) => set((state) => ({
    user: state.user ? { ...state.user, credits: Math.max(0, state.user.credits - amount) } : null
  })),
  
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setTheme: (theme) => set({ theme }),
  setCueAssistantOpen: (open) => set({ cueAssistantOpen: open }),
  
  addCueMessage: (message) => set((state) => ({
    cueConversation: {
      ...state.cueConversation,
      messages: [...state.cueConversation.messages, {
        ...message,
        id: Date.now().toString(),
        timestamp: new Date()
      }]
    }
  })),
  clearCueConversation: () => set((state) => ({
    cueConversation: { ...state.cueConversation, messages: [] }
  })),
  setCueNotification: (hasNotifications) => set((state) => ({
    cueConversation: { ...state.cueConversation, hasUnreadNotifications: hasNotifications }
  })),
  markNotificationsAsRead: () => set((state) => ({
    cueConversation: { ...state.cueConversation, hasUnreadNotifications: false }
  })),
  
  getCurrentStepProgress: () => get().stepProgress[get().currentStep],
  getOverallProgress: () => {
    const state = get()
    const total = Object.values(state.stepProgress).reduce((sum, progress) => sum + progress, 0)
    return total / Object.keys(state.stepProgress).length
  },
  getNextStep: () => {
    const steps: WorkflowStep[] = ['ideation', 'storyboard', 'scene-direction', 'video-generation']
    const current = get().currentStep
    const currentIndex = steps.indexOf(current)
    return currentIndex < steps.length - 1 ? steps[currentIndex + 1] : null
  }
}))
