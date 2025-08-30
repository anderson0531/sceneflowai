import { PlatformModel, PromptTemplate, FeatureUpdate, APIUsageLog } from '@/models';
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
        metadata: JSON.stringify(data.metadata),
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
        where: { template_id: templateId }
      });

      if (template) {
        // Calculate new quality score
        const currentScore = template.current_quality_score;
        const usageCount = template.usage_count || 0;
        
        // Weighted average based on usage count
        const newScore = usageCount > 0 
          ? (currentScore * usageCount + newQualityScore) / (usageCount + 1)
          : newQualityScore;

        await template.update({
          current_quality_score: newScore,
          usage_count: usageCount + 1,
          last_updated: new Date()
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
        where: { model_id: modelId, platform_id: platformId }
      });

      if (model) {
        // Update model performance data
        const currentRequests = model.total_requests || 0;
        const currentSuccessCount = model.success_count || 0;
        const currentTotalCost = model.total_cost || 0;
        const currentTotalDuration = model.total_duration || 0;
        const currentTotalQuality = model.total_quality || 0;
        const currentTotalRating = model.total_user_rating || 0;

        const newRequests = currentRequests + 1;
        const newSuccessCount = currentSuccessCount + (metrics.success ? 1 : 0);
        const newTotalCost = currentTotalCost + metrics.cost;
        const newTotalDuration = currentTotalDuration + metrics.duration;
        const newTotalQuality = currentTotalQuality + (metrics.quality || 0);
        const newTotalRating = currentTotalRating + (metrics.userRating || 0);

        await model.update({
          total_requests: newRequests,
          success_count: newSuccessCount,
          success_rate: newSuccessCount / newRequests,
          total_cost: newTotalCost,
          average_cost: newTotalCost / newRequests,
          total_duration: newTotalDuration,
          average_duration: newTotalDuration / newRequests,
          total_quality: newTotalQuality,
          average_quality: newTotalQuality / newRequests,
          total_user_rating: newTotalRating,
          average_user_rating: newTotalRating / newRequests,
          last_updated: new Date()
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
        attributes: [
          [APIUsageLog.sequelize.fn('AVG', APIUsageLog.sequelize.col('cost')), 'averageCost']
        ]
      });
      const averageCost = costResult ? parseFloat(costResult.get('averageCost') as string) || 0 : 0;

      // Get average quality
      const qualityResult = await APIUsageLog.findOne({
        attributes: [
          [APIUsageLog.sequelize.fn('AVG', APIUsageLog.sequelize.col('output_quality')), 'averageQuality']
        ],
        where: { output_quality: { [APIUsageLog.sequelize.Op.not]: null } }
      });
      const averageQuality = qualityResult ? parseFloat(qualityResult.get('averageQuality') as string) || 0 : 0;

      // Get top models by usage
      const topModelsResult = await APIUsageLog.findAll({
        attributes: [
          'model_id',
          [APIUsageLog.sequelize.fn('COUNT', APIUsageLog.sequelize.col('id')), 'usage'],
          [APIUsageLog.sequelize.fn('AVG', APIUsageLog.sequelize.col('success')), 'successRate']
        ],
        group: ['model_id'],
        order: [[APIUsageLog.sequelize.fn('COUNT', APIUsageLog.sequelize.col('id')), 'DESC']],
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
          [APIUsageLog.sequelize.fn('DATE', APIUsageLog.sequelize.col('timestamp')), 'date'],
          [APIUsageLog.sequelize.fn('COUNT', APIUsageLog.sequelize.col('id')), 'requestCount'],
          [APIUsageLog.sequelize.fn('AVG', APIUsageLog.sequelize.col('success')), 'successRate'],
          [APIUsageLog.sequelize.fn('AVG', APIUsageLog.sequelize.col('cost')), 'averageCost'],
          [APIUsageLog.sequelize.fn('AVG', APIUsageLog.sequelize.col('output_quality')), 'averageQuality']
        ],
        where: {
          timestamp: { [APIUsageLog.sequelize.Op.gte]: sevenDaysAgo }
        },
        group: [APIUsageLog.sequelize.fn('DATE', APIUsageLog.sequelize.col('timestamp'))],
        order: [[APIUsageLog.sequelize.fn('DATE', APIUsageLog.sequelize.col('timestamp')), 'ASC']]
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
        where: { is_active: true },
        order: [['total_requests', 'DESC']]
      });

      return models.map(model => ({
        platformId: model.platform_id,
        modelId: model.model_id,
        totalRequests: model.total_requests || 0,
        successCount: model.success_count || 0,
        failureCount: (model.total_requests || 0) - (model.success_count || 0),
        averageCost: model.average_cost || 0,
        averageQuality: model.average_quality || 0,
        averageResponseTime: model.average_duration || 0,
        lastUsed: model.last_updated || new Date(),
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
        where: { is_deprecated: false },
        order: [['current_quality_score', 'DESC']]
      });

      return templates.map(template => ({
        templateId: template.template_id,
        modelId: template.model_id,
        totalUsage: template.usage_count || 0,
        averageQuality: template.current_quality_score || 0,
        userSatisfaction: template.user_satisfaction_score || 0,
        lastUpdated: template.last_updated || new Date(),
        isDeprecated: template.is_deprecated || false
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
        platformId: update.platform_id,
        modelId: update.model_id,
        feature: update.feature,
        status: update.status,
        description: update.description,
        source: update.source,
        confidence: update.confidence,
        timestamp: update.timestamp,
        metadata: update.metadata ? JSON.parse(update.metadata) : {}
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
        template_id: data.templateId,
        model_id: data.modelId,
        task_type: data.taskType,
        template_string: data.templateString,
        variables: data.variables,
        current_quality_score: 75, // Default score
        usage_count: 0,
        is_deprecated: false,
        metadata: JSON.stringify(data.metadata || {}),
        created_at: new Date(),
        last_updated: new Date()
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
        model_id: data.modelId,
        platform_id: data.platformId,
        platform_type: data.platformType,
        category: data.category,
        display_name: data.displayName,
        description: data.description,
        cost_per_unit: data.costPerUnit,
        base_performance_score: data.basePerformanceScore,
        features: data.features,
        is_byok_supported: data.isBYOKSupported,
        is_operational: data.isOperational,
        is_active: data.isActive,
        total_requests: 0,
        success_count: 0,
        success_rate: 0,
        total_cost: 0,
        average_cost: 0,
        total_duration: 0,
        average_duration: 0,
        total_quality: 0,
        average_quality: 0,
        total_user_rating: 0,
        average_user_rating: 0,
        metadata: JSON.stringify(data.metadata || {}),
        created_at: new Date(),
        last_updated: new Date()
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
        where: { model_id: modelId, platform_id: platformId }
      });

      if (model) {
        await model.update({
          features,
          last_updated: new Date()
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
      const lastRecord = await APIUsageLog.findOne({
        order: [['timestamp', 'DESC']]
      });

      return {
        isHealthy: true,
        totalRecords,
        lastUpdate: lastRecord?.timestamp || new Date(),
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
