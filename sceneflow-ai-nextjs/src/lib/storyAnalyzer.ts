import { Beat, ProductionGuide, CharacterProfile, BeatFunction } from '@/types/productionGuide';
import { BeatTemplate } from '@/types/beatTemplates';

export interface StoryAnalysis {
  id: string;
  timestamp: Date;
  overallScore: number; // 0-100
  issues: AnalysisIssue[];
  recommendations: AnalysisRecommendation[];
  pacingAnalysis: PacingAnalysis;
  conflictAnalysis: ConflictAnalysis;
  consistencyAnalysis: ConsistencyAnalysis;
}

export interface AnalysisIssue {
  id: string;
  type: 'pacing' | 'conflict' | 'consistency' | 'structure' | 'character';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  affectedBeats: string[]; // Beat IDs
  affectedCharacters?: string[]; // Character IDs
  suggestions: string[];
  autoFixAvailable: boolean;
}

export interface AnalysisRecommendation {
  id: string;
  type: 'enhancement' | 'optimization' | 'expansion';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  targetBeats?: string[];
  implementation: string;
}

export interface PacingAnalysis {
  actDistribution: ActDistribution[];
  overallPacing: 'too_fast' | 'too_slow' | 'uneven' | 'good';
  recommendedChanges: PacingRecommendation[];
  totalDuration: number;
  averageBeatDuration: number;
}

export interface ActDistribution {
  actId: string;
  actName: string;
  beatCount: number;
  percentage: number;
  duration: number;
  durationPercentage: number;
  pacing: 'too_fast' | 'too_slow' | 'good';
  recommendedBeatCount: number;
  recommendedDuration: number;
}

export interface PacingRecommendation {
  type: 'consolidate' | 'expand' | 'split' | 'reorder';
  actId: string;
  description: string;
  beatIds: string[];
  priority: 'low' | 'medium' | 'high';
}

export interface ConflictAnalysis {
  hasIncitingIncident: boolean;
  conflictClarity: 'unclear' | 'weak' | 'clear' | 'strong';
  stakesProgression: 'flat' | 'declining' | 'inconsistent' | 'rising' | 'optimal';
  conflictBeats: ConflictBeat[];
  missingElements: string[];
  recommendations: ConflictRecommendation[];
}

export interface ConflictBeat {
  beatId: string;
  conflictLevel: number; // 1-10
  stakesLevel: number; // 1-10
  tension: 'low' | 'medium' | 'high';
  resolution?: 'partial' | 'complete';
}

export interface ConflictRecommendation {
  type: 'raise_stakes' | 'clarify_conflict' | 'add_tension' | 'escalate';
  beatId: string;
  description: string;
  implementation: string;
}

export interface ConsistencyAnalysis {
  characterConsistency: CharacterConsistency[];
  motivationConflicts: MotivationConflict[];
  plotHoles: PlotHole[];
  thematicConsistency: number; // 0-100
}

export interface CharacterConsistency {
  characterId: string;
  characterName: string;
  consistencyScore: number; // 0-100
  inconsistentBeats: string[];
  motivationChanges: MotivationChange[];
}

export interface MotivationConflict {
  characterId: string;
  beatId: string;
  description: string;
  severity: 'minor' | 'major' | 'critical';
  suggestedFix: string;
}

export interface MotivationChange {
  fromBeat: string;
  toBeat: string;
  oldMotivation: string;
  newMotivation: string;
  isJustified: boolean;
}

export interface PlotHole {
  id: string;
  description: string;
  affectedBeats: string[];
  severity: 'minor' | 'major' | 'critical';
  suggestedFix: string;
}

export class StoryAnalyzer {
  private guide: ProductionGuide;
  private template: BeatTemplate;

  constructor(guide: ProductionGuide, template: BeatTemplate) {
    this.guide = guide;
    this.template = template;
  }

  public analyzeStory(): StoryAnalysis {
    const timestamp = new Date();
    const pacingAnalysis = this.analyzePacing();
    const conflictAnalysis = this.analyzeConflict();
    const consistencyAnalysis = this.analyzeConsistency();

    const issues = [
      ...this.generatePacingIssues(pacingAnalysis),
      ...this.generateConflictIssues(conflictAnalysis),
      ...this.generateConsistencyIssues(consistencyAnalysis)
    ];

    const recommendations = this.generateRecommendations(pacingAnalysis, conflictAnalysis, consistencyAnalysis);
    const overallScore = this.calculateOverallScore(issues, pacingAnalysis, conflictAnalysis, consistencyAnalysis);

    return {
      id: `analysis-${timestamp.getTime()}`,
      timestamp,
      overallScore,
      issues,
      recommendations,
      pacingAnalysis,
      conflictAnalysis,
      consistencyAnalysis
    };
  }

