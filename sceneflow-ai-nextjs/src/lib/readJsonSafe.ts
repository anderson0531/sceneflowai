/**
 * Parse fetch Response body without throwing on Vercel HTML/plain-text error pages.
 */
export async function readJsonSafe(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text()
  try {
    return text ? (JSON.parse(text) as Record<string, unknown>) : {}
  } catch {
    const snippet = text.slice(0, 200)
    if (res.status === 504 || res.status === 408) {
      return { message: 'Generation timed out — please try again', error: snippet }
    }
    if (res.status === 503) {
      return {
        message:
          'Revision ran out of memory or timed out — try a narrower focus (e.g. Story only).',
        error: snippet,
      }
    }
    if (res.status === 502) {
      return {
        message: 'Server error during revision — please try again with a narrower focus.',
        error: snippet,
      }
    }
    return { message: snippet || 'Unexpected server response', error: snippet }
  }
}
