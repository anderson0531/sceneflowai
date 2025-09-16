import { dol } from './DynamicOptimizationLayer';
import { TaskType, TaskComplexity, PlatformModel } from '@/types/dol';
import { StandardVideoRequest, StandardVideoResult } from '../ai-providers/BaseAIProviderAdapter';
import { AIProviderFactory } from '../ai-providers/AIProviderFactory';
import { AIProvider } from '../ai-providers/BaseAIProviderAdapter';

export interface DOLVideoRequest extends StandardVideoRequest {
  userId: string;
  qualityRequirement?: 'low' | 'medium' | 'high';
  budget?: number;
  byokPlatformId?: string;
  userPreferences?: Record<string, any>;
}

export interface DOLVideoResult extends StandardVideoResult {
  dolMetadata: {
    modelUsed: string;
    platformUsed: string;
    estimatedCost: number;
    expectedQuality: number;
    reasoning: string;
    optimizationApplied: boolean;
  };
}

export class DOLVideoGenerationService {
  private static instance: DOLVideoGenerationService;

  private constructor() {}

  public static getInstance(): DOLVideoGenerationService {
    if (!DOLVideoGenerationService.instance) {
      DOLVideoGenerationService.instance = new DOLVideoGenerationService();
    }
    return DOLVideoGenerationService.instance;
  }

  /**
   * Generate video using DOL optimization
   */
  public async generateVideo(request: DOLVideoRequest): Promise<DOLVideoResult> {
    try {
      console.log('🎬 DOL Video Generation: Starting optimization...');

      // Step 1: Determine task type and complexity based on request
      const { taskType, complexity } = this.analyzeVideoRequest(request);

      // Step 2: Use DOL to optimize the generation
      const dolResult = await dol.optimize({
        taskType,
        complexity,
        userInput: {
          prompt: request.prompt,
          negativePrompt: request.negative_prompt,
          aspectRatio: request.aspect_ratio,
          motionIntensity: request.motion_intensity,
          duration: request.duration,
          resolution: request.resolution,
          style: request.style,
          quality: request.quality,
          fps: request.fps,
          customSettings: request.custom_settings
        },
        byokPlatformId: request.byokPlatformId,
        userPreferences: request.userPreferences,
        budget: request.budget,
        qualityRequirement: request.qualityRequirement
      });

      if (!dolResult.success || !dolResult.result) {
        throw new Error(dolResult.error || 'DOL optimization failed');
      }

      const { result } = dolResult;
      
      console.log(`✅ DOL: Selected ${result.model.displayName} for video generation`);
      console.log(`💰 DOL: Estimated cost $${result.estimatedCost.toFixed(6)}`);
      console.log(`🎯 DOL: Expected quality ${result.expectedQuality}/100`);

      // Step 3: Execute video generation with optimized parameters
      const videoResult = await this.executeVideoGeneration(request, result);

      // Step 4: Return result with DOL metadata
      return {
        ...videoResult,
        dolMetadata: {
          modelUsed: result.model.displayName,
          platformUsed: result.model.platformId,
          estimatedCost: result.estimatedCost,
          expectedQuality: result.expectedQuality,
          reasoning: result.reasoning,
          optimizationApplied: true
        }
      };

    } catch (error) {
      console.error('❌ DOL Video Generation failed:', error);
      
      // Fallback to traditional method
      console.log('🔄 Falling back to traditional video generation...');
      return await this.fallbackVideoGeneration(request);
    }
  }

  /**
   * Analyze video request to determine DOL parameters
   */
  private analyzeVideoRequest(request: DOLVideoRequest): { taskType: TaskType; complexity: TaskComplexity } {
    let taskType: TaskType;
    let complexity: TaskComplexity;

    // Determine task type based on request parameters
    if (request.custom_settings?.imageInput) {
      taskType = TaskType.IMAGE_TO_VIDEO;
    } else if (request.custom_settings?.videoInput) {
      taskType = TaskType.VIDEO_TO_VIDEO;
    } else if (request.custom_settings?.styleTransfer) {
      taskType = TaskType.STYLE_TRANSFER;
    } else if (request.custom_settings?.motionControl) {
      taskType = TaskType.MOTION_CONTROL;
    } else {
      taskType = TaskType.TEXT_TO_VIDEO;
    }

    // Determine complexity based on quality and duration
    if (request.quality === 'ultra' || request.duration > 10) {
      complexity = TaskComplexity.HIGH;
    } else if (request.quality === 'high' || request.duration > 5) {
      complexity = TaskComplexity.MEDIUM;
    } else {
      complexity = TaskComplexity.LOW;
    }

    return { taskType, complexity };
  }

