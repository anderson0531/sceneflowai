Hero video files are **not** committed here, except the English WebM. Vercel NFT packed `public/videos/*.mp4` into serverless functions (618MB vs 250MB limit). `outputFileTracingExcludes` keeps `*.webm` out of serverless functions.

The player requests:

- `/videos/hero-en.webm` — committed `hero-en.webm` (1080p VP9 from Blob `Hero Video (English).mp4`). This path is not rewritten.
- `/videos/hero-en.mp4` — committed `hero-en.mp4` (1080p H.264 from the same master, Safari fallback). This path is not rewritten.
- `/videos/hero-{lang}.webm` for other locales — rewritten to Blob `landing/hero/sceneflow-hero-{lang}.webm` (1080p VP9 from the live master)
- `/videos/hero-{lang}.mp4` for other locales — rewritten to Blob `landing/hero/sceneflow-hero-{lang}-1080p.mp4` (Safari / MP4 fallback)

Do **not** point these rewrites at the older watermarked `landing/hero/sceneflow-hero-{lang}.mp4` files.

Posters stay in git at `/images/hero-poster-{lang}.webp`, with `/images/hero-poster.webp` as the universal fallback.

To encode locally (gitignored) and publish to Blob:

    BLOB_READ_WRITE_TOKEN=... npm run landing:publish-hero-public -- --upload --skip-posters
