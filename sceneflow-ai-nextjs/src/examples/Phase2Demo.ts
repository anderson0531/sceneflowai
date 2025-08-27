// Phase 2 Demo - AI Agents & Intelligent Workflow
// This file demonstrates the new Phase 2 functionality

import { aiAgentManager } from '../services/AIAgentManager';
import { intelligentWorkflowManager } from '../services/IntelligentWorkflowManager';
import { aiAgentOrchestrator } from '../services/AIAgentOrchestrator';
import { enhancedProjectManager } from '../services/EnhancedProjectManager';

// Demo data and functions
export const runPhase2Demo = async () => {
  console.log('🚀 Starting Phase 2 Demo - AI Agents & Intelligent Workflow');
  console.log('==========================================================');

  try {
    // 1. Test AI Agent Manager
    await demoAIAgentManagement();
    
    // 2. Test Intelligent Workflow Manager
    await demoIntelligentWorkflowManagement();
    
    // 3. Test AI Agent Orchestrator
    await demoAIOrchestration();
    
    // 4. Test Integration with Enhanced Project Manager
    await demoEnhancedProjectIntegration();
    
    // 5. Test Performance and Analytics
    await demoPerformanceAnalytics();

    console.log('✅ Phase 2 Demo completed successfully!');
    return true;

  } catch (error) {
    console.error('❌ Phase 2 Demo failed:', error);
    return false;
  }
};

/**
 * Demo AI Agent Management functionality
 */
const demoAIAgentManagement = async () => {
  console.log('\n🤖 Testing AI Agent Management...');
  
  // Get all agents
  const allAgents = aiAgentManager.getAllAgents();
  console.log(`📊 Total agents: ${allAgents.length}`);
  
  // Get agents by type
  const ideationAgents = aiAgentManager.getAgentsByType('ideation-specialist');
  console.log(`💡 Ideation specialists: ${ideationAgents.length}`);
  
      const storyboardAgents = aiAgentManager.getAgentsByType('storyboard-artist');
  console.log(`🎨 Storyboard artists: ${storyboardAgents.length}`);
  
  // Test agent assignment
  const testAssignment = aiAgentManager.assignAgentToTask(
    'ideation-specialist-001',
    'test-task-001',
    'test-project-001',
    8
  );
  console.log(`✅ Agent assignment created: ${testAssignment ? 'Success' : 'Failed'}`);
  
  // Test agent performance update
  const performanceUpdated = aiAgentManager.updateAgentPerformance(
    'ideation-specialist-001',
    { concept: 'Test concept' },
    92,
    45,
    88
  );
  console.log(`📈 Performance updated: ${performanceUpdated ? 'Success' : 'Failed'}`);
  
  // Get agent performance
  const performance = aiAgentManager.getAgentPerformance('ideation-specialist-001');
  console.log(`📊 Agent performance:`, performance);
  
  // Test agent collaboration
  const collaboration = aiAgentManager.createAgentCollaboration(
    ['ideation-specialist-001', 'storyboard-artist-001'],
    'test-project-001',
    'parallel'
  );
  console.log(`🤝 Collaboration created: ${collaboration.id}`);
  
  // Get all assignments
  const allAssignments = aiAgentManager.getAllAssignments();
  console.log(`📋 Total assignments: ${allAssignments.length}`);
  
  console.log('✅ AI Agent Management demo completed');
};

/**
 * Demo Intelligent Workflow Management functionality
 */
