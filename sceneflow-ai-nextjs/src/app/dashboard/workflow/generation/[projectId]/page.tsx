'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';

/**
 * Dynamic route handler for /dashboard/workflow/generation/[projectId]
 * Loads the project and redirects to the static generation page
 */
export default function GenerationProjectPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;
  const { projects, setCurrentProject } = useStore();

  useEffect(() => {
    if (projectId && projects.length > 0) {
      const project = projects.find(p => p.id === projectId);
      if (project) {
        setCurrentProject(project);
      }
      // Redirect to the static generation page
      router.replace('/dashboard/workflow/generation');
    }
  }, [projectId, projects, setCurrentProject, router]);

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
    </div>
  );
}
