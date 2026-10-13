'use client'

import { motion } from 'framer-motion'
import { getSeriesGreenlightTier } from '@/types/series'

interface SeriesGreenlightGaugeProps {
  score: number
  targetMarkets?: string[]
  targetAudience?: string
  /** Compact ring for the Series Room health strip. Full size is the AR screen. */
  size?: 'full' | 'compact'
}

export function SeriesGreenlightGauge({
  score,
  targetMarkets,
  targetAudience,
  size = 'full',
}: SeriesGreenlightGaugeProps) {
  const compact = size === 'compact'
  const { tier, label, color } = getSeriesGreenlightTier(score)

  const box = compact ? 88 : 140
  const radius = compact ? 32 : 60
  const strokeWidth = compact ? 6 : 8
  const center = box / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (score / 100) * circumference

  const glowColor =
    tier === 'market-ready'
      ? 'rgba(34, 197, 94, 0.4)'
      : tier === 'strong-potential'
        ? 'rgba(245, 158, 11, 0.3)'
        : 'rgba(239, 68, 68, 0.2)'

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: box, height: box }}>
        <div
          className="absolute inset-0 rounded-full blur-xl"
          style={{ backgroundColor: glowColor }}
        />

        <svg className="relative z-10 -rotate-90" width={box} height={box}>
          <circle
            cx={center}
            cy={center}
            r={radius}
            stroke="rgba(255, 255, 255, 0.1)"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          <motion.circle
            cx={center}
            cy={center}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            style={{ filter: `drop-shadow(0 0 6px ${color})` }}
          />
        </svg>

        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center">
          <motion.span
            className={compact ? 'text-2xl font-bold' : 'text-4xl font-bold'}
            style={{ color }}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            {score}
          </motion.span>
          <span className={compact ? 'mt-0.5 text-[10px] text-gray-400' : 'mt-1 text-xs text-gray-400'}>
            {label}
          </span>
        </div>
      </div>

      {compact ? null : (
        <div className="mt-3 max-w-[180px] text-center text-[10px] text-gray-500">
          Score factors in targeting: <br />
          <span className="text-gray-400">{targetMarkets?.join(', ') || 'Global'}</span>
          {targetAudience ? (
            <>
              {' '}
              &bull; <span className="text-gray-400">{targetAudience}</span>
            </>
          ) : null}
        </div>
      )}
    </div>
  )
}
