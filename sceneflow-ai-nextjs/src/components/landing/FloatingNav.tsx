'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Layers, Rocket, Workflow, DollarSign } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useExpandLandingSection } from '@/components/landing/LandingSectionCollapse'

export function FloatingNav() {
  const t = useTranslations('floatingNav')
  const sections = useMemo(
    () => [
      { id: 'pipeline', label: t('pipeline'), icon: Layers },
      { id: 'use-cases', label: t('useCases'), icon: Rocket },
      { id: 'how-it-works', label: t('howItWorks'), icon: Workflow },
      { id: 'pricing', label: t('pricing'), icon: DollarSign },
    ],
    [t]
  )
  const expandSection = useExpandLandingSection()
  const [activeSection, setActiveSection] = useState('')
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > 600)

      for (const section of sections) {
        const el = document.getElementById(section.id)
        if (el) {
          const rect = el.getBoundingClientRect()
          if (rect.top <= 200 && rect.bottom >= 200) {
            setActiveSection(section.id)
            break
          }
        }
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [sections])

  const scrollToSection = (sectionId: string) => {
    expandSection(sectionId)
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' })
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
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-700/50 -m-2" />

          {sections.map(({ id, label, icon: Icon }) => {
            const isActive = activeSection === id

            return (
              <button
                key={id}
                onClick={() => scrollToSection(id)}
                className={`relative group flex items-center gap-2 p-2.5 rounded-xl transition-all duration-200 z-10 ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/20'
                    : 'text-gray-400 hover:text-white hover:bg-slate-800/80'
                }`}
                title={label}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />

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

          <div className="mt-2 mx-auto w-1 h-12 bg-slate-700/50 rounded-full overflow-hidden relative z-10">
            <motion.div
              className="w-full bg-gradient-to-b from-indigo-500 to-purple-500 rounded-full"
              style={{
                height: '100%',
                scaleY: 0,
                originY: 0,
              }}
              animate={{
                scaleY:
                  typeof window !== 'undefined'
                    ? Math.min(
                        1,
                        window.scrollY /
                          (document.documentElement.scrollHeight - window.innerHeight)
                      )
                    : 0,
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
