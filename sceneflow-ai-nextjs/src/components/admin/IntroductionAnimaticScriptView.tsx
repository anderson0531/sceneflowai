'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Copy, FileText, Mic, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import {
  INTRO_ANIMATIC_ACT_ORDER,
  INTRO_ANIMATIC_ACT_TITLES,
  INTRO_ANIMATIC_BEATS,
  INTRO_ANIMATIC_LOCALES,
  INTRO_ANIMATIC_META,
  INTRO_ANIMATIC_REFERENCES,
  INTRO_ANIMATIC_STYLE_LOCK,
  formatIntroAnimaticTimecode,
  getIntroAnimaticBeatsByAct,
  getIntroAnimaticRuntimeSeconds,
  getIntroAnimaticWordCount,
  type IntroAnimaticLocaleId,
} from '@/config/landing/introductionAnimaticScript'
import {
  buildIntroAnimaticHtml,
  buildIntroAnimaticMarkdown,
  buildIntroAnimaticNarrationText,
} from '@/lib/export/scriptDocExport'
import { copyPlainText, copyRichText } from '@/lib/export/richTextClipboard'

const BEAT_COLUMNS = ['Beat', 'Time', 'Dur.', 'Narration / Action', 'Image Illustration Prompt', 'Motion']

export function IntroductionAnimaticScriptView() {
  const [activeLocale, setActiveLocale] = useState<IntroAnimaticLocaleId>('en')

  const locale = INTRO_ANIMATIC_LOCALES.find((l) => l.id === activeLocale)!
  const isRtl = locale.dir === 'rtl'

  const runtime = formatIntroAnimaticTimecode(getIntroAnimaticRuntimeSeconds())
  const wordCount = useMemo(() => getIntroAnimaticWordCount(activeLocale), [activeLocale])

  const handleCopyForDocs = async () => {
    try {
      const flavor = await copyRichText({
        html: buildIntroAnimaticHtml(activeLocale),
        text: buildIntroAnimaticMarkdown(activeLocale),
      })
      toast.success(
        flavor === 'rich'
          ? `${locale.label} script copied — paste into Google Docs`
          : `${locale.label} script copied as plain text (this browser cannot copy rich text)`
      )
    } catch {
      toast.error('Could not access the clipboard')
    }
  }

  const handleCopyMarkdown = async () => {
    try {
      await copyPlainText(buildIntroAnimaticMarkdown(activeLocale))
      toast.success(`${locale.label} markdown copied`)
    } catch {
      toast.error('Could not access the clipboard')
    }
  }

  const handleCopyNarration = async () => {
    try {
      await copyPlainText(buildIntroAnimaticNarrationText(activeLocale))
      toast.success(`${locale.label} narration copied`)
    } catch {
      toast.error('Could not access the clipboard')
    }
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 space-y-6 text-sf-text-primary">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">{INTRO_ANIMATIC_META.title}</h1>
        <p className="text-sm text-sf-text-secondary">
          Beat-by-beat animatic script. One shared set of frame prompts, six narration tracks —
          generate the frames once and re-synthesize only the voiceover per language.
        </p>
      </header>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Narration language">
        {INTRO_ANIMATIC_LOCALES.map((option) => (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={activeLocale === option.id}
            onClick={() => setActiveLocale(option.id)}
            className={cn(
              'rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
              activeLocale === option.id
                ? 'border-cyan-500/50 bg-cyan-500/15 text-cyan-200'
                : 'border-sf-border bg-sf-surface-dark text-sf-text-secondary hover:text-sf-text-primary'
            )}
          >
            {option.label}
            <span className="ml-2 text-xs opacity-70">{option.nativeLabel}</span>
          </button>
        ))}
      </div>

      <section className="rounded-xl border border-sf-border bg-sf-surface p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <Stat label="Runtime" value={`~${runtime}`} />
          <Stat label="Beats" value={String(INTRO_ANIMATIC_BEATS.length)} />
          <Stat label="Narration words" value={`~${wordCount}`} />
          <Stat label="Voice" value={INTRO_ANIMATIC_META.voiceId} />
        </div>

        {locale.reviewed ? (
          <p className="flex items-center gap-2 text-xs text-emerald-300">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Narration approved.
          </p>
        ) : (
          <p className="flex items-center gap-2 text-xs text-amber-300">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Machine-drafted narration — needs native-speaker review before recording.
          </p>
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          <Button variant="primary" size="sm" onClick={handleCopyForDocs}>
            <Copy className="mr-2 h-4 w-4" />
            Copy for Google Docs
          </Button>
          <Button variant="secondary" size="sm" onClick={handleCopyMarkdown}>
            <FileText className="mr-2 h-4 w-4" />
            Copy Markdown
          </Button>
          <Button variant="secondary" size="sm" onClick={handleCopyNarration}>
            <Mic className="mr-2 h-4 w-4" />
            Copy narration only
          </Button>
        </div>
        <p className="text-xs text-sf-text-secondary">
          &ldquo;Copy for Google Docs&rdquo; puts formatted HTML on the clipboard, so headings and
          the beat table survive the paste.
        </p>
      </section>

      <section className="rounded-xl border border-sf-border bg-sf-surface p-4 space-y-2">
        <h2 className="font-semibold">Global visual style lock</h2>
        <p className="text-xs text-sf-text-secondary">Appended to every frame prompt below.</p>
        <blockquote className="border-l-2 border-cyan-500/40 pl-3 text-sm italic text-sf-text-secondary">
          {INTRO_ANIMATIC_STYLE_LOCK}
        </blockquote>
      </section>

      <section className="rounded-xl border border-sf-border bg-sf-surface p-4 space-y-3">
        <h2 className="font-semibold">
          References{' '}
          <span className="text-xs font-normal text-sf-text-secondary">
            generate once, lock in the Reference Library
          </span>
        </h2>
        <div className="grid gap-3 md:grid-cols-2">
          {INTRO_ANIMATIC_REFERENCES.map((reference) => (
            <div
              key={reference.token}
              className="rounded-lg border border-sf-border bg-sf-surface-dark p-3"
            >
              <p className="text-sm font-semibold text-cyan-300">
                REF: {reference.token}
                <span className="ml-2 text-xs font-normal text-sf-text-secondary">
                  {reference.kind}
                </span>
              </p>
              <p className="mt-1 text-xs leading-relaxed text-sf-text-secondary">
                {reference.prompt}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-5">
        <div>
          <h2 className="font-semibold">Animatic beats</h2>
          <p className="text-xs text-sf-text-secondary">
            Hold each frame through its narration line; Ken Burns motion as noted; cross-dissolve
            0.5s between beats.
          </p>
        </div>

        {INTRO_ANIMATIC_ACT_ORDER.map((act) => {
          const beats = getIntroAnimaticBeatsByAct(act)
          if (!beats.length) return null

          return (
            <div key={act} className="space-y-2">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-sf-text-secondary">
                {INTRO_ANIMATIC_ACT_TITLES[act]}
              </h3>
              <div className="overflow-x-auto rounded-xl border border-sf-border">
                <table className="w-full min-w-[56rem] border-collapse text-sm">
                  <thead>
                    <tr className="bg-sf-surface-dark text-left text-xs uppercase tracking-wider text-sf-text-secondary">
                      {BEAT_COLUMNS.map((column) => (
                        <th key={column} className="border-b border-sf-border px-3 py-2 font-semibold">
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {beats.map((beat) => (
                      <tr key={beat.id} className="align-top odd:bg-sf-surface/40">
                        <td className="border-b border-sf-border px-3 py-2 font-mono text-xs">
                          {beat.id}
                        </td>
                        <td className="border-b border-sf-border px-3 py-2 font-mono text-xs">
                          {beat.timecode}
                        </td>
                        <td className="border-b border-sf-border px-3 py-2 font-mono text-xs">
                          {beat.durationSeconds}s
                        </td>
                        <td
                          dir={isRtl ? 'rtl' : undefined}
                          className={cn(
                            'border-b border-sf-border px-3 py-2 leading-relaxed',
                            isRtl && 'text-right'
                          )}
                        >
                          {beat.narration[activeLocale]}
                          {beat.onScreenText ? (
                            <span
                              dir="ltr"
                              className="mt-1 block text-xs text-violet-300"
                            >
                              OVERLAY: {beat.onScreenText}
                            </span>
                          ) : null}
                        </td>
                        <td className="border-b border-sf-border px-3 py-2 text-xs leading-relaxed text-sf-text-secondary">
                          {beat.framePrompt}
                        </td>
                        <td className="border-b border-sf-border px-3 py-2 text-xs">{beat.motion}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        })}
      </section>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-sf-text-secondary">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  )
}
