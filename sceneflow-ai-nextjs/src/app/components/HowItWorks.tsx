'use client'

import { motion } from 'framer-motion'
import { Lightbulb, PanelsTopLeft, Clapperboard, Video } from 'lucide-react'

export function HowItWorks() {
  const workflowSteps = [
    {
      icon: Lightbulb,
      title: 'Ideation',
      subtitle: 'The Spark Studio',
      description: 'Generate distinct video ideas, synopses, and analyze trending YouTube references.',
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20'
    },
    {
      icon: PanelsTopLeft,
      title: 'Storyboarding',
      subtitle: 'Vision Board',
      description: 'Transform ideas into interactive storyboards with AI-generated images, technical specs (Spec 5.1), and audio cues.',
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/20'
    },
    {
      icon: Clapperboard,
      title: 'Scene Direction',
      subtitle: 'The Director\'s Chair',
      description: 'Generate a comprehensive technical blueprint (Spec 5.2) for production.',
      color: 'from-orange-500 to-orange-600',
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-orange-500/20'
    },
    {
      icon: Video,
      title: 'Video Generation',
      subtitle: 'The Screening Room',
      description: 'Synthesize high-quality video clips using Google Veo based on precise prompts.',
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/20'
    }
  ]

  return (
    <section id="how-it-works" className="py-24 bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          className="text-center mb-20"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-5xl font-bold mb-6">The SceneFlow AI Workflow</h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
            Our comprehensive workflow transforms your ideas into professional videos through four intelligent stages.
          </p>
        </motion.div>
        
        {/* Workflow Steps */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {workflowSteps.map((step, index) => {
            const Icon = step.icon
            
            return (
              <motion.div 
                key={index}
                className="group cursor-pointer"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <div className={`relative p-6 rounded-2xl border-2 transition-all duration-300 group-hover:scale-105 group-hover:shadow-2xl ${step.borderColor} ${step.bgColor}`}>
                  {/* Step Number */}
                  <div className="absolute -top-3 -left-3 w-8 h-8 bg-gradient-to-r from-gray-800 to-gray-900 rounded-full flex items-center justify-center border-2 border-gray-700">
                    <span className="text-white font-bold text-sm">{index + 1}</span>
                  </div>
                  
                  {/* Icon */}
                  <div className={`w-20 h-20 bg-gradient-to-r ${step.color} rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="w-10 h-10 text-white" />
                  </div>
                  
                  {/* Content */}
                  <div className="text-center">
                    <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                    <p className="text-blue-400 font-medium mb-3 text-sm">{step.subtitle}</p>
                    <p className="text-gray-300 text-sm leading-relaxed">{step.description}</p>
                  </div>
                  
                  {/* Connection Line */}
                  {index < workflowSteps.length - 1 && (
                    <div className="hidden lg:block absolute top-1/2 -right-3 w-6 h-0.5 bg-gradient-to-r from-gray-600 to-gray-400 transform -translate-y-1/2"></div>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
        
        {/* Bottom CTA */}
        <motion.div 
          className="text-center mt-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-2xl p-8 border border-gray-700 max-w-2xl mx-auto">
            <h3 className="text-2xl font-bold mb-4">Ready to Start Your First Project?</h3>
            <p className="text-gray-300 mb-6">
              Experience the complete workflow from concept to final video in minutes, not days.
            </p>
            <button 
              onClick={() => {
                const element = document.getElementById('pricing')
                if (element) element.scrollIntoView({ behavior: 'smooth' })
              }}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-8 py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105"
            >
              Start Creating Now
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
