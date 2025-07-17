import React, { useState, useEffect, useRef } from 'react';
import { View, Pressable, Text, ActivityIndicator, StyleSheet, Switch, Modal } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import MapView, { UrlTile, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';

const OWM_API_KEY = process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY;

export default function WeatherMapNativewind() {
  const [region, setRegion] = useState(null);
  const [showWind, setShowWind] = useState(true);
  const [showTemp, setShowTemp] = useState(true);
  const [showPrecip, setShowPrecip] = useState(false);
  const [showSea, setShowSea] = useState(false);
  const [showClouds, setShowClouds] = useState(false);
  const [layerModalVisible, setLayerModalVisible] = useState(false);
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
        {showPrecip && (
          <UrlTile
            urlTemplate={`https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=${OWM_API_KEY}`}
            maximumZ={12}
            tileSize={256}
            zIndex={3}
            opacity={0.5}
          />
        )}
        {showSea && (
          <UrlTile
            urlTemplate={`https://tile.openweathermap.org/map/pressure_new/{z}/{x}/{y}.png?appid=${OWM_API_KEY}`}
            maximumZ={12}
            tileSize={256}
            zIndex={4}
            opacity={0.5}
          />
        )}
        {showClouds && (
          <UrlTile
            urlTemplate={`https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=${OWM_API_KEY}`}
            maximumZ={12}
            tileSize={256}
            zIndex={5}
            opacity={0.5}
          />
        )}
      </MapView>

      {/* Layer selector */}
      <Pressable
        onPress={() => setLayerModalVisible(true)}
        className="absolute top-12 right-4 bg-white bg-opacity-90 p-3 rounded-full shadow-md"
      >
        <MaterialCommunityIcons name="layers-outline" size={24} color="#333" />
      </Pressable>

      <Modal
        animationType="slide"
        transparent
        visible={layerModalVisible}
        onRequestClose={() => setLayerModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/40">
          <View className="bg-white p-6 rounded-t-2xl">
            <Text className="text-lg font-bold mb-4 text-center">Map Layers</Text>
            {[
              { label: 'Wind', state: showWind, setter: setShowWind, icon: 'weather-windy' },
              { label: 'Temperature', state: showTemp, setter: setShowTemp, icon: 'thermometer' },
              { label: 'Precipitation', state: showPrecip, setter: setShowPrecip, icon: 'weather-rainy' },
              { label: 'Sea Level', state: showSea, setter: setShowSea, icon: 'waves' },
              { label: 'Clouds', state: showClouds, setter: setShowClouds, icon: 'weather-cloudy' },
            ].map(({ label, state, setter, icon }) => (
              <View key={label} className="flex-row justify-between items-center mb-3">
                <View className="flex-row items-center">
                  <MaterialCommunityIcons name={icon} size={20} color="#333" />
                  <Text className="ml-2 text-base">{label}</Text>
                </View>
                <Switch value={state} onValueChange={setter} />
              </View>
            ))}
            <Pressable
              onPress={() => setLayerModalVisible(false)}
              className="mt-2 bg-blue-600 py-3 rounded-full items-center"
            >
              <Text className="text-white font-semibold">Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

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
