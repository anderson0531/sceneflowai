'use client'

import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Plus, Library, FileText } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { STUDIO_DISPLAY_NAMES } from '@/constants/studioDisplayNames'

function getTimeAwareGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export interface CueCommandBarProps {
  onImportScript?: () => void
}

/**
 * Hero-style welcome header with launchpad CTAs for Film Blueprint, Series Bible, and Script Import.
 */
export function CueCommandBar({ onImportScript }: CueCommandBarProps = {}) {
  const { data: session } = useSession()

  const userName = useMemo(() => {
    const name = session?.user?.name
    const email = session?.user?.email

    if (name && name.includes(' ')) {
      return name.split(' ')[0]
    }

    const emailPrefix = email?.split('@')[0]
    if (name && name === emailPrefix) {
      const knownUsers: Record<string, string> = {
        anderson0531: 'Brian',
      }
      if (knownUsers[name]) {
        return knownUsers[name]
      }
    }

    if (name) {
      return name.split(' ')[0]
    }

    return 'there'
  }, [session?.user?.name, session?.user?.email])

  const greeting = useMemo(() => getTimeAwareGreeting(), [])
  const userInitial = userName.charAt(0).toUpperCase()

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative isolate overflow-hidden rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-gray-900/95 via-gray-800/90 to-gray-900/95 px-6 py-5 shadow-2xl backdrop-blur-sm md:px-8 md:py-6"
    >
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-indigo-600/20 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-purple-600/15 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.05 }}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-base font-semibold text-white shadow-lg shadow-indigo-500/25 md:h-14 md:w-14 md:text-lg"
          >
            {userInitial}
          </motion.div>
          <div>
            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl"
            >
              {greeting},{' '}
              <span className="bg-gradient-to-r from-indigo-300 via-purple-300 to-cyan-300 bg-clip-text text-transparent">
                {userName}
              </span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mt-1 max-w-xl text-sm text-gray-300 sm:text-base"
            >
              Start a standalone film blueprint, build a multi-episode series bible, or resume production.
            </motion.p>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="flex flex-wrap items-center gap-2.5 shrink-0"
        >
          {onImportScript && (
            <Button
              type="button"
              variant="outline"
              onClick={onImportScript}
              className="border-gray-600/80 text-gray-200 hover:bg-gray-800 hover:text-white"
            >
              <FileText className="mr-2 h-4 w-4 text-cyan-400" />
              Import Script
            </Button>
          )}
          <Link href="/dashboard/series">
            <Button
              variant="outline"
              className="border-indigo-500/40 bg-indigo-500/10 text-indigo-200 hover:bg-indigo-500/20 hover:text-white"
            >
              <Library className="mr-2 h-4 w-4 text-indigo-300" />
              {STUDIO_DISPLAY_NAMES.series}
            </Button>
          </Link>
          <Link href="/dashboard/studio/new-project">
            <Button variant="primary" className="shadow-md shadow-indigo-500/20">
              <Plus className="mr-2 h-4 w-4" />
              New Project
            </Button>
          </Link>
        </motion.div>
      </div>
    </motion.div>
  )
}

export default CueCommandBar
