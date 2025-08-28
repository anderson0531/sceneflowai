"use client";

import React from 'react';
import { ActionableMutation } from '@/types/story';
import { Button } from '@/components/ui/Button';
import { 
  X, 
  Check, 
  Clock, 
  FileText, 
  Users, 
  Merge,
  ArrowRight
} from 'lucide-react';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  mutation: ActionableMutation;
  onAccept?: () => void;
  showAcceptButton?: boolean;
}

const ReviewModal: React.FC<ReviewModalProps> = ({
  isOpen,
  onClose,
  mutation,
  onAccept,
  showAcceptButton = false
}) => {
  if (!isOpen) return null;

  const renderTextComparison = (oldValue: string, newValue: string) => (
    <div className="space-y-3">
      <div>
        <h4 className="text-sm font-semibold text-gray-400 mb-2">Current Text</h4>
        <div className="bg-gray-800 p-3 rounded border border-gray-700">
          <p className="text-gray-300 text-sm">{oldValue}</p>
        </div>
      </div>
      
      <div className="flex items-center justify-center">
        <ArrowRight className="w-5 h-5 text-gray-500" />
      </div>
      
      <div>
        <h4 className="text-sm font-semibold text-gray-400 mb-2">Proposed Text</h4>
        <div className="bg-green-900/20 p-3 rounded border border-green-500/30">
          <p className="text-green-300 text-sm">{newValue}</p>
        </div>
      </div>
    </div>
  );

  const renderDurationComparison = (oldDuration: number, newDuration: number) => (
    <div className="space-y-3">
      <div>
        <h4 className="text-sm font-semibold text-gray-400 mb-2">Current Duration</h4>
        <div className="bg-gray-800 p-3 rounded border border-gray-700 text-center">
          <span className="text-2xl font-bold text-gray-300">{oldDuration}%</span>
          <p className="text-xs text-gray-500 mt-1">of story length</p>
        </div>
      </div>
      
      <div className="flex items-center justify-center">
        <ArrowRight className="w-5 h-5 text-gray-500" />
      </div>
      
      <div>
        <h4 className="text-sm font-semibold text-gray-400 mb-2">Proposed Duration</h4>
        <div className="bg-green-900/20 p-3 rounded border border-green-500/30 text-center">
          <span className="text-2xl font-bold text-green-300">{newDuration}%</span>
          <p className="text-xs text-green-500 mt-1">of story length</p>
        </div>
      </div>
    </div>
  );

  const renderMergeComparison = (beatIds: string[], newDescription: string) => (
    <div className="space-y-3">
      <div>
        <h4 className="text-sm font-semibold text-gray-400 mb-2">Beats to Merge</h4>
        <div className="bg-gray-800 p-3 rounded border border-gray-700">
          <div className="space-y-2">
            {beatIds.map((id, index) => (
              <div key={id} className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Beat {index + 1}:</span>
                <span className="text-gray-300 text-sm font-mono">{id}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <div className="flex items-center justify-center">
        <ArrowRight className="w-5 h-5 text-gray-500" />
      </div>
      
      <div>
        <h4 className="text-sm font-semibold text-gray-400 mb-2">New Combined Beat</h4>
        <div className="bg-green-900/20 p-3 rounded border border-green-500/30">
          <p className="text-green-300 text-sm">{newDescription}</p>
        </div>
      </div>
    </div>
  );

  const renderMutationContent = () => {
    switch (mutation.type) {
      case 'UPDATE_TREATMENT_TEXT':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-blue-400">
              <FileText className="w-5 h-5" />
              <span className="font-semibold">Treatment Text Update</span>
            </div>
            <p className="text-sm text-gray-300">
              Updating the <span className="font-semibold text-white">{mutation.field}</span> section of your treatment.
            </p>
            {renderTextComparison(mutation.oldValue, mutation.newValue)}
          </div>
        );

      case 'ADJUST_BEAT_DURATION':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-yellow-400">
              <Clock className="w-5 h-5" />
              <span className="font-semibold">Beat Duration Adjustment</span>
            </div>
            <p className="text-sm text-gray-300">
              Adjusting the duration of beat <span className="font-semibold text-white">{mutation.beatId}</span> for better pacing.
            </p>
            {renderDurationComparison(mutation.oldDuration, mutation.newDuration)}
          </div>
        );

      case 'UPDATE_CHARACTER_MOTIVATION':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-purple-400">
              <Users className="w-5 h-5" />
              <span className="font-semibold">Character Motivation Update</span>
            </div>
            <p className="text-sm text-gray-300">
              Enhancing the motivation for character <span className="font-semibold text-white">{mutation.characterId}</span>.
            </p>
            {renderTextComparison(mutation.oldValue, mutation.newValue)}
          </div>
        );

      case 'MERGE_BEATS':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-orange-400">
              <Merge className="w-5 h-5" />
              <span className="font-semibold">Beat Merging</span>
            </div>
            <p className="text-sm text-gray-300">
              Combining {mutation.beatIds.length} beats into a single, more focused beat.
            </p>
            {renderMergeComparison(mutation.beatIds, mutation.newBeatDescription)}
          </div>
        );

      default:
        return (
          <div className="text-center text-gray-400">
            <p>Unknown mutation type</p>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg border border-gray-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">Review Changes</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6">
          {renderMutationContent()}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-700">
          <Button
            variant="ghost"
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            Cancel
          </Button>
          
          {showAcceptButton && onAccept && (
            <Button
              variant="primary"
              onClick={onAccept}
              className="flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              Accept Changes
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReviewModal;
