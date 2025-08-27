// AI Agent Orchestrator Service
// This service coordinates between AI agents and intelligent workflows

import { aiAgentManager } from './AIAgentManager';
import { intelligentWorkflowManager } from './IntelligentWorkflowManager';
import { enhancedProjectManager } from './EnhancedProjectManager';
import { dynamicPromptEngine } from './DynamicPromptEngine';
import { aiCapabilityManager } from './AICapabilityManager';

import {
  AIAgent,
  AgentType,
  AgentTask,
  AgentStatus,
  AgentCollaboration,
  AgentAssignment,
  WorkflowStep
} from '../types/ai-agents';

import {
  IntelligentWorkflow,
  WorkflowStep as IWorkflowStep,
  StepStatus,
  StepAutomation,
  AutomationRule,
  WorkflowCollaboration,
  WorkflowMetrics
} from '../types/intelligent-workflow';

import {
  EnhancedProject,
  Act,
  Chapter,
  Scene,
  ProjectContext
} from '../types/enhanced-project';

import {
  PromptInstruction,
  AICapability,
  AIPromptTemplate,
  AIOptimizationStrategy
} from '../types/ai-adaptability';

export class AIAgentOrchestrator {
  private static instance: AIAgentOrchestrator;
  private activeCollaborations: Map<string, AgentCollaboration> = new Map();
  private taskQueue: Map<string, AgentTask[]> = new Map();
  private performanceMetrics: Map<string, any> = new Map();

  private constructor() {
    this.initializeOrchestrator();
  }

  public static getInstance(): AIAgentOrchestrator {
    if (!AIAgentOrchestrator.instance) {
      AIAgentOrchestrator.instance = new AIAgentOrchestrator();
    }
    return AIAgentOrchestrator.instance;
  }

  /**
   * Initialize the orchestrator
   */
  private initializeOrchestrator(): void {
    console.log('🤖 AI Agent Orchestrator initialized');
    this.startPerformanceMonitoring();
  }

  /**
   * Start performance monitoring
   */
  private startPerformanceMonitoring(): void {
    setInterval(() => {
      this.updatePerformanceMetrics();
    }, 30000); // Update every 30 seconds
  }

  /**
   * Orchestrate a complete workflow execution
   */
  public async orchestrateWorkflow(
    projectId: string,
    workflowId: string,
    context: ProjectContext
  ): Promise<boolean> {
    try {
      const workflow = intelligentWorkflowManager.getWorkflow(workflowId);
      if (!workflow) {
        throw new Error(`Workflow ${workflowId} not found`);
      }

      console.log(`🎬 Orchestrating workflow: ${workflow.name}`);

      // Initialize workflow execution
      await this.initializeWorkflowExecution(workflow, context);

      // Execute workflow steps
      for (const step of workflow.steps) {
        const success = await this.executeWorkflowStep(workflow, step, context);
        if (!success) {
          console.error(`❌ Failed to execute step: ${step.id}`);
          return false;
        }

        // Move to next step
        intelligentWorkflowManager.moveToNextStep(workflowId);
      }

      console.log(`✅ Workflow completed successfully: ${workflow.name}`);
      return true;

    } catch (error) {
      console.error('❌ Workflow orchestration failed:', error);
      return false;
    }
  }

  /**
   * Initialize workflow execution
   */
  private async initializeWorkflowExecution(
    workflow: IntelligentWorkflow,
    context: ProjectContext
  ): Promise<void> {
    console.log(`🚀 Initializing workflow execution for: ${workflow.name}`);

    // Set workflow status to in-progress
    workflow.status = 'in-progress';
    workflow.startedAt = new Date();

    // Initialize first step
    if (workflow.steps.length > 0) {
      const firstStep = workflow.steps[0];
      firstStep.status = 'in-progress';
      firstStep.startedAt = new Date();
      workflow.currentStep = firstStep;
    }

    // Initialize agent assignments
    await this.initializeAgentAssignments(workflow, context);

    // Set up collaboration
    await this.setupWorkflowCollaboration(workflow, context);

    console.log(`✅ Workflow initialization completed`);
  }

