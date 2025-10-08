// Minimal KV adapter using Upstash/Redis REST API semantics.
// Falls back to disabled mode when env vars are missing.

export type ChatRecord = {
  id: string
  clientId?: string
  sessionId: string
  channel: string
  scopeId?: string
  authorRole: 'owner' | 'collaborator'
  alias: string
  text: string
  createdAt: string
  seq: number
}

const KV_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL
const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN

export function kvAvailable(): boolean {
  return Boolean(KV_URL && KV_TOKEN)
}

function keyFor(sessionId: string, channel: string): string {
  return `sf:chat:${sessionId}:${channel}`
}

async function kvFetch(path: string, body: any) {
  const res = await fetch(`${KV_URL}/${path}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${KV_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  }).catch(() => null)
  if (!res || !res.ok) throw new Error('KV request failed')
  return res.json().catch(()=>null)
}

export async function addChatMessageKV(rec: ChatRecord): Promise<void> {
  if (!kvAvailable()) throw new Error('KV disabled')
  const k = keyFor(rec.sessionId, rec.channel)
  // ZADD key score member(JSON)
  await kvFetch('zadd', { key: k, score: rec.seq, member: JSON.stringify(rec) })
}

export async function listChatMessagesKV(sessionId: string, channel: string, since?: number, limit: number = 200): Promise<ChatRecord[]> {
  if (!kvAvailable()) throw new Error('KV disabled')
  const k = keyFor(sessionId, channel)
  // Range by score, ascending. Upstash uses ZRANGEBYSCORE with min/max.
  // If since is provided, start after that; otherwise return last N via ZRANGE with negative indexes.
  if (since && since > 0) {
    const min = since + 1
    const max = '+inf'
    const res = await kvFetch('zrangebyscore', { key: k, min: String(min), max: String(max) })
    const arr: string[] = Array.isArray(res?.result) ? res.result : []
    const parsed = arr.map(s => { try { return JSON.parse(s) } catch { return null } }).filter(Boolean)
    return parsed.slice(-limit)
  } else {
    // Get last limit entries
    const res = await kvFetch('zrange', { key: k, start: -limit, stop: -1 })
    const arr: string[] = Array.isArray(res?.result) ? res.result : []
    const parsed = arr.map(s => { try { return JSON.parse(s) } catch { return null } }).filter(Boolean)
    return parsed
  }
}


