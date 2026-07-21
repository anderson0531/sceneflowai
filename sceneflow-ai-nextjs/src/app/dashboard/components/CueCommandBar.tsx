'use client'

import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'

function getTimeAwareGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

/**
 * Hero-style welcome header with a single primary CTA.
 */
export function CueCommandBar() {
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
      className="relative isolate overflow-hidden rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-gray-900/95 via-gray-800/90 to-gray-900/95 px-6 py-6 shadow-2xl backdrop-blur-sm md:px-8 md:py-8"
    >
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-indigo-600/20 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-purple-600/15 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4 md:gap-5">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.05 }}
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-lg font-semibold text-white shadow-lg shadow-indigo-500/25 md:h-16 md:w-16 md:text-xl"
          >
            {userInitial}
          </motion.div>
          <div>
            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl"
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
              className="mt-2 max-w-xl text-base text-gray-300 sm:text-lg"
            >
              Your studio is ready — pick up where you left off or start something new.
            </motion.p>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="shrink-0"
        >
          <Link href="/dashboard/studio/new-project">
            <Button variant="primary" className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              New project
            </Button>
          </Link>
        </motion.div>
      </div>
    </motion.div>
  )
}

export default CueCommandBar
