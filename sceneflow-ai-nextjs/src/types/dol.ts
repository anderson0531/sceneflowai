export enum APICategory {
  INTELLIGENCE = 'INTELLIGENCE',
  VIDEO_GEN = 'VIDEO_GEN',
}

export enum PlatformType {
  GOOGLE = 'GOOGLE',
  OPENAI = 'OPENAI',
  RUNWAYML = 'RUNWAYML',
  PIKA_LABS = 'PIKA_LABS',
  STABLE_VIDEO = 'STABLE_VIDEO',
  LUMA_AI = 'LUMA_AI',
}

export enum TaskComplexity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

export enum TaskType {
  // Intelligence tasks
  SCRIPT_WRITING = 'SCRIPT_WRITING',
  STORY_ANALYSIS = 'STORY_ANALYSIS',
  CHARACTER_DEVELOPMENT = 'CHARACTER_DEVELOPMENT',
  PLOT_STRUCTURING = 'PLOT_STRUCTURING',
  DIALOGUE_GENERATION = 'DIALOGUE_GENERATION',
  SCENE_DESCRIPTION = 'SCENE_DESCRIPTION',
  
  // Video generation tasks
  IMAGE_TO_VIDEO = 'IMAGE_TO_VIDEO',
  TEXT_TO_VIDEO = 'TEXT_TO_VIDEO',
  VIDEO_TO_VIDEO = 'VIDEO_TO_VIDEO',
  STYLE_TRANSFER = 'STYLE_TRANSFER',
  MOTION_CONTROL = 'MOTION_CONTROL',
  TEMPORAL_EXTENSION = 'TEMPORAL_EXTENSION',
}

export interface PlatformModel {
  id: string;
  modelId: string;
  platformId: string;
  platformType: PlatformType;
  category: APICategory;
  displayName: string;
  description: string;
  costPerUnit: number; // Standardized cost metric
  basePerformanceScore: number; // 1-100
  maxTokens?: number; // For intelligence models
  maxDuration?: number; // For video models (seconds)
  maxResolution?: string; // For video models (e.g., "1920x1080")
  features: string[]; // Dynamically updated list of supported features
  isBYOKSupported: boolean;
  isOperational: boolean;
  isActive: boolean;
  lastUpdated: Date;
  metadata: Record<string, any>; // Platform-specific configuration
}

export interface PromptTemplate {
  id: string;
  templateId: string;
  modelId: string;
  taskType: TaskType;
  templateString: string; // Handlebars template
  variables: string[]; // Required variables for the template
  currentQualityScore: number; // 0-100, updated by feedback loop
  usageCount: number;
  isDeprecated: boolean;
  createdAt: Date;
  updatedAt: Date;
  metadata: Record<string, any>;
}

export interface TaskContext {
  taskType: TaskType;
  complexity: TaskComplexity;
  byokPlatformId?: string;
  userPreferences?: Record<string, any>;
  budget?: number;
  qualityRequirement?: 'low' | 'medium' | 'high';
}

export interface OptimizationResult {
  model: PlatformModel;
  prompt: string;
  parameters: Record<string, any>;
  estimatedCost: number;
  expectedQuality: number;
  reasoning: string;
}

export interface APIUsageLog {
  id: string;
  taskType: TaskType;
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
  timestamp: Date;
  metadata: Record<string, any>;
}

export interface FeatureUpdate {
  id: string;
  platformId: string;
  modelId: string;
  feature: string;
  status: 'added' | 'removed' | 'updated';
  description: string;
  source: 'automated' | 'manual' | 'community';
  confidence: number; // 0-100
  timestamp: Date;
  metadata: Record<string, any>;
}
