// AI Agents System Types
// This file defines the core interfaces for the AI Agents system in Phase 2

export interface AIAgent {
  id: string;
  name: string;
  type: AgentType;
  description: string;
  capabilities: AgentCapability[];
  personality: AgentPersonality;
  expertise: string[];
  currentTask?: AgentTask;
  status: AgentStatus;
  performance: AgentPerformance;
  learningData: AgentLearningData;
  createdAt: Date;
  lastActive: Date;
  isActive: boolean;
}

export type AgentType = 
  | 'ideation-specialist'
  | 'storyboard-artist'
  | 'scene-director'
  | 'video-producer'
  | 'quality-assurance'
  | 'collaboration-coordinator'
  | 'optimization-expert'
  | 'research-analyst';

export interface AgentCapability {
  id: string;
  name: string;
  description: string;
  category: 'creative' | 'analytical' | 'technical' | 'collaborative';
  proficiency: number; // 0-100
  applicableSteps: WorkflowStep[];
  tools: string[];
  isActive: boolean;
}

export interface AgentPersonality {
  creativity: number; // 0-100
  analytical: number; // 0-100
  collaborative: number; // 0-100
  efficiency: number; // 0-100
  innovation: number; // 0-100
  communication: number; // 0-100
  adaptability: number; // 0-100
  leadership: number; // 0-100
  technical: number; // 0-100
}

export interface AgentTask {
  id: string;
  projectId: string;
  step: WorkflowStep;
  description: string;
  requirements: TaskRequirement[];
  constraints: TaskConstraint[];
  expectedOutput: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimatedDuration: number; // minutes
  actualDuration?: number;
  status: TaskStatus;
  progress: number; // 0-100
  assignedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  result?: TaskResult;
  feedback?: TaskFeedback;
}

export interface TaskRequirement {
  id: string;
  description: string;
  type: 'input' | 'output' | 'constraint' | 'quality';
  isRequired: boolean;
  value?: any;
  validation?: any; // TODO: Define ValidationRule interface
}

export interface TaskConstraint {
  id: string;
  type: 'time' | 'budget' | 'quality' | 'technical' | 'creative';
  description: string;
  value: any;
  isHard: boolean; // Hard constraints cannot be violated
}

export interface TaskResult {
  id: string;
  output: any;
  quality: QualityMetrics;
  metadata: Record<string, any>;
  generatedAt: Date;
  aiModel: string;
  promptUsed: string;
  executionTime: number; // seconds
}

export interface QualityMetrics {
  relevance: number; // 0-100
  creativity: number; // 0-100
  technicalQuality: number; // 0-100
  originality: number; // 0-100
  completeness: number; // 0-100
  overall: number; // 0-100
}

export interface TaskFeedback {
  id: string;
  userId: string;
  rating: number; // 1-5
  comments: string;
  category: 'quality' | 'usefulness' | 'creativity' | 'technical';
  timestamp: Date;
  actionable: boolean;
  suggestions: string[];
}

export type TaskStatus = 
  | 'pending'
  | 'assigned'
  | 'in-progress'
  | 'review'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type AgentStatus = 
  | 'available'
  | 'busy'
  | 'offline'
  | 'learning'
  | 'maintenance';

export interface AgentPerformance {
  totalTasks: number;
  completedTasks: number;
  successRate: number; // 0-100
  averageQuality: number; // 0-100
  averageExecutionTime: number; // minutes
  userSatisfaction: number; // 0-100
  lastMonthPerformance: PerformanceMetrics;
  allTimePerformance: PerformanceMetrics;
}

export interface PerformanceMetrics {
  tasksCompleted: number;
  successRate: number;
  averageQuality: number;
  averageExecutionTime: number;
  userSatisfaction: number;
}

export interface AgentLearningData {
  completedTasks: string[]; // Task IDs
  learnedPatterns: LearnedPattern[];
  skillImprovements: SkillImprovement[];
  userPreferences: any[]; // TODO: Define UserPreference interface
  optimizationStrategies: OptimizationStrategy[];
  lastLearningUpdate: Date;
}

export interface LearnedPattern {
  id: string;
  pattern: string;
  context: string;
  successRate: number;
  usageCount: number;
  lastUsed: Date;
  isActive: boolean;
}

export interface SkillImprovement {
  skillId: string;
  skillName: string;
  improvement: number; // Percentage improvement
  timeframe: string; // e.g., "last 30 days"
  evidence: string[];
  lastUpdated: Date;
}

export interface OptimizationStrategy {
  id: string;
  name: string;
  description: string;
  category: 'prompt' | 'workflow' | 'collaboration' | 'quality';
  effectiveness: number; // 0-100
  applicableAgents: string[]; // Agent IDs
  conditions: OptimizationCondition[];
  actions: OptimizationAction[];
  lastUsed: Date;
  usageCount: number;
}

export interface OptimizationCondition {
  id: string;
  type: 'project_type' | 'user_preference' | 'quality_threshold' | 'time_constraint';
  operator: 'equals' | 'greater_than' | 'less_than' | 'contains' | 'in_range';
  value: any;
  isRequired: boolean;
}

export interface OptimizationAction {
  id: string;
  type: 'modify_prompt' | 'adjust_workflow' | 'change_agent' | 'update_parameters';
  description: string;
  parameters: Record<string, any>;
  priority: number; // 1-10
}

export interface AgentCollaboration {
  id: string;
  agents: string[]; // Agent IDs
  projectId: string;
  collaborationType: 'sequential' | 'parallel' | 'hierarchical' | 'peer' | 'adaptive';
  communicationChannels: CommunicationChannel[];
  sharedResources: SharedResource[];
  coordinationRules: CoordinationRule[];
  status: 'active' | 'completed' | 'paused';
  startedAt: Date;
  completedAt?: Date;
}

export interface CommunicationChannel {
  id: string;
  type: 'chat' | 'voice' | 'video' | 'document' | 'api';
  name: string;
  description: string;
  participants: string[]; // Agent IDs
  isActive: boolean;
  lastActivity: Date;
}

export interface SharedResource {
  id: string;
  name: string;
  type: 'file' | 'database' | 'api' | 'model' | 'knowledge';
  description: string;
  accessLevel: 'read' | 'write' | 'admin';
  sharedWith: string[]; // Agent IDs
  lastAccessed: Date;
}

export interface CoordinationRule {
  id: string;
  name: string;
  description: string;
  trigger: RuleTrigger;
  action: RuleAction;
  conditions: RuleCondition[];
  priority: number;
  isActive: boolean;
}

export interface RuleTrigger {
  type: 'event' | 'condition' | 'schedule' | 'manual';
  event?: string;
  condition?: string;
  schedule?: string;
}

export interface RuleAction {
  type: 'notify' | 'assign' | 'modify' | 'execute';
  target: string;
  parameters: Record<string, any>;
}

export interface RuleCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains';
  value: any;
}

export type WorkflowStep = 'ideation' | 'storyboard' | 'scene-direction' | 'video-generation' | 'review' | 'optimization';

export interface AgentAssignment {
  id: string;
  agentId: string;
  taskId: string;
  projectId: string;
  assignedAt: Date;
  status: 'assigned' | 'accepted' | 'rejected' | 'completed';
  priority: number;
  estimatedStartTime: Date;
  actualStartTime?: Date;
  estimatedCompletionTime: Date;
  actualCompletionTime?: Date;
  notes: string[];
}
