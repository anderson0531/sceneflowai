'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface FeatureDetailModalProps {
  isOpen: boolean
  onClose: () => void
  feature: {
    title: string
    description: string
    detailedDescription: string
    benefits: string[]
    useCases: string[]
    screenshotPlaceholder: {
      gradient: string
      icon: React.ComponentType
    }
    ctaText: string
    ctaLink: string
  } | null
}

export function FeatureDetailModal({ isOpen, onClose, feature }: FeatureDetailModalProps) {
  if (!feature) return null

  const Icon = feature.screenshotPlaceholder.icon

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="bg-gray-900 rounded-2xl border border-gray-800 max-w-4xl w-full max-h-[90vh] overflow-hidden pointer-events-auto shadow-2xl">
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition-colors z-10"
                aria-label="Close"
              >
                <X size={24} />
              </button>

              {/* Content */}
              <div className="overflow-y-auto max-h-[90vh] p-8 md:p-12">
                {/* Header */}
                <div className="mb-8">
                  <div className={`w-16 h-16 bg-gradient-to-r ${feature.screenshotPlaceholder.gradient} rounded-2xl flex items-center justify-center mb-6`}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                    {feature.title}
                  </h2>
                  <p className="text-xl text-gray-300 leading-relaxed">
                    {feature.description}
                  </p>
                </div>

                {/* Screenshot Placeholder */}
                <div className="mb-8">
                  <div className={`aspect-video bg-gradient-to-br ${feature.screenshotPlaceholder.gradient} rounded-xl flex items-center justify-center relative overflow-hidden`}>
                    <div className="absolute inset-0 bg-black/20" />
                    <div className="relative z-10 text-center p-8">
                      <div className="w-24 h-24 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Icon className="w-12 h-12 text-white" />
                      </div>
                      <p className="text-white/90 font-medium text-lg">Screenshot Coming Soon</p>
                      <p className="text-white/70 text-sm mt-2">Interactive feature demonstration</p>
                    </div>
                  </div>
                </div>

                {/* Detailed Description */}
                <div className="mb-8">
                  <h3 className="text-2xl font-bold text-white mb-4">How It Works</h3>
                  <p className="text-lg text-gray-300 leading-relaxed">
                    {feature.detailedDescription}
                  </p>
                </div>

                {/* Benefits */}
                <div className="mb-8">
                  <h3 className="text-2xl font-bold text-white mb-4">Key Benefits</h3>
                  <ul className="space-y-3">
                    {feature.benefits.map((benefit, index) => (
                      <li key={index} className="flex items-start space-x-3">
                        <CheckCircle className="w-6 h-6 text-sf-accent flex-shrink-0 mt-0.5" />
                        <span className="text-gray-300 text-lg">{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Use Cases */}
                <div className="mb-8">
                  <h3 className="text-2xl font-bold text-white mb-4">Use Cases</h3>
                  <div className="space-y-4">
                    {feature.useCases.map((useCase, index) => (
                      <div
                        key={index}
                        className="bg-gray-800/50 rounded-lg p-4 border border-gray-700"
                      >
                        <p className="text-gray-300 text-base leading-relaxed">{useCase}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* CTA */}
                <div className="pt-6 border-t border-gray-800">
                  <Button
                    size="lg"
                    onClick={() => {
                      window.location.href = feature.ctaLink
                    }}
                    className="w-full bg-gradient-to-r from-sf-primary to-sf-accent hover:from-sf-accent hover:to-sf-primary text-white px-8 py-4 text-lg font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg"
                  >
                    {feature.ctaText}
                    <ArrowRight className="w-6 h-6 ml-3" />
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

