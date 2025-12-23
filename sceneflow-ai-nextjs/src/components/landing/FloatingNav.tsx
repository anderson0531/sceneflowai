'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  AlertTriangle, 
  Shield, 
  Target, 
  Layers, 
  Film, 
  DollarSign, 
  HelpCircle,
  Cpu,
  Users,
  Sparkles
} from 'lucide-react'

const sections = [
  { id: 'problem', label: 'Problem', icon: AlertTriangle },
  { id: 'solution', label: 'Solution', icon: Shield },
  { id: 'precision', label: 'Precision', icon: Target },
  { id: 'platform', label: 'Platform', icon: Layers },
  { id: 'how-it-works', label: 'Workflow', icon: Sparkles },
  { id: 'architecture', label: 'Tech', icon: Cpu },
  { id: 'features', label: 'Features', icon: Film },
  { id: 'creators', label: 'Creators', icon: Users },
  { id: 'pricing', label: 'Pricing', icon: DollarSign },
  { id: 'faq', label: 'FAQ', icon: HelpCircle },
]

export function FloatingNav() {
  const [activeSection, setActiveSection] = useState('')
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      // Show after scrolling past hero section (approximately 600px)
      setIsVisible(window.scrollY > 600)
      
      // Detect active section
      for (const section of sections) {
        const el = document.getElementById(section.id)
        if (el) {
          const rect = el.getBoundingClientRect()
          // Check if section is in viewport (with some offset for better UX)
          if (rect.top <= 200 && rect.bottom >= 200) {
            setActiveSection(section.id)
            break
          }
        }
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll() // Check initial state
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.nav
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.3 }}
          className="fixed right-4 top-1/2 -translate-y-1/2 z-40 hidden xl:flex flex-col gap-1.5"
        >
          {/* Background pill */}
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-700/50 -m-2" />
          
          {sections.map(({ id, label, icon: Icon }) => {
            const isActive = activeSection === id
            
            return (
              <button
                key={id}
                onClick={() => scrollToSection(id)}
                className={`relative group flex items-center gap-2 p-2.5 rounded-xl transition-all duration-200 z-10 ${
                  isActive
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-lg shadow-amber-500/20'
                    : 'text-gray-400 hover:text-white hover:bg-slate-800/80'
                }`}
                title={label}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                
                {/* Expandable label on hover */}
                <span 
                  className={`text-xs font-medium whitespace-nowrap overflow-hidden transition-all duration-200 ${
                    isActive ? 'w-14 opacity-100' : 'w-0 opacity-0 group-hover:w-14 group-hover:opacity-100'
                  }`}
                >
                  {label}
                </span>
              </button>
            )
          })}
          
          {/* Scroll progress indicator */}
          <div className="mt-2 mx-auto w-1 h-12 bg-slate-700/50 rounded-full overflow-hidden relative z-10">
            <motion.div
              className="w-full bg-gradient-to-b from-amber-500 to-orange-500 rounded-full"
              style={{
                height: '100%',
                scaleY: 0,
                originY: 0,
              }}
              animate={{
                scaleY: typeof window !== 'undefined' 
                  ? Math.min(1, window.scrollY / (document.documentElement.scrollHeight - window.innerHeight))
                  : 0
              }}
              transition={{ duration: 0.1 }}
            />
          </div>
        </motion.nav>
      )}
    </AnimatePresence>
  )
}

export default FloatingNav
