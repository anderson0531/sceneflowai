// Phase 1 Demo - Foundation & Core Architecture
// This file demonstrates the implementation of Phase 1 features

import { aiCapabilityManager } from '../services/AICapabilityManager';
import { dynamicPromptEngine } from '../services/DynamicPromptEngine';
import { enhancedProjectManager } from '../services/EnhancedProjectManager';
import { useEnhancedStore } from '../store/enhancedStore';
import { 
  AICapability, 
  PromptInstruction, 
  ProjectContext
} from '../types/ai-adaptability';
import { 
  EnhancedProject, 
  Act, 
  Chapter, 
  Scene,
  Character,
  Location,
  Prop
} from '../types/enhanced-project';

/**
 * Demo 1: AI Capability Management
 * Demonstrates how the system can adapt to new AI models and capabilities
 */
export async function demoAICapabilityManagement() {
  console.log('🚀 Demo 1: AI Capability Management');
  console.log('=====================================');

  try {
    // Get all registered AI capabilities
    const capabilities = aiCapabilityManager.getCapabilities();
    console.log('📊 Registered AI Models:', capabilities.map(c => `${c.model} v${c.version}`));

    // Register a new AI model capability (e.g., GPT-5 when available)
    const newGPT5Capability: AICapability = {
      model: 'gpt-5',
      version: '5.0',
      provider: 'openai',
      capabilities: {
        maxTokens: 1000000,
        vision: true,
        videoGeneration: true,
        audioGeneration: true,
        reasoning: true,
        creativity: 10,
        contextWindow: 1000000,
        multimodal: true,
        realTime: true,
        costPerToken: 0.000001
      },
      promptOptimizations: [
        'Leverage real-time capabilities',
        'Use advanced multimodal features',
        'Apply GPT-5 specific optimizations'
      ],
      bestPractices: [
        'Utilize real-time data integration',
        'Combine multiple modalities effectively',
        'Leverage advanced reasoning capabilities'
      ],
      limitations: [
        'Higher cost per token',
        'Requires real-time data sources',
        'May have usage restrictions'
      ],
      lastUpdated: new Date(),
      isActive: true
    };

    await aiCapabilityManager.registerCapability(newGPT5Capability);
    console.log('✅ GPT-5 capability registered successfully');

    // Test optimal model selection for different tasks
    const ideationTask = {
      id: 'task-1',
      type: 'generate',
      description: 'Generate creative video concepts for a sci-fi short film'
    };

    const projectContext: ProjectContext = {
      projectId: 'demo-project',
      projectType: 'short',
      genre: 'sci-fi',
      targetAudience: 'young adults',
      style: 'futuristic',
      tone: 'dramatic',
      complexity: 'complex',
      budget: 5000,
      timeline: 14,
      teamSize: 3,
      previousResults: [],
      userPreferences: {
        userId: 'demo-user',
        category: 'ideation',
        preferredModels: ['gpt-5', 'gpt-4o'],
        preferredStyles: ['creative', 'innovative'],
        qualityThreshold: 90,
        costSensitivity: 3,
        speedPreference: 'quality',
        lastUpdated: new Date()
      }
    };

    const optimalModel = await aiCapabilityManager.getOptimalModel(ideationTask, projectContext);
    console.log('🎯 Optimal model for ideation task:', optimalModel);

    // Get cost estimate
    const costEstimate = aiCapabilityManager.getCostEstimate(optimalModel, ideationTask);
    console.log('💰 Estimated cost for task:', `$${costEstimate.toFixed(4)}`);

  } catch (error) {
    console.error('❌ AI Capability Management demo failed:', error);
  }
}

/**
 * Demo 2: Dynamic Prompt Generation
 * Shows how prompts are automatically optimized for different AI models
 */