  /**
   * Execute video generation with DOL-optimized parameters
   */
  private async executeVideoGeneration(
    request: DOLVideoRequest, 
    dolResult: any
  ): Promise<StandardVideoResult> {
    const { model } = dolResult;
    
    try {
      // Map platform ID to AIProvider enum
      const providerName = this.mapPlatformToProvider(model.platformId);
      
      // Get the appropriate adapter
      const adapter = AIProviderFactory.createAdapterWithRawCredentials(providerName);
      
      // Apply DOL-optimized parameters
      const optimizedRequest: StandardVideoRequest = {
        ...request,
        prompt: dolResult.prompt,
        ...dolResult.parameters
      };

      // For now, we'll use mock credentials - in production this would come from user config
      const mockCredentials = this.getMockCredentials(providerName);
      
      // Generate video
      const result = await adapter.generate(optimizedRequest, mockCredentials);
      
      return result;

    } catch (error) {
      console.error('Error executing video generation:', error);
      throw error;
    }
  }

  /**
   * Map platform ID to AIProvider enum
   */
  private mapPlatformToProvider(platformId: string): AIProvider {
    switch (platformId.toLowerCase()) {
      case 'runwayml':
      case 'runway':
        return AIProvider.RUNWAY;
      case 'stability-ai':
      case 'stable-video':
        return AIProvider.STABILITY_AI;
      case 'google-veo':
      case 'google':
        return AIProvider.GOOGLE_VEO;
      default:
        return AIProvider.RUNWAY; // Default fallback
    }
  }

  /**
   * Get mock credentials for testing
   * TODO: Replace with actual user credentials from database
   */
  private getMockCredentials(provider: AIProvider): Record<string, any> {
    // Mock credentials for testing - in production this would be encrypted user credentials
    const mockCredentials: Record<AIProvider, Record<string, any>> = {
      [AIProvider.RUNWAY]: { apiKey: 'mock-runway-key' },
      [AIProvider.STABILITY_AI]: { apiKey: 'mock-stability-key' },
      [AIProvider.GOOGLE_VEO]: { apiKey: 'mock-google-key' }
    };

    return mockCredentials[provider] || {};
  }

  /**
   * Fallback video generation using traditional method
   */
  private async fallbackVideoGeneration(request: DOLVideoRequest): Promise<DOLVideoResult> {
    try {
      console.log('🔄 Using fallback video generation...');
      
      // Use default provider (Runway)
      const adapter = AIProviderFactory.createAdapterWithRawCredentials(AIProvider.RUNWAY);
      const mockCredentials = this.getMockCredentials(AIProvider.RUNWAY);
      
      const result = await adapter.generate(request, mockCredentials);
      
      return {
        ...result,
        dolMetadata: {
          modelUsed: 'Fallback - Runway',
          platformUsed: 'runwayml',
          estimatedCost: 0.05, // Default cost
          expectedQuality: 75, // Default quality
          reasoning: 'Fallback to traditional video generation due to DOL failure',
          optimizationApplied: false
        }
      };

    } catch (error) {
      console.error('Fallback video generation also failed:', error);
      throw error;
    }
  }

  /**
   * Get all available video generation models
   */
  public async getAvailableModels(): Promise<PlatformModel[]> {
    return dol.getAllModels();
  }

  /**
   * Get cost estimate for video generation
   */
  public async getCostEstimate(request: DOLVideoRequest): Promise<{
    estimatedCost: number;
    model: string;
    platform: string;
    reasoning: string;
  }> {
    const { taskType, complexity } = this.analyzeVideoRequest(request);
    
    const dolResult = await dol.optimize({
      taskType,
      complexity,
      userInput: {
        prompt: request.prompt,
        duration: request.duration,
        quality: request.quality
      },
      byokPlatformId: request.byokPlatformId,
      budget: request.budget,
      qualityRequirement: request.qualityRequirement
    });

    if (dolResult.success && dolResult.result) {
      return {
        estimatedCost: dolResult.result.estimatedCost,
        model: dolResult.result.model.displayName,
        platform: dolResult.result.model.platformId,
        reasoning: dolResult.result.reasoning
      };
    }

    return {
      estimatedCost: 0.05, // Default fallback cost
      model: 'Default',
      platform: 'runwayml',
      reasoning: 'Unable to determine optimal model, using default'
    };
  }
}

export const dolVideoService = DOLVideoGenerationService.getInstance();
