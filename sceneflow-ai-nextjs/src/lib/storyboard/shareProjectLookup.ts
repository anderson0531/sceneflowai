import Project from '@/models/Project'
import { sequelize } from '@/config/database'

export function projectMatchesShareToken(project: InstanceType<typeof Project>, shareToken: string): boolean {
  const screeningLink = project.metadata?.screeningRoomShareLink
  const storyboardLink = project.metadata?.storyboardShareLink
  return (
    (screeningLink?.shareToken === shareToken && screeningLink?.isActive) ||
    (storyboardLink?.shareToken === shareToken && storyboardLink?.isActive) ||
    (screeningLink?.slug === shareToken && screeningLink?.isActive) ||
    (storyboardLink?.slug === shareToken && storyboardLink?.isActive)
  )
}

export async function findActiveShareProject(shareToken: string) {
  if (!shareToken?.trim()) return null
  await sequelize.authenticate()
  const projects = await Project.findAll()
  return projects.find((p) => projectMatchesShareToken(p, shareToken)) ?? null
}