  private analyzePacing(): PacingAnalysis {
    const beats = this.guide.beatSheet;
    const totalDuration = beats.reduce((sum, beat) => sum + (beat.estimatedDuration || 0), 0);
    const averageBeatDuration = totalDuration / beats.length || 0;

    // Analyze act distribution
    const actDistribution: ActDistribution[] = this.template.columns.map(column => {
      const actBeats = beats.filter(beat => beat.act === column.id);
      const actDuration = actBeats.reduce((sum, beat) => sum + (beat.estimatedDuration || 0), 0);
      
      // Recommended percentages based on template
      const recommendedPercentage = this.getRecommendedActPercentage(column.id);
      const recommendedBeatCount = Math.round((beats.length * recommendedPercentage) / 100);
      const recommendedDuration = Math.round((totalDuration * recommendedPercentage) / 100);

      const percentage = beats.length > 0 ? (actBeats.length / beats.length) * 100 : 0;
      const durationPercentage = totalDuration > 0 ? (actDuration / totalDuration) * 100 : 0;

      // Determine pacing for this act
      let pacing: 'too_fast' | 'too_slow' | 'good' = 'good';
      if (percentage < recommendedPercentage * 0.7) pacing = 'too_fast';
      else if (percentage > recommendedPercentage * 1.3) pacing = 'too_slow';

      return {
        actId: column.id,
        actName: column.label,
        beatCount: actBeats.length,
        percentage,
        duration: actDuration,
        durationPercentage,
        pacing,
        recommendedBeatCount,
        recommendedDuration
      };
    });

    // Determine overall pacing
    let overallPacing: 'too_fast' | 'too_slow' | 'uneven' | 'good' = 'good';
    const pacingIssues = actDistribution.filter(act => act.pacing !== 'good');
    if (pacingIssues.length > 1) overallPacing = 'uneven';
    else if (pacingIssues.length === 1) overallPacing = pacingIssues[0].pacing;

    // Generate pacing recommendations
    const recommendedChanges: PacingRecommendation[] = actDistribution
      .filter(act => act.pacing !== 'good')
      .map(act => ({
        type: act.pacing === 'too_slow' ? 'consolidate' : 'expand' as 'consolidate' | 'expand',
        actId: act.actId,
        description: act.pacing === 'too_slow' 
          ? `${act.actName} has ${act.beatCount} beats (${act.percentage.toFixed(1)}%) but should have around ${act.recommendedBeatCount} beats. Consider consolidating some beats.`
          : `${act.actName} has only ${act.beatCount} beats (${act.percentage.toFixed(1)}%) but should have around ${act.recommendedBeatCount} beats. Consider expanding this section.`,
        beatIds: beats.filter(beat => beat.act === act.actId).map(beat => beat.id),
        priority: Math.abs(act.percentage - (act.recommendedBeatCount / beats.length * 100)) > 15 ? 'high' : 'medium'
      }));

    return {
      actDistribution,
      overallPacing,
      recommendedChanges,
      totalDuration,
      averageBeatDuration
    };
  }

  private analyzeConflict(): ConflictAnalysis {
    const beats = this.guide.beatSheet;
    
    // Check for inciting incident
    const hasIncitingIncident = beats.some(beat => 
      beat.beatFunction === 'inciting_incident' || 
      beat.title.toLowerCase().includes('inciting') ||
      beat.summary.toLowerCase().includes('conflict')
    );

    // Analyze conflict beats
    const conflictBeats: ConflictBeat[] = beats.map(beat => {
      const conflictLevel = this.assessConflictLevel(beat);
      const stakesLevel = this.assessStakesLevel(beat);
      const tension = conflictLevel > 7 ? 'high' : conflictLevel > 4 ? 'medium' : 'low';
      
      return {
        beatId: beat.id,
        conflictLevel,
        stakesLevel,
        tension
      };
    });

    // Assess stakes progression
    const stakesProgression = this.assessStakesProgression(conflictBeats);
    
    // Determine conflict clarity
    const conflictClarity = this.assessConflictClarity(beats, conflictBeats);

    // Identify missing elements
    const missingElements = this.identifyMissingConflictElements(beats);

    // Generate conflict recommendations
    const recommendations = this.generateConflictRecommendations(beats, conflictBeats, stakesProgression);

    return {
      hasIncitingIncident,
      conflictClarity,
      stakesProgression,
      conflictBeats,
      missingElements,
      recommendations
    };
  }

