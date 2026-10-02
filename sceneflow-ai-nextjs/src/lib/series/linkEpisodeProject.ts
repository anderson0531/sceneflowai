export interface LinkableEpisode {
  id: string
  episodeNumber: number
  title: string
  logline?: string
  synopsis?: string
  projectId?: string
  status: string
}

export interface LinkableProject {
  id: string
  userId: string
  title: string
  seriesId?: string | null
  metadataSeriesId?: string | null
}

export interface ConnectableProject {
  id: string
  title: string
  preferred: boolean
}

export function episodeProjectTitle(seriesTitle: string, episode: Pick<LinkableEpisode, 'episodeNumber' | 'title'>): string {
  return `${seriesTitle} - Ep ${episode.episodeNumber}: ${episode.title}`
}

export function episodeProjectDescription(episode: Pick<LinkableEpisode, 'synopsis' | 'logline'>): string {
  return episode.synopsis?.trim() || episode.logline?.trim() || ''
}

export function linkRejection(
  ownerId: string,
  episode: LinkableEpisode,
  episodes: LinkableEpisode[],
  project: LinkableProject
): string | null {
  if (project.userId !== ownerId) return 'You can only connect your own projects'
  if (episode.projectId && episode.projectId !== project.id) {
    return 'This episode is already connected to a project'
  }
  const other = episodes.find((item) => item.id !== episode.id && item.projectId === project.id)
  if (other) return `That project is already connected to episode ${other.episodeNumber}`
  return null
}

export function rankConnectableProjects(
  seriesId: string,
  ownerId: string,
  episodes: LinkableEpisode[],
  projects: LinkableProject[]
): ConnectableProject[] {
  const taken = new Set(
    episodes.map((episode) => episode.projectId).filter((id): id is string => Boolean(id))
  )
  return projects
    .filter((project) => project.userId === ownerId && !taken.has(project.id))
    .map((project) => ({
      id: project.id,
      title: project.title,
      preferred: project.seriesId === seriesId || project.metadataSeriesId === seriesId,
    }))
    .sort((a, b) => Number(b.preferred) - Number(a.preferred) || a.title.localeCompare(b.title))
}

export function linkedEpisode<T extends LinkableEpisode>(episode: T, projectId: string): T {
  return {
    ...episode,
    projectId,
    status: 'in_progress',
  }
}

export function linkedProjectFields(seriesId: string, seriesTitle: string, episode: LinkableEpisode) {
  return {
    title: episodeProjectTitle(seriesTitle, episode),
    description: episodeProjectDescription(episode),
    series_id: seriesId,
    episode_number: episode.episodeNumber,
    metadata: {
      seriesId,
      episodeId: episode.id,
      episodeNumber: episode.episodeNumber,
    },
  }
}
