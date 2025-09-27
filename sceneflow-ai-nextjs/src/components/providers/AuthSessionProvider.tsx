'use client'

import { ReactNode } from 'react'
import { SessionProvider } from 'next-auth/react'

export default function AuthSessionProvider({ children }: { children: ReactNode }) {
  // Wrap next-auth SessionProvider; loosen types to avoid strict prop complaints in some TS configs
  return (
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    <SessionProvider>{children}</SessionProvider>
  )
}



