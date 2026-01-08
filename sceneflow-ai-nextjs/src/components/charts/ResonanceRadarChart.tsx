'use client'

import React from 'react'
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip
} from 'recharts'
import { motion } from 'framer-motion'
import type { ResonanceAxis } from '@/lib/types/audienceResonance'

interface ResonanceRadarChartProps {
  axes: ResonanceAxis[]
  size?: 'sm' | 'md' | 'lg'
  showLabels?: boolean
  animated?: boolean
}

/**
 * Radar/Spider chart displaying the 5 resonance axes
 * Uses SceneFlow brand colors (cyan/emerald gradient)
 */
export function ResonanceRadarChart({
  axes,
  size = 'md',
  showLabels = true,
  animated = true
}: ResonanceRadarChartProps) {
  // Transform axes data for Recharts
  const chartData = axes.map(axis => ({
    axis: axis.label.replace(' ', '\n'), // Two-line labels for readability
    shortLabel: axis.label.split(' ')[0], // First word only for small sizes
    value: axis.score,
    fullMark: 100,
    description: axis.description
  }))
  
  // Size configurations
  const heights = {
    sm: 180,
    md: 250,
    lg: 320
  }
  
  const height = heights[size]
  
  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 shadow-xl">
          <p className="text-white font-medium text-sm">
            {data.axis.replace('\n', ' ')}
          </p>
          <p className="text-cyan-400 font-bold text-lg">{data.value}/100</p>
          <p className="text-gray-400 text-xs mt-1 max-w-[200px]">
            {data.description}
          </p>
        </div>
      )
    }
    return null
  }
  
  // Custom tick renderer for axis labels
  const renderPolarAngleAxisTick = (props: any) => {
    const { payload, x, y, cx, cy } = props
    const label = size === 'sm' ? payload.value.split('\n')[0] : payload.value
    
    // Calculate position offset for better label placement
    const radius = Math.sqrt(Math.pow(x - cx, 2) + Math.pow(y - cy, 2))
    const angle = Math.atan2(y - cy, x - cx)
    const offsetX = x + Math.cos(angle) * 10
    const offsetY = y + Math.sin(angle) * 10
    
    return (
      <text
        x={offsetX}
        y={offsetY}
        textAnchor={x > cx ? 'start' : x < cx ? 'end' : 'middle'}
        dominantBaseline="central"
        className="fill-gray-400 text-[10px] sm:text-xs"
      >
        {label.split('\n').map((line: string, i: number) => (
          <tspan key={i} x={offsetX} dy={i * 12}>
            {line}
          </tspan>
        ))}
      </text>
    )
  }
  
  return (
    <motion.div
      initial={animated ? { opacity: 0, scale: 0.9 } : { opacity: 1, scale: 1 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="w-full"
      style={{ height }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
          {/* Grid lines */}
          <PolarGrid 
            stroke="rgba(255, 255, 255, 0.1)" 
            strokeDasharray="3 3"
          />
          
          {/* Axis labels */}
          {showLabels && (
            <PolarAngleAxis
              dataKey="axis"
              tick={renderPolarAngleAxisTick}
              tickLine={false}
            />
          )}
          
          {/* Radius scale (hidden but functional) */}
          <PolarRadiusAxis 
            angle={90} 
            domain={[0, 100]} 
            tick={false}
            axisLine={false}
          />
          
          {/* Data area with gradient fill */}
          <defs>
            <linearGradient id="resonanceGradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.8} />
              <stop offset="100%" stopColor="#10b981" stopOpacity={0.6} />
            </linearGradient>
          </defs>
          
          <Radar
            name="Score"
            dataKey="value"
            stroke="#06b6d4"
            strokeWidth={2}
            fill="url(#resonanceGradient)"
            fillOpacity={0.4}
            dot={{
              r: 4,
              fill: '#06b6d4',
              strokeWidth: 2,
              stroke: '#0f172a'
            }}
            activeDot={{
              r: 6,
              fill: '#10b981',
              stroke: '#fff',
              strokeWidth: 2
            }}
            animationBegin={animated ? 300 : 0}
            animationDuration={animated ? 1000 : 0}
            animationEasing="ease-out"
          />
          
          <Tooltip content={<CustomTooltip />} />
        </RadarChart>
      </ResponsiveContainer>
    </motion.div>
  )
}

/**
 * Compact legend for the radar chart axes
 */
export function ResonanceRadarLegend({ axes }: { axes: ResonanceAxis[] }) {
  return (
    <div className="grid grid-cols-2 gap-2 mt-4">
      {axes.map((axis) => {
        const scoreColor = axis.score >= 80 ? 'text-emerald-400' : 
                          axis.score >= 60 ? 'text-cyan-400' : 
                          axis.score >= 40 ? 'text-amber-400' : 'text-red-400'
        
        return (
          <div 
            key={axis.id}
            className="flex items-center justify-between bg-slate-800/50 rounded-lg px-3 py-2 border border-slate-700/50"
          >
            <span className="text-xs text-gray-400 truncate mr-2">{axis.label}</span>
            <span className={`text-sm font-bold ${scoreColor}`}>{axis.score}</span>
          </div>
        )
      })}
    </div>
  )
}
