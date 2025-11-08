import manifest from '../../../desktop/renderer-manifest.json'

export type RendererArtifact = {
  version: string
  uploadedAt: string
  filename: string
  size: number
  sha256: string
  url: string
  platform: 'windows' | 'mac'
  arch: 'x64' | 'arm64' | 'universal'
  type: 'nsis' | 'dmg' | 'zip'
}

export type RendererRelease = {
  version: string
  generatedAt: string
  artifacts: RendererArtifact[]
}

type RendererManifest = {
  latest: string | null
  releases: Record<
    string,
    {
      generatedAt: string
      artifacts: RendererArtifact[]
    }
  >
}

const typedManifest = manifest as RendererManifest

export function getLatestRendererRelease(): RendererRelease | null {
  if (!typedManifest.latest) {
    return null
  }

  const entry = typedManifest.releases?.[typedManifest.latest]
  if (!entry) {
    return null
  }

  return {
    version: typedManifest.latest,
    generatedAt: entry.generatedAt,
    artifacts: entry.artifacts ?? []
  }
}

export function selectPrimaryInstaller(
  release: RendererRelease | null,
  platform: 'windows' | 'mac'
): RendererArtifact | null {
  if (!release) {
    return null
  }

  const candidates = release.artifacts.filter((artifact) => artifact.platform === platform)
  if (candidates.length === 0) {
    return null
  }

  const preference =
    platform === 'windows'
      ? ['nsis']
      : (['dmg', 'zip'] as RendererArtifact['type'][])

  for (const preferredType of preference) {
    const match = candidates.find((artifact) => artifact.type === preferredType)
    if (match) {
      return match
    }
  }

  return candidates[0]
}

export function getInstallersByPlatform(
  release: RendererRelease | null
): {
  windows: RendererArtifact[]
  mac: RendererArtifact[]
} {
  if (!release) {
    return { windows: [], mac: [] }
  }

  return {
    windows: release.artifacts.filter((artifact) => artifact.platform === 'windows'),
    mac: release.artifacts.filter((artifact) => artifact.platform === 'mac')
  }
}

