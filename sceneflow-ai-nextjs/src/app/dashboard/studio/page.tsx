'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, FolderOpen } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'

export default function StudioPage() {
  const router = useRouter()

  // Auto-redirect to projects after a short delay
  useEffect(() => {
    const timer = setTimeout(() => {
      router.push('/dashboard/projects')
    }, 3000)
    
    return () => clearTimeout(timer)
  }, [router])

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-8 max-w-md text-center">
        <FolderOpen className="w-16 h-16 mx-auto text-indigo-400 mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">
          Select a Project
        </h1>
        <p className="text-gray-400 mb-6">
          Studio requires a project to work with. Choose an existing project or create a new one.
        </p>
        
        <div className="flex flex-col gap-3">
          <Link href="/dashboard/projects">
            <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">
              Open My Projects
            </Button>
          </Link>
          <Link href="/dashboard/studio/new-project">
            <Button variant="outline" className="w-full border-gray-600 text-gray-300 hover:bg-gray-700">
              Create New Project
            </Button>
          </Link>
        </div>
        
        <div className="mt-6 flex items-center justify-center gap-2 text-sm text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Redirecting to projects...</span>
        </div>
      </div>
    </div>
  )
}
