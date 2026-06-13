export default function VisionLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="h-full min-h-0 flex flex-col overflow-hidden">
      {children}
    </div>
  )
}
