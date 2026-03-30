'use client'

import { motion } from 'framer-motion'

interface Axis {
  label: string
  value: number // 0 to 100
}

interface RadarChartProps {
  data: Axis[]
  size?: number
}

export function RadarChart({ data, size = 300 }: RadarChartProps) {
  const R = size / 2
  const center = R
  const padding = 40
  const chartRadius = R - padding

  const points = data.map((axis, i) => {
    const angle = (Math.PI * 2 * i) / data.length - Math.PI / 2
    const x = center + (axis.value / 100) * chartRadius * Math.cos(angle)
    const y = center + (axis.value / 100) * chartRadius * Math.sin(angle)
    return { x, y, label: axis.label, angle }
  })

  const linePath = points.map((p) => `${p.x},${p.y}`).join(' ')

  return (
    <div className="flex flex-col items-center justify-center bg-gray-900/20 p-4 rounded-2xl border border-white/5">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
        {[0.2, 0.4, 0.6, 0.8, 1].map((tick) => (
          <circle
            key={tick}
            cx={center}
            cy={center}
            r={chartRadius * tick}
            fill="none"
            className="stroke-gray-700/50"
            strokeWidth="1"
            strokeDasharray="4 4"
          />
        ))}

        {points.map((p, i) => (
          <line
            key={i}
            x1={center}
            y1={center}
            x2={center + chartRadius * Math.cos(p.angle)}
            y2={center + chartRadius * Math.sin(p.angle)}
            className="stroke-gray-700"
            strokeWidth="1"
          />
        ))}

        <motion.polygon
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          points={linePath}
          className="fill-emerald-500/30 stroke-emerald-500"
          strokeWidth="2"
        />

        {points.map((p, i) => (
          <text
            key={i}
            x={center + (chartRadius + 15) * Math.cos(p.angle)}
            y={center + (chartRadius + 15) * Math.sin(p.angle)}
            textAnchor="middle"
            alignmentBaseline="middle"
            className="fill-gray-400 text-[10px] font-medium uppercase tracking-wider"
          >
            {p.label}
          </text>
        ))}
      </svg>
    </div>
  )
}
