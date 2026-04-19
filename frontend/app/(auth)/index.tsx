import { View, Text, ActivityIndicator, StyleSheet } from 'react-native'
import { GoogleSigninButton } from '@react-native-google-signin/google-signin'
import { useAuth } from './_context/AuthContext'

export default function LoginScreen() {
  const { signInWithGoogle, loading } = useAuth()

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>BLUAI</Text>
      <Text style={styles.subtitle}>Protección ante huracanes</Text>
      <GoogleSigninButton
        size={GoogleSigninButton.Size.Wide}
        color={GoogleSigninButton.Color.Dark}
        onPress={signInWithGoogle}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  title: {
    fontSize: 40,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 32,
  },
})
