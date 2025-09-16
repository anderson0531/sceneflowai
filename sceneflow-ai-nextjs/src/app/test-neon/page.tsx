import { neon } from '@neondatabase/serverless'

export const dynamic = 'force-dynamic'

export default function TestNeonPage() {
  async function create(formData: FormData) {
    'use server'
    const url = process.env.DATABASE_URL
    if (!url) throw new Error('DATABASE_URL not set')
    const sql = neon(url)
    await sql('CREATE TABLE IF NOT EXISTS comments (comment TEXT)')
    const comment = String(formData.get('comment') || '').slice(0, 500)
    if (comment) {
      await sql('INSERT INTO comments (comment) VALUES ($1)', [comment])
    }
  }

  async function list() {
    'use server'
    const url = process.env.DATABASE_URL
    if (!url) return []
    const sql = neon(url)
    await sql('CREATE TABLE IF NOT EXISTS comments (comment TEXT)')
    const rows = await sql<any[]>('SELECT comment FROM comments ORDER BY ctid DESC LIMIT 20')
    return rows
  }

  async function Comments() {
    const rows = await list()
    return (
      <ul style={{ marginTop: 12 }}>
        {rows.map((r, i) => (
          <li key={i} style={{ color: '#9ca3af' }}>{r.comment}</li>
        ))}
      </ul>
    )
  }

  return (
    <div style={{ padding: 24, color: 'white' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>Neon test</h1>
      <form action={create} style={{ marginTop: 12 }}>
        <input
          type="text"
          name="comment"
          placeholder="write a comment"
          style={{ color: 'black', padding: 8, borderRadius: 6, marginRight: 8, width: 300 }}
        />
        <button type="submit" style={{ padding: '8px 12px', borderRadius: 6, background: '#3B82F6', color: 'white' }}>
          Submit
        </button>
      </form>
      {/* @ts-expect-error Async Server Component */}
      <Comments />
    </div>
  )
}


