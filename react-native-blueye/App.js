import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, Image, TouchableHighlight, TouchableOpacity, Pressable} from 'react-native';
import { Button } from 'react-native-web';

const icon = require('./assets/icon.png')

export default function App() {
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <TouchableOpacity 
        underlayColor={"#09f"}
        style={{
          width: 200, 
          height: 200,
          backgroundColor:'red',
          borderRadius:100,
          justifyContent:'center',
          alignItems:'center'
        }}
        onPress={() => alert('Hi')}
      >
        <Text style={{color:'white'}}>BluEye!</Text>
      </TouchableOpacity>
      <Pressable
          onPress={() => {
            setTimesPressed(current => current + 1);
          }}
          style={({pressed}) => [
            {
              backgroundColor: pressed ? 'rgb(210, 230, 255)' : 'white',
            },
            styles.wrapperCustom,
          ]}>
          {({pressed}) => (
            <Text style={styles.text}>{pressed ? 'Pressed!' : 'Press Me'}</Text>
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
