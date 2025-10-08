'use client';

import { useState, useMemo } from 'react';
import { Beat } from '@/store/useStore';
import { Button } from '@/components/ui/Button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, PlusCircle, MinusCircle, FilePenLine } from 'lucide-react';

interface AskFlowModalProps {
  isOpen: boolean;
  onClose: () => void;
  beatSheet: Beat[];
  onApply: (newBeatSheet: Beat[]) => void;
}

export function AskFlowModal({ isOpen, onClose, beatSheet, onApply }: AskFlowModalProps) {
  const [instruction, setInstruction] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<Beat[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const diff = useMemo(() => {
    if (!suggestion) return null;

    const originalMap = new Map(beatSheet.map(beat => [beat.id, beat]));
    const suggestionMap = new Map(suggestion.map(beat => [beat.id, beat]));
    const allIds = new Set([...originalMap.keys(), ...suggestionMap.keys()]);

    const changes = {
      added: [] as Beat[],
      removed: [] as Beat[],
      modified: [] as { old: Beat; new: Beat }[],
    };

    allIds.forEach(id => {
      const original = originalMap.get(id);
      const revised = suggestionMap.get(id);

      if (original && !revised) {
        changes.removed.push(original);
      } else if (!original && revised) {
        changes.added.push(revised);
      } else if (original && revised && (original.slugline !== revised.slugline || original.summary !== revised.summary)) {
        changes.modified.push({ old: original, new: revised });
      }
    });

    return changes;
  }, [suggestion, beatSheet]);

  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);
    setSuggestion(null);

    try {
      const prompt = `
        You are an expert screenwriter and story editor.
        The user has provided a scene outline (beat sheet) for their project.
        Their instruction for revision is: "${instruction}"

        Here is the current scene outline in JSON format:
        ${JSON.stringify(beatSheet, null, 2)}

        Please revise the entire scene outline based on the user's instruction.
        Your response must be a valid JSON object containing only the revised beat sheet.
        The JSON object should have a single key, "revisedBeatSheet", which is an array of scene objects.
        Each scene object in the array must have the following properties: "id", "slugline", and "summary".
        Do not add, remove, or change any properties. Do not include any other text, explanations, or apologies in your response.
      `;

      const response = await fetch('/api/cue/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => null);
        throw new Error((errJson && errJson.error) || 'Failed to get a response from the AI.');
      }

      const result = await response.json().catch(() => ({} as any));
      const innerResponse = typeof result.response === 'string' ? JSON.parse(result.response) : result.response;
      const revisedBeatSheet = innerResponse?.revisedBeatSheet;

      if (!revisedBeatSheet || !Array.isArray(revisedBeatSheet)) {
        throw new Error('The AI returned an invalid response format.');
      }

      setSuggestion(revisedBeatSheet);
    } catch (err) {
      if (err instanceof Error) {
        try {
          // Attempt to parse a JSON error response from the server
          const errorJson = JSON.parse(err.message);
          setError(errorJson.error || 'An unexpected error occurred.');
        } catch {
          // Fallback if the error message is not JSON
          setError(err.message);
        }
      } else {
        setError('An unknown error occurred.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = () => {
    if (suggestion) {
      onApply(suggestion);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] bg-sf-surface border-sf-border text-white">
        <DialogHeader>
          <DialogTitle className="text-xl">Ask Flow to Refine Outline</DialogTitle>
          <DialogDescription>
            Provide instructions for how Flow should revise the scene outline.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Textarea
            placeholder="e.g., Make the first act more exciting by adding a car chase."
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            className="bg-sf-surface-light border-gray-600"
            rows={3}
          />
          <Button onClick={handleGenerate} disabled={isLoading || !instruction} className="w-full bg-sf-primary-gradient">
            {isLoading ? 'Generating...' : 'Generate Suggestions'}
            <Sparkles className="w-4 h-4 ml-2" />
          </Button>

          {error && <div className="text-red-500 text-sm p-4 bg-red-900/20 rounded-md">{error}</div>}

          {/* Diff view */}
          {suggestion && diff && (
            <div className="mt-4 max-h-[40vh] overflow-y-auto p-4 bg-sf-surface-light rounded-md border border-sf-border space-y-4">
              <h4 className="font-semibold mb-2">Suggested Revisions:</h4>
              
              {diff.added.length > 0 && (
                <div>
                  <h5 className="text-sm font-semibold text-green-400 flex items-center mb-2"><PlusCircle className="w-4 h-4 mr-2" />Added Scenes</h5>
                  <div className="space-y-2">
                    {diff.added.map(beat => (
                      <div key={beat.id} className="p-2 bg-green-900/20 rounded-md text-xs">
                        <p className="font-semibold text-white">{beat.slugline}</p>
                        <p className="text-gray-300 mt-1">{beat.summary}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {diff.removed.length > 0 && (
                <div>
                  <h5 className="text-sm font-semibold text-red-400 flex items-center mb-2"><MinusCircle className="w-4 h-4 mr-2" />Removed Scenes</h5>
                  <div className="space-y-2">
                    {diff.removed.map(beat => (
                      <div key={beat.id} className="p-2 bg-red-900/20 rounded-md text-xs">
                        <p className="font-semibold text-white line-through">{beat.slugline}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {diff.modified.length > 0 && (
                <div>
                  <h5 className="text-sm font-semibold text-yellow-400 flex items-center mb-2"><FilePenLine className="w-4 h-4 mr-2" />Modified Scenes</h5>
                  <div className="space-y-2">
                    {diff.modified.map(change => (
                      <div key={change.new.id} className="p-2 bg-yellow-900/20 rounded-md text-xs">
                        <p className="font-semibold text-gray-400 line-through">{change.old.slugline}</p>
                        <p className="font-semibold text-white">{change.new.slugline}</p>
                        <p className="text-gray-400 mt-1 line-through">{change.old.summary}</p>
                        <p className="text-gray-300 mt-1">{change.new.summary}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleApply} disabled={!suggestion}>
            Apply Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
