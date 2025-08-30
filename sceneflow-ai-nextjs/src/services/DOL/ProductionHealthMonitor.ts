import { getDOLConfig } from '@/config/dol-production';
import { dolDatabaseService } from './DOLDatabaseService';
import { featureMonitor } from './FeatureMonitor';
import { performanceOptimizer } from './PerformanceOptimizer';

export interface HealthStatus {
  overall: 'healthy' | 'warning' | 'critical';
  components: {
    database: HealthComponent;
    api: HealthComponent;
    monitoring: HealthComponent;
    optimization: HealthComponent;
    featureDetection: HealthComponent;
  };
  metrics: {
    uptime: number;
    totalRequests: number;
    errorRate: number;
    averageResponseTime: number;
    costEfficiency: number;
  };
  alerts: HealthAlert[];
  lastUpdated: Date;
}

export interface HealthComponent {
  status: 'healthy' | 'warning' | 'critical';
  message: string;
  lastCheck: Date;
  responseTime: number;
}

export interface HealthAlert {
  id: string;
  level: 'info' | 'warning' | 'critical';
  component: string;
  message: string;
  timestamp: Date;
  acknowledged: boolean;
}

/**
 * Production health monitoring service for DOL
 */
export class ProductionHealthMonitor {
  private static instance: ProductionHealthMonitor;
  private config = getDOLConfig();
  private alerts: HealthAlert[] = [];
  private startTime = Date.now();

  private constructor() {}

  public static getInstance(): ProductionHealthMonitor {
    if (!ProductionHealthMonitor.instance) {
      ProductionHealthMonitor.instance = new ProductionHealthMonitor();
    }
    return ProductionHealthMonitor.instance;
  }

  /**
   * Perform comprehensive health check
   */
  public async performHealthCheck(): Promise<HealthStatus> {
    console.log('🏥 DOL Production Health Monitor: Starting health check...');

    const startTime = Date.now();
    
    try {
      // Check database health
      const databaseHealth = await this.checkDatabaseHealth();
      
      // Check API health
      const apiHealth = await this.checkAPIHealth();
      
      // Check monitoring health
      const monitoringHealth = await this.checkMonitoringHealth();
      
      // Check optimization health
      const optimizationHealth = await this.checkOptimizationHealth();
      
      // Check feature detection health
      const featureDetectionHealth = await this.checkFeatureDetectionHealth();
      
      // Calculate overall health
      const overallHealth = this.calculateOverallHealth([
        databaseHealth,
        apiHealth,
        monitoringHealth,
        optimizationHealth,
        featureDetectionHealth
      ]);

      // Get performance metrics
      const metrics = await this.getPerformanceMetrics();
      
      // Generate health status
      const healthStatus: HealthStatus = {
        overall: overallHealth,
        components: {
          database: databaseHealth,
          api: apiHealth,
          monitoring: monitoringHealth,
          optimization: optimizationHealth,
          featureDetection: featureDetectionHealth
        },
        metrics,
        alerts: this.alerts.filter(alert => !alert.acknowledged),
        lastUpdated: new Date()
      };

      const responseTime = Date.now() - startTime;
      console.log(`✅ DOL Health Check Complete: ${overallHealth.toUpperCase()} (${responseTime}ms)`);

      return healthStatus;

    } catch (error) {
      console.error('❌ DOL Health Check Failed:', error);
      
      return {
        overall: 'critical',
        components: {
          database: { status: 'critical', message: 'Health check failed', lastCheck: new Date(), responseTime: 0 },
          api: { status: 'critical', message: 'Health check failed', lastCheck: new Date(), responseTime: 0 },
          monitoring: { status: 'critical', message: 'Health check failed', lastCheck: new Date(), responseTime: 0 },
          optimization: { status: 'critical', message: 'Health check failed', lastCheck: new Date(), responseTime: 0 },
          featureDetection: { status: 'critical', message: 'Health check failed', lastCheck: new Date(), responseTime: 0 }
        },
        metrics: {
          uptime: 0,
          totalRequests: 0,
          errorRate: 1,
          averageResponseTime: 0,
          costEfficiency: 0
        },
        alerts: [{
          id: Date.now().toString(),
          level: 'critical',
          component: 'health-monitor',
          message: 'Health check failed: ' + (error instanceof Error ? error.message : 'Unknown error'),
          timestamp: new Date(),
          acknowledged: false
        }],
        lastUpdated: new Date()
      };
    }
  }

