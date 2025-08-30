import { dol } from './DynamicOptimizationLayer';
import { feedbackLoop } from './FeedbackLoop';
import { TaskType, TaskComplexity } from '@/types/dol';

export interface CueMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface CueContext {
  pathname?: string;
  currentStep?: string;
  stepProgress?: Record<string, number>;
  type?: 'project-creation' | 'text' | 'beatCard' | 'character' | 'template' | 'analysis' | 'pacing' | 'conflict' | 'consistency';
  project?: {
    id?: string;
    title?: string;
    description?: string;
    metadata?: any;
  };
  projectsCount?: number;
  activeContext?: any;
}

export interface CueResponse {
  reply: string;
  provider: string;
  model: string;
  dolMetadata?: {
    modelUsed: string;
    platformUsed: string;
    estimatedCost: number;
    expectedQuality: number;
    reasoning: string;
  };
  fallback?: boolean;
}

/**
 * Service for integrating DOL with Cue components
 */
export class CueIntegrationService {
  private static instance: CueIntegrationService;

  private constructor() {}

  public static getInstance(): CueIntegrationService {
    if (!CueIntegrationService.instance) {
      CueIntegrationService.instance = new CueIntegrationService();
    }
    return CueIntegrationService.instance;
  }

  /**
   * Send message to Cue using DOL optimization
   */
  public async sendMessage(
    messages: CueMessage[],
    context: CueContext
  ): Promise<CueResponse> {
    const startTime = Date.now();
    let success = false;
    let errorMessage: string | undefined;

    try {
      console.log('🧠 Cue DOL Integration: Processing message...');

      // Map context to DOL task parameters
      const { taskType, complexity } = this.mapContextToDOL(context);
      
      // Build user input for DOL optimization
      const userInput = {
        messages,
        context,
        systemPrompt: this.getSystemPrompt(context)
      };

      // Use DOL to optimize the task
      const dolResult = await dol.optimize({
        taskType,
        complexity,
        userInput,
        userPreferences: {
          quality: complexity === TaskComplexity.HIGH ? 'high' : 'medium',
          costOptimization: complexity === TaskComplexity.LOW
        }
      });

      if (!dolResult.success || !dolResult.result) {
        throw new Error(dolResult.error || 'DOL optimization failed');
      }

      const { result } = dolResult;
      
      console.log(`✅ Cue DOL: Selected ${result.model.displayName} (${result.model.platformId})`);
      console.log(`💰 Cue DOL: Estimated cost $${result.estimatedCost.toFixed(6)}`);
      console.log(`🎯 Cue DOL: Expected quality ${result.expectedQuality}/100`);

      // Execute the optimized prompt
      const reply = await this.executeOptimizedPrompt(result.prompt, result.parameters, result.model);

      success = true;

      // Log successful usage for feedback loop
      await this.logUsage({
        taskType,
        modelId: result.model.modelId,
        platformId: result.model.platformId,
        prompt: result.prompt,
        parameters: result.parameters,
        cost: result.estimatedCost,
        duration: Date.now() - startTime,
        success: true,
        metadata: {
          complexity,
          expectedQuality: result.expectedQuality,
          reasoning: result.reasoning
        }
      });

      return {
        reply,
        provider: result.model.platformId,
        model: result.model.modelId,
        dolMetadata: {
          modelUsed: result.model.displayName,
          platformUsed: result.model.platformId,
          estimatedCost: result.estimatedCost,
          expectedQuality: result.expectedQuality,
          reasoning: result.reasoning
        }
      };

    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.warn('❌ Cue DOL failed, falling back to traditional method:', error);
      
      // Log failed usage for feedback loop
      await this.logUsage({
        taskType: TaskType.STORY_ANALYSIS, // Default fallback
        modelId: 'unknown',
        platformId: 'unknown',
        prompt: messages.map(m => m.content).join('\n'),
        parameters: {},
        cost: 0,
        duration: Date.now() - startTime,
        success: false,
        errorMessage,
        metadata: { fallback: true }
      });
      
      // Fallback to traditional method
      return await this.fallbackToTraditional(messages, context);
    }
  }

