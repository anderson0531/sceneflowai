'use client'

import Image from 'next/image'

type Props = {
  title: string
  logline?: string
  heroImageUrl?: string
  genre?: string
}

export function BlueprintReviewHero({ title, logline, heroImageUrl, genre }: Props) {
  const initial = (title || genre || 'B').trim().charAt(0).toUpperCase() || 'B'

  return (
    <div className="relative w-full aspect-[21/9] min-h-[140px] max-h-[280px] rounded-2xl overflow-hidden border border-gray-800/80 shadow-xl shadow-black/40">
      {heroImageUrl ? (
        <Image src={heroImageUrl} alt="" fill className="object-cover" unoptimized priority />
      ) : (
        <div
          className="absolute inset-0 bg-gradient-to-br from-purple-900/50 via-slate-900 to-gray-950"
          aria-hidden
        />
      )}
      <div
        className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/70 to-transparent"
        aria-hidden
      />
      {!heroImageUrl && (
        <div className="absolute top-4 right-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-500/20 border border-purple-400/30 text-2xl font-bold text-purple-200">
          {initial}
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6">
        <h1 className="sf-page-title drop-shadow-lg">{title}</h1>
        {logline?.trim() ? (
          <p className="mt-2 text-lg text-gray-200/95 italic leading-relaxed max-w-3xl drop-shadow-md">
            {logline}
          </p>
        ) : null}
      </div>
    </div>
  )
}
