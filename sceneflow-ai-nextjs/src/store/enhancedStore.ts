// Enhanced Zustand Store
// This store integrates with the AI adaptability framework and enhanced project structure

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { 
  EnhancedProject, 
  WorkflowStep, 
  AISuggestion,
  Act,
  Chapter,
  Scene,
  Character,
  Location,
  Prop
} from '@/types/enhanced-project';
import { 
  AIConfiguration, 
  UserPreference, 
  PromptInstruction,
  AICapability 
} from '@/types/ai-adaptability';
// Note: Avoid importing services here to keep type surface small for UI build
import { aiCapabilityManager } from '@/services/AICapabilityManager';
import { aiAgentManager } from '@/services/AIAgentManager';
import { intelligentWorkflowManager } from '@/services/IntelligentWorkflowManager';
import { aiAgentOrchestrator } from '@/services/AIAgentOrchestrator';

export interface EnhancedUser {
  id: string;
  email: string;
  name: string;
  userType: 'filmmaker' | 'content-creator' | 'business' | 'educator';
  credits: number;
  monthlyCredits: number;
  subscriptionTier: 'trial' | 'starter' | 'pro' | 'studio' | 'enterprise';
  hasBYOK: boolean;
  preferences: UserPreference[];
  createdAt: Date;
  updatedAt: Date;
}

// Storyboard Readiness Attributes Interface
export interface StoryboardReadinessAttributes {
  sr_beats?: { value: string; source: string };
  sr_actStructure?: { value: string; source: string };
  sr_runtime?: { value: string; source: string };
  sr_sceneCount?: { value: string; source: string };
  sr_characters?: { value: string; source: string };
  sr_locations?: { value: string; source: string };
  sr_visualStyle?: { value: string; source: string };
  sr_cinematography?: { value: string; source: string };
  sr_audio?: { value: string; source: string };
  sr_pacing?: { value: string; source: string };
  sr_platformDeliverables?: { value: string; source: string };
  sr_branding?: { value: string; source: string };
  sr_propsContinuity?: { value: string; source: string };
  sr_accessibility?: { value: string; source: string };
  sr_storyboardHints?: { value: string; source: string };
}

// Template Application State
export interface TemplateApplicationState {
  templateApplied: boolean;
  templateSource?: string;
  templateScenes?: any[];
  lastAppliedTemplate?: string;
}

export interface EnhancedAppState {
  // User state
  user: EnhancedUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Enhanced project state
  currentProject: EnhancedProject | null;
  projects: EnhancedProject[];
  
  // Workflow state
  currentStep: WorkflowStep;
  stepProgress: Record<WorkflowStep, number>;
  workflowSteps: WorkflowStep[];
  
  // AI state
  aiConfiguration: AIConfiguration;
  aiCapabilities: AICapability[];
  promptInstructions: PromptInstruction[];
  
  // Core Concept authoritative input
  coreConcept: {
    title?: string;
    premise?: string;
    targetAudience?: string;
    keyMessage?: string;
    tone?: string;
    genre?: string;
    duration?: number;
    visualMotifs?: string;
    platform?: string;
    completeness?: number;
  };
  
  // Storyboard Readiness Attributes - Eliminates Blank Canvas Paralysis
  storyboardReadiness: StoryboardReadinessAttributes;
  
  // Template Application State
  templateState: TemplateApplicationState;
  
  // Phase 2: AI Agents & Intelligent Workflow state
  aiAgents: {
    agents: any[];
    collaborations: any[];
    assignments: any[];
    performance: any[];
  };
  intelligentWorkflows: {
    workflows: any[];
    automationRules: any[];
    qualityThresholds: any[];
    analytics: any[];
  };
  orchestration: {
    activeWorkflows: any[];
    performanceMetrics: any[];
    taskQueue: any;
  };
  
  // BYOK settings (existing)
  byokSettings: {
    llmProvider: {
      name: 'google-gemini' | 'openai' | 'anthropic';
      apiKey: string;
      isConfigured: boolean;
    };
    imageGenerationProvider: {
      name: 'google-gemini' | 'openai' | 'anthropic';
      apiKey: string;
      isConfigured: boolean;
    };
    videoGenerationProvider: {
      name: 'google-veo' | 'openai' | 'anthropic';
      apiKey: string;
      isConfigured: boolean;
    };
  };
  
