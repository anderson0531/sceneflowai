'use client'

import { motion } from 'framer-motion'
import { Zap, Users, Shield, Globe, Film, BookOpen, Clapperboard } from 'lucide-react'

export function FeatureHighlight() {
  const features = [
    {
      icon: Film,
      title: 'AI Story Generator',
      description: 'Generate complete story structures with acts and chapters in seconds. Transform any idea into a professional film outline.',
      color: 'from-blue-500 to-blue-600'
    },
    {
      icon: BookOpen,
      title: 'Professional Story Structures',
      description: 'Industry-standard three-act structures, hero journeys, and custom narratives for every film length and genre.',
      color: 'from-emerald-500 to-emerald-600'
    },
    {
      icon: Clapperboard,
      title: 'Advanced Chapter Management',
      description: 'Organize complex narratives with professional act and chapter breakdowns. Perfect for feature films and series.',
      color: 'from-orange-500 to-orange-600'
    },
    {
      icon: Zap,
      title: 'Complete 6-Step Workflow',
      description: 'End-to-end video production from ideation to optimization. Complete projects in minutes, not days.',
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
                className="text-center group"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <div className={`w-24 h-24 bg-gradient-to-r ${feature.color} rounded-2xl flex items-center justify-center mx-auto mb-8 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                  <Icon className="w-12 h-12 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-4 text-white">{feature.title}</h3>
                <p className="text-gray-300 leading-relaxed text-sm">{feature.description}</p>
              </motion.div>
            )
          })}
        </div>

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
    </section>
  )
}
