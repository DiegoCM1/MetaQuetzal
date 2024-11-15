import "../global.css";
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, Pressable } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      {/* Nuevo Contenedor de Prueba */}
      <View className="w-2/6 justify-center items-center bg-gray-100 mt-4 mb-4">
        <TouchableOpacity className="bg-blue-500 p-4 rounded-lg shadow-lg">
          <Text className="text-white font-bold text-lg">Test Button</Text>
        </TouchableOpacity>
      </View>


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
        <Text style={{ color: 'white' }}>Settings</Text>
      </TouchableOpacity>



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