  // Theme and UI state
  theme: 'light' | 'dark';
  uiMode: 'guided' | 'advanced';
  
  // Template application state
  isTemplateApplied: boolean;
  
  // Sidebar state
  sidebarOpen: boolean;
  
  // Cue assistant state
  cueAssistantOpen: boolean;
  
  // Selected project for dashboard (persisted)
  selectedProjectId: string | null;
  
  // Cue conversation state
  cueConversation: {
    messages: any[];
    hasUnreadNotifications: boolean;
    lastProjectRatingChange: number | null;
  };
  
  // Actions
  setUser: (user: EnhancedUser | null) => void;
  setAuthenticated: (isAuthenticated: boolean) => void;
  setLoading: (isLoading: boolean) => void;
  setCurrentProject: (project: EnhancedProject | null) => void;
  addProject: (project: EnhancedProject) => void;
  updateProject: (projectId: string, updates: Partial<EnhancedProject>) => void;
  deleteProject: (projectId: string) => void;
  setCoreConcept: (concept: Partial<EnhancedAppState['coreConcept']>) => void;
  setStoryboardReadiness: (attributes: Partial<StoryboardReadinessAttributes>) => void;
  updateStoryboardReadiness: (updater: (prev: StoryboardReadinessAttributes) => StoryboardReadinessAttributes) => void;
  setTemplateApplied: (applied: boolean) => void;
  applyTemplate: (templatePath: string) => Promise<boolean>;
  setCurrentStep: (step: WorkflowStep) => void;
  updateStepProgress: (step: WorkflowStep, progress: number) => void;
  canAdvanceToStep: (step: WorkflowStep) => boolean;
  advanceToNextStep: () => void;
  resetStore: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setUIMode: (mode: 'guided' | 'advanced') => void;
  setAIConfiguration: (config: Partial<AIConfiguration>) => void;
  setAICapabilities: (capabilities: AICapability[]) => void;
  setPromptInstructions: (instructions: PromptInstruction[]) => void;
  setBYOKSettings: (settings: Partial<EnhancedAppState['byokSettings']>) => void;
  setCueConversation: (conversation: Partial<EnhancedAppState['cueConversation']>) => void;
  setSidebarOpen: (open: boolean) => void;
  setCueAssistantOpen: (open: boolean) => void;
  setSelectedProjectId: (id: string | null) => void;
}

const initialAIConfiguration: AIConfiguration = {
  defaultModel: 'gpt-4',
  fallbackModels: ['gpt-4o', 'gemini-3.0', 'claude-3.5-sonnet'],
  costLimits: {
    daily: 10.0,
    monthly: 100.0,
    perRequest: 1.0
  },
  qualityThresholds: {
    minimumRating: 3.0,
    minimumSuccessRate: 0.7
  },
  optimizationEnabled: true,
  learningEnabled: true,
  collaborationEnabled: true
};

const initialBYOKSettings = {
  llmProvider: {
    name: 'google-gemini' as const,
    apiKey: '',
    isConfigured: false,
  },
  imageGenerationProvider: {
    name: 'google-gemini' as const,
    apiKey: '',
    isConfigured: false,
  },
  videoGenerationProvider: {
    name: 'google-veo' as const,
    apiKey: '',
    isConfigured: false,
  },
};

const workflowSteps: WorkflowStep[] = ['ideation', 'storyboard', 'scene-direction', 'video-generation', 'review', 'optimization'];

