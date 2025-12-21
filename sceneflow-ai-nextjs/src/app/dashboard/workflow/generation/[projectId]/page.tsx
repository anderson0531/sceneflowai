'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';

/**
 * Dynamic route handler for /dashboard/workflow/generation/[projectId]
 * Loads the project from API and redirects to the static generation page
 */
export default function GenerationProjectPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;
  const { setCurrentProject } = useStore();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadProject = async () => {
      if (!projectId) {
        setError('No project ID provided');
        setIsLoading(false);
        return;
      }

      try {
        // Fetch project directly from API instead of relying on store state
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        const res = await fetch(`/api/projects?id=${projectId}`, {
          cache: 'no-store',
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        const json = await res.json().catch(() => null);
        
        if (json?.success && json?.project) {
          setCurrentProject(json.project);
          // Small delay to ensure Zustand state is committed before navigation
          await new Promise(resolve => setTimeout(resolve, 100));
          // Redirect to the static generation page
          router.replace('/dashboard/workflow/generation');
        } else {
          console.error('[GenerationProjectPage] Failed to load project:', json);
          setError('Project not found');
          setIsLoading(false);
        }
      } catch (err: any) {
        if (err.name === 'AbortError') {
          console.error('[GenerationProjectPage] Request timed out');
          setError('Request timed out. Please try again.');
        } else {
          console.error('[GenerationProjectPage] Error loading project:', err);
          setError('Failed to load project');
        }
        setIsLoading(false);
      }
    };

    loadProject();
  }, [projectId, setCurrentProject, router]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <p className="text-red-400">{error}</p>
        <button 
          onClick={() => router.push('/dashboard/projects')}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
        >
          Go to Projects
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
        <p className="text-gray-400 text-sm">Loading project...</p>
      </div>
    );
  }

  return null;
}
