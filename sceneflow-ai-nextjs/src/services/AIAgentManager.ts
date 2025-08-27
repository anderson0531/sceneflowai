// AI Agent Manager Service
// This service manages all AI agents in the SceneFlow AI system

import {
  AIAgent,
  AgentType,
  AgentCapability,
  AgentPersonality,
  AgentTask,
  AgentStatus,
  AgentPerformance,
  AgentLearningData,
  AgentCollaboration,
  AgentAssignment,
  WorkflowStep
} from '../types/ai-agents';
import { ProjectContext } from '../types/ai-adaptability';

export class AIAgentManager {
  private static instance: AIAgentManager;
  private agents: Map<string, AIAgent> = new Map();
  private agentCollaborations: Map<string, AgentCollaboration> = new Map();
  private agentAssignments: Map<string, AgentAssignment> = new Map();

  private constructor() {
    this.initializeDefaultAgents();
  }

  public static getInstance(): AIAgentManager {
    if (!AIAgentManager.instance) {
      AIAgentManager.instance = new AIAgentManager();
    }
    return AIAgentManager.instance;
  }

  /**
   * Initialize default AI agents for the system
   */
  private initializeDefaultAgents(): void {
    const defaultAgents: AIAgent[] = [
      this.createIdeationSpecialist(),
      this.createStoryboardArtist(),
      this.createSceneDirector(),
      this.createVideoProducer(),
      this.createQualityAssurance(),
      this.createCollaborationCoordinator(),
      this.createOptimizationExpert(),
      this.createResearchAnalyst()
    ];

    defaultAgents.forEach(agent => {
      this.agents.set(agent.id, agent);
    });

    console.log(`Initialized ${defaultAgents.length} AI agents`);
  }

  /**
   * Create Ideation Specialist agent
   */
  private createIdeationSpecialist(): AIAgent {
    return {
      id: 'ideation-specialist-001',
      name: 'Creative Spark',
      type: 'ideation-specialist',
      description: 'Specializes in generating creative and innovative video concepts',
      capabilities: [
        {
          id: 'cap-ideation-001',
          name: 'Creative Concept Generation',
          description: 'Generate unique and engaging video concepts',
          category: 'creative',
          proficiency: 95,
          applicableSteps: ['ideation'],
          tools: ['brainstorming', 'trend-analysis', 'audience-research'],
          isActive: true
        },
        {
          id: 'cap-ideation-002',
          name: 'Market Research',
          description: 'Analyze market trends and audience preferences',
          category: 'analytical',
          proficiency: 88,
          applicableSteps: ['ideation'],
          tools: ['data-analysis', 'trend-tracking', 'competitor-analysis'],
          isActive: true
        }
      ],
      personality: {
        creativity: 95,
        analytical: 75,
        collaborative: 80,
        efficiency: 70,
        innovation: 90,
        communication: 85,
        adaptability: 85,
        leadership: 60,
        technical: 70
      },
      expertise: ['creative writing', 'trend analysis', 'audience psychology', 'storytelling'],
      status: 'available',
      performance: this.createDefaultPerformance(),
      learningData: this.createDefaultLearningData(),
      createdAt: new Date(),
      lastActive: new Date(),
      isActive: true
    };
  }

