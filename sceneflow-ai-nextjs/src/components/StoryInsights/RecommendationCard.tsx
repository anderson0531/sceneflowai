"use client";

import React from 'react';
import { StoryRecommendation } from '@/types/story';
import { usePreferences } from '@/store/usePreferences';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Zap,
  Undo2,
  Eye,
  MessageCircle,
  Wrench
} from 'lucide-react';

import { storyMutationService } from '@/services/storyMutationService';

// Utility functions using live services
const openReviewModal = (mutation: any) => {
  console.log('Opening review modal for:', mutation);
      // Modal opening logic
  // This would typically trigger a state change in the parent component
};

const undoMutation = async (mutation: any) => {
  try {
    await storyMutationService.undoLastMutation();
  } catch (error) {
    console.error('Failed to undo mutation:', error);
  }
};

const discussWithCue = (recommendation: StoryRecommendation) => {
  console.log('Discussing with Cue:', recommendation);
      // Cue integration
  // This would typically open the Cue sidebar with the recommendation context
};

interface Props {
  recommendation: StoryRecommendation;
  onApply: (id: string) => void;
  onUndo?: (id: string) => void;
  onDismiss?: (id: string) => void;
}

const RecommendationCard: React.FC<Props> = ({ 
  recommendation: rec, 
  onApply, 
  onUndo,
  onDismiss 
}) => {
  const { interactionMode } = usePreferences();

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'bg-red-600 text-white';
      case 'medium': return 'bg-yellow-600 text-white';
      case 'low': return 'bg-green-600 text-white';
      default: return 'bg-gray-600 text-white';
    }
  };

  const getStatusIcon = () => {
    if (rec.status === 'applied') {
      return <CheckCircle className="w-5 h-5 text-green-400" />;
    }
    if (rec.status === 'dismissed') {
      return <Clock className="w-5 h-5 text-gray-400" />;
    }
    return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 0.9) return 'text-green-400';
    if (score >= 0.7) return 'text-yellow-400';
    return 'text-red-400';
  };

  const renderActions = () => {
    if (rec.status === 'applied') {
      return (
        <>
          <Button 
            variant="secondary" 
            size="sm"
            onClick={() => openReviewModal(rec.proposedMutation)}
            className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg font-semibold shadow-lg"
          >
            <Eye className="w-4 h-4" />
            Review Changes
          </Button>
          {onUndo && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => onUndo(rec.id)}
              className="flex items-center gap-2.5 text-gray-300 hover:text-white hover:bg-gray-700/50 px-4 py-2.5 rounded-lg font-medium transition-all duration-200"
            >
              <Undo2 className="w-4 h-4" />
              Undo
            </Button>
          )}
        </>
      );
    }

    if (rec.status === 'dismissed') {
      return (
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => onDismiss?.(rec.id)}
          className="text-gray-400 hover:text-white hover:bg-gray-700/50 px-4 py-2.5 rounded-lg font-medium transition-all duration-200"
        >
          Restore
        </Button>
      );
    }

    if (interactionMode === 'Guidance') {
      // Expert Review - always show review option
      return (
        <>
          <Button 
            variant="secondary" 
            size="sm"
            onClick={() => openReviewModal(rec.proposedMutation)}
            className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg font-semibold shadow-lg"
          >
            <Eye className="w-4 h-4" />
            Review Changes
          </Button>
        </>
      );
    } else {
      // Co-Pilot Mode - pending review (High impact or low confidence)
      if (rec.impact === 'high') {
                return (
          <Button 
            variant="primary" 
            size="sm"
            onClick={() => discussWithCue(rec)}
            className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg font-semibold shadow-lg"
          >
            <MessageCircle className="w-4 h-4" />
            Start Guided Fix
          </Button>
        );
      }
      return (
        <Button 
          variant="primary" 
          size="sm"
          onClick={() => onApply(rec.id)}
          className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg font-semibold shadow-lg"
        >
          <Zap className="w-4 h-4" />
          Apply Now
        </Button>
        );
    }
  };

  return (
    <div className={`p-5 rounded-xl border-2 transition-all duration-300 hover:shadow-lg ${
      rec.status === 'applied' 
        ? 'bg-gradient-to-br from-gray-800/90 to-gray-700/80 border-green-500/50 shadow-lg shadow-green-500/20' 
        : rec.status === 'dismissed'
        ? 'bg-gray-800/60 border-gray-600/40 opacity-70'
        : 'bg-gradient-to-br from-green-900/30 to-emerald-900/20 border-green-500/50 hover:bg-green-900/40 hover:border-green-400/60 hover:shadow-lg hover:shadow-green-500/20'
    }`}>
      {/* Header with Title, Impact Badge, and Status Icon */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-4 flex-1">
          <div className="flex-shrink-0">
            {getStatusIcon()}
          </div>
          <h4 className="font-bold text-white text-lg leading-tight">{rec.title}</h4>
        </div>
        <Badge className={`${getImpactColor(rec.impact)} px-3 py-1.5 text-sm font-semibold shadow-lg`}>
          {rec.impact} impact
        </Badge>
      </div>

      {/* Description */}
      <p className="text-base text-gray-200 mb-4 leading-relaxed font-medium">{rec.description}</p>

      {/* Confidence Score and Auto-Applied Indicator */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400 font-medium">Confidence:</span>
          <span className={`text-lg font-bold ${getConfidenceColor(rec.confidenceScore)}`}>
            {Math.round(rec.confidenceScore * 100)}%
          </span>
        </div>
        
        {rec.isAutoApplied && (
          <div className="flex items-center gap-2 text-sm text-green-300 bg-green-900/40 px-3 py-2 rounded-lg border border-green-500/30 shadow-lg">
            <Zap className="w-4 h-4" />
            Auto-applied by AI
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        {/* Primary Action Buttons */}
        <div className="flex justify-between items-center">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => discussWithCue(rec)}
            className="text-gray-400 hover:text-white hover:bg-gray-700/50 text-sm font-medium px-3 py-2 rounded-lg transition-all duration-200"
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            Discuss with Cue
          </Button>
          
          <div className="flex gap-3">
            {renderActions()}
          </div>
        </div>
        
        {/* Secondary Action Button - Auto-Resolve for Guidance Mode */}
        {interactionMode === 'Guidance' && rec.status === 'pending_review' && (
          <div className="flex justify-end">
            <Button 
              variant="primary" 
              size="sm"
              onClick={() => onApply(rec.id)}
              className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg font-semibold shadow-lg w-full sm:w-auto"
            >
              <Wrench className="w-4 h-4" />
              Auto-Resolve
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecommendationCard;
