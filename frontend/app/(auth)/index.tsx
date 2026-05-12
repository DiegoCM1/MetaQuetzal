import { View, Text, ImageBackground } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { GoogleSigninButton } from '@react-native-google-signin/google-signin'
import { useAuth } from '../../features/auth/AuthContext'
import BluaiLogo from '../../assets/images/BLUAI_LOGO_BLANCO.svg'

export default function LoginScreen() {
  const { signInWithGoogle, loading, signingIn, error } = useAuth()

  if (loading) {
    return (
      <ImageBackground source={require("../../assets/images/BACK-PANTALLA-INICIO.png")} resizeMode="cover" className="flex-1">
        <BluaiLogo width={160} height={124} />
      </ImageBackground>
    )
  }

  return (
    <ImageBackground source={require("../../assets/images/BACK-PANTALLA-INICIO.png")} resizeMode="cover" className="flex-1">
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
          <View style={{ opacity: signingIn ? 0.5 : 1 }}>
            <GoogleSigninButton
              size={GoogleSigninButton.Size.Wide}
              color={GoogleSigninButton.Color.Dark}
              onPress={signInWithGoogle}
              disabled={signingIn}
            />
          </View>
        </View>
      </SafeAreaView>
    </ImageBackground>
  )
}
