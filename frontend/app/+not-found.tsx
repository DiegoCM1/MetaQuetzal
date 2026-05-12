import { Redirect } from 'expo-router'
import { useAuth } from '../features/auth/AuthContext'

export default function NotFound() {
  const { user } = useAuth()
  return <Redirect href={user ? '/(tabs)/MapScreen' : '/(auth)'} />
}
