// Enhanced Project Manager Service
// This service manages the hierarchical project structure with acts, chapters, and scenes

import { 
  EnhancedProject, 
  ProjectStructure, 
  Act, 
  Chapter, 
  Scene,
  GlobalElements,
  Character,
  Location,
  Prop,
  AISuggestion,
  WorkflowStep,
  EnhancedWorkflow
} from '@/types/enhanced-project';
import { ProjectContext } from '@/types/ai-adaptability';

export class EnhancedProjectManager {
  private static instance: EnhancedProjectManager;
  private projects: Map<string, EnhancedProject> = new Map();
  private projectTemplates: Map<string, Partial<EnhancedProject>> = new Map();

  private constructor() {
    this.initializeProjectTemplates();
  }

  public static getInstance(): EnhancedProjectManager {
    if (!EnhancedProjectManager.instance) {
      EnhancedProjectManager.instance = new EnhancedProjectManager();
    }
    return EnhancedProjectManager.instance;
  }

  /**
   * Create a new enhanced project
   */
  public async createProject(
    title: string,
    description: string,
    projectType: 'short' | 'medium' | 'long',
    storyStructure: 'linear' | 'three-act' | 'hero-journey' | 'save-the-cat' | 'custom',
    metadata: Partial<EnhancedProject['metadata']> = {}
  ): Promise<EnhancedProject> {
    try {
      const projectId = this.generateProjectId();
      
      // Create base project structure
      const project: EnhancedProject = {
        id: projectId,
        title,
        description,
        currentStep: 'ideation',
        progress: 0,
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date(),
        completedSteps: [],
        structure: this.createProjectStructure(projectType, storyStructure),
        metadata: this.createProjectMetadata(projectType, metadata),
        workflow: this.createEnhancedWorkflow(),
        collaboration: this.createCollaborationSettings(),
        aiAssistance: this.createAIAssistanceSettings()
      };

      // Store project
      this.projects.set(projectId, project);
      
      console.log(`Enhanced project created: ${projectId} - ${title}`);
      return project;
    } catch (error) {
      console.error('Failed to create enhanced project:', error);
      throw error;
    }
  }

  /**
   * Get project by ID
   */
  public getProject(projectId: string): EnhancedProject | undefined {
    return this.projects.get(projectId);
  }

  /**
   * Get all projects
   */
  public getAllProjects(): EnhancedProject[] {
    return Array.from(this.projects.values());
  }

  /**
   * Update project
   */
  public async updateProject(
    projectId: string,
    updates: Partial<EnhancedProject>
  ): Promise<EnhancedProject> {
    try {
      const project = this.projects.get(projectId);
      if (!project) {
        throw new Error(`Project not found: ${projectId}`);
      }

      // Update project
      const updatedProject: EnhancedProject = {
        ...project,
        ...updates,
        updatedAt: new Date()
      };

      // Update progress
      updatedProject.progress = this.calculateProjectProgress(updatedProject);

      // Store updated project
      this.projects.set(projectId, updatedProject);
      
      console.log(`Project updated: ${projectId}`);
      return updatedProject;
    } catch (error) {
      console.error('Failed to update project:', error);
      throw error;
    }
  }

  /**
   * Delete project
   */
  public async deleteProject(projectId: string): Promise<void> {
    try {
      const deleted = this.projects.delete(projectId);
      if (deleted) {
        console.log(`Project deleted: ${projectId}`);
      } else {
        throw new Error(`Project not found: ${projectId}`);
      }
    } catch (error) {
      console.error('Failed to delete project:', error);
      throw error;
    }
  }

  /**
   * Add act to project
   */
  public async addAct(
    projectId: string,
    act: Omit<Act, 'id' | 'order'>
  ): Promise<Act> {
    try {
      const project = this.projects.get(projectId);
      if (!project) {
        throw new Error(`Project not found: ${projectId}`);
      }

      const newAct: Act = {
        ...act,
        id: this.generateId(),
        order: project.structure.acts.length + 1,
        chapters: [],
        keyEvents: [],
        emotionalArc: {
          start: '',
          development: [],
          peak: '',
          resolution: '',
          overall: ''
        },
        status: 'planned',
        progress: 0,
        notes: [],
        aiSuggestions: []
      };

      project.structure.acts.push(newAct);
      project.updatedAt = new Date();
      
      console.log(`Act added to project ${projectId}: ${newAct.title}`);
      return newAct;
    } catch (error) {
      console.error('Failed to add act:', error);
      throw error;
    }
  }

