Hero video files are **not** committed here, except the English, Spanish, and Portuguese landing cuts. Vercel NFT packed `public/videos/*.mp4` into serverless functions (618MB vs 250MB limit). `outputFileTracingExcludes` keeps `*.webm` and `*.mp4` out of serverless functions.

The player requests:

- `/videos/hero-en.webm` and `/videos/hero-en.mp4` — committed files from Blob `Hero Video (English).mp4`. These paths are not rewritten.
- `/videos/hero-es.webm` and `/videos/hero-es.mp4` — committed files from Blob `Hero Video (Spanish).mp4`. These paths are not rewritten.
- `/videos/hero-pt.webm` and `/videos/hero-pt.mp4` — committed files from Blob `Hero Video (Portuguese).mp4`. These paths are not rewritten.
- `/videos/cinematic-drama-trailer.webm` — committed Feature-Length Cinematic Drama trailer. The MP4 fallback stays on Blob.
- `/videos/hero-{lang}.webm` for other locales — rewritten to Blob `landing/hero/sceneflow-hero-{lang}.webm` (1080p VP9 from the live master)
- `/videos/hero-{lang}.mp4` for other locales — rewritten to Blob `landing/hero/sceneflow-hero-{lang}-1080p.mp4` (Safari / MP4 fallback)

Do **not** point these rewrites at the older watermarked `landing/hero/sceneflow-hero-{lang}.mp4` files.

Posters stay in git at `/images/hero-poster-{lang}.webp`, with `/images/hero-poster.webp` as the universal fallback.

To encode locally (gitignored) and publish to Blob:

    BLOB_READ_WRITE_TOKEN=... npm run landing:publish-hero-public -- --upload --skip-posters
