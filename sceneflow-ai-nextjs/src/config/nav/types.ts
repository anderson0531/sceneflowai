export type PhaseId = 0|1|2|3|4|5|6

export type NavItem = {
  key: string
  label: string
  href: string
  requires?: PhaseId[]
  byok?: boolean
  phase?: PhaseId
  description?: string
}
