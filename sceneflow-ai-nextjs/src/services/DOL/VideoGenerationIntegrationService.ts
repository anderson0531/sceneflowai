import { dol } from './DynamicOptimizationLayer';
import { feedbackLoop } from './FeedbackLoop';
import { TaskType, TaskComplexity } from '@/types/dol';
import { UserProviderConfig } from '@/models/UserProviderConfig';
import { EncryptionService } from '@/services/EncryptionService';
import { AsyncJobManager } from '@/services/AsyncJobManager';

export interface VideoGenerationRequest {
  sceneDirections: Array<{
    scene_number: number;
    video_clip_prompt: string;
    duration: number;
    strength_rating: number;
  }>;
  userId: string;
  projectId: string;
  projectContext: {
    title: string;
    genre: string;
    tone: string;
    targetAudience: string;
  };
  generationSettings: {
    quality: '1080p' | '4K' | '8K';
    format: 'mp4' | 'mov' | 'webm';
    aspectRatio: '16:9' | '9:16' | '1:1' | '4:3';
    frameRate: '24' | '30' | '60';
  };
}

export interface VideoGenerationResponse {
  success: boolean;
  generationId?: string;
  clips?: Array<{
    scene_number: number;
    clip_id: string;
    status: 'queued' | 'rendering' | 'done' | 'failed';
    progress?: number;
    estimated_completion?: Date;
    error?: string;
  }>;
  error?: string;
  metadata?: {
    totalClips: number;
    estimatedTotalDuration: number;
    provider: string;
    generationStartedAt: Date;
    dolMetadata?: {
      modelUsed: string;
      platformUsed: string;
      estimatedCost: number;
      expectedQuality: number;
      reasoning: string;
      optimizationApplied: boolean;
    };
  };
}

export interface DOLVideoClip {
  scene_number: number;
  video_clip_prompt: string;
  duration: number;
  strength_rating: number;
  dolOptimization?: {
    model: string;
    platform: string;
    estimatedCost: number;
    expectedQuality: number;
    reasoning: string;
  };
}

/**
 * Service for integrating DOL with video generation workflow
 */
export class VideoGenerationIntegrationService {
  private static instance: VideoGenerationIntegrationService;

  private constructor() {}

  public static getInstance(): VideoGenerationIntegrationService {
    if (!VideoGenerationIntegrationService.instance) {
      VideoGenerationIntegrationService.instance = new VideoGenerationIntegrationService();
    }
    return VideoGenerationIntegrationService.instance;
  }

  /**
   * Generate video using DOL optimization
   */
  public async generateVideo(request: VideoGenerationRequest): Promise<VideoGenerationResponse> {
    const startTime = Date.now();
    let success = false;
    let errorMessage: string | undefined;

    try {
      console.log('🎬 DOL Video Generation: Starting optimization...');

      // Step 1: Use DOL to optimize each scene
      const optimizedScenes = await this.optimizeScenesWithDOL(request);

      // Step 2: Get user's BYOK configuration
      const userConfig = await this.getUserVideoProvider(request.userId);
      if (!userConfig) {
        throw new Error('No valid video generation provider configured. Please set up BYOK integration.');
      }

      // Step 3: Create generation job with DOL optimization
      const generationId = await this.createGenerationJob(request, optimizedScenes, userConfig);

      // Step 4: Log successful generation for feedback loop
      await this.logVideoGeneration({
        taskType: TaskType.TEXT_TO_VIDEO,
        modelId: userConfig.provider_name,
        platformId: userConfig.provider_name.toLowerCase(),
        prompt: request.sceneDirections.map(s => s.video_clip_prompt).join(' | '),
        parameters: {
          quality: request.generationSettings.quality,
          aspectRatio: request.generationSettings.aspectRatio,
          frameRate: request.generationSettings.frameRate,
          totalDuration: request.sceneDirections.reduce((sum, s) => sum + s.duration, 0)
        },
        cost: this.estimateTotalCost(optimizedScenes),
        duration: Date.now() - startTime,
        success: true,
        metadata: {
          projectId: request.projectId,
          sceneCount: request.sceneDirections.length,
          dolOptimization: true
        }
      });

      success = true;

      return {
        success: true,
        generationId,
        clips: request.sceneDirections.map((scene, index) => ({
          scene_number: scene.scene_number,
          clip_id: `${generationId}-scene-${index + 1}`,
          status: 'queued' as const,
          progress: 0
        })),
        metadata: {
          totalClips: request.sceneDirections.length,
          estimatedTotalDuration: request.sceneDirections.reduce((sum, s) => sum + s.duration, 0),
          provider: userConfig.provider_name,
          generationStartedAt: new Date(),
          dolMetadata: {
            modelUsed: userConfig.provider_name,
            platformUsed: userConfig.provider_name.toLowerCase(),
            estimatedCost: this.estimateTotalCost(optimizedScenes),
            expectedQuality: this.calculateExpectedQuality(request.generationSettings),
            reasoning: 'DOL-optimized video generation with intelligent platform selection',
            optimizationApplied: true
          }
        }
      };

    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ DOL Video Generation failed:', error);

      // Log failed generation for feedback loop
      await this.logVideoGeneration({
        taskType: TaskType.TEXT_TO_VIDEO,
        modelId: 'unknown',
        platformId: 'unknown',
        prompt: request.sceneDirections.map(s => s.video_clip_prompt).join(' | '),
        parameters: {},
        cost: 0,
        duration: Date.now() - startTime,
        success: false,
        errorMessage,
        metadata: { fallback: true }
      });

      // Fallback to traditional method
      return await this.fallbackToTraditional(request);
    }
  }

