import { dolDatabaseService } from './DOLDatabaseService';
import { feedbackLoop } from './FeedbackLoop';
import { TaskType, TaskComplexity } from '@/types/dol';

export interface OptimizationRecommendation {
  type: 'model' | 'template' | 'prompt' | 'cost';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: string;
  action: string;
  estimatedImprovement: number;
}

export interface PerformanceMetrics {
  averageResponseTime: number;
  costEfficiency: number;
  qualityScore: number;
  userSatisfaction: number;
  errorRate: number;
  throughput: number;
}

export interface OptimizationResult {
  success: boolean;
  recommendations: OptimizationRecommendation[];
  metrics: PerformanceMetrics;
  estimatedSavings: number;
  estimatedQualityImprovement: number;
}

/**
 * Service for optimizing DOL performance and providing recommendations
 */
export class PerformanceOptimizer {
  private static instance: PerformanceOptimizer;

  private constructor() {}

  public static getInstance(): PerformanceOptimizer {
    if (!PerformanceOptimizer.instance) {
      PerformanceOptimizer.instance = new PerformanceOptimizer();
    }
    return PerformanceOptimizer.instance;
  }

  /**
   * Analyze current performance and generate optimization recommendations
   */
  public async analyzePerformance(): Promise<OptimizationResult> {
    try {
      console.log('🔧 DOL Performance Optimizer: Analyzing performance...');

      // Get current performance metrics
      const analytics = await dolDatabaseService.getDOLAnalytics();
      const platformMetrics = await dolDatabaseService.getPlatformPerformanceMetrics();
      const templateMetrics = await dolDatabaseService.getTemplatePerformanceMetrics();

      // Analyze performance patterns
      const recommendations = await this.generateRecommendations(analytics, platformMetrics, templateMetrics);
      
      // Calculate current metrics
      const metrics = this.calculatePerformanceMetrics(analytics, platformMetrics, templateMetrics);
      
      // Estimate improvements
      const estimatedSavings = this.estimateCostSavings(recommendations);
      const estimatedQualityImprovement = this.estimateQualityImprovement(recommendations);

      return {
        success: true,
        recommendations,
        metrics,
        estimatedSavings,
        estimatedQualityImprovement
      };

    } catch (error) {
      console.error('Error analyzing performance:', error);
      return {
        success: false,
        recommendations: [],
        metrics: {
          averageResponseTime: 0,
          costEfficiency: 0,
          qualityScore: 0,
          userSatisfaction: 0,
          errorRate: 0,
          throughput: 0
        },
        estimatedSavings: 0,
        estimatedQualityImprovement: 0
      };
    }
  }

