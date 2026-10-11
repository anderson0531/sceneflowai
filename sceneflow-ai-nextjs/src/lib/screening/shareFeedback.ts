type ShareLinkFields = {
  shareToken?: string
  slug?: string
  allowFeedback?: boolean
}

/** Existing Screening Room links default to feedback on. View-only sets this false. */
export function isScreeningFeedbackAllowed(link?: { allowFeedback?: boolean } | null): boolean {
  return link?.allowFeedback !== false
}

export function matchingShareLink(
  metadata: { storyboardShareLink?: ShareLinkFields; screeningRoomShareLink?: ShareLinkFields } | null | undefined,
  shareToken: string
): ShareLinkFields | null {
  const links = [metadata?.storyboardShareLink, metadata?.screeningRoomShareLink]
  return (
    links.find((link) => link && (link.shareToken === shareToken || link.slug === shareToken)) ??
    null
  )
}
