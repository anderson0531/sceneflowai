import { ScriptResonanceShareViewer } from '@/components/vision/ScriptResonanceShareViewer'

type Props = { params: Promise<{ token: string }> }

export default async function ScriptResonanceSharePage({ params }: Props) {
  const { token } = await params
  return <ScriptResonanceShareViewer token={token} />
}
