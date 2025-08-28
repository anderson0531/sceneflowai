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
  Eye, 
  Settings,
  RefreshCw,
  Filter,
  SortAsc
} from 'lucide-react';

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

  if (isLoading) {
    return (
      <div className={`bg-gray-900/95 backdrop-blur-sm rounded-xl border border-gray-700/50 shadow-2xl p-6 ${className}`}>
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-blue-500/30">
            <RefreshCw className="w-8 h-8 text-blue-300 animate-spin" />
          </div>
          <h4 className="text-xl font-bold text-gray-200 mb-3">Analyzing Your Story</h4>
          <p className="text-base text-gray-400 leading-relaxed max-w-sm mx-auto">
            The AI is examining your story structure, characters, and pacing to provide personalized recommendations.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gray-900/95 backdrop-blur-sm rounded-xl border border-gray-700/50 shadow-2xl w-full overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-700/50">
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <div className="p-3 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl border border-blue-500/40 shadow-lg flex-shrink-0">
                <Shield className="w-7 h-7 text-blue-300" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-2xl font-bold text-white mb-1 break-words">Director's Notes</h3>
                <p className="text-base text-gray-300 font-medium break-words">
                  AI-powered story analysis and recommendations
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex justify-start sm:justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleInteractionMode}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-lg font-semibold transition-all duration-200 ${
                mode === 'CoPilot' 
                  ? 'border-green-500/60 text-green-300 hover:bg-green-500/15 hover:border-green-400/70 shadow-lg shadow-green-500/10' 
                  : 'border-blue-500/60 text-blue-300 hover:bg-blue-500/15 hover:border-blue-400/70 shadow-lg shadow-blue-500/10'
              }`}
            >
              <Zap className="w-4 h-4" />
              {mode === 'CoPilot' ? 'Co-Pilot Mode' : 'Guidance Mode'}
            </Button>
          </div>
        </div>

        {/* Mode Description */}
        <div className={`p-4 rounded-xl border-2 ${
          mode === 'CoPilot' 
            ? 'bg-gradient-to-r from-green-900/30 to-emerald-900/20 border-green-500/40 shadow-lg shadow-green-500/10' 
            : 'bg-gradient-to-r from-blue-900/30 to-indigo-900/20 border-blue-500/40 shadow-lg shadow-blue-500/10'
        }`}>
          <p className="text-base text-gray-200 font-medium leading-relaxed">
            {mode === 'CoPilot' 
              ? '🤖 AI will automatically apply low-risk, high-confidence recommendations. You can review and undo changes.'
              : '👁️ All recommendations require manual review before application. Full control over every change.'
            }
          </p>
        </div>

        {/* Status Summary */}
        <div className="flex flex-wrap items-start gap-3 sm:gap-5 mt-6">
          <div className="flex items-center gap-2.5">
            <Badge variant="outline" className="text-yellow-300 border-yellow-500/50 bg-yellow-900/20 px-3 py-1.5 text-sm font-semibold whitespace-nowrap">
              {statusCounts.pending} Pending
            </Badge>
          </div>
          <div className="flex items-center gap-2.5">
            <Badge className="text-green-300 border-green-500/50 bg-green-900/30 px-3 py-1.5 text-sm font-semibold shadow-lg shadow-green-500/20 whitespace-nowrap">
              {statusCounts.applied} Applied
            </Badge>
          </div>
          <div className="flex items-center gap-2.5">
            <Badge variant="outline" className="text-gray-300 border-gray-500/50 bg-gray-800/30 px-3 py-1.5 text-sm font-semibold whitespace-nowrap">
              {statusCounts.dismissed} Dismissed
            </Badge>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="p-5 border-b border-gray-700/50 bg-gradient-to-r from-gray-800/60 to-gray-700/40">
        <div className="space-y-4">
          {/* Filter and Sort Row */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5">
            {/* Filter */}
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-700/50 rounded-lg">
                <Filter className="w-4 h-4 text-gray-300" />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="bg-gray-700/80 border border-gray-600/50 rounded-lg px-4 py-2 text-sm text-white font-medium focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50 transition-all duration-200 min-w-[140px]"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending Review</option>
                <option value="applied">Applied</option>
                <option value="dismissed">Dismissed</option>
              </select>
            </div>

            {/* Sort */}
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-700/50 rounded-lg">
                <SortAsc className="w-4 h-4 text-gray-300" />
              </div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-gray-700/80 border border-gray-600/50 rounded-lg px-4 py-2 text-sm text-white font-medium focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50 transition-all duration-200 min-w-[160px]"
              >
                <option value="impact">Sort by Impact</option>
                <option value="confidence">Sort by Confidence</option>
                <option value="title">Sort by Title</option>
              </select>
            </div>
          </div>

          {/* Refresh Button Row */}
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.location.reload()}
              className="text-gray-300 hover:text-white hover:bg-gray-700/50 px-4 py-2.5 rounded-lg font-medium transition-all duration-200"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Analysis
            </Button>
          </div>
        </div>
      </div>

      {/* Recommendations List */}
      <div className="p-6">
        {filteredRecommendations.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Shield className="w-8 h-8 text-gray-400" />
            </div>
            <h4 className="text-xl font-bold text-gray-300 mb-3">
              {filterStatus === 'all' 
                ? 'No recommendations yet' 
                : `No ${filterStatus} recommendations`
              }
            </h4>
            <p className="text-base text-gray-400 leading-relaxed max-w-sm mx-auto">
              {filterStatus === 'all' 
                ? 'Your story analysis will appear here once complete. The AI is analyzing your story structure and will provide actionable recommendations.'
                : 'Try adjusting your filters or refresh the analysis to see more recommendations.'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {filteredRecommendations.map((recommendation) => (
              <RecommendationCard
                key={recommendation.id}
                recommendation={recommendation}
                onApply={manuallyApplyRecommendation}
                onUndo={undoRecommendation}
                onDismiss={dismissRecommendation}
              />
            ))}
          </div>
        )}
      </div>

      {/* Review Modal */}
      {selectedMutation && (
        <ReviewModal
          isOpen={isReviewModalOpen}
          onClose={() => {
            setIsReviewModalOpen(false);
            setSelectedMutation(null);
          }}
          mutation={selectedMutation.proposedMutation}
          onAccept={handleAcceptChanges}
          showAcceptButton={mode === 'Guidance'}
        />
      )}
    </div>
  );
};

export default StoryInsights;
