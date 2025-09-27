export type CtaEvent = {
  event: string
  label?: string
  location?: string
  value?: string | number
}

export async function trackCta(_: CtaEvent) {
  // no-op in SSR and client to avoid build/runtime issues
  return
}

