export function getStoryboardEmbedHref(slugOrToken: string): string {
  return `/embed/pre-vis/${encodeURIComponent(slugOrToken.trim())}`
}

export function getStoryboardReviewHref(slugOrToken: string): string {
  return `/${encodeURIComponent(slugOrToken.trim())}`
}