  private analyzeConsistency(): ConsistencyAnalysis {
    const beats = this.guide.beatSheet;
    const characters = this.guide.characters;

    // Analyze character consistency
    const characterConsistency: CharacterConsistency[] = characters.map(character => {
      const characterBeats = beats.filter(beat => beat.charactersPresent.includes(character.id));
      const consistencyScore = this.calculateCharacterConsistency(character, characterBeats);
      const inconsistentBeats = this.findInconsistentBeats(character, characterBeats);
      const motivationChanges = this.trackMotivationChanges(character, characterBeats);

      return {
        characterId: character.id,
        characterName: character.name,
        consistencyScore,
        inconsistentBeats,
        motivationChanges
      };
    });

    // Find motivation conflicts
    const motivationConflicts = this.findMotivationConflicts(characters, beats);

    // Identify plot holes
    const plotHoles = this.identifyPlotHoles(beats);

    // Calculate thematic consistency
    const thematicConsistency = this.calculateThematicConsistency(beats);

    return {
      characterConsistency,
      motivationConflicts,
      plotHoles,
      thematicConsistency
    };
  }

  // Helper methods for pacing analysis
  private getRecommendedActPercentage(actId: string): number {
    // Standard three-act structure percentages
    const standardPercentages: Record<string, number> = {
      'ACT_I': 25,
      'ACT_IIA': 25,
      'ACT_IIB': 25,
      'ACT_III': 25
    };

    return standardPercentages[actId] || 25;
  }

  // Helper methods for conflict analysis
  private assessConflictLevel(beat: Beat): number {
    let score = 5; // baseline
    
    if (beat.beatFunction === 'conflict') score += 3;
    if (beat.beatFunction === 'climax') score += 4;
    if (beat.beatFunction === 'inciting_incident') score += 2;
    
    if (beat.summary.toLowerCase().includes('conflict')) score += 1;
    if (beat.summary.toLowerCase().includes('fight')) score += 2;
    if (beat.summary.toLowerCase().includes('argue')) score += 1;
    if (beat.summary.toLowerCase().includes('tension')) score += 1;
    
    if (beat.emotionalCharge === 'very_negative' || beat.emotionalCharge === 'negative') score += 1;
    
    return Math.min(score, 10);
  }

  private assessStakesLevel(beat: Beat): number {
    let score = 5; // baseline
    
    if (beat.importance === 'critical') score += 3;
    if (beat.importance === 'high') score += 2;
    if (beat.importance === 'medium') score += 1;
    
    if (beat.summary.toLowerCase().includes('stakes')) score += 2;
    if (beat.summary.toLowerCase().includes('consequence')) score += 2;
    if (beat.summary.toLowerCase().includes('risk')) score += 1;
    if (beat.summary.toLowerCase().includes('danger')) score += 2;
    
    return Math.min(score, 10);
  }

  private assessStakesProgression(conflictBeats: ConflictBeat[]): 'flat' | 'declining' | 'inconsistent' | 'rising' | 'optimal' {
    if (conflictBeats.length < 2) return 'flat';
    
    const stakesLevels = conflictBeats.map(beat => beat.stakesLevel);
    let rising = 0, declining = 0;
    
    for (let i = 1; i < stakesLevels.length; i++) {
      if (stakesLevels[i] > stakesLevels[i - 1]) rising++;
      else if (stakesLevels[i] < stakesLevels[i - 1]) declining++;
    }
    
    const risingPercentage = rising / (stakesLevels.length - 1);
    const decliningPercentage = declining / (stakesLevels.length - 1);
    
    if (risingPercentage > 0.7) return 'optimal';
    if (risingPercentage > 0.5) return 'rising';
    if (decliningPercentage > 0.5) return 'declining';
    if (Math.abs(risingPercentage - decliningPercentage) < 0.2) return 'inconsistent';
    return 'flat';
  }

