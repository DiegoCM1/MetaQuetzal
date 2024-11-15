import "./global.css";
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, Pressable } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Botón Circular */}
      <TouchableOpacity 
        underlayColor={"#09f"}
        style={{
          width: 200, 
          height: 200,
          backgroundColor: 'red',
          borderRadius: 100,
          justifyContent: 'center',
          alignItems: 'center'
        }}
        onPress={() => alert('You are redirected to another page')}
      >
        <Text style={{ color: 'white' }}>BluEye!</Text>
      </TouchableOpacity>

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
              <Text style={styles.text}>{pressed ? 'Pressed!' : 'Press Me'}</Text>
          )}
      </Pressable>


      {/* Nuevo Contenedor de Prueba */}
      <View className="flex-1 justify-center items-center bg-gray-100 mt-4 mb-4">
        <TouchableOpacity className="bg-blue-500 p-4 rounded-lg shadow-lg">
          <Text className="text-white font-bold text-lg">Test Button</Text>
        </TouchableOpacity>
      </View>
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
