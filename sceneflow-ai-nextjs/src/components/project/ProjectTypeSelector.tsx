'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/card'
import { Clock, Film, Video, Zap, BookOpen, Target, Users, DollarSign } from 'lucide-react'
import type { ProjectType, StoryStructure } from '@/types/SceneFlow'

interface ProjectTypeSelectorProps {
  selectedType: ProjectType | null
  onTypeSelect: (type: ProjectType) => void
  selectedStructure?: StoryStructure
  onStructureSelect?: (structure: StoryStructure) => void
  showStructureSelector?: boolean
}

const projectTypes = [
  {
    id: 'short' as ProjectType,
    title: 'Short Video',
    subtitle: '1-5 minutes',
    description: 'Perfect for social media, ads, or quick concepts',
    icon: Zap,
    features: ['Quick turnaround', 'Focused messaging', 'Social media ready'],
    color: 'from-blue-500 to-blue-600',
    bgColor: 'bg-blue-500'
  },
  {
    id: 'medium' as ProjectType,
    title: 'Medium Video',
    subtitle: '5-20 minutes',
    description: 'Ideal for educational content, product demos, or short stories',
    icon: Video,
    features: ['Detailed storytelling', 'Educational depth', 'Brand building'],
    color: 'from-purple-500 to-purple-600',
    bgColor: 'bg-purple-500'
  },
  {
    id: 'long' as ProjectType,
    title: 'Long Video / Film',
    subtitle: '20+ minutes',
    description: 'Perfect for documentaries, feature films, or series',
    icon: Film,
    features: ['Complex narratives', 'Character development', 'Professional production'],
    color: 'from-orange-500 to-orange-600',
    bgColor: 'bg-orange-500'
  }
]

const storyStructures = [
  {
    id: 'linear' as StoryStructure,
    title: 'Linear Narrative',
    description: 'Simple chronological storytelling',
    icon: BookOpen,
    bestFor: 'Short videos, documentaries, straightforward narratives'
  },
  {
    id: 'three-act' as StoryStructure,
    title: 'Three-Act Structure',
    description: 'Setup, confrontation, resolution',
    icon: Target,
    bestFor: 'Feature films, dramatic content, character-driven stories'
  },
  {
    id: 'hero-journey' as StoryStructure,
    title: 'Hero\'s Journey',
    description: 'Call to adventure, transformation, return',
    icon: Users,
    bestFor: 'Adventure stories, personal growth narratives, epic tales'
  },
  {
    id: 'save-the-cat' as StoryStructure,
    title: 'Save the Cat',
    description: '15-beat story structure for screenplays',
    icon: DollarSign,
    bestFor: 'Commercial films, genre movies, audience-pleasing content'
  }
]

export function ProjectTypeSelector({
  selectedType,
  onTypeSelect,
  selectedStructure,
  onStructureSelect,
  showStructureSelector = false
}: ProjectTypeSelectorProps) {
  const [hoveredType, setHoveredType] = useState<ProjectType | null>(null)

  return (
    <div className="space-y-6">
      {/* Project Type Selection */}
      <div>
        <h3 className="text-lg font-semibold text-sf-text-primary mb-4">Choose Your Project Type</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {projectTypes.map((type) => {
            const Icon = type.icon
            const isSelected = selectedType === type.id
            const isHovered = hoveredType === type.id
            
            return (
              <Card
                key={type.id}
                className={`cursor-pointer transition-all duration-300 ${
                  isSelected 
                    ? 'ring-2 ring-sf-primary ring-offset-2 ring-offset-sf-background' 
                    : 'hover:ring-2 hover:ring-sf-primary/50 hover:ring-offset-2 hover:ring-offset-sf-background'
                }`}
                onClick={() => onTypeSelect(type.id)}
                onMouseEnter={() => setHoveredType(type.id)}
                onMouseLeave={() => setHoveredType(null)}
              >
                <div className="text-center p-6">
                  {/* Icon */}
                  <div className={`w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r ${type.color} flex items-center justify-center`}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  
                  {/* Title & Subtitle */}
                  <h4 className="text-lg font-semibold text-sf-text-primary mb-1">{type.title}</h4>
                  <p className="text-sm text-sf-accent font-medium mb-3">{type.subtitle}</p>
                  
                  {/* Description */}
                  <p className="text-sm text-sf-text-secondary mb-4">{type.description}</p>
                  
                  {/* Features */}
                  <ul className="space-y-1">
                    {type.features.map((feature, index) => (
                      <li key={index} className="text-xs text-sf-text-secondary flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-sf-accent mr-2" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  
                  {/* Selection Indicator */}
                  {isSelected && (
                    <div className="mt-4">
                      <div className="inline-flex items-center px-3 py-1 rounded-full bg-sf-primary/20 border border-sf-primary/40 text-sf-primary text-xs font-medium">
                        <div className="w-2 h-2 rounded-full bg-sf-primary mr-2" />
                        Selected
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Story Structure Selection (only for long projects) */}
      {showStructureSelector && selectedType === 'long' && (
        <div>
          <h3 className="text-lg font-semibold text-sf-text-primary mb-4">Choose Your Story Structure</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {storyStructures.map((structure) => {
              const Icon = structure.icon
              const isSelected = selectedStructure === structure.id
              
              return (
                <Card
                  key={structure.id}
                  className={`cursor-pointer transition-all duration-300 ${
                    isSelected 
                      ? 'ring-2 ring-sf-primary ring-offset-2 ring-offset-sf-background' 
                      : 'hover:ring-2 hover:ring-sf-primary/50 hover:ring-offset-2 hover:ring-offset-sf-background'
                  }`}
                  onClick={() => onStructureSelect?.(structure.id)}
                >
                  <div className="p-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-10 h-10 rounded-lg bg-sf-primary/20 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-5 h-5 text-sf-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-sf-text-primary mb-1">{structure.title}</h4>
                        <p className="text-xs text-sf-text-secondary mb-2">{structure.description}</p>
                        <p className="text-xs text-sf-accent">{structure.bestFor}</p>
                      </div>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-sf-primary flex items-center justify-center flex-shrink-0">
                          <div className="w-2 h-2 rounded-full bg-white" />
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* Next Steps */}
      {selectedType && (
        <div className="text-center">
          <div className="inline-flex items-center px-4 py-2 rounded-lg bg-sf-surface-light border border-sf-border">
            <Clock className="w-4 h-4 text-sf-accent mr-2" />
            <span className="text-sm text-sf-text-secondary">
              {selectedType === 'short' && 'Ready to start your short video project'}
              {selectedType === 'medium' && 'Ready to develop your medium-length content'}
              {selectedType === 'long' && 'Ready to plan your feature-length project'}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
