import React from 'react';
import { View, Text, TouchableOpacity, Pressable, StyleSheet } from 'react-native';
import { Link } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const Main = () => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <TouchableOpacity 
        underlayColor={"#09f"}
        style={styles.circularButton}
        onPress={() => alert('You are redirected to another page')}
      >
        <Text style={styles.buttonText}>Index JS</Text>
      </TouchableOpacity>

      <Pressable style={styles.linkContainer}>
        <Link href="/chat-ai">
          <Text style={styles.linkText}>Hablar con la IA</Text>
        </Link>
      </Pressable>

      <View style={styles.testContainer}>
        <TouchableOpacity style={styles.testButton}>
          <Text style={styles.testButtonText}>Test Button</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default Main;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circularButton: {
    width: 200, 
    height: 200,
    backgroundColor: 'red',
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
  },
  linkContainer: {
    backgroundColor: '#bae6fd',
    padding: 10,
    marginTop: 20,
  },
  linkText: {
    color: '#334155',
    fontSize: 16,
  },
  testContainer: {
    width: '33%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    marginTop: 20,
    marginBottom: 20,
  },
  testButton: {
    backgroundColor: '#3b82f6',
    padding: 16,
    borderRadius: 8,
    shadowOpacity: 0.5,
    shadowRadius: 4,
    shadowColor: '#000',
  },
  testButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
  },
});
