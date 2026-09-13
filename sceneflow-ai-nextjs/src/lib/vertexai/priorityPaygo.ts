/**
 * Priority PayGo opt-in for Vertex Gemini requests.
 *
 * Gemini on Vertex serves Standard PayGo from a shared pool, so a 429 is
 * contention rather than a project limit — there is usually no quota row to
 * raise. Priority PayGo is the no-commitment answer: the same pay-per-token
 * billing at a premium rate, against an organization baseline available
 * immediately with no ramp-up period. It is selected per request by header,
 * which is why this ships behind a flag and costs nothing until the flag is
 * set: dev and test stay on Standard, and production can switch over on launch
 * day without a deploy.
 *
 * The alternative for assured capacity is Provisioned Throughput, a
 * non-cancelable fixed-term commitment billed whether or not it is used. See
 * docs/VERTEX_CAPACITY.md.
 */

export function isPriorityPaygoEnabled(): boolean {
  return process.env.VERTEX_PRIORITY_PAYGO === 'true'
}

/**
 * Headers that route a request through Priority PayGo, or nothing when the
 * flag is off. Spread into an existing header object.
 */
export function priorityPaygoHeaders(): Record<string, string> {
  if (!isPriorityPaygoEnabled()) return {}
  return {
    'X-Vertex-AI-LLM-Request-Type': 'shared',
    'X-Vertex-AI-LLM-Shared-Request-Type': 'priority',
  }
}
