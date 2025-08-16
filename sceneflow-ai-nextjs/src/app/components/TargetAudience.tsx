'use client'

import { motion } from 'framer-motion'
import { CheckCircle, Star, Users, Zap } from 'lucide-react'

export function TargetAudience() {
  const audiences = [
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
      title: 'Marketing Teams',
      description: 'Brand managers, agencies, and marketing professionals',
      benefits: [
        'Create campaign videos in hours, not weeks',
        'Generate multiple variations for testing',
        'Professional quality without expensive production',
        'Consistent brand messaging across all videos'
      ],
      icon: Users,
      color: 'from-blue-500 to-purple-500'
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
      icon: Zap,
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
          <h2 className="text-5xl font-bold mb-6">Who Uses SceneFlow AI?</h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
            From individual creators to enterprise teams, SceneFlow AI empowers everyone to create professional videos.
          </p>
        </motion.div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
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
                      <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
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
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-2xl p-8 border border-gray-700 max-w-2xl mx-auto">
            <h3 className="text-2xl font-bold mb-4">Ready to Join Them?</h3>
            <p className="text-gray-300 mb-6">
              Start creating professional videos today, regardless of your experience level.
            </p>
            <button 
              onClick={() => {
                const element = document.getElementById('pricing')
                if (element) element.scrollIntoView({ behavior: 'smooth' })
              }}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-8 py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105"
            >
              Get Started Now
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
