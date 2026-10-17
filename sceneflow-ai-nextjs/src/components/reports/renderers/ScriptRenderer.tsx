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
  // If already normalized via buildProductionScriptData (scenes array has sceneNumber & metadata)
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
      <div ref={ref} className="script-wrapper bg-white text-zinc-900">
        <style>{`
          .script-header {
            display: flex;
            justify-content: space-between;
            width: 100%;
            font-family: 'Courier Prime', 'Courier New', Courier, monospace;
            font-size: 9.5pt;
            color: #52525b !important;
            border-bottom: 1px solid #e4e4e7;
            padding-bottom: 8px;
            margin-bottom: 24px;
          }

          .script-footer {
            display: flex;
            justify-content: space-between;
            width: 100%;
            font-family: 'Courier Prime', 'Courier New', Courier, monospace;
            font-size: 9.5pt;
            color: #52525b !important;
            border-top: 1px solid #e4e4e7;
            padding-top: 8px;
            margin-top: 32px;
          }

          .script-format {
            font-family: 'Courier Prime', 'Courier New', Courier, monospace;
            line-height: 1.5;
            color: #111827 !important;
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

        <div className="p-6 sm:p-10 max-w-4xl mx-auto">
          {/* Running Header */}
          <div className="script-header">
            <span className="font-semibold tracking-wide uppercase">
              {normalized.title || 'Untitled Production Script'}
            </span>
            <span>{formattedDate}</span>
          </div>

          <div className="script-format text-sm">
            {/* Title Block */}
            {opts.includeTitle && (
              <div className="text-center mb-10 pb-8 border-b-2 border-zinc-900">
                <div className="text-[11px] uppercase tracking-[0.25em] text-zinc-500 mb-2 font-sans font-semibold">
                  Production Script &amp; Shot Breakdown
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-wider uppercase text-zinc-950">
                  {normalized.title || 'UNTITLED'}
                </h1>
                {normalized.metadata?.author && (
                  <p className="mt-2 text-sm text-zinc-700">
                    Written by {normalized.metadata.author}
                  </p>
                )}
                {normalized.logline && (
                  <p className="mt-4 max-w-2xl mx-auto text-xs sm:text-sm italic text-zinc-700 leading-relaxed">
                    {normalized.logline}
                  </p>
                )}
                <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-[11px] font-sans text-zinc-500">
                  <span>{normalized.scenes.length} Scenes</span>
                  {normalized.chapters && normalized.chapters.length > 0 && (
                    <span>• {normalized.chapters.length} Chapters</span>
                  )}
                  {normalized.characters && normalized.characters.length > 0 && (
                    <span>• {normalized.characters.length} Characters</span>
                  )}
                  {normalized.metadata?.totalShots ? (
                    <span>• {normalized.metadata.totalShots} Shots</span>
                  ) : null}
                  {opts.includeDurations && normalized.metadata?.totalDuration ? (
                    <span>• Est. {formatDuration(normalized.metadata.totalDuration)}</span>
                  ) : null}
                </div>
              </div>
            )}

            {/* CAST & WARDROBE SECTION */}
            {opts.includeCharacterList &&
              normalized.characters &&
              normalized.characters.length > 0 && (
                <section className="mb-10 pb-8 border-b border-zinc-300">
                  <h2 className="text-xs font-sans font-bold uppercase tracking-[0.2em] text-zinc-600 mb-4 pb-1.5 border-b border-zinc-200">
                    Cast &amp; Wardrobe
                  </h2>
                  <div className="space-y-4">
                    {normalized.characters.map((char, idx) => (
                      <div
                        key={char.id || idx}
                        className="p-3.5 rounded-md border border-zinc-200 bg-zinc-50/70 print:bg-transparent"
                      >
                        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
                          <span className="font-bold text-sm uppercase tracking-wide text-zinc-950">
                            {char.name}
                          </span>
                          {char.role && (
                            <span className="text-[11px] font-sans font-medium uppercase tracking-wider px-2 py-0.5 rounded bg-zinc-200/80 text-zinc-700">
                              {char.role}
                            </span>
                          )}
                        </div>

                        {char.description && (
                          <p className="text-xs text-zinc-800 mb-1.5 leading-relaxed">
                            {char.description}
                          </p>
                        )}

                        {char.appearanceDescription &&
                          char.appearanceDescription !== char.description && (
                            <p className="text-xs text-zinc-600 mb-1.5">
                              <span className="font-semibold text-zinc-700">Appearance: </span>
                              {char.appearanceDescription}
                            </p>
                          )}

                        {char.defaultWardrobe && (
                          <p className="text-xs text-zinc-700 mb-1.5">
                            <span className="font-semibold text-zinc-800">Default Wardrobe: </span>
                            {char.defaultWardrobe}
                          </p>
                        )}

                        {char.wardrobes && char.wardrobes.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-zinc-200/80">
                            <div className="text-[11px] font-sans font-semibold uppercase tracking-wider text-zinc-500 mb-1.5">
                              Wardrobe Continuity ({char.wardrobes.length})
                            </div>
                            <ul className="space-y-1.5">
                              {char.wardrobes.map((w, wIdx) => (
                                <li
                                  key={w.id || wIdx}
                                  className="text-xs text-zinc-800 pl-2 border-l-2 border-zinc-300"
                                >
                                  <span className="font-semibold text-zinc-900">{w.name}</span>
                                  {w.isDefault && (
                                    <span className="ml-1 text-[10px] font-sans uppercase px-1.5 py-0.2 rounded bg-zinc-200 text-zinc-700">
                                      Default
                                    </span>
                                  )}
                                  {w.sceneNumbers && w.sceneNumbers.length > 0 && (
                                    <span className="ml-1.5 text-[11px] text-zinc-500">
                                      (Scenes: {w.sceneNumbers.join(', ')})
                                    </span>
                                  )}
                                  {w.description && (
                                    <span className="text-zinc-700">: {w.description}</span>
                                  )}
                                  {w.accessories && (
                                    <div className="text-[11px] text-zinc-600 mt-0.5">
                                      <span className="font-medium">Accessories:</span>{' '}
                                      {w.accessories}
                                    </div>
                                  )}
                                  {w.appearanceNotes && (
                                    <div className="text-[11px] text-zinc-600 mt-0.5 italic">
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
                      <div className="chapter-banner mt-8 mb-6 p-4 rounded-md border-2 border-zinc-800 bg-zinc-100/90 print:bg-zinc-100">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-zinc-500">
                            Chapter Breakdown
                          </div>
                          {scene.chapter.minutes ? (
                            <span className="text-[11px] font-sans font-medium text-zinc-600">
                              Est. {scene.chapter.minutes} min
                            </span>
                          ) : null}
                        </div>
                        <h2 className="text-base sm:text-lg font-bold uppercase tracking-wide text-zinc-950 mt-0.5">
                          {scene.chapter.title
                            ? `${scene.chapter.heading}: ${scene.chapter.title}`
                            : scene.chapter.heading}
                        </h2>
                        {scene.chapter.description && (
                          <p className="mt-2 text-xs sm:text-sm text-zinc-700 leading-relaxed whitespace-pre-wrap">
                            {scene.chapter.description}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Scene Container */}
                    <div className="scene-block pb-6 border-b border-zinc-200 last:border-b-0">
                      {/* Scene Heading Bar */}
                      <div className="scene-heading flex items-baseline justify-between gap-4 py-2 px-3 mb-3 bg-zinc-900 text-white rounded-sm print:bg-zinc-200 print:text-black print:border-y print:border-black">
                        <h3 className="font-bold text-sm uppercase tracking-wider">
                          {opts.includeSceneNumbers ? `SCENE ${sceneNum} — ` : ''}
                          {headingText.toUpperCase()}
                        </h3>
                        {opts.includeDurations && scene.duration ? (
                          <span className="text-xs font-sans opacity-80 shrink-0">
                            {formatDuration(scene.duration)}
                          </span>
                        ) : null}
                      </div>

                      {/* Scene-level Wardrobe Continuity */}
                      {opts.includeCharacterList &&
                        scene.sceneWardrobes &&
                        scene.sceneWardrobes.length > 0 && (
                          <div className="mb-3 px-2.5 py-1.5 rounded bg-zinc-100 border border-zinc-200 text-xs text-zinc-700">
                            <span className="font-sans font-semibold uppercase text-[10px] tracking-wider text-zinc-500 mr-2">
                              Scene Wardrobe:
                            </span>
                            {scene.sceneWardrobes
                              .map(
                                sw =>
                                  `${sw.characterName} (${sw.wardrobeName}${
                                    sw.description ? ` — ${sw.description}` : ''
                                  })`
                              )
                              .join(' • ')}
                          </div>
                        )}

                      {/* Scene Description */}
                      {opts.includeSceneDescriptions && sceneDescText && (
                        <div className="mb-4 px-1">
                          <div className="text-[10px] font-sans font-semibold uppercase tracking-wider text-zinc-500 mb-1">
                            Scene Description
                          </div>
                          <p className="text-xs sm:text-sm text-zinc-900 whitespace-pre-wrap leading-relaxed">
                            {sceneDescText}
                          </p>
                        </div>
                      )}

                      {/* Scene Direction */}
                      {hasDirection && dir && (
                        <div className="mb-5 p-3 rounded border border-zinc-300 bg-zinc-50/80 print:bg-transparent">
                          <div className="text-[10px] font-sans font-bold uppercase tracking-[0.15em] text-zinc-600 mb-2 pb-1 border-b border-zinc-200">
                            Scene Direction
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
                            {dir.location && (
                              <div>
                                <span className="font-semibold text-zinc-800">Location &amp; Set: </span>
                                <span className="text-zinc-700">{dir.location}</span>
                              </div>
                            )}
                            {dir.atmosphere && (
                              <div>
                                <span className="font-semibold text-zinc-800">Atmosphere: </span>
                                <span className="text-zinc-700">{dir.atmosphere}</span>
                              </div>
                            )}
                            {dir.keyProps && dir.keyProps.length > 0 && (
                              <div className="sm:col-span-2">
                                <span className="font-semibold text-zinc-800">Key Props: </span>
                                <span className="text-zinc-700">{dir.keyProps.join(', ')}</span>
                              </div>
                            )}
                            {dir.camera && (
                              <div className="sm:col-span-2">
                                <span className="font-semibold text-zinc-800">Camera: </span>
                                <span className="text-zinc-700">{dir.camera}</span>
                              </div>
                            )}
                            {dir.lighting && (
                              <div className="sm:col-span-2">
                                <span className="font-semibold text-zinc-800">Lighting: </span>
                                <span className="text-zinc-700">{dir.lighting}</span>
                              </div>
                            )}
                            {dir.talent && (
                              <div className="sm:col-span-2">
                                <span className="font-semibold text-zinc-800">Talent &amp; Blocking: </span>
                                <span className="text-zinc-700">{dir.talent}</span>
                              </div>
                            )}
                            {dir.audio && (
                              <div className="sm:col-span-2">
                                <span className="font-semibold text-zinc-800">Audio: </span>
                                <span className="text-zinc-700">{dir.audio}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Shots Breakdown */}
                      {scene.shots &&
                      scene.shots.length > 0 &&
                      (opts.includeShotDirection || opts.includeShotActionDialogue) ? (
                        <div className="space-y-4 mt-3">
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
                                className="shot-block pl-3 sm:pl-4 border-l-2 border-zinc-300 py-1"
                              >
                                {/* Shot Header */}
                                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-sans font-bold text-xs uppercase tracking-wider px-2 py-0.5 rounded bg-zinc-800 text-white print:bg-zinc-200 print:text-black">
                                      Shot {shot.shotNumber}
                                    </span>
                                    <span className="text-[10px] font-sans uppercase tracking-wider px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600 border border-zinc-200">
                                      {shot.kind}
                                    </span>
                                    {opts.includeShotDirection && sd?.cameraSummary && (
                                      <span className="text-[11px] font-sans font-medium text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200">
                                        {sd.cameraSummary}
                                      </span>
                                    )}
                                  </div>
                                  {opts.includeDurations && shot.durationSeconds ? (
                                    <span className="text-[11px] font-sans text-zinc-500">
                                      {Math.round(shot.durationSeconds)}s
                                    </span>
                                  ) : null}
                                </div>

                                {/* Shot Direction Metadata */}
                                {hasShotDir && sd && (
                                  <div className="mb-3 p-2.5 rounded bg-zinc-50 border border-zinc-200/80 text-xs space-y-1 print:bg-transparent">
                                    {sd.stillDescription && (
                                      <div>
                                        <span className="font-semibold text-zinc-700">
                                          Still / Frame:{' '}
                                        </span>
                                        <span className="text-zinc-800">{sd.stillDescription}</span>
                                      </div>
                                    )}
                                    {castDisplay && (
                                      <div>
                                        <span className="font-semibold text-zinc-700">
                                          Cast &amp; Wardrobe:{' '}
                                        </span>
                                        <span className="text-zinc-800">{castDisplay}</span>
                                      </div>
                                    )}
                                    {(sd.blocking || sd.spatialRelationship) && (
                                      <div>
                                        <span className="font-semibold text-zinc-700">
                                          Blocking:{' '}
                                        </span>
                                        <span className="text-zinc-800">
                                          {[sd.blocking, sd.spatialRelationship]
                                            .filter(Boolean)
                                            .join(' | ')}
                                        </span>
                                      </div>
                                    )}
                                    {(sd.emotion || sd.gaze) && (
                                      <div>
                                        <span className="font-semibold text-zinc-700">
                                          Performance:{' '}
                                        </span>
                                        <span className="text-zinc-800">
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
                                        <span className="font-semibold text-zinc-700">
                                          Lighting &amp; Props:{' '}
                                        </span>
                                        <span className="text-zinc-800">
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
                                        <span className="font-semibold text-zinc-700">
                                          Audio / SFX:{' '}
                                        </span>
                                        <span className="text-zinc-800">{sd.audio}</span>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Shot Action & Dialogue */}
                                {hasShotDialogueOrAction && (
                                  <div className="space-y-2 pl-1">
                                    {shot.kind === 'action' ? (
                                      <p className="text-xs sm:text-sm text-zinc-900 whitespace-pre-wrap leading-relaxed">
                                        {shot.actionDescription || shot.line}
                                      </p>
                                    ) : (
                                      <>
                                        {shot.actionDescription && (
                                          <p className="text-xs text-zinc-700 italic mb-1.5">
                                            {shot.actionDescription}
                                          </p>
                                        )}
                                        <div className="my-2 ml-[12%] mr-[10%] sm:ml-[18%] sm:mr-[14%]">
                                          <p className="font-bold uppercase text-xs sm:text-sm text-zinc-950 ml-[15%]">
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
                                            <p className="text-xs italic text-zinc-600 ml-[10%]">
                                              ({shot.voiceDirection.replace(/^\(|\)$/g, '')})
                                            </p>
                                          )}
                                          {shot.line && (
                                            <p
                                              className={`text-xs sm:text-sm text-zinc-900 whitespace-pre-wrap leading-relaxed ${
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
                                  className="my-2.5 ml-[12%] mr-[10%] sm:ml-[18%] sm:mr-[14%]"
                                >
                                  <p className="font-bold uppercase text-xs sm:text-sm text-zinc-950 ml-[15%]">
                                    {(d.character || 'CHARACTER').toUpperCase()}
                                  </p>
                                  {d.parenthetical && (
                                    <p className="text-xs italic text-zinc-600 ml-[10%]">
                                      ({d.parenthetical})
                                    </p>
                                  )}
                                  <p className="text-xs sm:text-sm text-zinc-900 whitespace-pre-wrap leading-relaxed">
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
            <span>SceneFlow Studio — Production Script</span>
            <span>
              {normalized.scenes.length} Scenes • {formattedDate}
            </span>
          </div>
        </div>
      </div>
    )
  }
)

ScriptRenderer.displayName = 'ScriptRenderer'
