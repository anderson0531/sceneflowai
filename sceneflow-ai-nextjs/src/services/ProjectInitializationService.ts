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
      // Determine the best template if none selected
      const template = request.template || this.selectBestTemplate(request.projectIdea)
      
      const response = await fetch('/api/cue/respond', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: `You are creating a COMPLETE video project. You MUST return ONLY valid JSON with no additional text, explanations, or markdown formatting. Your response must be parseable by JSON.parse() without any preprocessing.`
            },
            {
              role: 'user',
              content: `Create a COMPLETE video project following the No Blank Canvas principle. Use the ${template} template structure.

PROJECT IDEA: ${request.projectIdea}

CRITICAL: You must return ONLY valid JSON. No markdown, no explanations, no additional text. Start with { and end with }. The response must be parseable by JSON.parse().

Use this exact structure:

{
  "title": "Project Title",
  "filmTreatment": {
    "title": "Project Title",
    "logline": "One sentence summary",
    "synopsis": "2-3 paragraph detailed synopsis",
    "targetAudience": "Specific audience description",
    "genre": "Genre and tone description",
    "duration": "Estimated duration",
    "themes": "Key themes and messages",
    "structure": "Story structure overview"
  },
  "characters": [
    {
      "name": "Character Name",
      "archetype": "Character archetype",
      "motivation": "Main motivation",
      "internalConflict": "Internal struggle",
      "externalConflict": "External obstacles",
      "arc": {
        "act1": "Act I development",
        "act2": "Act II development", 
        "act3": "Act III development"
      }
    }
  ],
  "beatSheet": [
    {
      "title": "Beat Title",
      "summary": "Detailed beat description",
      "act": "1",
      "estimatedDuration": 3,
      "pacing": "medium",
      "importance": "high",
      "structuralPurpose": "Purpose in story",
      "emotionalCharge": "emotional tone",
      "charactersPresent": ["character names"],
      "productionTags": {
        "location": "Scene location",
        "mood": "Scene mood"
      }
    }
  ]
}

Generate comprehensive baseline content that is production-ready and follows professional storytelling standards. Remember: ONLY JSON output, no other text.`
            }
          ],
          context: {
            type: 'project-creation',
            projectId: request.projectId,
            template: template
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Cue AI request failed: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('🔍 ProjectInitializationService: Raw API response:', data);
      
      const content = data.reply || data.content || data.message || '';
      console.log('🔍 ProjectInitializationService: Extracted content:', content);
      
      // Try to parse the content as JSON to validate it
      try {
        const parsedContent = JSON.parse(content);
        console.log('✅ ProjectInitializationService: Content is valid JSON:', parsedContent);
      } catch (parseError) {
        console.error('❌ ProjectInitializationService: Content is not valid JSON:', parseError);
        console.log('❌ Raw content that failed to parse:', content);
      }
      
      return {
        success: true,
        content: content
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
   * Select the best template based on project idea content
   */
  private selectBestTemplate(projectIdea: string): string {
    const idea = projectIdea.toLowerCase()
    
    // Check for specific indicators
    if (idea.includes('debate') || idea.includes('argument') || idea.includes('perspective') || idea.includes('educational')) {
      return 'debate-educational'
    }
    
    if (idea.includes('documentary') || idea.includes('investigation') || idea.includes('real') || idea.includes('fact')) {
      return 'documentary'
    }
    
    if (idea.includes('hero') || idea.includes('journey') || idea.includes('quest') || idea.includes('adventure')) {
      return 'hero-journey'
    }
    
    if (idea.includes('save') || idea.includes('cat') || idea.includes('screenplay') || idea.includes('movie')) {
      return 'save-cat'
    }
    
    if (idea.includes('act') || idea.includes('drama') || idea.includes('theater') || idea.includes('classical')) {
      return 'five-act'
    }
    
    // Default to 3-act structure for most narrative content
    return 'three-act'
  }

  /**
   * Parse AI response into structured project data
   */
  private parseAIResponse(aiContent: string, request: ProjectInitializationRequest): Partial<ProductionGuide> {
    // Parsing AI response
    
    try {
      // First, try to parse as JSON if the AI returned structured data
      let parsedData: any = null;
      try {
        // Look for JSON-like content in the response
        const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedData = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        // No valid JSON found, parsing as text
      }

      if (parsedData) {
        // Parse structured JSON response
        return this.parseStructuredResponse(parsedData, request);
      } else {
        // Parse text-based response
        return this.parseTextResponse(aiContent, request);
      }
    } catch (error) {
      console.error('Error parsing AI response:', error);
      // Return basic structure as fallback
      return {
        projectId: request.projectId,
        title: this.extractTitle(aiContent) || 'Untitled Project',
        beatTemplate: request.template || 'three-act',
        viewMode: 'kanban',
        filmTreatment: this.extractFilmTreatment(aiContent),
        characters: this.extractCharacters(aiContent),
        beatSheet: this.extractBeatSheet(aiContent),
        boneyard: [],
        boneyardCollapsed: true
      };
    }
  }

  /**
   * Parse structured JSON response from AI
   */
  private parseStructuredResponse(data: any, request: ProjectInitializationRequest): Partial<ProductionGuide> {
    // Parsing structured response
    
    const project: Partial<ProductionGuide> = {
      projectId: request.projectId,
      title: data.title || data.name || 'Untitled Project',
      beatTemplate: request.template || 'three-act',
      viewMode: 'kanban',
      boneyard: [],
      boneyardCollapsed: true
    };

    // Parse Film Treatment - handle multiple possible formats and extract individual fields
    if (data.filmTreatment) {
      // Extract individual treatment fields and update title if needed
      if (data.filmTreatment.title && !project.title) {
        project.title = data.filmTreatment.title;
      }
      // Format the treatment with all the individual fields
      project.filmTreatment = this.formatFilmTreatmentWithFields(data.filmTreatment);
    } else if (data.treatment) {
      // Extract individual treatment fields and update title if needed
      if (data.treatment.title && !project.title) {
        project.title = data.treatment.title;
      }
      // Format the treatment with all the individual fields
      project.filmTreatment = this.formatFilmTreatmentWithFields(data.treatment);
    } else if (data.film_treatment) {
      // Extract individual treatment fields and update title if needed
      if (data.film_treatment.title && !project.title) {
        project.title = data.film_treatment.title;
      }
      // Format the treatment with all the individual fields
      project.filmTreatment = this.formatFilmTreatmentWithFields(data.film_treatment);
    } else if (data.content) {
      project.filmTreatment = this.formatFilmTreatment(data.content);
    }

    // Also check for top-level treatment fields and update title if needed
    if (data.logline && !project.title) {
      // If we have a logline but no title, use a truncated version as title
      project.title = data.logline.substring(0, 50) + (data.logline.length > 50 ? '...' : '');
    }
    if (data.synopsis && !project.title) {
      // If we have a synopsis but no title, use a truncated version as title
      project.title = data.synopsis.substring(0, 50) + (data.synopsis.length > 50 ? '...' : '');
    }

    // Parse Characters - handle multiple possible formats
    if (data.characters && Array.isArray(data.characters)) {
      project.characters = data.characters.map((char: any, index: number) => ({
        id: char.id || `char-${index + 1}`,
        name: char.name || 'Unknown Character',
        archetype: char.archetype || char.role || 'Main Character',
        motivation: char.motivation || char.primaryMotivation || 'To be determined',
        internalConflict: char.internalConflict || char.conflict || 'To be determined',
        externalConflict: char.externalConflict || 'To be determined',
        arc: {
          act1: char.arc?.act1 || char.arc?.actI || 'To be determined',
          act2: char.arc?.act2 || char.arc?.actII || 'To be determined',
          act3: char.arc?.act3 || char.arc?.actIII || 'To be determined'
        }
      }));
    }

    // Parse Beat Sheet - handle multiple possible formats
    if (data.beatSheet && Array.isArray(data.beatSheet)) {
      project.beatSheet = data.beatSheet.map((beat: any, index: number) => ({
        id: beat.id || `beat-${index + 1}`,
        title: beat.title || beat.name || `Beat ${index + 1}`,
        summary: beat.summary || beat.description || beat.content || 'To be determined',
        charactersPresent: beat.charactersPresent || beat.characters || [],
        structuralPurpose: beat.structuralPurpose || beat.purpose || 'To be determined',
        act: this.mapActString(beat.act) || 'ACT_I',
        estimatedDuration: beat.estimatedDuration || beat.duration || 2,
        startTime: beat.startTime || index * 2,
        pacing: beat.pacing || 'medium',
        importance: beat.importance || 'medium',
        beatFunction: beat.beatFunction || 'setup',
        emotionalCharge: beat.emotionalCharge || beat.emotionalImpact || 'neutral',
        keywords: beat.keywords || [],
        productionTags: {
          location: beat.productionTags?.location || beat.location || 'To be determined',
          locationType: beat.productionTags?.locationType || 'INT',
          timeOfDay: beat.productionTags?.timeOfDay || 'DAY',
          mood: beat.productionTags?.mood || beat.mood || 'Neutral'
        }
      }));
    }

    // Final parsed project
    return project;
  }

  /**
   * Parse text-based response from AI
   */
  private parseTextResponse(content: string, request: ProjectInitializationRequest): Partial<ProductionGuide> {
    // Parsing text response
    
    // Try to extract structured content from text
    const extractedData = this.extractStructuredContentFromText(content);
    
    return {
      projectId: request.projectId,
      title: extractedData.title || this.extractTitle(content) || 'Untitled Project',
      beatTemplate: request.template || 'three-act',
      viewMode: 'kanban',
      filmTreatment: extractedData.filmTreatment || this.extractFilmTreatment(content),
      characters: extractedData.characters || this.extractCharacters(content),
      beatSheet: extractedData.beatSheet || this.extractBeatSheet(content),
      boneyard: [],
      boneyardCollapsed: true
    };
  }

  /**
   * Extract structured content from text-based AI response
   */
  private extractStructuredContentFromText(content: string): {
    title?: string;
    filmTreatment?: string;
    characters?: CharacterProfile[];
    beatSheet?: Beat[];
  } {
    // Extracting structured content from text
    
    const result: any = {};
    
    // Extract title
    const titleMatch = content.match(/(?:Title|Project):\s*([^\n]+)/i);
    if (titleMatch) {
      result.title = titleMatch[1].trim();
    }
    
    // Extract film treatment sections
    const treatmentSections = [
      'Film Treatment',
      'Treatment',
      'Story Overview',
      'Project Overview'
    ];
    
    for (const section of treatmentSections) {
      const match = content.match(new RegExp(`${section}[\\s\\S]*?(?=${treatmentSections.join('|')}|Character|Beat|$)`, 'i'));
      if (match) {
        result.filmTreatment = match[0].trim();
        break;
      }
    }
    
    // Extract character information
    const characterMatch = content.match(/Character[\s\S]*?(?=Beat|Interactive|$)/i);
    if (characterMatch && characterMatch[0]) {
      result.characters = this.extractCharacters(characterMatch[0]);
    }
    
    // Extract beat sheet information
    const beatMatch = content.match(/(?:Beat|Interactive)[\s\S]*$/i);
    if (beatMatch) {
      result.beatSheet = this.extractBeatSheet(beatMatch[0]);
    }
    
    // Extracted structured content
    return result;
  }

  /**
   * Format film treatment content
   */
  private formatFilmTreatment(treatment: any): string {
    if (typeof treatment === 'string') {
      return treatment;
    }
    
    if (typeof treatment === 'object') {
      let formatted = '';
      
      if (treatment.title) {
        formatted += `<h1>${treatment.title}</h1>\n\n`;
      }
      
      if (treatment.logline) {
        formatted += `<p><strong>Logline:</strong> ${treatment.logline}</p>\n\n`;
      }
      
      if (treatment.synopsis) {
        formatted += `<p><strong>Synopsis:</strong> ${treatment.synopsis}</p>\n\n`;
      }
      
      if (treatment.targetAudience) {
        formatted += `<p><strong>Target Audience:</strong> ${treatment.targetAudience}</p>\n\n`;
      }
      
      if (treatment.genre) {
        formatted += `<p><strong>Genre and Tone:</strong> ${treatment.genre}</p>\n\n`;
      }
      
      if (treatment.duration) {
        formatted += `<p><strong>Duration:</strong> ${treatment.duration}</p>\n\n`;
      }
      
      if (treatment.themes) {
        formatted += `<p><strong>Key Themes and Messages:</strong> ${treatment.themes}</p>\n\n`;
      }
      
      if (treatment.structure) {
        formatted += `<p><strong>Story Structure Overview:</strong> ${treatment.structure}</p>`;
      }
      
      return formatted || JSON.stringify(treatment);
    }
    
    return String(treatment);
  }

  /**
   * Format film treatment content with individual fields
   */
  private formatFilmTreatmentWithFields(treatment: any): string {
    let formatted = '';

    if (treatment.title) {
      formatted += `<h1>${treatment.title}</h1>\n\n`;
    }

    if (treatment.logline) {
      formatted += `<p><strong>Logline:</strong> ${treatment.logline}</p>\n\n`;
    }

    if (treatment.synopsis) {
      formatted += `<p><strong>Synopsis:</strong> ${treatment.synopsis}</p>\n\n`;
    }

    if (treatment.targetAudience) {
      formatted += `<p><strong>Target Audience:</strong> ${treatment.targetAudience}</p>\n\n`;
    }

    if (treatment.genre) {
      formatted += `<p><strong>Genre and Tone:</strong> ${treatment.genre}</p>\n\n`;
    }

    if (treatment.duration) {
      formatted += `<p><strong>Duration:</strong> ${treatment.duration}</p>\n\n`;
    }

    if (treatment.themes) {
      formatted += `<p><strong>Key Themes and Messages:</strong> ${treatment.themes}</p>\n\n`;
    }

    if (treatment.structure) {
      formatted += `<p><strong>Story Structure Overview:</strong> ${treatment.structure}</p>`;
    }

    return formatted;
  }

  /**
   * Map act strings to proper enum values
   */
  private mapActString(act: any): string {
    if (!act) return 'ACT_I';
    
    const actStr = String(act).toUpperCase();
    
    if (actStr.includes('1') || actStr.includes('I')) return 'ACT_I';
    if (actStr.includes('2') || actStr.includes('II')) return 'ACT_II';
    if (actStr.includes('3') || actStr.includes('III')) return 'ACT_III';
    if (actStr.includes('4') || actStr.includes('IV')) return 'ACT_IV';
    if (actStr.includes('5') || actStr.includes('V')) return 'ACT_V';
    
    return 'ACT_I';
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
              motivation: 'To be determined',
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
