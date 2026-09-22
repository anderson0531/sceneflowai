import { getImageProps } from 'next/image'
import { canOptimizePlayerStill } from '@/lib/storyboard/playerStillSource'

/**
 * Decode the bitmap the stage will paint.
 *
 * Optimized stills go through the same `getImageProps` request as `next/image`
 * (same sizes and quality). A raw `<img>` of the original URL is a different
 * cache key and must not count as ready.
 */
export function preloadPlayerStill(url: string, sizes: string): Promise<void> {
  if (!canOptimizePlayerStill(url)) {
    return decodeImage(url)
  }
  const { props } = getImageProps({
    src: url,
    alt: '',
    fill: true,
    sizes,
  })
  return decodeImage(props.src, props.srcSet, sizes)
}

function decodeImage(src: string, srcSet?: string, sizes?: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    if (srcSet) img.srcset = srcSet
    if (sizes) img.sizes = sizes
    img.onload = () => {
      const decoded = img.decode?.()
      if (decoded && typeof decoded.then === 'function') {
        decoded.then(() => resolve()).catch(() => resolve())
        return
      }
      resolve()
    }
    img.onerror = () => reject(new Error('still failed to decode'))
    img.src = src
  })
}