const demoIntelligentWorkflowManagement = async () => {
  console.log('\n🔄 Testing Intelligent Workflow Management...');
  
  // Create workflow steps
  const workflowSteps = [
    {
      id: 'step-ideation-001',
      type: 'ideation',
      name: 'Creative Ideation',
      description: 'Generate creative video concepts',
      status: 'pending',
      priority: 8,
      requirements: [
        {
          id: 'req-001',
          type: 'creative',
          description: 'Generate unique and engaging concepts',
          isRequired: true
        }
      ],
      customInstructions: 'Focus on innovative storytelling approaches'
    },
    {
      id: 'step-storyboard-001',
      type: 'storyboard',
      name: 'Visual Storyboarding',
      description: 'Create compelling visual storyboards',
      status: 'pending',
      priority: 7,
      requirements: [
        {
          id: 'req-002',
          type: 'visual',
          description: 'Create detailed visual compositions',
          isRequired: true
        }
      ]
    },
    {
      id: 'step-direction-001',
      type: 'scene-direction',
      name: 'Scene Direction',
      description: 'Provide detailed scene direction',
      status: 'pending',
      priority: 6,
      requirements: [
        {
          id: 'req-003',
          type: 'technical',
          description: 'Provide production guidance',
          isRequired: true
        }
      ]
    }
  ];
  
  // Create intelligent workflow
  const workflow = intelligentWorkflowManager.createWorkflow(
    'test-project-001',
    'Demo Workflow',
    'A demonstration of intelligent workflow capabilities',
    workflowSteps
  );
  console.log(`✅ Workflow created: ${workflow.id}`);
  
  // Get workflow
  const retrievedWorkflow = intelligentWorkflowManager.getWorkflow(workflow.id);
  console.log(`📋 Retrieved workflow: ${retrievedWorkflow?.name}`);
  
  // Update workflow step
  const stepUpdated = intelligentWorkflowManager.updateWorkflowStep(
    workflow.id,
    'step-ideation-001',
    { status: 'in-progress', startedAt: new Date() }
  );
  console.log(`🔄 Step updated: ${stepUpdated ? 'Success' : 'Failed'}`);
  
  // Move to next step
  const nextStep = intelligentWorkflowManager.moveToNextStep(workflow.id);
  console.log(`➡️ Moved to next step: ${nextStep ? 'Success' : 'Failed'}`);
  
  // Get workflow analytics
  const analytics = intelligentWorkflowManager.getWorkflowAnalytics(workflow.id);
  console.log(`📊 Workflow analytics:`, analytics);
  
  // Get automation rules
  const automationRules = intelligentWorkflowManager.getAutomationRules();
  console.log(`⚙️ Automation rules: ${automationRules.length}`);
  
  // Get quality thresholds
  const qualityThresholds = intelligentWorkflowManager.getQualityThresholds();
  console.log(`🎯 Quality thresholds: ${qualityThresholds.length}`);
  
  console.log('✅ Intelligent Workflow Management demo completed');
};

/**
 * Demo AI Agent Orchestration functionality
 */
const demoAIOrchestration = async () => {
  console.log('\n🎬 Testing AI Agent Orchestration...');
  
  // Create project context
  const projectContext = {
    projectId: 'test-project-001',
    projectType: 'medium',
    targetAudience: 'Young professionals',
    targetDuration: 120,
    genre: 'educational',
    tone: 'professional',
    style: 'modern',
    budget: 'medium',
    timeline: '2 weeks',
    teamSize: 5,
    collaborationLevel: 'high',
    qualityStandards: 'professional',
    technicalRequirements: ['4K resolution', 'professional audio'],
    creativeConstraints: ['brand guidelines', 'accessibility requirements'],
    successMetrics: ['engagement rate', 'completion rate', 'brand recall']
  };
  
  // Create a simple workflow for orchestration
  const orchestrationSteps = [
    {
      id: 'orch-step-001',
      type: 'ideation',
      name: 'Orchestrated Ideation',
      description: 'AI-powered concept generation',
      status: 'pending',
      priority: 9,
      requirements: [],
      customInstructions: 'Generate innovative concepts using AI agents'
    }
  ];
  
  const orchestrationWorkflow = intelligentWorkflowManager.createWorkflow(
    'test-project-001',
    'Orchestration Demo',
    'Testing AI agent orchestration',
    orchestrationSteps
  );
  
  // Test workflow orchestration
  const orchestrationSuccess = await aiAgentOrchestrator.orchestrateWorkflow(
    'test-project-001',
    orchestrationWorkflow.id,
    projectContext
  );
  console.log(`🎬 Workflow orchestration: ${orchestrationSuccess ? 'Success' : 'Failed'}`);
  
  // Get orchestration metrics
  const orchestrationMetrics = aiAgentOrchestrator.getPerformanceMetrics();
  console.log(`📊 Orchestration metrics: ${orchestrationMetrics.length}`);
  
  // Get active collaborations
  const activeCollaborations = aiAgentOrchestrator.getActiveCollaborations();
  console.log(`🤝 Active collaborations: ${activeCollaborations.length}`);
  
  // Get task queue status
  const taskQueueStatus = aiAgentOrchestrator.getTaskQueueStatus();
  console.log(`📋 Task queue status:`, taskQueueStatus);
  
  console.log('✅ AI Agent Orchestration demo completed');
};

