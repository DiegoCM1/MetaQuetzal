import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Pressable,
  Text,
  StyleSheet,
  Switch,
  Modal,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import MapView, { UrlTile, PROVIDER_GOOGLE } from "react-native-maps";
import * as Location from "expo-location";

const OWM_API_KEY = process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY;

// Default region: Mexico
const DEFAULT_REGION = {
  latitude: 23.6345, // Mexico center
  longitude: -102.5528,
  latitudeDelta: 12,
  longitudeDelta: 12,
};

export default function WeatherMapNativewind() {
  const [region, setRegion] = useState(DEFAULT_REGION);
  const [showWind, setShowWind] = useState(true);
  const [showPrecip, setShowPrecip] = useState(false);
  const [showClouds, setShowClouds] = useState(false);
  const [layerModalVisible, setLayerModalVisible] = useState(false);
  const mapRef = useRef(null);

  useEffect(() => {
    let timeoutId;

    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          console.warn("Location permission denied - using default region");
          return;
        }

        // Timeout promise: reject after 15 seconds
        const timeoutPromise = new Promise((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error('Location timeout')), 15000);
        });

        // Race between getting location and timeout
        const { coords } = await Promise.race([
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
          timeoutPromise,
        ]);

        clearTimeout(timeoutId);

        const userRegion = {
          latitude: coords.latitude,
          longitude: coords.longitude,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        };

        setRegion(userRegion);

        // Animate to user's location
        mapRef.current?.animateToRegion(userRegion, 1000);

        console.log("✅ User location obtained:", coords.latitude, coords.longitude);
      } catch (error) {
        console.warn("⚠️ Could not get location (timeout or error), using default region:", error.message);
      }
    })();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  return (
    <View className="flex-1">
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map} // <— real style prop
        showsUserLocation
        initialRegion={region}
        // Disable default UI components
        showsCompass={false} // Removes the compass
        showsMyLocationButton={false} // Removes default location button
        showsScale={false} // Removes scale bar
        zoomControlEnabled={false} // Disables zoom +/- buttons (Android only)
        toolbarEnabled={false} // Disables long-press toolbar on Android
      >
        {showWind && (
          <UrlTile
            urlTemplate={`https://tile.openweathermap.org/map/wind_new/{z}/{x}/{y}.png?appid=${OWM_API_KEY}`}
            maximumZ={12}
            tileSize={256}
            zIndex={1}
            opacity={1}
          />
        )}
        {showPrecip && (
          <UrlTile
            urlTemplate={`https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=${OWM_API_KEY}`}
            maximumZ={12}
            tileSize={256}
            zIndex={3}
            opacity={1}
          />
        )}
        {showClouds && (
          <UrlTile
            urlTemplate={`https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=${OWM_API_KEY}`}
            maximumZ={12}
            tileSize={256}
            zIndex={5}
            opacity={1}
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

      {/* Closing Layer Modal */}
      <Modal
        animationType="slide"
        transparent
        visible={layerModalVisible}
        onRequestClose={() => setLayerModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/40">
          <View className="bg-white p-6 rounded-t-2xl">
            <Text className="text-lg font-bold mb-4 text-center">
              Map Layers
            </Text>
            {[
              {
                label: "Viento",
                state: showWind,
                setter: setShowWind,
                icon: "weather-windy",
              },
              {
                label: "Precipitación",
                state: showPrecip,
                setter: setShowPrecip,
                icon: "weather-rainy",
              },
              {
                label: "Nubes",
                state: showClouds,
                setter: setShowClouds,
                icon: "weather-cloudy",
              },
            ].map(({ label, state, setter, icon }) => (
              <View
                key={label}
                className="flex-row justify-between items-center mb-3"
              >
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
