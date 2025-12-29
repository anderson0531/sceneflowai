'use client'

import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useSession } from 'next-auth/react'

export function CueCommandBar() {
  const { data: session } = useSession()
  
  // Get user's first name from session
  // If name looks like a username (no spaces, matches email prefix), use a friendly fallback
  const userName = useMemo(() => {
    const name = session?.user?.name
    const email = session?.user?.email
    
    // If we have a proper name with spaces, use the first part
    if (name && name.includes(' ')) {
      return name.split(' ')[0]
    }
    
    // If name equals email prefix (username fallback from auth), try to make it friendlier
    const emailPrefix = email?.split('@')[0]
    if (name && name === emailPrefix) {
      // Known user mapping for existing accounts without first_name in DB
      const knownUsers: Record<string, string> = {
        'anderson0531': 'Brian',
      }
      if (knownUsers[name]) {
        return knownUsers[name]
      }
    }
    
    // Use whatever name we have
    if (name) {
      return name.split(' ')[0]
    }
    
    return 'there'
  }, [session?.user?.name, session?.user?.email])

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-gradient-to-r from-gray-900/95 to-gray-800/95 backdrop-blur-sm rounded-xl border border-indigo-500/20 shadow-lg p-6"
    >
      <h2 className="text-2xl font-semibold text-white">
        Welcome back, <span className="text-indigo-400">{userName}</span>
      </h2>
    </motion.div>
  )
}

export default CueCommandBar
