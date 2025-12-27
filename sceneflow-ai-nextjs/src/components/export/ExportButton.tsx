'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Download } from 'lucide-react'
import { ExportVideoModal } from './ExportVideoModal'
import { cn } from '@/lib/utils'

interface ExportButtonProps {
  projectId: string
  projectTitle?: string
  availableLanguages: string[]
  variant?: 'default' | 'compact' | 'icon'
  className?: string
}

/**
 * Export MP4 button with built-in modal
 * 
 * Use this component to add video export functionality anywhere in the app.
 * 
 * @example
 * <ExportButton 
 *   projectId={project.id}
 *   projectTitle={project.title}
 *   availableLanguages={['en', 'es', 'fr']}
 * />
 */
export function ExportButton({
  projectId,
  projectTitle = 'Untitled Project',
  availableLanguages,
  variant = 'default',
  className,
}: ExportButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  const isDisabled = availableLanguages.length === 0

  return (
    <>
      {variant === 'icon' ? (
        <button
          onClick={() => setIsModalOpen(true)}
          disabled={isDisabled}
          className={cn(
            'p-2 rounded-lg hover:bg-white/10 text-white transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center',
            isDisabled && 'opacity-50 cursor-not-allowed',
            className
          )}
          title={isDisabled ? 'Generate audio first to enable export' : 'Export as MP4'}
        >
          <Download className="w-5 h-5" />
        </button>
      ) : variant === 'compact' ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsModalOpen(true)}
          disabled={isDisabled}
          className={cn('gap-2', className)}
          title={isDisabled ? 'Generate audio first to enable export' : undefined}
        >
          <Download className="w-4 h-4" />
          Export
        </Button>
      ) : (
        <Button
          variant="outline"
          onClick={() => setIsModalOpen(true)}
          disabled={isDisabled}
          className={cn('gap-2', className)}
          title={isDisabled ? 'Generate audio first to enable export' : undefined}
        >
          <Download className="w-4 h-4" />
          Export MP4
        </Button>
      )}

      <ExportVideoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        projectId={projectId}
        projectTitle={projectTitle}
        availableLanguages={availableLanguages}
      />
    </>
  )
}
