'use client'

type Props = {
  title: string
  logline?: string
  heroImageUrl?: string
  genre?: string
}

export function BlueprintReviewHero({ title, logline, heroImageUrl }: Props) {
  return (
    <div className="relative w-full aspect-[21/9] min-h-[140px] max-h-[280px] rounded-2xl overflow-hidden border border-gray-800/80 shadow-xl shadow-black/40">
      {heroImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- blob/CDN URLs; avoids Image domain edge cases on share links
        <img
          src={heroImageUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          loading="eager"
          decoding="async"
        />
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
