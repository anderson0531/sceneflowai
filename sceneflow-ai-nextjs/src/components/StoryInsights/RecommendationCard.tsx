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
  // TODO: Implement modal opening logic
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
  // TODO: Implement Cue integration
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
            className="flex items-center gap-2"
          >
            <Eye className="w-4 h-4" />
            Review Changes
          </Button>
          {onUndo && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => onUndo(rec.id)}
              className="flex items-center gap-2 text-gray-300 hover:text-white"
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
          className="text-gray-400 hover:text-white"
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
            className="flex items-center gap-2"
          >
            <Eye className="w-4 h-4" />
            Review Changes
          </Button>
          <Button 
            variant="primary" 
            size="sm"
            onClick={() => onApply(rec.id)}
            className="flex items-center gap-2"
          >
            <Wrench className="w-4 h-4" />
            Auto-Resolve
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
            className="flex items-center gap-2"
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
          className="flex items-center gap-2"
        >
          <Zap className="w-4 h-4" />
          Apply Now
        </Button>
      );
    }
  };

  return (
    <div className={`p-4 rounded-lg border transition-all duration-200 ${
      rec.status === 'applied' 
        ? 'bg-gray-800/80 border-green-500/30' 
        : rec.status === 'dismissed'
        ? 'bg-gray-800/50 border-gray-600/30 opacity-60'
        : 'bg-green-900/20 border-green-500/30 hover:bg-green-900/30'
    }`}>
      {/* Header with Title, Impact Badge, and Status Icon */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3 flex-1">
          {getStatusIcon()}
          <h4 className="font-bold text-white text-base leading-tight">{rec.title}</h4>
        </div>
        <Badge className={getImpactColor(rec.impact)}>
          {rec.impact} impact
        </Badge>
      </div>

      {/* Description */}
      <p className="text-sm text-gray-300 mb-3 leading-relaxed">{rec.description}</p>

      {/* Confidence Score and Auto-Applied Indicator */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">Confidence:</span>
          <span className={`text-sm font-semibold ${getConfidenceColor(rec.confidenceScore)}`}>
            {Math.round(rec.confidenceScore * 100)}%
          </span>
        </div>
        
        {rec.isAutoApplied && (
          <div className="flex items-center gap-2 text-xs text-green-400 bg-green-900/30 px-2 py-1 rounded">
            <Zap className="w-3 h-3" />
            Auto-applied by AI
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between items-center">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => discussWithCue(rec)}
          className="text-gray-400 hover:text-white text-xs"
        >
          <MessageCircle className="w-3 h-3 mr-1" />
          Discuss with Cue
        </Button>
        
        <div className="flex gap-2">
          {renderActions()}
        </div>
      </div>
    </div>
  );
};

export default RecommendationCard;