  /**
   * Create Storyboard Artist agent
   */
  private createStoryboardArtist(): AIAgent {
    return {
      id: 'storyboard-artist-001',
      name: 'Visual Storyteller',
      type: 'storyboard-artist',
      description: 'Creates compelling visual storyboards and shot compositions',
      capabilities: [
        {
          id: 'cap-storyboard-001',
          name: 'Visual Storyboarding',
          description: 'Create detailed visual storyboards',
          category: 'creative',
          proficiency: 92,
          applicableSteps: ['storyboard'],
          tools: ['visual-design', 'composition', 'storyboard-software'],
          isActive: true
        },
        {
          id: 'cap-storyboard-002',
          name: 'Shot Composition',
          description: 'Design effective shot compositions and camera angles',
          category: 'technical',
          proficiency: 89,
          applicableSteps: ['storyboard'],
          tools: ['camera-theory', 'composition-rules', 'visual-storytelling'],
          isActive: true
        }
      ],
      personality: {
        creativity: 90,
        analytical: 65,
        collaborative: 75,
        efficiency: 80,
        innovation: 85,
        communication: 70,
        adaptability: 80,
        leadership: 50,
        technical: 85
      },
      expertise: ['visual design', 'cinematography', 'storyboarding', 'composition'],
      status: 'available',
      performance: this.createDefaultPerformance(),
      learningData: this.createDefaultLearningData(),
      createdAt: new Date(),
      lastActive: new Date(),
      isActive: true
    };
  }

  /**
   * Create Scene Director agent
   */
  private createSceneDirector(): AIAgent {
    return {
      id: 'scene-director-001',
      name: 'Direction Master',
      type: 'scene-director',
      description: 'Provides detailed scene direction and production guidance',
      capabilities: [
        {
          id: 'cap-direction-001',
          name: 'Scene Direction',
          description: 'Create detailed scene direction and production notes',
          category: 'creative',
          proficiency: 88,
          applicableSteps: ['scene-direction'],
          tools: ['direction-software', 'production-notes', 'scene-planning'],
          isActive: true
        },
        {
          id: 'cap-direction-002',
          name: 'Production Planning',
          description: 'Plan production logistics and requirements',
          category: 'technical',
          proficiency: 82,
          applicableSteps: ['scene-direction'],
          tools: ['production-planning', 'logistics', 'resource-management'],
          isActive: true
        }
      ],
      personality: {
        creativity: 85,
        analytical: 80,
        collaborative: 90,
        efficiency: 85,
        innovation: 80,
        communication: 95,
        adaptability: 85,
        leadership: 90,
        technical: 80
      },
      expertise: ['direction', 'production planning', 'logistics', 'team coordination'],
      status: 'available',
      performance: this.createDefaultPerformance(),
      learningData: this.createDefaultLearningData(),
      createdAt: new Date(),
      lastActive: new Date(),
      isActive: true
    };
  }

  /**
   * Create Video Producer agent
   */
  private createVideoProducer(): AIAgent {
    return {
      id: 'video-producer-001',
      name: 'Production Pro',
      type: 'video-producer',
      description: 'Manages video production and generation processes',
      capabilities: [
        {
          id: 'cap-production-001',
          name: 'Video Generation',
          description: 'Generate high-quality video content',
          category: 'technical',
          proficiency: 90,
          applicableSteps: ['video-generation'],
          tools: ['video-generation-ai', 'quality-control', 'rendering'],
          isActive: true
        },
        {
          id: 'cap-production-002',
          name: 'Quality Control',
          description: 'Ensure video quality meets standards',
          category: 'analytical',
          proficiency: 85,
          applicableSteps: ['video-generation'],
          tools: ['quality-metrics', 'testing', 'optimization'],
          isActive: true
        }
      ],
      personality: {
        creativity: 75,
        analytical: 90,
        collaborative: 80,
        efficiency: 95,
        innovation: 70,
        communication: 75,
        adaptability: 80,
        leadership: 70,
        technical: 95
      },
      expertise: ['video production', 'quality control', 'technical optimization', 'rendering'],
      status: 'available',
      performance: this.createDefaultPerformance(),
      learningData: this.createDefaultLearningData(),
      createdAt: new Date(),
      lastActive: new Date(),
      isActive: true
    };
  }

