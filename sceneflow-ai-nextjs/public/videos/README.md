Hero video files are **not** committed here. Vercel NFT packed `public/videos/*.mp4` into serverless functions (618MB vs 250MB limit).

The player still requests `/videos/hero-{lang}.mp4`. `next.config.mjs` rewrites that to the public Blob file `landing/hero/sceneflow-hero-{lang}.mp4`.

Posters stay in git at `/images/hero-poster-{lang}.webp`, with `/images/hero-poster.webp` as the universal fallback.

To encode locally (gitignored):

    npm run landing:publish-hero-public
