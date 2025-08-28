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
      <div className={`bg-gray-900 rounded-lg border border-gray-700 p-6 ${className}`}>
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="w-6 h-6 text-blue-400 animate-spin mr-3" />
          <span className="text-gray-300">Analyzing your story...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gray-900 rounded-lg border border-gray-700 ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg border border-blue-500/30">
              <Shield className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Director's Notes</h3>
              <p className="text-sm text-gray-400">
                AI-powered story analysis and recommendations
              </p>
            </div>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={toggleInteractionMode}
            className={`flex items-center gap-2 ${
              mode === 'CoPilot' 
                ? 'border-green-500/50 text-green-400 hover:bg-green-500/10' 
                : 'border-blue-500/50 text-blue-400 hover:bg-blue-500/10'
            }`}
          >
            <Zap className="w-4 h-4" />
            {mode === 'CoPilot' ? 'Co-Pilot Mode' : 'Guidance Mode'}
          </Button>
        </div>

        {/* Mode Description */}
        <div className={`p-3 rounded-lg ${
          mode === 'CoPilot' 
            ? 'bg-green-900/20 border border-green-500/30' 
            : 'bg-blue-900/20 border border-blue-500/30'
        }`}>
          <p className="text-sm text-gray-300">
            {mode === 'CoPilot' 
              ? '🤖 AI will automatically apply low-risk, high-confidence recommendations. You can review and undo changes.'
              : '👁️ All recommendations require manual review before application. Full control over every change.'
            }
          </p>
        </div>

        {/* Status Summary */}
        <div className="flex items-center gap-4 mt-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-yellow-400 border-yellow-500/30">
              {statusCounts.pending} Pending
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-green-400 border-green-500/30">
              {statusCounts.applied} Applied
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-gray-400 border-gray-500/30">
              {statusCounts.dismissed} Dismissed
            </Badge>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="p-4 border-b border-gray-700 bg-gray-800/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="bg-gray-700 border border-gray-600 rounded px-3 py-1 text-sm text-white"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending Review</option>
                <option value="applied">Applied</option>
                <option value="dismissed">Dismissed</option>
              </select>
            </div>

            {/* Sort */}
            <div className="flex items-center gap-2">
              <SortAsc className="w-4 h-4 text-gray-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-gray-700 border border-gray-600 rounded px-3 py-1 text-sm text-white"
              >
                <option value="impact">Sort by Impact</option>
                <option value="confidence">Sort by Confidence</option>
                <option value="title">Sort by Title</option>
              </select>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.location.reload()}
            className="text-gray-400 hover:text-white"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Analysis
          </Button>
        </div>
      </div>

      {/* Recommendations List */}
      <div className="p-6">
        {filteredRecommendations.length === 0 ? (
          <div className="text-center py-8">
            <Shield className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <h4 className="text-lg font-semibold text-gray-400 mb-2">
              {filterStatus === 'all' 
                ? 'No recommendations yet' 
                : `No ${filterStatus} recommendations`
              }
            </h4>
            <p className="text-sm text-gray-500">
              {filterStatus === 'all' 
                ? 'Your story analysis will appear here once complete.'
                : 'Try adjusting your filters or refresh the analysis.'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
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
