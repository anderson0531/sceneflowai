'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

interface AnimatedScoreProps {
  /** The target score to animate to */
  value: number
  /** Duration of animation in ms (default: 800) */
  duration?: number
  /** CSS class for the score number */
  className?: string
  /** Easing function (default: easeOutCubic) */
  easing?: 'linear' | 'easeOut' | 'easeOutCubic' | 'easeInOutCubic'
  /** Delay before animation starts in ms (default: 0) */
  delay?: number
  /** Whether to animate on first render (default: true) */
  animateOnMount?: boolean
}

// Easing functions
const easings = {
  linear: (t: number) => t,
  easeOut: (t: number) => 1 - Math.pow(1 - t, 2),
  easeOutCubic: (t: number) => 1 - Math.pow(1 - t, 3),
  easeInOutCubic: (t: number) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
}

/**
 * AnimatedScore: Smoothly animates a number from its previous value to the new value.
 * Prevents the jarring "flash" of stale scores by turning abrupt changes into polished transitions.
 * 
 * Usage:
 *   <AnimatedScore value={80} className="text-5xl font-bold text-green-500" />
 */
export function AnimatedScore({
  value,
  duration = 800,
  className = '',
  easing = 'easeOutCubic',
  delay = 0,
  animateOnMount = true,
}: AnimatedScoreProps) {
  const [displayValue, setDisplayValue] = useState(animateOnMount ? 0 : value)
  const previousValueRef = useRef<number>(animateOnMount ? 0 : value)
  const animationFrameRef = useRef<number | null>(null)
  const startTimeRef = useRef<number | null>(null)
  const isFirstRender = useRef(true)

  const animate = useCallback(
    (from: number, to: number) => {
      // Cancel any in-flight animation
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current)
      }

      // Skip animation if values are the same
      if (from === to) {
        setDisplayValue(to)
        return
      }

      startTimeRef.current = null

      const step = (timestamp: number) => {
        if (startTimeRef.current === null) {
          startTimeRef.current = timestamp
        }

        const elapsed = timestamp - startTimeRef.current
        const progress = Math.min(elapsed / duration, 1)
        const easedProgress = easings[easing](progress)

        const current = Math.round(from + (to - from) * easedProgress)
        setDisplayValue(current)

        if (progress < 1) {
          animationFrameRef.current = requestAnimationFrame(step)
        } else {
          setDisplayValue(to)
          animationFrameRef.current = null
        }
      }

      animationFrameRef.current = requestAnimationFrame(step)
    },
    [duration, easing]
  )

  useEffect(() => {
    const prev = previousValueRef.current

    if (isFirstRender.current) {
      isFirstRender.current = false
      if (animateOnMount) {
        const timeoutId = setTimeout(() => animate(0, value), delay)
        return () => clearTimeout(timeoutId)
      } else {
        setDisplayValue(value)
        previousValueRef.current = value
        return
      }
    }

    // Value changed after initial render — animate the transition
    if (prev !== value) {
      const timeoutId = setTimeout(() => animate(prev, value), delay)
      previousValueRef.current = value
      return () => clearTimeout(timeoutId)
    }
  }, [value, animate, delay, animateOnMount])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  return <span className={className}>{displayValue}</span>
}

/**
 * AnimatedProgressBar: Smoothly animates a progress bar width.
 * Pairs with AnimatedScore for a cohesive animated score card experience.
 */
interface AnimatedProgressBarProps {
  /** Target percentage (0-100) */
  value: number
  /** Duration of animation in ms (default: 1000) */
  duration?: number
  /** Color class based on score tier */
  colorClass: string
  /** Height class (default: h-3) */
  heightClass?: string
  /** Delay before animation starts in ms (default: 200) */
  delay?: number
}

export function AnimatedProgressBar({
  value,
  duration = 1000,
  colorClass,
  heightClass = 'h-3',
  delay = 200,
}: AnimatedProgressBarProps) {
  const [width, setWidth] = useState(0)
  const previousValueRef = useRef(0)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Clear any pending timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      setWidth(value)
      previousValueRef.current = value
    }, delay)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [value, delay])

  return (
    <div
      className={`${heightClass} rounded-full ${colorClass}`}
      style={{ 
        width: `${width}%`,
        transition: `width ${duration}ms cubic-bezier(0.33, 1, 0.68, 1)`,
      }}
    />
  )
}
