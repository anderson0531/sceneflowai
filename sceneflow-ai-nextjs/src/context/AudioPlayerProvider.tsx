'use client'

import React, { createContext, useContext } from 'react';
import useAudioPlayer, { Track } from '../hooks/useAudioPlayer';

type AudioPlayerContext = ReturnType<typeof useAudioPlayer> | null;

const Context = createContext<AudioPlayerContext>(null);

export function AudioPlayerProvider({ children }: { children: React.ReactNode }) {
  const player = useAudioPlayer();
  return <Context.Provider value={player}>{children}</Context.Provider>;
}

export function useAudioPlayerContext() {
  const ctx = useContext(Context);
  if (!ctx) throw new Error('useAudioPlayerContext must be used inside AudioPlayerProvider');
  return ctx;
}

export type { Track };

export default AudioPlayerProvider;
