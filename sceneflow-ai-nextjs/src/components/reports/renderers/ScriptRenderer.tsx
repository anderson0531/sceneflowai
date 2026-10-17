import React, { useMemo } from 'react'
import { ScriptData as ReportScriptData } from '@/lib/types/reports'
import {
  buildProductionScriptData,
  DEFAULT_EXPORT_SCRIPT_OPTIONS,
  ExportScriptOptions,
  formatDuration,
  ScriptData as ProductionScriptData,
  SceneData,
  ExportShotData,
} from '@/lib/script/scriptExporter'

interface RendererProps {
  data: ReportScriptData | ProductionScriptData
  options?: Partial<ExportScriptOptions>
}

function normalizeScriptData(data: ReportScriptData | ProductionScriptData): ProductionScriptData {
  const anyData = data as any
  if (
    Array.isArray(anyData.scenes) &&
    anyData.metadata &&
    (anyData.scenes.length === 0 || typeof anyData.scenes[0]?.sceneNumber === 'number')
  ) {
    return anyData as ProductionScriptData
  }

  return buildProductionScriptData({
    script: anyData.script || anyData,
    scenes: anyData.scenes || anyData.script?.scenes || [],
    characters: anyData.characters || anyData.script?.characters || [],
    projectTitle: anyData.title,
    projectLogline: anyData.logline,
    projectMetadata: anyData.projectMetadata,
    blueprintBeats: anyData.blueprintBeats,
  })
}