/**
 * Demo Enhanced Project Integration
 */
const demoEnhancedProjectIntegration = async () => {
  console.log('\n🏗️ Testing Enhanced Project Integration...');
  
  try {
    // Create a test project
    const project = await enhancedProjectManager.createProject(
      'Phase 2 Demo Project',
      'A comprehensive test of Phase 2 functionality',
      'medium',
      'three-act',
      {
        genre: 'documentary',
        targetAudience: 'General audience',
        estimatedDuration: 90,
        productionStyle: 'cinematic',
        visualTheme: 'modern minimalism'
      }
    );
    console.log(`✅ Project created: ${project.id}`);
    
    // Add an act
    const act = await enhancedProjectManager.addAct(project.id, {
      title: 'Introduction',
      summary: 'Setting up the story and context',
      targetDuration: 30,
      keyObjectives: ['Establish context', 'Introduce main themes'],
      visualStyle: 'clean and modern',
      mood: 'informative',
      transitions: ['fade-in', 'cross-dissolve'],
      status: 'planned',
      progress: 0,
      notes: 'Focus on clarity and engagement',
      aiSuggestions: []
    });
    console.log(`✅ Act added: ${act.id}`);
    
    // Add a chapter
    const chapter = await enhancedProjectManager.addChapter(project.id, act.id, {
      title: 'Opening Sequence',
      summary: 'The hook that draws viewers in',
      targetDuration: 10,
      keyObjectives: ['Grab attention', 'Set tone'],
      visualStyle: 'dynamic',
      mood: 'engaging',
      transitions: ['quick cuts', 'zoom effects'],
      status: 'planned',
      progress: 0,
      notes: 'Use compelling visuals and audio',
      aiSuggestions: []
    });
    console.log(`✅ Chapter added: ${chapter.id}`);
    
    // Add a scene
    const scene = await enhancedProjectManager.addScene(project.id, chapter.id, {
      title: 'Title Sequence',
      summary: 'Animated title with background music',
      targetDuration: 5,
      keyObjectives: ['Display title', 'Set mood'],
      visualStyle: 'animated',
      mood: 'professional',
      cameraWork: 'static',
      lighting: 'studio lighting',
      audioStyle: 'background music',
      status: 'planned',
      progress: 0,
      notes: 'Keep it simple but engaging',
      aiSuggestions: []
    });
    console.log(`✅ Scene added: ${scene.id}`);
    
    console.log('✅ Enhanced Project Integration demo completed');
    
  } catch (error) {
    console.error('❌ Enhanced Project Integration demo failed:', error);
  }
};

/**
 * Demo Performance and Analytics
 */
const demoPerformanceAnalytics = async () => {
  console.log('\n📊 Testing Performance and Analytics...');
  
  // Get agent performance data
  const agentPerformance = aiAgentManager.getAgentPerformance('ideation-specialist-001');
  console.log(`📈 Agent performance:`, agentPerformance);
  
  // Get workflow analytics
  const workflows = intelligentWorkflowManager['workflows'];
  if (workflows.size > 0) {
    const firstWorkflowId = Array.from(workflows.keys())[0];
    const workflowAnalytics = intelligentWorkflowManager.getWorkflowAnalytics(firstWorkflowId);
    console.log(`📊 Workflow analytics:`, workflowAnalytics);
  }
  
  // Get orchestration metrics
  const orchestrationMetrics = aiAgentOrchestrator.getPerformanceMetrics();
  console.log(`🎬 Orchestration metrics: ${orchestrationMetrics.length}`);
  
  // Get automation rules
  const automationRules = intelligentWorkflowManager.getAutomationRules();
  console.log(`⚙️ Automation rules: ${automationRules.length}`);
  
  // Get quality thresholds
  const qualityThresholds = intelligentWorkflowManager.getQualityThresholds();
  console.log(`🎯 Quality thresholds: ${qualityThresholds.length}`);
  
  console.log('✅ Performance and Analytics demo completed');
};

