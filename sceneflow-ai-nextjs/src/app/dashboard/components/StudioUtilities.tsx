'use client'

import { motion } from 'framer-motion'
import { Lightbulb, Database, Settings } from 'lucide-react'

const utilityWidgets = [
  {
    title: 'Browse Templates',
    subtitle: 'Explore and organize your creative concepts',
    icon: Lightbulb,
    href: '/dashboard/templates',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50'
  },
  {
    title: 'Test Cue AI',
    subtitle: 'Test the completeness indicator and dual persona system',
    icon: Lightbulb,
    href: '/dashboard/test-cue',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50'
  },
  {
    title: 'Manage Credits',
    subtitle: 'Track usage and purchase additional credits',
    icon: Database,
    href: '/dashboard/credits',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50'
  },
  {
    title: 'Settings',
    subtitle: 'Configure integrations and account preferences',
    icon: Settings,
    href: '/dashboard/settings/integrations',
    color: 'text-gray-600',
    bgColor: 'bg-gray-50'
  }
]

export function StudioUtilities() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className="bg-sf-surface rounded-2xl p-6 shadow border border-sf-border"
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-sf-text-primary">Studio Utilities</h2>
        <span className="text-sm text-sf-text-secondary">Essential tools and settings</span>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {utilityWidgets.map((widget, index) => (
          <motion.div
            key={widget.title}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.3 + index * 0.1 }}
            className="group cursor-pointer"
            onClick={() => window.location.href = widget.href}
          >
            <div className="bg-gradient-to-br from-gray-800/50 to-gray-700/30 border-2 border-gray-600/30 rounded-xl p-6 hover:bg-gray-700/50 transition duration-300 group-hover:shadow-xl h-full hover:scale-105 hover:border-gray-500/50">
              <div className={`w-14 h-14 bg-gradient-to-br from-${widget.color.replace('text-', '').replace('-600', '-500')}/20 to-${widget.color.replace('text-', '').replace('-600', '-600')}/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200 border border-${widget.color.replace('text-', '').replace('-600', '-500')}/30`}>
                <widget.icon className={`w-7 h-7 ${widget.color}`} />
              </div>
              
              <h3 className="text-lg font-bold text-white mb-3 group-hover:text-sf-primary transition-colors">
                {widget.title}
              </h3>
              
              <p className="text-base text-gray-300 leading-relaxed font-medium">
                {widget.subtitle}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}
