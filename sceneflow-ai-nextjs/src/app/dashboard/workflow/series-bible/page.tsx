'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function SeriesBibleRedirect() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/dashboard/studio/new-project?tab=series-bible')
  }, [router])
  return null
}
