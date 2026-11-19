# SceneFlow AI — December 3, 2026 Master Action Plan

> **Purpose:** Single, step-by-step execution playbook for **December 3–18, 2026** ahead of the **January 2027 1.0 launch**. Covers:
> 1. **New Pure-SaaS LLC + Free Instant IRS EIN** *(clean `< 24 mo` Google `$2K` Start Tier eligibility + agency firewall)*
> 2. **Whop Merchant of Record (MoR) Update & Evaluation** *(Stripe-independent safety + reserve planning)*
> 3. **Optimized Subscription Pricing Blueprint** *(White-Label Video Service flagship + predictable platform/storage MRR)*
> 4. **All 4 Startup Grant & Credit Submissions** *(Google `$2K → Scale AI`, NVIDIA Inception, ElevenLabs `33M` chars, Microsoft Founders Hub)*

---

## Quick Status Dashboard (Check Off As You Go)

- [ ] **Phase 0 (Nov 20 – Dec 2 · `$0` Cost):** LinkedIn personal Experience (`Founder & CEO, SceneFlow AI`) + LinkedIn Company Page live
- [ ] **Phase 1 (Thu, Dec 3):** Pay GCP past-due (`018BC7-19AC32-7CE0EE` → `$0.00`) + verify `brian@sceneflowai.studio` inbound mail + file new LLC online
- [ ] **Phase 2 (Fri–Mon, Dec 4–7):** Get free instant IRS EIN (`irs.gov`) + open business checking + update `legalCopy.ts` & Whop entity + register ElevenLabs account on `brian@sceneflowai.studio`
- [ ] **Phase 3 (Same Day EIN Lands, Dec 4–7):** Submit **NVIDIA Inception**, **ElevenLabs Grants**, **Google Start Tier (`$2K`)**, and **Microsoft Founders Hub**
- [ ] **Phase 4 (Mid-Dec, Dec 14–18):** Activate NVIDIA partner cloud perks + capture live multi-language screenshots (now that Vertex is active) + apply optimized pricing before Jan 2027 Wave 1 launch

---

## Part 1 — LLC & Free Instant EIN Execution (Dec 3 → Dec 7)