  /**
   * Check database health
   */
  private async checkDatabaseHealth(): Promise<HealthComponent> {
    const startTime = Date.now();
    
    try {
      const dbHealth = await dolDatabaseService.getDatabaseHealth();
      const responseTime = Date.now() - startTime;
      
      if (dbHealth.isHealthy) {
        return {
          status: 'healthy',
          message: `Database healthy - ${dbHealth.totalRecords} records`,
          lastCheck: new Date(),
          responseTime
        };
      } else {
        return {
          status: 'critical',
          message: `Database unhealthy - ${dbHealth.errorCount} errors`,
          lastCheck: new Date(),
          responseTime
        };
      }
    } catch (error) {
      return {
        status: 'critical',
        message: 'Database connection failed',
        lastCheck: new Date(),
        responseTime: Date.now() - startTime
      };
    }
  }

  /**
   * Check API health
   */
  private async checkAPIHealth(): Promise<HealthComponent> {
    const startTime = Date.now();
    
    try {
      // Test DOL optimize endpoint
      const response = await fetch('/api/dol/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskType: 'STORY_ANALYSIS',
          complexity: 'LOW',
          userInput: { test: true },
          userPreferences: { quality: 'medium', costOptimization: true }
        })
      });
      
      const responseTime = Date.now() - startTime;
      
      if (response.ok) {
        return {
          status: 'healthy',
          message: 'API endpoints responding correctly',
          lastCheck: new Date(),
          responseTime
        };
      } else {
        return {
          status: 'warning',
          message: `API responded with status ${response.status}`,
          lastCheck: new Date(),
          responseTime
        };
      }
    } catch (error) {
      return {
        status: 'critical',
        message: 'API health check failed',
        lastCheck: new Date(),
        responseTime: Date.now() - startTime
      };
    }
  }

  /**
   * Check monitoring health
   */
  private async checkMonitoringHealth(): Promise<HealthComponent> {
    const startTime = Date.now();
    
    try {
      const platformHealth = featureMonitor.getAllPlatformHealth();
      const responseTime = Date.now() - startTime;
      
      const healthyPlatforms = platformHealth.filter(p => p.isHealthy).length;
      const totalPlatforms = platformHealth.length;
      
      if (healthyPlatforms === totalPlatforms) {
        return {
          status: 'healthy',
          message: `All ${totalPlatforms} platforms healthy`,
          lastCheck: new Date(),
          responseTime
        };
      } else if (healthyPlatforms >= totalPlatforms * 0.8) {
        return {
          status: 'warning',
          message: `${healthyPlatforms}/${totalPlatforms} platforms healthy`,
          lastCheck: new Date(),
          responseTime
        };
      } else {
        return {
          status: 'critical',
          message: `${healthyPlatforms}/${totalPlatforms} platforms healthy`,
          lastCheck: new Date(),
          responseTime
        };
      }
    } catch (error) {
      return {
        status: 'critical',
        message: 'Monitoring health check failed',
        lastCheck: new Date(),
        responseTime: Date.now() - startTime
      };
    }
  }

  /**
   * Check optimization health
   */
  private async checkOptimizationHealth(): Promise<HealthComponent> {
    const startTime = Date.now();
    
    try {
      const summary = await performanceOptimizer.getOptimizationSummary();
      const responseTime = Date.now() - startTime;
      
      if (summary.totalRecommendations === 0) {
        return {
          status: 'healthy',
          message: 'No optimization recommendations needed',
          lastCheck: new Date(),
          responseTime
        };
      } else if (summary.highPriority === 0) {
        return {
          status: 'healthy',
          message: `${summary.totalRecommendations} optimization recommendations available`,
          lastCheck: new Date(),
          responseTime
        };
      } else {
        return {
          status: 'warning',
          message: `${summary.highPriority} high-priority optimizations needed`,
          lastCheck: new Date(),
          responseTime
        };
      }
    } catch (error) {
      return {
        status: 'critical',
        message: 'Optimization health check failed',
        lastCheck: new Date(),
        responseTime: Date.now() - startTime
      };
    }
  }

  /**
   * Check feature detection health
   */
  private async checkFeatureDetectionHealth(): Promise<HealthComponent> {
    const startTime = Date.now();
    
    try {
      const featureUpdates = featureMonitor.getRecentFeatureUpdates();
      const responseTime = Date.now() - startTime;
      
      if (featureUpdates.length > 0) {
        return {
          status: 'healthy',
          message: `${featureUpdates.length} recent feature updates detected`,
          lastCheck: new Date(),
          responseTime
        };
      } else {
        return {
          status: 'healthy',
          message: 'Feature detection working correctly',
          lastCheck: new Date(),
          responseTime
        };
      }
    } catch (error) {
      return {
        status: 'critical',
        message: 'Feature detection health check failed',
        lastCheck: new Date(),
        responseTime: Date.now() - startTime
      };
    }
  }

  /**
   * Calculate overall health status
   */
  private calculateOverallHealth(components: HealthComponent[]): 'healthy' | 'warning' | 'critical' {
    const criticalCount = components.filter(c => c.status === 'critical').length;
    const warningCount = components.filter(c => c.status === 'warning').length;
    
    if (criticalCount > 0) return 'critical';
    if (warningCount > 0) return 'warning';
    return 'healthy';
  }

  /**
   * Get performance metrics
   */
  private async getPerformanceMetrics() {
    try {
      const analytics = await dolDatabaseService.getDOLAnalytics();
      
      return {
        uptime: Date.now() - this.startTime,
        totalRequests: analytics.totalRequests,
        errorRate: 1 - (analytics.dolSuccessRate / 100),
        averageResponseTime: 500, // Placeholder - would come from actual metrics
        costEfficiency: Math.min(100, (0.001 / analytics.averageCost) * 100)
      };
    } catch (error) {
      return {
        uptime: Date.now() - this.startTime,
        totalRequests: 0,
        errorRate: 1,
        averageResponseTime: 0,
        costEfficiency: 0
      };
    }
  }

  /**
   * Add health alert
   */
  public addAlert(alert: Omit<HealthAlert, 'id' | 'timestamp'>): void {
    const newAlert: HealthAlert = {
      ...alert,
      id: Date.now().toString(),
      timestamp: new Date()
    };
    
    this.alerts.push(newAlert);
    
    // Log critical alerts
    if (alert.level === 'critical') {
      console.error(`🚨 CRITICAL ALERT: ${alert.component} - ${alert.message}`);
    }
  }

  /**
   * Acknowledge alert
   */
  public acknowledgeAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
    }
  }

  /**
   * Get system status summary
   */
  public getSystemStatus(): {
    status: string;
    uptime: string;
    components: number;
    alerts: number;
  } {
    const uptimeMs = Date.now() - this.startTime;
    const uptimeHours = Math.floor(uptimeMs / (1000 * 60 * 60));
    const uptimeMinutes = Math.floor((uptimeMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return {
      status: 'OPERATIONAL',
      uptime: `${uptimeHours}h ${uptimeMinutes}m`,
      components: 5,
      alerts: this.alerts.filter(a => !a.acknowledged).length
    };
  }

  /**
   * Start automated health monitoring
   */
  public startAutomatedMonitoring(): void {
    if (!this.config.monitoring.enabled) return;
    
    console.log('🤖 DOL Production Health Monitor: Starting automated monitoring...');
    
    // Run health check every 5 minutes
    setInterval(async () => {
      const healthStatus = await this.performHealthCheck();
      
      // Check for critical issues
      if (healthStatus.overall === 'critical') {
        this.addAlert({
          level: 'critical',
          component: 'system',
          message: 'System health is critical - immediate attention required',
          acknowledged: false
        });
      }
      
      // Check for warnings
      if (healthStatus.overall === 'warning') {
        this.addAlert({
          level: 'warning',
          component: 'system',
          message: 'System health is warning - review recommended',
          acknowledged: false
        });
      }
    }, 5 * 60 * 1000);
  }
}

export const productionHealthMonitor = ProductionHealthMonitor.getInstance();
