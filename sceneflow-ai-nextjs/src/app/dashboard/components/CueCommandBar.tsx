'use client'

import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'

/**
 * Compact welcome header with a single primary CTA.
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

  const userInitial = userName.charAt(0).toUpperCase()

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-gray-800/60 backdrop-blur-md rounded-xl border border-gray-700/50 shadow-lg px-5 py-4"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <motion.div className="w-11 h-11 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm shadow-lg shrink-0">
            {userInitial}
          </motion.div>
          <div>
            <h1 className="text-lg font-semibold text-white">
              Welcome back, <span className="text-indigo-400">{userName}</span>
            </h1>
            <p className="text-sm text-gray-400">
              Your production hub — resume a project or start something new.
            </p>
          </div>
        </div>

        <Link href="/dashboard/studio/new-project" className="shrink-0">
          <Button className="w-full sm:w-auto bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-md">
            <Plus className="w-4 h-4 mr-2" />
            New project
          </Button>
        </Link>
      </div>
    </motion.div>
  )
}

export default CueCommandBar
