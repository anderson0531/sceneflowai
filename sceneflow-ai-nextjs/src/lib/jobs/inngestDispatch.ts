/** True when Inngest cloud dispatch is configured (event key present). */
export function isInngestDispatchConfigured(): boolean {
  return Boolean(process.env.INNGEST_EVENT_KEY?.trim())
}
