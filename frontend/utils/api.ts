import { getAuth, getIdToken } from '@react-native-firebase/auth'

export async function getAuthToken(): Promise<string> {
  const user = getAuth().currentUser
  if (!user) throw new Error('Not authenticated')
  return getIdToken(user)
}

export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = await getAuthToken()
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  })

  if (res.status === 401) {
    const user = getAuth().currentUser
    if (!user) return res
    try {
      const freshToken = await getIdToken(user, true)
      return fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
          Authorization: `Bearer ${freshToken}`,
        },
      })
    } catch {
      return res
    }
  }

  return res
}
