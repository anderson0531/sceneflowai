'use client'

import { motion } from 'framer-motion'
import { Users, Star, TrendingUp, Award } from 'lucide-react'

export function TrustSignals() {
  const metrics = [
    { icon: Users, value: '10,000+', label: 'Active Creators' },
    { icon: Star, value: '4.8/5', label: 'User Rating' },
    { icon: TrendingUp, value: '50,000+', label: 'Videos Created' },
    { icon: Award, value: '95%', label: 'Satisfaction Rate' }
  ]
  
  return (
    <section className="py-16 bg-gray-900 border-y border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {metrics.map((metric, index) => (
            <motion.div 
              key={index}
              className="text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              <div className="w-16 h-16 bg-gradient-to-r from-sf-primary to-sf-accent rounded-2xl flex items-center justify-center mx-auto mb-4">
                <metric.icon className="w-8 h-8 text-white" />
              </div>
              <div className="text-3xl font-bold text-white mb-2">{metric.value}</div>
              <div className="text-sm text-gray-400">{metric.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