  /**
   * Initialize agent assignments for workflow
   */
  private async initializeAgentAssignments(
    workflow: IntelligentWorkflow,
    context: ProjectContext
  ): Promise<void> {
    console.log(`👥 Initializing agent assignments`);
    console.log(`📋 Workflow has ${workflow.steps.length} steps`);
    console.log(`🤖 Available agents: ${aiAgentManager.getAllAgents().length}`);
    
    // Log available agent types
    const agentTypes = aiAgentManager.getAllAgents().map(agent => agent.type);
    console.log(`🔍 Available agent types:`, [...new Set(agentTypes)]);
    
    // Log workflow step types
    const stepTypes = workflow.steps.map(step => step.type);
    console.log(`🎯 Workflow step types:`, stepTypes);

    for (const step of workflow.steps) {
      console.log(`🔍 Looking for optimal agent for step ${step.id} (${step.type})`);
      
      // Get optimal agent for this step
      const optimalAgent = aiAgentManager.getOptimalAgentForTask(
        step.type,
        context,
        step.requirements?.map(req => req.description) || []
      );

      if (optimalAgent) {
        console.log(`🤖 Found optimal agent: ${optimalAgent.name} (${optimalAgent.type})`);
        
        // Create agent assignment
        const assignment = aiAgentManager.assignAgentToTask(
          optimalAgent.id,
          step.id,
          workflow.projectId,
          step.priority || 5
        );

        if (assignment) {
          workflow.agents.push(assignment);
          console.log(`✅ Assigned agent ${optimalAgent.name} to step ${step.id}`);
        } else {
          console.log(`❌ Failed to create assignment for agent ${optimalAgent.name}`);
        }
      } else {
        console.log(`❌ No optimal agent found for step ${step.id} (${step.type})`);
        console.warn(`⚠️ No optimal agent found for step ${step.id}`);
      }
    }
  }

  /**
   * Setup workflow collaboration
   */
  private async setupWorkflowCollaboration(
    workflow: IntelligentWorkflow,
    context: ProjectContext
  ): Promise<void> {
    console.log(`🤝 Setting up workflow collaboration`);

    if (workflow.agents.length > 1) {
      // Create collaboration between agents
      const agentIds = workflow.agents.map(assignment => assignment.agentId);
      const collaboration = aiAgentManager.createAgentCollaboration(
        agentIds,
        workflow.projectId,
        'adaptive'
      );

      this.activeCollaborations.set(collaboration.id, collaboration);
      console.log(`✅ Created collaboration: ${collaboration.id}`);
    }
  }

  /**
   * Execute a single workflow step
   */
  private async executeWorkflowStep(
    workflow: IntelligentWorkflow,
    step: IWorkflowStep,
    context: ProjectContext
  ): Promise<boolean> {
    try {
      console.log(`🎯 Executing step: ${step.id} (${step.type})`);

      // Get assigned agent for this step
      const agentAssignment = workflow.agents.find(
        assignment => assignment.taskId === step.id
      );

      if (!agentAssignment) {
        throw new Error(`No agent assigned to step ${step.id}`);
      }

      const agent = aiAgentManager.getAgent(agentAssignment.agentId);
      if (!agent) {
        throw new Error(`Agent not found: ${agentAssignment.agentId}`);
      }

      // Update step status
      step.status = 'in-progress';
      step.startedAt = new Date();

      // Execute step with agent
      const result = await this.executeStepWithAgent(agent, step, context);

      if (result.success) {
        // Update step status
        step.status = 'completed';
        step.completedAt = new Date();
        step.progress = 100;
        step.outputs = result.outputs;

        // Update agent performance
        aiAgentManager.updateAgentPerformance(
          agent.id,
          result.outputs,
          result.quality || 85,
          result.executionTime || 30,
          result.userRating || 85
        );

        console.log(`✅ Step completed successfully: ${step.id}`);
        return true;

      } else {
        // Handle step failure
        step.status = 'failed';
        step.blockers = [{
          id: `blocker-${Date.now()}`,
          type: 'execution-failure',
          description: result.error || 'Unknown error occurred',
          severity: 'high',
          createdAt: new Date(),
          isActive: true
        }];

        console.error(`❌ Step failed: ${step.id} - ${result.error}`);
        return false;
      }

    } catch (error) {
      console.error(`❌ Error executing step ${step.id}:`, error);
      
      // Update step status
      step.status = 'failed';
      step.blockers = [{
        id: `blocker-${Date.now()}`,
        type: 'execution-error',
        description: error instanceof Error ? error.message : 'Unknown error',
        severity: 'high',
        createdAt: new Date(),
        isActive: true
      }];

      return false;
    }
  }