  private assessConflictClarity(beats: Beat[], conflictBeats: ConflictBeat[]): 'unclear' | 'weak' | 'clear' | 'strong' {
    const avgConflictLevel = conflictBeats.reduce((sum, beat) => sum + beat.conflictLevel, 0) / conflictBeats.length;
    const hasConflictBeats = beats.some(beat => beat.beatFunction === 'conflict');
    const hasIncitingIncident = beats.some(beat => beat.beatFunction === 'inciting_incident');
    
    if (avgConflictLevel > 7 && hasConflictBeats && hasIncitingIncident) return 'strong';
    if (avgConflictLevel > 5 && (hasConflictBeats || hasIncitingIncident)) return 'clear';
    if (avgConflictLevel > 3) return 'weak';
    return 'unclear';
  }

  private identifyMissingConflictElements(beats: Beat[]): string[] {
    const missing: string[] = [];
    
    if (!beats.some(beat => beat.beatFunction === 'inciting_incident')) {
      missing.push('Inciting Incident - The event that starts the main conflict');
    }
    
    if (!beats.some(beat => beat.beatFunction === 'climax')) {
      missing.push('Climax - The peak of conflict and tension');
    }
    
    if (!beats.some(beat => beat.beatFunction === 'resolution')) {
      missing.push('Resolution - How the conflict is resolved');
    }
    
    const conflictBeats = beats.filter(beat => 
      beat.beatFunction === 'conflict' || 
      beat.summary.toLowerCase().includes('conflict')
    );
    
    if (conflictBeats.length < 2) {
      missing.push('Sufficient Conflict - More conflict beats needed for tension');
    }
    
    return missing;
  }

  private generateConflictRecommendations(beats: Beat[], conflictBeats: ConflictBeat[], stakesProgression: string): ConflictRecommendation[] {
    const recommendations: ConflictRecommendation[] = [];
    
    // Find low-conflict beats that could be enhanced
    conflictBeats
      .filter(beat => beat.conflictLevel < 5)
      .slice(0, 3) // Limit to top 3
      .forEach(beat => {
        const beatData = beats.find(b => b.id === beat.beatId);
        if (beatData) {
          recommendations.push({
            type: 'add_tension',
            beatId: beat.beatId,
            description: `"${beatData.title}" has low conflict level. Consider adding tension or obstacles.`,
            implementation: `Add character disagreement, introduce obstacles, or raise personal stakes in this beat.`
          });
        }
      });
    
    // Stakes progression recommendations
    if (stakesProgression === 'flat' || stakesProgression === 'declining') {
      const lowStakesBeats = conflictBeats
        .filter(beat => beat.stakesLevel < 6)
        .slice(0, 2);
        
      lowStakesBeats.forEach(beat => {
        const beatData = beats.find(b => b.id === beat.beatId);
        if (beatData) {
          recommendations.push({
            type: 'raise_stakes',
            beatId: beat.beatId,
            description: `"${beatData.title}" could have higher stakes to drive the story forward.`,
            implementation: `Increase consequences, add time pressure, or threaten something the character values.`
          });
        }
      });
    }
    
    return recommendations;
  }

  // Helper methods for consistency analysis
  private calculateCharacterConsistency(character: CharacterProfile, characterBeats: Beat[]): number {
    // This is a simplified consistency calculation
    // In a real implementation, this would analyze character actions against their established traits
    let score = 100;
    
    // Check if character appears in appropriate beats based on their archetype
    const appropriateBeats = characterBeats.filter(beat => 
      this.isCharacterAppropriateForBeat(character, beat)
    );
    
    const consistencyRatio = appropriateBeats.length / characterBeats.length;
    score = Math.round(consistencyRatio * 100);
    
    return Math.max(0, Math.min(100, score));
  }

  private isCharacterAppropriateForBeat(character: CharacterProfile, beat: Beat): boolean {
    // Simplified logic - would be more sophisticated in production
    if (character.archetype.toLowerCase().includes('antagonist') && beat.beatFunction === 'conflict') return true;
    if (character.archetype.toLowerCase().includes('protagonist') && beat.beatFunction === 'resolution') return true;
    return true; // Default to appropriate for now
  }

  private findInconsistentBeats(character: CharacterProfile, characterBeats: Beat[]): string[] {
    // Simplified - would analyze character behavior consistency
    return characterBeats
      .filter(beat => !this.isCharacterAppropriateForBeat(character, beat))
      .map(beat => beat.id);
  }