  /**
   * Add chapter to act
   */
  public async addChapter(
    projectId: string,
    actId: string,
    chapter: Omit<Chapter, 'id' | 'order' | 'actId'>
  ): Promise<Chapter> {
    try {
      const project = this.projects.get(projectId);
      if (!project) {
        throw new Error(`Project not found: ${projectId}`);
      }

      const act = project.structure.acts.find(a => a.id === actId);
      if (!act) {
        throw new Error(`Act not found: ${actId}`);
      }

      const newChapter: Chapter = {
        ...chapter,
        id: this.generateId(),
        order: act.chapters.length + 1,
        actId,
        scenes: [],
        keyObjectives: [],
        transitions: [],
        status: 'planned',
        progress: 0,
        notes: [],
        aiSuggestions: []
      };

      act.chapters.push(newChapter);
      project.updatedAt = new Date();
      
      console.log(`Chapter added to act ${actId}: ${newChapter.title}`);
      return newChapter;
    } catch (error) {
      console.error('Failed to add chapter:', error);
      throw error;
    }
  }

  /**
   * Add scene to chapter
   */
  public async addScene(
    projectId: string,
    chapterId: string,
    scene: Omit<Scene, 'id' | 'order' | 'chapterId' | 'actId'>
  ): Promise<Scene> {
    try {
      const project = this.projects.get(projectId);
      if (!project) {
        throw new Error(`Project not found: ${projectId}`);
      }

      // Find chapter and act
      let targetChapter: Chapter | undefined;
      let targetAct: Act | undefined;

      for (const act of project.structure.acts) {
        const chapter = act.chapters.find(c => c.id === chapterId);
        if (chapter) {
          targetChapter = chapter;
          targetAct = act;
          break;
        }
      }

      if (!targetChapter || !targetAct) {
        throw new Error(`Chapter not found: ${chapterId}`);
      }

      const newScene: Scene = {
        ...scene,
        id: this.generateId(),
        order: targetChapter.scenes.length + 1,
        chapterId,
        actId: targetAct.id,
        characters: [],
        props: [],
        visualStyle: {
          overall: '',
          colorScheme: '',
          lighting: '',
          composition: '',
          movement: '',
          texture: '',
          references: [],
          aiGenerated: false
        },
        audioStyle: {
          music: '',
          soundEffects: [],
          ambient: '',
          dialogue: '',
          mixing: '',
          aiGenerated: false
        },
        cameraWork: {
          angles: [],
          movements: [],
          framing: '',
          transitions: [],
          aiGenerated: false
        },
        lighting: {
          type: '',
          intensity: '',
          color: '',
          direction: '',
          mood: '',
          aiGenerated: false
        },
        keyActions: [],
        dialogue: [],
        status: 'planned',
        progress: 0,
        notes: [],
        aiSuggestions: [],
        generatedContent: {
          storyboard: [],
          directions: [],
          prompts: [],
          variations: [],
          quality: {
            relevance: 0,
            creativity: 0,
            coherence: 0,
            originality: 0,
            technicalQuality: 0,
            overall: 0
          },
          metadata: {}
        }
      };

      targetChapter.scenes.push(newScene);
      project.updatedAt = new Date();
      
      console.log(`Scene added to chapter ${chapterId}: ${newScene.title}`);
      return newScene;
    } catch (error) {
      console.error('Failed to add scene:', error);
      throw error;
    }
  }

  /**
   * Add character to project
   */
  public async addCharacter(
    projectId: string,
    character: Omit<Character, 'id'>
  ): Promise<Character> {
    try {
      const project = this.projects.get(projectId);
      if (!project) {
        throw new Error(`Project not found: ${projectId}`);
      }

      const newCharacter: Character = {
        ...character,
        id: this.generateId(),
        arc: {
          start: '',
          development: [],
          end: '',
          growth: ''
        },
        relationships: [],
        visualReferences: [],
        aiGenerated: false
      };

      project.structure.globalElements.characters.push(newCharacter);
      project.updatedAt = new Date();
      
      console.log(`Character added to project ${projectId}: ${newCharacter.name}`);
      return newCharacter;
    } catch (error) {
      console.error('Failed to add character:', error);
      throw error;
    }
  }

