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

const initialBYOKSettings: BYOKSettings = {
  llmProvider: {
    name: 'google-gemini',
    apiKey: '',
    isConfigured: false,
  },
  imageGenerationProvider: {
    name: 'google-gemini',
    apiKey: '',
    isConfigured: false,
  },
  videoGenerationProvider: {
    name: 'google-veo',
    apiKey: '',
    isConfigured: false,
  },
};

// Sample data for development
const sampleUser: User = {
  id: '1',
  email: 'demo@sceneflowai.com',
  name: 'Demo Creator',
  userType: 'content-creator',
  credits: 150,
  monthlyCredits: 100,
  subscriptionTier: 'pro',
  hasBYOK: true,
  projects: [],
  ideas: [],
  createdAt: new Date(),
  updatedAt: new Date(),
}

const sampleProjects: Project[] = [
  {
    id: '1',
    title: 'Product Launch Video',
    description: 'A compelling product showcase video for our new software launch',
    currentStep: 'ideation',
    progress: 25,
    status: 'in-progress',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-20'),
    completedSteps: [],
    metadata: {
      genre: 'commercial',
      duration: 60,
      targetAudience: 'business',
      style: 'modern'
    }
  },
  {
    id: '2',
    title: 'Educational Series',
    description: 'A series of educational videos explaining complex concepts',
    currentStep: 'storyboard',
    progress: 50,
    status: 'in-progress',
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-18'),
    completedSteps: ['ideation'],
    metadata: {
      genre: 'educational',
      duration: 120,
      targetAudience: 'students',
      style: 'friendly'
    }
  }
]

const workflowSteps: WorkflowStep[] = ['ideation', 'storyboard', 'scene-direction', 'video-generation'];

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      isAuthenticated: false,
      isLoading: false,
      
      currentProject: null,
      projects: [],
      
      currentStep: 'ideation',
      stepProgress: {
        'ideation': 0,
        'storyboard': 0,
        'scene-direction': 0,
        'video-generation': 0
      },
      
      byokSettings: initialBYOKSettings,
      
      sidebarOpen: false,
      theme: 'dark',
      cueAssistantOpen: false,
      
      // Cue Assistant state
      cueConversation: {
        messages: [],
        hasUnreadNotifications: false,
        lastProjectRatingChange: null,
      },
      
      // Actions
      setUser: (user) => set({ user, isAuthenticated: !!user }),
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
        stepProgress: { ...state.stepProgress, [step]: Math.min(100, Math.max(0, progress)) }
      })),
      advanceToNextStep: () => {
        const { currentStep, stepProgress } = get();
        const currentIndex = workflowSteps.indexOf(currentStep);
        const nextStep = workflowSteps[currentIndex + 1];
        
        if (nextStep && get().canAdvanceToStep(nextStep)) {
          set({ currentStep: nextStep });
        }
      },
      canAdvanceToStep: (step) => {
        const { stepProgress } = get();
        const stepIndex = workflowSteps.indexOf(step);
        
        // Can always go to ideation
        if (step === 'ideation') return true;
        
        // Check if previous step is completed
        const previousStep = workflowSteps[stepIndex - 1];
        if (previousStep) {
          return stepProgress[previousStep] >= 100;
        }
        
        return false;
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
          [provider]: {
            name: name as string,
            apiKey,
            isConfigured: !!apiKey
          }
        }
      })),
      
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setTheme: (theme) => set({ theme }),
      setCueAssistantOpen: (open) => set({ cueAssistantOpen: open }),
      
      // Cue Assistant actions
      addCueMessage: (message) => set((state) => ({
        cueConversation: {
          ...state.cueConversation,
          messages: [...state.cueConversation.messages, { 
            id: Date.now().toString(),
            ...message, 
            timestamp: new Date() 
          }]
        }
      })),
      clearCueConversation: () => set({ cueConversation: { messages: [], hasUnreadNotifications: false, lastProjectRatingChange: null } }),
      setCueNotification: (hasNotifications) => set({ cueConversation: { ...get().cueConversation, hasUnreadNotifications: hasNotifications } }),
      markNotificationsAsRead: () => set({ cueConversation: { ...get().cueConversation, hasUnreadNotifications: false } }),
      
      // Computed values
      getCurrentStepProgress: () => {
        const { currentStep, stepProgress } = get();
        return stepProgress[currentStep];
      },
      getOverallProgress: () => {
        const { stepProgress } = get();
        const totalProgress = Object.values(stepProgress).reduce((sum, progress) => sum + progress, 0);
        return Math.round(totalProgress / Object.keys(stepProgress).length);
      },
      getNextStep: () => {
        const { currentStep } = get();
        const currentIndex = workflowSteps.indexOf(currentStep);
        return workflowSteps[currentIndex + 1] || null;
      },
    }),
    {
      name: 'sceneflow-ai-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        projects: state.projects,
        currentStep: state.currentStep,
        stepProgress: state.stepProgress, // Used in WorkflowNavigator component
        byokSettings: state.byokSettings,
        theme: state.theme,
        cueConversation: state.cueConversation, // Add cueConversation to partialize
      }),
    }
  )
);
