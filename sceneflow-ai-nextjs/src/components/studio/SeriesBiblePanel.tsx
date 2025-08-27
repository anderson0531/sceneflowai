'use client';

import { useGuideStore } from '@/store/useGuideStore';
import { ProjectBibleManager } from '@/services/ProjectBibleManager';
import { Button } from '@/components/ui/Button';
import { BookOpenIcon, SparklesIcon } from 'lucide-react';
import { useState } from 'react';

export function SeriesBiblePanel() {
  const { guide } = useGuideStore();
  const [isCreating, setIsCreating] = useState(false);
  const bibleManager = ProjectBibleManager.getInstance();

  const handleCreateSeriesBible = () => {
    setIsCreating(true);
    // Create a project bible from current episode
    const bible = bibleManager.createProjectBible(
      guide.projectId,
      `${guide.title} - Series Bible`,
      'three-act'
    );
    
    // Populate with episode data
    bibleManager.updateProjectBible(bible.id, {
      logline: `Series based on ${guide.title}`,
      synopsis: guide.filmTreatment,
      characters: guide.characters
    });
    
    setIsCreating(false);
    console.log('Series Bible created:', bible);
  };

  return (
    <div className="bg-gray-800 p-6 rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <BookOpenIcon className="w-5 h-5 text-teal-400 mr-2" />
          <h2 className="text-lg font-semibold text-white">Series Bible</h2>
        </div>
        <Button 
          onClick={handleCreateSeriesBible}
          disabled={isCreating}
          className="bg-teal-600 hover:bg-teal-700 text-white"
        >
          <SparklesIcon className="w-4 h-4 mr-2" />
          {isCreating ? 'Creating...' : 'Create from Episode'}
        </Button>
      </div>
      <p className="text-sm text-gray-300">
        Create a Series Bible to maintain consistency across multiple episodes.
        This serves as your consistency bridge for future projects.
      </p>
    </div>
  );
}
