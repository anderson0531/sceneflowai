// AI Capability Manager Service
// This service manages AI model capabilities and provides optimal model selection

import { 
  AICapability, 
  AIPromptTemplate, 
  AIOptimizationStrategy, 
  ProjectContext, 
  Task 
} from '@/types/ai-adaptability';

export class AICapabilityManager {
  private static instance: AICapabilityManager;
  private capabilities: Map<string, AICapability> = new Map();
  private promptTemplates: Map<string, AIPromptTemplate> = new Map();
  private optimizationStrategies: Map<string, AIOptimizationStrategy> = new Map();
  private modelPerformance: Map<string, any> = new Map();

  private constructor() {
    this.initializeDefaultCapabilities();
    this.initializeDefaultTemplates();
    this.initializeDefaultStrategies();
  }

  public static getInstance(): AICapabilityManager {
    if (!AICapabilityManager.instance) {
      AICapabilityManager.instance = new AICapabilityManager();
    }
    return AICapabilityManager.instance;
  }

  /**
   * Register a new AI model capability
   */
  public async registerCapability(capability: AICapability): Promise<void> {
    try {
      // Validate capability data
      this.validateCapability(capability);
      
      // Store capability
      this.capabilities.set(capability.model, capability);
      
      // Update optimization strategies
      await this.updateOptimizationStrategies(capability);
      
      // Notify prompt engine
      await this.notifyPromptEngine(capability);
      
      console.log(`AI Capability registered: ${capability.model} v${capability.version}`);
    } catch (error) {
      console.error('Failed to register AI capability:', error);
      throw error;
    }
  }

  /**
   * Get optimal AI model for a specific task
   */
  public async getOptimalModel(task: Task, context: ProjectContext): Promise<string> {
    try {
      const compatibleModels = await this.getCompatibleModels(task, context);
      
      if (compatibleModels.length === 0) {
        throw new Error('No compatible AI models found for this task');
      }

      // Score models based on multiple factors
      const scoredModels = await this.scoreModels(compatibleModels, task, context);
      
      // Return the highest scoring model
      return scoredModels[0].model;
    } catch (error) {
      console.error('Failed to get optimal model:', error);
      throw error;
    }
  }

  /**
   * Get all registered AI capabilities
   */
  public getCapabilities(): AICapability[] {
    return Array.from(this.capabilities.values());
  }

  /**
   * Get capability for a specific model
   */
  public getCapability(model: string): AICapability | undefined {
    return this.capabilities.get(model);
  }

  /**
   * Get prompt templates for a specific category and model
   */
  public getPromptTemplates(category: string, model?: string): AIPromptTemplate[] {
    let templates = Array.from(this.promptTemplates.values());
    
    // Filter by category
    templates = templates.filter(t => t.category === category);
    
    // Filter by model if specified
    if (model) {
      templates = templates.filter(t => t.aiModels.includes(model));
    }
    
    // Sort by effectiveness
    return templates.sort((a, b) => b.effectiveness - a.effectiveness);
  }

  /**
   * Get optimization strategies for a specific category and model
   */
  public getOptimizationStrategies(category: string, model?: string): AIOptimizationStrategy[] {
    let strategies = Array.from(this.optimizationStrategies.values());
    
    // Filter by category
    strategies = strategies.filter(s => s.category === category);
    
    // Filter by model if specified
    if (model) {
      strategies = strategies.filter(s => s.applicableModels.includes(model));
    }
    
    // Sort by effectiveness
    return strategies.sort((a, b) => b.effectiveness - a.effectiveness);
  }

  /**
   * Update model performance metrics
   */
  public async updateModelPerformance(model: string, metrics: any): Promise<void> {
    try {
      this.modelPerformance.set(model, {
        ...this.modelPerformance.get(model),
        ...metrics,
        lastUpdated: new Date()
      });
      
      // Update capability effectiveness if needed
      await this.updateCapabilityEffectiveness(model);
    } catch (error) {
      console.error('Failed to update model performance:', error);
      throw error;
    }
  }

  /**
   * Get model performance data
   */
  public getModelPerformance(model: string): any {
    return this.modelPerformance.get(model);
  }

  /**
   * Check if a model supports specific capabilities
   */
  public supportsCapability(model: string, capability: keyof AICapability['capabilities']): boolean {
    const modelCapability = this.capabilities.get(model);
    if (!modelCapability) return false;
    
    return modelCapability.capabilities[capability] !== undefined;
  }

