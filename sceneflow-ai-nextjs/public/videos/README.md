Hero video files are **not** committed here, except the English, Spanish, Portuguese, Chinese, and Arabic landing cuts. Vercel NFT packed `public/videos/*.mp4` into serverless functions (618MB vs 250MB limit). `outputFileTracingExcludes` keeps `*.webm` and `*.mp4` out of serverless functions.

The player requests:

- `/videos/hero-en.webm` and `/videos/hero-en.mp4` — committed files from Blob `Hero Video (English).mp4`. These paths are not rewritten.
- `/videos/hero-es.webm` and `/videos/hero-es.mp4` — committed files from Blob `Hero Video (Spanish).mp4`. These paths are not rewritten.
- `/videos/hero-pt.webm` and `/videos/hero-pt.mp4` — committed files from Blob `Hero Video (Portuguese).mp4`. These paths are not rewritten.
- `/videos/hero-zh.webm` and `/videos/hero-zh.mp4` — committed files from Blob `Hero Video (Chinese).mp4`. These paths are not rewritten.
- `/videos/hero-ar.webm` and `/videos/hero-ar.mp4` — committed files from Blob `Her Video (Arabic).mp4`. These paths are not rewritten.
- `/videos/cinematic-drama-trailer.webm` and `/videos/cinematic-drama-trailer.mp4` — committed 90s Feature-Length Cinematic Drama trailer (*The White City Current*).
- `/videos/animated-series-trailer.webm` and `/videos/animated-series-trailer.mp4` — committed 90s Full-Season Animated Series trailer (*Hart House*).
- `/videos/documentary-trailer.webm` and `/videos/documentary-trailer.mp4` — committed 90s Long-Form Documentary trailer (*The Long Thought*).
- `/videos/training-series-trailer.webm` and `/videos/training-series-trailer.mp4` — committed 90s Multi-Module Training Series trailer (*Five Plates*).

English, Spanish, Portuguese, Chinese, and Arabic are committed, so those paths are not rewritten to Blob. Do **not** point a rewrite at the older watermarked `landing/hero/sceneflow-hero-{lang}.mp4` files.

Posters stay in git at `/images/hero-poster-{lang}.webp`, with `/images/hero-poster.webp` as the universal fallback.

To encode locally (gitignored) and publish to Blob:

    BLOB_READ_WRITE_TOKEN=... npm run landing:publish-hero-public -- --upload --skip-posters
