Hero video files are **not** committed here. Vercel NFT packed `public/videos/*.mp4` into serverless functions (618MB vs 250MB limit).

The player requests:

- `/videos/hero-{lang}.webm` — rewritten to Blob `landing/hero/sceneflow-hero-{lang}.webm` (1080p VP9 from the live 4K master)
- `/videos/hero-{lang}.mp4` — rewritten to Blob `landing/hero/sceneflow-hero-{lang}-1080p.mp4` (Safari / MP4 fallback)

Do **not** point these rewrites at the older watermarked `landing/hero/sceneflow-hero-{lang}.mp4` files.

Posters stay in git at `/images/hero-poster-{lang}.webp`, with `/images/hero-poster.webp` as the universal fallback.

To encode locally (gitignored) and publish to Blob:

    BLOB_READ_WRITE_TOKEN=... npm run landing:publish-hero-public -- --upload --skip-posters