export const ScriptRenderer = React.forwardRef<HTMLDivElement, RendererProps>(
  ({ data, options }, ref) => {
    const opts = useMemo(
      () => ({ ...DEFAULT_EXPORT_SCRIPT_OPTIONS, ...(options || {}) }),
      [options]
    )

    const normalized = useMemo(() => normalizeScriptData(data), [data])

    const formattedDate = useMemo(() => {
      const rawDate = normalized.metadata?.createdAt
      const dateObj = rawDate ? new Date(rawDate) : new Date()
      return isNaN(dateObj.getTime())
        ? new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : dateObj.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })
    }, [normalized.metadata?.createdAt])

    return (
      <div
        ref={ref}
        className="script-wrapper bg-white !text-zinc-950"
        style={{ backgroundColor: '#ffffff', color: '#09090b' }}
      >
        <style>{`
          /* High-specificity overrides to neutralize dark-mode global rules
             (.dark p, .dark span, .dark div, .dark li, .dark h1-h6) inside the white script sheet */
          .script-wrapper,
          .dark .script-wrapper {
            background-color: #ffffff !important;
            color: #09090b !important;
          }

          .script-wrapper div,
          .script-wrapper p,
          .script-wrapper span,
          .script-wrapper li,
          .script-wrapper ul,
          .script-wrapper ol,
          .script-wrapper strong,
          .script-wrapper em,
          .dark .script-wrapper div,
          .dark .script-wrapper p,
          .dark .script-wrapper span,
          .dark .script-wrapper li,
          .dark .script-wrapper ul,
          .dark .script-wrapper ol,
          .dark .script-wrapper strong,
          .dark .script-wrapper em {
            color: #111827 !important;
          }

          .script-wrapper h1,
          .script-wrapper h2,
          .script-wrapper h3,
          .script-wrapper h4,
          .script-wrapper h5,
          .script-wrapper h6,
          .dark .script-wrapper h1,
          .dark .script-wrapper h2,
          .dark .script-wrapper h3,
          .dark .script-wrapper h4,
          .dark .script-wrapper h5,
          .dark .script-wrapper h6 {
            color: #09090b !important;
          }

          /* Semantic ink palette for visual hierarchy on white paper */
          .script-wrapper .sf-ink-black,
          .dark .script-wrapper .sf-ink-black {
            color: #09090b !important;
          }

          .script-wrapper .sf-ink-body,
          .dark .script-wrapper .sf-ink-body {
            color: #1f2937 !important;
          }

          .script-wrapper .sf-ink-subtle,
          .dark .script-wrapper .sf-ink-subtle {
            color: #374151 !important;
          }

          .script-wrapper .sf-ink-muted,
          .dark .script-wrapper .sf-ink-muted {
            color: #4b5563 !important;
          }

          .script-wrapper .sf-ink-indigo,
          .dark .script-wrapper .sf-ink-indigo {
            color: #312e81 !important;
          }

          .script-wrapper .sf-ink-amber,
          .dark .script-wrapper .sf-ink-amber {
            color: #78350f !important;
          }

          .script-wrapper .sf-ink-emerald,
          .dark .script-wrapper .sf-ink-emerald {
            color: #064e3b !important;
          }

          .script-wrapper .sf-title-h1,
          .dark .script-wrapper .sf-title-h1 {
            font-size: 1.75rem !important;
            line-height: 1.25 !important;
            font-weight: 700 !important;
            color: #09090b !important;
          }

          .script-wrapper .sf-chapter-h2,
          .dark .script-wrapper .sf-chapter-h2 {
            font-size: 1.125rem !important;
            line-height: 1.35 !important;
            font-weight: 700 !important;
            color: #09090b !important;
          }

          .script-wrapper .sf-scene-h3,
          .dark .script-wrapper .sf-scene-h3 {
            font-size: 0.925rem !important;
            line-height: 1.4 !important;
            font-weight: 700 !important;
            color: #09090b !important;
          }

          .script-header {
            display: flex;
            justify-content: space-between;
            width: 100%;
            font-family: 'Courier Prime', 'Courier New', Courier, monospace;
            font-size: 9.5pt;
            border-bottom: 1px solid #cbd5e1;
            padding-bottom: 8px;
            margin-bottom: 24px;
          }

          .script-footer {
            display: flex;
            justify-content: space-between;
            width: 100%;
            font-family: 'Courier Prime', 'Courier New', Courier, monospace;
            font-size: 9.5pt;
            border-top: 1px solid #cbd5e1;
            padding-top: 8px;
            margin-top: 32px;
          }

          .script-format {
            font-family: 'Courier Prime', 'Courier New', Courier, monospace;
            line-height: 1.55;
            color: #09090b !important;
          }

          @media print {
            @page {
              size: letter;
              margin: 0.65in 0.85in 0.65in 0.85in;
              counter-increment: page;
            }

            .script-wrapper {
              position: relative;
              background: #ffffff !important;
              color: #000000 !important;
            }

            .scene-block {
              page-break-inside: avoid;
              margin-bottom: 1.5em;
            }

            .shot-block {
              page-break-inside: avoid;
            }

            .scene-heading,
            .chapter-banner {
              page-break-after: avoid;
            }
          }
        `}</style>

        <div className="p-6 sm:p-10 max-w-4xl mx-auto bg-white">
          {/* Running Header */}
          <div className="script-header">
            <span className="sf-ink-muted font-semibold tracking-wide uppercase">
              {normalized.title || 'Untitled Production Script'}
            </span>
            <span className="sf-ink-muted">{formattedDate}</span>
          </div>

          <div className="script-format text-sm">
            {/* Title Block */}
            {opts.includeTitle && (
              <div className="text-center mb-10 pb-8 border-b-2 border-zinc-900">
                <div className="sf-ink-indigo text-[11px] uppercase tracking-[0.25em] mb-2 font-sans font-bold">
                  Production Script &amp; Shot Breakdown
                </div>
                <h1 className="sf-title-h1 tracking-wider uppercase">
                  {normalized.title || 'UNTITLED'}
                </h1>
                {normalized.metadata?.author && (
                  <p className="sf-ink-subtle mt-2 text-sm font-medium">
                    Written by {normalized.metadata.author}
                  </p>
                )}
                {normalized.logline && (
                  <div className="mt-4 max-w-2xl mx-auto px-4 py-3 rounded-md bg-slate-50 border border-slate-300">
                    <p className="sf-ink-black text-xs sm:text-sm italic leading-relaxed">
                      {normalized.logline}
                    </p>
                  </div>
                )}
                <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5 text-xs font-sans">
                  <span className="sf-ink-black px-2.5 py-1 rounded-full bg-slate-100 border border-slate-300 font-semibold">
                    {normalized.scenes.length} Scenes
                  </span>
                  {normalized.chapters && normalized.chapters.length > 0 && (
                    <span className="sf-ink-black px-2.5 py-1 rounded-full bg-slate-100 border border-slate-300 font-semibold">
                      {normalized.chapters.length} Chapters
                    </span>
                  )}
                  {normalized.characters && normalized.characters.length > 0 && (
                    <span className="sf-ink-black px-2.5 py-1 rounded-full bg-slate-100 border border-slate-300 font-semibold">
                      {normalized.characters.length} Characters
                    </span>
                  )}
                  {normalized.metadata?.totalShots ? (
                    <span className="sf-ink-black px-2.5 py-1 rounded-full bg-slate-100 border border-slate-300 font-semibold">
                      {normalized.metadata.totalShots} Shots
                    </span>
                  ) : null}
                  {opts.includeDurations && normalized.metadata?.totalDuration ? (
                    <span className="sf-ink-indigo px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-300 font-semibold">
                      Est. {formatDuration(normalized.metadata.totalDuration)}
                    </span>
                  ) : null}
                </div>
              </div>
            )}

            {/* CAST & WARDROBE SECTION */}
            {opts.includeCharacterList &&
              normalized.characters &&
              normalized.characters.length > 0 && (
                <section className="mb-10 pb-8 border-b-2 border-slate-300">
                  <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-300">
                    <h2 className="sf-ink-black text-xs font-sans font-bold uppercase tracking-[0.2em]">
                      Cast &amp; Wardrobe Bible
                    </h2>
                    <span className="sf-ink-muted text-xs font-sans font-semibold">
                      {normalized.characters.length} Cast Members
                    </span>
                  </div>
                  <div className="space-y-4">
                    {normalized.characters.map((char, idx) => (
                      <div
                        key={char.id || idx}
                        className="p-4 rounded-md border border-slate-300 bg-slate-50 print:bg-transparent"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                          <span className="sf-ink-black font-bold text-sm uppercase tracking-wide">
                            {char.name}
                          </span>
                          {char.role && (
                            <span className="sf-ink-indigo text-[11px] font-sans font-bold uppercase tracking-wider px-2.5 py-0.5 rounded bg-indigo-100 border border-indigo-300">
                              {char.role}
                            </span>
                          )}
                        </div>

                        {char.description && (
                          <p className="sf-ink-body text-xs sm:text-sm mb-2 leading-relaxed">
                            {char.description}
                          </p>
                        )}

                        {char.appearanceDescription &&
                          char.appearanceDescription !== char.description && (
                            <p className="sf-ink-body text-xs mb-1.5">
                              <strong className="sf-ink-black font-bold">Appearance: </strong>
                              <span className="sf-ink-body">{char.appearanceDescription}</span>
                            </p>
                          )}

                        {char.defaultWardrobe && (
                          <p className="sf-ink-body text-xs mb-1.5">
                            <strong className="sf-ink-black font-bold">Default Wardrobe: </strong>
                            <span className="sf-ink-body">{char.defaultWardrobe}</span>
                          </p>
                        )}

                        {char.wardrobes && char.wardrobes.length > 0 && (
                          <div className="mt-2.5 pt-2.5 border-t border-slate-300">
                            <div className="sf-ink-subtle text-[11px] font-sans font-bold uppercase tracking-wider mb-2">
                              Wardrobe Continuity ({char.wardrobes.length})
                            </div>
                            <ul className="space-y-2">
                              {char.wardrobes.map((w, wIdx) => (
                                <li
                                  key={w.id || wIdx}
                                  className="sf-ink-body text-xs pl-3 border-l-2 border-indigo-500"
                                >
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <strong className="sf-ink-black font-bold">{w.name}</strong>
                                    {w.isDefault && (
                                      <span className="sf-ink-emerald text-[10px] font-sans font-bold uppercase px-1.5 py-0.2 rounded bg-emerald-100 border border-emerald-300">
                                        Default
                                      </span>
                                    )}
                                    {w.sceneNumbers && w.sceneNumbers.length > 0 && (
                                      <span className="sf-ink-subtle text-[11px] font-semibold">
                                        (Scenes: {w.sceneNumbers.join(', ')})
                                      </span>
                                    )}
                                  </div>
                                  {w.description && (
                                    <p className="sf-ink-body mt-0.5 text-xs">{w.description}</p>
                                  )}
                                  {w.accessories && (
                                    <div className="sf-ink-body text-[11px] mt-0.5">
                                      <strong className="sf-ink-black font-bold">
                                        Accessories:
                                      </strong>{' '}
                                      <span className="sf-ink-body">{w.accessories}</span>
                                    </div>
                                  )}
                                  {w.appearanceNotes && (
                                    <div className="sf-ink-subtle text-[11px] mt-0.5 italic">
                                      Note: {w.appearanceNotes}
                                    </div>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

            {/* SCENES & SHOTS */}
            <div className="space-y-8">
              {normalized.scenes.map((scene: SceneData, sIndex: number) => {
                const sceneNum = scene.sceneNumber || sIndex + 1
                const headingText = scene.heading || `INT. SCENE ${sceneNum} - DAY`

                const showChapterBanner =
                  opts.includeChapters && Boolean(scene.chapter?.isFirstSceneInChapter)

                const dir = scene.sceneDirection
                const hasDirection =
                  opts.includeSceneDirection &&
                  dir &&
                  Boolean(
                    dir.location ||
                      dir.atmosphere ||
                      (dir.keyProps && dir.keyProps.length > 0) ||
                      dir.camera ||
                      dir.lighting ||
                      dir.talent ||
                      dir.audio
                  )

                const sceneDescText = scene.sceneDescription || scene.action

                return (
                  <React.Fragment key={sIndex}>
                    {/* Chapter Banner */}
                    {showChapterBanner && scene.chapter && (
                      <div className="chapter-banner mt-8 mb-6 p-4 rounded-md border-2 border-indigo-900 bg-indigo-50 print:bg-zinc-100">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="sf-ink-indigo text-[11px] font-sans font-bold uppercase tracking-[0.2em]">
                            Chapter Breakdown
                          </span>
                          {scene.chapter.minutes ? (
                            <span className="sf-ink-indigo text-xs font-sans font-bold px-2 py-0.5 rounded bg-indigo-100 border border-indigo-300">
                              Est. {scene.chapter.minutes} min
                            </span>
                          ) : null}
                        </div>
                        <h2 className="sf-chapter-h2 uppercase tracking-wide">
                          {scene.chapter.title
                            ? `${scene.chapter.heading}: ${scene.chapter.title}`
                            : scene.chapter.heading}
                        </h2>
                        {scene.chapter.description && (
                          <p className="sf-ink-black mt-2 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">
                            {scene.chapter.description}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Scene Container */}
                    <div className="scene-block pb-6 border-b border-slate-300 last:border-b-0">
                      {/* Scene Heading Bar (High-contrast light slate screenplay slugline bar) */}
                      <div className="scene-heading flex items-center justify-between gap-4 py-2.5 px-3.5 mb-3.5 bg-slate-200 border-y-2 border-slate-900 rounded-sm">
                        <h3 className="sf-scene-h3 uppercase tracking-wider">
                          {opts.includeSceneNumbers ? `SCENE ${sceneNum} — ` : ''}
                          {headingText.toUpperCase()}
                        </h3>
                        {opts.includeDurations && scene.duration ? (
                          <span className="sf-ink-black text-xs font-sans font-bold px-2 py-0.5 rounded bg-white border border-slate-400 shrink-0">
                            {formatDuration(scene.duration)}
                          </span>
                        ) : null}
                      </div>

                      {/* Scene-level Wardrobe Continuity */}
                      {opts.includeCharacterList &&
                        scene.sceneWardrobes &&
                        scene.sceneWardrobes.length > 0 && (
                          <div className="mb-3.5 px-3 py-2 rounded bg-amber-50 border border-amber-300 text-xs">
                            <strong className="sf-ink-amber font-sans font-bold uppercase text-[11px] tracking-wider mr-2">
                              Scene Wardrobe:
                            </strong>
                            <span className="sf-ink-black font-medium">
                              {scene.sceneWardrobes
                                .map(
                                  sw =>
                                    `${sw.characterName} (${sw.wardrobeName}${
                                      sw.description ? ` — ${sw.description}` : ''
                                    })`
                                )
                                .join(' • ')}
                            </span>
                          </div>
                        )}

                      {/* Scene Description */}
                      {opts.includeSceneDescriptions && sceneDescText && (
                        <div className="mb-4 px-1">
                          <div className="sf-ink-subtle text-[11px] font-sans font-bold uppercase tracking-wider mb-1">
                            Scene Description
                          </div>
                          <p className="sf-ink-black text-xs sm:text-sm whitespace-pre-wrap leading-relaxed">
                            {sceneDescText}
                          </p>
                        </div>
                      )}

                      {/* Scene Direction */}
                      {hasDirection && dir && (
                        <div className="mb-5 p-3.5 rounded-md border border-slate-300 bg-slate-100 print:bg-transparent">
                          <div className="sf-ink-black text-[11px] font-sans font-bold uppercase tracking-[0.15em] mb-2.5 pb-1.5 border-b border-slate-300">
                            Scene Direction
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs">
                            {dir.location && (
                              <div>
                                <strong className="sf-ink-black font-bold">
                                  Location &amp; Set:{' '}
                                </strong>
                                <span className="sf-ink-body">{dir.location}</span>
                              </div>
                            )}
                            {dir.atmosphere && (
                              <div>
                                <strong className="sf-ink-black font-bold">Atmosphere: </strong>
                                <span className="sf-ink-body">{dir.atmosphere}</span>
                              </div>
                            )}
                            {dir.keyProps && dir.keyProps.length > 0 && (
                              <div className="sm:col-span-2">
                                <strong className="sf-ink-black font-bold">Key Props: </strong>
                                <span className="sf-ink-body">{dir.keyProps.join(', ')}</span>
                              </div>
                            )}
                            {dir.camera && (
                              <div className="sm:col-span-2">
                                <strong className="sf-ink-black font-bold">Camera: </strong>
                                <span className="sf-ink-body">{dir.camera}</span>
                              </div>
                            )}
                            {dir.lighting && (
                              <div className="sm:col-span-2">
                                <strong className="sf-ink-black font-bold">Lighting: </strong>
                                <span className="sf-ink-body">{dir.lighting}</span>
                              </div>
                            )}
                            {dir.talent && (
                              <div className="sm:col-span-2">
                                <strong className="sf-ink-black font-bold">
                                  Talent &amp; Blocking:{' '}
                                </strong>
                                <span className="sf-ink-body">{dir.talent}</span>
                              </div>
                            )}
                            {dir.audio && (
                              <div className="sm:col-span-2">
                                <strong className="sf-ink-black font-bold">Audio: </strong>
                                <span className="sf-ink-body">{dir.audio}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Shots Breakdown */}
                      {scene.shots &&
                      scene.shots.length > 0 &&
                      (opts.includeShotDirection || opts.includeShotActionDialogue) ? (
                        <div className="space-y-4 mt-4">
                          {scene.shots.map((shot: ExportShotData, shotIdx: number) => {
                            const sd = shot.shotDirection
                            const hasShotDir =
                              opts.includeShotDirection &&
                              sd &&
                              Boolean(
                                sd.cameraSummary ||
                                  sd.stillDescription ||
                                  (sd.castInFrame && sd.castInFrame.length > 0) ||
                                  (sd.castWardrobes && sd.castWardrobes.length > 0) ||
                                  sd.blocking ||
                                  sd.spatialRelationship ||
                                  sd.emotion ||
                                  sd.gaze ||
                                  sd.lighting ||
                                  (sd.props && sd.props.length > 0) ||
                                  sd.propInteraction ||
                                  sd.audio
                              )

                            const hasShotDialogueOrAction =
                              opts.includeShotActionDialogue &&
                              Boolean(shot.actionDescription || shot.line)

                            if (!hasShotDir && !hasShotDialogueOrAction) return null

                            const castDisplay =
                              sd?.castWardrobes && sd.castWardrobes.length > 0
                                ? sd.castWardrobes
                                    .map(cw =>
                                      cw.wardrobeName
                                        ? `${cw.characterName} (${cw.wardrobeName})`
                                        : cw.characterName
                                    )
                                    .join(', ')
                                : sd?.castInFrame?.join(', ')

                            return (
                              <div
                                key={shot.beatId || shotIdx}
                                className="shot-block pl-3.5 sm:pl-4 border-l-4 border-indigo-600 py-1.5"
                              >
                                {/* Shot Header */}
                                <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="sf-ink-black font-sans font-bold text-xs uppercase tracking-wider px-2.5 py-0.5 rounded bg-slate-200 border border-slate-400">
                                      Shot {shot.shotNumber}
                                    </span>
                                    <span className="sf-ink-indigo text-[10px] font-sans font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-100 border border-indigo-300">
                                      {shot.kind}
                                    </span>
                                    {opts.includeShotDirection && sd?.cameraSummary && (
                                      <span className="sf-ink-black text-[11px] font-sans font-semibold bg-slate-100 px-2.5 py-0.5 rounded border border-slate-300">
                                        {sd.cameraSummary}
                                      </span>
                                    )}
                                  </div>
                                  {opts.includeDurations && shot.durationSeconds ? (
                                    <span className="sf-ink-subtle text-xs font-sans font-bold">
                                      {Math.round(shot.durationSeconds)}s
                                    </span>
                                  ) : null}
                                </div>

                                {/* Shot Direction Metadata */}
                                {hasShotDir && sd && (
                                  <div className="mb-3 p-3 rounded bg-slate-50 border border-slate-300 text-xs space-y-1.5 print:bg-transparent">
                                    {sd.stillDescription && (
                                      <div>
                                        <strong className="sf-ink-black font-bold">
                                          Still / Frame:{' '}
                                        </strong>
                                        <span className="sf-ink-body">{sd.stillDescription}</span>
                                      </div>
                                    )}
                                    {castDisplay && (
                                      <div>
                                        <strong className="sf-ink-black font-bold">
                                          Cast &amp; Wardrobe:{' '}
                                        </strong>
                                        <span className="sf-ink-body">{castDisplay}</span>
                                      </div>
                                    )}
                                    {(sd.blocking || sd.spatialRelationship) && (
                                      <div>
                                        <strong className="sf-ink-black font-bold">
                                          Blocking:{' '}
                                        </strong>
                                        <span className="sf-ink-body">
                                          {[sd.blocking, sd.spatialRelationship]
                                            .filter(Boolean)
                                            .join(' | ')}
                                        </span>
                                      </div>
                                    )}
                                    {(sd.emotion || sd.gaze) && (
                                      <div>
                                        <strong className="sf-ink-black font-bold">
                                          Performance:{' '}
                                        </strong>
                                        <span className="sf-ink-body">
                                          {[sd.emotion, sd.gaze ? `Gaze: ${sd.gaze}` : undefined]
                                            .filter(Boolean)
                                            .join(' | ')}
                                        </span>
                                      </div>
                                    )}
                                    {(sd.lighting ||
                                      (sd.props && sd.props.length > 0) ||
                                      sd.propInteraction) && (
                                      <div>
                                        <strong className="sf-ink-black font-bold">
                                          Lighting &amp; Props:{' '}
                                        </strong>
                                        <span className="sf-ink-body">
                                          {[
                                            sd.lighting ? `Lighting: ${sd.lighting}` : undefined,
                                            sd.props && sd.props.length > 0
                                              ? `Props: ${sd.props.join(', ')}`
                                              : undefined,
                                            sd.propInteraction
                                              ? `Prop Action: ${sd.propInteraction}`
                                              : undefined,
                                          ]
                                            .filter(Boolean)
                                            .join(' | ')}
                                        </span>
                                      </div>
                                    )}
                                    {sd.audio && (
                                      <div>
                                        <strong className="sf-ink-black font-bold">
                                          Audio / SFX:{' '}
                                        </strong>
                                        <span className="sf-ink-body">{sd.audio}</span>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Shot Action & Dialogue */}
                                {hasShotDialogueOrAction && (
                                  <div className="space-y-2 pl-1">
                                    {shot.kind === 'action' ? (
                                      <p className="sf-ink-black text-xs sm:text-sm whitespace-pre-wrap leading-relaxed">
                                        {shot.actionDescription || shot.line}
                                      </p>
                                    ) : (
                                      <>
                                        {shot.actionDescription && (
                                          <p className="sf-ink-subtle text-xs italic mb-1.5">
                                            {shot.actionDescription}
                                          </p>
                                        )}
                                        <div className="my-2.5 ml-[8%] mr-[6%] sm:ml-[14%] sm:mr-[10%] p-3 rounded bg-slate-50 border border-slate-200 border-l-4 border-l-slate-600">
                                          <p className="sf-ink-black font-bold uppercase text-xs sm:text-sm tracking-wide">
                                            {(
                                              shot.character ||
                                              (shot.kind === 'narration'
                                                ? 'NARRATOR'
                                                : 'CHARACTER')
                                            ).toUpperCase()}
                                            {shot.kind === 'narration' &&
                                            !(shot.character || '')
                                              .toUpperCase()
                                              .includes('V.O.')
                                              ? ' (V.O.)'
                                              : ''}
                                          </p>
                                          {shot.voiceDirection && (
                                            <p className="sf-ink-subtle text-xs italic mt-0.5">
                                              ({shot.voiceDirection.replace(/^\(|\)$/g, '')})
                                            </p>
                                          )}
                                          {shot.line && (
                                            <p
                                              className={`sf-ink-black mt-1 text-xs sm:text-sm whitespace-pre-wrap leading-relaxed ${
                                                shot.kind === 'narration' ? 'italic' : ''
                                              }`}
                                            >
                                              {shot.line}
                                            </p>
                                          )}
                                        </div>
                                      </>
                                    )}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        /* Fallback Scene-level Dialogue when no shots exist */
                        opts.includeShotActionDialogue &&
                        scene.dialogue &&
                        scene.dialogue.length > 0 && (
                          <div className="space-y-3 mt-3">
                            {scene.dialogue.map((d: any, dIndex: number) => {
                              const dialogueText = d.line || d.text || ''
                              return (
                                <div
                                  key={dIndex}
                                  className="my-2.5 ml-[8%] mr-[6%] sm:ml-[14%] sm:mr-[10%] p-3 rounded bg-slate-50 border border-slate-200 border-l-4 border-l-slate-600"
                                >
                                  <p className="sf-ink-black font-bold uppercase text-xs sm:text-sm">
                                    {(d.character || 'CHARACTER').toUpperCase()}
                                  </p>
                                  {d.parenthetical && (
                                    <p className="sf-ink-subtle text-xs italic mt-0.5">
                                      ({d.parenthetical})
                                    </p>
                                  )}
                                  <p className="sf-ink-black mt-1 text-xs sm:text-sm whitespace-pre-wrap leading-relaxed">
                                    {dialogueText}
                                  </p>
                                </div>
                              )
                            })}
                          </div>
                        )
                      )}
                    </div>
                  </React.Fragment>
                )
              })}
            </div>
          </div>

          {/* Running Footer */}
          <div className="script-footer">
            <span className="sf-ink-muted">SceneFlow Studio — Production Script</span>
            <span className="sf-ink-muted">
              {normalized.scenes.length} Scenes • {formattedDate}
            </span>
          </div>
        </div>
      </div>
    )
  }
)

ScriptRenderer.displayName = 'ScriptRenderer'