  /**
   * Use DOL to optimize each scene for video generation
   */
  private async optimizeScenesWithDOL(request: VideoGenerationRequest): Promise<DOLVideoClip[]> {
    const optimizedScenes: DOLVideoClip[] = [];

    for (const scene of request.sceneDirections) {
      try {
        // Determine task complexity based on scene requirements
        const complexity = this.analyzeSceneComplexity(scene, request.generationSettings);
        const taskType = this.determineVideoTaskType(scene, request.generationSettings);

        // Use DOL to optimize the scene
        const dolResult = await dol.optimize({
          taskType,
          complexity,
          userInput: {
            prompt: scene.video_clip_prompt,
            duration: scene.duration,
            strength_rating: scene.strength_rating,
            quality: request.generationSettings.quality,
            aspectRatio: request.generationSettings.aspectRatio,
            frameRate: request.generationSettings.frameRate,
            genre: request.projectContext.genre,
            tone: request.projectContext.tone,
            targetAudience: request.projectContext.targetAudience
          },
          userPreferences: {
            quality: request.generationSettings.quality === '8K' ? 'high' : 'medium',
            costOptimization: complexity === TaskComplexity.LOW
          }
        });

        if (dolResult.success && dolResult.result) {
          const { result } = dolResult;
          
          console.log(`✅ DOL: Optimized scene ${scene.scene_number} with ${result.model.displayName}`);
          
          optimizedScenes.push({
            ...scene,
            dolOptimization: {
              model: result.model.displayName,
              platform: result.model.platformId,
              estimatedCost: result.estimatedCost,
              expectedQuality: result.expectedQuality,
              reasoning: result.reasoning
            }
          });
        } else {
          // Fallback to original scene if DOL fails
          optimizedScenes.push(scene);
        }

      } catch (error) {
        console.warn(`DOL optimization failed for scene ${scene.scene_number}, using original:`, error);
        optimizedScenes.push(scene);
      }
    }

    return optimizedScenes;
  }

  /**
   * Analyze scene complexity for DOL optimization
   */
  private analyzeSceneComplexity(scene: any, settings: any): TaskComplexity {
    let complexity = TaskComplexity.MEDIUM;

    // High complexity factors
    if (settings.quality === '8K') complexity = TaskComplexity.HIGH;
    if (scene.duration > 10) complexity = TaskComplexity.HIGH;
    if (scene.strength_rating > 8) complexity = TaskComplexity.HIGH;
    if (settings.frameRate === '60') complexity = TaskComplexity.HIGH;

    // Low complexity factors
    if (settings.quality === '1080p') complexity = TaskComplexity.LOW;
    if (scene.duration < 3) complexity = TaskComplexity.LOW;
    if (scene.strength_rating < 4) complexity = TaskComplexity.LOW;

    return complexity;
  }

  /**
   * Determine video task type for DOL
   */
  private determineVideoTaskType(scene: any, settings: any): TaskType {
    // Check for special video generation types
    if (scene.video_clip_prompt.includes('style transfer') || 
        scene.video_clip_prompt.includes('artistic')) {
      return TaskType.STYLE_TRANSFER;
    }
    
    if (scene.video_clip_prompt.includes('motion control') || 
        scene.video_clip_prompt.includes('camera movement')) {
      return TaskType.MOTION_CONTROL;
    }

    // Default to text-to-video
    return TaskType.TEXT_TO_VIDEO;
  }

  /**
   * Get user's video generation provider configuration
   */
  private async getUserVideoProvider(userId: string): Promise<UserProviderConfig | null> {
    try {
      // Check for RunwayML first (preferred)
      let config = await UserProviderConfig.findOne({
        where: {
          user_id: userId,
          provider_name: 'RUNWAY_ML',
          is_valid: true
        }
      });

      // Fallback to Stability AI if RunwayML not available
      if (!config) {
        config = await UserProviderConfig.findOne({
          where: {
            user_id: userId,
            provider_name: 'STABILITY_AI',
            is_valid: true
          }
        });
      }

      // Fallback to Google Veo if others not available
      if (!config) {
        config = await UserProviderConfig.findOne({
          where: {
            user_id: userId,
            provider_name: 'GOOGLE_VEO',
            is_valid: true
          }
        });
      }

      return config;
    } catch (error) {
      console.error('Error getting user video provider:', error);
      return null;
    }
  }