  /**
   * Add location to project
   */
  public async addLocation(
    projectId: string,
    location: Omit<Location, 'id'>
  ): Promise<Location> {
    try {
      const project = this.projects.get(projectId);
      if (!project) {
        throw new Error(`Project not found: ${projectId}`);
      }

      const newLocation: Location = {
        ...location,
        id: this.generateId(),
        props: [],
        accessibility: [],
        restrictions: [],
        visualReferences: [],
        aiGenerated: false
      };

      project.structure.globalElements.locations.push(newLocation);
      project.updatedAt = new Date();
      
      console.log(`Location added to project ${projectId}: ${newLocation.name}`);
      return newLocation;
    } catch (error) {
      console.error('Failed to add location:', error);
      throw error;
    }
  }

  /**
   * Add prop to project
   */
  public async addProp(
    projectId: string,
    prop: Omit<Prop, 'id'>
  ): Promise<Prop> {
    try {
      const project = this.projects.get(projectId);
      if (!project) {
        throw new Error(`Project not found: ${projectId}`);
      }

      const newProp: Prop = {
        ...prop,
        id: this.generateId(),
        interactions: [],
        aiGenerated: false
      };

      project.structure.globalElements.props.push(newProp);
      project.updatedAt = new Date();
      
      console.log(`Prop added to project ${projectId}: ${newProp.name}`);
      return newProp;
    } catch (error) {
      console.error('Failed to add prop:', error);
      throw error;
    }
  }

  /**
   * Update project step
   */
  public async updateProjectStep(
    projectId: string,
    step: WorkflowStep,
    progress: number
  ): Promise<void> {
    try {
      const project = this.projects.get(projectId);
      if (!project) {
        throw new Error(`Project not found: ${projectId}`);
      }

      // Update step progress
      project.workflow.stepProgress[step] = Math.max(0, Math.min(100, progress));
      
      // Update current step if progress is 100%
      if (progress >= 100 && project.currentStep === step) {
        const nextStep = this.getNextStep(step);
        if (nextStep) {
          project.currentStep = nextStep;
          project.completedSteps.push(step);
        }
      }

      // Update overall progress
      project.progress = this.calculateProjectProgress(project);
      project.updatedAt = new Date();
      
      console.log(`Project ${projectId} step ${step} progress updated to ${progress}%`);
    } catch (error) {
      console.error('Failed to update project step:', error);
      throw error;
    }
  }

  /**
   * Add AI suggestion to project element
   */
  public async addAISuggestion(
    projectId: string,
    elementType: 'project' | 'act' | 'chapter' | 'scene' | 'character' | 'location' | 'prop',
    elementId: string,
    suggestion: Omit<AISuggestion, 'id' | 'timestamp' | 'accepted'>
  ): Promise<AISuggestion> {
    try {
      const project = this.projects.get(projectId);
      if (!project) {
        throw new Error(`Project not found: ${projectId}`);
      }

      const newSuggestion: AISuggestion = {
        ...suggestion,
        id: this.generateId(),
        timestamp: new Date(),
        accepted: false
      };

      // Add suggestion to appropriate element
      switch (elementType) {
        case 'project':
          project.workflow.aiAssistance.suggestions.push(newSuggestion);
          break;
        case 'act':
          const act = project.structure.acts.find(a => a.id === elementId);
          if (act) act.aiSuggestions.push(newSuggestion);
          break;
        case 'chapter':
          for (const act of project.structure.acts) {
            const chapter = act.chapters.find(c => c.id === elementId);
            if (chapter) {
              chapter.aiSuggestions.push(newSuggestion);
              break;
            }
          }
          break;
        case 'scene':
          for (const act of project.structure.acts) {
            for (const chapter of act.chapters) {
              const scene = chapter.scenes.find(s => s.id === elementId);
              if (scene) {
                scene.aiSuggestions.push(newSuggestion);
                return newSuggestion;
              }
            }
          }
          break;
        case 'character':
          const character = project.structure.globalElements.characters.find(c => c.id === elementId);
          if (character) character.aiSuggestions.push(newSuggestion);
          break;
        case 'location':
          const location = project.structure.globalElements.locations.find(l => l.id === elementId);
          if (location) location.aiSuggestions.push(newSuggestion);
          break;
        case 'prop':
          const prop = project.structure.globalElements.props.find(p => p.id === elementId);
          if (prop) prop.aiSuggestions.push(newSuggestion);
          break;
      }

      project.updatedAt = new Date();
      
      console.log(`AI suggestion added to ${elementType} ${elementId}`);
      return newSuggestion;
    } catch (error) {
      console.error('Failed to add AI suggestion:', error);
      throw error;
    }
  }

