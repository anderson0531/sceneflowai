import { CollaborationService } from '@/services/CollaborationService'
import { notFound } from 'next/navigation'

export default async function CollaboratePage({ params }: { params: { sessionId: string } }) {
  const session = await CollaborationService.getSession(params.sessionId)
  if (!session) return notFound()

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">{session.title}</h1>
        <p className="text-sm text-gray-600">{session.description}</p>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {session.ideas.map((idea) => (
          <div key={idea.id} className="border border-gray-200 rounded-lg p-4 bg-white">
            <h2 className="font-medium text-gray-900">{idea.title}</h2>
            <p className="text-sm text-gray-700 mt-1">{idea.synopsis}</p>
            <div className="text-xs text-gray-500 mt-2">Current Avg Rating: {idea.averageRating?.toFixed(2) || 0} ({idea.totalVotes} votes)</div>

            <form action={`/api/collaborate/${params.sessionId}/vote`} method="post" className="mt-3 flex items-center gap-2">
              <input type="hidden" name="ideaId" value={idea.id} />
              <input className="border rounded px-2 py-1 text-sm w-24" name="name" placeholder="Your name" required />
              <select name="rating" className="border rounded px-2 py-1 text-sm">
                {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}★</option>)}
              </select>
              <button className="px-2 py-1 rounded bg-blue-600 text-white text-sm" type="submit">Rate</button>
            </form>

            <form action={`/api/collaborate/${params.sessionId}/feedback`} method="post" className="mt-2 flex items-center gap-2">
              <input type="hidden" name="ideaId" value={idea.id} />
              <input className="border rounded px-2 py-1 text-sm flex-1" name="content" placeholder="Feedback (optional)" />
              <button className="px-2 py-1 rounded border text-sm" type="submit">Send</button>
            </form>
          </div>
        ))}
      </section>
    </main>
  )
}
