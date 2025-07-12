import React, { useState, useEffect, useRef } from 'react';
import { View, Pressable, Text, ActivityIndicator, StyleSheet } from 'react-native';
import MapView, { UrlTile, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';

const OWM_API_KEY = process.env.REACT_APP_OPENWEATHER_API_KEY;

export default function WeatherMapNativewind() {
  const [region, setRegion] = useState(null);
  const [showWind, setShowWind] = useState(true);
  const [showTemp, setShowTemp] = useState(true);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef(null);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Location permission denied');
        setLoading(false);
        return;
      }
      const { coords } = await Location.getCurrentPositionAsync({});
      setRegion({
        latitude: coords.latitude,
        longitude: coords.longitude,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
      });
      setLoading(false);
    })();
  }, []);

  if (loading || !region) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-100">
        <ActivityIndicator size="large" color="#333" />
        <Text className="mt-2 text-gray-600">Getting your location…</Text>
      </View>
    );
  }

  return (
    <View className="flex-1">
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}          // <— real style prop
        showsUserLocation
        initialRegion={region}
      >
        {showWind && (
          <UrlTile
            urlTemplate={`https://tile.openweathermap.org/map/wind_new/{z}/{x}/{y}.png?appid=${OWM_API_KEY}`}
            maximumZ={12}
            tileSize={256}
            zIndex={1}
            opacity={0.6}
          />
        )}
        {showTemp && (
          <UrlTile
            urlTemplate={`https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=${OWM_API_KEY}`}
            maximumZ={12}
            tileSize={256}
            zIndex={2}
            opacity={0.5}
          />
        )}
      </MapView>

      {/* Layer toggles */}
      <View className="absolute top-12 left-4 flex-row space-x-3">
        <Pressable
          onPress={() => setShowWind(w => !w)}
          className="bg-white bg-opacity-90 px-4 py-2 rounded-full shadow-md"
        >
          <Text className="text-sm font-medium">
            {showWind ? 'Hide Wind' : 'Show Wind'}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setShowTemp(t => !t)}
          className="bg-white bg-opacity-90 px-4 py-2 rounded-full shadow-md"
        >
          <Text className="text-sm font-medium">
            {showTemp ? 'Hide Temp' : 'Show Temp'}
          </Text>
        </Pressable>
      </View>

      {/* Recenter */}
      <Pressable
        onPress={() => mapRef.current?.animateToRegion(region, 1000)}
        className="absolute bottom-12 right-4 bg-white bg-opacity-90 p-3 rounded-full shadow-lg"
      >
        <Text className="text-xl">📍</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
});