export const useEnhancedStore = create<EnhancedAppState>()(
  persist(
    (set, get) => ({
      // Initialize state
      user: null,
      isAuthenticated: false,
      isLoading: false,
      
      // Enhanced project state
      currentProject: null,
      projects: [],
      
      // Workflow state
      currentStep: 'ideation',
      stepProgress: {
        ideation: 0,
        storyboard: 0,
        'scene-direction': 0,
        'video-generation': 0,
        review: 0,
        optimization: 0
      },
      workflowSteps: ['ideation', 'storyboard', 'scene-direction', 'video-generation', 'review', 'optimization'],
      
      // AI state
      aiConfiguration: initialAIConfiguration,
      aiCapabilities: [],
      promptInstructions: [],
      coreConcept: {},
      
      byokSettings: initialBYOKSettings,
      
      theme: 'dark',
      uiMode: 'guided',
      isTemplateApplied: false,
      
      // Sidebar and Cue assistant state
      sidebarOpen: true,
      cueAssistantOpen: false,
      
      // Selected project for dashboard
      selectedProjectId: null,
      
      cueConversation: {
        messages: [],
        hasUnreadNotifications: false,
        lastProjectRatingChange: null,
      },
      
      // Phase 2: AI Agents & Intelligent Workflow initial state
      aiAgents: {
        agents: [],
        collaborations: [],
        assignments: [],
        performance: []
      },
      intelligentWorkflows: {
        workflows: [],
        automationRules: [],
        qualityThresholds: [],
        analytics: []
      },
      orchestration: {
        activeWorkflows: [],
        performanceMetrics: [],
        taskQueue: {}
      },
      
      // Storyboard Readiness Attributes - Eliminates Blank Canvas Paralysis
      storyboardReadiness: {},
      
      // Template Application State
      templateState: {
        templateApplied: false,
        templateSource: undefined,
        templateScenes: undefined,
        lastAppliedTemplate: undefined
      },
      
      // Actions
      setUser: (user) => set({ user }),
      setAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
      setLoading: (isLoading) => set({ isLoading }),
      setCurrentProject: (project) => set({ currentProject: project }),
      addProject: (project) => set((state) => ({ 
        projects: [...state.projects, project] 
      })),
      updateProject: (projectId, updates) => set((state) => ({
        projects: state.projects.map(p => 
          p.id === projectId ? { ...p, ...updates } : p
        ),
        currentProject: state.currentProject?.id === projectId 
          ? { ...state.currentProject, ...updates }
          : state.currentProject
      })),
      deleteProject: (projectId) => set((state) => ({
        projects: state.projects.filter(p => p.id !== projectId),
        currentProject: state.currentProject?.id === projectId 
          ? null 
          : state.currentProject
      })),
      setCoreConcept: (concept) => set((state) => ({
        coreConcept: { ...state.coreConcept, ...concept }
      })),
      setStoryboardReadiness: (attributes) => set((state) => ({
        storyboardReadiness: { ...state.storyboardReadiness, ...attributes }
      })),
      updateStoryboardReadiness: (updater) => set((state) => ({
        storyboardReadiness: updater(state.storyboardReadiness)
      })),
      setTemplateApplied: (applied) => set({ isTemplateApplied: applied }),
      applyTemplate: async (templatePath) => {
        try {
          // Import the template service dynamically to avoid circular dependencies
          const { applyTemplateToProject } = await import('@/services/TemplateService')
          const success = await applyTemplateToProject(templatePath, (updater) => {
            set((state) => ({
              storyboardReadiness: updater(state.storyboardReadiness),
              templateState: {
                templateApplied: true,
                templateSource: templatePath,
                lastAppliedTemplate: templatePath
              }
            }))
          })
          return success
        } catch (error) {
          console.error('Error applying template:', error)
          return false
        }
      },

      // Workflow actions
      setCurrentStep: (step: WorkflowStep) => set({ currentStep: step }),
      
      updateStepProgress: (step: WorkflowStep, progress: number) => set((state) => ({
        stepProgress: {
          ...state.stepProgress,
          [step]: Math.max(0, Math.min(100, progress))
        }
      })),
      
      canAdvanceToStep: (step: WorkflowStep) => {
        const state = get();
        const stepIndex = state.workflowSteps.indexOf(step);
        
        // Can always go to ideation
        if (step === 'ideation') return true;
        
        // Check if previous step is completed
        const previousStep = state.workflowSteps[stepIndex - 1];
        if (previousStep) {
          return state.stepProgress[previousStep] >= 100;
        }
        
        return false;
      },
      
      advanceToNextStep: () => {
        const state = get();
        const currentIndex = state.workflowSteps.indexOf(state.currentStep);
        const nextStep = state.workflowSteps[currentIndex + 1];
        
        if (nextStep && state.canAdvanceToStep(nextStep)) {
          set({ currentStep: nextStep });
        }
      },
      resetStore: () => {
        set((state) => ({
          ...state,
          user: null,
          isAuthenticated: false,
          currentProject: null,
          projects: [],
          // Reset workflow state
          currentStep: 'ideation',
          stepProgress: {
            ideation: 0,
            storyboard: 0,
            'scene-direction': 0,
            'video-generation': 0,
            review: 0,
            optimization: 0
          },
          workflowSteps: ['ideation', 'storyboard', 'scene-direction', 'video-generation', 'review', 'optimization'],
          
          // Reset storyboard readiness
          storyboardReadiness: {},
          templateState: {
            templateApplied: false,
            templateSource: undefined,
            templateScenes: undefined,
            lastAppliedTemplate: undefined
          },
          aiConfiguration: {
            defaultModel: 'gpt-4',
            fallbackModels: ['gpt-3.5-turbo', 'claude-3-sonnet'],
            costLimits: {
              daily: 100,
              monthly: 1000,
              perRequest: 10
            },
            qualityThresholds: {
              minimumRating: 3.5,
              minimumSuccessRate: 0.8
            },
            optimizationEnabled: true,
            learningEnabled: true,
            collaborationEnabled: true
          },
          aiCapabilities: [],
          promptInstructions: [],
          aiAgents: {
            agents: [],
            collaborations: [],
            assignments: [],
            performance: []
          },
          intelligentWorkflows: {
            workflows: [],
            automationRules: [],
            qualityThresholds: [],
            analytics: []
          },
          orchestration: {
            activeWorkflows: [],
            performanceMetrics: [],
            taskQueue: {}
          },
          byokSettings: {
            llmProvider: {
              name: 'google-gemini' as const,
              apiKey: '',
              isConfigured: false
            },
            imageGenerationProvider: {
              name: 'google-gemini' as const,
              apiKey: '',
              isConfigured: false
            },
            videoGenerationProvider: {
              name: 'google-veo' as const,
              apiKey: '',
              isConfigured: false
            }
          },
          theme: 'dark',
          uiMode: 'guided',
          isTemplateApplied: false,
          sidebarOpen: true,
          cueAssistantOpen: false,
          cueConversation: {
            messages: [],
            hasUnreadNotifications: false,
            lastProjectRatingChange: null
          }
        }));
      },
      setTheme: (theme) => set({ theme }),
      setUIMode: (mode) => set({ uiMode: mode }),
      setAIConfiguration: (config) => set((state) => ({
        aiConfiguration: { ...state.aiConfiguration, ...config }
      })),
      setAICapabilities: (capabilities) => set({ aiCapabilities: capabilities }),
      setPromptInstructions: (instructions) => set({ promptInstructions: instructions }),
      setBYOKSettings: (settings) => set((state) => ({
        byokSettings: { ...state.byokSettings, ...settings }
      })),
      setCueConversation: (conversation) => set((state) => ({
        cueConversation: { ...state.cueConversation, ...conversation }
      })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setCueAssistantOpen: (open) => set({ cueAssistantOpen: open }),
      setSelectedProjectId: (id) => set({ selectedProjectId: id })
    }),
    {
      name: 'sceneflow-ai-enhanced-store',
      storage: createJSONStorage(() => localStorage),
              partialize: (state) => ({
          user: state.user,
          isAuthenticated: state.isAuthenticated,
          projects: state.projects,
          currentStep: state.currentStep,
          stepProgress: state.stepProgress,
          byokSettings: state.byokSettings,
          theme: state.theme,
          uiMode: state.uiMode,
          isTemplateApplied: state.isTemplateApplied,
          sidebarOpen: state.sidebarOpen,
          cueAssistantOpen: state.cueAssistantOpen,
          cueConversation: state.cueConversation,
          aiConfiguration: state.aiConfiguration,
          promptInstructions: state.promptInstructions,
          selectedProjectId: state.selectedProjectId
        }),
    }
  )
);