export async function demoDynamicPromptGeneration() {
  console.log('\n🚀 Demo 2: Dynamic Prompt Generation');
  console.log('=====================================');

  try {
    // Create a project context
    const projectContext: ProjectContext = {
      projectId: 'demo-project-2',
      projectType: 'medium',
      genre: 'documentary',
      targetAudience: 'general',
      style: 'cinematic',
      tone: 'informative',
      complexity: 'moderate',
      budget: 10000,
      timeline: 30,
      teamSize: 5,
      previousResults: [],
      userPreferences: {
        userId: 'demo-user',
        category: 'ideation',
        preferredModels: ['gpt-4o', 'gemini-3.0'],
        preferredStyles: ['structured', 'educational'],
        qualityThreshold: 85,
        costSensitivity: 5,
        speedPreference: 'balanced',
        lastUpdated: new Date()
      }
    };

    // Generate prompts for different categories
    const categories = ['ideation', 'storyboard', 'direction', 'generation'] as const;
    
    for (const category of categories) {
      const prompt = await dynamicPromptEngine.generatePrompt(
        projectContext,
        category,
        'gpt-4o',
        `Generate ${category} content for a documentary about climate change`,
        { focusArea: 'environmental impact', targetDuration: 5 }
      );
      
      console.log(`📝 ${category.charAt(0).toUpperCase() + category.slice(1)} Prompt:`);
      console.log(prompt.substring(0, 200) + '...');
      console.log('');
    }

    // Test prompt optimization
    const originalPrompt = 'Create a storyboard for a climate change documentary';
    const result = { quality: 7, feedback: 'Good but could be more specific about visual elements' };
    const feedback = 'The storyboard is good but needs more specific camera angles and visual details';
    
    const optimizedPrompt = await dynamicPromptEngine.optimizePrompt(
      originalPrompt,
      result,
      feedback,
      'gpt-4o',
      projectContext
    );
    
    console.log('🔄 Prompt Optimization:');
    console.log('Original:', originalPrompt);
    console.log('Optimized:', optimizedPrompt);

  } catch (error) {
    console.error('❌ Dynamic Prompt Generation demo failed:', error);
  }
}

/**
 * Demo 3: Enhanced Project Structure
 * Demonstrates the hierarchical project management with acts, chapters, and scenes
 */