  /**
   * Get project context for AI operations
   */
  public getProjectContext(projectId: string): ProjectContext | null {
    try {
      const project = this.projects.get(projectId);
      if (!project) return null;

      return {
        projectId: project.id,
        projectType: project.structure.type,
        genre: project.metadata.genre,
        targetAudience: project.metadata.targetAudience,
        style: project.metadata.style,
        tone: project.metadata.tone,
        complexity: project.structure.complexity,
        budget: project.metadata.budget,
        timeline: project.metadata.timeline,
        teamSize: project.metadata.teamSize,
        previousResults: [], // This would be populated from AI learning data
        userPreferences: {
          userId: 'current-user', // This would come from auth context
          category: project.currentStep,
          preferredModels: [],
          preferredStyles: [],
          qualityThreshold: 80,
          costSensitivity: 5,
          speedPreference: 'balanced',
          lastUpdated: new Date()
        }
      };
    } catch (error) {
      console.error('Failed to get project context:', error);
      return null;
    }
  }

  /**
   * Create project structure based on type and story structure
   */
  private createProjectStructure(
    projectType: 'short' | 'medium' | 'long',
    storyStructure: 'linear' | 'three-act' | 'hero-journey' | 'save-the-cat' | 'custom'
  ): ProjectStructure {
    const structure: ProjectStructure = {
      type: projectType,
      storyStructure,
      acts: [],
      currentChapter: '',
      currentScene: '',
      globalElements: {
        characters: [],
        locations: [],
        props: [],
        visualStyle: {
          overall: '',
          colorScheme: '',
          lighting: '',
          composition: '',
          movement: '',
          texture: '',
          references: [],
          aiGenerated: false
        },
        tone: '',
        theme: '',
        colorPalette: {
          primary: [],
          secondary: [],
          accent: [],
          neutral: [],
          mood: {}
        },
        musicStyle: '',
        soundEffects: [],
        culturalContext: '',
        targetDemographics: []
      },
      storyArc: {
        setup: '',
        risingAction: [],
        climax: '',
        fallingAction: [],
        resolution: '',
        themes: [],
        messages: [],
        emotionalBeats: []
      },
      targetRuntime: this.getTargetRuntime(projectType),
      complexity: 'moderate',
      estimatedBudget: this.getEstimatedBudget(projectType),
      estimatedTimeline: this.getEstimatedTimeline(projectType)
    };

    // Initialize acts based on story structure
    if (storyStructure === 'three-act') {
      structure.acts = [
        this.createAct('Act 1: Setup', 1, 'Establish characters, world, and conflict'),
        this.createAct('Act 2: Confrontation', 2, 'Develop conflict and raise stakes'),
        this.createAct('Act 3: Resolution', 3, 'Climax and resolution')
      ];
    } else if (storyStructure === 'hero-journey') {
      structure.acts = [
        this.createAct('Ordinary World', 1, 'Introduce hero in normal life'),
        this.createAct('Call to Adventure', 2, 'Hero receives call to action'),
        this.createAct('Crossing Threshold', 3, 'Hero enters special world'),
        this.createAct('Tests and Allies', 4, 'Hero faces challenges and meets helpers'),
        this.createAct('Approach to Inmost Cave', 5, 'Hero approaches central conflict'),
        this.createAct('Ordeal', 6, 'Hero faces major crisis'),
        this.createAct('Reward', 7, 'Hero gains reward or knowledge'),
        this.createAct('Road Back', 8, 'Hero begins return journey'),
        this.createAct('Resurrection', 9, 'Final test and transformation'),
        this.createAct('Return with Elixir', 10, 'Hero returns changed')
      ];
    }

    return structure;
  }

  /**
   * Create project metadata
   */
  private createProjectMetadata(
    projectType: 'short' | 'medium' | 'long',
    customMetadata: Partial<EnhancedProject['metadata']> = {}
  ): EnhancedProject['metadata'] {
    return {
      genre: customMetadata.genre || 'general',
      duration: this.getTargetRuntime(projectType),
      targetAudience: customMetadata.targetAudience || 'general',
      style: customMetadata.style || 'modern',
      concept: customMetadata.concept || '',
      keyMessage: customMetadata.keyMessage || '',
      tone: customMetadata.tone || 'neutral',
      budget: customMetadata.budget || this.getEstimatedBudget(projectType),
      timeline: customMetadata.timeline || this.getEstimatedTimeline(projectType),
      teamSize: customMetadata.teamSize || 1,
      complexity: customMetadata.complexity || 'moderate',
      marketResearch: {
        targetDemographics: [],
        marketSize: '',
        trends: [],
        opportunities: [],
        challenges: []
      },
      competitiveAnalysis: {
        competitors: [],
        strengths: [],
        weaknesses: [],
        differentiators: [],
        marketPosition: ''
      },
      successMetrics: {
        engagement: [],
        conversion: [],
        brand: [],
        business: [],
        creative: []
      }
    };
  }