  private trackMotivationChanges(character: CharacterProfile, characterBeats: Beat[]): MotivationChange[] {
    // Simplified - would track actual motivation changes across beats
    return [];
  }

  private findMotivationConflicts(characters: CharacterProfile[], beats: Beat[]): MotivationConflict[] {
    // Simplified implementation
    return [];
  }

  private identifyPlotHoles(beats: Beat[]): PlotHole[] {
    // Simplified implementation
    return [];
  }

  private calculateThematicConsistency(beats: Beat[]): number {
    // Analyze keyword consistency and thematic coherence
    const allKeywords = beats.flatMap(beat => beat.keywords || []);
    const keywordFrequency: Record<string, number> = {};
    
    allKeywords.forEach(keyword => {
      keywordFrequency[keyword] = (keywordFrequency[keyword] || 0) + 1;
    });
    
    const totalKeywords = allKeywords.length;
    const uniqueKeywords = Object.keys(keywordFrequency).length;
    
    // Higher consistency if keywords are repeated across beats
    const avgFrequency = totalKeywords / uniqueKeywords;
    const consistency = Math.min(100, avgFrequency * 20); // Scale to 0-100
    
    return Math.round(consistency);
  }

  // Issue generation methods
  private generatePacingIssues(pacingAnalysis: PacingAnalysis): AnalysisIssue[] {
    const issues: AnalysisIssue[] = [];
    
    pacingAnalysis.actDistribution.forEach(act => {
      if (act.pacing !== 'good') {
        const severity = Math.abs(act.percentage - (act.recommendedBeatCount / this.guide.beatSheet.length * 100)) > 20 
          ? 'high' : 'medium';
        
        issues.push({
          id: `pacing-${act.actId}`,
          type: 'pacing',
          severity,
          title: `${act.actName} Pacing Issue`,
          description: act.pacing === 'too_slow' 
            ? `${act.actName} is currently ${act.percentage.toFixed(1)}% of your total beats. Consider consolidating to move into the main conflict sooner.`
            : `${act.actName} is only ${act.percentage.toFixed(1)}% of your total beats. Consider expanding this section for better story development.`,
          affectedBeats: this.guide.beatSheet.filter(beat => beat.act === act.actId).map(beat => beat.id),
          suggestions: act.pacing === 'too_slow' 
            ? ['Merge similar beats', 'Remove less essential story points', 'Combine character introductions']
            : ['Split complex beats', 'Add character development', 'Expand on key conflicts'],
          autoFixAvailable: true
        });
      }
    });
    
    return issues;
  }

  private generateConflictIssues(conflictAnalysis: ConflictAnalysis): AnalysisIssue[] {
    const issues: AnalysisIssue[] = [];
    
    if (!conflictAnalysis.hasIncitingIncident) {
      issues.push({
        id: 'missing-inciting-incident',
        type: 'conflict',
        severity: 'high',
        title: 'Missing Inciting Incident',
        description: 'Your story lacks a clear inciting incident. This is the event that kicks off the main conflict.',
        affectedBeats: [],
        suggestions: ['Add a beat that introduces the main conflict', 'Identify the moment that changes everything for your protagonist'],
        autoFixAvailable: false
      });
    }
    
    if (conflictAnalysis.conflictClarity === 'unclear' || conflictAnalysis.conflictClarity === 'weak') {
      const lowConflictBeats = conflictAnalysis.conflictBeats
        .filter(beat => beat.conflictLevel < 5)
        .map(beat => beat.beatId);
        
      issues.push({
        id: 'weak-conflict',
        type: 'conflict',
        severity: 'medium',
        title: 'Weak Central Conflict',
        description: 'The central conflict is not clear or strong enough. Several beats lack sufficient tension.',
        affectedBeats: lowConflictBeats,
        suggestions: ['Clarify what your protagonist wants and what opposes them', 'Add obstacles and complications', 'Raise the stakes'],
        autoFixAvailable: false
      });
    }
    
    if (conflictAnalysis.stakesProgression === 'flat' || conflictAnalysis.stakesProgression === 'declining') {
      issues.push({
        id: 'stakes-progression',
        type: 'conflict',
        severity: 'medium',
        title: 'Stakes Not Escalating',
        description: 'The stakes don\'t seem to escalate throughout your story. The tension should generally increase.',
        affectedBeats: conflictAnalysis.conflictBeats.map(beat => beat.beatId),
        suggestions: ['Increase consequences as the story progresses', 'Add time pressure', 'Threaten what characters value most'],
        autoFixAvailable: false
      });
    }
    
    return issues;
  }

