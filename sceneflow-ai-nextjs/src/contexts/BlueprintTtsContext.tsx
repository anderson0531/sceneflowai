'use client'

import React, { createContext, useContext } from 'react'
import { useBlueprintTts } from '@/hooks/useBlueprintTts'

type BlueprintTtsContextValue = ReturnType<typeof useBlueprintTts>

const BlueprintTtsContext = createContext<BlueprintTtsContextValue | null>(null)

export function BlueprintTtsProvider({ children }: { children: React.ReactNode }) {
  const value = useBlueprintTts()
  return <BlueprintTtsContext.Provider value={value}>{children}</BlueprintTtsContext.Provider>
}

export function useBlueprintTtsContext(): BlueprintTtsContextValue {
  const ctx = useContext(BlueprintTtsContext)
  if (!ctx) {
    throw new Error('useBlueprintTtsContext must be used within BlueprintTtsProvider')
  }
  return ctx
}