  /**
   * Execute step with a specific agent
   */
  private async executeStepWithAgent(
    agent: AIAgent,
    step: IWorkflowStep,
    context: ProjectContext
  ): Promise<{
    success: boolean;
    outputs?: any;
    quality?: number;
    executionTime?: number;
    userRating?: number;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      console.log(`🤖 Agent ${agent.name} executing step ${step.id}`);

      // Generate appropriate prompt for the agent
      const prompt = await this.generateAgentPrompt(agent, step, context);

      // Execute agent task based on step type
      let result: any;

      switch (step.type) {
        case 'ideation':
          result = await this.executeIdeationStep(agent, step, context, prompt);
          break;
        case 'storyboard':
          result = await this.executeStoryboardStep(agent, step, context, prompt);
          break;
        case 'scene-direction':
          result = await this.executeSceneDirectionStep(agent, step, context, prompt);
          break;
        case 'video-generation':
          result = await this.executeVideoGenerationStep(agent, step, context, prompt);
          break;
        case 'review':
          result = await this.executeReviewStep(agent, step, context, prompt);
          break;
        case 'optimization':
          result = await this.executeOptimizationStep(agent, step, context, prompt);
          break;
        default:
          throw new Error(`Unknown step type: ${step.type}`);
      }

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        outputs: result,
        quality: this.calculateStepQuality(result, step),
        executionTime: Math.round(executionTime / 1000), // Convert to seconds
        userRating: 85 // Default rating, would come from user feedback
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      return {
        success: false,
        executionTime: Math.round(executionTime / 1000),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Generate prompt for agent execution
   */
  private async generateAgentPrompt(
    agent: AIAgent,
    step: IWorkflowStep,
    context: ProjectContext
  ): Promise<string> {
    // Get agent capabilities
    const relevantCapabilities = agent.capabilities.filter(cap => 
      cap.applicableSteps.includes(step.type)
    );

    // Get AI capabilities for the current model
    const aiCapabilities = await aiCapabilityManager.getCapabilities();

    // Generate dynamic prompt
    const prompt = await dynamicPromptEngine.generatePrompt(
      context,
      step.type as any, // category
      'gpt-4', // aiModel - using a default model
      `Execute ${step.type} step with agent ${agent.name}`,
      {
        agentType: agent.type,
        stepType: step.type,
        agentCapabilities: relevantCapabilities,
        aiCapabilities,
        stepRequirements: step.requirements || [],
        customInstructions: step.customInstructions || ''
      }
    );

    return prompt;
  }

  /**
   * Execute ideation step
   */
  private async executeIdeationStep(
    agent: AIAgent,
    step: IWorkflowStep,
    context: ProjectContext,
    prompt: string
  ): Promise<any> {
    console.log(`💡 Executing ideation step with agent ${agent.name}`);

    // Simulate AI ideation process
    const concepts = [
      'Interactive storytelling with branching narratives',
      'Multi-perspective character development',
      'Dynamic scene transitions with AI-generated music',
      'Personalized content adaptation based on viewer preferences',
      'Real-time audience interaction and feedback integration'
    ];

    // Select concept based on agent creativity
    const creativityScore = agent.personality.creativity;
    const selectedConcept = concepts[Math.floor((creativityScore / 100) * concepts.length)];

    return {
      concept: selectedConcept,
      description: `A ${selectedConcept.toLowerCase()} approach that leverages ${agent.expertise.join(', ')}`,
      targetAudience: context.targetAudience || 'General audience',
      estimatedDuration: context.targetDuration || 60,
      keyMessages: [
        'Engage viewers with interactive elements',
        'Create emotional connection through character development',
        'Maintain visual consistency across scenes',
        'Optimize for multiple viewing platforms'
      ],
      successMetrics: [
        'Viewer engagement rate > 80%',
        'Completion rate > 90%',
        'Social sharing > 50%',
        'Brand recall > 70%'
      ]
    };
  }

  /**
   * Execute storyboard step
   */
  private async executeStoryboardStep(
    agent: AIAgent,
    step: IWorkflowStep,
    context: ProjectContext,
    prompt: string
  ): Promise<any> {
    console.log(`🎨 Executing storyboard step with agent ${agent.name}`);

    // Simulate AI storyboard generation
    const visualStyle = agent.personality.creativity > 85 ? 'cinematic' : 'modern';
    const composition = agent.personality.analytical > 80 ? 'rule-of-thirds' : 'dynamic';

    return {
      storyboard: {
        style: visualStyle,
        composition: composition,
        colorPalette: ['#2C3E50', '#3498DB', '#E74C3C', '#F39C12'],
        shotTypes: ['wide', 'medium', 'close-up', 'extreme-close-up'],
        transitions: ['fade', 'dissolve', 'wipe', 'cut']
      },
      scenes: [
        {
          id: 'scene-1',
          description: 'Opening establishing shot with dynamic camera movement',
          duration: 5,
          visualElements: ['cityscape', 'sunrise', 'movement'],
          cameraWork: 'dolly shot with crane movement',
          lighting: 'natural golden hour lighting'
        },
        {
          id: 'scene-2',
          description: 'Character introduction with intimate framing',
          duration: 8,
          visualElements: ['character', 'environment', 'props'],
          cameraWork: 'steady close-up with subtle movement',
          lighting: 'soft key light with rim lighting'
        }
      ],
      technicalSpecs: {
        aspectRatio: '16:9',
        frameRate: 24,
        resolution: '4K',
        colorGrading: 'cinematic look'
      }
    };
  }

  /**
   * Execute scene direction step
   */
  private async executeSceneDirectionStep(
    agent: AIAgent,
    step: IWorkflowStep,
    context: ProjectContext,
    prompt: string
  ): Promise<any> {
    console.log(`🎬 Executing scene direction step with agent ${agent.name}`);

    // Simulate AI scene direction
    const directionStyle = agent.personality.leadership > 85 ? 'authoritative' : 'collaborative';
    const communicationStyle = agent.personality.communication > 90 ? 'detailed' : 'concise';

    return {
      direction: {
        style: directionStyle,
        communication: communicationStyle,
        approach: 'character-driven storytelling'
      },
      productionNotes: [
        'Focus on emotional beats and character development',
        'Maintain consistent visual language throughout',
        'Use lighting to guide viewer attention',
        'Coordinate camera movement with actor blocking'
      ],
      technicalRequirements: [
        'Steady camera work for emotional scenes',
        'Consistent color temperature across shots',
        'Proper audio levels for dialogue clarity',
        'Smooth transitions between scenes'
      ],
      performanceGuidance: [
        'Encourage natural, authentic performances',
        'Use close-ups for emotional moments',
        'Maintain pacing through editing rhythm',
        'Create visual interest in every frame'
      ]
    };
  }

  /**
   * Execute video generation step
   */
  private async executeVideoGenerationStep(
    agent: AIAgent,
    step: IWorkflowStep,
    context: ProjectContext,
    prompt: string
  ): Promise<any> {
    console.log(`🎥 Executing video generation step with agent ${agent.name}`);

    // Simulate AI video generation
    const technicalQuality = agent.personality.technical > 85 ? 'high' : 'standard';
    const efficiency = agent.personality.efficiency > 90 ? 'optimized' : 'balanced';

    return {
      generation: {
        quality: technicalQuality,
        efficiency: efficiency,
        approach: 'AI-assisted creative generation'
      },
      output: {
        format: 'MP4',
        resolution: '4K',
        frameRate: 24,
        bitrate: '50 Mbps',
        audio: 'AAC, 320 kbps'
      },
      processing: {
        estimatedTime: '15-20 minutes',
        resourceUsage: 'GPU-accelerated',
        optimization: 'automatic quality optimization',
        fallback: 'manual quality adjustment if needed'
      },
      qualityControl: [
        'Automatic quality assessment',
        'Consistency checking across scenes',
        'Audio-visual synchronization',
        'Export format validation'
      ]
    };
  }

  /**
   * Execute review step
   */
  private async executeReviewStep(
    agent: AIAgent,
    step: IWorkflowStep,
    context: ProjectContext,
    prompt: string
  ): Promise<any> {
    console.log(`🔍 Executing review step with agent ${agent.name}`);

    // Simulate AI review process
    const analyticalScore = agent.personality.analytical;
    const reviewDepth = analyticalScore > 90 ? 'comprehensive' : 'standard';

    return {
      review: {
        type: reviewDepth,
        approach: 'multi-dimensional assessment',
        focus: 'quality, consistency, and effectiveness'
      },
      assessment: {
        overallQuality: 88,
        technicalQuality: 92,
        creativeQuality: 85,
        consistency: 90,
        effectiveness: 87
      },
      findings: [
        'Strong visual consistency across scenes',
        'Excellent technical quality and resolution',
        'Good pacing and rhythm throughout',
        'Minor audio synchronization issues in scene 2',
        'Color grading could be more consistent'
      ],
      recommendations: [
        'Adjust audio sync in scene 2',
        'Standardize color grading across all scenes',
        'Enhance visual effects in transition sequences',
        'Optimize audio levels for better clarity'
      ]
    };
  }

  /**
   * Execute optimization step
   */
  private async executeOptimizationStep(
    agent: AIAgent,
    step: IWorkflowStep,
    context: ProjectContext,
    prompt: string
  ): Promise<any> {
    console.log(`⚡ Executing optimization step with agent ${agent.name}`);

    // Simulate AI optimization
    const optimizationLevel = agent.personality.efficiency > 90 ? 'aggressive' : 'balanced';
    const innovationScore = agent.personality.innovation;

    return {
      optimization: {
        level: optimizationLevel,
        approach: 'data-driven improvement',
        focus: 'efficiency, quality, and user experience'
      },
      improvements: [
        'Reduced processing time by 25%',
        'Enhanced visual quality by 15%',
        'Improved audio clarity by 20%',
        'Optimized file size by 30%'
      ],
      strategies: [
        'Advanced compression algorithms',
        'Smart quality scaling',
        'Intelligent resource allocation',
        'Predictive caching'
      ],
      metrics: {
        beforeOptimization: {
          processingTime: '20 minutes',
          fileSize: '2.5 GB',
          qualityScore: 85
        },
        afterOptimization: {
          processingTime: '15 minutes',
          fileSize: '1.75 GB',
          qualityScore: 92
        }
      }
    };
  }

  /**
   * Calculate step quality score
   */
  private calculateStepQuality(result: any, step: IWorkflowStep): number {
    // Base quality score
    let quality = 85;

    // Adjust based on step type and result complexity
    switch (step.type) {
      case 'ideation':
        if (result.concept && result.keyMessages && result.successMetrics) {
          quality += 10;
        }
        break;
      case 'storyboard':
        if (result.storyboard && result.scenes && result.technicalSpecs) {
          quality += 8;
        }
        break;
      case 'scene-direction':
        if (result.direction && result.productionNotes && result.technicalRequirements) {
          quality += 7;
        }
        break;
      case 'video-generation':
        if (result.generation && result.output && result.qualityControl) {
          quality += 9;
        }
        break;
      case 'review':
        if (result.assessment && result.findings && result.recommendations) {
          quality += 6;
        }
        break;
      case 'optimization':
        if (result.improvements && result.strategies && result.metrics) {
          quality += 8;
        }
        break;
    }

    // Cap quality at 100
    return Math.min(quality, 100);
  }

  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(): void {
    const workflows = Array.from(intelligentWorkflowManager['workflows'].values());
    
    workflows.forEach(workflow => {
      const metrics = {
        workflowId: workflow.id,
        name: workflow.name,
        status: workflow.status,
        progress: workflow.metrics.currentProgress,
        quality: workflow.metrics.averageQuality,
        efficiency: workflow.metrics.efficiency,
        timestamp: new Date()
      };

      this.performanceMetrics.set(workflow.id, metrics);
    });
  }

  /**
   * Get orchestrator performance metrics
   */
  public getPerformanceMetrics(): any[] {
    return Array.from(this.performanceMetrics.values());
  }

  /**
   * Get active collaborations
   */
  public getActiveCollaborations(): AgentCollaboration[] {
    return Array.from(this.activeCollaborations.values());
  }

  /**
   * Get task queue status
   */
  public getTaskQueueStatus(): any {
    const queueStatus: any = {};
    
    this.taskQueue.forEach((tasks, projectId) => {
      queueStatus[projectId] = {
        totalTasks: tasks.length,
        pendingTasks: tasks.filter(task => task.status === 'pending').length,
        inProgressTasks: tasks.filter(task => task.status === 'in-progress').length,
        completedTasks: tasks.filter(task => task.status === 'completed').length
      };
    });

    return queueStatus;
  }
}

// Export singleton instance
export const aiAgentOrchestrator = AIAgentOrchestrator.getInstance();
