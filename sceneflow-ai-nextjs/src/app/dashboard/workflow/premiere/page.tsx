'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function PremiereRedirect() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/dashboard/workflow/final-cut?tab=screening')
  }, [router])
  return null
}
