export const DOL_PRODUCTION_CONFIG = {
  // Performance Settings
  performance: {
    monitoringInterval: 6 * 60 * 60 * 1000, // 6 hours
    maxRetries: 3,
    timeoutMs: 30000,
    batchSize: 100,
    cacheTTL: 3600, // 1 hour
  },

  // Database Settings
  database: {
    connectionPool: {
      min: 5,
      max: 20,
      acquire: 30000,
      idle: 10000,
    },
    retryAttempts: 3,
    retryDelay: 1000,
  },

  // Monitoring Settings
  monitoring: {
    enabled: true,
    logLevel: 'info',
    metricsCollection: true,
    alertThresholds: {
      errorRate: 0.05, // 5%
      responseTime: 5000, // 5 seconds
      costPerRequest: 0.01, // $0.01
    },
  },

  // Optimization Settings
  optimization: {
    enabled: true,
    autoApply: false, // Require manual approval for production
    analysisInterval: 24 * 60 * 60 * 1000, // 24 hours
    qualityThreshold: 0.8, // 80%
    costThreshold: 0.005, // $0.005 per request
  },

  // Feature Detection Settings
  featureDetection: {
    enabled: true,
    scanInterval: 6 * 60 * 60 * 1000, // 6 hours
    confidenceThreshold: 0.7, // 70%
    maxFeaturesPerPlatform: 50,
  },

  // Security Settings
  security: {
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 1000,
    },
    apiKeyValidation: true,
    requestLogging: true,
    sensitiveDataMasking: true,
  },

  // Backup & Recovery
  backup: {
    enabled: true,
    interval: 24 * 60 * 60 * 1000, // 24 hours
    retentionDays: 30,
    compression: true,
  },

  // Notifications
  notifications: {
    email: {
      enabled: true,
      recipients: ['admin@sceneflow.ai'],
      criticalAlerts: true,
      performanceReports: true,
    },
    slack: {
      enabled: false,
      webhookUrl: process.env.SLACK_WEBHOOK_URL,
      channels: ['#dol-alerts', '#dol-performance'],
    },
  },

  // Analytics & Reporting
  analytics: {
    enabled: true,
    dataRetention: 90, // days
    aggregationInterval: 60 * 60 * 1000, // 1 hour
    exportFormats: ['json', 'csv', 'pdf'],
    scheduledReports: {
      daily: true,
      weekly: true,
      monthly: true,
    },
  },
};

export const DOL_ENVIRONMENT = process.env.NODE_ENV || 'development';
export const IS_PRODUCTION = DOL_ENVIRONMENT === 'production';

// Environment-specific overrides
export const getDOLConfig = () => {
  const baseConfig = DOL_PRODUCTION_CONFIG;
  
  if (IS_PRODUCTION) {
    return {
      ...baseConfig,
      monitoring: {
        ...baseConfig.monitoring,
        logLevel: 'warn',
        alertThresholds: {
          ...baseConfig.monitoring.alertThresholds,
          errorRate: 0.02, // Stricter in production
          responseTime: 3000, // Faster in production
        },
      },
      optimization: {
        ...baseConfig.optimization,
        autoApply: false, // Never auto-apply in production
        analysisInterval: 12 * 60 * 60 * 1000, // More frequent in production
      },
    };
  }
  
  return baseConfig;
};
