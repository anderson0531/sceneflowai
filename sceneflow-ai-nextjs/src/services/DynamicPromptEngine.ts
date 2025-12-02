// Dynamic Prompt Engine Service
// This service generates and optimizes prompts based on AI model capabilities and project context

import { 
  PromptInstruction, 
  AIPromptTemplate, 
  ProjectContext, 
  AIOptimizationStrategy,
  PromptAttempt,
  ResultAnalysis,
  AIConfiguration
} from '@/types/ai-adaptability';
import { aiCapabilityManager } from './AICapabilityManager';

export class DynamicPromptEngine {
  private static instance: DynamicPromptEngine;
  private promptInstructions: Map<string, PromptInstruction> = new Map();
  private promptHistory: PromptAttempt[] = [];
  private resultAnalysis: ResultAnalysis[] = [];
  private configuration: AIConfiguration;

  private constructor() {
    this.configuration = this.getDefaultConfiguration();
    this.initializeDefaultInstructions();
  }

  public static getInstance(): DynamicPromptEngine {
    if (!DynamicPromptEngine.instance) {
      DynamicPromptEngine.instance = new DynamicPromptEngine();
    }
    return DynamicPromptEngine.instance;
  }

  /**
   * Generate a prompt for a specific task and context
   */
  public async generatePrompt(
    context: ProjectContext,
    category: PromptInstruction['category'],
    aiModel: string,
    taskDescription: string,
    parameters: Record<string, any> = {}
  ): Promise<string> {
    try {
      // Get optimal prompt template
      const template = await this.getOptimalTemplate(category, aiModel, context);
      
      // Render template with context and parameters
      const prompt = await this.renderTemplate(template, context, parameters);
      
      // Apply AI model optimizations
      const optimizedPrompt = await this.applyModelOptimizations(prompt, aiModel, context);
      
      // Log prompt generation
      await this.logPromptGeneration(context, category, aiModel, optimizedPrompt, parameters);
      
      return optimizedPrompt;
    } catch (error) {
      console.error('Failed to generate prompt:', error);
      throw error;
    }
  }

  /**
   * Optimize a prompt based on previous results and feedback
   */
  public async optimizePrompt(
    originalPrompt: string,
    result: any,
    feedback: string,
    aiModel: string,
    context: ProjectContext
  ): Promise<string> {
    try {
      // Analyze the result and feedback
      const analysis = await this.analyzeResult(originalPrompt, result, feedback, aiModel);
      
      // Get optimization strategies
      const strategies = aiCapabilityManager.getOptimizationStrategies('optimization', aiModel);
      
      // Apply optimization strategies
      let optimizedPrompt = originalPrompt;
      for (const strategy of strategies) {
        if (strategy.isActive) {
          optimizedPrompt = await this.applyOptimizationStrategy(
            optimizedPrompt, 
            strategy, 
            analysis, 
            context
          );
        }
      }
      
      // Learn from the optimization
      await this.learnFromOptimization(originalPrompt, optimizedPrompt, analysis);
      
      return optimizedPrompt;
    } catch (error) {
      console.error('Failed to optimize prompt:', error);
      throw error;
    }
  }

  /**
   * Get optimal prompt template for a category and model
   */
  public async getOptimalTemplate(
    category: PromptInstruction['category'],
    aiModel: string,
    context: ProjectContext
  ): Promise<AIPromptTemplate> {
    try {
      // Get available templates
      const templates = aiCapabilityManager.getPromptTemplates(category, aiModel);
      
      if (templates.length === 0) {
        throw new Error(`No prompt templates found for category: ${category} and model: ${aiModel}`);
      }
      
      // Score templates based on context and effectiveness
      const scoredTemplates = await this.scoreTemplates(templates, context);
      
      // Return the highest scoring template
      return scoredTemplates[0].template;
    } catch (error) {
      console.error('Failed to get optimal template:', error);
      throw error;
    }
  }

  /**
   * Render a prompt template with context and parameters
   */
  public async renderTemplate(
    template: AIPromptTemplate,
    context: ProjectContext,
    parameters: Record<string, any>
  ): Promise<string> {
    try {
      let renderedPrompt = template.template;
      
      // Replace template variables with actual values
      for (const variable of template.variables) {
        const value = this.getVariableValue(variable, context, parameters);
        const placeholder = `{{${variable.name}}}`;
        
        if (renderedPrompt.includes(placeholder)) {
          renderedPrompt = renderedPrompt.replace(placeholder, String(value));
        }
      }
      
      // Add project context
      renderedPrompt = await this.addProjectContext(renderedPrompt, context);
      
      // Add AI model specific instructions
      renderedPrompt = await this.addModelInstructions(renderedPrompt, template.aiModels[0]);
      
      return renderedPrompt;
    } catch (error) {
      console.error('Failed to render template:', error);
      throw error;
    }
  }

