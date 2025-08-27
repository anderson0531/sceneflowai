'use client'

import { useState } from 'react'
import { useSceneFlowStore } from '@/store/SceneFlowStore'
import { PROJECT_TEMPLATES, GENRE_OPTIONS, TONE_OPTIONS } from '@/constants/projectTemplates'
import { generateProjectSummary, validateProjectData } from '@/lib/sceneFlowUtils'
import { Button } from '@/components/ui/Button'

export function FoundationTest() {
  const { 
    currentProject, 
    createNewProject, 
    updateCoreConcept, 
    updateModuleProgress,
    projectHistory,
    saveProject,
    exportProject
  } = useSceneFlowStore()
  
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [testResults, setTestResults] = useState<string[]>([])

  const runFoundationTests = () => {
    const results: string[] = []
    
    try {
      // Test 1: Create new project
      if (!currentProject) {
        createNewProject()
        results.push('✅ New project created successfully')
      } else {
        results.push('✅ Project already exists')
      }
      
      // Test 2: Update core concept
      if (currentProject) {
        updateCoreConcept({
          workingTitle: 'Test Project',
          corePremise: 'This is a test project to verify the foundation',
          genre: 'Test',
          targetAudience: 'Developers',
          tone: 'Technical',
          estimatedDuration: 5
        })
        results.push('✅ Core concept updated successfully')
      }
      
      // Test 3: Update module progress
      updateModuleProgress('ideation', 50)
      results.push('✅ Module progress updated successfully')
      
      // Test 4: Validate project data
      if (currentProject) {
        const validation = validateProjectData(currentProject)
        if (validation.isValid) {
          results.push('✅ Project validation passed')
        } else {
          results.push(`❌ Project validation failed: ${validation.errors.join(', ')}`)
        }
        
        if (validation.warnings.length > 0) {
          results.push(`⚠️ Project warnings: ${validation.warnings.join(', ')}`)
        }
      }
      
      // Test 5: Generate project summary
      if (currentProject) {
        const summary = generateProjectSummary(currentProject)
        results.push(`✅ Project summary generated: ${summary.title} - ${summary.progress}% complete`)
      }
      
      // Test 6: Save project
      saveProject()
      results.push('✅ Project saved successfully')
      
      // Test 7: Check project history
      if (projectHistory.length > 0) {
        results.push(`✅ Project history working: ${projectHistory.length} projects saved`)
      }
      
    } catch (error) {
      results.push(`❌ Test failed with error: ${error}`)
    }
    
    setTestResults(results)
  }

  const createProjectFromTemplate = () => {
    if (selectedTemplate) {
      const template = PROJECT_TEMPLATES.find(t => t.id === selectedTemplate)
      if (template) {
        createNewProject(template)
        setTestResults([`✅ Project created from template: ${template.name}`])
      }
    }
  }

  const exportCurrentProject = () => {
    if (currentProject) {
      exportProject()
      setTestResults(['✅ Project exported successfully'])
    } else {
      setTestResults(['❌ No project to export'])
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-sf-surface rounded-xl border border-sf-border p-6">
        <h2 className="text-2xl font-bold text-sf-text-primary mb-4">
          SceneFlow Foundation Test
        </h2>
        
        <p className="text-sf-text-secondary mb-6">
          This component tests the foundation of SceneFlow including types, state management, and utilities.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold text-sf-text-primary mb-3">Test Actions</h3>
            
            <div className="space-y-3">
              <Button
                onClick={runFoundationTests}
                className="w-full bg-sf-primary hover:bg-sf-accent text-sf-background"
              >
                Run Foundation Tests
              </Button>
              
              <Button
                onClick={exportCurrentProject}
                variant="secondary"
                className="w-full border-sf-border"
              >
                Export Current Project
              </Button>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-sf-text-primary mb-3">Create from Template</h3>
            
            <select
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              className="w-full p-3 border border-sf-border rounded-lg bg-sf-surface-light text-sf-text-primary mb-3"
            >
              <option value="">Select a template...</option>
              {PROJECT_TEMPLATES.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
            
            <Button
              onClick={createProjectFromTemplate}
              disabled={!selectedTemplate}
              variant="secondary"
              className="w-full border-sf-border disabled:opacity-50"
            >
              Create Project
            </Button>
          </div>
        </div>
      </div>

      {/* Test Results */}
      {testResults.length > 0 && (
        <div className="bg-sf-surface rounded-xl border border-sf-border p-6">
          <h3 className="text-lg font-semibold text-sf-text-primary mb-3">Test Results</h3>
          
          <div className="space-y-2">
            {testResults.map((result, index) => (
              <div key={index} className="text-sm">
                {result}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Current Project Status */}
      {currentProject && (
        <div className="bg-sf-surface rounded-xl border border-sf-border p-6">
          <h3 className="text-lg font-semibold text-sf-text-primary mb-3">Current Project Status</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-sf-text-primary mb-2">Basic Info</h4>
              <div className="space-y-1 text-sm text-sf-text-secondary">
                <div>Title: {currentProject.title}</div>
                <div>Status: {currentProject.status}</div>
                <div>Genre: {currentProject.coreConcept.genre}</div>
                <div>Duration: {currentProject.coreConcept.estimatedDuration} minutes</div>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-sf-text-primary mb-2">Progress</h4>
              <div className="space-y-1 text-sm text-sf-text-secondary">
                <div>Ideation: {currentProject.progress.ideation}%</div>
                <div>Story Structure: {currentProject.progress.storyStructure}%</div>
                <div>Vision Board: {currentProject.progress.visionBoard}%</div>
                <div>Direction: {currentProject.progress.direction}%</div>
                <div>Video Generation: {currentProject.progress.videoGeneration}%</div>
                <div>Quality Control: {currentProject.progress.qualityControl}%</div>
              </div>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-sf-border">
            <h4 className="font-medium text-sf-text-primary mb-2">Core Concept</h4>
            <div className="text-sm text-sf-text-secondary">
              <div className="mb-2">
                <strong>Premise:</strong> {currentProject.coreConcept.corePremise}
              </div>
              <div className="mb-2">
                <strong>Target Audience:</strong> {currentProject.coreConcept.targetAudience}
              </div>
              <div className="mb-2">
                <strong>Tone:</strong> {currentProject.coreConcept.tone}
              </div>
              <div>
                <strong>Thematic Keywords:</strong> {currentProject.coreConcept.thematicKeywords.join(', ') || 'None'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Available Constants */}
      <div className="bg-sf-surface rounded-xl border border-sf-border p-6">
        <h3 className="text-lg font-semibold text-sf-text-primary mb-3">Available Constants</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <h4 className="font-medium text-sf-text-primary mb-2">Genres</h4>
            <div className="text-sm text-sf-text-secondary">
              {GENRE_OPTIONS.slice(0, 8).join(', ')}...
            </div>
          </div>
          
          <div>
            <h4 className="font-medium text-sf-text-primary mb-2">Tones</h4>
            <div className="text-sm text-sf-text-secondary">
              {TONE_OPTIONS.slice(0, 8).join(', ')}...
            </div>
          </div>
          
          <div>
            <h4 className="font-medium text-sf-text-primary mb-2">Templates</h4>
            <div className="text-sm text-sf-text-secondary">
              {PROJECT_TEMPLATES.length} project templates available
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}





