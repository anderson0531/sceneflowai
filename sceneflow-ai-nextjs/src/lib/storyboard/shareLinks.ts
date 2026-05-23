export function getStoryboardEmbedHref(slugOrToken: string): string {
  return `/embed/storyboard/${encodeURIComponent(slugOrToken.trim())}`
}

export function getStoryboardReviewHref(slugOrToken: string): string {
  return `/${encodeURIComponent(slugOrToken.trim())}`
}
