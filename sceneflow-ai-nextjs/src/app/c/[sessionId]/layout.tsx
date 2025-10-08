export default function CollabLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body className="min-h-screen bg-gray-950 text-white">{children}</body>
    </html>
  )
}


