import { APICategory, PlatformType, TaskType, TaskComplexity, PlatformModel, TaskContext } from '@/types/dol';

// Mock database functions - will be replaced with actual database calls
const mockPlatformModels: PlatformModel[] = [
  // Intelligence Models
  {
    id: '1',
    modelId: 'gemini-3.0-flash',
    platformId: 'google',
    platformType: PlatformType.GOOGLE,
    category: APICategory.INTELLIGENCE,
    displayName: 'Gemini 1.5 Flash',
    description: 'High-performance intelligence model for complex tasks',
    costPerUnit: 0.00015,
    basePerformanceScore: 95,
    maxTokens: 32768,
    features: ['long-context', 'multimodal', 'reasoning'],
    isBYOKSupported: false,
    isOperational: true,
    isActive: true,
    lastUpdated: new Date(),
    metadata: {}
  },
  {
    id: '2',
    modelId: 'gemini-3.0-flash',
    platformId: 'google',
    platformType: PlatformType.GOOGLE,
    category: APICategory.INTELLIGENCE,
    displayName: 'Gemini 2.5 Flash',
    description: 'Latest flash model with improved quality and speed',
    costPerUnit: 0.000075,
    basePerformanceScore: 90,
    maxTokens: 8192,
    features: ['fast-response', 'cost-efficient'],
    isBYOKSupported: false,
    isOperational: true,
    isActive: true,
    lastUpdated: new Date(),
    metadata: {}
  },
  {
    id: '3',
    modelId: 'gpt-4o',
    platformId: 'openai',
    platformType: PlatformType.OPENAI,
    category: APICategory.INTELLIGENCE,
    displayName: 'GPT-4o',
    description: 'High-performance OpenAI model for complex tasks',
    costPerUnit: 0.00025,
    basePerformanceScore: 98,
    maxTokens: 128000,
    features: ['long-context', 'multimodal', 'advanced-reasoning'],
    isBYOKSupported: false,
    isOperational: true,
    isActive: true,
    lastUpdated: new Date(),
    metadata: {}
  },
  {
    id: '4',
    modelId: 'gpt-4o-mini',
    platformId: 'openai',
    platformType: PlatformType.OPENAI,
    category: APICategory.INTELLIGENCE,
    displayName: 'GPT-4o Mini',
    description: 'Cost-effective OpenAI model for routine tasks',
    costPerUnit: 0.00015,
    basePerformanceScore: 80,
    maxTokens: 16384,
    features: ['fast-response', 'cost-efficient'],
    isBYOKSupported: false,
    isOperational: true,
    isActive: true,
    lastUpdated: new Date(),
    metadata: {}
  },
  // Video Generation Models
  {
    id: '5',
    modelId: 'runway-gen-3',
    platformId: 'runwayml',
    platformType: PlatformType.RUNWAYML,
    category: APICategory.VIDEO_GEN,
    displayName: 'Runway Gen-3',
    description: 'Advanced video generation with motion control',
    costPerUnit: 0.05,
    basePerformanceScore: 92,
    maxDuration: 16,
    maxResolution: '1920x1080',
    features: ['motion-brush-v2', 'neg-prompting-advanced', 'style-transfer'],
    isBYOKSupported: true,
    isOperational: false,
    isActive: true,
    lastUpdated: new Date(),
    metadata: {}
  },
  {
    id: '6',
    modelId: 'pika-labs-1.0',
    platformId: 'pika-labs',
    platformType: PlatformType.PIKA_LABS,
    category: APICategory.VIDEO_GEN,
    displayName: 'Pika Labs 1.0',
    description: 'Fast video generation with style control',
    costPerUnit: 0.03,
    basePerformanceScore: 88,
    maxDuration: 6,
    maxResolution: '1024x1024',
    features: ['style-transfer', 'fast-generation'],
    isBYOKSupported: true,
    isOperational: false,
    isActive: true,
    lastUpdated: new Date(),
    metadata: {}
  },
  {
    id: '7',
    modelId: 'google-veo',
    platformId: 'google-veo',
    platformType: PlatformType.GOOGLE,
    category: APICategory.VIDEO_GEN,
    displayName: 'Google Veo',
    description: 'High-quality video generation with advanced features',
    costPerUnit: 0.08,
    basePerformanceScore: 95,
    maxDuration: 10,
    maxResolution: '1920x1080',
    features: ['high-quality', 'advanced-motion', 'style-control'],
    isBYOKSupported: true,
    isOperational: false,
    isActive: true,
    lastUpdated: new Date(),
    metadata: {}
  }
];

