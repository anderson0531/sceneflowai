'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from '@/store/useStore'
import { ProjectBibleEditor } from '@/components/project/ProjectBibleEditor'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { 
  BookOpen, 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Upload,
  ArrowLeft,
  Eye,
  Edit3,
  Trash2,
  Sparkles
} from 'lucide-react'
import Link from 'next/link'

export default function ProjectBiblePage() {
  const router = useRouter()
  const { currentProject, projects } = useStore()
  const [selectedBible, setSelectedBible] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'active' | 'archived'>('all')

  // Mock project bibles - in production this would come from the ProjectBibleManager
  const [projectBibles] = useState([
    {
      id: 'bible_1',
      projectId: 'project_1',
      title: 'Brand Video Series Bible',
      version: '2.1.0',
      lastUpdated: new Date('2024-01-15'),
      storyStructure: 'three-act',
      characters: 5,
      locations: 3,
      consistencyRules: 8
    },
    {
      id: 'bible_2',
      projectId: 'project_2',
      title: 'Product Demo Bible',
      version: '1.0.0',
      lastUpdated: new Date('2024-01-10'),
      storyStructure: 'linear',
      characters: 2,
      locations: 2,
      consistencyRules: 4
    },
    {
      id: 'bible_3',
      projectId: 'project_3',
      title: 'Training Video Bible',
      version: '1.2.0',
      lastUpdated: new Date('2024-01-05'),
      storyStructure: 'hero-journey',
      characters: 3,
      locations: 4,
      consistencyRules: 6
    }
  ])

  const filteredBibles = projectBibles.filter(bible => {
    const matchesSearch = bible.title.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filterType === 'all' || 
      (filterType === 'active' && bible.lastUpdated > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) ||
      (filterType === 'archived' && bible.lastUpdated <= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
    
    return matchesSearch && matchesFilter
  })

  const handleCreateBible = () => {
    if (currentProject) {
      // Navigate to create new bible for current project
      router.push(`/dashboard/project-bible/create?projectId=${currentProject.id}`)
    } else {
      // Show project selection modal or navigate to project creation
      router.push('/studio/crispr-debate-001')
    }
  }

  const handleEditBible = (bibleId: string) => {
    setSelectedBible(bibleId)
  }

  const handleExportBible = (bibleId: string) => {
    const bible = projectBibles.find(b => b.id === bibleId)
    if (bible) {
      // Export logic would go here
      console.log('Exporting bible:', bible)
    }
  }

  const handleImportBible = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const bibleData = JSON.parse(e.target?.result as string)
          console.log('Imported bible:', bibleData)
          // Import logic would go here
        } catch (error) {
          console.error('Failed to parse bible file:', error)
        }
      }
      reader.readAsText(file)
    }
  }

  if (selectedBible) {
    const bible = projectBibles.find(b => b.id === selectedBible)
    if (!bible) return null

    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => setSelectedBible(null)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Bible Library
          </Button>
          <div className="text-right">
            <h1 className="text-2xl font-bold text-gray-900">{bible.title}</h1>
            <p className="text-gray-600">Version {bible.version} • Last updated {bible.lastUpdated.toLocaleDateString()}</p>
          </div>
        </div>
        
        <ProjectBibleEditor
          projectId={bible.projectId}
          projectTitle={bible.title}
          onSave={(updatedBible) => {
            console.log('Bible saved:', updatedBible)
            setSelectedBible(null)
          }}
        />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Project Bible Library</h1>
            <p className="text-gray-600">Maintain consistency across all your video projects</p>
          </div>
        </div>
        
        <div className="flex space-x-3">
          <label className="cursor-pointer">
            <input
              type="file"
              accept=".json"
              onChange={handleImportBible}
              className="hidden"
            />
            <Button variant="outline">
              <Upload className="w-4 h-4 mr-2" />
              Import Bible
            </Button>
          </label>
          <Button onClick={handleCreateBible}>
            <Plus className="w-4 h-4 mr-2" />
            Create New Bible
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center space-x-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search project bibles..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as any)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">All Bibles</option>
          <option value="active">Active (Last 30 days)</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {/* Bible Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredBibles.map((bible) => (
          <Card key={bible.id} className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleEditBible(bible.id)
                  }}
                >
                  <Edit3 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleExportBible(bible.id)
                  }}
                >
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{bible.title}</h3>
            <p className="text-sm text-gray-600 mb-4">Version {bible.version}</p>
            
            <div className="space-y-3 mb-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Structure:</span>
                <span className="font-medium capitalize">{bible.storyStructure.replace('-', ' ')}</span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Characters:</span>
                <span className="font-medium">{bible.characters}</span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Locations:</span>
                <span className="font-medium">{bible.locations}</span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Rules:</span>
                <span className="font-medium">{bible.consistencyRules}</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Last updated {bible.lastUpdated.toLocaleDateString()}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  handleEditBible(bible.id)
                }}
                className="text-blue-600 hover:text-blue-700"
              >
                <Eye className="w-3 h-3 mr-1" />
                View
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredBibles.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No project bibles found</h3>
          <p className="text-gray-600 mb-6">
            {searchTerm || filterType !== 'all' 
              ? 'Try adjusting your search or filters'
              : 'Get started by creating your first project bible'
            }
          </p>
          {!searchTerm && filterType === 'all' && (
            <Button onClick={handleCreateBible}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Bible
            </Button>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <Card className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Quick Actions</h3>
            <p className="text-gray-600">Jump-start your project consistency</p>
          </div>
          <div className="flex space-x-3">
            <Button variant="outline" onClick={() => router.push('/dashboard/templates')}>
              <Sparkles className="w-4 h-4 mr-2" />
              Browse Templates
            </Button>
            <Button onClick={handleCreateBible}>
              <Plus className="w-4 h-4 mr-2" />
              New Bible
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
