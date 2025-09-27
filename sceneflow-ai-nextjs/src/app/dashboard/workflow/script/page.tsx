'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ScriptRedirect() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/dashboard/studio/new-project?tab=script')
  }, [router])
  return null
}