  /**
   * Create generation job with DOL optimization
   */
  private async createGenerationJob(
    request: VideoGenerationRequest, 
    optimizedScenes: DOLVideoClip[], 
    userConfig: UserProviderConfig
  ): Promise<string> {
    try {
      // Create async job for video generation
      const jobId = await AsyncJobManager.createJob({
        type: 'video_generation',
        userId: request.userId,
        projectId: request.projectId,
        status: 'queued',
        metadata: {
          scenes: optimizedScenes,
          settings: request.generationSettings,
          provider: userConfig.provider_name,
          dolOptimization: true
        }
      });

      return jobId;
    } catch (error) {
      console.error('Error creating generation job:', error);
      throw new Error('Failed to create video generation job');
    }
  }

  /**
   * Estimate total cost for all scenes
   */
  private estimateTotalCost(optimizedScenes: DOLVideoClip[]): number {
    return optimizedScenes.reduce((total, scene) => {
      return total + (scene.dolOptimization?.estimatedCost || 0.05); // Default cost if no DOL data
    }, 0);
  }

  /**
   * Calculate expected quality based on generation settings
   */
  private calculateExpectedQuality(settings: any): number {
    let quality = 75; // Base quality

    if (settings.quality === '4K') quality += 10;
    if (settings.quality === '8K') quality += 20;
    if (settings.frameRate === '60') quality += 5;
    if (settings.format === 'mov') quality += 5;

    return Math.min(quality, 100);
  }

  /**
   * Log video generation for feedback loop
   */
  private async logVideoGeneration(data: {
    taskType: TaskType;
    modelId: string;
    platformId: string;
    prompt: string;
    parameters: Record<string, any>;
    cost: number;
    duration: number;
    success: boolean;
    errorMessage?: string;
    metadata: Record<string, any>;
  }): Promise<void> {
    try {
      await feedbackLoop.logUsage(data);
    } catch (error) {
      console.warn('Failed to log video generation data:', error);
    }
  }

  /**
   * Fallback to traditional video generation
   */
  private async fallbackToTraditional(request: VideoGenerationRequest): Promise<VideoGenerationResponse> {
    try {
      console.log('🔄 DOL Video: Falling back to traditional method...');
      
      // Call the traditional video generation API
      const response = await fetch('/api/video/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`Traditional API error: ${response.status}`);
      }

      const data = await response.json();
      
      return {
        ...data,
        metadata: {
          ...data.metadata,
          dolMetadata: {
            modelUsed: 'Fallback - Traditional',
            platformUsed: 'unknown',
            estimatedCost: 0.05, // Default cost
            expectedQuality: 75, // Default quality
            reasoning: 'Fallback to traditional video generation due to DOL failure',
            optimizationApplied: false
          }
        }
      };

    } catch (error) {
      console.error('Traditional video generation also failed:', error);
      
      return {
        success: false,
        error: 'Video generation failed completely. Please try again later.',
        metadata: {
          totalClips: 0,
          estimatedTotalDuration: 0,
          provider: 'none',
          generationStartedAt: new Date(),
          dolMetadata: {
            modelUsed: 'Error',
            platformUsed: 'none',
            estimatedCost: 0,
            expectedQuality: 0,
            reasoning: 'Complete failure of video generation system',
            optimizationApplied: false
          }
        }
      };
    }
  }

  /**
   * Get DOL analytics for video generation
   */
  public async getVideoGenerationAnalytics(): Promise<{
    totalGenerations: number;
    dolSuccessRate: number;
    averageCost: number;
    averageQuality: number;
    topPlatforms: Array<{ platform: string; usage: number }>;
  }> {
    try {
      const metrics = await feedbackLoop.getDOLPerformanceMetrics();
      return {
        totalGenerations: metrics.totalRequests,
        dolSuccessRate: metrics.dolSuccessRate,
        averageCost: metrics.averageCost,
        averageQuality: metrics.averageQuality,
        topPlatforms: metrics.topModels.map(m => ({ platform: m.platformId, usage: m.usageCount }))
      };
    } catch (error) {
      console.error('Error getting video generation analytics:', error);
      return {
        totalGenerations: 0,
        dolSuccessRate: 0,
        averageCost: 0,
        averageQuality: 0,
        topPlatforms: []
      };
    }
  }
}

export const videoGenerationIntegrationService = VideoGenerationIntegrationService.getInstance();