export async function demoEnhancedProjectStructure() {
  console.log('\n🚀 Demo 3: Enhanced Project Structure');
  console.log('========================================');

  try {
    // Create a new enhanced project
    const project = await enhancedProjectManager.createProject(
      'The Climate Chronicles',
      'A compelling documentary about climate change and its global impact',
      'long',
      'three-act',
      {
        genre: 'documentary',
        targetAudience: 'general public',
        style: 'cinematic',
        tone: 'urgent but hopeful',
        concept: 'Exploring climate change through personal stories and scientific evidence',
        keyMessage: 'Climate action is urgent but achievable',
        budget: 50000,
        timeline: 90
      }
    );

    console.log('🎬 Project created:', project.title);
    console.log('📊 Project type:', project.structure.type);
    console.log('🏗️ Story structure:', project.structure.storyStructure);
    console.log('📅 Estimated timeline:', project.structure.estimatedTimeline, 'days');
    console.log('💰 Estimated budget:', `$${project.structure.estimatedBudget.toLocaleString()}`);

    // Add acts (automatically created for three-act structure)
    console.log('\n🎭 Acts created:', project.structure.acts.length);
    project.structure.acts.forEach(act => {
      console.log(`  - ${act.title}: ${act.summary}`);
    });

    // Add chapters to the first act
    const act1 = project.structure.acts[0];
    const chapter1 = await enhancedProjectManager.addChapter(
      project.id,
      act1.id,
      {
        title: 'The Problem',
        summary: 'Introduction to climate change and its current impact',
        targetDuration: 10,
        keyObjectives: ['Establish the problem', 'Create emotional impact', 'Set up the narrative'],
        transitions: [],
        status: 'planned',
        scenes: [],
        progress: 0,
        notes: [],
        aiSuggestions: []
      }
    );

    const chapter2 = await enhancedProjectManager.addChapter(
      project.id,
      act1.id,
      {
        title: 'The Evidence',
        summary: 'Scientific evidence and data supporting climate change',
        targetDuration: 15,
        keyObjectives: ['Present scientific data', 'Build credibility', 'Support claims with evidence'],
        transitions: [],
        status: 'planned',
        scenes: [],
        progress: 0,
        notes: [],
        aiSuggestions: []
      }
    );

    console.log('\n📖 Chapters added to Act 1:');
    console.log(`  - ${chapter1.title}: ${chapter1.summary}`);
    console.log(`  - ${chapter2.title}: ${chapter2.summary}`);

    // Add scenes to the first chapter
    const scene1 = await enhancedProjectManager.addScene(
      project.id,
      chapter1.id,
      {
        title: 'Opening Sequence',
        description: 'Aerial shots of melting glaciers and rising sea levels',
        targetDuration: 30,
        location: {
          id: 'arctic-location',
          name: 'Arctic Region',
          type: 'exterior',
          description: 'Remote Arctic landscape',
          visualStyle: 'vast, icy, desolate',
          mood: 'awe-inspiring but concerning',
          lighting: 'natural, cold, bright',
          props: [],
          accessibility: [],
          restrictions: [],
          visualReferences: [],
          aiGenerated: false
        },
        characters: [],
        props: [],
        visualStyle: {
          overall: 'documentary, cinematic',
          colorScheme: 'cool blues and whites',
          lighting: 'natural, dramatic',
          composition: 'wide establishing shots',
          movement: 'slow, contemplative',
          texture: 'crisp, clear',
          references: [],
          aiGenerated: false
        },
        audioStyle: {
          music: 'ambient, atmospheric',
          soundEffects: ['wind', 'water', 'ice'],
          ambient: 'natural environmental sounds',
          dialogue: 'clear, authoritative',
          mixing: 'balanced, immersive',
          aiGenerated: false
        },
        cameraWork: {
          angles: ['aerial', 'wide', 'medium'],
          movements: ['slow pan', 'zoom out'],
          framing: 'cinematic landscape',
          transitions: ['fade', 'dissolve'],
          aiGenerated: false
        },
        lighting: {
          type: 'natural',
          intensity: 'bright to dramatic',
          color: 'cool white to warm gold',
          direction: 'various angles',
          mood: 'awe-inspiring',
          aiGenerated: false
        },
        mood: 'awe-inspiring but concerning',
        keyActions: [],
        dialogue: []
      }
    );

    const scene2 = await enhancedProjectManager.addScene(
      project.id,
      chapter1.id,
      {
        title: 'Expert Interview',
        description: 'Climate scientist explaining the current situation',
        targetDuration: 45,
        location: {
          id: 'lab-location',
          name: 'Research Laboratory',
          type: 'interior',
          description: 'Modern scientific facility',
          visualStyle: 'clean, modern, scientific',
          mood: 'authoritative and informative',
          lighting: 'bright, clinical, professional',
          props: [],
          accessibility: [],
          restrictions: [],
          visualReferences: [],
          aiGenerated: false
        },
        characters: [],
        props: [],
        visualStyle: {
          overall: 'scientific, professional',
          colorScheme: 'clean whites and blues',
          lighting: 'bright, clinical',
          composition: 'balanced, informative',
          movement: 'steady, focused',
          texture: 'clean, precise',
          references: [],
          aiGenerated: false
        },
        audioStyle: {
          music: 'subtle, professional',
          soundEffects: ['equipment', 'ambient lab sounds'],
          ambient: 'laboratory environment',
          dialogue: 'clear, expert',
          mixing: 'clean, focused',
          aiGenerated: false
        },
        cameraWork: {
          angles: ['medium', 'close-up', 'over-the-shoulder'],
          movements: ['steady', 'minimal'],
          framing: 'professional interview',
          transitions: ['cut', 'fade'],
          aiGenerated: false
        },
        lighting: {
          type: 'artificial',
          intensity: 'bright, even',
          color: 'neutral white',
          direction: 'front and side',
          mood: 'professional, authoritative',
          aiGenerated: false
        },
        mood: 'authoritative and informative',
        keyActions: [],
        dialogue: []
      }
    );

    console.log('\n🎬 Scenes added to Chapter 1:');
    console.log(`  - ${scene1.title}: ${scene1.description}`);
    console.log(`  - ${scene2.title}: ${scene2.description}`);

    // Add global elements
    const character = await enhancedProjectManager.addCharacter(
      project.id,
      {
        name: 'Dr. Sarah Chen',
        role: 'protagonist',
        description: 'Leading climate scientist and narrator',
        personality: ['passionate', 'knowledgeable', 'hopeful'],
        appearance: 'Asian woman in her 40s, professional attire',
        motivations: ['saving the planet', 'educating the public', 'inspiring action'],
        arc: {
          start: 'Concerned but hopeful climate scientist',
          development: ['Discovery of new data', 'Public speaking challenges', 'Growing urgency'],
          end: 'Influential advocate for climate action',
          growth: 'From researcher to public figure and activist'
        },
        relationships: [],
        dialogueStyle: 'clear, passionate, accessible',
        visualReferences: [],
        aiGenerated: false
      }
    );

    const location = await enhancedProjectManager.addLocation(
      project.id,
      {
        name: 'Global Research Network',
        type: 'hybrid',
        description: 'International network of climate research stations',
        visualStyle: 'modern, scientific, interconnected',
        mood: 'collaborative and innovative',
        lighting: 'bright, clean, professional',
        props: [],
        accessibility: [],
        restrictions: [],
        visualReferences: [],
        aiGenerated: false
      }
    );

    const prop = await enhancedProjectManager.addProp(
      project.id,
      {
        name: 'Climate Data Dashboard',
        category: 'special',
        description: 'Interactive display showing real-time climate data',
        importance: 'critical',
        visualStyle: 'futuristic, data-rich, engaging',
        interactions: [],
        aiGenerated: false
      }
    );

    console.log('\n👥 Global Elements added:');
    console.log(`  - Character: ${character.name} (${character.role})`);
    console.log(`  - Location: ${location.name} (${location.type})`);
    console.log(`  - Prop: ${prop.name} (${prop.category})`);

    // Update project progress
    await enhancedProjectManager.updateProjectStep(project.id, 'ideation', 100);
    await enhancedProjectManager.updateProjectStep(project.id, 'storyboard', 75);
    await enhancedProjectManager.updateProjectStep(project.id, 'scene-direction', 50);

    console.log('\n📈 Project Progress Updated:');
    console.log('Current step:', project.workflow.currentStep);
    console.log('Overall progress:', project.progress, '%');

    // Add AI suggestions
    const suggestion = await enhancedProjectManager.addAISuggestion(
      project.id,
      'project',
      project.id,
      {
        type: 'improvement',
        content: 'Consider adding more personal stories to make the documentary more relatable',
        confidence: 85,
        reasoning: 'Personal narratives increase audience engagement and emotional connection',
        impact: 'high',
        aiModel: 'gpt-4o'
      }
    );

    console.log('\n🤖 AI Suggestion added:');
    console.log(`Type: ${suggestion.type}`);
    console.log(`Content: ${suggestion.content}`);
    console.log(`Confidence: ${suggestion.confidence}%`);

    return project;

  } catch (error) {
    console.error('❌ Enhanced Project Structure demo failed:', error);
    throw error;
  }
}

