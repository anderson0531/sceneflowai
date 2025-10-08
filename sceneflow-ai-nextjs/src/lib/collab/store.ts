/*
  Minimal in-memory collaboration store with types.
  NOTE: This is a lightweight fallback. For persistence, replace with a DB/KV adapter.
*/

export type ScopeType = 'concepts' | 'scene' | 'actionPlan' | 'creationHub' | 'generic'

export interface CollaborationSpaceKey {
  projectId: string
  scopeType: ScopeType
  scopeId?: string
}

export interface CollabSessionOptions {
  anonAllowed?: boolean
  rubricEnabled?: boolean
  maxResponders?: number
  expiresAt?: string | null
}

export interface CollabSession {
  id: string
  spaceKey: CollaborationSpaceKey
  round: number
  status: 'open' | 'closed'
  options: CollabSessionOptions
  createdAt: string
}

export interface ReviewItem {
  id: string
  title: string
  logline?: string
  synopsis?: string
  details?: {
    genre?: string
    duration?: string
    targetAudience?: string
    tone?: string
    structure?: string
  }
  characters?: Array<{ name: string; role?: string; description?: string }>
  beats?: Array<{ beat_number: number; beat_title: string; beat_description?: string; duration_estimate?: string }>
}

export interface Feedback {
  id: string
  sessionId: string
  round: number
  scopeId?: string
  score: number
  comment?: string
  tags?: string[]
  alias?: string
  createdAt: string
}

export interface ChatMessage {
  id: string
  sessionId: string
  channel: 'announcements' | 'general' | 'item'
  scopeId?: string
  authorRole: 'owner' | 'collaborator'
  alias: string
  text: string
  createdAt: string
}

type Store = {
  sessions: Map<string, CollabSession>
  feedback: Map<string, Feedback[]>
  chat: Map<string, ChatMessage[]>
  items: Map<string, ReviewItem[]>
}

const store: Store = {
  sessions: new Map(),
  feedback: new Map(),
  chat: new Map(),
  items: new Map(),
}

export function createSession(session: CollabSession) {
  store.sessions.set(session.id, session)
  if (!store.feedback.has(session.id)) store.feedback.set(session.id, [])
  if (!store.chat.has(session.id)) store.chat.set(session.id, [])
  if (!store.items.has(session.id)) store.items.set(session.id, [])
}

export function getSession(sessionId: string): CollabSession | null {
  return store.sessions.get(sessionId) || null
}

export function addFeedback(entry: Feedback) {
  const list = store.feedback.get(entry.sessionId) || []
  list.push(entry)
  store.feedback.set(entry.sessionId, list)
}

export function listFeedback(sessionId: string): Feedback[] {
  return (store.feedback.get(sessionId) || []).slice(-500)
}

export function setFeedback(sessionId: string, entries: Feedback[]): void {
  store.feedback.set(sessionId, entries)
}

export function postMessage(msg: ChatMessage) {
  const list = store.chat.get(msg.sessionId) || []
  list.push(msg)
  store.chat.set(msg.sessionId, list)
}

export function listMessages(sessionId: string, channel?: ChatMessage['channel'], scopeId?: string): ChatMessage[] {
  let list = store.chat.get(sessionId) || []
  if (channel) list = list.filter(m => m.channel === channel)
  if (scopeId) list = list.filter(m => m.scopeId === scopeId)
  return list.slice(-500)
}

export function setReviewItems(sessionId: string, items: ReviewItem[]) {
  store.items.set(sessionId, items)
}

export function getReviewItems(sessionId: string): ReviewItem[] {
  return store.items.get(sessionId) || []
}


