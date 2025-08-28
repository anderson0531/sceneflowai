import { ActionableMutation } from '@/types/story';

export interface MutationHistoryItem {
  id: string;
  mutation: ActionableMutation;
  timestamp: Date;
  applied: boolean;
}

export interface MutationResult {
  success: boolean;
  message: string;
  oldValue?: any;
  newValue?: any;
}

class StoryMutationService {
  private mutationHistory: MutationHistoryItem[] = [];
  private undoStack: MutationHistoryItem[] = [];
  private redoStack: MutationHistoryItem[] = [];

  async applyMutation(mutation: ActionableMutation): Promise<MutationResult> {
    try {
      const historyItem: MutationHistoryItem = {
        id: `mutation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        mutation,
        timestamp: new Date(),
        applied: true
      };

      // Apply the mutation based on type
      const result = await this.executeMutation(mutation);
      
      if (result.success) {
        // Add to history
        this.mutationHistory.push(historyItem);
        this.undoStack.push(historyItem);
        // Clear redo stack when new mutation is applied
        this.redoStack = [];
        
        // Notify user
        this.notifyUser(`Successfully applied: ${this.getMutationDescription(mutation)}`);
      }

      return result;
    } catch (error) {
      console.error('Failed to apply mutation:', error);
      return {
        success: false,
        message: `Failed to apply mutation: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async undoLastMutation(): Promise<MutationResult | null> {
    if (this.undoStack.length === 0) {
      return null;
    }

    const lastMutation = this.undoStack.pop()!;
    
    try {
      // Create reverse mutation
      const reverseMutation = this.createReverseMutation(lastMutation.mutation);
      
      // Apply reverse mutation
      const result = await this.executeMutation(reverseMutation);
      
      if (result.success) {
        // Move to redo stack
        this.redoStack.push(lastMutation);
        // Mark as not applied in history
        lastMutation.applied = false;
        
        this.notifyUser(`Undone: ${this.getMutationDescription(lastMutation.mutation)}`);
      }

      return result;
    } catch (error) {
      console.error('Failed to undo mutation:', error);
      // Put back on undo stack
      this.undoStack.push(lastMutation);
      return {
        success: false,
        message: `Failed to undo mutation: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async redoLastMutation(): Promise<MutationResult | null> {
    if (this.redoStack.length === 0) {
      return null;
    }

    const mutationToRedo = this.redoStack.pop()!;
    
    try {
      // Re-apply the original mutation
      const result = await this.executeMutation(mutationToRedo.mutation);
      
      if (result.success) {
        // Move back to undo stack
        this.undoStack.push(mutationToRedo);
        // Mark as applied again
        mutationToRedo.applied = true;
        
        this.notifyUser(`Redone: ${this.getMutationDescription(mutationToRedo.mutation)}`);
      }

      return result;
    } catch (error) {
      console.error('Failed to redo mutation:', error);
      // Put back on redo stack
      this.redoStack.push(mutationToRedo);
      return {
        success: false,
        message: `Failed to redo mutation: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async executeMutation(mutation: ActionableMutation): Promise<MutationResult> {
    switch (mutation.type) {
      case 'UPDATE_TREATMENT_TEXT':
        return await this.updateTreatmentText(mutation);
      
      case 'ADJUST_BEAT_DURATION':
        return await this.adjustBeatDuration(mutation);
      
      case 'UPDATE_CHARACTER_MOTIVATION':
        return await this.updateCharacterMotivation(mutation);
      
      case 'MERGE_BEATS':
        return await this.mergeBeats(mutation);
      
      default:
        throw new Error(`Unknown mutation type: ${(mutation as any).type}`);
    }
  }

  private async updateTreatmentText(mutation: Extract<ActionableMutation, { type: 'UPDATE_TREATMENT_TEXT' }>): Promise<MutationResult> {
    try {
      // Here you would integrate with your actual story data store
      // For now, we'll simulate the update
      console.log('Updating treatment text:', {
        field: mutation.field,
        oldValue: mutation.oldValue,
        newValue: mutation.newValue
      });

      // TODO: Integrate with useGuideStore or your actual data store
      // await updateTreatmentField(mutation.field, mutation.newValue);

      return {
        success: true,
        message: `Updated ${mutation.field} in treatment`,
        oldValue: mutation.oldValue,
        newValue: mutation.newValue
      };
    } catch (error) {
      throw new Error(`Failed to update treatment text: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async adjustBeatDuration(mutation: Extract<ActionableMutation, { type: 'ADJUST_BEAT_DURATION' }>): Promise<MutationResult> {
    try {
      console.log('Adjusting beat duration:', {
        beatId: mutation.beatId,
        oldDuration: mutation.oldDuration,
        newDuration: mutation.newDuration
      });

      // TODO: Integrate with useGuideStore or your actual data store
      // await updateBeatDuration(mutation.beatId, mutation.newDuration);

      return {
        success: true,
        message: `Adjusted duration of beat ${mutation.beatId}`,
        oldValue: mutation.oldDuration,
        newValue: mutation.newDuration
      };
    } catch (error) {
      throw new Error(`Failed to adjust beat duration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async updateCharacterMotivation(mutation: Extract<ActionableMutation, { type: 'UPDATE_CHARACTER_MOTIVATION' }>): Promise<MutationResult> {
    try {
      console.log('Updating character motivation:', {
        characterId: mutation.characterId,
        oldValue: mutation.oldValue,
        newValue: mutation.newValue
      });

      // TODO: Integrate with useGuideStore or your actual data store
      // await updateCharacterMotivation(mutation.characterId, mutation.newValue);

      return {
        success: true,
        message: `Updated motivation for character ${mutation.characterId}`,
        oldValue: mutation.oldValue,
        newValue: mutation.newValue
      };
    } catch (error) {
      throw new Error(`Failed to update character motivation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async mergeBeats(mutation: Extract<ActionableMutation, { type: 'MERGE_BEATS' }>): Promise<MutationResult> {
    try {
      console.log('Merging beats:', {
        beatIds: mutation.beatIds,
        newDescription: mutation.newBeatDescription
      });

      // TODO: Integrate with useGuideStore or your actual data store
      // await mergeBeats(mutation.beatIds, mutation.newBeatDescription);

      return {
        success: true,
        message: `Merged ${mutation.beatIds.length} beats into one`,
        oldValue: mutation.beatIds,
        newValue: mutation.newBeatDescription
      };
    } catch (error) {
      throw new Error(`Failed to merge beats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private createReverseMutation(mutation: ActionableMutation): ActionableMutation {
    switch (mutation.type) {
      case 'UPDATE_TREATMENT_TEXT':
        return {
          type: 'UPDATE_TREATMENT_TEXT',
          field: mutation.field,
          newValue: mutation.oldValue,
          oldValue: mutation.newValue
        };
      
      case 'ADJUST_BEAT_DURATION':
        return {
          type: 'ADJUST_BEAT_DURATION',
          beatId: mutation.beatId,
          newDuration: mutation.oldDuration,
          oldDuration: mutation.newDuration
        };
      
      case 'UPDATE_CHARACTER_MOTIVATION':
        return {
          type: 'UPDATE_CHARACTER_MOTIVATION',
          characterId: mutation.characterId,
          newValue: mutation.oldValue,
          oldValue: mutation.newValue
        };
      
      case 'MERGE_BEATS':
        // For merging, we'd need to store the original beat data to reverse
        // This is a simplified version
        return {
          type: 'UPDATE_TREATMENT_TEXT',
          field: 'beat_structure',
          newValue: 'Original beat structure restored',
          oldValue: mutation.newBeatDescription
        };
      
      default:
        throw new Error(`Cannot create reverse mutation for type: ${(mutation as any).type}`);
    }
  }

  private getMutationDescription(mutation: ActionableMutation): string {
    switch (mutation.type) {
      case 'UPDATE_TREATMENT_TEXT':
        return `Updated ${mutation.field} in treatment`;
      case 'ADJUST_BEAT_DURATION':
        return `Adjusted duration of beat ${mutation.beatId}`;
      case 'UPDATE_CHARACTER_MOTIVATION':
        return `Updated motivation for character ${mutation.characterId}`;
      case 'MERGE_BEATS':
        return `Merged ${mutation.beatIds.length} beats`;
      default:
        return 'Applied story improvement';
    }
  }

  private notifyUser(message: string): void {
    // TODO: Integrate with your notification system
    console.log('User notification:', message);
    
    // You could use toast notifications, modals, etc.
    // Example: toast.success(message);
  }

  // Getters for external access
  getMutationHistory(): MutationHistoryItem[] {
    return [...this.mutationHistory];
  }

  getUndoStack(): MutationHistoryItem[] {
    return [...this.undoStack];
  }

  getRedoStack(): MutationHistoryItem[] {
    return [...this.redoStack];
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  clearHistory(): void {
    this.mutationHistory = [];
    this.undoStack = [];
    this.redoStack = [];
  }
}

export const storyMutationService = new StoryMutationService();
