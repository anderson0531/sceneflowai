'use client'

import { useState, useEffect, createContext, useContext, ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, Microscope } from 'lucide-react'

// Content Depth Context
type ContentDepth = 'quick' | 'detailed'

interface ContentDepthContextType {
  depth: ContentDepth
  setDepth: (depth: ContentDepth) => void
}

const ContentDepthContext = createContext<ContentDepthContextType>({
  depth: 'quick',
  setDepth: () => {},
})

export const useContentDepth = () => useContext(ContentDepthContext)

// Provider component to wrap the app
export function ContentDepthProvider({ children }: { children: ReactNode }) {
  const [depth, setDepth] = useState<ContentDepth>('quick')
  
  return (
    <ContentDepthContext.Provider value={{ depth, setDepth }}>
      {children}
    </ContentDepthContext.Provider>
  )
}

// Floating toggle component
export function ContentDepthToggle() {
  const { depth, setDepth } = useContentDepth()
  const [isVisible, setIsVisible] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      // Show after scrolling past hero (approximately 600px)
      setIsVisible(window.scrollY > 600)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.3 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <div className="bg-slate-900/95 backdrop-blur-md rounded-full p-1.5 border border-slate-700/50 shadow-xl shadow-black/20">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setDepth('quick')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-200 ${
                  depth === 'quick'
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-lg'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Zap className="w-4 h-4" />
                <span className={`transition-all duration-200 ${isHovered || depth === 'quick' ? 'w-auto opacity-100' : 'w-0 opacity-0 overflow-hidden'}`}>
                  Quick View
                </span>
              </button>
              
              <button
                onClick={() => setDepth('detailed')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-200 ${
                  depth === 'detailed'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-black shadow-lg'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Microscope className="w-4 h-4" />
                <span className={`transition-all duration-200 ${isHovered || depth === 'detailed' ? 'w-auto opacity-100' : 'w-0 opacity-0 overflow-hidden'}`}>
                  Deep Dive
                </span>
              </button>
            </div>
          </div>
          
          {/* Tooltip */}
          <AnimatePresence>
            {isHovered && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-slate-800 rounded-lg text-xs text-gray-300 whitespace-nowrap border border-slate-700"
              >
                {depth === 'quick' ? 'Showing essentials' : 'Showing technical details'}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Conditional content component for use in sections
interface ConditionalContentProps {
  quick: ReactNode
  detailed: ReactNode
}

export function ConditionalContent({ quick, detailed }: ConditionalContentProps) {
  const { depth } = useContentDepth()
  
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={depth}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3 }}
      >
        {depth === 'quick' ? quick : detailed}
      </motion.div>
    </AnimatePresence>
  )
}

// Show only in quick mode
export function QuickOnly({ children }: { children: ReactNode }) {
  const { depth } = useContentDepth()
  
  if (depth !== 'quick') return null
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {children}
    </motion.div>
  )
}

// Show only in detailed mode
export function DetailedOnly({ children }: { children: ReactNode }) {
  const { depth } = useContentDepth()
  
  if (depth !== 'detailed') return null
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {children}
    </motion.div>
  )
}

export default ContentDepthToggle
