'use client'

import React, { useMemo, useState, useCallback } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'
import { AudioGalleryPlayer } from './AudioGalleryPlayer'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { resolveStoryboardScenes } from '@/lib/storyboard/resolveStoryboardScenes'
import {
  EMPTY_SCENE_FEEDBACK,
  sceneFeedbackHasContent,
  type SceneFeedbackState,
} from '@/lib/storyboard/feedbackChips'
import { StoryboardReviewHeader } from './storyboard-review/StoryboardReviewHeader'
import { StoryboardReviewPanel } from './storyboard-review/StoryboardReviewPanel'
import {
  StoryboardReviewerIdentitySheet,
  type ReviewerIdentity,
} from './storyboard-review/StoryboardReviewerIdentitySheet'
import {
  StoryboardAudienceResonancePanel,
  type SharedAudienceResonance,
} from './storyboard-review/StoryboardAudienceResonancePanel'

interface StandaloneStoryboardPlayerProps {
  projectData: any
  shareToken: string
}

export function StandaloneStoryboardPlayer({ projectData, shareToken }: StandaloneStoryboardPlayerProps) {
  const [selectedLanguage, setSelectedLanguage] = useState('en')
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0)
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false)
  const [arPanelOpen, setArPanelOpen] = useState(false)
  const [identitySheetOpen, setIdentitySheetOpen] = useState(false)

  const [reviewerStoryboardVersion] = useState(
    () => projectData?.storyboardRevision?.version ?? 1
  )

  const [feedbacks, setFeedbacks] = useState<Record<number, SceneFeedbackState>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const audienceResonance = projectData?.audienceResonance as SharedAudienceResonance | undefined

  const resolvedScenes = useMemo(
    () =>
      resolveStoryboardScenes({
        script: projectData.script,
        visionPhaseScenes: projectData.visionPhaseScenes,
      }),
    [projectData]
  )

  const availableLanguages = useMemo(() => {
    const langs = new Set<string>()
    resolvedScenes.forEach((scene: any) => {
      if (scene.narrationAudio) {
        Object.keys(scene.narrationAudio).forEach((lang) => {
          if (scene.narrationAudio[lang]?.url) langs.add(lang)
        })
      }
      if (scene.dialogueAudio) {
        Object.keys(scene.dialogueAudio).forEach((lang) => {
          if (Array.isArray(scene.dialogueAudio[lang]) && scene.dialogueAudio[lang].length > 0) {
            langs.add(lang)
          }
        })
      }
    })
    if (langs.size === 0) langs.add('en')
    return Array.from(langs).sort()
  }, [resolvedScenes])

  const currentFeedback = feedbacks[currentSceneIndex] ?? EMPTY_SCENE_FEEDBACK

  const reviewedCount = useMemo(
    () => Object.values(feedbacks).filter((f) => sceneFeedbackHasContent(f)).length,
    [feedbacks]
  )

  const canSubmit = reviewedCount > 0

  const updateFeedback = useCallback(
    (patch: Partial<SceneFeedbackState>) => {
      setFeedbacks((prev) => ({
        ...prev,
        [currentSceneIndex]: { ...(prev[currentSceneIndex] ?? EMPTY_SCENE_FEEDBACK), ...patch },
      }))
    },
    [currentSceneIndex]
  )

  const submitFeedback = async (identity: ReviewerIdentity, emailVerificationToken: string) => {
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const response = await fetch(`/api/vision/shared-project/${shareToken}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feedbacks,
          reviewerFirstName: identity.firstName,
          reviewerLastName: identity.lastName,
          reviewerEmail: identity.email,
          emailVerificationToken,
          storyboardVersion: reviewerStoryboardVersion,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit feedback')
      }

      setSubmitSuccess(true)
      setIdentitySheetOpen(false)
      toast.success('Feedback submitted', {
        description: `Recorded as pre-vis v${reviewerStoryboardVersion} from ${identity.email}.`,
      })
      setTimeout(() => setSubmitSuccess(false), 4000)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to submit feedback'
      setSubmitError(message)
      throw err
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmitClick = () => {
    if (!canSubmit) return
    setSubmitError(null)
    setIdentitySheetOpen(true)
  }

  const currentScene = resolvedScenes[currentSceneIndex]

  return (
    <div className="flex flex-col min-h-screen lg:h-screen bg-black lg:overflow-hidden relative">
      <StoryboardReviewHeader
        title={projectData.title}
        storyboardVersion={reviewerStoryboardVersion}
        revisionLabel={projectData?.storyboardRevision?.label}
        reviewedCount={reviewedCount}
        totalScenes={resolvedScenes.length}
        audienceScore={audienceResonance?.overallScore}
        onOpenAudienceResonance={
          audienceResonance ? () => setArPanelOpen(true) : undefined
        }
        onSubmitClick={handleSubmitClick}
        canSubmit={canSubmit}
        isSubmitting={isSubmitting}
        submitSuccess={submitSuccess}
      />

      <div className="flex flex-col lg:flex-row flex-1 min-h-0 lg:overflow-hidden">
        <div className="flex-1 p-2 sm:p-4 overflow-y-auto bg-gray-950 flex flex-col items-center min-h-0 pb-20 lg:pb-4">
          <div className="w-full max-w-5xl">
            <AudioGalleryPlayer
              scenes={resolvedScenes}
              selectedLanguage={selectedLanguage}
              onLanguageChange={setSelectedLanguage}
              availableLanguages={availableLanguages}
              onSceneChange={setCurrentSceneIndex}
              isSharedView
            />
          </div>
        </div>

        <div className="hidden lg:flex w-80 xl:w-96 shrink-0 bg-gray-900 border-l border-gray-800 flex-col overflow-y-auto p-4">
          <StoryboardReviewPanel
            sceneIndex={currentSceneIndex}
            feedback={currentFeedback}
            audienceAnalysis={currentScene?.audienceAnalysis}
            onRatingChange={(rating) => updateFeedback({ rating })}
            onCommentChange={(comment) => updateFeedback({ comment })}
            onTagsChange={(tags) => updateFeedback({ tags })}
          />
        </div>
      </div>

      {/* Mobile review drawer */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-gray-900 border-t border-gray-800">
        <button
          type="button"
          onClick={() => setMobilePanelOpen((o) => !o)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-white"
        >
          <span>Scene {currentSceneIndex + 1} feedback</span>
          {mobilePanelOpen ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          )}
        </button>
        <div
          className={cn(
            'overflow-hidden transition-all duration-200',
            mobilePanelOpen ? 'max-h-[70vh] overflow-y-auto px-4 pb-4' : 'max-h-0'
          )}
        >
          <StoryboardReviewPanel
            sceneIndex={currentSceneIndex}
            feedback={currentFeedback}
            audienceAnalysis={currentScene?.audienceAnalysis}
            onRatingChange={(rating) => updateFeedback({ rating })}
            onCommentChange={(comment) => updateFeedback({ comment })}
            onTagsChange={(tags) => updateFeedback({ tags })}
          />
        </div>
      </div>

      {audienceResonance && (
        <StoryboardAudienceResonancePanel
          data={audienceResonance}
          open={arPanelOpen}
          onClose={() => setArPanelOpen(false)}
        />
      )}

      <StoryboardReviewerIdentitySheet
        open={identitySheetOpen}
        onOpenChange={setIdentitySheetOpen}
        shareToken={shareToken}
        onVerifiedSubmit={submitFeedback}
        isSubmitting={isSubmitting}
        submitError={submitError}
      />
    </div>
  )
}
