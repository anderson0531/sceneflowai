import { useState, useEffect, useCallback } from 'react';
import { StoryRecommendation, ActionableMutation } from '@/types/story';
import { usePreferences } from '@/store/usePreferences';

// Mock services - replace with actual implementations
const mockFetchAIAnalysis = async (storyData: any): Promise<StoryRecommendation[]> => {
  // Simulate AI analysis delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return [
    {
      id: '1',
      title: 'Optimize Act I Pacing',
      description: 'Act I is currently 40% of your story. Consider consolidating setup to move into main conflict sooner.',
      impact: 'medium',
      confidenceScore: 0.92,
      status: 'pending_review',
      isAutoApplied: false,
      proposedMutation: {
        type: 'ADJUST_BEAT_DURATION',
        beatId: 'act1-setup',
        newDuration: 25,
        oldDuration: 40
      }
    },
    {
      id: '2',
      title: 'Enhance Character Motivation',
      description: 'Sarah\'s motivation could be clearer. Adding internal conflict will strengthen her arc.',
      impact: 'high',
      confidenceScore: 0.78,
      status: 'pending_review',
      isAutoApplied: false,
      proposedMutation: {
        type: 'UPDATE_CHARACTER_MOTIVATION',
        characterId: 'sarah',
        newValue: 'Sarah struggles with balancing career ambition and family loyalty, creating internal tension that drives her decisions.',
        oldValue: 'Sarah wants to succeed in her career.'
      }
    }
  ];
};

const mockApplyStoryMutation = async (mutation: ActionableMutation): Promise<void> => {
  // Simulate applying mutation
  await new Promise(resolve => setTimeout(resolve, 500));
  console.log('Applied mutation:', mutation);
};

const mockNotifyUser = (message: string): void => {
  // Replace with actual notification system
  console.log('User notification:', message);
  // Could use toast notifications, modals, etc.
};

export const useStoryAnalysis = (currentStoryData: any) => {
  const [recommendations, setRecommendations] = useState<StoryRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { interactionMode } = usePreferences();

  // The core automation logic for Co-Pilot mode
  const processRecommendations = useCallback((data: StoryRecommendation[]) => {
    if (interactionMode === 'CoPilot') {
      const updatedData = [...data];
      let autoAppliedCount = 0;

      updatedData.forEach(rec => {
        // Criteria for auto-application: Low/Medium impact AND High confidence
        if (rec.status === 'pending_review' && rec.impact !== 'high' && rec.confidenceScore > 0.85) {
          try {
            mockApplyStoryMutation(rec.proposedMutation);
            rec.status = 'applied';
            rec.isAutoApplied = true;
            autoAppliedCount++;
          } catch (error) {
            console.error("Failed to auto-apply mutation", error);
          }
        }
      });

      if (autoAppliedCount > 0) {
        mockNotifyUser(`SceneFlow AI automatically optimized ${autoAppliedCount} aspects of your story.`);
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
      setIsLoading(true);
      try {
        const data = await mockFetchAIAnalysis(currentStoryData);
        processRecommendations(data);
      } catch (error) {
        console.error('Failed to fetch analysis:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (currentStoryData) {
      analyze();
    }
  }, [currentStoryData, processRecommendations]);

  // Function for manual application (Expert mode or non-automated Novice items)
  const manuallyApplyRecommendation = async (recId: string) => {
    const recommendation = recommendations.find(rec => rec.id === recId);
    if (!recommendation) return;

    try {
      await mockApplyStoryMutation(recommendation.proposedMutation);
      
      setRecommendations(prev => prev.map(rec => 
        rec.id === recId 
          ? { ...rec, status: 'applied', isAutoApplied: false }
          : rec
      ));
    } catch (error) {
      console.error('Failed to apply recommendation:', error);
    }
  };

  // Function to undo applied mutations
  const undoRecommendation = async (recId: string) => {
    const recommendation = recommendations.find(rec => rec.id === recId);
    if (!recommendation || recommendation.status !== 'applied') return;

    try {
      // Implement undo logic here - would need to store previous state
      // For now, just mark as pending review
      setRecommendations(prev => prev.map(rec => 
        rec.id === recId 
          ? { ...rec, status: 'pending_review', isAutoApplied: false }
          : rec
      ));
      
      mockNotifyUser('Changes have been undone. Review the recommendation again if needed.');
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