  /**
   * Create Quality Assurance agent
   */
  private createQualityAssurance(): AIAgent {
    return {
      id: 'quality-assurance-001',
      name: 'Quality Guardian',
      type: 'quality-assurance',
      description: 'Ensures all content meets quality standards and requirements',
      capabilities: [
        {
          id: 'cap-quality-001',
          name: 'Quality Assessment',
          description: 'Assess content quality across multiple dimensions',
          category: 'analytical',
          proficiency: 95,
          applicableSteps: ['review', 'optimization'],
          tools: ['quality-metrics', 'testing-frameworks', 'assessment-tools'],
          isActive: true
        },
        {
          id: 'cap-quality-002',
          name: 'Quality Improvement',
          description: 'Suggest and implement quality improvements',
          category: 'technical',
          proficiency: 88,
          applicableSteps: ['review', 'optimization'],
          tools: ['optimization-algorithms', 'improvement-suggestions', 'quality-tracking'],
          isActive: true
        }
      ],
      personality: {
        creativity: 60,
        analytical: 95,
        collaborative: 70,
        efficiency: 90,
        innovation: 65,
        communication: 75,
        adaptability: 80,
        leadership: 60,
        technical: 90
      },
      expertise: ['quality assessment', 'testing', 'optimization', 'standards compliance'],
      status: 'available',
      performance: this.createDefaultPerformance(),
      learningData: this.createDefaultLearningData(),
      createdAt: new Date(),
      lastActive: new Date(),
      isActive: true
    };
  }

  /**
   * Create Collaboration Coordinator agent
   */
  private createCollaborationCoordinator(): AIAgent {
    return {
      id: 'collaboration-coordinator-001',
      name: 'Team Harmony',
      type: 'collaboration-coordinator',
      description: 'Coordinates collaboration between multiple agents and team members',
      capabilities: [
        {
          id: 'cap-collaboration-001',
          name: 'Team Coordination',
          description: 'Coordinate activities between multiple agents',
          category: 'collaborative',
          proficiency: 92,
          applicableSteps: ['ideation', 'storyboard', 'scene-direction', 'video-generation'],
          tools: ['coordination-software', 'communication-tools', 'project-management'],
          isActive: true
        },
        {
          id: 'cap-collaboration-002',
          name: 'Conflict Resolution',
          description: 'Resolve conflicts and facilitate consensus',
          category: 'collaborative',
          proficiency: 88,
          applicableSteps: ['ideation', 'storyboard', 'scene-direction', 'video-generation'],
          tools: ['conflict-resolution', 'mediation', 'consensus-building'],
          isActive: true
        }
      ],
      personality: {
        creativity: 70,
        analytical: 75,
        collaborative: 95,
        efficiency: 80,
        innovation: 70,
        communication: 95,
        adaptability: 90,
        leadership: 95,
        technical: 75
      },
      expertise: ['team coordination', 'conflict resolution', 'communication', 'project management'],
      status: 'available',
      performance: this.createDefaultPerformance(),
      learningData: this.createDefaultLearningData(),
      createdAt: new Date(),
      lastActive: new Date(),
      isActive: true
    };
  }

  /**
   * Create Optimization Expert agent
   */
  private createOptimizationExpert(): AIAgent {
    return {
      id: 'optimization-expert-001',
      name: 'Efficiency Master',
      type: 'optimization-expert',
      description: 'Optimizes workflows, processes, and content quality',
      capabilities: [
        {
          id: 'cap-optimization-001',
          name: 'Process Optimization',
          description: 'Optimize workflows and processes for efficiency',
          category: 'analytical',
          proficiency: 90,
          applicableSteps: ['optimization'],
          tools: ['process-analysis', 'optimization-algorithms', 'efficiency-tracking'],
          isActive: true
        },
        {
          id: 'cap-optimization-002',
          name: 'Content Optimization',
          description: 'Optimize content for quality and performance',
          category: 'technical',
          proficiency: 85,
          applicableSteps: ['optimization'],
          tools: ['content-analysis', 'quality-improvement', 'performance-tracking'],
          isActive: true
        }
      ],
      personality: {
        creativity: 75,
        analytical: 95,
        collaborative: 70,
        efficiency: 95,
        innovation: 80,
        communication: 75,
        adaptability: 85,
        leadership: 70,
        technical: 90
      },
      expertise: ['process optimization', 'efficiency analysis', 'quality improvement', 'performance tracking'],
      status: 'available',
      performance: this.createDefaultPerformance(),
      learningData: this.createDefaultLearningData(),
      createdAt: new Date(),
      lastActive: new Date(),
      isActive: true
    };
  }

