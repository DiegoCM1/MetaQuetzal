import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Pressable,
  Text,
  StyleSheet,
  Switch,
  Modal,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import MapView, { UrlTile, PROVIDER_GOOGLE, Circle, Marker } from "react-native-maps";
import * as Location from "expo-location";
import Toast from "react-native-toast-message";
import { loadRedZones, saveRedZone, generateZoneId } from "../../services/redZonesService";
import { darkMapStyle } from "./mapStyle";

const OWM_API_KEY = process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY;

// Default region: Mexico
const DEFAULT_REGION = {
  latitude: 23.6345, // Mexico center
  longitude: -102.5528,
  latitudeDelta: 12,
  longitudeDelta: 12,
};

type MCIName = React.ComponentProps<typeof MaterialCommunityIcons>['name']         
export default function WeatherMapNativewind() {
  const [region, setRegion] = useState(DEFAULT_REGION);
  const [showWind, setShowWind] = useState(true);
  const [showPrecip, setShowPrecip] = useState(false);
  const [showClouds, setShowClouds] = useState(false);
  const [layerModalVisible, setLayerModalVisible] = useState(false);
  const mapRef = useRef(null);

  // Red zones states
  const [redZones, setRedZones] = useState([]);
  const [isAddingMode, setIsAddingMode] = useState(false);
  const [pendingLocation, setPendingLocation] = useState(null);
  const [selectedZone, setSelectedZone] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [zoneDescription, setZoneDescription] = useState("");

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
        const timeoutPromise = new Promise<never>((_, reject) => {
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

  // Load red zones on mount
  useEffect(() => {
    (async () => {
      console.log('🗺️ [Map] Loading red zones on mount...');
      const zones = await loadRedZones();
      console.log('🗺️ [Map] Setting', zones.length, 'zones to state');
      setRedZones(zones);
    })();
  }, []);

  // Toggle adding mode
  const handleToggleAddingMode = () => {
    setIsAddingMode(!isAddingMode);
    if (!isAddingMode) {
      Toast.show({
        type: 'info',
        text1: 'Modo de reporte activado',
        text2: 'Toca el mapa donde quieres reportar la zona roja',
        position: 'top',
      });
    } else {
      Toast.show({
        type: 'info',
        text1: 'Modo de reporte desactivado',
        position: 'top',
      });
    }
  };

  // Handle map press
  const handleMapPress = (e) => {
    if (isAddingMode) {
      const { latitude, longitude } = e.nativeEvent.coordinate;
      setPendingLocation({ latitude, longitude });
      setShowAddModal(true);
      setIsAddingMode(false); // Disable adding mode after selecting location
    }
  };

  // Handle circle press (zone detail)
  const handleCirclePress = (zone) => {
    setSelectedZone(zone);
    setShowDetailModal(true);
  };

  // Save new red zone
  const handleSaveZone = async () => {
    if (!zoneDescription.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Descripción requerida',
        text2: 'Por favor describe qué sucede en esta zona',
      });
      return;
    }

    const newZone = {
      id: generateZoneId(),
      latitude: pendingLocation.latitude,
      longitude: pendingLocation.longitude,
      description: zoneDescription.trim(),
      timestamp: new Date().toISOString(),
      radius: 500, // 500 meters
    };

    const success = await saveRedZone(newZone);
    if (success) {
      const updatedZones = [...redZones, newZone];
      setRedZones(updatedZones);
      console.log('🗺️ [Map] Zone added to state. Total zones now:', updatedZones.length);
      Toast.show({
        type: 'success',
        text1: 'Zona roja reportada',
        text2: 'Gracias por tu reporte',
      });
      setShowAddModal(false);
      setPendingLocation(null);
      setZoneDescription('');
    } else {
      Toast.show({
        type: 'error',
        text1: 'Error al guardar',
        text2: 'No se pudo guardar la zona roja',
      });
    }
  };

  // Cancel adding zone
  const handleCancelAdd = () => {
    setShowAddModal(false);
    setPendingLocation(null);
    setZoneDescription('');
  };

  const layers: Array<{ label: string; state: boolean; setter: (v: boolean) => void; icon: MCIName }> = [
    { label: "Viento", state: showWind, setter: setShowWind, icon: "weather-windy" },
    { label: "Precipitación", state: showPrecip, setter: setShowPrecip, icon: "weather-rainy" },
    { label: "Nubes", state: showClouds, setter: setShowClouds, icon: "weather-cloudy" },
  ]      

  return (
    <View className="flex-1">
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map} // <— real style prop
        showsUserLocation
        initialRegion={region}
        onPress={handleMapPress}
        // Disable default UI components
        customMapStyle={darkMapStyle}
        showsCompass={false}
        showsMyLocationButton={false}
        showsScale={false}
        zoomControlEnabled={false}
        toolbarEnabled={false}
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

        {/* Red zones: Marker (always visible) + Circle (area) */}
        {redZones.map((zone) => (
          <React.Fragment key={zone.id}>
            {/* Pin/Icon - Always visible, fixed size */}
            <Marker
              coordinate={{
                latitude: zone.latitude,
                longitude: zone.longitude,
              }}
              onPress={() => handleCirclePress(zone)}
              tracksViewChanges={false}
            >
              <View className="items-center justify-center bg-white rounded-full p-1 shadow-lg">
                <MaterialCommunityIcons
                  name="alert-circle"
                  size={28}
                  color="#EF4444"
                />
              </View>
            </Marker>

            {/* Circle - Shows affected area, scales with zoom */}
            <Circle
              center={{
                latitude: zone.latitude,
                longitude: zone.longitude,
              }}
              radius={zone.radius}
              fillColor="rgba(239, 68, 68, 0.2)" // red with 20% opacity
              strokeColor="#EF4444" // solid red
              strokeWidth={2}
            />
          </React.Fragment>
        ))}
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
            {layers.map(({ label, state, setter, icon }) => (
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

      {/* FAB - Add red zone */}
      <TouchableOpacity
        onPress={handleToggleAddingMode}
        className="absolute bottom-28 right-4 p-4 rounded-full shadow-lg"
        style={{
          backgroundColor: isAddingMode ? '#10B981' : '#EF4444',
        }}
      >
        <MaterialCommunityIcons
          name={isAddingMode ? "close-circle" : "plus"}
          size={28}
          color="#FFFFFF"
        />
      </TouchableOpacity>

      {/* Recenter */}
      <Pressable
        onPress={() => mapRef.current?.animateToRegion(region, 1000)}
        className="absolute bottom-12 right-4 bg-white bg-opacity-90 p-3 rounded-full shadow-lg"
      >
        <Text className="text-xl">📍</Text>
      </Pressable>

      {/* Modal: Add Red Zone */}
      <Modal
        animationType="slide"
        transparent
        visible={showAddModal}
        onRequestClose={handleCancelAdd}
      >
        <View className="flex-1 justify-end bg-black/40">
            <View className="bg-white rounded-t-2xl p-6">
              <Text className="text-xl font-bold mb-4 text-center">
                Reportar Zona Roja
              </Text>

              <Text className="text-sm text-gray-600 mb-2">
                Describe qué está sucediendo en esta zona:
              </Text>

              <TextInput
                className="border border-gray-300 rounded-lg p-3 mb-4 min-h-[100px]"
                placeholder="Ej: Inundación severa, árboles caídos, camino bloqueado..."
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                value={zoneDescription}
                onChangeText={setZoneDescription}
                style={{ color: '#000' }}
              />

              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={handleCancelAdd}
                  className="flex-1 py-3 rounded-lg border-2 border-gray-300 items-center"
                >
                  <Text className="font-bold text-gray-700">Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleSaveZone}
                  className="flex-1 py-3 rounded-lg items-center"
                  style={{ backgroundColor: '#EF4444' }}
                >
                  <Text className="font-bold text-white">Reportar</Text>
                </TouchableOpacity>
              </View>
            </View>
        </View>
      </Modal>

      {/* Modal: View Zone Details */}
      <Modal
        animationType="slide"
        transparent
        visible={showDetailModal}
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View className="flex-1 justify-end bg-black/40">
          <View className="bg-white rounded-t-2xl p-6">
            <View className="flex-row items-center mb-4">
              <MaterialCommunityIcons
                name="alert-circle"
                size={32}
                color="#EF4444"
              />
              <Text className="text-xl font-bold ml-2">Zona Roja Reportada</Text>
            </View>

            {selectedZone && (
              <>
                <View className="mb-4">
                  <Text className="text-sm text-gray-600 mb-1">Descripción:</Text>
                  <Text className="text-base">{selectedZone.description}</Text>
                </View>

                <View className="mb-4">
                  <Text className="text-sm text-gray-600 mb-1">Ubicación:</Text>
                  <Text className="text-base">
                    {selectedZone.latitude.toFixed(5)}, {selectedZone.longitude.toFixed(5)}
                  </Text>
                </View>

                <View className="mb-6">
                  <Text className="text-sm text-gray-600 mb-1">Reportado:</Text>
                  <Text className="text-base">
                    {new Date(selectedZone.timestamp).toLocaleString('es-MX')}
                  </Text>
                </View>
              </>
            )}

            <TouchableOpacity
              onPress={() => setShowDetailModal(false)}
              className="py-3 rounded-lg items-center"
              style={{ backgroundColor: '#EF4444' }}
            >
              <Text className="font-bold text-white">Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
});