  /**
   * Apply AI model specific optimizations
   */
  public async applyModelOptimizations(
    prompt: string,
    aiModel: string,
    context: ProjectContext
  ): Promise<string> {
    try {
      const capability = aiCapabilityManager.getCapability(aiModel);
      if (!capability) return prompt;
      
      let optimizedPrompt = prompt;
      
      // Apply model-specific best practices
      for (const bestPractice of capability.bestPractices) {
        optimizedPrompt = await this.applyBestPractice(optimizedPrompt, bestPractice, context);
      }
      
      // Apply model-specific optimizations
      for (const optimization of capability.promptOptimizations) {
        optimizedPrompt = await this.applyOptimization(optimizedPrompt, optimization, context);
      }
      
      return optimizedPrompt;
    } catch (error) {
      console.error('Failed to apply model optimizations:', error);
      return prompt; // Return original prompt if optimization fails
    }
  }

  /**
   * Get prompt instructions for a specific category and model
   */
  public getPromptInstructions(
    category: PromptInstruction['category'],
    aiModel?: string
  ): PromptInstruction[] {
    let instructions = Array.from(this.promptInstructions.values());
    
    // Filter by category
    instructions = instructions.filter(i => i.category === category);
    
    // Filter by model if specified
    if (aiModel) {
      instructions = instructions.filter(i => i.aiModel === aiModel);
    }
    
    // Sort by effectiveness
    return instructions.sort((a, b) => b.effectiveness - a.effectiveness);
  }

  /**
   * Add a new prompt instruction
   */
  public async addPromptInstruction(instruction: PromptInstruction): Promise<void> {
    try {
      this.validatePromptInstruction(instruction);
      this.promptInstructions.set(instruction.id, instruction);
      
      console.log(`Prompt instruction added: ${instruction.id}`);
    } catch (error) {
      console.error('Failed to add prompt instruction:', error);
      throw error;
    }
  }

  /**
   * Update prompt instruction effectiveness
   */
  public async updateInstructionEffectiveness(
    instructionId: string,
    effectiveness: number
  ): Promise<void> {
    try {
      const instruction = this.promptInstructions.get(instructionId);
      if (!instruction) {
        throw new Error(`Prompt instruction not found: ${instructionId}`);
      }
      
      instruction.effectiveness = Math.max(0, Math.min(100, effectiveness));
      instruction.lastUpdated = new Date();
      
      console.log(`Updated instruction effectiveness: ${instructionId} -> ${effectiveness}`);
    } catch (error) {
      console.error('Failed to update instruction effectiveness:', error);
      throw error;
    }
  }

  /**
   * Get prompt generation history
   */
  public getPromptHistory(): PromptAttempt[] {
    return [...this.promptHistory];
  }

  /**
   * Get result analysis data
   */
  public getResultAnalysis(): ResultAnalysis[] {
    return [...this.resultAnalysis];
  }

  /**
   * Update configuration
   */
  public updateConfiguration(config: Partial<AIConfiguration>): void {
    this.configuration = { ...this.configuration, ...config };
  }

  /**
   * Get current configuration
   */
  public getConfiguration(): AIConfiguration {
    return { ...this.configuration };
  }

  /**
   * Initialize default prompt instructions
   */
  private initializeDefaultInstructions(): void {
    const defaultInstructions: PromptInstruction[] = [
      {
        id: 'ideation-creative',
        version: '1.0',
        aiModel: 'gpt-4',
        category: 'ideation',
        instructions: 'Focus on creative ideation with clear structure and actionable concepts',
        parameters: {
          creativity: 8,
          structure: 'detailed',
          examples: true
        },
        effectiveness: 85,
        lastUpdated: new Date(),
        usageCount: 0,
        successRate: 0.85,
        tags: ['creative', 'ideation', 'brainstorming'],
        isActive: true
      },
      {
        id: 'storyboard-visual',
        version: '1.0',
        aiModel: 'gpt-4o',
        category: 'storyboard',
        instructions: 'Create detailed visual storyboards with clear visual descriptions',
        parameters: {
          visualDetail: 'high',
          frameCount: 8,
          cameraWork: true
        },
        effectiveness: 80,
        lastUpdated: new Date(),
        usageCount: 0,
        successRate: 0.80,
        tags: ['visual', 'storyboard', 'cinematography'],
        isActive: true
      },
      {
        id: 'direction-technical',
        version: '1.0',
        aiModel: 'claude-3.5-sonnet',
        category: 'direction',
        instructions: 'Provide technical direction with safety and precision focus',
        parameters: {
          technicalDetail: 'high',
          safety: true,
          precision: true
        },
        effectiveness: 75,
        lastUpdated: new Date(),
        usageCount: 0,
        successRate: 0.75,
        tags: ['technical', 'direction', 'safety'],
        isActive: true
      },
      {
        id: 'scene-direction-visual',
        version: '1.0',
        aiModel: 'gpt-4',
        category: 'scene-direction',
        instructions: 'Create detailed scene direction with visual and technical specifications',
        parameters: {
          visualDetail: 'high',
          technicalDetail: 'medium',
          cameraWork: true,
          lighting: true
        },
        effectiveness: 82,
        lastUpdated: new Date(),
        usageCount: 0,
        successRate: 0.82,
        tags: ['visual', 'scene-direction', 'cinematography'],
        isActive: true
      }
    ];

    defaultInstructions.forEach(instruction => {
      this.promptInstructions.set(instruction.id, instruction);
    });
  }

