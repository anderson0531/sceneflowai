'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Users,
  Zap,
  ChevronDown,
  ChevronUp,
  Target,
  BarChart3,
  AlertCircle,
  Lightbulb,
  RefreshCw,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Activity,
  Gauge,
  Brain,
  Shield
} from 'lucide-react';
import { useGuideStore } from '@/store/useGuideStore';
import { useCue } from '@/store/useCueStore';
import { getTemplateById, debateTemplate } from '@/types/beatTemplates';
import { analyzeStory, StoryAnalysis, AnalysisIssue } from '@/lib/storyAnalyzer';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface StoryAnalysisPanelProps {
  className?: string;
}

export function StoryAnalysisPanel({ className }: StoryAnalysisPanelProps) {
  const { guide, splitBeat, updateBeat } = useGuideStore();
  const { invokeCue } = useCue();
  const [analysis, setAnalysis] = useState<StoryAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['overview']));
  const [lastAnalysisTime, setLastAnalysisTime] = useState<Date | null>(null);

  const currentTemplate = getTemplateById(guide.beatTemplate || 'debate-educational') || debateTemplate;

  // Auto-analyze when beat sheet changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performAnalysis();
    }, 1000); // Debounce analysis by 1 second

    return () => clearTimeout(timeoutId);
  }, [guide.beatSheet, guide.characters]);

  const performAnalysis = async () => {
    if (guide.beatSheet.length === 0) return;
    
    setIsAnalyzing(true);
    try {
      // Simulate some analysis time for better UX
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const newAnalysis = analyzeStory(guide, currentTemplate);
      setAnalysis(newAnalysis);
      setLastAnalysisTime(new Date());
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const getSeverityIcon = (severity: AnalysisIssue['severity']) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'high': return <AlertCircle className="w-4 h-4 text-orange-500" />;
      case 'medium': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'low': return <Eye className="w-4 h-4 text-blue-500" />;
      default: return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getSeverityColor = (severity: AnalysisIssue['severity']) => {
    switch (severity) {
      case 'critical': return 'text-red-400 bg-red-500/10 border-red-500/20';
      case 'high': return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
      case 'medium': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
      case 'low': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      default: return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Good';
    if (score >= 70) return 'Fair';
    if (score >= 60) return 'Needs Work';
    return 'Critical Issues';
  };

  const handleIssueClick = (issue: AnalysisIssue) => {
    if (issue.affectedBeats.length > 0) {
      // Highlight the first affected beat and invoke Cue
      const firstBeat = guide.beatSheet.find(beat => beat.id === issue.affectedBeats[0]);
      if (firstBeat) {
        invokeCue({
          type: 'beatCard',
          content: `${issue.title}: ${issue.description}`,
          id: firstBeat.id
        });
      }
    } else {
      // General story issue
      invokeCue({
        type: 'analysis',
        content: `${issue.title}: ${issue.description}. ${issue.suggestions.join(' ')}`,
        id: issue.id
      });
    }
  };

  const handleAutoFix = (issue: AnalysisIssue) => {
    if (issue.type === 'pacing' && issue.autoFixAvailable) {
      // Example auto-fix for pacing issues
      if (issue.description.includes('consolidating')) {
        // Find beats that could be merged
        const affectedBeats = guide.beatSheet.filter(beat => issue.affectedBeats.includes(beat.id));
        if (affectedBeats.length >= 2) {
          invokeCue({
            type: 'template',
            content: `Help me consolidate these beats: ${affectedBeats.map(b => b.title).join(', ')}. Suggest which beats could be merged to improve pacing.`,
            id: 'pacing-autofix'
          });
        }
      }
    }
  };

  const criticalIssues = analysis?.issues.filter(issue => issue.severity === 'critical') || [];
  const highIssues = analysis?.issues.filter(issue => issue.severity === 'high') || [];
  const mediumIssues = analysis?.issues.filter(issue => issue.severity === 'medium') || [];

  if (!analysis && !isAnalyzing) {
    return (
      <div className={cn("bg-gray-900 border-l border-gray-700 p-4", className)}>
        <div className="text-center py-8">
          <Brain className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <h3 className="text-sm font-medium text-gray-400 mb-2">Story Analysis</h3>
          <p className="text-xs text-gray-500 mb-4">
            Add beats to your story to get proactive analysis and recommendations
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={performAnalysis}
            className="text-xs"
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            Analyze Story
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("bg-gray-900 border-l border-gray-700 flex flex-col h-full", className)}>
      {/* Header */}
      <div className="p-4 border-b border-gray-700 bg-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-green-400" />
            <h3 className="font-semibold text-white">Story Guardrails</h3>
          </div>
          <div className="flex items-center gap-2">
            {isAnalyzing && (
              <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />
            )}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={performAnalysis}
                    disabled={isAnalyzing}
                    className="p-2 text-gray-400 hover:text-white"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="bg-gray-700 text-white border border-gray-600">
                  <p>Refresh Analysis</p>
                  <p className="text-xs text-gray-300">Auto-updates when you edit beats</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        
        {lastAnalysisTime && (
          <p className="text-xs text-gray-400 mt-1">
            Last updated: {lastAnalysisTime.toLocaleTimeString()}
          </p>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isAnalyzing ? (
          <div className="p-4 text-center">
            <RefreshCw className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-400">Analyzing your story...</p>
          </div>
        ) : analysis ? (
          <div className="space-y-4 p-4">
            {/* Overall Score */}
            <Card className="bg-gray-800 border-gray-600">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-white">Overall Story Health</CardTitle>
                  <div className="flex items-center gap-2">
                    <Gauge className={cn("w-4 h-4", getScoreColor(analysis.overallScore))} />
                    <span className={cn("text-lg font-bold", getScoreColor(analysis.overallScore))}>
                      {analysis.overallScore}
                    </span>
                  </div>
                </div>
                <p className={cn("text-xs", getScoreColor(analysis.overallScore))}>
                  {getScoreLabel(analysis.overallScore)}
                </p>
              </CardHeader>
            </Card>

            {/* Critical Issues Alert */}
            {criticalIssues.length > 0 && (
              <Card className="bg-red-500/5 border-red-500/20">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                    <CardTitle className="text-sm font-medium text-red-400">
                      Critical Issues Detected
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    {criticalIssues.map(issue => (
                      <div
                        key={issue.id}
                        className="p-2 bg-red-500/10 border border-red-500/20 rounded cursor-pointer hover:bg-red-500/20 transition-colors"
                        onClick={() => handleIssueClick(issue)}
                      >
                        <p className="text-sm font-medium text-red-300">{issue.title}</p>
                        <p className="text-xs text-red-200">{issue.description}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Pacing Analysis */}
            <Card className="bg-gray-800 border-gray-600">
              <CardHeader 
                className="cursor-pointer hover:bg-gray-750"
                onClick={() => toggleSection('pacing')}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-blue-400" />
                    <CardTitle className="text-sm font-medium text-white">Pacing Analysis</CardTitle>
                    <Badge className={cn(
                      "text-xs",
                      analysis.pacingAnalysis.overallPacing === 'good' 
                        ? "bg-green-500/20 text-green-300 border-green-500/30"
                        : "bg-yellow-500/20 text-yellow-300 border-yellow-500/30"
                    )}>
                      {analysis.pacingAnalysis.overallPacing.replace('_', ' ')}
                    </Badge>
                  </div>
                  {expandedSections.has('pacing') ? 
                    <ChevronUp className="w-4 h-4 text-gray-400" /> : 
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  }
                </div>
              </CardHeader>
              {expandedSections.has('pacing') && (
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {analysis.pacingAnalysis.actDistribution.map(act => (
                      <div key={act.actId} className="flex items-center justify-between p-2 bg-gray-700 rounded">
                        <div>
                          <p className="text-sm font-medium text-white">{act.actName}</p>
                          <p className="text-xs text-gray-300">
                            {act.beatCount} beats ({act.percentage.toFixed(1)}%)
                          </p>
                        </div>
                        <Badge className={cn(
                          "text-xs",
                          act.pacing === 'good' 
                            ? "bg-green-500/20 text-green-300 border-green-500/30"
                            : "bg-orange-500/20 text-orange-300 border-orange-500/30"
                        )}>
                          {act.pacing.replace('_', ' ')}
                        </Badge>
                      </div>
                    ))}
                  </div>
                  
                  {analysis.pacingAnalysis.recommendedChanges.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-600">
                      <p className="text-xs font-medium text-gray-300 mb-2">Recommendations:</p>
                      {analysis.pacingAnalysis.recommendedChanges.slice(0, 2).map(change => (
                        <div key={change.actId} className="text-xs text-gray-400 mb-1">
                          • {change.description}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              )}
            </Card>

            {/* Conflict Analysis */}
            <Card className="bg-gray-800 border-gray-600">
              <CardHeader 
                className="cursor-pointer hover:bg-gray-750"
                onClick={() => toggleSection('conflict')}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-orange-400" />
                    <CardTitle className="text-sm font-medium text-white">Conflict Analysis</CardTitle>
                    <Badge className={cn(
                      "text-xs",
                      analysis.conflictAnalysis.conflictClarity === 'strong' || analysis.conflictAnalysis.conflictClarity === 'clear'
                        ? "bg-green-500/20 text-green-300 border-green-500/30"
                        : "bg-red-500/20 text-red-300 border-red-500/30"
                    )}>
                      {analysis.conflictAnalysis.conflictClarity}
                    </Badge>
                  </div>
                  {expandedSections.has('conflict') ? 
                    <ChevronUp className="w-4 h-4 text-gray-400" /> : 
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  }
                </div>
              </CardHeader>
              {expandedSections.has('conflict') && (
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-300">Inciting Incident</span>
                      {analysis.conflictAnalysis.hasIncitingIncident ? (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-red-400" />
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-300">Stakes Progression</span>
                      <Badge className={cn(
                        "text-xs",
                        analysis.conflictAnalysis.stakesProgression === 'optimal' || analysis.conflictAnalysis.stakesProgression === 'rising'
                          ? "bg-green-500/20 text-green-300 border-green-500/30"
                          : "bg-red-500/20 text-red-300 border-red-500/30"
                      )}>
                        {analysis.conflictAnalysis.stakesProgression.replace('_', ' ')}
                      </Badge>
                    </div>

                    {analysis.conflictAnalysis.missingElements.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-600">
                        <p className="text-xs font-medium text-gray-300 mb-2">Missing Elements:</p>
                        {analysis.conflictAnalysis.missingElements.map((element, index) => (
                          <div key={index} className="text-xs text-gray-400 mb-1">
                            • {element}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Issues List */}
            {(highIssues.length > 0 || mediumIssues.length > 0) && (
              <Card className="bg-gray-800 border-gray-600">
                <CardHeader 
                  className="cursor-pointer hover:bg-gray-750"
                  onClick={() => toggleSection('issues')}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-yellow-400" />
                      <CardTitle className="text-sm font-medium text-white">Active Issues</CardTitle>
                      <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30 text-xs">
                        {highIssues.length + mediumIssues.length}
                      </Badge>
                    </div>
                    {expandedSections.has('issues') ? 
                      <ChevronUp className="w-4 h-4 text-gray-400" /> : 
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    }
                  </div>
                </CardHeader>
                {expandedSections.has('issues') && (
                  <CardContent className="pt-0">
                    <div className="space-y-2">
                      {[...highIssues, ...mediumIssues].slice(0, 5).map(issue => (
                        <div
                          key={issue.id}
                          className={cn(
                            "p-3 border rounded cursor-pointer hover:bg-gray-700/50 transition-colors",
                            getSeverityColor(issue.severity)
                          )}
                          onClick={() => handleIssueClick(issue)}
                        >
                          <div className="flex items-start gap-2">
                            {getSeverityIcon(issue.severity)}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-white">{issue.title}</p>
                              <p className="text-xs text-gray-300 mt-1">{issue.description}</p>
                              
                              {issue.affectedBeats.length > 0 && (
                                <p className="text-xs text-gray-400 mt-1">
                                  Affects {issue.affectedBeats.length} beat{issue.affectedBeats.length !== 1 ? 's' : ''}
                                </p>
                              )}
                              
                              {issue.autoFixAvailable && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAutoFix(issue);
                                  }}
                                  className="mt-2 h-6 px-2 text-xs text-blue-400 hover:text-blue-300"
                                >
                                  <Zap className="w-3 h-3 mr-1" />
                                  Quick Fix
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            )}

            {/* Recommendations */}
            {analysis.recommendations.length > 0 && (
              <Card className="bg-gray-800 border-gray-600">
                <CardHeader 
                  className="cursor-pointer hover:bg-gray-750"
                  onClick={() => toggleSection('recommendations')}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Lightbulb className="w-4 h-4 text-green-400" />
                      <CardTitle className="text-sm font-medium text-white">Recommendations</CardTitle>
                      <Badge className="bg-green-500/20 text-green-300 border-green-500/30 text-xs">
                        {analysis.recommendations.length}
                      </Badge>
                    </div>
                    {expandedSections.has('recommendations') ? 
                      <ChevronUp className="w-4 h-4 text-gray-400" /> : 
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    }
                  </div>
                </CardHeader>
                {expandedSections.has('recommendations') && (
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      {analysis.recommendations.slice(0, 3).map(rec => (
                        <div key={rec.id} className="p-3 bg-green-500/5 border border-green-500/20 rounded">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="text-sm font-medium text-green-300">{rec.title}</h4>
                            <Badge className={cn(
                              "text-xs",
                              rec.impact === 'high' ? "bg-green-500/20 text-green-300 border-green-500/30" :
                              rec.impact === 'medium' ? "bg-yellow-500/20 text-yellow-300 border-yellow-500/30" :
                              "bg-blue-500/20 text-blue-300 border-blue-500/30"
                            )}>
                              {rec.impact} impact
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-300 mb-2">{rec.description}</p>
                          <p className="text-xs text-gray-400">{rec.implementation}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
