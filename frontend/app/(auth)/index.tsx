import { View, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { GoogleSigninButton } from '@react-native-google-signin/google-signin'
import { useAuth } from './_context/AuthContext'
import { gradients } from '../../utils/theme'
import BluaiLogo from '../../assets/images/BLUAI_LOGO_BLANCO.svg'

export default function LoginScreen() {
  const { signInWithGoogle, loading, error } = useAuth()

  if (loading) {
    return (
      <LinearGradient
        colors={gradients.primary}
        className="flex-1 items-center justify-center"
      >
        <BluaiLogo width={160} height={124} />
      </LinearGradient>
    )
  }

  return (
    <LinearGradient
      colors={gradients.primary}
      className="flex-1"
    >
      <SafeAreaView className="flex-1 items-center justify-between px-8 py-12">
        <View className="flex-1 items-center justify-center gap-4">
          <BluaiLogo width={180} height={140} />
          <Text className="text-white/70 font-poppins text-base tracking-widest uppercase">
            Protección ante huracanes
          </Text>
        </View>

        <View className="w-full items-center gap-3">
          {error && (
            <Text className="text-brand-red text-sm text-center font-poppins">
              {error}
            </Text>
          )}
          <GoogleSigninButton
            size={GoogleSigninButton.Size.Wide}
            color={GoogleSigninButton.Color.Dark}
            onPress={signInWithGoogle}
          />
        </View>
      </SafeAreaView>
    </LinearGradient>
  )
}