  /**
   * Get default configuration
   */
  private getDefaultConfiguration(): AIConfiguration {
    return {
      defaultModel: 'gpt-4',
      fallbackModels: ['gpt-4o', 'gemini-3.0', 'claude-3.5-sonnet'],
      costLimits: {
        daily: 10.0,
        monthly: 100.0,
        perRequest: 1.0
      },
      qualityThresholds: {
        minimumRating: 3.0,
        minimumSuccessRate: 0.7
      },
      optimizationEnabled: true,
      learningEnabled: true,
      collaborationEnabled: true
    };
  }

  /**
   * Score templates based on context and effectiveness
   */
  private async scoreTemplates(
    templates: AIPromptTemplate[],
    context: ProjectContext
  ): Promise<Array<{ template: AIPromptTemplate; score: number }>> {
    const scored = await Promise.all(
      templates.map(async (template) => {
        const score = await this.calculateTemplateScore(template, context);
        return { template, score };
      })
    );
    
    // Sort by score (highest first)
    return scored.sort((a, b) => b.score - a.score);
  }

  /**
   * Calculate template score based on context
   */
  private async calculateTemplateScore(
    template: AIPromptTemplate,
    context: ProjectContext
  ): Promise<number> {
    let score = template.effectiveness;
    
    // Adjust score based on project complexity
    if (context.complexity === 'complex' && template.variables.length > 5) {
      score += 10;
    } else if (context.complexity === 'simple' && template.variables.length <= 3) {
      score += 10;
    }
    
    // Adjust score based on project type
    if (context.projectType === 'long' && template.category === 'ideation') {
      score += 5;
    }
    
    // Adjust score based on usage count (prefer proven templates)
    score += Math.min(template.usageCount / 10, 10);
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Get variable value from context or parameters
   */
  private getVariableValue(
    variable: any,
    context: ProjectContext,
    parameters: Record<string, any>
  ): any {
    // Check parameters first
    if (parameters[variable.name] !== undefined) {
      return parameters[variable.name];
    }
    
    // Check context
    if (context[variable.name as keyof ProjectContext] !== undefined) {
      return context[variable.name as keyof ProjectContext];
    }
    
    // Return default value
    return variable.defaultValue;
  }

  /**
   * Add project context to prompt
   */
  private async addProjectContext(prompt: string, context: ProjectContext): Promise<string> {
    const contextInfo = `
Project Context:
- Type: ${context.projectType}
- Genre: ${context.genre}
- Target Audience: ${context.targetAudience}
- Style: ${context.style}
- Tone: ${context.tone}
- Complexity: ${context.complexity}
- Budget: $${context.budget}
- Timeline: ${context.timeline} days
- Team Size: ${context.teamSize}

`;
    
    return contextInfo + prompt;
  }

  /**
   * Add model-specific instructions
   */
  private async addModelInstructions(prompt: string, aiModel: string): Promise<string> {
    const capability = aiCapabilityManager.getCapability(aiModel);
    if (!capability) return prompt;
    
    const modelInstructions = `
AI Model Instructions (${aiModel}):
- Model: ${aiModel} v${capability.version}
- Provider: ${capability.provider}
- Max Tokens: ${capability.capabilities.maxTokens.toLocaleString()}
- Context Window: ${capability.capabilities.contextWindow.toLocaleString()}
- Creativity Level: ${capability.capabilities.creativity}/10
- Vision: ${capability.capabilities.vision ? 'Yes' : 'No'}
- Multimodal: ${capability.capabilities.multimodal ? 'Yes' : 'No'}

Best Practices:
${capability.bestPractices.map(practice => `- ${practice}`).join('\n')}

`;
    
    return modelInstructions + prompt;
  }

  /**
   * Apply best practice to prompt
   */
  private async applyBestPractice(
    prompt: string,
    bestPractice: string,
    context: ProjectContext
  ): Promise<string> {
    // This is a simplified implementation
    // In a real system, this would apply more sophisticated optimizations
    
    if (bestPractice.includes('clear structure')) {
      prompt = `Please structure your response clearly with the following format:\n\n${prompt}`;
    }
    
    if (bestPractice.includes('examples')) {
      prompt = `Please provide examples to illustrate your points:\n\n${prompt}`;
    }
    
    if (bestPractice.includes('step by step')) {
      prompt = `Please break this down into clear steps:\n\n${prompt}`;
    }
    
    return prompt;
  }

  /**
   * Apply optimization to prompt
   */
  private async applyOptimization(
    prompt: string,
    optimization: string,
    context: ProjectContext
  ): Promise<string> {
    // This is a simplified implementation
    // In a real system, this would apply more sophisticated optimizations
    
    if (optimization.includes('clear instructions')) {
      prompt = `Instructions: ${prompt}\n\nPlease follow these instructions precisely.`;
    }
    
    if (optimization.includes('specific format')) {
      prompt = `Format your response as follows:\n\n${prompt}`;
    }
    
    return prompt;
  }

  /**
   * Apply optimization strategy
   */
  private async applyOptimizationStrategy(
    prompt: string,
    strategy: AIOptimizationStrategy,
    analysis: any,
    context: ProjectContext
  ): Promise<string> {
    // This is a simplified implementation
    // In a real system, this would apply more sophisticated optimizations
    
    if (strategy.name === 'Prompt Iteration') {
      // Add iteration instructions
      prompt = `Based on previous feedback, please improve this:\n\n${prompt}`;
    }
    
    if (strategy.name === 'Context Optimization') {
      // Optimize context length
      if (context.complexity === 'simple') {
        prompt = `Keep it simple and focused:\n\n${prompt}`;
      }
    }
    
    return prompt;
  }

  /**
   * Analyze result and feedback
   */
  private async analyzeResult(
    prompt: string,
    result: any,
    feedback: string,
    aiModel: string
  ): Promise<any> {
    // This is a simplified analysis
    // In a real system, this would perform more sophisticated analysis
    
    const analysis = {
      promptLength: prompt.length,
      resultQuality: this.assessResultQuality(result),
      feedbackSentiment: this.assessFeedbackSentiment(feedback),
      modelPerformance: aiModel,
      timestamp: new Date()
    };
    
    return analysis;
  }

  /**
   * Assess result quality
   */
  private assessResultQuality(result: any): number {
    // Simplified quality assessment
    // In a real system, this would use more sophisticated metrics
    
    if (typeof result === 'string') {
      return Math.min(100, result.length / 10);
    }
    
    if (Array.isArray(result)) {
      return Math.min(100, result.length * 10);
    }
    
    return 50; // Default quality score
  }

  /**
   * Assess feedback sentiment
   */
  private assessFeedbackSentiment(feedback: string): 'positive' | 'neutral' | 'negative' {
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'perfect', 'love', 'like'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'dislike', 'wrong', 'poor'];
    
    const lowerFeedback = feedback.toLowerCase();
    const positiveCount = positiveWords.filter(word => lowerFeedback.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerFeedback.includes(word)).length;
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  /**
   * Learn from optimization
   */
  private async learnFromOptimization(
    originalPrompt: string,
    optimizedPrompt: string,
    analysis: any
  ): Promise<void> {
    // This would update learning models and improve future optimizations
    // For now, just log the learning
    console.log('Learning from optimization:', {
      originalLength: originalPrompt.length,
      optimizedLength: optimizedPrompt.length,
      improvement: optimizedPrompt.length - originalPrompt.length,
      analysis
    });
  }

  /**
   * Log prompt generation
   */
  private async logPromptGeneration(
    context: ProjectContext,
    category: PromptInstruction['category'],
    aiModel: string,
    prompt: string,
    parameters: Record<string, any>
  ): Promise<void> {
    const logEntry: PromptAttempt = {
      id: Date.now().toString(),
      prompt,
      aiModel,
      category,
      context,
      result: null,
      userRating: 0,
      feedback: '',
      timestamp: new Date(),
      executionTime: 0,
      cost: 0,
      success: false
    };
    
    this.promptHistory.push(logEntry);
    
    // Keep only last 1000 entries
    if (this.promptHistory.length > 1000) {
      this.promptHistory = this.promptHistory.slice(-1000);
    }
  }

  /**
   * Validate prompt instruction
   */
  private validatePromptInstruction(instruction: PromptInstruction): void {
    if (!instruction.id || !instruction.aiModel || !instruction.category) {
      throw new Error('ID, AI model, and category are required');
    }
    
    if (instruction.effectiveness < 0 || instruction.effectiveness > 100) {
      throw new Error('Effectiveness must be between 0 and 100');
    }
  }
}

// Export singleton instance
export const dynamicPromptEngine = DynamicPromptEngine.getInstance();