  /**
   * Map Cue context to DOL task type and complexity
   */
  private mapContextToDOL(context: CueContext): { taskType: TaskType; complexity: TaskComplexity } {
    // Project creation is always high complexity
    if (context.type === 'project-creation') {
      return { taskType: TaskType.SCRIPT_WRITING, complexity: TaskComplexity.HIGH };
    }

    // Map other context types to appropriate task types
    switch (context.type) {
      case 'beatCard':
        return { taskType: TaskType.PLOT_STRUCTURING, complexity: TaskComplexity.MEDIUM };
      case 'character':
        return { taskType: TaskType.CHARACTER_DEVELOPMENT, complexity: TaskComplexity.MEDIUM };
      case 'template':
        return { taskType: TaskType.STORY_ANALYSIS, complexity: TaskComplexity.LOW };
      case 'analysis':
        return { taskType: TaskType.STORY_ANALYSIS, complexity: TaskComplexity.HIGH };
      case 'pacing':
        return { taskType: TaskType.PLOT_STRUCTURING, complexity: TaskComplexity.MEDIUM };
      case 'conflict':
        return { taskType: TaskType.PLOT_STRUCTURING, complexity: TaskComplexity.MEDIUM };
      case 'consistency':
        return { taskType: TaskType.CHARACTER_DEVELOPMENT, complexity: TaskComplexity.MEDIUM };
      default:
        // Analyze context to determine complexity
        if (context.activeContext?.beatSheet?.length > 20) {
          return { taskType: TaskType.STORY_ANALYSIS, complexity: TaskComplexity.HIGH };
        } else if (context.activeContext?.beatSheet?.length > 10) {
          return { taskType: TaskType.STORY_ANALYSIS, complexity: TaskComplexity.MEDIUM };
        } else {
          return { taskType: TaskType.STORY_ANALYSIS, complexity: TaskComplexity.LOW };
        }
    }
  }

  /**
   * Get appropriate system prompt based on context
   */
  private getSystemPrompt(context: CueContext): string {
    const basePrompt = `You are Cue, a helpful, expert film director and audience strategist for the SceneFlow AI app, now enhanced with proactive story analysis and guardrails.

CORE PERSONALITY:
- Writing style: direct, friendly, and pragmatic. Prefer short paragraphs and bullet points.
- Goal: Provide immediate, actionable improvements to idea concepts, storyboards, scene directions, and video clip prompts.
- Be context aware: consider the current page, step, and the user's project data if provided.

ENHANCED CAPABILITIES - DIRECTOR'S NOTES:
- Proactively analyze story structure and identify issues before they become problems
- Provide specific metrics and percentages for pacing analysis (e.g., "Act I is 40% of your story, should be 25%")
- Flag conflict escalation issues with concrete fixes
- Monitor character consistency across beats and alert to inconsistencies
- Act as protective oversight for story development

RESPONSE FRAMEWORK:
- Always include 1) rationale (director POV), 2) audience POV (target viewer impact), and 3) concrete next steps.
- NO BLANK CANVAS: Never ask clarifying questions. Always provide specific, actionable recommendations based on the available context.
- When working on beat cards, provide concrete content improvements that can be directly applied.
- Focus on refinement and enhancement rather than gathering more information.`;

    // Add context-specific instructions
    if (context.type === 'project-creation') {
      return basePrompt + `

PROJECT CREATION MODE:
You are creating a COMPLETE NEW PROJECT from scratch:
1. Analyze the user's project idea and select the most appropriate story template
2. Generate comprehensive baseline content following the No Blank Canvas principle
3. Provide structured output that can be parsed into the project system
4. Use higher token limits and more detailed generation for complete story development`;
    }

    if (context.type === 'beatCard') {
      return basePrompt + `

BEAT CARD MODE:
Focus on plot structure and pacing:
1. Analyze the current beat's role in the overall story structure
2. Identify pacing issues and suggest improvements
3. Ensure conflict escalation and character development
4. Provide specific, actionable beat improvements`;
    }

    if (context.type === 'character') {
      return basePrompt + `

CHARACTER DEVELOPMENT MODE:
Focus on character consistency and development:
1. Analyze character motivations and conflicts
2. Ensure character actions align with established traits
3. Identify opportunities for character growth
4. Maintain consistency across all story beats`;
    }

    return basePrompt;
  }