  /**
   * Get cost estimate for a model and task
   */
  public getCostEstimate(model: string, task: Task): number {
    const capability = this.capabilities.get(model);
    if (!capability) return 0;
    
    // Estimate tokens based on task complexity
    const estimatedTokens = this.estimateTokenUsage(task);
    
    return estimatedTokens * capability.capabilities.costPerToken;
  }

  /**
   * Initialize default AI capabilities
   */
  private initializeDefaultCapabilities(): void {
    const defaultCapabilities: AICapability[] = [
      {
        model: 'gpt-4',
        version: '4.0',
        provider: 'openai',
        capabilities: {
          maxTokens: 8192,
          vision: false,
          videoGeneration: false,
          audioGeneration: false,
          reasoning: true,
          creativity: 8,
          contextWindow: 8192,
          multimodal: false,
          realTime: false,
          costPerToken: 0.00003
        },
        promptOptimizations: [
          'Use clear, specific instructions',
          'Provide examples when possible',
          'Break complex tasks into steps'
        ],
        bestPractices: [
          'Be explicit about desired output format',
          'Use system messages for role definition',
          'Iterate on prompts based on results'
        ],
        limitations: [
          'No real-time data access',
          'Limited to training data cutoff',
          'May generate plausible but incorrect information'
        ],
        lastUpdated: new Date(),
        isActive: true
      },
      {
        model: 'gpt-4o',
        version: '4.0',
        provider: 'openai',
        capabilities: {
          maxTokens: 128000,
          vision: true,
          videoGeneration: false,
          audioGeneration: false,
          reasoning: true,
          creativity: 9,
          contextWindow: 128000,
          multimodal: true,
          realTime: false,
          costPerToken: 0.000005
        },
        promptOptimizations: [
          'Leverage multimodal capabilities',
          'Use visual context effectively',
          'Combine text and image inputs'
        ],
        bestPractices: [
          'Provide clear visual context',
          'Use structured prompts for complex tasks',
          'Leverage large context window'
        ],
        limitations: [
          'No video generation',
          'Limited to training data cutoff',
          'May struggle with very complex visual tasks'
        ],
        lastUpdated: new Date(),
        isActive: true
      },
      {
        model: 'gemini-3.0',
        version: '2.0',
        provider: 'google',
        capabilities: {
          maxTokens: 1000000,
          vision: true,
          videoGeneration: false,
          audioGeneration: false,
          reasoning: true,
          creativity: 8,
          contextWindow: 1000000,
          multimodal: true,
          realTime: false,
          costPerToken: 0.0000025
        },
        promptOptimizations: [
          'Use Google-specific optimizations',
          'Leverage large context window',
          'Combine multiple modalities effectively'
        ],
        bestPractices: [
          'Structure prompts clearly',
          'Use Google\'s recommended patterns',
          'Leverage multimodal inputs'
        ],
        limitations: [
          'No video generation',
          'May have Google-specific biases',
          'Limited to Google\'s training data'
        ],
        lastUpdated: new Date(),
        isActive: true
      },
      {
        model: 'claude-3.5-sonnet',
        version: '3.5',
        provider: 'anthropic',
        capabilities: {
          maxTokens: 200000,
          vision: true,
          videoGeneration: false,
          audioGeneration: false,
          reasoning: true,
          creativity: 7,
          contextWindow: 200000,
          multimodal: true,
          realTime: false,
          costPerToken: 0.000003
        },
        promptOptimizations: [
          'Use Claude\'s safety-focused approach',
          'Leverage strong reasoning capabilities',
          'Provide clear context and constraints'
        ],
        bestPractices: [
          'Be explicit about safety requirements',
          'Use structured reasoning prompts',
          'Leverage multimodal capabilities'
        ],
        limitations: [
          'No video generation',
          'Conservative safety measures',
          'May refuse certain requests'
        ],
        lastUpdated: new Date(),
        isActive: true
      }
    ];

    defaultCapabilities.forEach(capability => {
      this.capabilities.set(capability.model, capability);
    });
  }

