# Vertex Capacity and 429 Handling

Decision record for persistent `429 RESOURCE_EXHAUSTED` from Vertex AI Gemini.
Written so the question does not have to be re-litigated each time a run gets
rate limited.

## What a Vertex 429 actually is

Gemini on Vertex serves Standard PayGo from a **shared capacity pool**
(Dynamic Shared Quota). A 429 means the pool was contended at that instant. It
does **not** mean this project hit a configured ceiling, and for several Gemini
image models there is no editable quota row in the console at all — the only
row shown is a system limit marked "Unlimited", which is not reserved capacity.

Two consequences that are easy to get wrong:

- **"Request a quota increase" often does not apply.** There is nothing to
  raise on a model served by shared quota.
- **A dedicated instance or a move to Cloud Run does not help.** The constraint
  is model-side capacity, not our compute. Where our code runs is irrelevant to
  it. Moving off Vercel for this reason would cost a migration and change
  nothing about the 429 rate.

## What does help, cheapest first

### 1. The global endpoint (free, implemented)

The global endpoint routes each request to whichever region currently has
capacity, giving access to a multi-region pool instead of one region's share.
This is Google's own first recommendation for these errors.

`resolveVertexGeminiImageEndpoint` in
[src/lib/vertexai/vertexImageClient.ts](../src/lib/vertexai/vertexImageClient.ts)
now defaults **every** Gemini image model to global, not just Gemini 3.
`gemini-2.5-flash-image` — the eco tier carrying the highest request volume —
supports it. Gemini text already routed Gemini 3 to global.

Set `VERTEX_IMAGE_LOCATION` to pin a region if data residency ever requires it.
That gives up the capacity benefit, and Gemini 3 image models are global-only
so they ignore it.

### 2. Smoothing the burst (free, implemented)

Concurrency caps how many calls are open at once. It says nothing about how
close together they start, and Google explicitly advises against sharp
second-level spikes. Storyboard Express defaults allow 3 scenes each opening 3
flash beats, which is a nine-request spike inside one second.

`EXPRESS_IMAGE_MIN_SPACING_MS` (default 300) staggers image-lane dispatches in
[src/lib/sceneGeneration/expressTrafficCop.ts](../src/lib/sceneGeneration/expressTrafficCop.ts).
The same nine calls become a ramp without lowering the concurrency cap, so a
run is slower by roughly spacing x beats and no more.

### 3. Standard PayGo tier promotion (free, automatic)

Standard PayGo adjusts an organization's baseline throughput based on its total
spend on eligible services over a rolling 30-day period, promoting to higher
tiers as spend grows. Part of this problem therefore improves on its own once
subscription volume arrives — which is a real argument for not buying capacity
before launch.

### 4. Priority PayGo (premium per-token, no commitment, shipped behind a flag)

Priority PayGo is the middle option: the same pay-per-token model at roughly
double the Standard rate, with more consistent performance and an organization
baseline available **immediately** with no ramp-up period (10M TPM for Gemini
Pro models, 50M TPM for Flash and Flash-Lite). Traffic is only downgraded to
Standard when there is no spare priority capacity.

It is selected per request by header, so it is implemented as a flag rather
than a rewrite. `VERTEX_PRIORITY_PAYGO=true` adds
`X-Vertex-AI-LLM-Request-Type: shared` and
`X-Vertex-AI-LLM-Shared-Request-Type: priority` via
[src/lib/vertexai/priorityPaygo.ts](../src/lib/vertexai/priorityPaygo.ts).

**This is the intended launch lever.** Leave it `false` for dev and test, where
Standard PayGo costs nothing extra and occasional 429s are tolerable. Turn it
on in production when subscription revenue covers the premium — it is a single
environment variable, not a deploy.

### 5. Provisioned Throughput (post-launch decision, not now)

Provisioned Throughput is the only option that gives assured capacity with an
SLA. It is also a **fixed-cost, non-cancelable commitment** in 1-week, 1-month,
3-month, or 1-year terms, priced in GSUs per model and billed in full
regardless of actual usage — and the term fee still applies if the model is
discontinued mid-term.

Do not buy it before launch. There is no usage history to size GSUs against,
and paying for idle reserved capacity during development is the most expensive
possible way to avoid a 429.

Revisit once production traffic has a shape, then:

- Size against a percentile of real traffic, not peak. Google's own guidance is
  to let Standard or Priority PayGo absorb the rest; provisioning for peak
  drives utilization and cost the wrong way.
- Use the GSU estimator in the console for the exact model and version.
- A 1-year term is about 26% cheaper per GSU than 1-month, and the model
  assigned to purchased GSUs can be changed later.

## Summary

| Option | Cost | Commitment | Status |
| --- | --- | --- | --- |
| Global endpoint | Free | None | Implemented |
| Burst smoothing | Free | None | Implemented |
| Process-wide concurrency ceiling | Free | None | Implemented |
| Standard PayGo tier promotion | Free | None | Automatic with spend |
| Priority PayGo | ~2x per-token | None | Implemented, flag off |
| Provisioned Throughput | Fixed term fee | 1 week to 1 year, non-cancelable | Deferred to post-launch |
| Cloud Run / dedicated instance | Migration cost | n/a | Rejected: does not address the constraint |

## Existing handling this builds on

The app already layers retry and concurrency control, which stays unchanged:

- `fetchWithRetry` with exponential backoff and jitter in
  [src/lib/utils/retry.ts](../src/lib/utils/retry.ts).
- A text model fallback chain on quota errors in
  [src/lib/vertexai/geminiTextFallback.ts](../src/lib/vertexai/geminiTextFallback.ts).
- Per-run lane caps, AIMD halving, and a regulator in `ExpressTrafficCop`.
- `failFastOnRateLimit` on Express beat frames, so a rate-limited frame frees
  its lane slot immediately instead of sleeping through a retry ladder.
- A process-wide ceiling on concurrent image generations in
  [src/lib/vertexai/vertexImageGate.ts](../src/lib/vertexai/vertexImageGate.ts).

## Why the lane cap was not the whole cap

`ExpressTrafficCop` is constructed per `runExpress` invocation and can only see
that one run. Two overlapping Frame Agent runs build two cops, each correctly
honoring its own cap, so the pair issues twice the intended number of calls. A
manual frame regen posts straight to `/api/scene/generate-image` and is counted
by neither. A run could therefore report a lane cap of two while more than
twice that many generations were open — read as a broken limiter, when in fact
every limiter present was working within the only scope it had.

`vertexImageGate` closes that by counting at the single point every generation
passes through, `generateVertexGeminiImage`. Two layers, different jobs: the
gate is a hard ceiling and nothing else, while the cop keeps AIMD halving,
cooldowns, the regulator, and the throttle events the UI renders. They share a
default of 2 on purpose, so a single well-behaved run never queues at the gate
and the gate only bites on traffic the cop cannot see.

Note that fail-fast raised effective throughput without changing any cap: a
rate-limited frame used to sleep 5s/15s/30s holding its slot and now releases
it on the first 429, so the same two slots turn over far more often. Read
`[Vertex Image Gate]` log lines for what is actually open, rather than
inferring it from the configured lane cap.

One known gap remains, deliberately not addressed: the gate is per process, so
concurrent Vercel instances still have no shared view of total outbound rate. A
distributed limiter would need Marketplace Redis. Worth doing only if 429s
persist after the changes above.