  /**
   * Create Research Analyst agent
   */
  private createResearchAnalyst(): AIAgent {
    return {
      id: 'research-analyst-001',
      name: 'Insight Hunter',
      type: 'research-analyst',
      description: 'Conducts research and provides data-driven insights',
      capabilities: [
        {
          id: 'cap-research-001',
          name: 'Data Analysis',
          description: 'Analyze data and extract meaningful insights',
          category: 'analytical',
          proficiency: 92,
          applicableSteps: ['ideation', 'storyboard', 'scene-direction'],
          tools: ['data-analysis', 'statistical-tools', 'insight-generation'],
          isActive: true
        },
        {
          id: 'cap-research-002',
          name: 'Market Research',
          description: 'Conduct market and audience research',
          category: 'analytical',
          proficiency: 88,
          applicableSteps: ['ideation', 'storyboard'],
          tools: ['market-research', 'audience-analysis', 'trend-tracking'],
          isActive: true
        }
      ],
      personality: {
        creativity: 70,
        analytical: 95,
        collaborative: 75,
        efficiency: 85,
        innovation: 75,
        communication: 80,
        adaptability: 85,
        leadership: 60,
        technical: 80
      },
      expertise: ['data analysis', 'market research', 'audience insights', 'trend analysis'],
      status: 'available',
      performance: this.createDefaultPerformance(),
      learningData: this.createDefaultLearningData(),
      createdAt: new Date(),
      lastActive: new Date(),
      isActive: true
    };
  }

  /**
   * Create default performance metrics for agents
   */
  private createDefaultPerformance(): AgentPerformance {
    return {
      totalTasks: 0,
      completedTasks: 0,
      successRate: 100,
      averageQuality: 85,
      averageExecutionTime: 30,
      userSatisfaction: 85,
      lastMonthPerformance: {
        tasksCompleted: 0,
        successRate: 100,
        averageQuality: 85,
        averageExecutionTime: 30,
        userSatisfaction: 85
      },
      allTimePerformance: {
        tasksCompleted: 0,
        successRate: 100,
        averageQuality: 85,
        averageExecutionTime: 30,
        userSatisfaction: 85
      }
    };
  }

  /**
   * Create default learning data for agents
   */
  private createDefaultLearningData(): AgentLearningData {
    return {
      completedTasks: [],
      learnedPatterns: [],
      skillImprovements: [],
      userPreferences: [],
      optimizationStrategies: [],
      lastLearningUpdate: new Date()
    };
  }

  /**
   * Get all available agents
   */
  public getAllAgents(): AIAgent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get agent by ID
   */
  public getAgent(agentId: string): AIAgent | undefined {
    return this.agents.get(agentId);
  }

  /**
   * Get agents by type
   */
  public getAgentsByType(type: AgentType): AIAgent[] {
    return Array.from(this.agents.values()).filter(agent => agent.type === type);
  }

  /**
   * Get agent by type (alias for backward compatibility)
   * @deprecated Use getAgentsByType instead
   */
  public getAgentByType(type: AgentType): AIAgent[] {
    return this.getAgentsByType(type);
  }

  /**
   * Get available agents for a specific workflow step
   */
  public getAvailableAgentsForStep(step: WorkflowStep): AIAgent[] {
    return Array.from(this.agents.values()).filter(agent => 
      agent.status === 'available' && 
      agent.capabilities.some(cap => 
        cap.applicableSteps.includes(step) && cap.isActive
      )
    );
  }