  /**
   * Initialize default prompt templates
   */
  private initializeDefaultTemplates(): void {
    const defaultTemplates: AIPromptTemplate[] = [
      {
        id: 'ideation-brainstorm',
        name: 'Creative Brainstorming',
        description: 'Generate creative ideas for video content',
        category: 'ideation',
        template: `You are a creative video content strategist. Based on the following project context, generate {{ideaCount}} innovative video concepts:

Project: {{projectTitle}}
Genre: {{genre}}
Target Audience: {{targetAudience}}
Style: {{style}}
Tone: {{tone}}
Duration: {{duration}} minutes

For each concept, provide:
1. A compelling title
2. A one-sentence hook
3. Key visual elements
4. Target emotional response
5. Estimated impact

Focus on {{focusArea}} and ensure each concept is unique and engaging.`,
        variables: [
          {
            name: 'ideaCount',
            type: 'number',
            description: 'Number of ideas to generate',
            required: true,
            defaultValue: 5,
            validation: { min: 1, max: 20 }
          },
          {
            name: 'focusArea',
            type: 'string',
            description: 'Specific area to focus on',
            required: false,
            defaultValue: 'creativity and engagement'
          }
        ],
        aiModels: ['gpt-4', 'gpt-4o', 'gemini-3.0', 'claude-3.5-sonnet'],
        effectiveness: 85,
        usageCount: 0,
        lastUpdated: new Date(),
        isActive: true
      },
      {
        id: 'storyboard-from-core',
        name: 'Storyboard From Core Concept',
        description: 'Generate Acts → Chapters → Scenes from the Core Concept',
        category: 'storyboard',
        template: `Using the core concept below, produce a coherent three-act storyboard broken into chapters and scenes.

Core Concept:
Title: {{title}}
Premise: {{premise}}
Audience: {{audience}}
Key Message: {{keyMessage}}
Tone: {{tone}}
Genre: {{genre}}
Duration (min): {{duration}}
Visual Motifs: {{visualMotifs}}
Platform: {{platform}}

Output JSON with: acts[ { title, summary, chapters[ { title, summary, targetDuration, objectives[], scenes[ { title, goal, durationSec, visualPlan, cameraPlan, audioNotes, transitions } ] } ] } ]`,
        variables: [
          { name: 'title', type: 'string', description: 'Working title', required: false },
          { name: 'premise', type: 'string', description: 'Core premise/logline', required: true },
          { name: 'audience', type: 'string', description: 'Target audience', required: true },
          { name: 'keyMessage', type: 'string', description: 'Key message/CTA', required: false },
          { name: 'tone', type: 'string', description: 'Tone/mood', required: false },
          { name: 'genre', type: 'string', description: 'Genre/format', required: false },
          { name: 'duration', type: 'number', description: 'Target duration (minutes)', required: false, defaultValue: 5 },
          { name: 'visualMotifs', type: 'string', description: 'Visual motifs/keywords', required: false },
          { name: 'platform', type: 'string', description: 'Intended platform', required: false }
        ],
        aiModels: ['gpt-4', 'gpt-4o', 'gemini-3.0', 'claude-3.5-sonnet'],
        effectiveness: 84,
        usageCount: 0,
        lastUpdated: new Date(),
        isActive: true
      },
      {
        id: 'scene-direction-spec',
        name: 'Scene Direction Specification',
        description: 'Produce clear scene direction with technical and visual guidance',
        category: 'scene-direction',
        template: `You are a seasoned scene director. Using the project context, create direction notes:

Project: {{projectTitle}}
Visual Style: {{style}}
Tone: {{tone}}
Duration: {{duration}} minutes

Provide:
1) Objectives for this scene
2) Camera plan (angles/movements)
3) Lighting plan
4) Blocking and timing cues
5) Risks and mitigation
6) Acceptance criteria
`,
        variables: [
          {
            name: 'detailLevel',
            type: 'string',
            description: 'Level of technical detail',
            required: false,
            defaultValue: 'medium'
          }
        ],
        aiModels: ['gpt-4', 'gpt-4o', 'gemini-3.0', 'claude-3.5-sonnet'],
        effectiveness: 82,
        usageCount: 0,
        lastUpdated: new Date(),
        isActive: true
      },
      {
        id: 'video-generation-draft',
        name: 'Video Draft Generation',
        description: 'Plan and generate a first video draft with assets and sequencing',
        category: 'video-generation',
        template: `You are a video producer. Using the context, outline a video draft:

Project: {{projectTitle}}
Genre: {{genre}}
Audience: {{targetAudience}}
Duration: {{duration}} minutes

Provide:
1) Sequence of scenes with timestamps
2) Visual assets (stock/video/animation) suggestions
3) Music/SFX plan
4) Transitions and pacing notes
5) Rendering requirements (resolution, fps)
`,
        variables: [
          {
            name: 'resolution',
            type: 'string',
            description: 'Target resolution',
            required: false,
            defaultValue: '1080p'
          }
        ],
        aiModels: ['gpt-4', 'gpt-4o', 'gemini-3.0', 'claude-3.5-sonnet'],
        effectiveness: 84,
        usageCount: 0,
        lastUpdated: new Date(),
        isActive: true
      },
      {
        id: 'review-quality-check',
        name: 'Quality Review Checklist',
        description: 'Assess quality against thresholds and list issues',
        category: 'review',
        template: `You are a QA reviewer. Evaluate the produced content:

Criteria thresholds: {{criteria}}

Return:
1) Scores per criterion (0-100)
2) Issues found with severity
3) Pass/Fail decision and rationale
`,
        variables: [
          {
            name: 'criteria',
            type: 'string',
            description: 'Quality criteria list',
            required: false,
            defaultValue: 'visual-consistency, audio-clarity, pacing, narrative-coherence'
          }
        ],
        aiModels: ['gpt-4', 'gpt-4o', 'gemini-3.0', 'claude-3.5-sonnet'],
        effectiveness: 81,
        usageCount: 0,
        lastUpdated: new Date(),
        isActive: true
      },
      {
        id: 'optimization-plan',
        name: 'Optimization Plan',
        description: 'Generate a prioritized improvement plan based on review issues',
        category: 'optimization',
        template: `You are an optimization expert. Given review findings, propose:

1) Prioritized fixes with impact/effort
2) Concrete prompt or asset changes
3) Expected quality gain per change
4) A minimal set of changes to reach target thresholds
`,
        variables: [
          {
            name: 'targetGain',
            type: 'number',
            description: 'Expected overall score target',
            required: false,
            defaultValue: 85
          }
        ],
        aiModels: ['gpt-4', 'gpt-4o', 'gemini-3.0', 'claude-3.5-sonnet'],
        effectiveness: 83,
        usageCount: 0,
        lastUpdated: new Date(),
        isActive: true
      },
      {
        id: 'storyboard-scene-breakdown',
        name: 'Scene Breakdown',
        description: 'Break down a scene into storyboard frames',
        category: 'storyboard',
        template: `You are a professional storyboard artist. Create a detailed storyboard breakdown for the following scene:

Scene: {{sceneTitle}}
Description: {{sceneDescription}}
Duration: {{duration}} seconds
Location: {{location}}
Characters: {{characters}}
Mood: {{mood}}

Create {{frameCount}} storyboard frames that:
1. Show key moments and actions
2. Include camera angles and movements
3. Capture emotional beats
4. Maintain visual continuity
5. Support the narrative flow

For each frame, provide:
- Visual description
- Camera angle and movement
- Character positioning
- Key visual elements
- Timing notes`,
        variables: [
          {
            name: 'frameCount',
            type: 'number',
            description: 'Number of storyboard frames',
            required: true,
            defaultValue: 8,
            validation: { min: 4, max: 20 }
          }
        ],
        aiModels: ['gpt-4', 'gpt-4o', 'gemini-3.0', 'claude-3.5-sonnet'],
        effectiveness: 80,
        usageCount: 0,
        lastUpdated: new Date(),
        isActive: true
      }
    ];

    defaultTemplates.forEach(template => {
      this.promptTemplates.set(template.id, template);
    });
  }