  /**
   * Create enhanced workflow
   */
  private createEnhancedWorkflow(): EnhancedWorkflow {
    return {
      currentStep: 'ideation',
      stepProgress: {
        'ideation': 0,
        'storyboard': 0,
        'scene-direction': 0,
        'video-generation': 0,
        'review': 0,
        'optimization': 0
      },
      stepHistory: [],
      nextSteps: [],
      blockers: [],
      aiAssistance: {
        enabled: true,
        level: 'moderate',
        categories: {
          ideation: true,
          storyboard: true,
          direction: true,
          generation: true,
          review: true,
          optimization: true
        },
        learning: true,
        personalization: true,
        collaboration: true,
        suggestions: [],
        automation: [],
        qualityChecks: [],
        optimization: []
      }
    };
  }

  /**
   * Create collaboration settings
   */
  private createCollaborationSettings() {
    return {
      enabled: false,
      teamMembers: [],
      permissions: [],
      communication: {
        channels: [],
        notifications: {
          email: true,
          push: false,
          inApp: true,
          frequency: 'immediate'
        },
        meetings: {
          frequency: 'weekly',
          duration: 60,
          participants: [],
          agenda: []
        }
      },
      versionControl: {
        enabled: true,
        autoSave: true,
        saveInterval: 5,
        maxVersions: 50,
        branching: false
      }
    };
  }

  /**
   * Create AI assistance settings
   */
  private createAIAssistanceSettings() {
    return {
      enabled: true,
      level: 'moderate',
      categories: {
        ideation: true,
        storyboard: true,
        direction: true,
        generation: true,
        review: true,
        optimization: true
      },
      learning: true,
      personalization: true,
      collaboration: true
    };
  }

  /**
   * Create act
   */
  private createAct(title: string, order: number, summary: string): Act {
    return {
      id: this.generateId(),
      title,
      order,
      chapters: [],
      summary,
      targetDuration: 0,
      keyEvents: [],
      emotionalArc: {
        start: '',
        development: [],
        peak: '',
        resolution: '',
        overall: ''
      },
      status: 'planned',
      progress: 0,
      notes: [],
      aiSuggestions: []
    };
  }

  /**
   * Get target runtime based on project type
   */
  private getTargetRuntime(projectType: 'short' | 'medium' | 'long'): number {
    switch (projectType) {
      case 'short': return 1; // 1 minute
      case 'medium': return 5; // 5 minutes
      case 'long': return 30; // 30 minutes
      default: return 5;
    }
  }

  /**
   * Get estimated budget based on project type
   */
  private getEstimatedBudget(projectType: 'short' | 'medium' | 'long'): number {
    switch (projectType) {
      case 'short': return 1000;
      case 'medium': return 5000;
      case 'long': return 25000;
      default: return 5000;
    }
  }

  /**
   * Get estimated timeline based on project type
   */
  private getEstimatedTimeline(projectType: 'short' | 'medium' | 'long'): number {
    switch (projectType) {
      case 'short': return 7; // 1 week
      case 'medium': return 21; // 3 weeks
      case 'long': return 90; // 3 months
      default: return 21;
    }
  }

  /**
   * Calculate project progress
   */
  private calculateProjectProgress(project: EnhancedProject): number {
    const stepProgress = project.workflow.stepProgress;
    const totalProgress = Object.values(stepProgress).reduce((sum, progress) => sum + progress, 0);
    return Math.round(totalProgress / Object.keys(stepProgress).length);
  }

  /**
   * Get next workflow step
   */
  private getNextStep(currentStep: WorkflowStep): WorkflowStep | null {
    const steps: WorkflowStep[] = ['ideation', 'storyboard', 'scene-direction', 'video-generation', 'review', 'optimization'];
    const currentIndex = steps.indexOf(currentStep);
    return steps[currentIndex + 1] || null;
  }

  /**
   * Generate unique project ID
   */
  private generateProjectId(): string {
    return `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Initialize project templates
   */
  private initializeProjectTemplates(): void {
    // This would load predefined project templates
    // For now, just log initialization
    console.log('Project templates initialized');
  }
}

// Export singleton instance
export const enhancedProjectManager = EnhancedProjectManager.getInstance();
