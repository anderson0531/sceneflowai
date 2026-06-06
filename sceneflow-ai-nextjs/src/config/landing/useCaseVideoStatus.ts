/** SceneFlow-produced demos approved for landing playback. All others are thumbnail-only until enabled. */
export const USE_CASE_VIDEO_READY: Partial<Record<string, Partial<Record<string, boolean>>>> = {
  property: { 'residential-real-estate': true },
  knowledge: { 'k12-higher-ed': true, 'video-memoirs': true },
  jit: { 'hyper-local-news': true },
  b2b: { 'product-explainer-videos': true },
  public: { 'ngo-impact-reports': true },
}

export function isUseCaseVideoEnabled(categoryId: string, exampleId: string): boolean {
  return USE_CASE_VIDEO_READY[categoryId]?.[exampleId] === true
}