  /**
   * Initialize default optimization strategies
   */
  private initializeDefaultStrategies(): void {
    const defaultStrategies: AIOptimizationStrategy[] = [
      {
        id: 'prompt-iteration',
        name: 'Prompt Iteration',
        description: 'Iteratively improve prompts based on results',
        category: 'optimization',
        strategy: 'Analyze previous results and suggest prompt improvements',
        parameters: {
          maxIterations: 3,
          improvementThreshold: 0.1
        },
        effectiveness: 90,
        applicableModels: ['gpt-4', 'gpt-4o', 'gemini-3.0', 'claude-3.5-sonnet'],
        lastUpdated: new Date(),
        isActive: true
      },
      {
        id: 'context-optimization',
        name: 'Context Optimization',
        description: 'Optimize context and background information',
        category: 'optimization',
        strategy: 'Provide optimal amount of context for the task',
        parameters: {
          contextLength: 'optimal',
          includeExamples: true
        },
        effectiveness: 85,
        applicableModels: ['gpt-4', 'gpt-4o', 'gemini-3.0', 'claude-3.5-sonnet'],
        lastUpdated: new Date(),
        isActive: true
      }
    ];

    defaultStrategies.forEach(strategy => {
      this.optimizationStrategies.set(strategy.id, strategy);
    });
  }

  /**
   * Validate capability data
   */
  private validateCapability(capability: AICapability): void {
    if (!capability.model || !capability.version) {
      throw new Error('Model and version are required');
    }
    
    if (!capability.capabilities) {
      throw new Error('Capabilities are required');
    }
    
    if (capability.capabilities.creativity < 1 || capability.capabilities.creativity > 10) {
      throw new Error('Creativity must be between 1 and 10');
    }
  }

