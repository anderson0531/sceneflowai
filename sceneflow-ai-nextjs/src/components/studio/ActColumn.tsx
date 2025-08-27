'use client';

import { Act, Beat } from '@/types/productionGuide';
import { BeatCard } from './BeatCard';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';

interface ActColumnProps {
  act: Act;
  beats: Beat[];
}

export function ActColumn({ act, beats }: ActColumnProps) {
  const [isClient, setIsClient] = useState(false);
  const [dropProps, setDropProps] = useState<any>({});

  // Ensure component is mounted before rendering drag and drop
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Only load drag and drop functionality on client side
  useEffect(() => {
    if (isClient) {
      // Dynamically import useDroppable
      import('@dnd-kit/core').then(mod => {
        const { useDroppable } = mod;
        const { setNodeRef, isOver } = useDroppable({
          id: act,
          data: { type: 'ACT' },
        });

        setDropProps({
          ref: setNodeRef,
          isOver
        });
      });
    }
  }, [isClient, act]);

  // Don't render drop functionality until client-side and loaded
  if (!isClient || !dropProps.ref) {
    return (
      <div className={cn(
        "w-full lg:w-80 flex-shrink-0 bg-gray-900 p-3 sm:p-4 rounded-lg flex flex-col h-full transition-colors border-2 border-dashed border-gray-900"
      )}>
        <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-teal-400">{act} ({beats.length})</h3>
        <div className="flex-1 overflow-y-auto space-y-3 sm:space-y-4 pr-2">
          {beats.map(beat => (
            <BeatCard key={beat.id} beat={beat} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={dropProps.ref}
      className={cn(
        "w-full lg:w-80 flex-shrink-0 bg-gray-900 p-3 sm:p-4 rounded-lg flex flex-col h-full transition-colors border-2 border-dashed",
        dropProps.isOver ? "border-teal-500 bg-gray-800/50" : "border-gray-900"
      )}
    >
      <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-teal-400">{act} ({beats.length})</h3>
      <div className="flex-1 overflow-y-auto space-y-3 sm:space-y-4 pr-2">
        {beats.map(beat => (
          <BeatCard key={beat.id} beat={beat} />
        ))}
      </div>
    </div>
  );
}
