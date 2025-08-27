'use client'

import { motion } from 'framer-motion'
import { Lightbulb, PanelsTopLeft, Clapperboard, Video, BookOpen, Film, Eye, Settings, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'

export function HowItWorks() {
  const [expandedCards, setExpandedCards] = useState<Record<number, boolean>>({})

  const toggleCard = (index: number) => {
    setExpandedCards(prev => ({
      ...prev,
      [index]: !prev[index]
    }))
  }

  const workflowSteps = [
    {
      icon: Lightbulb,
      title: 'Ideation',
      subtitle: 'The Spark Studio',
      description: 'Generate distinct film ideas, synopses, and analyze trending references. Transform any concept into a compelling film premise.',
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20'
    },
    {
      icon: BookOpen,
      title: 'AI Story Generation',
      subtitle: 'Story Structure Studio',
      description: 'Generate complete story structures with acts and chapters. Choose from industry-standard formats or create custom narratives.',
      color: 'from-emerald-500 to-emerald-600',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/20'
    },
    {
      icon: PanelsTopLeft,
      title: 'Storyboarding',
      subtitle: 'Vision Board',
      description: 'Transform story structures into interactive storyboards with AI-generated images, technical specs, and audio cues.',
      color: 'from-orange-500 to-orange-600',
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-orange-500/20'
    },
    {
      icon: Clapperboard,
      title: 'Scene Direction',
      subtitle: 'The Director\'s Chair',
      description: 'Generate comprehensive technical blueprints for production with professional filmmaking specifications.',
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/20'
    },
    {
      icon: Video,
      title: 'Video Generation',
      subtitle: 'The Screening Room',
      description: 'Synthesize high-quality video clips using Google Veo based on precise prompts and storyboard direction.',
      color: 'from-pink-500 to-pink-600',
      bgColor: 'bg-pink-500/10',
      borderColor: 'border-pink-500/20'
    },
    {
      icon: Eye,
      title: 'Review & Feedback',
      subtitle: 'Quality Control',
      description: 'Review generated content, gather feedback, and iterate on your project with AI-powered analysis and suggestions.',
      color: 'from-cyan-500 to-cyan-600',
      bgColor: 'bg-cyan-500/10',
      borderColor: 'border-cyan-500/20'
    },
    {
      icon: Settings,
      title: 'Optimization',
      subtitle: 'Performance Tuning',
      description: 'Fine-tune your project with advanced AI optimization, performance analytics, and continuous improvement tools.',
      color: 'from-sf-primary to-sf-accent',
      bgColor: 'bg-sf-primary/10',
      borderColor: 'border-sf-primary/20'
    }
  ]

  return (
    <section className="py-20 bg-gradient-to-b from-gray-900 to-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            The SceneFlow AI Filmmaking Workflow
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
            Our comprehensive workflow transforms your ideas into professional videos through six intelligent stages, from concept to final production and optimization.
          </p>
        </div>

        {/* Workflow Steps - Two Row Layout */}
        <div className="space-y-12">
          {/* Row 1: Steps 1-4 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {workflowSteps.slice(0, 4).map((step, index) => {
              const Icon = step.icon
              const isExpanded = expandedCards[index]
              
              return (
                <motion.div 
                  key={index}
                  className="group cursor-pointer"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                >
                  <div className={`relative p-6 rounded-2xl border-2 transition-all duration-300 group-hover:scale-105 group-hover:shadow-2xl ${step.borderColor} ${step.bgColor} h-full flex flex-col`}>
                    {/* Step Number */}
                    <div className="absolute -top-3 -left-3 w-8 h-8 bg-gradient-to-r from-gray-800 to-gray-900 rounded-full flex items-center justify-center border-2 border-gray-700 shadow-lg">
                      <span className="text-white font-bold text-sm">{index + 1}</span>
                    </div>
                    
                    {/* Icon */}
                    <div className={`w-20 h-20 bg-gradient-to-r ${step.color} rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                      <Icon className="w-10 h-10 text-white" />
                    </div>
                    
                    {/* Content */}
                    <div className="text-center flex-1">
                      <h3 className="text-xl font-bold mb-2 text-white">{step.title}</h3>
                      <p className="text-sf-primary font-medium mb-3 text-sm">{step.subtitle}</p>
                      
                      {/* Show/Hide Description */}
                      <div className="mt-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleCard(index)
                          }}
                          className="flex items-center justify-center w-full text-sf-primary hover:text-sf-accent transition-colors duration-200 text-sm font-medium"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="w-4 h-4 mr-1" />
                              Hide Details
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-4 h-4 mr-1" />
                              Show Details
                            </>
                          )}
                        </button>
                        
                        {isExpanded && (
                          <motion.p 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="text-gray-300 text-sm leading-relaxed mt-3 text-left"
                          >
                            {step.description}
                          </motion.p>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>

          {/* Row 2: Steps 5-7 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {workflowSteps.slice(4, 7).map((step, index) => {
              const Icon = step.icon
              const actualIndex = index + 4
              const isExpanded = expandedCards[actualIndex]
              
              return (
                <motion.div 
                  key={actualIndex}
                  className="group cursor-pointer"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: actualIndex * 0.1 }}
                >
                  <div className={`relative p-6 rounded-2xl border-2 transition-all duration-300 group-hover:scale-105 group-hover:shadow-2xl ${step.borderColor} ${step.bgColor} h-full flex flex-col`}>
                    {/* Step Number */}
                    <div className="absolute -top-3 -left-3 w-8 h-8 bg-gradient-to-r from-gray-800 to-gray-900 rounded-full flex items-center justify-center border-2 border-gray-700 shadow-lg">
                      <span className="text-white font-bold text-sm">{actualIndex + 1}</span>
                    </div>
                    
                    {/* Icon */}
                    <div className={`w-20 h-20 bg-gradient-to-r ${step.color} rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                      <Icon className="w-10 h-10 text-white" />
                    </div>
                    
                    {/* Content */}
                    <div className="text-center flex-1">
                      <h3 className="text-xl font-bold mb-2 text-white">{step.title}</h3>
                      <p className="text-sf-primary font-medium mb-3 text-sm">{step.subtitle}</p>
                      
                      {/* Show/Hide Description */}
                      <div className="mt-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleCard(actualIndex)
                          }}
                          className="flex items-center justify-center w-full text-sf-primary hover:text-sf-accent transition-colors duration-200 text-sm font-medium"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="w-4 h-4 mr-1" />
                              Hide Details
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-4 h-4 mr-1" />
                              Show Details
                            </>
                          )}
                        </button>
                        
                        {isExpanded && (
                          <motion.p 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="text-gray-300 text-sm leading-relaxed mt-3 text-left"
                          >
                            {step.description}
                          </motion.p>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* CTA Button */}
        <div className="text-center mt-16">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-gradient-to-r from-sf-primary to-sf-accent text-sf-background px-8 py-4 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300"
          >
            Start Filmmaking Now
          </motion.button>
        </div>
      </div>
    </section>
  )
}
