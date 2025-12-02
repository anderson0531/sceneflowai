import { PlatformModel, PromptTemplate, TaskType } from '@/types/dol';

// Mock database functions - will be replaced with actual database calls
const mockPromptTemplates: PromptTemplate[] = [
  {
    id: '1',
    templateId: 'script-writing-gemini',
    modelId: 'gemini-3.0-flash',
    taskType: TaskType.SCRIPT_WRITING,
    templateString: `You are an expert screenwriter. Create a compelling script based on the following concept:

CONCEPT: {{concept}}
GENRE: {{genre}}
TARGET AUDIENCE: {{targetAudience}}
TONE: {{tone}}

Please provide:
1. A compelling logline
2. A detailed synopsis (2-3 paragraphs)
3. Key character descriptions
4. Act structure breakdown
5. Opening scene

Focus on creating engaging, cinematic content that follows industry best practices.`,
    variables: ['concept', 'genre', 'targetAudience', 'tone'],
    currentQualityScore: 95,
    usageCount: 150,
    isDeprecated: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    metadata: {}
  },
  {
    id: '2',
    templateId: 'story-analysis-gpt4',
    modelId: 'gpt-4o',
    taskType: TaskType.STORY_ANALYSIS,
    templateString: `As a professional story analyst, analyze the following story elements:

STORY: {{story}}
ANALYSIS FOCUS: {{focus}}

Provide a comprehensive analysis covering:
1. Story Structure: {{#if structure}}Current structure: {{structure}}{{else}}Identify the story structure{{/if}}
2. Character Development: {{#if characters}}Characters: {{characters}}{{else}}Analyze character arcs{{/if}}
3. Pacing and Flow: {{#if pacing}}Pacing notes: {{pacing}}{{else}}Assess story pacing{{/if}}
4. Thematic Elements: {{#if themes}}Themes: {{themes}}{{else}}Identify key themes{{/if}}
5. Recommendations: Specific, actionable improvements

Be constructive and provide concrete examples from the story.`,
    variables: ['story', 'focus', 'structure', 'characters', 'pacing', 'themes'],
    currentQualityScore: 92,
    usageCount: 89,
    isDeprecated: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    metadata: {}
  },
  {
    id: '3',
    templateId: 'video-generation-runway',
    modelId: 'runway-gen-3',
    taskType: TaskType.TEXT_TO_VIDEO,
    templateString: `Create a compelling video based on this description:

SCENE DESCRIPTION: {{sceneDescription}}
STYLE: {{style}}
MOOD: {{mood}}
DURATION: {{duration}} seconds
MOTION: {{motion}}

{{#if negativePrompt}}AVOID: {{negativePrompt}}{{/if}}
{{#if cameraMovement}}CAMERA: {{cameraMovement}}{{/if}}

Focus on cinematic quality and smooth motion.`,
    variables: ['sceneDescription', 'style', 'mood', 'duration', 'motion', 'negativePrompt', 'cameraMovement'],
    currentQualityScore: 88,
    usageCount: 234,
    isDeprecated: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    metadata: {}
  }
];

class PromptConstructor {
  /**
   * Construct optimized prompt using templates and platform adapters
   */
  public async construct(
    userInput: Record<string, any>,
    model: PlatformModel,
    taskType: TaskType
  ): Promise<{ optimizedPrompt: string; parameters: Record<string, any> }> {
    
    // 1. Fetch the best template based on quality scores
    const templateData = await this.fetchBestTemplate(model.modelId, taskType);
    
    if (!templateData) {
      // Fallback to generic prompt if no template found
      return this.createGenericPrompt(userInput, taskType);
    }

    // 2. Compile the base prompt using Handlebars-like syntax
    let prompt = this.compileTemplate(templateData.templateString, userInput);
    let parameters = { ...userInput.params } || {};

    // 3. Apply Platform-Specific Strategy (Adapter)
    const adapter = this.getPlatformAdapter(model.platformId);
    const result = adapter.optimize(prompt, parameters, model.features);

    return { 
      optimizedPrompt: result.prompt, 
      parameters: result.parameters 
    };
  }

  /**
   * Fetch the best template based on quality scores
   */
  private async fetchBestTemplate(modelId: string, taskType: TaskType): Promise<PromptTemplate | null> {
    // Mock implementation - will be replaced with database query
    const templates = mockPromptTemplates.filter(t => 
      t.modelId === modelId && 
      t.taskType === taskType && 
      !t.isDeprecated
    );

    if (templates.length === 0) return null;

    // Return template with highest quality score
    return templates.sort((a, b) => b.currentQualityScore - a.currentQualityScore)[0];
  }

  /**
   * Compile template with Handlebars-like syntax
   */
  private compileTemplate(template: string, data: Record<string, any>): string {
    // Simple Handlebars-like implementation
    // TODO: Replace with actual Handlebars library
    let result = template;
    
    // Handle basic variable substitution
    Object.entries(data).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, String(value));
    });

    // Handle conditional blocks
    result = result.replace(/\{\{#if\s+(\w+)\}\}(.*?)\{\{\/if\}\}/gs, (match, condition, content) => {
      return data[condition] ? content : '';
    });

    return result;
  }

  /**
   * Create generic prompt if no template is available
   */
  private createGenericPrompt(userInput: Record<string, any>, taskType: TaskType): { optimizedPrompt: string; parameters: Record<string, any> } {
    const basePrompt = `Please complete the following ${taskType.toLowerCase().replace('_', ' ')} task:

${Object.entries(userInput)
  .filter(([key]) => key !== 'params')
  .map(([key, value]) => `${key.toUpperCase()}: ${value}`)
  .join('\n')}

Provide a high-quality, professional result.`;

    return {
      optimizedPrompt: basePrompt,
      parameters: userInput.params || {}
    };
  }

  /**
   * Get platform adapter for optimization
   */
  private getPlatformAdapter(platformId: string): any {
    // TODO: Implement actual platform adapters
    return {
      optimize: (prompt: string, parameters: Record<string, any>, features: string[]) => {
        // Basic optimization logic
        let optimizedPrompt = prompt;
        let optimizedParams = { ...parameters };

        // Apply feature-specific optimizations
        if (features.includes('neg-prompting-advanced') && !optimizedParams.negative_prompt) {
          optimizedParams.negative_prompt = "blurry, low resolution, artifacts, distorted, poor quality";
        }

        if (features.includes('motion-brush-v2') && optimizedParams.motion) {
          optimizedParams.motion_control = optimizedParams.motion;
          delete optimizedParams.motion;
        }

        return { prompt: optimizedPrompt, parameters: optimizedParams };
      }
    };
  }

  /**
   * Get all templates for admin interface
   */
  public async getAllTemplates(): Promise<PromptTemplate[]> {
    return mockPromptTemplates;
  }

  /**
   * Create new template
   */
  public async createTemplate(template: Omit<PromptTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<PromptTemplate> {
    const newTemplate: PromptTemplate = {
      ...template,
      id: Date.now().toString(), // Simple ID generation
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    mockPromptTemplates.push(newTemplate);
    return newTemplate;
  }

  /**
   * Update template quality score based on feedback
   */
  public async updateTemplateScore(templateId: string, newScore: number): Promise<void> {
    const template = mockPromptTemplates.find(t => t.id === templateId);
    if (template) {
      template.currentQualityScore = newScore;
      template.updatedAt = new Date();
    }
    // TODO: Implement actual database update
  }
}

export const promptConstructor = new PromptConstructor();
