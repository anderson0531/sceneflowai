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

export function getLatestRendererRelease(): RendererRelease | null {
  return null
}

export function selectPrimaryInstaller(): RendererArtifact | null {
  return null
}

export function getInstallersByPlatform(): {
  windows: RendererArtifact[]
  mac: RendererArtifact[]
} {
  return { windows: [], mac: [] }
}