  /**
   * Execute the optimized prompt using the selected model
   */
  private async executeOptimizedPrompt(
    optimizedPrompt: string, 
    parameters: Record<string, any>, 
    model: any
  ): Promise<string> {
    const { platformId, modelId } = model;
    
    try {
      if (platformId === 'google' || platformId === 'google-veo') {
        return await this.callGeminiAPI(optimizedPrompt, parameters, modelId);
      } else if (platformId === 'openai') {
        return await this.callOpenAIAPI(optimizedPrompt, parameters, modelId);
      } else {
        throw new Error(`Unsupported platform: ${platformId}`);
      }
    } catch (error) {
      console.error(`Error executing prompt for ${platformId}:`, error);
      throw error;
    }
  }

  async callGeminiAPI(prompt: string, parameters: Record<string, any>, modelId: string): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('Gemini API key not configured');

    const body = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: parameters.maxTokens || 1024,
      }
    };

    const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => 'unknown error');
      throw new Error(`Gemini error: ${resp.status} ${errText}`);
    }

    const json = await resp.json();
    const content = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) throw new Error('No content from Gemini');
    return content;
  }

  async callOpenAIAPI(prompt: string, parameters: Record<string, any>, modelId: string): Promise<string> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OpenAI API key not configured');

    const body = {
      model: modelId,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: parameters.maxTokens || 1024,
      temperature: 0.7,
    };

    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => 'unknown error');
      throw new Error(`OpenAI error: ${resp.status} ${errText}`);
    }

    const json = await resp.json();
    const content: string | undefined = json?.choices?.[0]?.message?.content;
    if (!content) throw new Error('No content from OpenAI');
    return content;
  }

  /**
   * Fallback to traditional Cue API
   */
  private async fallbackToTraditional(messages: CueMessage[], context: CueContext): Promise<CueResponse> {
    try {
      console.log('🔄 Cue DOL: Falling back to traditional method...');
      
      const response = await fetch('/api/cue/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, context })
      });

      if (!response.ok) {
        throw new Error(`Traditional API error: ${response.status}`);
      }

      const data = await response.json();
      
      return {
        reply: data.reply || "I apologize, but I couldn't generate a response. Please try again.",
        provider: data.provider || 'fallback',
        model: data.model || 'traditional',
        fallback: true
      };

    } catch (error) {
      console.error('Traditional Cue API also failed:', error);
      
      return {
        reply: "I'm having trouble connecting right now. Please check your connection and try again.",
        provider: 'fallback',
        model: 'error',
        fallback: true
      };
    }
  }

  /**
   * Log usage data for feedback loop
   */
  private async logUsage(data: {
    taskType: TaskType;
    modelId: string;
    platformId: string;
    prompt: string;
    parameters: Record<string, any>;
    cost: number;
    duration: number;
    success: boolean;
    errorMessage?: string;
    metadata: Record<string, any>;
  }): Promise<void> {
    try {
      await feedbackLoop.logUsage(data);
    } catch (error) {
      console.warn('Failed to log usage data:', error);
    }
  }

  /**
   * Get DOL analytics for admin interface
   */
  public async getAnalytics(): Promise<{
    totalRequests: number;
    dolSuccessRate: number;
    averageCost: number;
    averageQuality: number;
    topModels: Array<{ model: string; usage: number }>;
  }> {
    try {
      const metrics = await feedbackLoop.getDOLPerformanceMetrics();
      return {
        totalRequests: metrics.totalRequests,
        dolSuccessRate: metrics.dolSuccessRate,
        averageCost: metrics.averageCost,
        averageQuality: metrics.averageQuality,
        topModels: metrics.topModels.map(m => ({ model: m.modelId, usage: m.usageCount }))
      };
    } catch (error) {
      console.error('Error getting analytics:', error);
      return {
        totalRequests: 0,
        dolSuccessRate: 0,
        averageCost: 0,
        averageQuality: 0,
        topModels: []
      };
    }
  }
}

export const cueIntegrationService = CueIntegrationService.getInstance();