  /**
   * Get optimal agent for a task
   */
  public getOptimalAgentForTask(
    step: WorkflowStep,
    context: ProjectContext,
    requirements: string[]
  ): AIAgent | null {
    const availableAgents = this.getAvailableAgentsForStep(step);
    
    if (availableAgents.length === 0) {
      return null;
    }

    // Score agents based on requirements and context
    const scoredAgents = availableAgents.map(agent => {
      const score = this.calculateAgentScore(agent, step, context, requirements);
      return { agent, score };
    });

    // Sort by score and return the best agent
    scoredAgents.sort((a, b) => b.score - a.score);
    return scoredAgents[0].agent;
  }

  /**
   * Calculate agent score for a specific task
   */
  private calculateAgentScore(
    agent: AIAgent,
    step: WorkflowStep,
    context: ProjectContext,
    requirements: string[]
  ): number {
    let score = 0;

    // Base score from capabilities
    const relevantCapabilities = agent.capabilities.filter(cap => 
      cap.applicableSteps.includes(step)
    );
    
    if (relevantCapabilities.length > 0) {
      const avgProficiency = relevantCapabilities.reduce((sum, cap) => sum + cap.proficiency, 0) / relevantCapabilities.length;
      score += avgProficiency * 0.4; // 40% weight for capabilities
    }

    // Performance score
    score += agent.performance.successRate * 0.3; // 30% weight for performance

    // Personality match score
    const personalityScore = this.calculatePersonalityMatch(agent.personality, step, context);
    score += personalityScore * 0.2; // 20% weight for personality

    // User satisfaction
    score += agent.performance.userSatisfaction * 0.1; // 10% weight for user satisfaction

    return Math.round(score);
  }

  /**
   * Calculate personality match score
   */
  private calculatePersonalityMatch(
    personality: AgentPersonality,
    step: WorkflowStep,
    context: ProjectContext
  ): number {
    let score = 0;

    switch (step) {
      case 'ideation':
        score += personality.creativity * 0.4;
        score += personality.innovation * 0.3;
        score += personality.analytical * 0.2;
        score += personality.communication * 0.1;
        break;
      case 'storyboard':
        score += personality.creativity * 0.3;
        score += personality.technical * 0.3;
        score += personality.efficiency * 0.2;
        score += personality.communication * 0.2;
        break;
      case 'scene-direction':
        score += personality.leadership * 0.3;
        score += personality.communication * 0.3;
        score += personality.collaborative * 0.2;
        score += personality.efficiency * 0.2;
        break;
      case 'video-generation':
        score += personality.technical * 0.4;
        score += personality.efficiency * 0.3;
        score += personality.analytical * 0.2;
        score += personality.adaptability * 0.1;
        break;
      case 'review':
        score += personality.analytical * 0.4;
        score += personality.technical * 0.3;
        score += personality.efficiency * 0.2;
        score += personality.communication * 0.1;
        break;
      case 'optimization':
        score += personality.analytical * 0.4;
        score += personality.efficiency * 0.3;
        score += personality.innovation * 0.2;
        score += personality.technical * 0.1;
        break;
    }

    return score;
  }

  /**
   * Assign agent to a task
   */
  public assignAgentToTask(
    agentId: string,
    taskId: string,
    projectId: string,
    priority: number = 5
  ): AgentAssignment | null {
    const agent = this.agents.get(agentId);
    if (!agent || agent.status !== 'available') {
      return null;
    }

    const assignment: AgentAssignment = {
      id: `assignment-${Date.now()}`,
      agentId,
      taskId,
      projectId,
      assignedAt: new Date(),
      status: 'assigned',
      priority,
      estimatedStartTime: new Date(),
      estimatedCompletionTime: new Date(Date.now() + 60 * 60 * 1000), // 1 hour default
      notes: []
    };

    this.agentAssignments.set(assignment.id, assignment);
    
    // Update agent status
    agent.status = 'busy';
    agent.currentTask = {
      id: taskId,
      projectId,
      step: 'ideation', // Default, will be updated by caller
      description: '',
      requirements: [],
      constraints: [],
      expectedOutput: '',
      priority: 'medium',
      estimatedDuration: 60,
      status: 'assigned',
      progress: 0,
      assignedAt: new Date()
    };

    return assignment;
  }

