'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Zap, Users, Shield, Globe, Film, BookOpen, Clapperboard, ArrowRight } from 'lucide-react'
import { FeatureDetailModal } from './FeatureDetailModal'
import { Button } from '@/components/ui/Button'

export function FeatureHighlight() {
  const [selectedFeature, setSelectedFeature] = useState<number | null>(null)

  const features = [
    {
      icon: Film,
      title: 'AI Story Generator',
      description: 'Generate complete story structures with acts and chapters in seconds. Transform any idea into a professional film outline.',
      detailedDescription: 'Our AI Story Generator uses Google Gemini 2.5 Pro to create professional film treatments with three-act structures, character arcs, and scene breakdowns. Perfect for short films (3-10 min), medium productions (10-30 min), and feature-length films (30+ min).',
      benefits: [
        'Industry-standard three-act structure',
        'Character development and arcs',
        'Scene-by-scene breakdowns',
        'Genre-specific templates',
        'Instant revisions and iterations'
      ],
      useCases: [
        'Short Film: Generate a complete 5-minute film treatment in 30 seconds',
        'Web Series: Create episode outlines with consistent character development',
        'Documentary: Structure your narrative with compelling story beats'
      ],
      screenshotPlaceholder: {
        gradient: 'from-blue-500 to-blue-600',
        icon: Film
      },
      ctaText: 'Try Story Generator',
      ctaLink: '/?signup=1',
      color: 'from-blue-500 to-blue-600'
    },
    {
      icon: BookOpen,
      title: 'Professional Story Structures',
      description: 'Industry-standard three-act structures, hero journeys, and custom narratives for every film length and genre.',
      detailedDescription: 'Access professionally crafted story structures optimized for different film formats. Choose from three-act structures for short films, hero journeys for feature-length content, or custom narrative templates tailored to your genre and vision.',
      benefits: [
        'Tried-and-tested story frameworks',
        'Genre-specific adaptations',
        'Flexible duration templates',
        'Industry best practices',
        'Easy customization'
      ],
      useCases: [
        'Three-Act: Perfect for 5-30 minute productions with clear beginning, middle, and end',
        'Hero Journey: Ideal for feature films requiring character transformation arcs',
        'Custom: Build your own structure for unique narrative formats'
      ],
      screenshotPlaceholder: {
        gradient: 'from-emerald-500 to-emerald-600',
        icon: BookOpen
      },
      ctaText: 'Explore Structures',
      ctaLink: '/?signup=1',
      color: 'from-emerald-500 to-emerald-600'
    },
    {
      icon: Clapperboard,
      title: 'Advanced Chapter Management',
      description: 'Organize complex narratives with professional act and chapter breakdowns. Perfect for feature films and series.',
      detailedDescription: 'Manage multi-scene projects with our advanced chapter management system. Create acts, define chapter boundaries, track pacing, and maintain narrative consistency across your entire production.',
      benefits: [
        'Multi-act organization',
        'Chapter-based navigation',
        'Pacing visualization',
        'Scene dependency mapping',
        'Progress tracking'
      ],
      useCases: [
        'Feature Film: Organize 90+ minute productions into clear acts and chapters',
        'Series: Manage multiple episodes with consistent chapter structures',
        'Documentary: Break long-form content into digestible narrative chunks'
      ],
      screenshotPlaceholder: {
        gradient: 'from-orange-500 to-orange-600',
        icon: Clapperboard
      },
      ctaText: 'Try Chapter Management',
      ctaLink: '/?signup=1',
      color: 'from-orange-500 to-orange-600'
    },
    {
      icon: Zap,
      title: 'Complete 6-Step Workflow',
      description: 'End-to-end video production from ideation to optimization. Complete projects in minutes, not days.',
      detailedDescription: 'Experience the full power of AI-driven video production through our comprehensive 6-step workflow: Ideation, Story Generation, Scriptwriting, Storyboarding, Scene Direction, and Video Generation. Each step seamlessly integrates to create professional content in record time.',
      benefits: [
        'End-to-end production pipeline',
        'Seamless workflow integration',
        'Automated quality checks',
        'Real-time collaboration',
        'Professional output'
      ],
      useCases: [
        'Quick Turnaround: Complete a 5-minute video from concept to final output in under 10 minutes',
        'Professional Projects: Use all 6 phases for comprehensive, high-quality productions',
        'Iterative Creation: Refine and optimize each step before moving to the next'
      ],
      screenshotPlaceholder: {
        gradient: 'from-purple-500 to-purple-600',
        icon: Zap
      },
      ctaText: 'Start Your Project',
      ctaLink: '/?signup=1',
      color: 'from-purple-500 to-purple-600'
    }
  ]

  return (
    <section id="features" className="py-24 bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          className="text-center mb-20"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-5xl font-bold mb-6">Built for Professional Video Production</h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
            SceneFlow AI combines cutting-edge AI technology with industry-standard video production workflows to democratize professional video creation.
          </p>
        </motion.div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {features.map((feature, index) => {
            const Icon = feature.icon
            
            return (
              <motion.div 
                key={index}
                onClick={() => setSelectedFeature(index)}
                className="text-center group cursor-pointer"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <div className={`w-24 h-24 bg-gradient-to-r ${feature.color} rounded-2xl flex items-center justify-center mx-auto mb-8 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                  <Icon className="w-12 h-12 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-4 text-white group-hover:text-sf-primary transition-colors">{feature.title}</h3>
                <p className="text-gray-300 leading-relaxed text-sm">{feature.description}</p>
              </motion.div>
            )
          })}
        </div>

        {/* Section CTA */}
        <motion.div 
          className="text-center mt-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <Button
            size="lg"
            onClick={() => window.location.href = '/#pricing'}
            className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white px-10 py-5 text-xl font-semibold"
          >
            See All Plans & Pricing
            <ArrowRight className="w-6 h-6 ml-3" />
          </Button>
          <p className="text-sm text-gray-400 mt-4">
            Most filmmakers choose Indie Filmmaker ($49/mo) for advanced features
          </p>
        </motion.div>

        {/* Additional Filmmaking Features */}
        <motion.div 
          className="mt-20"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold mb-4">Complete Video Production Ecosystem</h3>
            <p className="text-lg text-gray-300 max-w-3xl mx-auto">
              From short films to feature-length productions, SceneFlow AI provides everything you need for professional video production through our comprehensive 6-step workflow.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <Users className="w-10 h-10 text-white" />
              </div>
              <h4 className="text-lg font-semibold mb-3 text-white">Team Collaboration</h4>
              <p className="text-gray-300 text-sm">Work seamlessly with your production team. Share projects, get feedback, and iterate together.</p>
            </div>
            
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <Shield className="w-10 h-10 text-white" />
              </div>
              <h4 className="text-lg font-semibold mb-3 text-white">Enterprise Security</h4>
              <p className="text-gray-300 text-sm">Your film content is secure. BYOK model ensures complete data privacy and control.</p>
            </div>
            
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <Globe className="w-10 h-10 text-white" />
              </div>
              <h4 className="text-lg font-semibold mb-3 text-white">Global AI Models</h4>
              <p className="text-gray-300 text-sm">Powered by Google Gemini and Veo for state-of-the-art AI generation and film production.</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Feature Detail Modal */}
      {selectedFeature !== null && (
        <FeatureDetailModal 
          isOpen={selectedFeature !== null}
          onClose={() => setSelectedFeature(null)}
          feature={features[selectedFeature]}
        />
      )}
    </section>
  )
}
