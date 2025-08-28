'use client'

import { motion } from 'framer-motion'
import { Plus, CreditCard, Clock, Image } from 'lucide-react'
import { useEnhancedStore } from '@/store/enhancedStore'

const creditStats = [
  {
    title: 'Available Credits',
    value: 1500,
    icon: CreditCard,
    bgColor: 'bg-blue-500',
    description: 'Ready to use'
  },
  {
    title: 'Pending Credits',
    value: 0,
    icon: Clock,
    bgColor: 'bg-orange-500',
    description: 'Processing'
  },
  {
    title: 'Image/Video Gen Credits',
    value: 1500,
    icon: Image,
    bgColor: 'bg-purple-600',
    description: 'For generation'
  }
]

export function CreditStatus() {
  const { user } = useEnhancedStore()
  
  // Use actual user credits if available, otherwise use default values
  const availableCredits = user?.credits || 1500
  const pendingCredits = 0 // This could be calculated from pending operations
  const generationCredits = user?.credits || 1500

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.3 }}
      className="bg-sf-surface rounded-2xl p-6 shadow border border-sf-border"
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-sf-text-primary">Credit Status</h2>
        <button 
          onClick={() => window.location.href = '/dashboard/credits'}
          className="flex items-center gap-2 text-sf-primary hover:text-sf-accent font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Get More Credits
        </button>
      </div>
      
      {/* Credit Statistics Grid - Now all with dark gray backgrounds */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {/* Available Credits - Enhanced with green accent border and background */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="group cursor-pointer"
          onClick={() => window.location.href = '/dashboard/credits'}
        >
          <div className="bg-gradient-to-br from-green-900/30 to-green-800/20 text-white rounded-xl shadow-xl p-6 hover:shadow-2xl transition duration-300 group-hover:scale-105 h-full border-2 border-green-500/40 hover:border-green-400/60">
            <div className="flex items-center justify-between mb-4">
              <div className="w-14 h-14 bg-green-500/30 rounded-xl flex items-center justify-center border-2 border-green-400/40 shadow-lg">
                <CreditCard className="w-7 h-7 text-green-300" />
              </div>
            </div>
            
            {/* Data highlighted with green accent color */}
            <div className="text-4xl font-bold mb-3 text-green-300">
              {availableCredits.toLocaleString()}
            </div>
            
            <h3 className="text-xl font-bold mb-2 text-white">Available Credits</h3>
            
            <p className="text-green-100 text-base font-medium">
              Ready to use
            </p>
          </div>
        </motion.div>

        {/* Pending Credits - Dark gray with neutral icon */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.5 }}
          className="group cursor-pointer"
          onClick={() => window.location.href = '/dashboard/credits'}
        >
          <div className="bg-sf-surface-light text-sf-text-primary rounded-lg shadow p-6 border border-sf-border transition duration-300 group-hover:scale-105 hover:shadow-sf-elevated hover:border-sf-primary/30 h-full">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-sf-surface-elevated rounded-lg flex items-center justify-center border border-sf-border">
                <Clock className="w-6 h-6 text-sf-text-secondary" />
              </div>
            </div>
            
            <div className="text-3xl font-bold mb-2">
              {pendingCredits.toLocaleString()}
            </div>
            
            <h3 className="text-lg font-semibold mb-2">Pending Credits</h3>
            
            <p className="text-sf-text-secondary text-sm">
              Processing
            </p>
          </div>
        </motion.div>

        {/* Image/Video Generation Credits - Dark gray with accent data */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.6 }}
          className="group cursor-pointer"
          onClick={() => window.location.href = '/dashboard/credits'}
        >
          <div className="bg-sf-surface-light text-sf-text-primary rounded-lg shadow p-6 border border-sf-border transition duration-300 group-hover:scale-105 hover:shadow-sf-elevated hover:border-sf-primary/30 h-full">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-sf-primary/10 rounded-lg flex items-center justify-center border border-sf-primary/30">
                <Image className="w-6 h-6 text-sf-primary" />
              </div>
            </div>
            
            {/* Data highlighted with accent color */}
            <div className="text-3xl font-bold mb-2 text-sf-primary">
              {generationCredits.toLocaleString()}
            </div>
            
            <h3 className="text-lg font-semibold mb-2">Image/Video Gen Credits</h3>
            
            <p className="text-sf-text-secondary text-sm">
              For generation
            </p>
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}
