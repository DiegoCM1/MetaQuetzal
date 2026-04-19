import { getAuth, getIdToken } from '@react-native-firebase/auth'

export async function getAuthToken(): Promise<string> {
  const user = getAuth().currentUser
  if (!user) throw new Error('Not authenticated')
  return getIdToken(user)
}

export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = await getAuthToken()
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  })
}