/**
 * Demo specific agent types
 */
export const demoAgentTypes = () => {
  console.log('\n🤖 Testing Different Agent Types...');
  
  const agentTypes = [
    'ideation-specialist',
    'storyboard-artist', 
    'scene-director',
    'video-producer',
    'quality-assurance',
    'collaboration-coordinator',
    'optimization-expert',
    'research-analyst'
  ];
  
  agentTypes.forEach(type => {
    const agents = aiAgentManager.getAgentsByType(type as any);
    console.log(`👥 ${type}: ${agents.length} agents`);
    
    if (agents.length > 0) {
      const agent = agents[0];
      console.log(`   - ${agent.name}: ${agent.description}`);
      console.log(`   - Capabilities: ${agent.capabilities.length}`);
      console.log(`   - Status: ${agent.status}`);
    }
  });
  
  console.log('✅ Agent Types demo completed');
};

/**
 * Demo workflow automation
 */
export const demoWorkflowAutomation = () => {
  console.log('\n⚙️ Testing Workflow Automation...');
  
  // Get automation rules
  const rules = intelligentWorkflowManager.getAutomationRules();
  console.log(`📋 Total automation rules: ${rules.length}`);
  
  rules.forEach((rule, index) => {
    console.log(`\n🔧 Rule ${index + 1}: ${rule.name}`);
    console.log(`   Description: ${rule.description}`);
    console.log(`   Trigger: ${rule.trigger.type}`);
    console.log(`   Actions: ${rule.actions.length}`);
    console.log(`   Priority: ${rule.priority}`);
    console.log(`   Active: ${rule.isActive}`);
  });
  
  // Get quality thresholds
  const thresholds = intelligentWorkflowManager.getQualityThresholds();
  console.log(`\n🎯 Quality thresholds: ${thresholds.length}`);
  
  thresholds.forEach((threshold, index) => {
    console.log(`\n📊 Threshold ${index + 1}: ${threshold.metric}`);
    console.log(`   Step type: ${threshold.stepType}`);
    console.log(`   Target: ${threshold.targetValue}`);
    console.log(`   Range: ${threshold.minValue} - ${threshold.maxValue}`);
    console.log(`   Active: ${threshold.isActive}`);
  });
  
  console.log('✅ Workflow Automation demo completed');
};

/**
 * Demo agent collaboration
 */
export const demoAgentCollaboration = () => {
  console.log('\n🤝 Testing Agent Collaboration...');
  
  // Create multiple collaborations
  const collaboration1 = aiAgentManager.createAgentCollaboration(
    ['ideation-specialist-001', 'storyboard-artist-001'],
    'collab-project-001',
    'sequential'
  );
  
  const collaboration2 = aiAgentManager.createAgentCollaboration(
    ['scene-director-001', 'video-producer-001', 'quality-assurance-001'],
    'collab-project-002',
    'parallel'
  );
  
  const collaboration3 = aiAgentManager.createAgentCollaboration(
    ['collaboration-coordinator-001', 'optimization-expert-001'],
    'collab-project-003',
    'hierarchical'
  );
  
  console.log(`✅ Created ${3} collaborations`);
  
  // Get all collaborations
  const allCollaborations = aiAgentManager.getAllAssignments();
  console.log(`📋 Total assignments: ${allCollaborations.length}`);
  
  // Get collaborations for specific project
  const projectCollaborations = aiAgentManager.getProjectAssignments('collab-project-001');
  console.log(`🏗️ Project collaborations: ${projectCollaborations.length}`);
  
  console.log('✅ Agent Collaboration demo completed');
};

// Export individual demo functions for selective testing
export {
  demoAIAgentManagement,
  demoIntelligentWorkflowManagement,
  demoAIOrchestration,
  demoEnhancedProjectIntegration,
  demoPerformanceAnalytics
};
