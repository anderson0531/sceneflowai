import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { 
  SceneFlowProject, 
  ModuleId, 
  ModuleProgress,
  ProjectTemplate 
} from '@/types/SceneFlowCore'

interface SceneFlowState {
  // Current Project
  currentProject: SceneFlowProject | null
  
  // Project History
  projectHistory: SceneFlowProject[]
  
  // Active Module
  activeModule: ModuleId
  
  // Module Progress
  moduleProgress: Record<ModuleId, number>
  
  // Project Templates
  projectTemplates: ProjectTemplate[]
  
  // UI State
  sidebarCollapsed: boolean
  showProjectSelector: boolean
  
  // Actions
  setCurrentProject: (project: SceneFlowProject) => void
  updateProject: (updates: Partial<SceneFlowProject>) => void
  setActiveModule: (module: ModuleId) => void
  updateModuleProgress: (module: ModuleId, progress: number) => void
  createNewProject: (template?: ProjectTemplate) => void
  loadProject: (projectId: string) => void
  saveProject: () => void
  deleteProject: (projectId: string) => void
  duplicateProject: (projectId: string) => void
  exportProject: () => void
  
  // Module-specific actions
  updateCoreConcept: (concept: Partial<SceneFlowProject['coreConcept']>) => void
  updateNarrativeBlueprint: (blueprint: Partial<SceneFlowProject['narrativeBlueprint']>) => void
  updateStyleGuide: (styleGuide: Partial<SceneFlowProject['styleGuide']>) => void
  updateProductionPackage: (package: Partial<SceneFlowProject['productionPackage']>) => void
  updateGenerationQueue: (queue: any) => void
  updateDigitalDailies: (dailies: any) => void
  updateTimelineProject: (timeline: any) => void
  
  // UI Actions
  toggleSidebar: () => void
  setShowProjectSelector: (show: boolean) => void
  
  // Utility Actions
  resetProject: () => void
  validateProject: () => { isValid: boolean; errors: string[] }
  getProjectSummary: () => any
}

