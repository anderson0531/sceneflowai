import { useState, useEffect, useCallback } from 'react';
import { StoryRecommendation, ActionableMutation } from '@/types/story';
import { usePreferences } from '@/store/usePreferences';
import { storyAnalysisService, StoryAnalysisRequest } from '@/services/storyAnalysisService';

import { storyMutationService } from '@/services/storyMutationService';

export const useStoryAnalysis = (currentStoryData: any) => {
  const [recommendations, setRecommendations] = useState<StoryRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { interactionMode } = usePreferences();

  // The core automation logic for Co-Pilot mode
  const processRecommendations = useCallback(async (data: StoryRecommendation[]) => {
    if (interactionMode === 'CoPilot') {
      const updatedData = [...data];
      let autoAppliedCount = 0;

      // Use for...of instead of forEach for async operations
      for (const rec of updatedData) {
        // Criteria for auto-application: Low/Medium impact AND High confidence
        if (rec.status === 'pending_review' && rec.impact !== 'high' && rec.confidenceScore > 0.85) {
          try {
            const result = await storyMutationService.applyMutation(rec.proposedMutation);
            if (result.success) {
              rec.status = 'applied';
              rec.isAutoApplied = true;
              autoAppliedCount++;
            }
          } catch (error) {
            console.error("Failed to auto-apply mutation", error);
          }
        }
      }

      if (autoAppliedCount > 0) {
        // Notification is handled by the mutation service
        console.log(`SceneFlow AI automatically optimized ${autoAppliedCount} aspects of your story.`);
      }
      setRecommendations(updatedData);
    } else {
      // Guidance mode: just load the recommendations
      setRecommendations(data);
    }
  }, [interactionMode]);

  useEffect(() => {
    // Fetch analysis when story data changes
    const analyze = async () => {
      if (!currentStoryData) return;
      
      setIsLoading(true);
      try {
        const request: StoryAnalysisRequest = {
          storyData: currentStoryData,
          analysisType: 'comprehensive'
        };
        
        const response = await storyAnalysisService.analyzeStory(request);
        processRecommendations(response.recommendations);
      } catch (error) {
        console.error('Failed to fetch analysis:', error);
        // Set empty recommendations on error
        setRecommendations([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    analyze();
  }, [currentStoryData, processRecommendations]);

  // Function for manual application (Expert mode or non-automated Novice items)
  const manuallyApplyRecommendation = async (recId: string) => {
    const recommendation = recommendations.find(rec => rec.id === recId);
    if (!recommendation) return;

    try {
      const result = await storyMutationService.applyMutation(recommendation.proposedMutation);
      
      if (result.success) {
        setRecommendations(prev => prev.map(rec => 
          rec.id === recId 
            ? { ...rec, status: 'applied', isAutoApplied: false }
            : rec
        ));
      }
    } catch (error) {
      console.error('Failed to apply recommendation:', error);
    }
  };

  // Function to undo applied mutations
  const undoRecommendation = async (recId: string) => {
    const recommendation = recommendations.find(rec => rec.id === recId);
    if (!recommendation || recommendation.status !== 'applied') return;

    try {
      const result = await storyMutationService.undoLastMutation();
      
      if (result) {
        setRecommendations(prev => prev.map(rec => 
          rec.id === recId 
            ? { ...rec, status: 'pending_review', isAutoApplied: false }
            : rec
        ));
      }
    } catch (error) {
      console.error('Failed to undo recommendation:', error);
    }
  };

  // Function to dismiss recommendations
  const dismissRecommendation = (recId: string) => {
    setRecommendations(prev => prev.map(rec => 
      rec.id === recId 
        ? { ...rec, status: 'dismissed' }
        : rec
    ));
  };

  return { 
    recommendations, 
    isLoading,
    manuallyApplyRecommendation, 
    undoRecommendation,
    dismissRecommendation,
    interactionMode
  };
};
