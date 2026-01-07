import { NextRequest, NextResponse } from 'next/server';
import { dol } from '@/services/DOL/DynamicOptimizationLayer';
import { TaskType, TaskComplexity } from '@/types/dol';
import { generateText } from '@/lib/vertexai/gemini';

type Role = 'system' | 'user' | 'assistant';

interface Message { 
  role: Role; 
  content: string 
}

interface CueContext {
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
}

const SYSTEM_PROMPT = `You are Cue, a helpful, expert film director and audience strategist for the SceneFlow AI app, now enhanced with proactive story analysis and guardrails.

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
- Focus on refinement and enhancement rather than gathering more information.

ANALYSIS CONTEXTS:
- PACING ALERTS: "Act I is currently 40% of your total beats. Consider consolidating the setup to move into the main conflict sooner."
- CONFLICT CHECKS: "The central conflict is introduced in Act I, but it doesn't seem to escalate in these beats [specific beats]. Here are suggestions to raise the stakes..."
- CONSISTENCY ALERTS: "Character X's motivation changed in the Character Breakdown. This affects these beats [specific beats] where their actions may no longer make sense."

STORY INSIGHTS ANALYSIS MODE:
When analysisMode is 'story_insights', provide structured, actionable recommendations:
1. Analyze story structure, pacing, character development, and thematic elements
2. For each recommendation, provide:
   - Specific issue identified with clear impact assessment
   - Confidence score (0.0-1.0) for automation decisions
   - Concrete mutation suggestions with before/after values
   - Brief explanation of the improvement
3. Focus on practical, implementable suggestions
4. Consider industry best practices for storytelling
5. Identify both critical issues and opportunities for enhancement
6. Provide recommendations that can be automatically applied or manually reviewed

Always provide immediate, protective guidance with specific implementation steps.

PROJECT CREATION MODE:
When context.type is 'project-creation', you are creating a COMPLETE NEW PROJECT from scratch:
1. Analyze the user's project idea and select the most appropriate story template
2. Generate comprehensive baseline content following the No Blank Canvas principle
3. Provide structured output that can be parsed into the project system
4. Use higher token limits and more detailed generation for complete story development`;

/**
 * Map Cue context to DOL task type and complexity
 */
function mapContextToDOL(context: CueContext): { taskType: TaskType; complexity: TaskComplexity } {
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
      return { taskType: TaskType.STORY_ANALYSIS, complexity: TaskComplexity.MEDIUM };
  }
}

/**
 * Execute the optimized prompt using the selected model
 */
async function executeOptimizedPrompt(
  optimizedPrompt: string, 
  parameters: Record<string, any>, 
  model: any
): Promise<string> {
  const { platformId, modelId } = model;
  
  try {
    if (platformId === 'google' || platformId === 'google-veo') {
      return await callGeminiAPI(optimizedPrompt, parameters, modelId);
    } else if (platformId === 'openai') {
      return await callOpenAIAPI(optimizedPrompt, parameters, modelId);
    } else {
      throw new Error(`Unsupported platform: ${platformId}`);
    }
  } catch (error) {
    console.error(`Error executing prompt for ${platformId}:`, error);
    throw error;
  }
}

async function callGeminiAPI(prompt: string, parameters: Record<string, any>, modelId: string): Promise<string> {
  console.log('[Cue DOL] Calling Vertex AI Gemini...');
  const result = await generateText(prompt, {
    model: 'gemini-2.0-flash',
    temperature: 0.7,
    maxOutputTokens: parameters.maxTokens || 1024
  });
  return result.text;
}

