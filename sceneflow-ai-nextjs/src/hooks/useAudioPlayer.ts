'use client'

import { useCallback, useEffect, useRef, useState } from 'react';

export type Track = {
  id?: string | number;
  url: string;
  title?: string;
  type?: 'music' | 'dialogue' | 'narration' | 'sfx' | string;
  meta?: Record<string, any>;
};

export function useAudioPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const queueRef = useRef<Track[]>([]);
  const indexRef = useRef<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [current, setCurrent] = useState<Track | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!audioRef.current) audioRef.current = new Audio();
    const audio = audioRef.current;

    const onEnded = () => {
      setIsPlaying(false);
      playNext();
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onError = () => {
      const mediaError = audio.error;
      const msg = mediaError ? `Code ${mediaError.code}` : 'Unknown audio error';
      console.error('Audio error', msg, current);
      setError(msg);
      // advance so queue doesn't hang on a bad file
      playNext();
    };

    audio.addEventListener('ended', onEnded);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('error', onError);
      audio.pause();
      audioRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadPlaylist = useCallback((tracks: Track[], startIndex = 0) => {
    if (!Array.isArray(tracks)) tracks = [];
    queueRef.current = tracks.slice();
    indexRef.current = Math.min(Math.max(0, startIndex), Math.max(0, queueRef.current.length - 1));
    setError(null);
    if (queueRef.current.length > 0) {
      const t = queueRef.current[indexRef.current];
      setCurrent(t);
      if (audioRef.current) {
        audioRef.current.src = t.url;
        audioRef.current.load();
      }
    } else {
      setCurrent(null);
      if (audioRef.current) {
        audioRef.current.src = '';
        audioRef.current.load();
      }
    }
  }, []);

  const play = useCallback(async () => {
    if (!audioRef.current) return;
    try {
      await audioRef.current.play();
      setIsPlaying(true);
    } catch (err: any) {
      console.warn('Playback failed', err);
      setError(String(err?.message || err));
    }
  }, []);

  const pause = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    setIsPlaying(false);
  }, []);

  const playNext = useCallback(() => {
    const q = queueRef.current;
    if (!q || q.length === 0) {
      setCurrent(null);
      setIsPlaying(false);
      return;
    }
    if (indexRef.current + 1 < q.length) {
      indexRef.current += 1;
      const t = q[indexRef.current];
      setCurrent(t);
      if (audioRef.current) {
        audioRef.current.src = t.url;
        audioRef.current.load();
        audioRef.current.play().catch((e) => console.warn('Auto-play next failed', e));
      }
    } else {
      // end of queue
      setIsPlaying(false);
      setCurrent(null);
      indexRef.current = 0;
      queueRef.current = [];
      if (audioRef.current) audioRef.current.src = '';
    }
  }, []);

  const playPrev = useCallback(() => {
    const q = queueRef.current;
    if (!q || q.length === 0) return;
    if (indexRef.current - 1 >= 0) {
      indexRef.current -= 1;
      const t = q[indexRef.current];
      setCurrent(t);
      if (audioRef.current) {
        audioRef.current.src = t.url;
        audioRef.current.load();
        audioRef.current.play().catch(() => {});
      }
    }
  }, []);

  const playSingle = useCallback(async (track: Track) => {
    queueRef.current = [track];
    indexRef.current = 0;
    setCurrent(track);
    setError(null);
    if (audioRef.current) {
      audioRef.current.src = track.url;
      audioRef.current.load();
      try {
        await audioRef.current.play();
      } catch (err: any) {
        console.warn('playSingle failed', err);
        setError(String(err?.message || err));
      }
    }
  }, []);

  const getQueue = useCallback(() => queueRef.current.slice(), []);

  return {
    audioEl: audioRef.current,
    current,
    isPlaying,
    error,
    loadPlaylist,
    play,
    pause,
    playNext,
    playPrev,
    playSingle,
    getQueue,
  };
}

export default useAudioPlayer;
