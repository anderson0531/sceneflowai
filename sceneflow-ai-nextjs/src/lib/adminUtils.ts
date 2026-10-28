/**
 * Admin utility functions
 */

const DEFAULT_ADMIN_EMAILS = ['anderson0531@gmail.com', 'brian@sfai.studio']

/**
 * Check if an email is an admin email
 * @param email - Email address to check
 * @returns true if the email is an admin email
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  const normalized = email.trim().toLowerCase()

  if (DEFAULT_ADMIN_EMAILS.includes(normalized)) {
    return true
  }

  // Also check against ADMIN_EMAILS env var if set (comma-separated list)
  const envAdmins = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean)

  if (envAdmins.length > 0 && envAdmins.includes(normalized)) {
    return true
  }

  return false
}

/**
 * Get list of admin emails (for reference)
 * @returns Array of admin email addresses
 */
export function getAdminEmails(): string[] {
  const emails: string[] = [...DEFAULT_ADMIN_EMAILS]
  
  const envAdmins = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
  
  emails.push(...envAdmins)
  
  return [...new Set(emails)] // Remove duplicates
}