async function callOpenAIAPI(prompt: string, parameters: Record<string, any>, modelId: string): Promise<string> {
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

function buildContextSummary(ctx?: CueContext): string {
  if (!ctx) return 'No app context provided.';
  const parts: string[] = [];
  if (ctx.pathname) parts.push(`Pathname: ${ctx.pathname}`);
  if (ctx.currentStep) parts.push(`Current step: ${ctx.currentStep}`);
  if (ctx.projectsCount != null) parts.push(`Projects count: ${ctx.projectsCount}`);
  if (ctx.stepProgress) parts.push(`Step progress: ${JSON.stringify(ctx.stepProgress)}`);
  if (ctx.project) {
    parts.push(`Project: ${ctx.project.title || 'Untitled'}`);
    if (ctx.project.description) parts.push(`Description: ${ctx.project.description}`);
    if (ctx.project.metadata) {
      const { concept, storyboard, directions, selectedIdea, scenes } = ctx.project.metadata;
      if (concept) parts.push(`Concept: ${JSON.stringify(concept).slice(0, 400)}`);
      if (selectedIdea) parts.push(`Selected idea: ${JSON.stringify(selectedIdea).slice(0, 400)}`);
      if (storyboard) parts.push(`Storyboard: ${JSON.stringify(storyboard).slice(0, 400)}`);
      if (directions) parts.push(`Directions: ${JSON.stringify(directions).slice(0, 400)}`);
      if (scenes) parts.push(`Scenes: ${JSON.stringify(scenes).slice(0, 400)}`);
    }
  }
  return parts.join('\n');
}

function fallbackAdvisor(userText: string, ctx?: CueContext): string {
  const ctxLine = ctx?.currentStep ? `You're in the ${ctx.currentStep} step.` : 'Workflow step unknown.';
  return [
    `Here's a quick, actionable plan. (${ctxLine})`,
    '',
    'Director POV:',
    '- Tighten the core objective and reduce competing beats.',
    '- Use visual metaphors to reinforce the message in the opening 3–5 seconds.',
    '',
    'Audience POV:',
    '- Optimize for attention: strong hook + clear payoff.',
    '- Keep language concrete; avoid internal jargon.',
    '',
    'Next steps:',
    '- If ideation: provide 3 refined concept lines and a CTA.',
    '- If storyboard: add shot list with framing, motion, and transitions.',
    '- If scene-direction: add lens, camera move, subject action, and lighting notes.',
    '- If video prompts: write a single-sentence, camera-ready prompt per shot.',
  ].join('\n');
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const messages = (data?.messages || []) as Message[];
    const context = (data?.context || {}) as CueContext;

    const contextSummary = buildContextSummary(context);
    
    // Map context to DOL task parameters
    const { taskType, complexity } = mapContextToDOL(context);
    
    // Build the user input for DOL optimization
    const userInput = {
      systemPrompt: SYSTEM_PROMPT,
      contextSummary,
      userMessages: messages.filter(m => m.role === 'user').map(m => m.content),
      context
    };

    console.log(`🧠 DOL: Optimizing ${taskType} with ${complexity} complexity`);

    try {
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
      
      console.log(`✅ DOL: Selected ${result.model.displayName} (${result.model.platformId})`);
      console.log(`💰 DOL: Estimated cost $${result.estimatedCost.toFixed(6)}`);
      console.log(`🎯 DOL: Expected quality ${result.expectedQuality}/100`);

      // Execute the optimized prompt
      const reply = await executeOptimizedPrompt(
        result.prompt, 
        result.parameters, 
        result.model
      );

      return new Response(JSON.stringify({ 
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
      }), { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      });

    } catch (dolError) {
      console.warn('❌ DOL failed, falling back to traditional method:', dolError);
      
      // Fallback to traditional method
      const finalMessages: Message[] = [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'system', content: `App Context:\n${contextSummary}` },
        ...messages,
      ];

      // Try providers in order of preference: Gemini first, then OpenAI
      const providers = [
        { name: 'Gemini', key: process.env.GEMINI_API_KEY, call: callGeminiAPI },
        { name: 'OpenAI', key: process.env.OPENAI_API_KEY, call: callOpenAIAPI }
      ];

      for (const provider of providers) {
        if (provider.key) {
          try {
            console.log(`🔄 Fallback: Trying ${provider.name}...`);
            const reply = await provider.call(
              finalMessages.map(m => m.content).join('\n\n'), 
              {}, 
              provider.name === 'Gemini' ? 'gemini-3.0-flash' : 'gpt-4o-mini'
            );
            console.log(`✅ Fallback: ${provider.name} success`);
            return new Response(JSON.stringify({ 
              reply, 
              provider: provider.name.toLowerCase(),
              model: provider.name === 'Gemini' ? 'gemini-3.0-flash' : 'gpt-4o-mini',
              fallback: true
            }), { 
              status: 200, 
              headers: { 'Content-Type': 'application/json' } 
            });
          } catch (error) {
            console.warn(`❌ Fallback: ${provider.name} failed:`, error);
            // Continue to next provider
          }
        }
      }

      // If all providers fail, use structured fallback
      console.log('🔄 Using structured fallback mode');
      const lastUser = messages.filter(m => m.role === 'user').slice(-1)[0]?.content || '';
      const reply = fallbackAdvisor(lastUser, context);
      return new Response(JSON.stringify({ 
        reply, 
        provider: 'fallback',
        model: 'structured-template',
        fallback: true
      }), { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

  } catch (e: any) {
    console.error('Cue DOL API error:', e);
    return new Response(JSON.stringify({ 
      error: 'Cue DOL respond failed', 
      details: e?.message || String(e) 
    }), { 
      status: 500 
    });
  }
}
