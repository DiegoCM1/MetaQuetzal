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
      const { data } = await GoogleSignin.signIn()
      const credential = GoogleAuthProvider.credential(data!.idToken)
      await signInWithCredential(getAuth(), credential)
    } catch (e: any) {
      if (e?.code === statusCodes.SIGN_IN_CANCELLED) return
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
