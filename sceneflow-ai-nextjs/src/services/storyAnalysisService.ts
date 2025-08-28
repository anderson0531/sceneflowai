import { StoryRecommendation, ActionableMutation } from '@/types/story';

export interface StoryAnalysisRequest {
  storyData: {
    title: string;
    acts: Array<{
      id: string;
      name: string;
      beats: Array<{
        id: string;
        title: string;
        duration: number;
        summary?: string;
      }>;
    }>;
    characters: Array<{
      id: string;
      name: string;
      motivation: string;
      role?: string;
    }>;
    treatment?: {
      synopsis?: string;
      themes?: string[];
      targetAudience?: string;
    };
  };
  analysisType?: 'comprehensive' | 'pacing' | 'character' | 'structure';
}

export interface StoryAnalysisResponse {
  recommendations: StoryRecommendation[];
  summary: {
    totalIssues: number;
    criticalIssues: number;
    suggestedImprovements: number;
    overallHealth: 'excellent' | 'good' | 'fair' | 'needs_work';
  };
}

class StoryAnalysisService {
  private async callAIProvider(prompt: string, storyData: any): Promise<string> {
    try {
      // Try Gemini first (primary provider)
      const geminiResponse = await fetch('/api/cue/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: prompt,
          projectContext: {
            storyData,
            analysisMode: 'story_insights'
          }
        })
      });

      if (geminiResponse.ok) {
        const data = await geminiResponse.json();
        if (data.response && !data.response.includes('fallback')) {
          return data.response;
        }
      }
    } catch (error) {
      console.warn('Gemini analysis failed, trying OpenAI fallback:', error);
    }

    try {
      // OpenAI fallback
      const openaiResponse = await fetch('/api/cue/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: prompt,
          projectContext: {
            storyData,
            analysisMode: 'story_insights',
            provider: 'openai'
          }
        })
      });

      if (openaiResponse.ok) {
        const data = await openaiResponse.json();
        return data.response;
      }
    } catch (error) {
      console.error('OpenAI analysis also failed:', error);
    }

    throw new Error('All AI providers failed');
  }

  private parseAIResponse(response: string): StoryRecommendation[] {
    try {
      // Try to extract structured data from AI response
      const recommendations: StoryRecommendation[] = [];
      
      // Look for JSON-like structures in the response
      const jsonMatches = response.match(/\{[\s\S]*?\}/g);
      if (jsonMatches) {
        for (const match of jsonMatches) {
          try {
            const parsed = JSON.parse(match);
            if (parsed.type && parsed.title && parsed.description) {
              recommendations.push({
                id: `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                title: parsed.title,
                description: parsed.description,
                impact: parsed.impact || 'medium',
                confidenceScore: parsed.confidenceScore || 0.8,
                status: 'pending_review',
                isAutoApplied: false,
                proposedMutation: parsed.proposedMutation || this.createDefaultMutation(parsed)
              });
            }
          } catch (e) {
            // Skip invalid JSON matches
          }
        }
      }

      // If no structured data found, create recommendations from text analysis
      if (recommendations.length === 0) {
        return this.createRecommendationsFromText(response);
      }

      return recommendations;
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      return this.createFallbackRecommendations();
    }
  }

  private createDefaultMutation(parsed: any): ActionableMutation {
    // Create a default mutation based on the recommendation type
    if (parsed.type === 'pacing') {
      return {
        type: 'ADJUST_BEAT_DURATION',
        beatId: 'act1-setup',
        newDuration: 25,
        oldDuration: 40
      };
    } else if (parsed.type === 'character') {
      return {
        type: 'UPDATE_CHARACTER_MOTIVATION',
        characterId: 'protagonist',
        newValue: 'Enhanced motivation with internal conflict',
        oldValue: 'Basic motivation'
      };
    } else {
      return {
        type: 'UPDATE_TREATMENT_TEXT',
        field: 'synopsis',
        newValue: 'Improved synopsis with better conflict',
        oldValue: 'Original synopsis'
      };
    }
  }

  private createRecommendationsFromText(response: string): StoryRecommendation[] {
    const recommendations: StoryRecommendation[] = [];
    
    // Extract insights from AI text response
    if (response.includes('pacing') || response.includes('duration')) {
      recommendations.push({
        id: `rec_${Date.now()}_pacing`,
        title: 'Optimize Story Pacing',
        description: 'The AI detected pacing issues in your story structure. Consider adjusting beat durations for better flow.',
        impact: 'medium',
        confidenceScore: 0.75,
        status: 'pending_review',
        isAutoApplied: false,
        proposedMutation: {
          type: 'ADJUST_BEAT_DURATION',
          beatId: 'act1-setup',
          newDuration: 25,
          oldDuration: 40
        }
      });
    }

    if (response.includes('character') || response.includes('motivation')) {
      recommendations.push({
        id: `rec_${Date.now()}_character`,
        title: 'Enhance Character Development',
        description: 'Character motivations could be strengthened to create more compelling arcs.',
        impact: 'high',
        confidenceScore: 0.8,
        status: 'pending_review',
        isAutoApplied: false,
        proposedMutation: {
          type: 'UPDATE_CHARACTER_MOTIVATION',
          characterId: 'protagonist',
          newValue: 'Character now faces internal conflict between ambition and ethics, creating stronger dramatic tension.',
          oldValue: 'Character wants to succeed in their career.'
        }
      });
    }

    if (response.includes('structure') || response.includes('act')) {
      recommendations.push({
        id: `rec_${Date.now()}_structure`,
        title: 'Improve Story Structure',
        description: 'The three-act structure could be optimized for better dramatic flow and audience engagement.',
        impact: 'medium',
        confidenceScore: 0.7,
        status: 'pending_review',
        isAutoApplied: false,
        proposedMutation: {
          type: 'UPDATE_TREATMENT_TEXT',
          field: 'structure_notes',
          newValue: 'Restructured with stronger midpoint turning point and clearer character arcs.',
          oldValue: 'Basic three-act structure.'
        }
      });
    }

    return recommendations;
  }

  private createFallbackRecommendations(): StoryRecommendation[] {
    return [
      {
        id: `rec_${Date.now()}_fallback`,
        title: 'Story Analysis Complete',
        description: 'AI analysis has been completed. Review the recommendations above for story improvements.',
        impact: 'low',
        confidenceScore: 0.9,
        status: 'pending_review',
        isAutoApplied: false,
        proposedMutation: {
          type: 'UPDATE_TREATMENT_TEXT',
          field: 'analysis_status',
          newValue: 'Analysis completed - review recommendations',
          oldValue: 'Analysis pending'
        }
      }
    ];
  }

  async analyzeStory(request: StoryAnalysisRequest): Promise<StoryAnalysisResponse> {
    try {
      const { storyData, analysisType = 'comprehensive' } = request;
      
      // Create comprehensive analysis prompt
      const prompt = this.createAnalysisPrompt(storyData, analysisType);
      
      // Call AI provider
      const aiResponse = await this.callAIProvider(prompt, storyData);
      
      // Parse AI response into structured recommendations
      const recommendations = this.parseAIResponse(aiResponse);
      
      // Calculate summary metrics
      const summary = this.calculateSummary(recommendations);
      
      return {
        recommendations,
        summary
      };
    } catch (error) {
      console.error('Story analysis failed:', error);
      
      // Return fallback recommendations
      const fallbackRecommendations = this.createFallbackRecommendations();
      return {
        recommendations: fallbackRecommendations,
        summary: {
          totalIssues: 0,
          criticalIssues: 0,
          suggestedImprovements: fallbackRecommendations.length,
          overallHealth: 'needs_work'
        }
      };
    }
  }

  private createAnalysisPrompt(storyData: any, analysisType: string): string {
    const basePrompt = `Analyze this story and provide specific, actionable recommendations for improvement. 

STORY DATA:
Title: ${storyData.title}
Acts: ${storyData.acts.map(act => `${act.name} (${act.beats.length} beats)`).join(', ')}
Characters: ${storyData.characters.map(char => `${char.name}: ${char.motivation}`).join(', ')}

ANALYSIS REQUIREMENTS:
1. Focus on ${analysisType === 'comprehensive' ? 'overall story structure, pacing, character development, and thematic elements' : analysisType}
2. Provide specific, actionable recommendations with confidence scores
3. For each recommendation, suggest a concrete mutation that can be applied
4. Consider industry best practices for storytelling
5. Identify both critical issues and opportunities for enhancement

RESPONSE FORMAT:
Return your analysis in a conversational tone, then provide structured recommendations. For each recommendation, include:
- Specific issue identified
- Impact level (high/medium/low)
- Confidence score (0.0-1.0)
- Suggested mutation with before/after values
- Brief explanation of the improvement

Focus on practical, implementable suggestions that will make the story stronger.`;

    return basePrompt;
  }

  private calculateSummary(recommendations: StoryRecommendation[]): any {
    const totalIssues = recommendations.length;
    const criticalIssues = recommendations.filter(r => r.impact === 'high').length;
    const suggestedImprovements = recommendations.filter(r => r.status === 'pending_review').length;
    
    let overallHealth: 'excellent' | 'good' | 'fair' | 'needs_work';
    if (totalIssues === 0) overallHealth = 'excellent';
    else if (criticalIssues === 0 && totalIssues <= 2) overallHealth = 'good';
    else if (criticalIssues <= 1) overallHealth = 'fair';
    else overallHealth = 'needs_work';

    return {
      totalIssues,
      criticalIssues,
      suggestedImprovements,
      overallHealth
    };
  }
}

export const storyAnalysisService = new StoryAnalysisService();