### Strategic Two-Entity Firewall
| Entity | Role | Why Separated |
| :--- | :--- | :--- |
| **NEW LLC:** `SceneFlow AI LLC` *(or `SceneFlow Studio LLC`)* · Formed Dec 3, 2026 | **100% Pure Multi-Tenant AI SaaS Software** (`sceneflowai.studio`) | **0 months old** → passes Google Start Tier's strict `< 24 mo` founding rule (vs. `LifeFocus LLC` at 26 mos), unlocks full 5-year Scale AI window (`2026–2031`), 1:1 KYB/domain match, zero agency risk |
| **EXISTING LLC:** `LifeFocus LLC` (`EIN 99-5087112`, formed Sept 23, 2024) | **Optional Independent White-Label Video Services Cash-Bridge** *(Customer #1 on SceneFlow Pro)* | Lets you close 3–5 paid Life Memoir / Real Estate clients (`$2,500–$5,000` cash bridge) under a completely separate consumer brand without ever triggering agency disqualification on Google, NVIDIA, or ElevenLabs |

### Exact Step-by-Step Formation (Dec 3)
1. **Pick Your Filing Option:**
   - **Lowest Cost (`~$104` total, `$60/yr` state renewal):** **Bizee (`https://bizee.com`) — Wyoming LLC** (`$0` service fee + `~$104` WY state fee + 1 yr free Registered Agent). **Decline EVERY paid upsell** (especially paid EIN, Operating Agreement, expedited banking).
   - **Best Privacy & Flat Renewals (`~$143` WY / `$164` FL):** **Northwest Registered Agent (`https://www.northwestregisteredagent.com`)** (`$39` service fee + state fee, includes 1 yr Registered Agent + private business street address, zero data resale).
   - **Direct State Filing (`$125` FL, `$138.75/yr` renewal):** Florida Sunbiz (`https://dos.fl.gov/sunbiz`) if using your Apollo Beach, FL street address directly.
   - *(Skip Delaware LLC for now — Delaware charges a mandatory `$300/yr` LLC franchise tax even at `$0` revenue.)*
2. **Get Your Free Instant IRS EIN (Dec 4–7 — Immediately After State Approval Email):**
   - Go directly to IRS Online EIN Assistant (`$0`, Mon–Fri 7am–10pm ET):  
     `https://www.irs.gov/businesses/small-businesses-self-employed/apply-for-an-employer-identification-number-ein-online`
   - Choose **Limited Liability Company (LLC)** → `1` member → download and save the instant **CP 575 PDF**.
3. **Open Dedicated Startup Bank Account (Dec 4–7, 1–3 Business Days, `$0/mo`):**
   - Apply online at **Mercury (`https://mercury.com`)** or **Relay (`https://relayfi.com`)** using your Articles of Organization PDF + CP 575 EIN PDF + driver's license.
4. **Update Website & Docs Before Submitting Any Grant (2 Minutes):**
   - Update [`src/config/legal/legalCopy.ts`](../src/config/legal/legalCopy.ts) (`LEGAL_COMPANY_NAME`, `LEGAL_EIN`, `LEGAL_STATE_OF_FORMATION`, `LEGAL_FORMATION_DATE`, `LEGAL_ADDRESS`) and footer strings in `messages/*.json`, push to `main`, and verify live on `https://sceneflowai.studio/legal`.

---

## Part 2 — Whop Update & Merchant of Record (MoR) Evaluation

### Question: *Is Whop the Best MoR Solution for SceneFlow (Given Your Prior Stripe Closure)?*

**Short Answer: YES — stay on Whop (`biz_6WdfJpp97rWaLl`) for your January 2027 launch.** Do **not** switch MoRs before launch, and specifically **avoid Stripe-backed MoRs**.

#### 2026 MoR Comparison Through SceneFlow's Exact Risk Lens

| Platform | Stripe Dependency? | Generative AI Video/Voice AUP Risk | Fees | Verdict for SceneFlow |
| :--- | :--- | :--- | :--- | :--- |
| **Whop** *(Already Integrated)* | Independent banking/payment rails (no personal Stripe Connect sub-account required) | **Friendly** to AI SaaS, creator studios & white-label digital business tools | `2.7% + $0.30` base + `~2.0%` tax remittance + `0.5%` billing (`~5.2%` all-in) + built-in `1.25%` affiliate rail | **KEEP FOR LAUNCH.** Already coded in [`tierCatalog.ts`](../src/lib/billing/tierCatalog.ts), supports your `18–35` affiliate flywheel, avoids Stripe risk |
| **Lemon Squeezy** | **HIGH RISK — Acquired by Stripe (2024)** | Runs under Stripe risk/underwriting | `5% + $0.50` + international surcharges | **AVOID** — prior Stripe closure creates automated freeze risk |
| **Polar.sh** | **HIGH RISK — Uses Stripe Connect Express** | Developer-friendly, but requires Stripe Connect merchant verification under your SSN/DOB | `5% + $0.50` (drops to `3.4% + $0.30` on paid plans) + Stripe payout fees | **AVOID** — same Stripe Connect underwriting exposure |
| **Paddle** | Independent (Adyen/Checkout.com rails) | **HIGH RISK — AUP explicitly restricts AI image generators & AI voice-cloning tools** | `5% + $0.50` | **DO NOT SWITCH NOW** — high risk of AUP rejection on SceneFlow's voice cloning & image generation |
| **FastSpring / PayPro Global** | Independent | Enterprise B2B friendly (manual underwriting) | Custom quote (typically `5.9%–8.9%` at low volume) | **Phase 2 Backup (Q2 2027+)** strictly for `$499–$599+/mo` enterprise PO/invoicing once MRR > `$10K/mo` |

### Exact Whop Update Checklist (Execute Dec 4–7 Before Opening Paid Checkout)
1. **Update Legal Entity & Payout Bank on `biz_6WdfJpp97rWaLl`:**
   - Log into Whop Business Dashboard → Settings → Business / Payouts → update legal entity from `LifeFocus LLC` to your new **`SceneFlow AI LLC`**, upload the new **CP 575 EIN PDF**, and link your new **Mercury / Relay** checking account.
2. **Verify Tax Remittance Module Is Enabled:**
   - Ensure Whop's **Sales Tax / VAT Remittance** module is switched ON across US states, EU, and UK so Whop genuinely remits taxes as MoR.
3. **Sync New Plan & Annual IDs:**
   - Create/verify Whop plan IDs for your finalized monthly + annual (`2 months free`) tiers and update env vars in Vercel (`WHOP_PLAN_*`) + [`src/lib/billing/tierCatalog.ts`](../src/lib/billing/tierCatalog.ts).
4. **Guard Against New-Account Rolling Reserves (Cash-Flow Firewall):**
   - Whop (like any MoR) may apply a temporary T+7/T+14 settlement delay or partial rolling reserve on a newly verified LLC.
   - **Solution:** Keep `PRELAUNCH_ACCESS_ONLY=true` on Dec 3, then launch **Wave 1 (Jan 2027)** with **10–15 paid Founding Operators** via `/admin/access`. Wait for **Payout #1** to settle into your bank account before opening Wave 2 self-serve traffic.

---

## Part 3 — Subscription Pricing Optimization (Flagship = White-Label Video Service Provider)

### 4 Leaks Caught in Your Current Pricing ([`tierCatalog.ts`](../src/lib/billing/tierCatalog.ts))

1. **`$19/mo` Hobbyist Arbitrage Leak:** Right now `$19/mo` keeps the Continuity Vault alive AND unlocks `$250` Add-On packs at `$0.010/cr` — letting active freelancers stay on `$19/mo` forever instead of upgrading to `$149/mo` Pro.
2. **Over-Bundled Credits Eroding Base SaaS Margin:**
   - `Pro ($149/mo)` currently bundles `15,000 cr` (~4.4 full 12-min films included!). Most operators won't buy Add-On packs until Film #5, and heavy Veo 3.1 burn eats base MRR margin.
   - `Studio ($599/mo)` bundles `75,000 cr` (`$0.0080/cr`) — a heavy Veo 3.1 agency can burn `~$160–$300` in GPU compute inside the base fee alone.
3. **Annual Discount Too Weak (`4%`):** Line 382 of [`tierCatalog.ts`](../src/lib/billing/tierCatalog.ts#L382) sets `annualMultiplier = 0.96` (only 4% off!). Almost nobody prepays a year for 4% off — missing massive Day-1 working capital.
4. **No Paid Storage Expansion or "Vault Hosting" Anti-Churn Safety Net:** White-label operators host dozens of 4K client masters and live `/share/screening-room` client links on your GCS/CDN bill — **live client links are your strongest anti-churn moat**, and storage should directly scale recurring revenue.

### Recommended Optimized Pricing Architecture (Predictable Platform + Storage MRR + High-Velocity Add-Ons)

| Tier | Monthly Base (Platform + Storage + Seats) | Annual Prepaid (`2 Mos Free` = 16.7% Off) | Included Monthly Credits | Active Vault Storage & Project Caps | White-Label & Team Unlocks | Add-On Pack Rates |
| :--- | :---: | :---: | :---: | :--- | :--- | :--- |
| **Explorer** *(Test Flight)* | **`$9`** *(one-time, 30 days)* | N/A | `750 cr` *(90-day expiry)* | `5 GB` *(30-day retention — subscribe to keep)* · `3` projects | Watermark-free sample film + script export (no add-on packs) | Upgrade to subscribe |
| **Creator & Vault** *(was `$19` Hobbyist)* | **`$29/mo`** | **`$290/yr`** | `2,000 cr/mo` | **`25 GB`** Continuity Vault · `10` projects · `1` seat · `1` voice clone | Full 4-Room Studio, Pre-Vis Animatics, 70+ dubs, SceneFlow-branded Screening Room | `$25` (`2,000 cr`, `$0.0125/cr`) · `$100` (`9,000 cr`, `$0.0111/cr`) |
| **Filmmaker & Pre-Vis** *(was `$49` Starter)* | **`$59/mo`** | **`$590/yr`** | `4,500 cr/mo` | **`50 GB`** Continuity Vault · `20` projects · `1` seat · `2` voice clones | Chapter releases, live studio clip hybrid mixing, investor Pre-Vis packages | `$25` & `$100` packs |
| **Operator Pro ★ FLAGSHIP** *(White-Label Video Service Business)* | **`$149/mo`** | **`$1,490/yr`** *(instant `$1.5K` cash upfront!)* | **`10,000 cr/mo`** *(trimmed from 15K → drives Add-On expansion from Film #4+)* | **`150 GB`** Client & Continuity Vault · `50` projects · `25` active client portals · `3` seats · `5` voice clones | **100% White-Label Portals** (`/intake`, `/blueprint/share` `$29` pass, `/share/continuity`, `/share/screening-room`), Mobile Companion PWA, 4K Veo 3.1 Quality, BYOK (`20%` fee) | Unlocks **`$250` Operator Bulk Pack (`25,000 cr`, `$0.0100/cr`)** + `$25` & `$100` packs |
| **Agency Scale** *(Multi-PM Video Business & L&D Teams)* | **`$599/mo`** | **`$5,990/yr`** | **`45,000 cr/mo`** *(trimmed from 75K → protects ~82% base SaaS margin!)* | **`750 GB`** Client & Continuity Vault · `200` projects · Unlimited client portals · `10` PM seats (w/ monthly credit caps) · `25` voice clones | Everything in Operator Pro + **Custom Domain** (`studio.theirbrand.com`), PM RBAC & credit guardrails, API + BYOK, Priority 4K queue | All packs including **`$250` Bulk Pack (`$0.0100/cr`)** |

#### Recurring Storage & Anti-Churn Add-Ons (Pure ~87%–95% Gross Margin MRR)
1. **Extra Vault Storage Packs:** **`+$15/mo` per `+100 GB`** (GCS cold/standard storage + CDN costs `~$2/mo` per 100 GB → **`~87%` recurring gross margin**). Operators with 20+ client 4K memoirs automatically expand their recurring monthly base without burning a single GPU credit!
2. **Pause-to-Vault Maintenance Plan (`$19/mo` Downgrade Save Option):** If a seasonal operator hits a slow month and clicks "Cancel", offer a 1-click **`$19/mo` Vault Hosting** plan (`0` monthly credits, generation paused, **all existing client `/share/screening-room` links & Continuity Vaults stay live**). Prevents hard churn and locks `95%+` margin recurring revenue until their next client order!
3. **30-Day Lapse Grace Policy:** Clearly state in Billing & Terms that canceling to `$0` freezes generation immediately and archives/removes Screening Room client links and Vault media after **30 days** unless reactivated or moved to `$19/mo` Vault Hosting.

### Why This Pricing Structure Wins for SceneFlow's Cash Flow
- **Higher Predictable Floor:** Raising base Creator entry from `$19` → `$29/mo` (+53%) while keeping `$9` Explorer as the frictionless entry funnel dramatically improves baseline MRR.
- **Protected Margin on Pro & Agency:** Trimming included monthly credits on Pro (`15K → 10K`) and Studio/Agency (`75K → 40K`) ensures **80%+ gross margin on base subscriptions even at 100% credit burn**, while operators delivering 6–20 client films/month reliably purchase **`+$75–$400/mo`** in Add-On packs.
- **Upfront Annual Cash Injection:** Moving annual billing from `4%` off → **`2 Months Free` (`16.7%` off)** means just **5 annual Operator Pro Founding Operators (`$1,490 × 5`) inject `$7,450` cash upfront** in January 2027 — funding GCP operations months ahead of usage!

---

## Part 4 — Day-by-Day Execution Schedule (Dec 3 – Dec 18, 2026)

### Before Dec 3 (Zero Cash Needed — Do Now)
- [ ] Update personal LinkedIn (`Founder & CEO at SceneFlow AI`) and publish the **SceneFlow AI** LinkedIn Company Page (`https://sceneflowai.studio`).
- [ ] Decide LLC name (`SceneFlow AI LLC` vs `SceneFlow Studio LLC`) and state (**Wyoming** via Bizee/Northwest or **Florida**).
- [ ] Decide if you want me to implement the **optimized pricing updates** in [`tierCatalog.ts`](../src/lib/billing/tierCatalog.ts) + landing pricing copy before Jan 2027 launch.

### Thursday, December 3, 2026 (Execution Day 1)
1. **Pay GCP past-due balance** on `018BC7-19AC32-7CE0EE` → verify **`$0.00` balance due** and zero warning banners.
2. **Restore `brian@sceneflowai.studio`** (and secondary `@sceneflowai.studio` mailbox) → send test inbound emails from personal email to verify zero bounce.
3. **File the new LLC online** (Bizee WY `~$104` or Northwest WY `~$143` — decline all upsells).
4. **Verify Vertex AI is restored** and test all 4 reviewer share links in Incognito:
   - `https://sceneflowai.studio/TheWhiteCityCurrent`
   - `https://sceneflowai.studio/s/series/cb7cc9e663a87a074e37c62636ef8c00`
   - `https://sceneflowai.studio/blueprint/share/5GDScu72NC7SWo1ioPMwzUxTg9KM2joz`
   - `https://sceneflowai.studio/share/script-resonance/_uHqaPHdsD0ZfdJoEwtnHBi4DiAJBW9s`

### Friday – Monday, December 4–7, 2026 (The Day State Approval Lands)
1. **Apply for free instant IRS EIN** at `irs.gov` → download **CP 575 PDF**.
2. **Open business bank account** (Mercury or Relay) under the new LLC.
3. **Update [`src/config/legal/legalCopy.ts`](../src/config/legal/legalCopy.ts)** + footer + all 4 grant docs with the new LLC name, EIN, formation date, and address → push to `main` (Vercel auto-deploys in ~2 min).
4. **Update Whop (`biz_6WdfJpp97rWaLl`)** legal entity, EIN, and bank payout account; confirm Tax Remittance ON.
5. **Create ElevenLabs account** registered to `brian@sceneflowai.studio`.
6. **Submit ALL 4 Non-Dilutive Credit Programs the Same Day:**
   - [ ] **NVIDIA Inception:** `https://programs.nvidia.com/phoenix/application` ([`NVIDIA_INCEPTION_APPLICATION.md`](./NVIDIA_INCEPTION_APPLICATION.md) + [`SceneFlow_AI_Pitch_Deck_2027.pdf`](./SceneFlow_AI_Pitch_Deck_2027.pdf))
   - [ ] **ElevenLabs Startup Grants (`33M` chars):** `https://elevenlabs.io/grants-application` ([`ELEVENLABS_STARTUP_GRANT_APPLICATION.md`](./ELEVENLABS_STARTUP_GRANT_APPLICATION.md))
   - [ ] **Google for Startups Cloud Program (`$2K` Start Tier):** `https://cloud.google.com/startup` ([`GOOGLE_STARTUP_APPLICATION.md`](./GOOGLE_STARTUP_APPLICATION.md)) — *keep GCP spend near `$0` during 5–10 day review!*
   - [ ] **Microsoft for Startups Founders Hub:** `https://startups.microsoft.com` *(free Azure + OpenAI backup credits)*

### Mid-December (Dec 14–22, 2026 — Post-Approvals)
- [ ] Activate **Google `$2K` credits** → run end-to-end production QA + capture real multi-language screenshots across Rooms 1–6.
- [ ] Activate **ElevenLabs `33M`-char grant** → add official **ElevenLabs Grants** badge to `sceneflowai.studio`.
- [ ] Upon **NVIDIA Inception approval** → apply via Inception portal for **Google Cloud AI Partner pathway**, **AWS Activate (Inception Org ID)**, and **NVIDIA NIM** credits.
- [ ] *(Optional Cash-Bridge)* Under separate **`LifeFocus LLC`**, close 3–5 paid Life Memoir / Real Estate clients (`$750–$1,500`, 50% upfront) to build a `$2,500–$5,000` Jan 2027 working-capital buffer.
- [ ] Open **January 2027 Wave 1 Cohort** (10–15 Founding Operators via `/admin/access`) → confirm Whop Payout #1 clears → open Wave 2 & public self-serve checkout.
