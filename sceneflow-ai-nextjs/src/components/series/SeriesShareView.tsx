'use client'

import { useEffect, useRef, useState } from 'react'
import { BookOpen, Loader2, Pause, Play } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PublicSeriesShare } from '@/lib/series/publicShare'

type TabId = 'overview' | 'episodes' | 'cast'

function ListenButton({
  token,
  section,
  episodeNumber,
}: {
  token: string
  section: 'overview' | 'episode'
  episodeNumber?: number
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [busy, setBusy] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      audioRef.current?.pause()
      audioRef.current = null
    }
  }, [section, episodeNumber])

  const stop = () => {
    audioRef.current?.pause()
    audioRef.current = null
    setPlaying(false)
  }

  const play = async () => {
    if (playing) {
      stop()
      return
    }
    setBusy(true)
    setError(null)
    try {
      const response = await fetch(`/api/series/share/${encodeURIComponent(token)}/narration`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section, episodeNumber }),
      })
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string }
        throw new Error(data.error || 'Could not play this section')
      }
      const contentType = response.headers.get('content-type') || ''
      const src = contentType.includes('audio')
        ? URL.createObjectURL(await response.blob())
        : ((await response.json()) as { audioUrl?: string }).audioUrl
      if (!src) throw new Error('Could not play this section')
      const audio = new Audio(src)
      audioRef.current = audio
      audio.onended = () => setPlaying(false)
      audio.onerror = () => setPlaying(false)
      await audio.play()
      setPlaying(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not play this section')
      setPlaying(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={() => void play()}
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-100 hover:bg-amber-500/20 disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
        {playing ? 'Stop' : 'Listen'}
      </button>
      {error ? <p className="max-w-[16rem] text-right text-[11px] text-red-300">{error}</p> : null}
    </div>
  )
}

export function SeriesShareView({ token, share }: { token: string; share: PublicSeriesShare }) {
  const tabs: Array<{ id: TabId; label: string }> = [
    { id: 'overview', label: 'Overview' },
    { id: 'episodes', label: `Episodes${share.episodes.length ? ` · ${share.episodes.length}` : ''}` },
    { id: 'cast', label: 'Cast' },
  ]
  const [tab, setTab] = useState<TabId>('overview')
  const [episodeNumber, setEpisodeNumber] = useState(share.episodes[0]?.episodeNumber ?? null)
  const episode = share.episodes.find((item) => item.episodeNumber === episodeNumber) ?? share.episodes[0]

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-white/10 bg-slate-950/90">
        <div className="mx-auto flex max-w-5xl flex-wrap items-start justify-between gap-4 px-4 py-8 sm:px-6">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/15">
              <BookOpen className="h-6 w-6 text-amber-300" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-300">Series Bible</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight">{share.title}</h1>
              {share.logline ? <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">{share.logline}</p> : null}
              <p className="mt-3 text-xs text-slate-500">
                {share.genre ? `${share.genre} · ` : ''}
                {share.episodes.length} episode{share.episodes.length === 1 ? '' : 's'}
              </p>
            </div>
          </div>
          {tab === 'overview' ? <ListenButton token={token} section="overview" /> : null}
          {tab === 'episodes' && episode ? (
            <ListenButton token={token} section="episode" episodeNumber={episode.episodeNumber} />
          ) : null}
        </div>
        <nav aria-label="Series review" className="mx-auto flex max-w-5xl gap-2 px-4 pb-4 sm:px-6">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              aria-current={tab === item.id ? 'page' : undefined}
              className={cn(
                'rounded-full border px-3.5 py-1.5 text-sm font-medium',
                tab === item.id
                  ? 'border-amber-300/50 bg-amber-400/15 text-amber-100'
                  : 'border-white/10 text-slate-400 hover:text-white'
              )}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {tab === 'overview' ? (
          <div className="grid gap-4">
            {share.synopsis ? (
              <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">Synopsis</h2>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-100">{share.synopsis}</p>
              </section>
            ) : null}
            {share.setting ? (
              <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">Setting</h2>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-100">{share.setting}</p>
              </section>
            ) : null}
            {share.protagonist?.name ? (
              <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">Protagonist</h2>
                <p className="mt-3 text-lg font-medium">{share.protagonist.name}</p>
                {share.protagonist.goal ? <p className="mt-1 text-sm text-slate-300">{share.protagonist.goal}</p> : null}
              </section>
            ) : null}
            {!share.synopsis && !share.setting && !share.protagonist?.name ? (
              <p className="text-sm text-slate-400">The series overview is still being written.</p>
            ) : null}
          </div>
        ) : null}

        {tab === 'episodes' ? (
          share.episodes.length === 0 || !episode ? (
            <p className="text-sm text-slate-400">Episode blueprints will appear here.</p>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
              <ol className="space-y-2">
                {share.episodes.map((item) => {
                  const current = item.episodeNumber === episode.episodeNumber
                  return (
                    <li key={item.episodeNumber}>
                      <button
                        type="button"
                        onClick={() => setEpisodeNumber(item.episodeNumber)}
                        aria-current={current ? 'true' : undefined}
                        className={cn(
                          'w-full rounded-xl border px-3 py-3 text-left',
                          current
                            ? 'border-amber-300/40 bg-amber-400/10'
                            : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                        )}
                      >
                        <p className="text-[11px] uppercase tracking-wide text-slate-500">Episode {item.episodeNumber}</p>
                        <p className="mt-1 text-sm font-medium text-white">{item.title}</p>
                      </button>
                    </li>
                  )
                })}
              </ol>
              <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                <p className="text-[11px] uppercase tracking-widest text-amber-300">Episode {episode.episodeNumber}</p>
                <h2 className="mt-2 text-2xl font-semibold">{episode.title}</h2>
                {episode.logline ? <p className="mt-3 text-sm leading-relaxed text-slate-200">{episode.logline}</p> : null}
                {episode.synopsis ? (
                  <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-slate-300">{episode.synopsis}</p>
                ) : null}
                {episode.beats.length > 0 ? (
                  <ol className="mt-6 space-y-4">
                    {episode.beats.map((beat) => (
                      <li key={`${beat.beatNumber}-${beat.title}`}>
                        <p className="text-sm font-medium text-white">
                          {beat.beatNumber > 0 ? `${beat.beatNumber}. ` : ''}
                          {beat.title}
                          {beat.act ? <span className="ml-2 text-xs text-slate-500">Act {beat.act}</span> : null}
                        </p>
                        {beat.description ? <p className="mt-1 text-sm text-slate-400">{beat.description}</p> : null}
                      </li>
                    ))}
                  </ol>
                ) : null}
                {episode.hook ? (
                  <p className="mt-6 border-t border-white/10 pt-4 text-sm text-slate-200">
                    <span className="font-medium text-amber-200">Hook. </span>
                    {episode.hook}
                  </p>
                ) : null}
              </article>
            </div>
          )
        ) : null}

        {tab === 'cast' ? (
          share.characters.length === 0 ? (
            <p className="text-sm text-slate-400">Cast will appear here.</p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {share.characters.map((character) => (
                <li key={character.name} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                  <p className="text-base font-medium">{character.name}</p>
                  <p className="mt-1 text-xs capitalize text-amber-200/80">{character.role}</p>
                  {character.description ? <p className="mt-3 text-sm leading-relaxed text-slate-300">{character.description}</p> : null}
                </li>
              ))}
            </ul>
          )
        ) : null}
      </main>
    </div>
  )
}