  /**
   * Update agent status
   */
  public updateAgentStatus(agentId: string, status: AgentStatus): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) {
      return false;
    }

    agent.status = status;
    agent.lastActive = new Date();
    return true;
  }

  /**
   * Get agent performance statistics
   */
  public getAgentPerformance(agentId: string): AgentPerformance | null {
    const agent = this.agents.get(agentId);
    return agent?.performance || null;
  }

  /**
   * Update agent performance metrics
   */
  public updateAgentPerformance(
    agentId: string,
    taskResult: any,
    quality: number,
    executionTime: number,
    userRating: number
  ): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) {
      return false;
    }

    // Update performance metrics
    agent.performance.totalTasks++;
    agent.performance.completedTasks++;
    
    // Update success rate (assuming task completed successfully)
    const currentSuccessRate = agent.performance.successRate;
    agent.performance.successRate = Math.round(
      (currentSuccessRate * (agent.performance.totalTasks - 1) + 100) / agent.performance.totalTasks
    );

    // Update average quality
    const currentAvgQuality = agent.performance.averageQuality;
    agent.performance.averageQuality = Math.round(
      (currentAvgQuality * (agent.performance.totalTasks - 1) + quality) / agent.performance.totalTasks
    );

    // Update average execution time
    const currentAvgTime = agent.performance.averageExecutionTime;
    agent.performance.averageExecutionTime = Math.round(
      (currentAvgTime * (agent.performance.totalTasks - 1) + executionTime) / agent.performance.totalTasks
    );

    // Update user satisfaction
    const currentSatisfaction = agent.performance.userSatisfaction;
    agent.performance.userSatisfaction = Math.round(
      (currentSatisfaction * (agent.performance.totalTasks - 1) + userRating) / agent.performance.totalTasks
    );

    // Update last month performance (simplified)
    agent.performance.lastMonthPerformance = { ...agent.performance.allTimePerformance };

    return true;
  }

  /**
   * Get agent collaboration data
   */
  public getAgentCollaboration(collaborationId: string): AgentCollaboration | undefined {
    return this.agentCollaborations.get(collaborationId);
  }

  /**
   * Create agent collaboration
   */
  public createAgentCollaboration(
    agents: string[],
    projectId: string,
    collaborationType: 'sequential' | 'parallel' | 'hierarchical' | 'peer' | 'adaptive'
  ): AgentCollaboration {
    const collaboration: AgentCollaboration = {
      id: `collab-${Date.now()}`,
      agents,
      projectId,
      collaborationType,
      communicationChannels: [],
      sharedResources: [],
      coordinationRules: [],
      status: 'active',
      startedAt: new Date()
    };

    this.agentCollaborations.set(collaboration.id, collaboration);
    return collaboration;
  }

  /**
   * Get all agent assignments
   */
  public getAllAssignments(): AgentAssignment[] {
    return Array.from(this.agentAssignments.values());
  }

  /**
   * Get assignments for a specific project
   */
  public getProjectAssignments(projectId: string): AgentAssignment[] {
    return Array.from(this.agentAssignments.values()).filter(
      assignment => assignment.projectId === projectId
    );
  }

  /**
   * Get assignments for a specific agent
   */
  public getAgentAssignments(agentId: string): AgentAssignment[] {
    return Array.from(this.agentAssignments.values()).filter(
      assignment => assignment.agentId === agentId
    );
  }
}

// Export singleton instance
export const aiAgentManager = AIAgentManager.getInstance();
