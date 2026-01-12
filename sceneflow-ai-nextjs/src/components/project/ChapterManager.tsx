'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/Input'
import { 
  Plus, 
  Edit3, 
  Trash2, 
  Move, 
  Eye, 
  EyeOff, 
  Clock, 
  Target,
  CheckCircle2,
  Circle,
  PlayCircle,
  PauseCircle
} from 'lucide-react'
import type { Chapter, Act, ProjectType } from '@/types/SceneFlow'

interface ChapterManagerProps {
  projectType: ProjectType
  acts: Act[]
  onActsChange: (acts: Act[]) => void
  currentChapter?: string
  onChapterSelect?: (chapterId: string) => void
}

export function ChapterManager({
  projectType,
  acts,
  onActsChange,
  currentChapter,
  onChapterSelect
}: ChapterManagerProps) {
  const [editingChapter, setEditingChapter] = useState<string | null>(null)
  const [editingAct, setEditingAct] = useState<string | null>(null)
  const [showAddChapter, setShowAddChapter] = useState<string | null>(null)
  const [showAddAct, setShowAddAct] = useState(false)

  // Only show for long projects
  if (projectType !== 'long') {
    return null
  }

  const addAct = () => {
    const newAct: Act = {
      id: `act-${Date.now()}`,
      number: acts.length + 1,
      title: `Act ${acts.length + 1}`,
      description: '',
      chapters: [],
      estimatedDuration: 0,
      purpose: acts.length === 0 ? 'Setup' : acts.length === 1 ? 'Development' : 'Resolution'
    }
    onActsChange([...acts, newAct])
  }

  const updateAct = (actId: string, updates: Partial<Act>) => {
    onActsChange(acts.map(act => 
      act.id === actId ? { ...act, ...updates } : act
    ))
  }

  const deleteAct = (actId: string) => {
    if (acts.length <= 1) return // Keep at least one act
    onActsChange(acts.filter(act => act.id !== actId))
  }

  const addChapter = (actId: string) => {
    const act = acts.find(a => a.id === actId)
    if (!act) return

    const newChapter: Chapter = {
      id: `chapter-${Date.now()}`,
      title: `Chapter ${act.chapters.length + 1}`,
      act: act.number,
      order: act.chapters.length + 1,
      description: '',
      estimatedDuration: 5, // Default 5 minutes
      status: 'planned',
      progress: {
        ideation: 0,
        storyboard: 0,
        direction: 0,
        video: 0
      },
      content: {},
      metadata: {}
    }

    updateAct(actId, {
      chapters: [...act.chapters, newChapter]
    })
    setShowAddChapter(null)
  }

  const updateChapter = (actId: string, chapterId: string, updates: Partial<Chapter>) => {
    const act = acts.find(a => a.id === actId)
    if (!act) return

    const updatedChapters = act.chapters.map(chapter =>
      chapter.id === chapterId ? { ...chapter, ...updates } : chapter
    )

    updateAct(actId, { chapters: updatedChapters })
  }

  const deleteChapter = (actId: string, chapterId: string) => {
    const act = acts.find(a => a.id === actId)
    if (!act) return

    updateAct(actId, {
      chapters: act.chapters.filter(chapter => chapter.id !== chapterId)
    })
  }

  const moveChapter = (fromActId: string, toActId: string, chapterId: string) => {
    const fromAct = acts.find(a => a.id === fromActId)
    const toAct = acts.find(a => a.id === toActId)
    if (!fromAct || !toAct) return

    const chapter = fromAct.chapters.find(c => c.id === chapterId)
    if (!chapter) return

    // Remove from source act
    updateAct(fromActId, {
      chapters: fromAct.chapters.filter(c => c.id !== chapterId)
    })

    // Add to target act
    const updatedChapter = { ...chapter, act: toAct.number }
    updateAct(toActId, {
      chapters: [...toAct.chapters, updatedChapter]
    })
  }

  const getStatusIcon = (status: Chapter['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />
      case 'in-progress':
        return <PlayCircle className="w-4 h-4 text-blue-500" />
      default:
        return <Circle className="w-4 h-4 text-sf-text-secondary" />
    }
  }

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'bg-green-500'
    if (progress >= 50) return 'bg-yellow-500'
    return 'bg-sf-primary'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-sf-text-primary">Chapter Management</h3>
        <Button onClick={addAct} size="sm" className="bg-sf-primary hover:shadow-sf-glow">
          <Plus className="w-4 h-4 mr-2" />
          Add Act
        </Button>
      </div>

      {/* Acts and Chapters */}
      <div className="space-y-6">
        {acts.map((act, actIndex) => (
          <Card key={act.id} className="p-6">
            {/* Act Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                {editingAct === act.id ? (
                  <Input
                    value={act.title}
                    onChange={(e) => updateAct(act.id, { title: e.target.value })}
                    className="w-32"
                    onBlur={() => setEditingAct(null)}
                    onKeyDown={(e) => e.key === 'Enter' && setEditingAct(null)}
                  />
                ) : (
                  <h4 className="text-lg font-semibold text-sf-text-primary">{act.title}</h4>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingAct(editingAct === act.id ? null : act.id)}
                >
                  <Edit3 className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-sf-text-secondary">{act.purpose}</span>
                {acts.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteAct(act.id)}
                    className="text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Act Description */}
            <div className="mb-4">
              <textarea
                value={act.description}
                onChange={(e) => updateAct(act.id, { description: e.target.value })}
                placeholder="Describe the purpose and goals of this act..."
                className="w-full p-3 border border-sf-border rounded-lg bg-sf-surface-light text-sf-text-primary placeholder-sf-text-secondary resize-none"
                rows={2}
              />
            </div>

            {/* Chapters */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h5 className="text-sm font-medium text-sf-text-primary">Chapters</h5>
                <Button
                  onClick={() => setShowAddChapter(showAddChapter === act.id ? null : act.id)}
                  size="sm"
                  variant="secondary"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Chapter
                </Button>
              </div>

              {/* Add Chapter Form */}
              {showAddChapter === act.id && (
                <Card className="p-4 bg-sf-surface-light border-dashed border-sf-border">
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      placeholder="Chapter title"
                      onChange={(e) => {
                        const newChapter: Chapter = {
                          id: `chapter-${Date.now()}`,
                          title: e.target.value,
                          act: act.number,
                          order: act.chapters.length + 1,
                          description: '',
                          estimatedDuration: 5,
                          status: 'planned',
                          progress: { ideation: 0, storyboard: 0, direction: 0, video: 0 },
                          content: {},
                          metadata: {}
                        }
                        updateAct(act.id, { chapters: [...act.chapters, newChapter] })
                        setShowAddChapter(null)
                      }}
                    />
                    <Input
                      type="number"
                      placeholder="Duration (min)"
                      onChange={(e) => {
                        // Handle duration input
                      }}
                    />
                  </div>
                </Card>
              )}

              {/* Chapter List */}
              {act.chapters.map((chapter, chapterIndex) => (
                <Card
                  key={chapter.id}
                  className={`p-4 transition-all duration-200 ${
                    currentChapter === chapter.id ? 'ring-2 ring-sf-primary' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 flex-1">
                      {getStatusIcon(chapter.status)}
                      
                      <div className="flex-1 min-w-0">
                        {editingChapter === chapter.id ? (
                          <Input
                            value={chapter.title}
                            onChange={(e) => updateChapter(act.id, chapter.id, { title: e.target.value })}
                            onBlur={() => setEditingChapter(null)}
                            onKeyDown={(e) => e.key === 'Enter' && setEditingChapter(null)}
                          />
                        ) : (
                          <h6 className="text-sm font-medium text-sf-text-primary truncate">
                            {chapter.title}
                          </h6>
                        )}
                        
                        <div className="flex items-center space-x-4 mt-1">
                          <span className="text-xs text-sf-text-secondary flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {chapter.estimatedDuration}m
                          </span>
                          <span className="text-xs text-sf-text-secondary">
                            {chapter.progress.ideation + chapter.progress.storyboard + chapter.progress.direction + chapter.progress.video}% complete
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingChapter(editingChapter === chapter.id ? null : chapter.id)}
                      >
                        <Edit3 className="w-4 h-4" />
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onChapterSelect?.(chapter.id)}
                        className={currentChapter === chapter.id ? 'text-sf-primary' : ''}
                      >
                        {currentChapter === chapter.id ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteChapter(act.id, chapter.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Progress Bars */}
                  <div className="mt-3 space-y-2">
                    {['ideation', 'storyboard', 'direction', 'video'].map((step) => (
                      <div key={step} className="flex items-center space-x-2">
                        <span className="text-xs text-sf-text-secondary w-16 capitalize">{step}</span>
                        <div className="flex-1 bg-sf-surface-light rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full transition-all duration-300 ${getProgressColor(chapter.progress[step as keyof typeof chapter.progress])}`}
                            style={{ width: `${chapter.progress[step as keyof typeof chapter.progress]}%` }}
                          />
                        </div>
                        <span className="text-xs text-sf-text-secondary w-8">{chapter.progress[step as keyof typeof chapter.progress]}%</span>
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          </Card>
        ))}
      </div>

      {/* Project Overview */}
      {acts.length > 0 && (
        <Card className="p-6 bg-sf-surface-light">
          <h4 className="text-lg font-semibold text-sf-text-primary mb-4">Project Overview</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-sf-primary">{acts.length}</div>
              <div className="text-xs text-sf-text-secondary">Acts</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-sf-accent">
                {acts.reduce((total, act) => total + act.chapters.length, 0)}
              </div>
              <div className="text-xs text-sf-text-secondary">Chapters</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-sf-primary">
                {acts.reduce((total, act) => 
                  total + act.chapters.reduce((sum, chapter) => sum + chapter.estimatedDuration, 0), 0
                )}m
              </div>
              <div className="text-xs text-sf-text-secondary">Total Runtime</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-sf-accent">
                {Math.round(
                  acts.reduce((total, act) => 
                    total + act.chapters.reduce((sum, chapter) => 
                      sum + (chapter.progress.ideation + chapter.progress.storyboard + chapter.progress.direction + chapter.progress.video) / 4, 0
                    ), 0
                  ) / Math.max(acts.reduce((total, act) => total + act.chapters.length, 0), 1)
                )}%
              </div>
              <div className="text-xs text-sf-text-secondary">Avg Progress</div>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
