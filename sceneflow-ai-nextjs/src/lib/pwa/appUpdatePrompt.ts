/** Show the in-app update banner only for an installed app with a newer worker waiting. */
export type AppUpdatePromptState = {
  hasWaitingWorker: boolean
  standalone: boolean
  dismissed: boolean
}

export const APP_UPDATE_DISMISS_KEY = 'sf-app-update-dismissed'

export function shouldShowAppUpdatePrompt(state: AppUpdatePromptState): boolean {
  return state.hasWaitingWorker && state.standalone && !state.dismissed
}

export function isAppUpdateDismissed(
  workerUrl: string | null | undefined,
  storedWorkerUrl: string | null | undefined
): boolean {
  if (!workerUrl || !storedWorkerUrl) return false
  return storedWorkerUrl === workerUrl
}
