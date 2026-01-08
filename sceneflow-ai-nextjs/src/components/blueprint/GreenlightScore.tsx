'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { getGreenlightTier, type GreenlightScore as GreenlightScoreType } from '@/lib/types/audienceResonance'

interface GreenlightScoreProps {
  score: number
  confidence?: number
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  animated?: boolean
  genre?: string
}

/**
 * Circular radial progress component displaying the Greenlight Score
 * 
 * Color Logic:
 * - 90-100: Neon Green (#22c55e) - "Market Ready"
 * - 70-89: Amber (#f59e0b) - "Strong Potential"  
 * - <70: Muted Red (#ef4444) - "Needs Refinement"
 */
export function GreenlightScore({
  score,
  confidence = 0.8,
  size = 'md',
  showLabel = true,
  animated = true,
  genre
}: GreenlightScoreProps) {
  const { tier, label, color } = getGreenlightTier(score)
  
  // Size configurations
  const sizes = {
    sm: { width: 100, strokeWidth: 8, fontSize: 'text-2xl', labelSize: 'text-xs' },
    md: { width: 160, strokeWidth: 10, fontSize: 'text-4xl', labelSize: 'text-sm' },
    lg: { width: 200, strokeWidth: 12, fontSize: 'text-5xl', labelSize: 'text-base' }
  }
  
  const config = sizes[size]
  const radius = (config.width - config.strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (score / 100) * circumference
  
  // Glow effect based on tier
  const glowColor = tier === 'market-ready' 
    ? 'rgba(34, 197, 94, 0.4)' 
    : tier === 'strong-potential' 
      ? 'rgba(245, 158, 11, 0.3)' 
      : 'rgba(239, 68, 68, 0.2)'
  
  return (
    <div className="flex flex-col items-center">
      {/* Circular Progress */}
      <div 
        className="relative group cursor-help"
        style={{ width: config.width, height: config.width }}
      >
        {/* Background glow */}
        <div 
          className="absolute inset-0 rounded-full blur-xl transition-opacity duration-300 opacity-50 group-hover:opacity-80"
          style={{ backgroundColor: glowColor }}
        />
        
        {/* SVG Circle */}
        <svg 
          className="transform -rotate-90 relative z-10" 
          width={config.width} 
          height={config.width}
        >
          {/* Background track */}
          <circle
            cx={config.width / 2}
            cy={config.width / 2}
            r={radius}
            stroke="rgba(255, 255, 255, 0.1)"
            strokeWidth={config.strokeWidth}
            fill="transparent"
          />
          
          {/* Progress arc */}
          <motion.circle
            cx={config.width / 2}
            cy={config.width / 2}
            r={radius}
            stroke={color}
            strokeWidth={config.strokeWidth}
            fill="transparent"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={animated ? { strokeDashoffset: circumference } : { strokeDashoffset }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            style={{
              filter: `drop-shadow(0 0 6px ${color})`
            }}
          />
        </svg>
        
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
          <motion.span
            className={`${config.fontSize} font-bold`}
            style={{ color }}
            initial={animated ? { opacity: 0, scale: 0.5 } : { opacity: 1, scale: 1 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            {score}
          </motion.span>
          {showLabel && (
            <motion.span
              className={`${config.labelSize} text-gray-400 mt-1`}
              initial={animated ? { opacity: 0 } : { opacity: 1 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.8 }}
            >
              {label}
            </motion.span>
          )}
        </div>
        
        {/* Tooltip */}
        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 translate-y-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-30">
          <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 shadow-xl text-xs whitespace-nowrap">
            <p className="text-white font-medium">
              {label} ({score}/100)
            </p>
            <p className="text-gray-400 mt-1">
              Based on analysis of top-performing
              {genre ? ` ${genre}` : ''} films from 2023-2025
            </p>
            <p className="text-gray-500 text-[10px] mt-1">
              Confidence: {Math.round(confidence * 100)}%
            </p>
          </div>
        </div>
      </div>
      
      {/* Tier indicator pills */}
      {size !== 'sm' && (
        <div className="flex gap-1 mt-4">
          {[
            { tier: 'needs-refinement', color: '#ef4444', label: '<70' },
            { tier: 'strong-potential', color: '#f59e0b', label: '70-89' },
            { tier: 'market-ready', color: '#22c55e', label: '90+' }
          ].map((t) => (
            <div
              key={t.tier}
              className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-all ${
                tier === t.tier 
                  ? 'ring-2 ring-offset-1 ring-offset-slate-900' 
                  : 'opacity-40'
              }`}
              style={{ 
                backgroundColor: `${t.color}20`, 
                color: t.color,
                ringColor: tier === t.tier ? t.color : 'transparent'
              }}
            >
              {t.label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Compact inline version for use in lists/cards
 */
export function GreenlightScoreBadge({ score }: { score: number }) {
  const { label, color } = getGreenlightTier(score)
  
  return (
    <div 
      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium"
      style={{ backgroundColor: `${color}20`, color }}
    >
      <span className="font-bold">{score}</span>
      <span className="opacity-80">{label}</span>
    </div>
  )
}
