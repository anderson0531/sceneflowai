// AI Adaptability Framework Types
// This file defines the core interfaces for making SceneFlow AI adaptable to continuous AI improvements

export interface PromptInstruction {
  id: string;
  version: string;
  aiModel: string; // 'gpt-4', 'gpt-5', 'gemini-2.0', 'claude-3.5', etc.
  category: 'ideation' | 'storyboard' | 'direction' | 'generation' | 'review' | 'optimization';
  instructions: string;
  parameters: Record<string, any>;
  effectiveness: number; // 0-100 rating based on user feedback and results
  lastUpdated: Date;
  usageCount: number;
  successRate: number;
  tags: string[];
  isActive: boolean;
}

export interface AICapability {
  model: string;
  version: string;
  provider: 'openai' | 'google' | 'anthropic' | 'stability' | 'runway' | 'custom';
  capabilities: {
    maxTokens: number;
    vision: boolean;
    videoGeneration: boolean;
    audioGeneration: boolean;
    reasoning: boolean;
    creativity: number; // 1-10 scale
    contextWindow: number;
    multimodal: boolean;
    realTime: boolean;
    costPerToken: number;
  };
  promptOptimizations: string[];
  bestPractices: string[];
  limitations: string[];
  lastUpdated: Date;
  isActive: boolean;
}

export interface AIPromptTemplate {
  id: string;
  name: string;
  description: string;
  category: PromptInstruction['category'];
  template: string;
  variables: PromptVariable[];
  aiModels: string[]; // Compatible AI models
  effectiveness: number;
  usageCount: number;
  lastUpdated: Date;
  isActive: boolean;
}

export interface PromptVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  required: boolean;
  defaultValue?: any;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    enum?: any[];
  };
}

export interface AIOptimizationStrategy {
  id: string;
  name: string;
  description: string;
  category: PromptInstruction['category'];
  strategy: string;
  parameters: Record<string, any>;
  effectiveness: number;
  applicableModels: string[];
  lastUpdated: Date;
  isActive: boolean;
}

export interface AILearningData {
  promptHistory: PromptAttempt[];
  resultAnalysis: ResultAnalysis[];
  optimizationStrategies: OptimizationStrategy[];
  modelPerformance: Record<string, ModelPerformance>;
  userPreferences: UserPreference[];
}

export interface PromptAttempt {
  id: string;
  prompt: string;
  aiModel: string;
  category: PromptInstruction['category'];
  context: ProjectContext;
  result: any;
  userRating: number; // 1-5 scale
  feedback: string;
  timestamp: Date;
  executionTime: number;
  cost: number;
  success: boolean;
}

export interface ResultAnalysis {
  id: string;
  promptAttemptId: string;
  qualityMetrics: {
    relevance: number; // 0-100
    creativity: number; // 0-100
    coherence: number; // 0-100
    originality: number; // 0-100
  };
  userSatisfaction: number; // 0-100
  businessImpact: number; // 0-100
  improvementSuggestions: string[];
  timestamp: Date;
}

export interface OptimizationStrategy {
  id: string;
  name: string;
  description: string;
  category: PromptInstruction['category'];
  strategy: string;
  parameters: Record<string, any>;
  effectiveness: number;
  applicableModels: string[];
  lastUpdated: Date;
  isActive: boolean;
}

export interface ModelPerformance {
  model: string;
  version: string;
  category: PromptInstruction['category'];
  metrics: {
    averageRating: number;
    successRate: number;
    averageExecutionTime: number;
    averageCost: number;
    userSatisfaction: number;
  };
  lastUpdated: Date;
  usageCount: number;
}

export interface UserPreference {
  userId: string;
  category: PromptInstruction['category'];
  preferredModels: string[];
  preferredStyles: string[];
  qualityThreshold: number;
  costSensitivity: number; // 1-10 scale
  speedPreference: 'fast' | 'balanced' | 'quality';
  lastUpdated: Date;
}

export interface ProjectContext {
  projectId: string;
  projectType: 'short' | 'medium' | 'long';
  genre: string;
  targetAudience: string;
  style: string;
  tone: string;
  complexity: 'simple' | 'moderate' | 'complex';
  budget: number;
  timeline: number; // days
  teamSize: number;
  previousResults: PromptAttempt[];
  userPreferences: UserPreference;
}

export interface AIConfiguration {
  defaultModel: string;
  fallbackModels: string[];
  costLimits: {
    daily: number;
    monthly: number;
    perRequest: number;
  };
  qualityThresholds: {
    minimumRating: number;
    minimumSuccessRate: number;
  };
  optimizationEnabled: boolean;
  learningEnabled: boolean;
  collaborationEnabled: boolean;
}
