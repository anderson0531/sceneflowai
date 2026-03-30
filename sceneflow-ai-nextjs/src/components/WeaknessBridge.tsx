'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle, Lightbulb } from 'lucide-react'

interface WeaknessBridgeProps {
  weakness: string
  fix: string
}

export function WeaknessBridge({ weakness, fix }: WeaknessBridgeProps) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div 
      className="relative flex items-start gap-3 p-3 rounded-lg border border-red-500/10 bg-red-500/5 hover:bg-red-500/10 transition-colors cursor-help"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <AlertCircle className="w-4 h-4 text-red-400 mt-1 shrink-0" />
      <span className="text-sm text-gray-300">{weakness}</span>

      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute left-0 bottom-full mb-4 w-64 z-50 pointer-events-none"
          >
            <div className="bg-gray-900 border border-emerald-500/40 rounded-xl shadow-2xl overflow-hidden">
              <div className="bg-emerald-500/10 px-3 py-2 border-b border-emerald-500/20 flex items-center gap-2">
                <Lightbulb className="w-3 h-3 text-emerald-400" />
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Strategic Pivot</span>
              </div>
              <div className="p-3">
                <p className="text-xs text-gray-300 leading-relaxed">
                  {fix}
                </p>
              </div>
            </div>
            <div className="w-3 h-3 bg-gray-900 border-r border-b border-emerald-500/40 rotate-45 absolute -bottom-1.5 left-6" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
