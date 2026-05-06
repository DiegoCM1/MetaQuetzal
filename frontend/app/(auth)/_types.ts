import { FirebaseAuthTypes } from '@react-native-firebase/auth'

export interface AuthContextValue {
  user: FirebaseAuthTypes.User | null
  loading: boolean
  signingIn: boolean
  error: string | null
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  deleteAccount: () => Promise<void>
}