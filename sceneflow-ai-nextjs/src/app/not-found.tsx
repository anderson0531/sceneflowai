export const dynamic = 'force-dynamic'

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center text-center text-gray-300">
      <div>
        <h1 className="text-3xl font-bold text-white">Page Not Found</h1>
        <p className="mt-2">The page you are looking for does not exist.</p>
        <a href="/dashboard" className="inline-block mt-4 px-4 py-2 rounded bg-sf-primary text-sf-background">Go to Dashboard</a>
      </div>
    </div>
  )
}



