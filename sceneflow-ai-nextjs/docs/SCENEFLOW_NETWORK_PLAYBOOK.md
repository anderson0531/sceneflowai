# SceneFlow Network playbook

SceneFlow wins the same way Nebula did: **sell a production utility first**, then keep standout creators with distribution and a later revenue share. The public site is a studio. The SceneFlow Network is an invite-only catalog that does not exist as a storefront until titles are programmed.

This document is the source of truth for positioning, destinations, curation, delivery, and payouts. Phase 1 ships communication and the Originals Seed pipeline. Phases 2–4 implement catalog, HLS/Media CDN, and money against the contracts in [`src/lib/network/`](../src/lib/network/).

## 1. Positioning

**Hero promise:** one guided studio from spark to master. Export anywhere.

**Not the hero promise:** a two-sided streaming marketplace, a $3–$5 Watch SKU, or “earn on our network.”

Three jobs, one sentence:

- Indie filmmakers **download a master and ship anywhere**.
- YouTubers (and Bilibili UP 主 in mainland China) **monetize a long-form master or scene/chapter cuts**.
- Growth **promotes trailers as shorts** (TikTok, Douyin, YouTube Shorts).

The SceneFlow Network is a quieter invite: *Standout projects can apply for the invite-only SceneFlow Network.* Capture filmmakers with **Apply for the SceneFlow Originals Seed Program**, not a Watch subscribe button.

Do not announce an open revenue-share storefront, a public `/watch` catalog, or a consumer subscription until Seed titles are accepted and at least one title is packaged.

## 2. Locale destinations

There is no single “Chinese YouTube.” Named platforms are examples, not a lock-in. Live publish APIs are YouTube, TikTok, and Facebook only — **do not promise one-click Bilibili or Douyin publish**.

| Locale | Long-form / series | Trailers / shorts |
| --- | --- | --- |
| Default (`en`, `zh-TW`, others) | YouTube | TikTok and Shorts |
| `zh-CN` (and hero locale `zh`) | 哔哩哔哩 (download / upload) | 抖音 (download / upload) |

Mainland notes:

- **Bilibili** is the creator-upload analog (UGC, UP 主 monetization, series and mid/long video).
- Youku / iQiyi / Tencent Video are licensed SVOD catalogs (closer to Netflix).
- 西瓜视频 is ByteDance mid/long-form, weaker as a creator home.
- **Douyin** is the mainland shorts/trailer layer. WeChat 视频号 is secondary.

Implementation: [`src/lib/network/destinations.ts`](../src/lib/network/destinations.ts). Copy interpolates `{longForm}` and `{shorts}`.

## 3. Curation (editorial, not open publish)

No user can publish into the streaming catalog. Safety moderation and catalog greenlight are different jobs.

| Layer | Who | Decision |
| --- | --- | --- |
| Generation safety | Vertex + Kling/Hive guards | Can this asset be created or stored? |
| Rights / windowing | Human editor + signed terms | Exclusive premiere window and chain of title? |
| Programming | Human editor | Does this title belong on a $3–$5 indie catalog this month? |
| Qualified watch | Playback ledger | Does this minute count for the pool? |

Title flow: Studio master → **Submit for Network** → automated safety + provenance → admin **Accepted / Hold / Rejected** → Transcoder HLS only after Accept.

v1 policy: finished narrative shorts, features, and series pilots. No open UGC, no raw generation dumps, no self-published drafts.

## 4. Delivery (GCP, no raw MP4 for catalog)

Do not serve catalog titles as raw MP4 blobs. Do not use Google Cloud Video Stitcher (that is SSAI; this SVOD is ad-free). Package with the **Transcoder API** (same 360/720/1080 ladder as landing heroes). Edge with **Media CDN**, not the landing-only classic Cloud CDN script.

Keep the 4K mezzanine on GCS as archive. HLS covers web + iOS for Seed. Screening Room (`/s/[id]`) stays progressive MP4 for private review. YouTube/TikTok keep public MP4 / `PULL_FROM_URL`. Indie download stays first-class.

First viewer surface later: `/watch` on the same site.

## 5. Economics (designed, not billed until a subscriber floor)

Watch SKU: **$3–$5/month**, separate from Studio credits. Never mix credit packs into the creator pool.

Monthly settlement:

1. Gross Watch revenue
2. Minus payment-gateway fees and **measured** hosting/CDN/transcode
3. **50% of net → creator pool**
4. Title share = `qualified_minutes(title) / qualified_minutes(all live titles)`
5. **Direct attribution bonus:** `$1/month` per active referred subscriber, **outside** the pool
6. Founding cohort: documented minimum guarantee (ad spend and/or floor) so day-one talent is not taking “50% of zero”

Qualified watch time (not views): authenticated Watch subscribers only; skip the first 30 seconds; exclude creator self-watch, looping trailers, hidden tabs, and bot bursts; cap one account per title per day. Heartbeats from the player are the v1 source of truth.

Code: [`src/lib/network/qualifiedWatch.ts`](../src/lib/network/qualifiedWatch.ts), [`src/lib/network/poolSettlement.ts`](../src/lib/network/poolSettlement.ts).

Payout ops for 5–10 Seed creators: manual monthly settlement from an admin ledger. Do not build Stripe Connect until the cohort is larger than the ops cost.

## 6. Cold start (Originals Seed Program)

1. Market the studio. Network is a badge.
2. Hand-pick **5–10** filmmakers with existing niche followings.
3. Offer **distribution leverage** (funded teaser ads on SceneFlow’s YouTube — later Bilibili if a CN cohort exists) in exchange for an exclusive premiere window.
4. Capture applications on `#for-filmmakers` into `waitlist/originals-seed/` — **separate** from the launch-news list at `waitlist/launch-november-2026/` (prefix kept so confirmed launch emails are not orphaned).

Public launch-date badges are **dateless**. The existing NotifyCapture + Launch Email admin card is the blast list for the real campaign.

## 7. Phased build

| Phase | Ships |
| --- | --- |
| **1 (this work)** | Playbook, utility-first copy, locale destinations, dateless waitlist, Seed application + admin inbox |
| **2** | Catalog/title tables, Submit-for-Network, admin accept/reject, rights/window fields |
| **3** | Transcoder jobs, Media CDN signed playback, `/watch` browse + ABR player |
| **4** | Watch SKU, qualified-minute ledger, monthly pool job, referral codes, creator earnings |

Types for later phases live in [`src/lib/network/types.ts`](../src/lib/network/types.ts).
