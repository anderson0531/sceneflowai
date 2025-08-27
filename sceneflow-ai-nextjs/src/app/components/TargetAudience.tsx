'use client'

import { motion } from 'framer-motion'
import { CheckCircle, Star, Users, Zap, Film, Clapperboard, BookOpen } from 'lucide-react'

export function TargetAudience() {
  const audiences = [
    {
      title: 'Indie Filmmakers',
      description: 'Emerging directors, independent producers, and film students',
      benefits: [
        'Generate complete story structures with acts and chapters',
        'Create professional storyboards without expensive tools',
        'Access industry-standard filmmaking workflows',
        'Scale from short films to feature-length productions'
      ],
      icon: Film,
      color: 'from-orange-500 to-red-500'
    },
    {
      title: 'Content Creators',
      description: 'YouTubers, social media influencers, and digital marketers',
      benefits: [
        'Generate viral video concepts in seconds',
        'Create professional thumbnails and intros',
        'Scale content production 10x faster',
        'A/B test multiple video versions'
      ],
      icon: Star,
      color: 'from-yellow-500 to-orange-500'
    },
    {
      title: 'Production Companies',
      description: 'Film studios, agencies, and professional production teams',
      benefits: [
        'Streamline pre-production with AI-powered tools',
        'Generate multiple story variations for clients',
        'Professional quality without expensive equipment',
        'Collaborate seamlessly across team members'
      ],
      icon: Clapperboard,
      color: 'from-sf-primary to-sf-accent'
    },
    {
      title: 'Educators & Trainers',
      description: 'Teachers, corporate trainers, and course creators',
      benefits: [
        'Transform complex topics into engaging visuals',
        'Create consistent training materials',
        'Generate multiple language versions',
        'Professional presentation quality'
      ],
      icon: BookOpen,
      color: 'from-green-500 to-teal-500'
    }
  ]

  return (
    <section className="py-24 bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          className="text-center mb-20"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-5xl font-bold mb-6">Built for Every Creator</h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
            SceneFlow AI's complete 6-step workflow is designed to serve creators at every level, from beginners to professionals, across all video production needs.
          </p>
        </motion.div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {audiences.map((audience, index) => {
            const Icon = audience.icon
            
            return (
              <motion.div 
                key={index}
                className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-8 border border-gray-700"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <div className={`w-16 h-16 bg-gradient-to-r ${audience.color} rounded-xl flex items-center justify-center mx-auto mb-6`}>
                  <Icon className="w-8 h-8 text-white" />
                </div>
                
                <h3 className="text-2xl font-bold text-center mb-2">{audience.title}</h3>
                <p className="text-gray-400 text-center mb-6">{audience.description}</p>
                
                <ul className="space-y-3">
                  {audience.benefits.map((benefit, benefitIndex) => (
                    <li key={benefitIndex} className="flex items-start space-x-3">
                      <CheckCircle className="w-5 h-5 text-sf-accent mt-0.5 flex-shrink-0" />
                      <span className="text-gray-300 text-sm">{benefit}</span>
                    </li>
                  ))}
                </ul>
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
            <h3 className="text-2xl font-bold mb-4">Ready to Join Them?</h3>
            <p className="text-gray-300 mb-6">
              Start creating professional films today, regardless of your experience level or budget.
            </p>
            <button 
              onClick={() => {
                const element = document.getElementById('pricing')
                if (element) element.scrollIntoView({ behavior: 'smooth' })
              }}
              className="bg-sf-primary hover:bg-sf-accent text-sf-background px-8 py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105"
            >
              Start Video Production Now
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
