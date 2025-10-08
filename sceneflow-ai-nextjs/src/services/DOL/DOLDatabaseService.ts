import { PlatformModel, PromptTemplate, FeatureUpdate, APIUsageLog } from '@/models';
import { fn, col, Op } from 'sequelize';
import { TaskType, TaskComplexity, PlatformType } from '@/types/dol';

export interface DOLDatabaseMetrics {
  totalRequests: number;
  dolSuccessRate: number;
  averageCost: number;
  averageQuality: number;
  topModels: Array<{ model: string; usage: number; successRate: number }>;
  recentTrends: Array<{
    date: string;
    successRate: number;
    averageCost: number;
    averageQuality: number;
    requestCount: number;
  }>;
}

export interface PlatformPerformanceMetrics {
  platformId: string;
  modelId: string;
  totalRequests: number;
  successCount: number;
  failureCount: number;
  averageCost: number;
  averageQuality: number;
  averageResponseTime: number;
  lastUsed: Date;
  features: string[];
}

export interface TemplatePerformanceMetrics {
  templateId: string;
  modelId: string;
  totalUsage: number;
  averageQuality: number;
  userSatisfaction: number;
  lastUpdated: Date;
  isDeprecated: boolean;
}

/**
 * Service for DOL database operations and analytics
 */
export class DOLDatabaseService {
  private static instance: DOLDatabaseService;

  private constructor() {}

  public static getInstance(): DOLDatabaseService {
    if (!DOLDatabaseService.instance) {
      DOLDatabaseService.instance = new DOLDatabaseService();
    }
    return DOLDatabaseService.instance;
  }

  /**
   * Log API usage for analytics
   */
  public async logUsage(data: {
    taskType: TaskType;
    complexity: TaskComplexity;
    modelId: string;
    platformId: string;
    prompt: string;
    parameters: Record<string, any>;
    cost: number;
    duration: number;
    success: boolean;
    errorMessage?: string;
    userRating?: number;
    outputQuality?: number;
    metadata: Record<string, any>;
  }): Promise<void> {
    try {
      // Create usage log entry
      await APIUsageLog.create({
        task_type: data.taskType,
        complexity: data.complexity,
        model_id: data.modelId,
        platform_id: data.platformId,
        prompt: data.prompt,
        parameters: JSON.stringify(data.parameters),
        cost: data.cost,
        duration: data.duration,
        success: data.success,
        error_message: data.errorMessage,
        user_rating: data.userRating,
        output_quality: data.outputQuality,
        metadata: JSON.stringify(data.metadata || {}),
        timestamp: new Date()
      });

      console.log('📊 DOL Database: Usage logged successfully');
    } catch (error) {
      console.error('Error logging usage to database:', error);
    }
  }