class ModelSelector {
  /**
   * Select the optimal model based on task context and requirements
   */
  public async selectModel(context: TaskContext): Promise<PlatformModel> {
    const category = this.getCategoryForTask(context.taskType);
    const candidates = await this.fetchActiveModels(category);

    // 1. BYOK Scenario - User has provided their own key
    if (context.byokPlatformId) {
      const byokModel = candidates.find(m => 
        m.platformId === context.byokPlatformId && 
        m.isBYOKSupported
      );
      if (byokModel) {
        console.log(`Using BYOK model: ${byokModel.displayName}`);
        return byokModel;
      }
      // Handle case where BYOK is requested but platform is unavailable
      console.warn(`BYOK platform ${context.byokPlatformId} not available, falling back to operational models`);
    }

    // 2. Operational Scenario - Cost and performance optimization
    if (category === APICategory.INTELLIGENCE) {
      return this.selectIntelligenceModel(candidates, context);
    } else if (category === APICategory.VIDEO_GEN) {
      return this.selectVideoGenerationModel(candidates, context);
    }

    // 3. Default: Highest performance operational model
    return candidates
      .filter(m => m.isOperational)
      .sort((a, b) => b.basePerformanceScore - a.basePerformanceScore)[0];
  }

  /**
   * Select intelligence model based on complexity and cost requirements
   */
  private selectIntelligenceModel(candidates: PlatformModel[], context: TaskContext): PlatformModel {
    const operationalModels = candidates.filter(m => m.isOperational);
    
    if (context.complexity === TaskComplexity.HIGH) {
      // Use high-power model for complex tasks - maximize UX
      return operationalModels
        .sort((a, b) => b.basePerformanceScore - a.basePerformanceScore)[0];
    } else if (context.complexity === TaskComplexity.MEDIUM) {
      // Balance performance and cost for medium tasks
      return operationalModels
        .sort((a, b) => (b.basePerformanceScore / a.costPerUnit) - (a.basePerformanceScore / a.costPerUnit))[0];
    } else {
      // Use cost-effective model for simple tasks - maximize efficiency
      return operationalModels
        .sort((a, b) => a.costPerUnit - b.costPerUnit)[0];
    }
  }

  /**
   * Select video generation model based on requirements and features
   */
  private selectVideoGenerationModel(candidates: PlatformModel[], context: TaskContext): PlatformModel {
    const byokModels = candidates.filter(m => m.isBYOKSupported);
    
    // For video generation, prioritize BYOK models as they're typically more cost-effective
    if (byokModels.length > 0) {
      // Select based on quality requirement
      if (context.qualityRequirement === 'high') {
        return byokModels
          .sort((a, b) => b.basePerformanceScore - a.basePerformanceScore)[0];
      } else {
        return byokModels
          .sort((a, b) => a.costPerUnit - b.costPerUnit)[0];
      }
    }
    
    // Fallback to operational models if no BYOK available
    return candidates
      .filter(m => m.isOperational)
      .sort((a, b) => b.basePerformanceScore - a.basePerformanceScore)[0];
  }

  /**
   * Determine the API category for a given task type
   */
  private getCategoryForTask(taskType: TaskType): APICategory {
    const intelligenceTasks = [
      TaskType.SCRIPT_WRITING,
      TaskType.STORY_ANALYSIS,
      TaskType.CHARACTER_DEVELOPMENT,
      TaskType.PLOT_STRUCTURING,
      TaskType.DIALOGUE_GENERATION,
      TaskType.SCENE_DESCRIPTION
    ];

    return intelligenceTasks.includes(taskType) 
      ? APICategory.INTELLIGENCE 
      : APICategory.VIDEO_GEN;
  }

  /**
   * Fetch active models for a given category
   * TODO: Replace with actual database call
   */
  private async fetchActiveModels(category: APICategory): Promise<PlatformModel[]> {
    // Mock implementation - will be replaced with database query
    return mockPlatformModels.filter(m => 
      m.category === category && 
      m.isActive
    );
  }

  /**
   * Get all available models for admin interface
   */
  public async getAllModels(): Promise<PlatformModel[]> {
    return mockPlatformModels;
  }

  /**
   * Update model features (for admin interface)
   */
  public async updateModelFeatures(modelId: string, features: string[]): Promise<void> {
    const model = mockPlatformModels.find(m => m.id === modelId);
    if (model) {
      model.features = features;
      model.lastUpdated = new Date();
    }
    // TODO: Implement actual database update
  }
}

export const modelSelector = new ModelSelector();
