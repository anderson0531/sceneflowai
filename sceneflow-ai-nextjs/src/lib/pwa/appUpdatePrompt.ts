/** Show the in-app update banner only while a newer worker is waiting. */
export function shouldShowAppUpdatePrompt(hasWaitingWorker: boolean): boolean {
  return hasWaitingWorker
}