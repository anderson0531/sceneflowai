import { TaskContext, OptimizationResult, PlatformModel, TaskType, TaskComplexity } from '@/types/dol';
import { modelSelector } from './ModelSelector';
import { promptConstructor } from './PromptConstructor';
import { getPlatformAdapter } from './PlatformAdapter';

export interface DOLRequest {
  taskType: TaskType;
  complexity: TaskComplexity;
  userInput: Record<string, any>;
  byokPlatformId?: string;
  userPreferences?: Record<string, any>;
  budget?: number;
  qualityRequirement?: 'low' | 'medium' | 'high';
}

export interface DOLResponse {
  success: boolean;
  result?: OptimizationResult;
  error?: string;
  metadata: {
    modelUsed: string;
    platformUsed: string;
    estimatedCost: number;
    expectedQuality: number;
    reasoning: string;
  };
}

class DynamicOptimizationLayer {
  /**
   * Main entry point for DOL optimization
   */
  public async optimize(request: DOLRequest): Promise<DOLResponse> {
    try {
      // 1. Create task context
      const context: TaskContext = {
        taskType: request.taskType,
        complexity: request.complexity,
        byokPlatformId: request.byokPlatformId,
        userPreferences: request.userPreferences,
        budget: request.budget,
        qualityRequirement: request.qualityRequirement
      };

      // 2. Select optimal model
      const selectedModel = await modelSelector.selectModel(context);
      
      if (!selectedModel) {
        throw new Error('No suitable model found for the given task');
      }

      // 3. Construct optimized prompt
      const promptResult = await promptConstructor.construct(
        request.userInput,
        selectedModel,
        request.taskType
      );

      // 4. Calculate estimated cost and quality
      const estimatedCost = this.calculateEstimatedCost(selectedModel, request.complexity);
      const expectedQuality = this.calculateExpectedQuality(selectedModel, request.complexity);

      // 5. Create optimization result
      const result: OptimizationResult = {
        model: selectedModel,
        prompt: promptResult.optimizedPrompt,
        parameters: promptResult.parameters,
        estimatedCost,
        expectedQuality,
        reasoning: this.generateReasoning(selectedModel, context, estimatedCost, expectedQuality)
      };

      // 6. Log usage for feedback loop
      await this.logUsage(request, selectedModel, result);

      return {
        success: true,
        result,
        metadata: {
          modelUsed: selectedModel.displayName,
          platformUsed: selectedModel.platformId,
          estimatedCost,
          expectedQuality,
          reasoning: result.reasoning
        }
      };

    } catch (error) {
      console.error('DOL optimization failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        metadata: {
          modelUsed: 'unknown',
          platformUsed: 'unknown',
          estimatedCost: 0,
          expectedQuality: 0,
          reasoning: 'Optimization failed'
        }
      };
    }
  }

  /**
   * Calculate estimated cost based on model and task complexity
   */
  private calculateEstimatedCost(model: PlatformModel, complexity: TaskComplexity): number {
    let baseCost = model.costPerUnit;
    
    // Adjust cost based on complexity
    switch (complexity) {
      case TaskComplexity.LOW:
        return baseCost * 0.5;
      case TaskComplexity.MEDIUM:
        return baseCost * 1.0;
      case TaskComplexity.HIGH:
        return baseCost * 2.0;
      default:
        return baseCost;
    }
  }

  /**
   * Calculate expected quality based on model and task complexity
   */
  private calculateExpectedQuality(model: PlatformModel, complexity: TaskComplexity): number {
    let baseQuality = model.basePerformanceScore;
    
    // Adjust quality based on complexity (higher complexity = higher quality potential)
    switch (complexity) {
      case TaskComplexity.LOW:
        return Math.min(baseQuality, 85);
      case TaskComplexity.MEDIUM:
        return baseQuality;
      case TaskComplexity.HIGH:
        return Math.min(baseQuality + 5, 100);
      default:
        return baseQuality;
    }
  }

  /**
   * Generate reasoning for model selection
   */
  private generateReasoning(
    model: PlatformModel, 
    context: TaskContext, 
    cost: number, 
    quality: number
  ): string {
    const reasons: string[] = [];

    if (context.byokPlatformId) {
      reasons.push(`Using BYOK model ${model.displayName} as requested`);
    } else if (context.complexity === TaskComplexity.HIGH) {
      reasons.push(`Selected high-performance model ${model.displayName} for complex task`);
    } else if (context.complexity === TaskComplexity.LOW) {
      reasons.push(`Selected cost-effective model ${model.displayName} for simple task`);
    }

    if (context.qualityRequirement === 'high') {
      reasons.push(`Prioritized quality (${quality}/100) over cost ($${cost.toFixed(6)})`);
    } else if (context.budget) {
      reasons.push(`Optimized for budget constraint ($${context.budget})`);
    }

    reasons.push(`Platform: ${model.platformId}, Features: ${model.features.join(', ')}`);

    return reasons.join('. ');
  }

  /**
   * Log usage for feedback loop
   */
  private async logUsage(request: DOLRequest, model: PlatformModel, result: OptimizationResult): Promise<void> {
    // TODO: Implement actual usage logging to database
    const usageLog = {
      taskType: request.taskType,
      modelId: model.modelId,
      platformId: model.platformId,
      prompt: result.prompt,
      parameters: result.parameters,
      cost: result.estimatedCost,
      duration: 0, // Will be updated after actual API call
      success: true,
      timestamp: new Date(),
      metadata: {
        complexity: request.complexity,
        qualityRequirement: request.qualityRequirement,
        budget: request.budget
      }
    };

    console.log('DOL Usage Log:', usageLog);
  }

  /**
   * Get all available models for admin interface
   */
  public async getAllModels() {
    return modelSelector.getAllModels();
  }

  /**
   * Get all prompt templates for admin interface
   */
  public async getAllTemplates() {
    return promptConstructor.getAllTemplates();
  }

  /**
   * Update model features (for admin interface)
   */
  public async updateModelFeatures(modelId: string, features: string[]) {
    return modelSelector.updateModelFeatures(modelId, features);
  }

  /**
   * Create new prompt template (for admin interface)
   */
  public async createTemplate(template: any) {
    return promptConstructor.createTemplate(template);
  }

  /**
   * Update template quality score (for feedback loop)
   */
  public async updateTemplateScore(templateId: string, newScore: number) {
    return promptConstructor.updateTemplateScore(templateId, newScore);
  }
}

export const dol = new DynamicOptimizationLayer();
