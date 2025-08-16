'use client'

import { motion } from 'framer-motion'
import { Lightbulb, Database, Settings } from 'lucide-react'

const utilityWidgets = [
  {
    title: 'Browse Ideas',
    subtitle: 'Explore and organize your creative concepts',
    icon: Lightbulb,
    href: '/dashboard/ideas',
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
      className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Studio Utilities</h2>
        <span className="text-sm text-gray-500">Essential tools and settings</span>
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
            <div className="bg-white shadow-md rounded-lg p-5 hover:bg-gray-50 transition duration-200 group-hover:shadow-lg h-full">
              <div className={`w-12 h-12 ${widget.bgColor} rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200`}>
                <widget.icon className={`w-6 h-6 ${widget.color}`} />
              </div>
              
              <h3 className="font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                {widget.title}
              </h3>
              
              <p className="text-sm text-gray-600 leading-relaxed">
                {widget.subtitle}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}
