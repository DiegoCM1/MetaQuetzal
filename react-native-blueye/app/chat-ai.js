import "../global.css";
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, Pressable } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      {/* Botón de Prueba */}
      <Pressable
          onPress={() => {
              setTimesPressed(current => current + 1);
          }}
          style={({ pressed }) => [
              {
                  backgroundColor: pressed ? 'rgb(210, 230, 255)' : 'white',
              },
              styles.wrapperCustom,
          ]}
      >
          {({ pressed }) => (
              <Text style={styles.text}>{pressed ? 'Pressed!' : 'Chat IA'}</Text>
          )}
      </Pressable>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