  private generateConsistencyIssues(consistencyAnalysis: ConsistencyAnalysis): AnalysisIssue[] {
    const issues: AnalysisIssue[] = [];
    
    consistencyAnalysis.characterConsistency.forEach(character => {
      if (character.consistencyScore < 70) {
        issues.push({
          id: `character-consistency-${character.characterId}`,
          type: 'consistency',
          severity: character.consistencyScore < 50 ? 'high' : 'medium',
          title: `${character.characterName} Character Inconsistency`,
          description: `${character.characterName}'s actions may not be consistent with their established character traits across these beats.`,
          affectedBeats: character.inconsistentBeats,
          affectedCharacters: [character.characterId],
          suggestions: ['Review character motivations in these beats', 'Ensure actions align with character archetype', 'Consider character development arc'],
          autoFixAvailable: false
        });
      }
    });
    
    if (consistencyAnalysis.thematicConsistency < 60) {
      issues.push({
        id: 'thematic-inconsistency',
        type: 'consistency',
        severity: 'low',
        title: 'Thematic Inconsistency',
        description: 'Your story themes may not be consistent across all beats. Consider strengthening thematic elements.',
        affectedBeats: this.guide.beatSheet.map(beat => beat.id),
        suggestions: ['Identify core themes and reinforce them', 'Use consistent keywords across beats', 'Align character arcs with main themes'],
        autoFixAvailable: false
      });
    }
    
    return issues;
  }

  private generateRecommendations(
    pacingAnalysis: PacingAnalysis,
    conflictAnalysis: ConflictAnalysis,
    consistencyAnalysis: ConsistencyAnalysis
  ): AnalysisRecommendation[] {
    const recommendations: AnalysisRecommendation[] = [];
    
    // Pacing recommendations
    if (pacingAnalysis.overallPacing !== 'good') {
      recommendations.push({
        id: 'improve-pacing',
        type: 'optimization',
        title: 'Optimize Story Pacing',
        description: 'Adjust act distribution to improve overall story flow and maintain audience engagement.',
        impact: 'high',
        implementation: 'Use the split/merge beat tools to adjust act lengths according to the recommendations.'
      });
    }
    
    // Conflict recommendations
    if (conflictAnalysis.conflictClarity !== 'strong') {
      recommendations.push({
        id: 'strengthen-conflict',
        type: 'enhancement',
        title: 'Strengthen Central Conflict',
        description: 'Clarify and intensify the main conflict to create more engaging drama.',
        impact: 'high',
        implementation: 'Focus on what your protagonist wants and what prevents them from getting it.'
      });
    }
    
    // Character recommendations
    const lowConsistencyCharacters = consistencyAnalysis.characterConsistency.filter(char => char.consistencyScore < 80);
    if (lowConsistencyCharacters.length > 0) {
      recommendations.push({
        id: 'improve-character-consistency',
        type: 'enhancement',
        title: 'Improve Character Consistency',
        description: 'Align character actions with their established traits and motivations.',
        impact: 'medium',
        implementation: 'Review character profiles and ensure their actions in each beat match their archetype and goals.'
      });
    }
    
    return recommendations;
  }

  private calculateOverallScore(
    issues: AnalysisIssue[],
    pacingAnalysis: PacingAnalysis,
    conflictAnalysis: ConflictAnalysis,
    consistencyAnalysis: ConsistencyAnalysis
  ): number {
    let score = 100;
    
    // Deduct points for issues
    issues.forEach(issue => {
      switch (issue.severity) {
        case 'critical': score -= 20; break;
        case 'high': score -= 15; break;
        case 'medium': score -= 10; break;
        case 'low': score -= 5; break;
      }
    });
    
    // Bonus points for good structure
    if (pacingAnalysis.overallPacing === 'good') score += 5;
    if (conflictAnalysis.conflictClarity === 'strong') score += 5;
    if (consistencyAnalysis.thematicConsistency > 80) score += 5;
    
    return Math.max(0, Math.min(100, score));
  }
}

// Factory function for easy usage
export function analyzeStory(guide: ProductionGuide, template: BeatTemplate): StoryAnalysis {
  const analyzer = new StoryAnalyzer(guide, template);
  return analyzer.analyzeStory();
}
