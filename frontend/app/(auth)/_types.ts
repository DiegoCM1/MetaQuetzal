import { FirebaseAuthTypes } from '@react-native-firebase/auth'

export interface AuthContextValue {
  user: FirebaseAuthTypes.User | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}