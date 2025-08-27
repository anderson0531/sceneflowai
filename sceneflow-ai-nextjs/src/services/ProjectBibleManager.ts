import { 
  ProjectBible, 
  Character, 
  Location, 
  Prop, 
  VisualStyle, 
  Theme,
  ConsistencyRule,
  STORY_STRUCTURE_TEMPLATES
} from '@/types/enhanced-project';

export class ProjectBibleManager {
  private static instance: ProjectBibleManager;
  private projectBibles: Map<string, ProjectBible> = new Map();

  private constructor() {}

  public static getInstance(): ProjectBibleManager {
    if (!ProjectBibleManager.instance) {
      ProjectBibleManager.instance = new ProjectBibleManager();
    }
    return ProjectBibleManager.instance;
  }

  /**
   * Create a new Project Bible
   */
  createProjectBible(
    projectId: string,
    title: string,
    storyStructure: 'linear' | 'three-act' | 'hero-journey' | 'save-the-cat' | 'custom'
  ): ProjectBible {
    const bible: ProjectBible = {
      id: `bible_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      projectId,
      title,
      version: '1.0.0',
      lastUpdated: new Date(),
      
      // Core Story Elements
      logline: '',
      synopsis: '',
      tagline: '',
      
      // Story Structure
      storyStructure,
      acts: [],
      currentChapter: '',
      
      // Characters
      characters: [],
      characterArcs: [],
      
      // World Building
      locations: [],
      props: [],
      visualStyles: [],
      themes: [],
      
      // Creative Guidelines
      visualGuidelines: {
        colorPalette: [],
        lightingPrinciples: [],
        compositionRules: [],
        visualEffects: [],
        referenceMaterials: [],
        styleGuide: ''
      },
      audioGuidelines: {
        musicPrinciples: [],
        soundEffectStyle: [],
        voiceGuidelines: [],
        audioTransitions: [],
        referenceAudio: []
      },
      toneGuidelines: {
        overallTone: '',
        emotionalRange: [],
        humorStyle: '',
        dramaticMoments: '',
        pacingGuidelines: '',
        audienceResponse: ''
      },
      
      // Production Notes
      productionNotes: [],
      references: [],
      inspirations: [],
      
      // Consistency Rules
      consistencyRules: [],
      namingConventions: [],
      
      // Version Control
      changelog: [],
      contributors: []
    };

    this.projectBibles.set(bible.id, bible);
    return bible;
  }

  /**
   * Get Project Bible by ID
   */
  getProjectBible(bibleId: string): ProjectBible | undefined {
    return this.projectBibles.get(bibleId);
  }

  /**
   * Get Project Bible by Project ID
   */
  getProjectBibleByProjectId(projectId: string): ProjectBible | undefined {
    return Array.from(this.projectBibles.values()).find(bible => bible.projectId === projectId);
  }

  /**
   * Update Project Bible
   */
  updateProjectBible(bibleId: string, updates: Partial<ProjectBible>): ProjectBible | undefined {
    const bible = this.projectBibles.get(bibleId);
    if (bible) {
      Object.assign(bible, updates, { lastUpdated: new Date() });
      this.projectBibles.set(bibleId, bible);
      return bible;
    }
    return undefined;
  }

  /**
   * Add Character to Project Bible
   */
  addCharacter(bibleId: string, character: Character): boolean {
    const bible = this.projectBibles.get(bibleId);
    if (bible) {
      bible.characters.push(character);
      bible.lastUpdated = new Date();
      return true;
    }
    return false;
  }

  /**
   * Add Location to Project Bible
   */
  addLocation(bibleId: string, location: Location): boolean {
    const bible = this.projectBibles.get(bibleId);
    if (bible) {
      bible.locations.push(location);
      bible.lastUpdated = new Date();
      return true;
    }
    return false;
  }

  /**
   * Add Consistency Rule
   */
  addConsistencyRule(bibleId: string, rule: ConsistencyRule): boolean {
    const bible = this.projectBibles.get(bibleId);
    if (bible) {
      bible.consistencyRules.push(rule);
      bible.lastUpdated = new Date();
      return true;
    }
    return false;
  }

  /**
   * Export Project Bible for reuse
   */
  exportProjectBible(bibleId: string): string {
    const bible = this.projectBibles.get(bibleId);
    if (bible) {
      return JSON.stringify(bible, null, 2);
    }
    return '';
  }

  /**
   * Import Project Bible from template
   */
  importProjectBible(projectId: string, bibleData: string): ProjectBible | null {
    try {
      const importedBible = JSON.parse(bibleData);
      const bible: ProjectBible = {
        ...importedBible,
        id: `bible_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        projectId,
        lastUpdated: new Date()
      };
      
      this.projectBibles.set(bible.id, bible);
      return bible;
    } catch (error) {
      console.error('Failed to import Project Bible:', error);
      return null;
    }
  }

  /**
   * Get Story Structure Template
   */
  getStoryStructureTemplate(structure: string): any {
    return STORY_STRUCTURE_TEMPLATES[structure as keyof typeof STORY_STRUCTURE_TEMPLATES];
  }

  /**
   * Validate Project Bible consistency
   */
  validateConsistency(bibleId: string): string[] {
    const bible = this.projectBibles.get(bibleId);
    if (!bible) return ['Project Bible not found'];

    const issues: string[] = [];

    // Check character consistency
    bible.characters.forEach(character => {
      if (!character.name || character.name.length < 2) {
        issues.push(`Character ${character.id} has invalid name`);
      }
    });

    // Check location consistency
    bible.locations.forEach(location => {
      if (!location.name || location.name.length < 2) {
        issues.push(`Location ${location.id} has invalid name`);
      }
    });

    // Check visual style consistency
    if (bible.visualStyles.length > 0) {
      const primaryStyle = bible.visualStyles[0];
      bible.visualStyles.slice(1).forEach(style => {
        if (style.colorScheme !== primaryStyle.colorScheme) {
          issues.push('Inconsistent color schemes across visual styles');
        }
      });
    }

    return issues;
  }
}
