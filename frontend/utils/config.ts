const DEFAULT_API_BASE_URL = 'https://backend-blueye-production.up.railway.app'

export const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_URL?.trim() ||
  DEFAULT_API_BASE_URL
).replace(/\/+$/, '')

export function buildApiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE_URL}${normalizedPath}`
}