export const useSceneFlowStore = create<SceneFlowState>()(
  persist(
    (set, get) => ({
      currentProject: null,
      projectHistory: [],
      activeModule: 'ideation',
      moduleProgress: {
        ideation: 0,
        'story-structure': 0,
        'vision-board': 0,
        direction: 0,
        'screening-room': 0,
        'quality-control': 0
      },
      projectTemplates: [
        {
          id: 'short-film',
          name: 'Short Film',
          description: 'Create a compelling short film (5-15 minutes)',
          category: 'short-film',
          estimatedDuration: 10,
          complexity: 'intermediate',
          tags: ['narrative', 'cinematic', 'storytelling']
        },
        {
          id: 'commercial',
          name: 'Commercial',
          description: 'Produce an engaging commercial or advertisement',
          category: 'commercial',
          estimatedDuration: 30,
          complexity: 'beginner',
          tags: ['marketing', 'brand', 'persuasive']
        },
        {
          id: 'documentary',
          name: 'Documentary',
          description: 'Tell a real story with documentary style',
          category: 'documentary',
          estimatedDuration: 5,
          complexity: 'intermediate',
          tags: ['educational', 'informative', 'real']
        },
        {
          id: 'music-video',
          name: 'Music Video',
          description: 'Create a visual story for music',
          category: 'music-video',
          estimatedDuration: 4,
          complexity: 'beginner',
          tags: ['musical', 'creative', 'artistic']
        },
        {
          id: 'social-media',
          name: 'Social Media',
          description: 'Quick content for social platforms',
          category: 'social-media',
          estimatedDuration: 1,
          complexity: 'beginner',
          tags: ['short', 'engaging', 'viral']
        }
      ],
      sidebarCollapsed: false,
      showProjectSelector: false,
      
      setCurrentProject: (project) => set({ currentProject: project }),
      
      updateProject: (updates) => {
        const current = get().currentProject
        if (current) {
          set({
            currentProject: {
              ...current,
              ...updates,
              metadata: {
                ...current.metadata,
                updatedAt: new Date()
              }
            }
          })
        }
      },
      
      setActiveModule: (module) => set({ activeModule: module }),
      
      updateModuleProgress: (module, progress) => {
        set((state) => ({
          moduleProgress: {
            ...state.moduleProgress,
            [module]: Math.max(0, Math.min(100, progress))
          }
        }))
        
        // Also update the project's progress
        const current = get().currentProject
        if (current) {
          const progressKey = module === 'story-structure' ? 'storyStructure' : 
                             module === 'vision-board' ? 'visionBoard' : 
                             module === 'screening-room' ? 'videoGeneration' : 
                             module === 'quality-control' ? 'qualityControl' : module
          
          set({
            currentProject: {
              ...current,
              progress: {
                ...current.progress,
                [progressKey]: Math.max(0, Math.min(100, progress))
              }
            }
          })
        }
      },
      
      createNewProject: (template) => {
        const newProject: SceneFlowProject = {
          id: `project-${Date.now()}`,
          title: template ? `${template.name} Project` : 'Untitled Project',
          status: 'draft',
          coreConcept: {
            workingTitle: '',
            corePremise: '',
            thematicKeywords: [],
            genre: template?.category || '',
            targetAudience: '',
            tone: '',
            estimatedDuration: template?.estimatedDuration || 5,
            keyMessage: ''
          },
          narrativeBlueprint: {
            selectedStructure: '',
            acts: [],
            characterArcs: [],
            plotBeats: [],
            status: 'draft'
          },
          styleGuide: {
            visualReferences: [],
            artDirectionKeywords: [],
            cinematographyStyle: {
              lighting: 'naturalistic',
              colorPalette: 'muted-desaturated',
              overallMood: 'neutral'
            },
            characterDNA: {}
          },
          productionPackage: {
            shootingScript: null,
            shotList: null,
            breakdownReport: null,
            status: 'draft'
          },
          generationQueue: null,
          digitalDailies: null,
          timelineProject: null,
          finalExport: null,
          metadata: {
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: 'user',
            version: '1.0.0',
            totalRuntime: 0
          },
          progress: {
            ideation: 0,
            storyStructure: 0,
            visionBoard: 0,
            direction: 0,
            videoGeneration: 0,
            qualityControl: 0
          }
        }
        
        set({ 
          currentProject: newProject,
          activeModule: 'ideation',
          moduleProgress: {
            ideation: 0,
            'story-structure': 0,
            'vision-board': 0,
            direction: 0,
            'screening-room': 0,
            'quality-control': 0
          }
        })
      },
      
      loadProject: (projectId) => {
        const project = get().projectHistory.find(p => p.id === projectId)
        if (project) {
          set({ currentProject: project })
          
          // Set active module based on progress
          const { progress } = project
          if (progress.qualityControl === 100) {
            set({ activeModule: 'quality-control' })
          } else if (progress.videoGeneration === 100) {
            set({ activeModule: 'screening-room' })
          } else if (progress.direction === 100) {
            set({ activeModule: 'direction' })
          } else if (progress.visionBoard === 100) {
            set({ activeModule: 'vision-board' })
          } else if (progress.storyStructure === 100) {
            set({ activeModule: 'story-structure' })
          } else {
            set({ activeModule: 'ideation' })
          }
        }
      },
      
      saveProject: () => {
        const current = get().currentProject
        if (current) {
          set((state) => ({
            projectHistory: [
              ...state.projectHistory.filter(p => p.id !== current.id),
              current
            ]
          }))
        }
      },
      
      deleteProject: (projectId) => {
        set((state) => ({
          projectHistory: state.projectHistory.filter(p => p.id !== projectId)
        }))
        
        // If deleting current project, clear it
        const current = get().currentProject
        if (current?.id === projectId) {
          set({ currentProject: null })
        }
      },
      
      duplicateProject: (projectId) => {
        const project = get().projectHistory.find(p => p.id === projectId)
        if (project) {
          const duplicated = {
            ...project,
            id: `project-${Date.now()}`,
            title: `${project.title} (Copy)`,
            status: 'draft' as const,
            metadata: {
              ...project.metadata,
              createdAt: new Date(),
              updatedAt: new Date()
            }
          }
          
          set((state) => ({
            projectHistory: [...state.projectHistory, duplicated],
            currentProject: duplicated
          }))
        }
      },
      
      exportProject: () => {
        const current = get().currentProject
        if (current) {
          // Implementation for project export
          console.log('Exporting project:', current)
          
          // Create downloadable JSON
          const dataStr = JSON.stringify(current, null, 2)
          const dataBlob = new Blob([dataStr], { type: 'application/json' })
          const url = URL.createObjectURL(dataBlob)
          const link = document.createElement('a')
          link.href = url
          link.download = `${current.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`
          link.click()
          URL.revokeObjectURL(url)
        }
      },
      
      // Module-specific update methods
      updateCoreConcept: (concept) => {
        const current = get().currentProject
        if (current) {
          set({
            currentProject: {
              ...current,
              coreConcept: { ...current.coreConcept, ...concept },
              metadata: { ...current.metadata, updatedAt: new Date() }
            }
          })
        }
      },
      
      updateNarrativeBlueprint: (blueprint) => {
        const current = get().currentProject
        if (current) {
          set({
            currentProject: {
              ...current,
              narrativeBlueprint: { ...current.narrativeBlueprint, ...blueprint },
              metadata: { ...current.metadata, updatedAt: new Date() }
            }
          })
        }
      },
      
      updateStyleGuide: (styleGuide) => {
        const current = get().currentProject
        if (current) {
          set({
            currentProject: {
              ...current,
              styleGuide: { ...current.styleGuide, ...styleGuide },
              metadata: { ...current.metadata, updatedAt: new Date() }
            }
          })
        }
      },
      
      updateProductionPackage: (package) => {
        const current = get().currentProject
        if (current) {
          set({
            currentProject: {
              ...current,
              productionPackage: { ...current.productionPackage, ...package },
              metadata: { ...current.metadata, updatedAt: new Date() }
            }
          })
        }
      },
      
      updateGenerationQueue: (queue) => {
        const current = get().currentProject
        if (current) {
          set({
            currentProject: {
              ...current,
              generationQueue: queue,
              metadata: { ...current.metadata, updatedAt: new Date() }
            }
          })
        }
      },
      
      updateDigitalDailies: (dailies) => {
        const current = get().currentProject
        if (current) {
          set({
            currentProject: {
              ...current,
              digitalDailies: dailies,
              metadata: { ...current.metadata, updatedAt: new Date() }
            }
          })
        }
      },
      
      updateTimelineProject: (timeline) => {
        const current = get().currentProject
        if (current) {
          set({
            currentProject: {
              ...current,
              timelineProject: timeline,
              metadata: { ...current.metadata, updatedAt: new Date() }
            }
          })
        }
      },
      
      // UI Actions
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setShowProjectSelector: (show) => set({ showProjectSelector: show }),
      
      // Utility Actions
      resetProject: () => {
        const current = get().currentProject
        if (current) {
          const reset = {
            ...current,
            status: 'draft' as const,
            progress: {
              ideation: 0,
              storyStructure: 0,
              visionBoard: 0,
              direction: 0,
              videoGeneration: 0,
              qualityControl: 0
            },
            metadata: {
              ...current.metadata,
              updatedAt: new Date()
            }
          }
          set({ currentProject: reset })
        }
      },
      
      validateProject: () => {
        const current = get().currentProject
        if (!current) {
          return { isValid: false, errors: ['No project loaded'] }
        }
        
        const errors: string[] = []
        
        // Validate core concept
        if (!current.coreConcept.corePremise.trim()) {
          errors.push('Core premise is required')
        }
        if (!current.coreConcept.genre.trim()) {
          errors.push('Genre is required')
        }
        if (!current.coreConcept.targetAudience.trim()) {
          errors.push('Target audience is required')
        }
        
        // Validate narrative blueprint
        if (current.progress.storyStructure > 0 && !current.narrativeBlueprint.selectedStructure) {
          errors.push('Narrative structure must be selected')
        }
        
        // Validate style guide
        if (current.progress.visionBoard > 0 && current.styleGuide.artDirectionKeywords.length === 0) {
          errors.push('Art direction keywords are required')
        }
        
        return {
          isValid: errors.length === 0,
          errors
        }
      },
      
      getProjectSummary: () => {
        const current = get().currentProject
        if (!current) return null
        
        return {
          id: current.id,
          title: current.title,
          status: current.status,
          progress: current.progress,
          estimatedDuration: current.coreConcept.estimatedDuration,
          genre: current.coreConcept.genre,
          createdAt: current.metadata.createdAt,
          lastUpdated: current.metadata.updatedAt
        }
      }
    }),
    {
      name: 'sceneflow-storage',
      partialize: (state) => ({
        currentProject: state.currentProject,
        projectHistory: state.projectHistory,
        moduleProgress: state.moduleProgress
      })
    }
  )
)





