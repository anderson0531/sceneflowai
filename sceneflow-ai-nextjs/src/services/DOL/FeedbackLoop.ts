import { APIUsageLog, PromptTemplate, PlatformModel } from '@/types/dol';

export interface FeedbackData {
  taskType: string;
  modelId: string;
  platformId: string;
  prompt: string;
  parameters: Record<string, any>;
  cost: number;
  duration: number;
  success: boolean;
  errorMessage?: string;
  userRating?: number; // 1-5 scale
  outputQuality?: number; // 1-100 scale
  metadata: Record<string, any>;
}

export interface QualityMetrics {
  modelId: string;
  platformId: string;
  averageQuality: number;
  successRate: number;
  averageCost: number;
  usageCount: number;
  lastUpdated: Date;
}

export interface TemplateMetrics {
  templateId: string;
  modelId: string;
  averageQuality: number;
  usageCount: number;
  userSatisfaction: number;
  lastUpdated: Date;
}

/**
 * Service for managing DOL feedback loop and quality optimization
 */
export class FeedbackLoop {
  private static instance: FeedbackLoop;

  private constructor() {}

  public static getInstance(): FeedbackLoop {
    if (!FeedbackLoop.instance) {
      FeedbackLoop.instance = new FeedbackLoop();
    }
    return FeedbackLoop.instance;
  }

  /**
   * Log API usage for feedback analysis
   */
  public async logUsage(feedback: FeedbackData): Promise<void> {
    try {
      // TODO: Implement actual database logging
      console.log('📊 DOL Feedback: Logging usage data:', {
        taskType: feedback.taskType,
        modelId: feedback.modelId,
        platformId: feedback.platformId,
        cost: feedback.cost,
        success: feedback.success,
        userRating: feedback.userRating,
        outputQuality: feedback.outputQuality
      });

      // Store in memory for now (will be replaced with database)
      this.storeUsageData(feedback);

    } catch (error) {
      console.error('Error logging usage data:', error);
    }
  }

  /**
   * Update template quality score based on feedback
   */
  public async updateTemplateQuality(
    templateId: string, 
    newQualityScore: number
  ): Promise<void> {
    try {
      // TODO: Implement actual database update
      console.log(`📊 DOL Feedback: Updating template ${templateId} quality to ${newQualityScore}`);

      // Update in memory for now
      this.updateTemplateScore(templateId, newQualityScore);

    } catch (error) {
      console.error('Error updating template quality:', error);
    }
  }

  /**
   * Update model performance metrics
   */
  public async updateModelMetrics(
    modelId: string, 
    platformId: string, 
    metrics: Partial<QualityMetrics>
  ): Promise<void> {
    try {
      // TODO: Implement actual database update
      console.log(`📊 DOL Feedback: Updating model ${modelId} metrics:`, metrics);

      // Update in memory for now
      this.updateModelScore(modelId, platformId, metrics);

    } catch (error) {
      console.error('Error updating model metrics:', error);
    }
  }

  /**
   * Get quality metrics for a specific model
   */
  public async getModelQualityMetrics(modelId: string, platformId: string): Promise<QualityMetrics | null> {
    // TODO: Implement actual database query
    const metrics = this.getStoredModelMetrics(modelId, platformId);
    return metrics;
  }

  /**
   * Get template quality metrics
   */
  public async getTemplateQualityMetrics(templateId: string): Promise<TemplateMetrics | null> {
    // TODO: Implement actual database query
    const metrics = this.getStoredTemplateMetrics(templateId);
    return metrics;
  }

  /**
   * Analyze feedback patterns and suggest improvements
   */
  public async analyzeFeedbackPatterns(): Promise<{
    topPerformingModels: QualityMetrics[];
    underperformingModels: QualityMetrics[];
    templateRecommendations: Array<{
      templateId: string;
      currentScore: number;
      suggestedImprovements: string[];
    }>;
  }> {
    // TODO: Implement actual analysis
    return {
      topPerformingModels: [],
      underperformingModels: [],
      templateRecommendations: []
    };
  }

  /**
   * Get overall DOL performance metrics
   */
  public async getDOLPerformanceMetrics(): Promise<{
    totalRequests: number;
    dolSuccessRate: number;
    averageCost: number;
    averageQuality: number;
    topModels: QualityMetrics[];
    recentTrends: Array<{
      date: string;
      successRate: number;
      averageCost: number;
      averageQuality: number;
    }>;
  }> {
    // TODO: Implement actual metrics calculation
    return {
      totalRequests: 0,
      dolSuccessRate: 0,
      averageCost: 0,
      averageQuality: 0,
      topModels: [],
      recentTrends: []
    };
  }

  // In-memory storage (temporary until database integration)
  private usageData: FeedbackData[] = [];
  private modelMetrics: Map<string, QualityMetrics> = new Map();
  private templateMetrics: Map<string, TemplateMetrics> = new Map();

  private storeUsageData(feedback: FeedbackData): void {
    this.usageData.push(feedback);
    
    // Keep only last 1000 entries to prevent memory issues
    if (this.usageData.length > 1000) {
      this.usageData = this.usageData.slice(-1000);
    }
  }

  private updateTemplateScore(templateId: string, newScore: number): void {
    const existing = this.templateMetrics.get(templateId);
    if (existing) {
      existing.averageQuality = (existing.averageQuality + newScore) / 2;
      existing.lastUpdated = new Date();
      this.templateMetrics.set(templateId, existing);
    }
  }

  private updateModelScore(modelId: string, platformId: string, metrics: Partial<QualityMetrics>): void {
    const key = `${modelId}-${platformId}`;
    const existing = this.modelMetrics.get(key);
    
    if (existing) {
      // Update existing metrics
      Object.assign(existing, metrics);
      existing.lastUpdated = new Date();
    } else {
      // Create new metrics
      const newMetrics: QualityMetrics = {
        modelId,
        platformId,
        averageQuality: metrics.averageQuality || 0,
        successRate: metrics.successRate || 0,
        averageCost: metrics.averageCost || 0,
        usageCount: metrics.usageCount || 1,
        lastUpdated: new Date()
      };
      this.modelMetrics.set(key, newMetrics);
    }
  }

  private getStoredModelMetrics(modelId: string, platformId: string): QualityMetrics | null {
    const key = `${modelId}-${platformId}`;
    return this.modelMetrics.get(key) || null;
  }

  private getStoredTemplateMetrics(templateId: string): TemplateMetrics | null {
    return this.templateMetrics.get(templateId) || null;
  }

  /**
   * Export all stored data for debugging
   */
  public exportStoredData(): {
    usageData: FeedbackData[];
    modelMetrics: QualityMetrics[];
    templateMetrics: TemplateMetrics[];
  } {
    return {
      usageData: [...this.usageData],
      modelMetrics: Array.from(this.modelMetrics.values()),
      templateMetrics: Array.from(this.templateMetrics.values())
    };
  }

  /**
   * Clear all stored data (for testing)
   */
  public clearStoredData(): void {
    this.usageData = [];
    this.modelMetrics.clear();
    this.templateMetrics.clear();
  }
}

export const feedbackLoop = FeedbackLoop.getInstance();
