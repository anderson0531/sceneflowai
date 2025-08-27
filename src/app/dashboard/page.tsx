'use client'

import React, { useState } from 'react'
import { useSceneFlowStore } from '@/store/SceneFlowStore'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { PROJECT_TEMPLATES } from '@/constants/projectTemplates'
import { Plus, Play, FolderOpen } from 'lucide-react'

export default function DashboardPage() {
  const { 
    currentProject, 
    projectHistory, 
    createNewProject, 
    loadProject 
  } = useSceneFlowStore()
  
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')

  const handleCreateProject = () => {
    if (selectedTemplate) {
      createNewProject(selectedTemplate)
    }
  }

  if (currentProject) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Current Project: {currentProject.title}</CardTitle>
            <CardDescription>
              Continue working on your project or start a new one
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button 
                onClick={() => {}} 
                className="flex items-center space-x-2"
                size="lg"
              >
                <Play size={20} />
                <span>Continue Project</span>
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {}} 
                className="flex items-center space-x-2"
                size="lg"
              >
                <Plus size={20} />
                <span>New Project</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-3xl">Welcome to SceneFlow AI</CardTitle>
          <CardDescription className="text-lg">
            Transform your creative vision into professional video content
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-muted-foreground max-w-2xl mx-auto">
            SceneFlow guides you through a professional production workflow, from initial concept 
            to final video, using AI to handle the technical complexities while you focus on creativity.
          </p>
        </CardContent>
      </Card>

      {/* Project Templates */}
      <Card>
        <CardHeader>
          <CardTitle>Choose a Project Template</CardTitle>
          <CardDescription>
            Select a template to get started with your creative project
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {PROJECT_TEMPLATES.map((template) => (
              <div
                key={template.id}
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  selectedTemplate === template.id
                    ? 'border-primary bg-primary/5'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedTemplate(template.id)}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${template.gradient} flex items-center justify-center text-white`}>
                    {template.icon}
                  </div>
                  <div>
                    <h4 className="font-medium">{template.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {template.estimatedDuration}s • {template.complexity}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  {template.description}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            onClick={handleCreateProject}
            disabled={!selectedTemplate}
            className="flex items-center space-x-2"
            size="lg"
          >
            <Plus size={20} />
            <span>Create Project</span>
          </Button>
        </CardFooter>
      </Card>

      {/* Recent Projects */}
      {projectHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Projects</CardTitle>
            <CardDescription>
              Continue working on your previous projects
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {projectHistory.slice(0, 5).map((project) => (
                <div
                  key={project.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                >
                  <div>
                    <h4 className="font-medium">{project.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      Last modified: {new Date(project.lastModified).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadProject(project.id)}
                    className="flex items-center space-x-2"
                  >
                    <FolderOpen size={16} />
                    <span>Open</span>
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}





