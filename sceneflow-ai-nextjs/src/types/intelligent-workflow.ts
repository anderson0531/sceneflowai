// Intelligent Workflow Types
// This file defines the core interfaces for the intelligent workflow system in Phase 2

import { AgentAssignment, AgentCollaboration, CommunicationChannel, CoordinationRule } from './ai-agents';

export interface IntelligentWorkflow {
  id: string;
  projectId: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  currentStep: WorkflowStep;
  status: WorkflowStatus;
  agents: AgentAssignment[];
  automation: WorkflowAutomation;
  optimization: WorkflowOptimization;
  collaboration: WorkflowCollaboration;
  learning: WorkflowLearning;
  metrics: WorkflowMetrics;
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export interface WorkflowStep {
  id: string;
  name: string;
  type: WorkflowStepType;
  description: string;
  order: number;
  status: StepStatus;
  progress: number; // 0-100
  estimatedDuration: number; // minutes
  actualDuration?: number;
  dependencies: string[]; // Step IDs that must be completed first
  agents: string[]; // Agent IDs assigned to this step
  automation: StepAutomation;
  quality: StepQuality;
  requirements: StepRequirement[];
  outputs: StepOutput[];
  startedAt?: Date;
  completedAt?: Date;
  blockers: WorkflowBlocker[];
  optimizations: StepOptimization[];
}

export type WorkflowStepType = 
  | 'ideation'
  | 'storyboard'
  | 'scene-direction'
  | 'video-generation'
  | 'review'
  | 'optimization'
  | 'collaboration'
  | 'quality-check'
  | 'approval'
  | 'deployment';

export type StepStatus = 
  | 'pending'
  | 'ready'
  | 'in-progress'
  | 'review'
  | 'completed'
  | 'failed'
  | 'blocked'
  | 'optimizing';

export interface StepAutomation {
  isAutomated: boolean;
  automationLevel: 'none' | 'partial' | 'full';
  triggers: AutomationTrigger[];
  actions: AutomationAction[];
  conditions: AutomationCondition[];
  fallbacks: AutomationFallback[];
  isActive: boolean;
}

export interface AutomationTrigger {
  id: string;
  type: 'event' | 'condition' | 'schedule' | 'manual' | 'ai-suggested' | 'step-completion' | 'step-update' | 'step-start' | 'performance-threshold' | 'issue-detection';
  event?: string;
  condition?: string;
  schedule?: string;
  description: string;
  isActive: boolean;
  conditions?: AutomationCondition[];
}

export interface AutomationAction {
  id: string;
  type: 'execute' | 'notify' | 'assign' | 'modify' | 'optimize' | 'quality-assessment' | 'update-progress' | 'coordinate-agents' | 'suggest-optimizations' | 'escalate-issue';
  target: string;
  parameters: Record<string, any>;
  priority: number;
  isActive: boolean;
}

export interface AutomationCondition {
  id: string;
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'in_range' | 'in' | 'not-in' | 'greater-than' | 'less-than' | 'greater-than-or-equals' | 'less-than-or-equals' | 'starts-with' | 'ends-with';
  value: any;
  isRequired: boolean;
}

export interface AutomationFallback {
  id: string;
  condition: string;
  action: string;
  description: string;
  isActive: boolean;
}

export interface StepQuality {
  targetScore: number; // 0-100
  currentScore: number; // 0-100
  overallScore: number; // 0-100
  metrics: QualityMetric[];
  thresholds: QualityThreshold[];
  improvements: QualityImprovement[];
  lastAssessment: Date;
  assessmentDate: Date;
  isActive: boolean;
}

export interface QualityMetric {
  id: string;
  name: string;
  category: 'relevance' | 'creativity' | 'technical' | 'completeness' | 'originality';
  weight: number; // 0-1
  score: number; // 0-100
  target: number; // 0-100
  isMet: boolean;
}

export interface QualityThreshold {
  id: string;
  stepType: string;
  metric: string;
  minValue: number;
  maxValue: number;
  targetValue: number;
  isActive: boolean;
}

export interface QualityImprovement {
  id: string;
  metric: string;
  currentScore: number;
  targetScore: number;
  improvement: number;
  suggestions: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface StepRequirement {
  id: string;
  name: string;
  description: string;
  type: 'input' | 'output' | 'constraint' | 'quality' | 'approval';
  isRequired: boolean;
  value?: any;
  validation?: ValidationRule;
  source?: string; // Where this requirement comes from
}

export interface StepOutput {
  id: string;
  name: string;
  description: string;
  type: 'file' | 'data' | 'approval' | 'notification';
  format: string;
  location?: string;
  metadata: Record<string, any>;
  generatedAt: Date;
  quality: number; // 0-100
}

export interface WorkflowBlocker {
  id: string;
  type: 'dependency' | 'resource' | 'quality' | 'approval' | 'technical';
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  stepId: string;
  agentId?: string;
  createdAt: Date;
  resolvedAt?: Date;
  resolution: string;
  isResolved: boolean;
}

export interface StepOptimization {
  id: string;
  type: 'performance' | 'quality' | 'efficiency' | 'collaboration';
  description: string;
  currentValue: number;
  targetValue: number;
  improvement: number;
  strategy: string;
  isApplied: boolean;
  appliedAt?: Date;
  effectiveness: number; // 0-100
}

export interface WorkflowAutomation {
  isEnabled: boolean;
  level: 'basic' | 'intermediate' | 'advanced' | 'expert';
  rules: AutomationRule[];
  triggers: WorkflowTrigger[];
  actions: WorkflowAction[];
  conditions: WorkflowCondition[];
  fallbacks: WorkflowFallback[];
  learning: AutomationLearning;
}

export interface AutomationRule {
  id: string;
  name: string;
  description: string;
  trigger: WorkflowTrigger;
  conditions: WorkflowCondition[];
  actions: WorkflowAction[];
  priority: number;
  isActive: boolean;
  effectiveness: number; // 0-100
  usageCount: number;
  lastUsed: Date;
}

export interface WorkflowTrigger {
  id: string;
  type: 'step_completion' | 'quality_threshold' | 'time_constraint' | 'user_action' | 'ai_suggestion';
  stepId?: string;
  condition?: string;
  schedule?: string;
  description: string;
  isActive: boolean;
}

export interface WorkflowCondition {
  id: string;
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'in_range';
  value: any;
  isRequired: boolean;
  logic: 'and' | 'or';
}

export interface WorkflowAction {
  id: string;
  type: 'advance_step' | 'assign_agent' | 'optimize_quality' | 'notify_user' | 'apply_ai_suggestion';
  target: string;
  parameters: Record<string, any>;
  priority: number;
  isActive: boolean;
}

export interface WorkflowFallback {
  id: string;
  condition: string;
  action: string;
  description: string;
  isActive: boolean;
}

export interface AutomationLearning {
  isEnabled: boolean;
  patternRecognition: boolean;
  optimizationSuggestions: boolean;
  adaptiveRules: boolean;
  lastLearningUpdate: Date;
  learnedPatterns: LearnedWorkflowPattern[];
  optimizationHistory: WorkflowOptimization[];
}

export interface LearnedWorkflowPattern {
  id: string;
  pattern: string;
  context: string;
  successRate: number;
  usageCount: number;
  lastUsed: Date;
  isActive: boolean;
  applicableSteps: string[];
}

export interface WorkflowOptimization {
  id: string;
  type: 'performance' | 'quality' | 'efficiency' | 'collaboration';
  description: string;
  beforeValue: number;
  afterValue: number;
  improvement: number;
  strategy: string;
  appliedAt: Date;
  effectiveness: number; // 0-100
  isActive: boolean;
}

export interface WorkflowOptimization {
  id: string;
  type: 'performance' | 'quality' | 'efficiency' | 'collaboration';
  description: string;
  beforeValue: number;
  afterValue: number;
  improvement: number;
  strategy: string;
  appliedAt: Date;
  effectiveness: number; // 0-100
  isActive: boolean;
}

export interface WorkflowCollaboration {
  isEnabled: boolean;
  mode: 'sequential' | 'parallel' | 'hierarchical' | 'peer' | 'adaptive';
  agents: AgentCollaboration[];
  communication: CommunicationSettings;
  coordination: CoordinationSettings;
  conflictResolution: ConflictResolutionSettings;
  performance: CollaborationPerformance;
}

export interface CommunicationSettings {
  channels: CommunicationChannel[];
  frequency: 'immediate' | 'hourly' | 'daily' | 'on-demand' | 'real-time';
  notifications: boolean;
  escalation: boolean;
  isActive: boolean;
}

export interface CoordinationSettings {
  type: string;
  rules: CoordinationRule[];
  conflictResolution: string;
  resourceSharing: boolean;
  isActive: boolean;
}

export interface ConflictResolutionSettings {
  strategy: 'consensus' | 'majority' | 'hierarchical' | 'ai-suggested' | 'collaborative';
  escalation: boolean;
  mediation: boolean;
  arbitration: boolean;
  isActive: boolean;
}

export interface CollaborationPerformance {
  efficiency: number; // 0-100
  communication: number; // 0-100
  coordination: number; // 0-100
  conflictResolution: number; // 0-100
  overall: number; // 0-100
  lastAssessment: Date;
  metrics: string[];
  tracking: boolean;
  improvement: boolean;
}

export interface WorkflowLearning {
  isEnabled: boolean;
  patternRecognition: boolean;
  optimizationSuggestions: boolean;
  adaptiveWorkflows: boolean;
  userPreferences: boolean;
  performanceAnalysis: boolean;
  lastLearningUpdate: Date;
  learnedPatterns: LearnedWorkflowPattern[];
  optimizationHistory: WorkflowOptimization[];
}

export interface UserWorkflowPreference {
  id: string;
  userId: string;
  category: 'automation' | 'quality' | 'speed' | 'collaboration' | 'innovation';
  preference: string;
  weight: number; // 0-1
  lastUpdated: Date;
}

export interface WorkflowMetrics {
  totalSteps: number;
  completedSteps: number;
  currentProgress: number; // 0-100
  estimatedCompletion: Date;
  actualCompletion?: Date;
  quality: number; // 0-100
  averageQuality: number; // 0-100
  efficiency: number; // 0-100
  collaboration: number; // 0-100
  automation: number; // 0-100
  successRate: number; // 0-100
  optimization: number; // 0-100
  lastUpdated: Date;
}

export type WorkflowStatus = 
  | 'draft'
  | 'created'
  | 'active'
  | 'in-progress'
  | 'paused'
  | 'near-completion'
  | 'completed'
  | 'cancelled'
  | 'optimizing';

export interface ValidationRule {
  type: 'required' | 'min' | 'max' | 'pattern' | 'custom';
  value?: any;
  message: string;
  isActive: boolean;
}

export interface NotificationSettings {
  email: boolean;
  push: boolean;
  inApp: boolean;
  frequency: 'immediate' | 'hourly' | 'daily';
  isActive: boolean;
}

export interface EscalationSettings {
  enabled: boolean;
  levels: EscalationLevel[];
  timeout: number; // minutes
  isActive: boolean;
}

export interface EscalationLevel {
  level: number;
  timeout: number; // minutes
  action: string;
  recipients: string[];
  isActive: boolean;
}

export interface ApprovalSettings {
  required: boolean;
  approvers: string[];
  timeout: number; // minutes
  autoApprove: boolean;
  isActive: boolean;
}
