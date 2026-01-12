'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/Input'
import { 
  BookOpen, 
  Edit3, 
  Save, 
  Plus, 
  Trash2, 
  Eye, 
  Download, 
  Upload,
  CheckCircle,
  AlertCircle,
  Users,
  Palette,
  Music,
  Target,
  FileText,
  Sparkles
} from 'lucide-react'
import type { 
  ProjectBible, 
  Character, 
  Location, 
  Prop, 
  VisualStyle, 
  Theme,
  ConsistencyRule,
  STORY_STRUCTURE_TEMPLATES
} from '@/types/enhanced-project'

interface ProjectBibleEditorProps {
  projectId: string
  projectTitle: string
  initialBible?: ProjectBible
  onSave: (bible: ProjectBible) => void
  onExport?: (bible: ProjectBible) => void
  onImport?: (bibleData: string) => void
}

export function ProjectBibleEditor({
  projectId,
  projectTitle,
  initialBible,
  onSave,
  onExport,
  onImport
}: ProjectBibleEditorProps) {
  const [bible, setBible] = useState<ProjectBible>(initialBible || {
    id: '',
    projectId,
    title: projectTitle,
    version: '1.0.0',
    lastUpdated: new Date(),
    logline: '',
    synopsis: '',
    tagline: '',
    storyStructure: 'three-act',
    acts: [],
    currentChapter: '',
    characters: [],
    characterArcs: [],
    locations: [],
    props: [],
    visualStyles: [],
    themes: [],
    visualGuidelines: {
      colorPalette: [],
      lightingPrinciples: [],
      compositionRules: [],
      visualEffects: [],
      referenceMaterials: [],
      styleGuide: ''
    },
    audioGuidelines: {
      musicPrinciples: [],
      voiceGuidelines: [],
      soundEffectStyle: [],
      audioTransitions: [],
      referenceAudio: []
    },
    toneGuidelines: {
      overallTone: '',
      emotionalRange: [],
      humorStyle: '',
      dramaticMoments: '',
      pacingGuidelines: '',
      audienceResponse: ''
    },
    productionNotes: [],
    references: [],
    inspirations: [],
    consistencyRules: [],
    namingConventions: [],
    changelog: [],
    contributors: []
  })

  const [activeTab, setActiveTab] = useState<'overview' | 'characters' | 'world' | 'guidelines' | 'consistency'>('overview')
  const [editingField, setEditingField] = useState<string | null>(null)
  const [newItem, setNewItem] = useState<any>(null)

  const handleSave = () => {
    const updatedBible = { ...bible, lastUpdated: new Date() }
    setBible(updatedBible)
    onSave(updatedBible)
  }

  const addCharacter = () => {
    const character: Character = {
      id: `char_${Date.now()}`,
      name: '',
      role: 'supporting',
      description: '',
      personality: [],
      appearance: '',
      motivations: [],
      arc: { start: '', development: [], end: '', growth: '' },
      relationships: [],
      dialogueStyle: '',
      visualReferences: [],
      aiGenerated: false
    }
    setBible(prev => ({ ...prev, characters: [...prev.characters, character] }))
  }

  const addLocation = () => {
    const location: Location = {
      id: `loc_${Date.now()}`,
      name: '',
      type: 'interior',
      description: '',
      visualStyle: '',
      mood: '',
      lighting: '',
      props: [],
      accessibility: [],
      restrictions: [],
      visualReferences: [],
      aiGenerated: false
    }
    setBible(prev => ({ ...prev, locations: [...prev.locations, location] }))
  }

  const addConsistencyRule = () => {
    const rule: ConsistencyRule = {
      id: `rule_${Date.now()}`,
      category: 'visual',
      rule: '',
      reason: '',
      examples: [],
      exceptions: [],
      enforcement: 'guideline'
    }
    setBible(prev => ({ ...prev, consistencyRules: [...prev.consistencyRules, rule] }))
  }

  const updateCharacter = (characterId: string, updates: Partial<Character>) => {
    setBible(prev => ({
      ...prev,
      characters: prev.characters.map(char => 
        char.id === characterId ? { ...char, ...updates } : char
      )
    }))
  }

  const updateLocation = (locationId: string, updates: Partial<Location>) => {
    setBible(prev => ({
      ...prev,
      locations: prev.locations.map(loc => 
        loc.id === locationId ? { ...loc, ...updates } : loc
      )
    }))
  }

  const updateConsistencyRule = (ruleId: string, updates: Partial<ConsistencyRule>) => {
    setBible(prev => ({
      ...prev,
      consistencyRules: prev.consistencyRules.map(rule => 
        rule.id === ruleId ? { ...rule, ...updates } : rule
      )
    }))
  }

  const deleteCharacter = (characterId: string) => {
    setBible(prev => ({
      ...prev,
      characters: prev.characters.filter(char => char.id !== characterId)
    }))
  }

  const deleteLocation = (locationId: string) => {
    setBible(prev => ({
      ...prev,
      locations: prev.locations.filter(loc => loc.id !== locationId)
    }))
  }

  const deleteConsistencyRule = (ruleId: string) => {
    setBible(prev => ({
      ...prev,
      consistencyRules: prev.consistencyRules.filter(rule => rule.id !== ruleId)
    }))
  }

  const handleExport = () => {
    if (onExport) {
      onExport(bible)
    } else {
      const dataStr = JSON.stringify(bible, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(dataBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${bible.title.replace(/\s+/g, '_')}_ProjectBible.json`
      link.click()
      URL.revokeObjectURL(url)
    }
  }

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && onImport) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target?.result as string
        onImport(content)
      }
      reader.readAsText(file)
    }
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BookOpen },
    { id: 'characters', label: 'Characters', icon: Users },
    { id: 'world', label: 'World Building', icon: Palette },
    { id: 'guidelines', label: 'Guidelines', icon: Target },
    { id: 'consistency', label: 'Consistency', icon: CheckCircle }
  ]

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Project Bible</h1>
            <p className="text-gray-600">Maintain consistency across your video projects</p>
          </div>
        </div>
        
        <div className="flex space-x-3">
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <label className="cursor-pointer">
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
            <Button variant="outline">
              <Upload className="w-4 h-4 mr-2" />
              Import
            </Button>
          </label>
          <Button onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" />
            Save Bible
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4 inline mr-2" />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Content */}
      <div className="space-y-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Core Story Elements</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Logline</label>
                  <textarea
                    value={bible.logline}
                    onChange={(e) => setBible(prev => ({ ...prev, logline: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg resize-none"
                    rows={3}
                    placeholder="One-sentence summary of your story..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Synopsis</label>
                  <textarea
                    value={bible.synopsis}
                    onChange={(e) => setBible(prev => ({ ...prev, synopsis: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg resize-none"
                    rows={4}
                    placeholder="Brief summary of your story..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tagline</label>
                  <Input
                    value={bible.tagline}
                    onChange={(e) => setBible(prev => ({ ...prev, tagline: e.target.value }))}
                    placeholder="Catchy one-liner for marketing..."
                  />
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Story Structure</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Structure Type</label>
                  <select
                    value={bible.storyStructure}
                    onChange={(e) => setBible(prev => ({ ...prev, storyStructure: e.target.value as any }))}
                    className="w-full p-3 border border-gray-300 rounded-lg"
                  >
                    <option value="linear">Linear</option>
                    <option value="three-act">Three-Act Structure</option>
                    <option value="hero-journey">Hero's Journey</option>
                    <option value="save-the-cat">Save the Cat</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Current Chapter</label>
                  <Input
                    value={bible.currentChapter}
                    onChange={(e) => setBible(prev => ({ ...prev, currentChapter: e.target.value }))}
                    placeholder="Current chapter being worked on..."
                  />
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Characters Tab */}
        {activeTab === 'characters' && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Characters</h3>
              <Button onClick={addCharacter}>
                <Plus className="w-4 h-4 mr-2" />
                Add Character
              </Button>
            </div>
            
            <div className="space-y-4">
              {bible.characters.map((character, index) => (
                <div key={character.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <Input
                      value={character.name}
                      onChange={(e) => updateCharacter(character.id, { name: e.target.value })}
                      placeholder="Character name"
                      className="text-lg font-semibold border-none p-0"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteCharacter(character.id)}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                      <select
                        value={character.role}
                        onChange={(e) => updateCharacter(character.id, { role: e.target.value as any })}
                        className="w-full p-2 border border-gray-300 rounded"
                      >
                        <option value="protagonist">Protagonist</option>
                        <option value="antagonist">Antagonist</option>
                        <option value="supporting">Supporting</option>
                        <option value="background">Background</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                      <textarea
                        value={character.description}
                        onChange={(e) => updateCharacter(character.id, { description: e.target.value })}
                        className="w-full p-2 border border-gray-300 rounded resize-none"
                        rows={2}
                        placeholder="Brief character description..."
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* World Building Tab */}
        {activeTab === 'world' && (
          <div className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold">Locations</h3>
                <Button onClick={addLocation}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Location
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {bible.locations.map((location) => (
                  <div key={location.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <Input
                        value={location.name}
                        onChange={(e) => updateLocation(location.id, { name: e.target.value })}
                        placeholder="Location name"
                        className="font-semibold border-none p-0"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteLocation(location.id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                    
                    <div className="space-y-2">
                      <select
                        value={location.type}
                        onChange={(e) => updateLocation(location.id, { type: e.target.value as any })}
                        className="w-full p-2 border border-gray-300 rounded text-sm"
                      >
                        <option value="interior">Interior</option>
                        <option value="exterior">Exterior</option>
                        <option value="virtual">Virtual</option>
                        <option value="hybrid">Hybrid</option>
                      </select>
                      
                      <textarea
                        value={location.description}
                        onChange={(e) => updateLocation(location.id, { description: e.target.value })}
                        className="w-full p-2 border border-gray-300 rounded resize-none text-sm"
                        rows={2}
                        placeholder="Location description..."
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* Guidelines Tab */}
        {activeTab === 'guidelines' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Visual Guidelines</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Color Palette</label>
                  <Input
                    value={bible.visualGuidelines.colorPalette.join(', ')}
                    onChange={(e) => setBible(prev => ({
                      ...prev,
                      visualGuidelines: {
                        ...prev.visualGuidelines,
                        colorPalette: e.target.value.split(',').map(c => c.trim()).filter(c => c)
                      }
                    }))}
                    placeholder="Primary, secondary, accent colors..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Lighting Principles</label>
                  <textarea
                    value={bible.visualGuidelines.lightingPrinciples.join('\n')}
                    onChange={(e) => setBible(prev => ({
                      ...prev,
                      visualGuidelines: {
                        ...prev.visualGuidelines,
                        lightingPrinciples: e.target.value.split('\n').filter(l => l.trim())
                      }
                    }))}
                    className="w-full p-3 border border-gray-300 rounded-lg resize-none"
                    rows={3}
                    placeholder="Key lighting principles..."
                  />
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Tone Guidelines</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Overall Tone</label>
                  <Input
                    value={bible.toneGuidelines.overallTone}
                    onChange={(e) => setBible(prev => ({
                      ...prev,
                      toneGuidelines: { ...prev.toneGuidelines, overallTone: e.target.value }
                    }))}
                    placeholder="e.g., Professional, Casual, Dramatic..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Emotional Range</label>
                  <Input
                    value={bible.toneGuidelines.emotionalRange.join(', ')}
                    onChange={(e) => setBible(prev => ({
                      ...prev,
                      toneGuidelines: {
                        ...prev.toneGuidelines,
                        emotionalRange: e.target.value.split(',').map(e => e.trim()).filter(e => e)
                      }
                    }))}
                    placeholder="Joy, tension, calm, excitement..."
                  />
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Consistency Tab */}
        {activeTab === 'consistency' && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Consistency Rules</h3>
              <Button onClick={addConsistencyRule}>
                <Plus className="w-4 h-4 mr-2" />
                Add Rule
              </Button>
            </div>
            
            <div className="space-y-4">
              {bible.consistencyRules.map((rule) => (
                <div key={rule.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <select
                      value={rule.category}
                      onChange={(e) => updateConsistencyRule(rule.id, { category: e.target.value as any })}
                      className="p-2 border border-gray-300 rounded text-sm"
                    >
                      <option value="visual">Visual</option>
                      <option value="narrative">Narrative</option>
                      <option value="character">Character</option>
                      <option value="technical">Technical</option>
                      <option value="brand">Brand</option>
                    </select>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteConsistencyRule(rule.id)}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                  
                  <div className="space-y-3">
                    <Input
                      value={rule.rule}
                      onChange={(e) => updateConsistencyRule(rule.id, { rule: e.target.value })}
                      placeholder="Consistency rule..."
                      className="font-medium"
                    />
                    
                    <textarea
                      value={rule.reason}
                      onChange={(e) => updateConsistencyRule(rule.id, { reason: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded resize-none text-sm"
                      rows={2}
                      placeholder="Why this rule exists..."
                    />
                    
                    <select
                      value={rule.enforcement}
                      onChange={(e) => updateConsistencyRule(rule.id, { enforcement: e.target.value as any })}
                      className="w-full p-2 border border-gray-300 rounded text-sm"
                    >
                      <option value="strict">Strict</option>
                      <option value="flexible">Flexible</option>
                      <option value="guideline">Guideline</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
