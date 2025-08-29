import { ProductionGuide, Beat, CharacterProfile } from '@/types/productionGuide';

export interface ProjectInitializationRequest {
  projectIdea: string;
  projectId: string;
  template?: string;
}

export interface ProjectInitializationResponse {
  success: boolean;
  project: Partial<ProductionGuide>;
  error?: string;
}

export class ProjectInitializationService {
  private static instance: ProjectInitializationService;

  private constructor() {}

  public static getInstance(): ProjectInitializationService {
    if (!ProjectInitializationService.instance) {
      ProjectInitializationService.instance = new ProjectInitializationService();
    }
    return ProjectInitializationService.instance;
  }

  /**
   * Initialize a new project with Cue AI-generated content
   */
  public async initializeProject(request: ProjectInitializationRequest): Promise<ProjectInitializationResponse> {
    try {
      // Call Cue AI to generate project content
      const cueResponse = await this.callCueAI(request);
      
      if (!cueResponse.success) {
        throw new Error(cueResponse.error || 'Failed to generate project content');
      }

      // Parse and structure the AI response
      const projectData = this.parseAIResponse(cueResponse.content, request);
      
      return {
        success: true,
        project: projectData
      };
    } catch (error) {
      console.error('Project initialization failed:', error);
      return {
        success: false,
        project: {},
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Call Cue AI to generate project content
   */
  private async callCueAI(request: ProjectInitializationRequest): Promise<{ success: boolean; content: string; error?: string }> {
    try {
      const response = await fetch('/api/cue/respond', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: `Create a new video project with the following idea: ${request.projectIdea}

Please generate comprehensive baseline content following the No Blank Canvas principle:

1. Film Treatment: Complete project overview with logline, synopsis, target audience, genre, tone, duration, story structure, and key themes
2. Character Breakdowns: 2-4 main characters with detailed profiles, motivations, conflicts, and character arcs
3. Interactive Beat Sheet: 6-8 story beats organized by acts, with timing, actions, and dialogue cues

Format the response as structured data that can be parsed into the project structure.`
            }
          ],
          context: {
            type: 'project-creation',
            projectId: request.projectId,
            template: request.template || 'debate-educational'
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Cue AI request failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        success: true,
        content: data.reply || data.content || data.message || ''
      };
    } catch (error) {
      console.error('Cue AI call failed:', error);
      return {
        success: false,
        content: '',
        error: error instanceof Error ? error.message : 'Failed to call Cue AI'
      };
    }
  }

  /**
   * Parse AI response into structured project data
   */
  private parseAIResponse(aiContent: string, request: ProjectInitializationRequest): Partial<ProductionGuide> {
    // For now, return a basic structure - in production, this would parse the AI response
    // and extract the specific sections (Film Treatment, Characters, Beat Sheet)
    
    return {
      projectId: request.projectId,
      title: this.extractTitle(aiContent) || 'Untitled Project',
      beatTemplate: request.template || 'debate-educational',
      viewMode: 'kanban',
      filmTreatment: this.extractFilmTreatment(aiContent),
      characters: this.extractCharacters(aiContent),
      beatSheet: this.extractBeatSheet(aiContent),
      boneyard: [],
      boneyardCollapsed: true
    };
  }

  private extractTitle(content: string): string {
    // Extract title from AI response
    const titleMatch = content.match(/Title[:\s]+([^\n]+)/i);
    return titleMatch ? titleMatch[1].trim() : 'Untitled Project';
  }

  private extractFilmTreatment(content: string): string {
    // Extract film treatment section
    const treatmentMatch = content.match(/Film Treatment[:\s]*([\s\S]*?)(?=Character Breakdowns|Interactive Beat Sheet|$)/i);
    return treatmentMatch ? treatmentMatch[1].trim() : '';
  }

  private extractCharacters(content: string): CharacterProfile[] {
    // Extract character breakdowns
    const charactersMatch = content.match(/Character Breakdowns[:\s]*([\s\S]*?)(?=Interactive Beat Sheet|$)/i);
    if (!charactersMatch) return [];

    // Parse character data - this is a simplified version
    // In production, you'd want more sophisticated parsing
    const characterText = charactersMatch[1];
    const characters: CharacterProfile[] = [];
    
    // Simple character extraction - look for character names and basic info
    const characterBlocks = characterText.split(/(?=^[A-Z][a-z]+[:\s])/m);
    
    characterBlocks.forEach((block, index) => {
      if (block.trim()) {
        const nameMatch = block.match(/^([A-Z][a-z]+)/);
        if (nameMatch) {
          characters.push({
            id: `char-${index + 1}`,
            name: nameMatch[1],
            archetype: 'Main Character',
            primaryMotivation: 'To be determined',
            internalConflict: 'To be determined',
            externalConflict: 'To be determined',
            arc: {
              act1: 'To be determined',
              act2: 'To be determined',
              act3: 'To be determined'
            }
          });
        }
      }
    });

    return characters;
  }

  private extractBeatSheet(content: string): Beat[] {
    // Extract beat sheet section
    const beatSheetMatch = content.match(/Interactive Beat Sheet[:\s]*([\s\S]*?)$/i);
    if (!beatSheetMatch) return [];

    // Parse beat data - simplified version
    const beatSheetText = beatSheetMatch[1];
    const beats: Beat[] = [];
    
    // Look for beat patterns in the text
    const beatBlocks = beatSheetText.split(/(?=^Beat \d+|^Act [IV]+|^Scene \d+)/m);
    
    beatBlocks.forEach((block, index) => {
      if (block.trim() && index > 0) {
        const titleMatch = block.match(/^[^:]+:\s*([^\n]+)/);
        if (titleMatch) {
          beats.push({
            id: `beat-${index}`,
            title: titleMatch[1].trim(),
            summary: block.substring(block.indexOf('\n')).trim().substring(0, 200) + '...',
            charactersPresent: [],
            structuralPurpose: 'To be determined',
            act: 'ACT_I',
            estimatedDuration: 2,
            startTime: index * 2,
            pacing: 'medium',
            importance: 'medium',
            beatFunction: 'setup',
            emotionalCharge: 'neutral',
            keywords: [],
            productionTags: {
              location: 'To be determined',
              locationType: 'INT',
              timeOfDay: 'DAY',
              mood: 'Neutral'
            }
          });
        }
      }
    });

    return beats;
  }
}

export default ProjectInitializationService;
