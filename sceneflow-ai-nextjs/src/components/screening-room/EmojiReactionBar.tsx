/**
 * Timeline Emoji Reaction Bar
 * 
 * Floating emoji bar overlaid on the video player.
 * Allows viewers to react at any moment during playback.
 * 
 * Features:
 * - Floats above the video controls
 * - Disappears when controls hide
 * - Visual feedback on selection
 * - Logs timestamp + reaction type
 * 
 * @see /src/lib/types/behavioralAnalytics.ts for reaction types
 */

'use client'

import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  TIMELINE_EMOJIS, 
  type TimelineReactionType 
} from '@/lib/types/behavioralAnalytics'

// ============================================================================
// Types
// ============================================================================

interface EmojiReactionBarProps {
  /** Current video timestamp */
  currentTime: number
  /** Whether the bar is visible */
  visible: boolean
  /** Callback when a reaction is selected */
  onReaction: (timestamp: number, reactionType: TimelineReactionType, emoji: string) => void
  /** Compact mode for mobile */
  compact?: boolean
  /** Position of the bar */
  position?: 'top' | 'bottom'
}

// ============================================================================
// Component
// ============================================================================

export function EmojiReactionBar({
  currentTime,
  visible,
  onReaction,
  compact = false,
  position = 'bottom',
}: EmojiReactionBarProps) {
  const [recentReaction, setRecentReaction] = useState<TimelineReactionType | null>(null)
  const [showFeedback, setShowFeedback] = useState(false)
  
  // ============================================================================
  // Handlers
  // ============================================================================
  
  const handleReaction = useCallback((type: TimelineReactionType) => {
    const config = TIMELINE_EMOJIS[type]
    
    onReaction(currentTime, type, config.emoji)
    
    // Show feedback animation
    setRecentReaction(type)
    setShowFeedback(true)
    
    setTimeout(() => {
      setShowFeedback(false)
      setRecentReaction(null)
    }, 1000)
  }, [currentTime, onReaction])
  
  // ============================================================================
  // Render
  // ============================================================================
  
  const positionClasses = position === 'top' 
    ? 'top-4' 
    : 'bottom-20' // Above controls
  
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: position === 'top' ? -20 : 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: position === 'top' ? -20 : 20 }}
          transition={{ duration: 0.2 }}
          className={`absolute ${positionClasses} left-1/2 -translate-x-1/2 z-30`}
        >
          <div className={`
            flex items-center gap-1 
            ${compact ? 'p-1' : 'p-2'} 
            bg-black/70 backdrop-blur-md rounded-full 
            border border-white/10
            shadow-lg
          `}>
            {/* Emoji Buttons */}
            {(Object.entries(TIMELINE_EMOJIS) as [TimelineReactionType, typeof TIMELINE_EMOJIS[TimelineReactionType]][]).map(
              ([type, config]) => (
                <motion.button
                  key={type}
                  onClick={() => handleReaction(type)}
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                  className={`
                    relative flex items-center justify-center
                    ${compact ? 'w-8 h-8 text-lg' : 'w-10 h-10 text-xl'}
                    rounded-full
                    hover:bg-white/10
                    transition-colors
                    ${recentReaction === type ? 'bg-white/20' : ''}
                  `}
                  title={config.label}
                >
                  <span>{config.emoji}</span>
                  
                  {/* Feedback Animation */}
                  <AnimatePresence>
                    {showFeedback && recentReaction === type && (
                      <motion.span
                        initial={{ scale: 1, opacity: 1, y: 0 }}
                        animate={{ scale: 2, opacity: 0, y: -20 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5 }}
                        className="absolute text-2xl pointer-events-none"
                      >
                        {config.emoji}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
              )
            )}
          </div>
          
          {/* Label */}
          {!compact && (
            <div className="text-center mt-1">
              <span className="text-xs text-white/50">
                React to this moment
              </span>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ============================================================================
// Compact Inline Version
// ============================================================================

interface InlineEmojiReactionProps {
  currentTime: number
  onReaction: (timestamp: number, reactionType: TimelineReactionType, emoji: string) => void
}

export function InlineEmojiReaction({ currentTime, onReaction }: InlineEmojiReactionProps) {
  const handleClick = (type: TimelineReactionType) => {
    const config = TIMELINE_EMOJIS[type]
    onReaction(currentTime, type, config.emoji)
  }
  
  return (
    <div className="flex items-center gap-1 px-2">
      {(Object.entries(TIMELINE_EMOJIS) as [TimelineReactionType, typeof TIMELINE_EMOJIS[TimelineReactionType]][]).map(
        ([type, config]) => (
          <button
            key={type}
            onClick={() => handleClick(type)}
            className="p-1 rounded hover:bg-white/10 transition-colors"
            title={config.label}
          >
            <span className="text-sm">{config.emoji}</span>
          </button>
        )
      )}
    </div>
  )
}

export default EmojiReactionBar
