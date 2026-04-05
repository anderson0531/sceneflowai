'use client'

import { motion } from 'framer-motion'

interface Axis {
  label: string
  value: number // 0 to 100
}

interface RadarChartProps {
  data: Axis[]
  size?: number
  /** When true, shows the numeric score plus label at each axis (needs more canvas padding). */
  showScores?: boolean
}

export function RadarChart({ data, size = 300, showScores = false }: RadarChartProps) {
  const R = size / 2
  const center = R
  const padding = showScores ? 56 : 40
  const chartRadius = R - padding
  const labelRadius = chartRadius + (showScores ? 40 : 15)

  const points = data.map((axis, i) => {
    const angle = (Math.PI * 2 * i) / data.length - Math.PI / 2
    const x = center + (axis.value / 100) * chartRadius * Math.cos(angle)
    const y = center + (axis.value / 100) * chartRadius * Math.sin(angle)
    return { x, y, label: axis.label, angle, value: axis.value }
  })

  const linePath = points.map((p) => `${p.x},${p.y}`).join(' ')

  return (
    <div className="flex flex-col items-center justify-center bg-gray-900/20 p-4 sm:p-6 rounded-2xl border border-white/5 w-full">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full max-w-[min(100%,420px)] aspect-square overflow-visible"
        aria-label="Radar chart of viability dimensions"
      >
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
          <circle
            key={`vertex-${i}`}
            cx={p.x}
            cy={p.y}
            r={showScores ? 4 : 3}
            className="fill-emerald-400 stroke-gray-950"
            strokeWidth={1.5}
          />
        ))}

        {points.map((p, i) => {
          const lx = center + labelRadius * Math.cos(p.angle)
          const ly = center + labelRadius * Math.sin(p.angle)
          if (showScores) {
            const display = Math.round(Math.min(100, Math.max(0, p.value)))
            return (
              <text
                key={i}
                x={lx}
                y={ly}
                textAnchor="middle"
                dominantBaseline="middle"
              >
                <tspan
                  x={lx}
                  dy="-8"
                  className="fill-emerald-300 text-[13px] font-bold"
                  style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}
                >
                  {display}
                </tspan>
                <tspan
                  x={lx}
                  dy="16"
                  className="fill-gray-400 text-[8px] font-semibold uppercase tracking-wider"
                  style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}
                >
                  {p.label}
                </tspan>
              </text>
            )
          }
          return (
            <text
              key={i}
              x={lx}
              y={ly}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-gray-400 text-[10px] font-medium uppercase tracking-wider"
            >
              {p.label}
            </text>
          )
        })}
      </svg>
    </div>
  )
}
