"use client";

import React, { useState } from 'react';
import { useStoryAnalysis } from '@/hooks/useStoryAnalysis';
import { usePreferences } from '@/store/usePreferences';
import { StoryRecommendation } from '@/types/story';
import RecommendationCard from './RecommendationCard';
import ReviewModal from './ReviewModal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  Zap, 
  RefreshCw,
  Filter,
  SortAsc,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface StoryInsightsProps {
  currentStoryData: any; // Replace with actual story data type
  className?: string;
}

const StoryInsights: React.FC<StoryInsightsProps> = ({ 
  currentStoryData, 
  className = '' 
}) => {
  const { 
    recommendations, 
    isLoading, 
    refreshAnalysis,
    manuallyApplyRecommendation, 
    undoRecommendation,
    dismissRecommendation,
    interactionMode 
  } = useStoryAnalysis(currentStoryData);
  
  const { interactionMode: mode, toggleInteractionMode } = usePreferences();
  
  const [selectedMutation, setSelectedMutation] = useState<StoryRecommendation | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'applied' | 'dismissed'>('all');
  const [sortBy, setSortBy] = useState<'impact' | 'confidence' | 'title'>('impact');
  const [isCollapsed, setIsCollapsed] = useState(false);

  const filteredRecommendations = recommendations
    .filter(rec => filterStatus === 'all' || rec.status === filterStatus)
    .sort((a, b) => {
      switch (sortBy) {
        case 'impact':
          const impactOrder = { high: 3, medium: 2, low: 1 };
          return impactOrder[b.impact] - impactOrder[a.impact];
        case 'confidence':
          return b.confidenceScore - a.confidenceScore;
        case 'title':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });

  const openReviewModal = (recommendation: StoryRecommendation) => {
    setSelectedMutation(recommendation);
    setIsReviewModalOpen(true);
  };

  const handleAcceptChanges = () => {
    if (selectedMutation) {
      manuallyApplyRecommendation(selectedMutation.id);
      setIsReviewModalOpen(false);
      setSelectedMutation(null);
    }
  };

  const getStatusCounts = () => {
    const counts = { pending: 0, applied: 0, dismissed: 0 };
    recommendations.forEach(rec => {
      if (rec.status in counts) {
        counts[rec.status as keyof typeof counts]++;
      }
    });
    return counts;
  };

  const statusCounts = getStatusCounts();

  const togglePanel = () => {
    setIsCollapsed(!isCollapsed);
  };

  if (isLoading) {
    return (
      <div 
        className={cn(
          "h-full bg-gray-900 border-l border-gray-700 flex flex-col transition-all duration-300",
          isCollapsed ? "w-12" : "w-80",
          className
        )}
      >
        <div className="flex items-center justify-between p-3 border-b border-gray-700 bg-gray-800">
          {!isCollapsed && (
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-400" />
              <h3 className="text-lg font-bold text-white">Director's Notes</h3>
            </div>
          )}
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={togglePanel}
                  className={cn(
                    "p-2 text-gray-400 hover:text-white",
                    isCollapsed && "mx-auto"
                  )}
                >
                  {isCollapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side={isCollapsed ? "left" : "bottom"} className="bg-gray-700 text-white border border-gray-600">
                <p>{isCollapsed ? 'Expand Director\'s Notes' : 'Collapse Director\'s Notes'}</p>
                <p className="text-xs text-gray-300">Toggle panel visibility for more workspace space</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
        {!isCollapsed && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-blue-500/30">
              <RefreshCw className="w-8 h-8 text-blue-300 animate-spin" />
            </div>
            <h4 className="text-xl font-bold text-gray-200 mb-3">Analyzing Your Story</h4>
            <p className="text-base text-gray-400 leading-relaxed max-w-sm mx-auto">
              The AI is examining your story structure, characters, and pacing to provide personalized recommendations.
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div 
      className={cn(
        "h-full bg-gray-900 border-l border-gray-700 flex flex-col transition-all duration-300",
        isCollapsed ? "w-12" : "w-80",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-700 bg-gray-800">
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-400" />
            <h3 className="text-lg font-bold text-white">Director's Notes</h3>
          </div>
        )}
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={togglePanel}
                className={cn(
                  "p-2 text-gray-400 hover:text-white",
                  isCollapsed && "mx-auto"
                )}
              >
                {isCollapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side={isCollapsed ? "left" : "bottom"} className="bg-gray-700 text-white border border-gray-600">
              <p>{isCollapsed ? 'Expand Director\'s Notes' : 'Collapse Director\'s Notes'}</p>
              <p className="text-xs text-gray-300">Toggle panel visibility for more workspace space</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Content */}
      {!isCollapsed && (
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            {/* Mode Toggle */}
            <div className="mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleInteractionMode}
                className="flex items-center gap-2 w-full"
              >
                <Zap className="w-4 h-4" />
                {mode === 'CoPilot' ? 'Co-Pilot Mode' : 'Guidance Mode'}
              </Button>
            </div>

            {/* Mode Description */}
            <div className="mb-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <p className="text-sm text-blue-200">
                {mode === 'CoPilot' 
                  ? '🤖 AI will automatically apply low-risk, high-confidence recommendations. You can review and undo changes.'
                  : '👁️ All recommendations require manual review before application. Full control over every change.'
                }
              </p>
            </div>

            {/* Status Summary */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <Badge variant="outline" className="text-yellow-300 border-yellow-500/50 bg-yellow-900/20 px-3 py-1.5 text-sm font-semibold">
                {statusCounts.pending} Pending
              </Badge>
              <Badge className="text-green-300 border-green-500/50 bg-green-900/30 px-3 py-1.5 text-sm font-semibold">
                {statusCounts.applied} Applied
              </Badge>
              <Badge variant="outline" className="text-gray-300 border-gray-500/50 bg-gray-800/30 px-3 py-1.5 text-sm font-semibold">
                {statusCounts.dismissed} Dismissed
              </Badge>
            </div>

            {/* Controls */}
            <div className="space-y-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-gray-700/50 rounded-lg">
                  <Filter className="w-4 h-4 text-gray-300" />
                </div>
                <select 
                  value={filterStatus} 
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="applied">Applied</option>
                  <option value="dismissed">Dismissed</option>
                </select>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="p-2 bg-gray-700/50 rounded-lg">
                  <SortAsc className="w-4 h-4 text-gray-300" />
                </div>
                <select 
                  value={sortBy} 
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white"
                >
                  <option value="impact">Sort by Impact</option>
                  <option value="confidence">Sort by Confidence</option>
                  <option value="title">Sort by Title</option>
                </select>
              </div>
            </div>

            {/* Refresh Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={refreshAnalysis}
              className="w-full mb-4"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Analysis
            </Button>

            {/* Recommendations */}
            {filteredRecommendations.length === 0 ? (
              <div className="text-center py-8">
                <Shield className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <h4 className="text-base font-semibold text-gray-300 mb-1">No recommendations yet</h4>
                <p className="text-sm text-gray-400">
                  Your story analysis will appear here once complete. The AI is analyzing your story structure and will provide actionable recommendations.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredRecommendations.map(rec => (
                  <RecommendationCard
                    key={rec.id}
                    recommendation={rec}
                    onApply={() => manuallyApplyRecommendation(rec.id)}
                    onDismiss={() => dismissRecommendation(rec.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Review Modal */}
      {selectedMutation && (
        <ReviewModal
          isOpen={isReviewModalOpen}
          onClose={() => setIsReviewModalOpen(false)}
          mutation={selectedMutation.proposedMutation}
          onAccept={handleAcceptChanges}
          showAcceptButton={mode === 'Guidance'}
        />
      )}
    </div>
  );
};

export default StoryInsights;
