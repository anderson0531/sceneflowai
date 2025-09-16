'use client'

import { Star } from 'lucide-react'

export function SocialProof() {
  const logos = ['StudioOne', 'CreatorLab', 'FilmHouse', 'EduTube']
  const stars = [1, 2, 3, 4, 5]
  return (
    <section className="py-10 bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center text-center gap-4">
          <div className="flex items-center gap-1 text-yellow-300">
            {stars.map((s) => (
              <Star key={s} className="w-4 h-4 fill-current" />
            ))}
            <span className="ml-2 text-sm text-gray-300">Loved by 1,000+ creators</span>
          </div>
          <div className="flex flex-wrap justify-center gap-6 opacity-80">
            {logos.map((name) => (
              <div key={name} className="text-gray-400 text-sm border border-gray-800 rounded-md px-3 py-1">
                {name}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}


