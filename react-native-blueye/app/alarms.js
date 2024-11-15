import "../global.css";
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
        <Text style={{ color: 'white' }}>Alarms</Text>
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
