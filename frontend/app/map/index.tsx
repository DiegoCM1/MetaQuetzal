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
  Alert,
  Image,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import MapView, { UrlTile, PROVIDER_GOOGLE, Marker } from "react-native-maps";
import * as Location from "expo-location";
import Toast from "react-native-toast-message";
import { loadRedZones, saveRedZone, updateRedZone, deleteRedZone, generateZoneId, clearAllZones } from "./service";
import { darkMapStyle } from "./mapStyle";
import { DEFAULT_REGION, ZONE_TYPES, MARKER_IMAGES } from "./config";
import { colors, fonts } from "../../utils/theme";
import type { Zone, ZoneType } from "./types";

const OWM_API_KEY = process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY;

type MCIName = React.ComponentProps<typeof MaterialCommunityIcons>['name']

const ZoneMarker = React.memo(function ZoneMarker({ zone, onPress }: { zone: Zone; onPress: () => void }) {
  return (
    <Marker
      coordinate={{ latitude: zone.latitude, longitude: zone.longitude }}
      onPress={onPress}
    >
      <Image
        source={MARKER_IMAGES[zone.type]}
        style={{ width: 44, height: 44 }}
        resizeMode="contain"
      />
    </Marker>
  );
});

export default function WeatherMapNativewind() {
  const [region, setRegion] = useState(DEFAULT_REGION);
  const [showWind, setShowWind] = useState(true);
  const [showPrecip, setShowPrecip] = useState(false);
  const [showClouds, setShowClouds] = useState(false);
  const [layerModalVisible, setLayerModalVisible] = useState(false);
  const mapRef = useRef(null);

  const [zones, setZones] = useState<Zone[]>([]);
  const [isAddingMode, setIsAddingMode] = useState(false);
  const [pendingLocation, setPendingLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [selectedType, setSelectedType] = useState<ZoneType | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editDescription, setEditDescription] = useState("");
  const [zoneDescription, setZoneDescription] = useState("");
  const [descriptionError, setDescriptionError] = useState(false);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          console.warn("Location permission denied - using default region");
          return;
        }

        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error('Location timeout')), 15000);
        });

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
        mapRef.current?.animateToRegion(userRegion, 1000);
      } catch (error) {
        console.warn("⚠️ Could not get location (timeout or error), using default region:", error.message);
      }
    })();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const loaded = await loadRedZones();
        const valid = loaded.filter((z: Zone) => z.type && ZONE_TYPES[z.type]);
        if (valid.length !== loaded.length) {
          await clearAllZones();
          for (const z of valid) await saveRedZone(z);
        }
        setZones(valid);
      } catch (error) {
        console.error('[Map] Failed to load zones:', error);
      }
    })();
  }, []);

  const handleToggleAddingMode = () => {
    setIsAddingMode(prev => !prev);
  };

  const handleMapPress = (e: { nativeEvent: { coordinate: { latitude: number; longitude: number } } }) => {
    if (isAddingMode) {
      const { latitude, longitude } = e.nativeEvent.coordinate;
      setPendingLocation({ latitude, longitude });
      setShowAddModal(true);
      setIsAddingMode(false);
    }
  };

  const handleCirclePress = (zone: Zone) => {
    setSelectedZone(zone);
    setEditDescription(zone.description);
    setShowDetailModal(true);
  };

  const handleSaveEdit = () => {
    if (!selectedZone || !editDescription.trim()) return;
    const updated: Zone = { ...selectedZone, description: editDescription.trim() };
    setZones(prev => prev.map(z => z.id === updated.id ? updated : z));
    setSelectedZone(updated);
    setIsEditing(false);
    updateRedZone(updated).catch((error) => {
      console.error('[Map] Failed to update zone:', error);
      setZones(prev => prev.map(z => z.id === selectedZone.id ? selectedZone : z));
      setSelectedZone(selectedZone);
      Toast.show({ type: 'error', text1: 'Error al editar', text2: 'No se pudo guardar el cambio' });
    });
  };

  const handleDeleteZone = () => {
    if (!selectedZone) return;
    Alert.alert(
      'Eliminar zona',
      '¿Seguro que quieres eliminar este reporte?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            const deleted = selectedZone;
            setZones(prev => prev.filter(z => z.id !== deleted.id));
            setShowDetailModal(false);
            setIsEditing(false);
            deleteRedZone(deleted.id).catch((error) => {
              console.error('[Map] Failed to delete zone:', error);
              setZones(prev => [...prev, deleted]);
              Toast.show({ type: 'error', text1: 'Error al eliminar', text2: 'No se pudo eliminar la zona' });
            });
          },
        },
      ]
    );
  };

  const handleSaveZone = () => {
    if (!selectedType) return;
    if (!zoneDescription.trim()) {
      setDescriptionError(true);
      return;
    }

    const newZone: Zone = {
      id: generateZoneId(),
      latitude: pendingLocation.latitude,
      longitude: pendingLocation.longitude,
      description: zoneDescription.trim(),
      timestamp: new Date().toISOString(),
      radius: 500,
      type: selectedType,
    };

    setZones(prev => [...prev, newZone]);
    setShowAddModal(false);
    setPendingLocation(null);
    setZoneDescription('');
    setSelectedType(null);
    setDescriptionError(false);
    Toast.show({ type: 'success', text1: 'Zona reportada', text2: 'Gracias por tu reporte' });

    saveRedZone(newZone).catch((error) => {
      console.error('[Map] Failed to save zone:', error);
      setZones(prev => prev.filter(z => z.id !== newZone.id));
      Toast.show({ type: 'error', text1: 'Error al guardar', text2: 'No se pudo guardar la zona' });
    });
  };

  const handleCancelAdd = () => {
    setShowAddModal(false);
    setPendingLocation(null);
    setZoneDescription('');
    setSelectedType(null);
    setDescriptionError(false);
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
        style={styles.map}
        showsUserLocation
        initialRegion={region}
        onPress={handleMapPress}
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

        {zones.map((zone) => (
          <ZoneMarker key={zone.id} zone={zone} onPress={() => handleCirclePress(zone)} />
        ))}
      </MapView>

      {/* Layer selector */}
      <Pressable
        onPress={() => setLayerModalVisible(true)}
        className="absolute top-12 right-4 p-3 rounded-full"
        style={{ backgroundColor: 'rgba(8, 15, 30, 0.85)' }}
      >
        <MaterialCommunityIcons name="layers-outline" size={24} color="white" />
      </Pressable>

      {/* Layer Modal */}
      <Modal
        animationType="slide"
        transparent
        visible={layerModalVisible}
        onRequestClose={() => setLayerModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/40">
          <View className="p-6 rounded-t-2xl" style={{ backgroundColor: colors.brandBlack }}>
            <Text className="text-lg font-poppins-semibold mb-4 text-center text-white">
              Capas del mapa
            </Text>
            {layers.map(({ label, state, setter, icon }) => (
              <View
                key={label}
                className="flex-row justify-between items-center mb-3"
              >
                <View className="flex-row items-center">
                  <MaterialCommunityIcons name={icon} size={20} color="white" />
                  <Text className="ml-2 text-base font-poppins text-white">{label}</Text>
                </View>
                <Switch
                  value={state}
                  onValueChange={setter}
                  trackColor={{ false: 'rgba(255,255,255,0.15)', true: colors.brandBlue }}
                  thumbColor="white"
                />
              </View>
            ))}
            <Pressable
              onPress={() => setLayerModalVisible(false)}
              className="mt-2 py-3 rounded-full items-center"
              style={{ backgroundColor: colors.brandBlue }}
            >
              <Text className="text-white font-poppins-semibold">Cerrar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* FAB - Add zone */}
      <TouchableOpacity
        onPress={handleToggleAddingMode}
        style={{
          position: 'absolute',
          bottom: 112,
          right: 16,
          width: 48,
          height: 48,
          borderRadius: 14,
          backgroundColor: isAddingMode ? colors.brandBlue : 'rgba(8, 15, 30, 0.85)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <MaterialCommunityIcons
          name={isAddingMode ? "close" : "map-marker-plus-outline"}
          size={24}
          color="#FFFFFF"
        />
      </TouchableOpacity>

      {/* Recenter */}
      <Pressable
        onPress={() => mapRef.current?.animateToRegion(region, 1000)}
        style={{
          position: 'absolute',
          bottom: 56,
          right: 16,
          width: 48,
          height: 48,
          borderRadius: 14,
          backgroundColor: 'rgba(8, 15, 30, 0.85)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <MaterialCommunityIcons name="navigation-variant" size={24} color="#FFFFFF" />
      </Pressable>

      {/* Modal: Report Zone */}
      <Modal
        animationType="slide"
        transparent
        visible={showAddModal}
        onRequestClose={handleCancelAdd}
      >
        <View className="flex-1 justify-end bg-black/40">
          <View className="rounded-t-2xl p-6" style={{ backgroundColor: colors.brandBlack }}>
            {selectedType === null ? (
              <>
                <Text className="text-xl font-poppins-semibold mb-2 text-center text-white">¿Qué tipo de evento?</Text>
                <Text className="text-sm font-poppins text-white/50 mb-5 text-center">Selecciona la categoría del reporte</Text>
                <View className="flex-row flex-wrap gap-3 mb-4">
                  {(Object.entries(ZONE_TYPES) as [ZoneType, typeof ZONE_TYPES[ZoneType]][]).map(([key, cfg]) => (
                    <TouchableOpacity
                      key={key}
                      onPress={() => setSelectedType(key)}
                      className="flex-1 items-center py-4 rounded-2xl"
                      style={{ backgroundColor: cfg.color, minWidth: '40%' }}
                    >
                      <MaterialCommunityIcons name={cfg.icon as any} size={28} color="#fff" />
                      <Text className="text-white font-poppins-semibold mt-2">{cfg.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity onPress={handleCancelAdd} className="py-3 items-center">
                  <Text className="font-poppins text-white/50">Cancelar</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity onPress={() => setSelectedType(null)} className="flex-row items-center mb-4">
                  <MaterialCommunityIcons name="arrow-left" size={20} color="rgba(255,255,255,0.6)" />
                  <Text className="font-poppins text-white/60 ml-1">Cambiar tipo</Text>
                </TouchableOpacity>

                <View className="flex-row items-center mb-4 p-3 rounded-xl" style={{ backgroundColor: ZONE_TYPES[selectedType].color + '22' }}>
                  <MaterialCommunityIcons name={ZONE_TYPES[selectedType].icon as any} size={24} color={ZONE_TYPES[selectedType].color} />
                  <Text className="ml-2 font-poppins-semibold" style={{ color: ZONE_TYPES[selectedType].color }}>
                    {ZONE_TYPES[selectedType].label}
                  </Text>
                </View>

                <Text className="text-sm font-poppins text-white/60 mb-2">Describe qué está sucediendo:</Text>
                <TextInput
                  className="rounded-lg p-3 mb-1 font-poppins"
                  style={{
                    minHeight: 100,
                    color: 'white',
                    borderWidth: 2,
                    borderColor: descriptionError ? colors.brandRed : 'rgba(255,255,255,0.2)',
                    fontFamily: fonts.poppins,
                  }}
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  placeholder="Ej: Inundación severa, árboles caídos, camino bloqueado..."
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  value={zoneDescription}
                  onChangeText={(t) => { setZoneDescription(t); if (descriptionError) setDescriptionError(false); }}
                />
                {descriptionError && (
                  <Text className="text-brand-red font-poppins text-xs mb-3">Por favor describe qué sucede en esta zona</Text>
                )}

                <View className="flex-row gap-3">
                  <TouchableOpacity
                    onPress={handleCancelAdd}
                    className="flex-1 py-3 rounded-lg items-center"
                    style={{ borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)' }}
                  >
                    <Text className="font-poppins-semibold text-white/60">Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleSaveZone}
                    className="flex-1 py-3 rounded-lg items-center"
                    style={{ backgroundColor: ZONE_TYPES[selectedType].color }}
                  >
                    <Text className="font-poppins-semibold text-white">Reportar</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal: Zone Detail */}
      <Modal
        animationType="fade"
        transparent
        visible={showDetailModal}
        onRequestClose={() => { setShowDetailModal(false); setIsEditing(false); }}
      >
        <View className="flex-1 justify-center bg-black/60" style={{ padding: 24 }}>
          {selectedZone && (() => {
            const cfg = ZONE_TYPES[selectedZone.type];
            return (
              <View style={{ borderTopRightRadius: 20, borderBottomRightRadius: 20, borderBottomLeftRadius: 20, overflow: 'hidden' }}>
                {/* Header */}
                <View style={{ backgroundColor: cfg.color, padding: 24, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <MaterialCommunityIcons name={cfg.icon as any} size={32} color="#fff" />
                  <View>
                    <Text style={{ color: '#fff', fontSize: 24, fontFamily: fonts.poppinsSemiBold, letterSpacing: 2 }}>
                      {cfg.label.toUpperCase()}
                    </Text>
                    <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, fontFamily: fonts.poppins, letterSpacing: 3 }}>
                      REPORTADA
                    </Text>
                  </View>
                </View>

                {/* Body */}
                <View style={{ backgroundColor: '#0d1f3c', padding: 24, paddingBottom: 24 }}>
                  <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, fontFamily: fonts.poppins }}>Descripción:</Text>
                  {isEditing ? (
                    <TextInput
                      value={editDescription}
                      onChangeText={setEditDescription}
                      multiline
                      style={{
                        color: '#fff',
                        fontSize: 15,
                        fontFamily: fonts.poppins,
                        borderWidth: 1,
                        borderColor: 'rgba(255,255,255,0.3)',
                        borderRadius: 8,
                        padding: 8,
                        marginTop: 4,
                        marginBottom: 12,
                        minHeight: 80,
                        textAlignVertical: 'top',
                      }}
                    />
                  ) : (
                    <Text style={{ color: '#fff', fontFamily: fonts.poppinsSemiBold, fontSize: 15, marginBottom: 12 }}>
                      {selectedZone.description}
                    </Text>
                  )}

                  <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, fontFamily: fonts.poppins }}>Ubicación:</Text>
                  <Text style={{ color: '#fff', fontFamily: fonts.poppinsSemiBold, fontSize: 15, marginBottom: 12 }}>
                    {selectedZone.latitude.toFixed(5)}, {selectedZone.longitude.toFixed(5)}
                  </Text>

                  <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, fontFamily: fonts.poppins }}>Reportado:</Text>
                  <Text style={{ color: '#fff', fontFamily: fonts.poppinsSemiBold, fontSize: 15, marginBottom: 20 }}>
                    {new Date(selectedZone.timestamp).toLocaleString('es-MX')}
                  </Text>

                  {/* Actions */}
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    {isEditing ? (
                      <>
                        <TouchableOpacity
                          onPress={() => setIsEditing(false)}
                          style={{ flex: 1, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', alignItems: 'center' }}
                        >
                          <Text style={{ color: '#fff', fontFamily: fonts.poppins }}>Cancelar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={handleSaveEdit}
                          style={{ flex: 1, padding: 10, borderRadius: 10, backgroundColor: cfg.color, alignItems: 'center' }}
                        >
                          <Text style={{ color: '#fff', fontFamily: fonts.poppinsSemiBold }}>Guardar</Text>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <>
                        <TouchableOpacity
                          onPress={handleDeleteZone}
                          style={{ padding: 10, borderRadius: 10, backgroundColor: colors.brandRed, alignItems: 'center', justifyContent: 'center' }}
                        >
                          <MaterialCommunityIcons name="trash-can-outline" size={20} color="#fff" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => setIsEditing(true)}
                          style={{ flex: 1, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', alignItems: 'center' }}
                        >
                          <Text style={{ color: '#fff', fontFamily: fonts.poppins }}>Editar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => setShowDetailModal(false)}
                          style={{ padding: 10, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <MaterialCommunityIcons name="close" size={20} color="#fff" />
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                </View>
              </View>
            );
          })()}
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