/**
 * Demo 4: Store Integration
 * Shows how the enhanced store integrates with all the new services
 */
export function demoStoreIntegration() {
  console.log('\n🚀 Demo 4: Store Integration');
  console.log('==============================');

  try {
    // This would be used in a React component
    // For demo purposes, we'll show the store structure
    console.log('📱 Enhanced Store Features:');
    console.log('  - AI Configuration Management');
    console.log('  - Enhanced Project Creation & Management');
    console.log('  - Hierarchical Structure (Acts → Chapters → Scenes)');
    console.log('  - Global Elements (Characters, Locations, Props)');
    console.log('  - AI Suggestions & Learning');
    console.log('  - Advanced Workflow Management');
    console.log('  - BYOK Integration');
    console.log('  - Cue Assistant Integration');

    console.log('\n🔄 Store Actions Available:');
    console.log('  - createEnhancedProject()');
    console.log('  - addAct(), addChapter(), addScene()');
    console.log('  - addCharacter(), addLocation(), addProp()');
    console.log('  - updateStepProgress()');
    console.log('  - addAISuggestion()');
    console.log('  - updateAIConfiguration()');

  } catch (error) {
    console.error('❌ Store Integration demo failed:', error);
  }
}

/**
 * Main demo function that runs all demonstrations
 */
export async function runPhase1Demo() {
  console.log('🎬 SceneFlow AI - Phase 1 Demo');
  console.log('================================');
  console.log('Foundation & Core Architecture');
  console.log('');

  try {
    // Run all demos
    await demoAICapabilityManagement();
    await demoDynamicPromptGeneration();
    const project = await demoEnhancedProjectStructure();
    demoStoreIntegration();

    console.log('\n✅ Phase 1 Demo completed successfully!');
    console.log('\n🎯 Key Features Demonstrated:');
    console.log('  1. AI Adaptability Framework');
    console.log('  2. Dynamic Prompt Engine');
    console.log('  3. Enhanced Project Structure');
    console.log('  4. Integrated State Management');
    console.log('  5. BYOK & AI Service Integration');

    console.log('\n🚀 Next Steps:');
    console.log('  - Phase 2: AI Agents & Intelligent Workflow');
    console.log('  - Phase 3: Enhanced Workflow Steps');
    console.log('  - Phase 4: Advanced Features');

    return project;

  } catch (error) {
    console.error('❌ Phase 1 Demo failed:', error);
    throw error;
  }
}

/**
 * Utility function to create a sample project for testing
 */
export async function createSampleProject(): Promise<EnhancedProject> {
  return await enhancedProjectManager.createProject(
    'Sample Project',
    'A sample project for testing and development',
    'medium',
    'three-act',
    {
      genre: 'drama',
      targetAudience: 'general',
      style: 'modern',
      tone: 'neutral'
    }
  );
}

/**
 * Utility function to get project context for AI operations
 */
export function getSampleProjectContext(): ProjectContext {
  return {
    projectId: 'sample-project',
    projectType: 'medium',
    genre: 'drama',
    targetAudience: 'general',
    style: 'modern',
    tone: 'neutral',
    complexity: 'moderate',
    budget: 5000,
    timeline: 21,
    teamSize: 2,
    previousResults: [],
    userPreferences: {
      userId: 'sample-user',
      category: 'ideation',
      preferredModels: ['gpt-4', 'gpt-4o'],
      preferredStyles: ['creative', 'structured'],
      qualityThreshold: 80,
      costSensitivity: 5,
      speedPreference: 'balanced',
      lastUpdated: new Date()
    }
  };
}

// Demo functions are already exported above
