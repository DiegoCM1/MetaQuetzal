import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import {
  getAuth,
  onAuthStateChanged,
  signInWithCredential,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  FirebaseAuthTypes,
} from '@react-native-firebase/auth'
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin'
import { AuthContextValue } from '../_types'

GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
})

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(getAuth(), (firebaseUser) => {
      setUser(firebaseUser)
      setLoading(false)
    })
    return unsubscribe
  }, [])

  async function signInWithGoogle() {
    setError(null)
    try {
      await GoogleSignin.hasPlayServices()
      const signInResult = await GoogleSignin.signIn()
      console.log('[Bluai] signIn shape', JSON.stringify({
        type: (signInResult as any)?.type,
        hasData: !!signInResult?.data,
        hasIdToken: !!signInResult?.data?.idToken,
        idTokenLength: signInResult?.data?.idToken?.length ?? 0,
        hasServerAuthCode: !!signInResult?.data?.serverAuthCode,
        serverAuthCodeLength: signInResult?.data?.serverAuthCode?.length ?? 0,
        hasUser: !!signInResult?.data?.user,
        dataKeys: signInResult?.data ? Object.keys(signInResult.data) : [],
        userKeys: signInResult?.data?.user ? Object.keys(signInResult.data.user) : [],
        topLevelKeys: signInResult ? Object.keys(signInResult) : [],
      }))
      let idToken: string | null | undefined = signInResult?.data?.idToken
      let accessToken: string | null | undefined
      if (!idToken) {
        try {
          const tokens = await GoogleSignin.getTokens()
          console.log('[Bluai] getTokens shape', JSON.stringify({
            hasIdToken: !!tokens?.idToken,
            idTokenLength: tokens?.idToken?.length ?? 0,
            hasAccessToken: !!tokens?.accessToken,
            accessTokenLength: tokens?.accessToken?.length ?? 0,
          }))
          idToken = tokens?.idToken
          accessToken = tokens?.accessToken
        } catch (tokenError: any) {
          console.error('[Bluai] getTokens() failed', {
            code: tokenError?.code,
            message: tokenError?.message,
          })
        }
      }
      if (!idToken && !accessToken) {
        throw new Error('Neither idToken nor accessToken available from Google Sign-In')
      }
      const credential = GoogleAuthProvider.credential(idToken ?? null, accessToken ?? null)
      await signInWithCredential(getAuth(), credential)
    } catch (e: any) {
      if (e?.code === statusCodes.SIGN_IN_CANCELLED) return
      console.error('[Bluai] Google Sign-In failed', { code: e?.code, message: e?.message, error: e })
      setError('No se pudo iniciar sesión. Intenta de nuevo.')
    }
  }

  async function signOut() {
    await GoogleSignin.signOut()
    if (getAuth().currentUser) {
      await firebaseSignOut(getAuth())
    }
  }

  async function deleteAccount() {
    const currentUser = getAuth().currentUser
    if (!currentUser) throw new Error('No user logged in')
    const token = await currentUser.getIdToken()
    const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/users/account`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!response.ok) throw new Error('Failed to delete account')
    await signOut()
  }

  return (
    <AuthContext.Provider value={{ user, loading, error, signInWithGoogle, signOut, deleteAccount }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