  /**
   * Get compatible models for a task
   */
  private async getCompatibleModels(task: Task, context: ProjectContext): Promise<AICapability[]> {
    const compatible: AICapability[] = [];
    
    for (const capability of this.capabilities.values()) {
      if (!capability.isActive) continue;
      
      // Check if model supports required capabilities
      if (this.modelSupportsTask(capability, task)) {
        compatible.push(capability);
      }
    }
    
    return compatible;
  }

  /**
   * Check if a model supports a specific task
   */
  private modelSupportsTask(capability: AICapability, task: Task): boolean {
    // Basic capability checks based on task type
    switch (task.type) {
      case 'generate':
        return capability.capabilities.reasoning || capability.capabilities.creativity > 5;
      case 'review':
        return capability.capabilities.reasoning;
      case 'optimize':
        return capability.capabilities.reasoning && capability.capabilities.creativity > 6;
      case 'collaborate':
        return capability.capabilities.reasoning;
      default:
        return true;
    }
  }

  /**
   * Score models based on multiple factors
   */
  private async scoreModels(
    models: AICapability[], 
    task: Task, 
    context: ProjectContext
  ): Promise<Array<{ model: string; score: number }>> {
    const scored = await Promise.all(
      models.map(async (model) => {
        const score = await this.calculateModelScore(model, task, context);
        return { model: model.model, score };
      })
    );
    
    // Sort by score (highest first)
    return scored.sort((a, b) => b.score - a.score);
  }

  /**
   * Calculate model score for a specific task and context
   */
  private async calculateModelScore(
    model: AICapability, 
    task: Task, 
    context: ProjectContext
  ): Promise<number> {
    let score = 0;
    
    // Base capability score
    score += model.capabilities.creativity * 5;
    score += model.capabilities.reasoning ? 20 : 0;
    
    // Context window score (larger is better for complex projects)
    if (context.complexity === 'complex') {
      score += Math.min(model.capabilities.contextWindow / 1000, 20);
    }
    
    // Cost efficiency score
    const costScore = Math.max(0, 20 - (model.capabilities.costPerToken * 1000000));
    score += costScore;
    
    // Performance score (if available)
    const performance = this.modelPerformance.get(model.model);
    if (performance) {
      score += performance.metrics?.averageRating * 2 || 0;
      score += performance.metrics?.successRate || 0;
    }
    
    // Task-specific scoring
    switch (task.type) {
      case 'generate':
        score += model.capabilities.creativity * 3;
        break;
      case 'review':
        score += model.capabilities.reasoning ? 15 : 0;
        break;
      case 'optimize':
        score += model.capabilities.reasoning ? 10 : 0;
        score += model.capabilities.creativity * 2;
        break;
    }
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Update optimization strategies when new capabilities are registered
   */
  private async updateOptimizationStrategies(capability: AICapability): Promise<void> {
    // This would update strategies based on new model capabilities
    // For now, just log the update
    console.log(`Updating optimization strategies for ${capability.model}`);
  }

  /**
   * Notify prompt engine of new capabilities
   */
  private async notifyPromptEngine(capability: AICapability): Promise<void> {
    // This would notify the prompt engine to update its templates
    // For now, just log the notification
    console.log(`Notifying prompt engine of new capability: ${capability.model}`);
  }

  /**
   * Update capability effectiveness based on performance
   */
  private async updateCapabilityEffectiveness(model: string): Promise<void> {
    const performance = this.modelPerformance.get(model);
    if (!performance) return;
    
    const capability = this.capabilities.get(model);
    if (!capability) return;
    
    // Update effectiveness based on performance metrics
    // This is a simplified calculation
    const newEffectiveness = Math.min(100, 
      (performance.metrics?.averageRating * 20) + 
      (performance.metrics?.successRate * 0.8)
    );
    
    capability.effectiveness = newEffectiveness;
    capability.lastUpdated = new Date();
  }

  /**
   * Estimate token usage for a task
   */
  private estimateTokenUsage(task: Task): number {
    // Simplified token estimation
    let baseTokens = 100;
    
    switch (task.type) {
      case 'generate':
        baseTokens = 500;
        break;
      case 'review':
        baseTokens = 300;
        break;
      case 'optimize':
        baseTokens = 400;
        break;
      case 'collaborate':
        baseTokens = 200;
        break;
    }
    
    // Add tokens for task description
    baseTokens += task.description.length / 4;
    
    return Math.round(baseTokens);
  }
}

// Export singleton instance
export const aiCapabilityManager = AICapabilityManager.getInstance();
