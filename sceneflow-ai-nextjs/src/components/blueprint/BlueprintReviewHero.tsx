'use client'

type Props = {
  title: string
  logline?: string
  heroImageUrl?: string
  genre?: string
}

export function BlueprintReviewHero({ title, logline, heroImageUrl }: Props) {
  return (
    <div className="relative w-full aspect-[16/9] min-h-[220px] sm:min-h-[300px] max-h-[min(58vh,520px)] rounded-2xl overflow-hidden border border-gray-800/80 shadow-xl shadow-black/40">
      {heroImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- blob/CDN URLs; avoids Image domain edge cases on share links
        <img
          src={heroImageUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-center"
          loading="eager"
          decoding="async"
        />
      ) : (
        <div
          className="absolute inset-0 bg-gradient-to-br from-purple-900/50 via-slate-900 to-gray-950"
          aria-hidden
        />
      )}
      {/* Legibility scrim — bottom band only so the hero art stays visible above */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[42%] sm:h-[38%] bg-gradient-to-t from-gray-950 via-gray-950/55 to-transparent"
        aria-hidden
      />
      <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6">
        <h1 className="sf-page-title drop-shadow-lg">{title}</h1>
        {logline?.trim() ? (
          <p className="mt-2 text-base sm:text-lg text-gray-200/95 italic leading-relaxed max-w-3xl drop-shadow-md line-clamp-3">
            {logline}
          </p>
        ) : null}
      </div>
    </div>
  )
}
