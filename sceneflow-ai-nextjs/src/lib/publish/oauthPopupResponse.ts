import { NextResponse } from 'next/server'

export type SocialOAuthPlatform = 'youtube' | 'facebook' | 'tiktok'

export type SocialOAuthPopupStatus =
  | 'connected'
  | 'not_configured'
  | 'error'
  | 'missing_code'
  | 'callback_failed'

export interface OAuthPopupHtmlOptions {
  platform: SocialOAuthPlatform
  status: SocialOAuthPopupStatus
  message?: string
}

const PLATFORM_LABELS: Record<SocialOAuthPlatform, string> = {
  youtube: 'YouTube',
  facebook: 'Facebook',
  tiktok: 'TikTok',
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Self-closing HTML response for popup OAuth flows (`/api/publish/[platform]/auth?...&popup=1`).
 *
 * Uses BroadcastChannel + localStorage + window.opener.postMessage so completion is delivered
 * reliably even when Cross-Origin-Opener-Policy (`COOP`) on `accounts.google.com` clears
 * `window.opener` during the cross-origin OAuth consent hop.
 */
export function buildOAuthPopupHtmlResponse(options: OAuthPopupHtmlOptions): NextResponse {
  const label = PLATFORM_LABELS[options.platform] || options.platform
  const isSuccess = options.status === 'connected'

  const heading = isSuccess
    ? `${label} Authorized`
    : options.status === 'not_configured'
      ? `${label} Platform Setup Required`
      : `${label} Authorization Incomplete`

  const subtitle =
    options.message ||
    (isSuccess
      ? `SceneFlow is now authorized to publish to your ${label} account. Returning to SceneFlow…`
      : options.status === 'not_configured'
        ? `SceneFlow's platform OAuth credentials for ${label} have not been configured yet.`
        : `Authorization was cancelled or could not be completed. You can close this window and try again.`)

  const payloadJson = JSON.stringify({
    type: 'sceneflow:social-oauth',
    platform: options.platform,
    status: options.status,
    message: options.message || undefined,
    ts: Date.now(),
  }).replace(/</g, '\\u003c')

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(heading)} — SceneFlow</title>
  <style>
    body {
      margin: 0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #09090b;
      color: #f4f4f5;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: 24px;
      box-sizing: border-box;
    }
    .card {
      max-width: 380px;
      width: 100%;
      border-radius: 16px;
      border: 1px solid ${isSuccess ? 'rgba(16,185,129,0.35)' : 'rgba(245,158,11,0.35)'};
      background: #18181b;
      padding: 24px;
      text-align: center;
      box-shadow: 0 20px 40px rgba(0,0,0,0.45);
    }
    .badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 44px;
      height: 44px;
      border-radius: 9999px;
      margin-bottom: 12px;
      font-size: 20px;
      background: ${isSuccess ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)'};
      color: ${isSuccess ? '#34d399' : '#fbbf24'};
    }
    h1 {
      margin: 0 0 8px;
      font-size: 16px;
      font-weight: 600;
    }
    p {
      margin: 0 0 18px;
      font-size: 13px;
      line-height: 1.5;
      color: #a1a1aa;
    }
    button {
      appearance: none;
      border: 1px solid #3f3f46;
      background: #27272a;
      color: #f4f4f5;
      border-radius: 8px;
      padding: 8px 16px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
    }
    button:hover {
      background: #3f3f46;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">${isSuccess ? '&#10003;' : '!'}</div>
    <h1>${escapeHtml(heading)}</h1>
    <p>${escapeHtml(subtitle)}</p>
    <button type="button" onclick="window.close()">Close Window</button>
  </div>
  <script>
    (function () {
      var payload = ${payloadJson};
      try {
        if (typeof BroadcastChannel !== 'undefined') {
          var bc = new BroadcastChannel('sceneflow-social-oauth');
          bc.postMessage(payload);
          setTimeout(function () { try { bc.close(); } catch (e) {} }, 150);
        }
      } catch (e) {}
      try {
        localStorage.setItem('sceneflow:social-oauth', JSON.stringify(payload));
      } catch (e) {}
      try {
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage(payload, window.location.origin);
        }
      } catch (e) {}
      setTimeout(function () {
        try { window.close(); } catch (e) {}
      }, ${isSuccess ? 250 : 1200});
    })();
  </script>
</body>
</html>`

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  })
}