  /**
   * Update template quality score based on feedback
   */
  public async updateTemplateQuality(
    templateId: string, 
    newQualityScore: number,
    userRating?: number
  ): Promise<void> {
    try {
      const template = await PromptTemplate.findOne({
        where: { templateId }
      });

      if (template) {
        // Calculate new quality score
        const currentScore = template.currentQualityScore;
        const usageCount = template.usageCount || 0;
        
        // Weighted average based on usage count
        const newScore = usageCount > 0 
          ? (currentScore * usageCount + newQualityScore) / (usageCount + 1)
          : newQualityScore;

        await template.update({
          currentQualityScore: newScore,
          usageCount: usageCount + 1
        });

        console.log(`📊 DOL Database: Template ${templateId} quality updated to ${newScore.toFixed(2)}`);
      }
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
    metrics: {
      success: boolean;
      cost: number;
      duration: number;
      quality?: number;
      userRating?: number;
    }
  ): Promise<void> {
    try {
      const model = await PlatformModel.findOne({
        where: { modelId, platformId }
      });

      if (model) {
        // Update model performance data
        const currentRequests = model.totalRequests || 0;
        const currentSuccessCount = model.successCount || 0;
        const currentTotalCost = Number(model.totalCost) || 0;
        const currentTotalDuration = model.totalDuration || 0;
        const currentTotalQuality = model.totalQuality || 0;
        const currentTotalRating = model.totalUserRating || 0;

        const newRequests = currentRequests + 1;
        const newSuccessCount = currentSuccessCount + (metrics.success ? 1 : 0);
        const newTotalCost = currentTotalCost + metrics.cost;
        const newTotalDuration = currentTotalDuration + metrics.duration;
        const newTotalQuality = currentTotalQuality + (metrics.quality || 0);
        const newTotalRating = currentTotalRating + (metrics.userRating || 0);

        await model.update({
          totalRequests: newRequests,
          successCount: newSuccessCount,
          successRate: newSuccessCount / newRequests,
          totalCost: newTotalCost,
          averageCost: newTotalCost / newRequests,
          totalDuration: newTotalDuration,
          averageDuration: newTotalDuration / newRequests,
          totalQuality: newTotalQuality,
          averageQuality: newTotalQuality / newRequests,
          totalUserRating: newTotalRating,
          averageUserRating: newTotalRating / newRequests,
          lastUpdated: new Date()
        });

        console.log(`📊 DOL Database: Model ${modelId} metrics updated`);
      }
    } catch (error) {
      console.error('Error updating model metrics:', error);
    }
  }

  /**
   * Get comprehensive DOL analytics
   */
  public async getDOLAnalytics(): Promise<DOLDatabaseMetrics> {
    try {
      // Get total requests
      const totalRequests = await APIUsageLog.count();

      // Get success rate
      const successCount = await APIUsageLog.count({
        where: { success: true }
      });
      const dolSuccessRate = totalRequests > 0 ? (successCount / totalRequests) * 100 : 0;

      // Get average cost
      const costResult = await APIUsageLog.findOne({
        attributes: [[fn('AVG', col('cost')), 'averageCost']]
      });
      const averageCost = costResult ? parseFloat(costResult.get('averageCost') as string) || 0 : 0;

      // Get average quality
      const qualityResult = await APIUsageLog.findOne({
        attributes: [[fn('AVG', col('output_quality')), 'averageQuality']],
        where: { output_quality: { [Op.not]: null } }
      });
      const averageQuality = qualityResult ? parseFloat(qualityResult.get('averageQuality') as string) || 0 : 0;

      // Get top models by usage
      const topModelsResult = await APIUsageLog.findAll({
        attributes: [
          'model_id',
          [fn('COUNT', col('id')), 'usage'],
          [fn('AVG', col('success')), 'successRate']
        ],
        group: ['model_id'],
        order: [[fn('COUNT', col('id')), 'DESC']],
        limit: 10
      });

      const topModels = topModelsResult.map(result => ({
        model: result.get('model_id') as string,
        usage: parseInt(result.get('usage') as string),
        successRate: parseFloat(result.get('successRate') as string) * 100
      }));

      // Get recent trends (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const trendsResult = await APIUsageLog.findAll({
        attributes: [
          [fn('DATE', col('timestamp')), 'date'],
          [fn('COUNT', col('id')), 'requestCount'],
          [fn('AVG', col('success')), 'successRate'],
          [fn('AVG', col('cost')), 'averageCost'],
          [fn('AVG', col('output_quality')), 'averageQuality']
        ],
        where: { timestamp: { [Op.gte]: sevenDaysAgo } },
        group: [fn('DATE', col('timestamp'))],
        order: [[fn('DATE', col('timestamp')), 'ASC']]
      });

      const recentTrends = trendsResult.map(result => ({
        date: result.get('date') as string,
        requestCount: parseInt(result.get('requestCount') as string),
        successRate: parseFloat(result.get('successRate') as string) * 100,
        averageCost: parseFloat(result.get('averageCost') as string) || 0,
        averageQuality: parseFloat(result.get('averageQuality') as string) || 0
      }));

      return {
        totalRequests,
        dolSuccessRate,
        averageCost,
        averageQuality,
        topModels,
        recentTrends
      };

    } catch (error) {
      console.error('Error getting DOL analytics:', error);
      return {
        totalRequests: 0,
        dolSuccessRate: 0,
        averageCost: 0,
        averageQuality: 0,
        topModels: [],
        recentTrends: []
      };
    }
  }

  /**
   * Get platform performance metrics
   */
  public async getPlatformPerformanceMetrics(): Promise<PlatformPerformanceMetrics[]> {
    try {
      const models = await PlatformModel.findAll({
        where: { isActive: true },
        order: [['totalRequests', 'DESC']]
      });

      return models.map(model => ({
        platformId: model.platformId,
        modelId: model.modelId,
        totalRequests: model.totalRequests || 0,
        successCount: model.successCount || 0,
        failureCount: (model.totalRequests || 0) - (model.successCount || 0),
        averageCost: Number(model.averageCost) || 0,
        averageQuality: Number(model.averageQuality) || 0,
        averageResponseTime: Number(model.averageDuration) || 0,
        lastUsed: model.lastUpdated || new Date(),
        features: model.features || []
      }));

    } catch (error) {
      console.error('Error getting platform performance metrics:', error);
      return [];
    }
  }

  /**
   * Get template performance metrics
   */
  public async getTemplatePerformanceMetrics(): Promise<TemplatePerformanceMetrics[]> {
    try {
      const templates = await PromptTemplate.findAll({
        where: { isDeprecated: false },
        order: [['currentQualityScore', 'DESC']]
      });

      return templates.map(template => ({
        templateId: template.templateId,
        modelId: template.modelId,
        totalUsage: template.usageCount || 0,
        averageQuality: template.currentQualityScore || 0,
        userSatisfaction: template.userSatisfaction || 0,
        lastUpdated: template.updatedAt || new Date(),
        isDeprecated: template.isDeprecated || false
      }));

    } catch (error) {
      console.error('Error getting template performance metrics:', error);
      return [];
    }
  }

  /**
   * Get recent feature updates
   */
  public async getRecentFeatureUpdates(limit: number = 10): Promise<FeatureUpdate[]> {
    try {
      const updates = await FeatureUpdate.findAll({
        order: [['timestamp', 'DESC']],
        limit
      });

      return updates.map(update => ({
        id: update.id,
        platformId: update.platformId,
        modelId: update.modelId,
        feature: update.feature,
        status: update.status,
        description: update.description,
        source: update.source,
        confidence: update.confidence,
        timestamp: update.get('timestamp') as Date,
        metadata: update.metadata || {}
      }));

    } catch (error) {
      console.error('Error getting recent feature updates:', error);
      return [];
    }
  }

  /**
   * Create new prompt template
   */
  public async createPromptTemplate(data: {
    templateId: string;
    modelId: string;
    taskType: TaskType;
    templateString: string;
    variables: string[];
    metadata?: Record<string, any>;
  }): Promise<PromptTemplate> {
    try {
      const template = await PromptTemplate.create({
        templateId: data.templateId,
        modelId: data.modelId,
        taskType: data.taskType,
        templateString: data.templateString,
        variables: data.variables,
        currentQualityScore: 75,
        usageCount: 0,
        isDeprecated: false,
        metadata: data.metadata || {},
      });

      console.log(`📊 DOL Database: Template ${data.templateId} created successfully`);
      return template;

    } catch (error) {
      console.error('Error creating prompt template:', error);
      throw error;
    }
  }

  /**
   * Create new platform model
   */
  public async createPlatformModel(data: {
    modelId: string;
    platformId: string;
    platformType: PlatformType;
    category: string;
    displayName: string;
    description: string;
    costPerUnit: number;
    basePerformanceScore: number;
    features: string[];
    isBYOKSupported: boolean;
    isOperational: boolean;
    isActive: boolean;
    metadata?: Record<string, any>;
  }): Promise<PlatformModel> {
    try {
      const model = await PlatformModel.create({
        modelId: data.modelId,
        platformId: data.platformId,
        platformType: data.platformType,
        category: data.category,
        displayName: data.displayName,
        description: data.description,
        costPerUnit: data.costPerUnit,
        basePerformanceScore: data.basePerformanceScore,
        features: data.features,
        isBYOKSupported: data.isBYOKSupported,
        isOperational: data.isOperational,
        isActive: data.isActive,
        totalRequests: 0,
        successCount: 0,
        successRate: 0,
        totalCost: 0,
        averageCost: 0,
        totalDuration: 0,
        averageDuration: 0,
        totalQuality: 0,
        averageQuality: 0,
        totalUserRating: 0,
        averageUserRating: 0,
        metadata: data.metadata || {},
      });

      console.log(`📊 DOL Database: Model ${data.modelId} created successfully`);
      return model;

    } catch (error) {
      console.error('Error creating platform model:', error);
      throw error;
    }
  }

  /**
   * Update model features
   */
  public async updateModelFeatures(
    modelId: string, 
    platformId: string, 
    features: string[]
  ): Promise<void> {
    try {
      const model = await PlatformModel.findOne({
        where: { modelId, platformId }
      });

      if (model) {
        await model.update({
          features,
          lastUpdated: new Date()
        });

        console.log(`📊 DOL Database: Model ${modelId} features updated`);
      }
    } catch (error) {
      console.error('Error updating model features:', error);
    }
  }

  /**
   * Get database health status
   */
  public async getDatabaseHealth(): Promise<{
    isHealthy: boolean;
    totalRecords: number;
    lastUpdate: Date;
    errorCount: number;
  }> {
    try {
      const totalRecords = await APIUsageLog.count();
      const lastRecord = await APIUsageLog.findOne({ order: [['timestamp', 'DESC']] });

      return {
        isHealthy: true,
        totalRecords,
        lastUpdate: (lastRecord?.get('timestamp') as Date) || new Date(),
        errorCount: 0
      };

    } catch (error) {
      console.error('Database health check failed:', error);
      return {
        isHealthy: false,
        totalRecords: 0,
        lastUpdate: new Date(),
        errorCount: 1
      };
    }
  }
}

export const dolDatabaseService = DOLDatabaseService.getInstance();
