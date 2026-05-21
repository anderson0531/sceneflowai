import { BlueprintShareViewer } from '@/components/blueprint/BlueprintShareViewer'

type Props = { params: Promise<{ token: string }> }

export default async function BlueprintSharePage({ params }: Props) {
  const { token } = await params
  return <BlueprintShareViewer token={token} />
}
