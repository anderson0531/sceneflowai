'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function OutlineRedirect() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/dashboard/studio/new-project?tab=outline')
  }, [router])
  return null
}
