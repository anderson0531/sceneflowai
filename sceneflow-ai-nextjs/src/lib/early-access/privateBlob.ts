export function getPrivateBlobToken(): string {
  const token = process.env.BLOB_PRIVATE_READ_WRITE_TOKEN?.trim()
  if (!token) {
    throw new Error(
      'Private blob storage is not configured. Set BLOB_PRIVATE_READ_WRITE_TOKEN from a Vercel private Blob store.'
    )
  }
  return token
}

export async function fetchPrivateBlobJson<T>(url: string): Promise<T | null> {
  const response = await fetch(url, {
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${getPrivateBlobToken()}`,
    },
  })
  if (!response.ok) return null
  return (await response.json()) as T
}