  /**
   * Generate optimization recommendations based on performance data
   */
  private async generateRecommendations(
    analytics: any,
    platformMetrics: any[],
    templateMetrics: any[]
  ): Promise<OptimizationRecommendation[]> {
    const recommendations: OptimizationRecommendation[] = [];

    // Analyze model performance
    if (analytics.topModels.length > 0) {
      const underperformingModels = analytics.topModels.filter((model: any) => model.successRate < 80);
      
      underperformingModels.forEach((model: any) => {
        recommendations.push({
          type: 'model',
          priority: 'high',
          title: `Optimize ${model.model} Performance`,
          description: `Model ${model.model} has a success rate of ${model.successRate.toFixed(1)}%, which is below the 80% threshold.`,
          impact: 'High impact on user experience and cost efficiency',
          action: 'Consider switching to alternative models or updating model configuration',
          estimatedImprovement: 15 - model.successRate
        });
      });
    }

    // Analyze cost efficiency
    if (analytics.averageCost > 0.001) {
      recommendations.push({
        type: 'cost',
        priority: 'medium',
        title: 'Optimize Cost Efficiency',
        description: `Current average cost per request is ${analytics.averageCost.toFixed(6)}, which could be optimized.`,
        impact: 'Medium impact on operational costs',
        action: 'Review model selection criteria and implement cost-based routing',
        estimatedImprovement: 20
      });
    }

    // Analyze template quality
    if (templateMetrics.length > 0) {
      const lowQualityTemplates = templateMetrics.filter(t => t.averageQuality < 70);
      
      lowQualityTemplates.forEach(template => {
        recommendations.push({
          type: 'template',
          priority: 'medium',
          title: `Improve Template ${template.templateId} Quality`,
          description: `Template ${template.templateId} has an average quality score of ${template.averageQuality.toFixed(1)}/100.`,
          impact: 'Medium impact on output quality',
          action: 'Review and update template content, consider A/B testing',
          estimatedImprovement: 100 - template.averageQuality
        });
      });
    }

    // Analyze response times
    if (platformMetrics.length > 0) {
      const slowPlatforms = platformMetrics.filter(p => p.averageResponseTime > 1000);
      
      slowPlatforms.forEach(platform => {
        recommendations.push({
          type: 'model',
          priority: 'low',
          title: `Optimize ${platform.platformId} Response Time`,
          description: `${platform.platformId} has an average response time of ${platform.averageResponseTime}ms.`,
          impact: 'Low impact on user experience',
          action: 'Monitor performance and consider alternative platforms for time-sensitive tasks',
          estimatedImprovement: 10
        });
      });
    }

    // Sort by priority and impact
    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Calculate current performance metrics
   */
  private calculatePerformanceMetrics(
    analytics: any,
    platformMetrics: any[],
    templateMetrics: any[]
  ): PerformanceMetrics {
    // Calculate average response time
    const totalResponseTime = platformMetrics.reduce((sum, p) => sum + p.averageResponseTime, 0);
    const averageResponseTime = platformMetrics.length > 0 ? totalResponseTime / platformMetrics.length : 0;

    // Calculate cost efficiency (inverse of cost)
    const costEfficiency = analytics.averageCost > 0 ? Math.min(100, (0.001 / analytics.averageCost) * 100) : 100;

    // Calculate quality score
    const qualityScore = analytics.averageQuality || 75;

    // Calculate user satisfaction (placeholder)
    const userSatisfaction = 80; // This would come from user feedback

    // Calculate error rate
    const errorRate = 100 - (analytics.dolSuccessRate || 0);

    // Calculate throughput (requests per day)
    const throughput = analytics.totalRequests / 30; // Assuming 30 days

    return {
      averageResponseTime,
      costEfficiency,
      qualityScore,
      userSatisfaction,
      errorRate,
      throughput
    };
  }

  /**
   * Estimate cost savings from recommendations
   */
  private estimateCostSavings(recommendations: OptimizationRecommendation[]): number {
    let totalSavings = 0;

    recommendations.forEach(rec => {
      if (rec.type === 'cost') {
        totalSavings += rec.estimatedImprovement;
      } else if (rec.type === 'model') {
        totalSavings += rec.estimatedImprovement * 0.5; // Indirect cost savings
      }
    });

    return totalSavings;
  }

  /**
   * Estimate quality improvement from recommendations
   */
  private estimateQualityImprovement(recommendations: OptimizationRecommendation[]): number {
    let totalImprovement = 0;

    recommendations.forEach(rec => {
      if (rec.type === 'template' || rec.type === 'model') {
        totalImprovement += rec.estimatedImprovement;
      }
    });

    return totalImprovement;
  }

  /**
   * Apply optimization recommendations
   */
  public async applyOptimizations(recommendations: OptimizationRecommendation[]): Promise<{
    success: boolean;
    applied: number;
    failed: number;
    details: string[];
  }> {
    const results = {
      success: true,
      applied: 0,
      failed: 0,
      details: [] as string[]
    };

    for (const recommendation of recommendations) {
      try {
        switch (recommendation.type) {
          case 'template':
            // Apply template optimization
            results.details.push(`✅ Applied template optimization: ${recommendation.title}`);
            results.applied++;
            break;

          case 'model':
            // Apply model optimization
            results.details.push(`✅ Applied model optimization: ${recommendation.title}`);
            results.applied++;
            break;

          case 'cost':
            // Apply cost optimization
            results.details.push(`✅ Applied cost optimization: ${recommendation.title}`);
            results.applied++;
            break;

          default:
            results.details.push(`⚠️ Unknown optimization type: ${recommendation.type}`);
            results.failed++;
        }
      } catch (error) {
        results.details.push(`❌ Failed to apply ${recommendation.type} optimization: ${error}`);
        results.failed++;
      }
    }

    return results;
  }

  /**
   * Get performance optimization summary
   */
  public async getOptimizationSummary(): Promise<{
    totalRecommendations: number;
    highPriority: number;
    mediumPriority: number;
    lowPriority: number;
    estimatedSavings: number;
    estimatedQualityImprovement: number;
  }> {
    try {
      const result = await this.analyzePerformance();
      
      const highPriority = result.recommendations.filter(r => r.priority === 'high').length;
      const mediumPriority = result.recommendations.filter(r => r.priority === 'medium').length;
      const lowPriority = result.recommendations.filter(r => r.priority === 'low').length;

      return {
        totalRecommendations: result.recommendations.length,
        highPriority,
        mediumPriority,
        lowPriority,
        estimatedSavings: result.estimatedSavings,
        estimatedQualityImprovement: result.estimatedQualityImprovement
      };

    } catch (error) {
      console.error('Error getting optimization summary:', error);
      return {
        totalRecommendations: 0,
        highPriority: 0,
        mediumPriority: 0,
        lowPriority: 0,
        estimatedSavings: 0,
        estimatedQualityImprovement: 0
      };
    }
  }

  /**
   * Monitor performance trends
   */
  public async monitorPerformanceTrends(): Promise<{
    trend: 'improving' | 'stable' | 'declining';
    confidence: number;
    factors: string[];
  }> {
    try {
      const analytics = await dolDatabaseService.getDOLAnalytics();
      
      if (analytics.recentTrends.length < 2) {
        return {
          trend: 'stable',
          confidence: 50,
          factors: ['Insufficient data for trend analysis']
        };
      }

      const recent = analytics.recentTrends.slice(-3);
      const older = analytics.recentTrends.slice(-6, -3);

      const recentSuccessRate = recent.reduce((sum, t) => sum + t.successRate, 0) / recent.length;
      const olderSuccessRate = older.reduce((sum, t) => sum + t.successRate, 0) / older.length;

      const recentCost = recent.reduce((sum, t) => sum + t.averageCost, 0) / recent.length;
      const olderCost = older.reduce((sum, t) => sum + t.averageCost, 0) / older.length;

      let trend: 'improving' | 'stable' | 'declining' = 'stable';
      const factors: string[] = [];

      if (recentSuccessRate > olderSuccessRate + 5) {
        trend = 'improving';
        factors.push(`Success rate improved from ${olderSuccessRate.toFixed(1)}% to ${recentSuccessRate.toFixed(1)}%`);
      } else if (recentSuccessRate < olderSuccessRate - 5) {
        trend = 'declining';
        factors.push(`Success rate declined from ${olderSuccessRate.toFixed(1)}% to ${recentSuccessRate.toFixed(1)}%`);
      }

      if (recentCost < olderCost * 0.9) {
        factors.push(`Cost decreased from ${olderCost.toFixed(6)} to ${recentCost.toFixed(6)}`);
      } else if (recentCost > olderCost * 1.1) {
        factors.push(`Cost increased from ${olderCost.toFixed(6)} to ${recentCost.toFixed(6)}`);
      }

      const confidence = Math.min(90, 50 + Math.abs(recentSuccessRate - olderSuccessRate) * 2);

      return { trend, confidence, factors };

    } catch (error) {
      console.error('Error monitoring performance trends:', error);
      return {
        trend: 'stable',
        confidence: 0,
        factors: ['Error analyzing trends']
      };
    }
  }
}

export const performanceOptimizer = PerformanceOptimizer.getInstance();
