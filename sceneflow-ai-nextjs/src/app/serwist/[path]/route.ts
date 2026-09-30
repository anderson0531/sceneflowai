import { createSerwistRoute } from '@serwist/turbopack'

/**
 * Builds src/sw.ts and serves it at /serwist/sw.js.
 * next.config rewrites /sw.js here so the installed app updates this worker.
 * Video files are left out of the precache.
 * esbuild 0.27+ is a direct dependency: Serwist's entry config does not build
 * on the older copy that other packages hoist.
 */
export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } = createSerwistRoute({
  swSrc: 'src/sw.ts',
  useNativeEsbuild: true,
  globIgnores: ['**/node_modules/**/*', '**/*.{mp4,webm,mov,avi,mkv}'],
})