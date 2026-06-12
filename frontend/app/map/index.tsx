import React, { useState, useEffect, useRef, useCallback } from "react";
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
  ActivityIndicator,
  AppState,
  Image,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import MapView, { UrlTile, PROVIDER_GOOGLE, Marker, Callout } from "react-native-maps";
import * as Location from "expo-location";
import { syncLocationToBackend } from "../../utils/locationSync";
import { toast } from "sonner-native";
import {
  canReportFromLocation,
  createZone,
  deleteZone,
  formatRelativeTime,
  generateZoneId,
  loadZones,
  reverseGeocodeAddress,
  syncCachedZones,
  updateZone,
  voteZone,
} from "./service";
import { darkMapStyle } from "./mapStyle";
import { DEFAULT_REGION, REPORTING_DISTANCE_METERS, ZONE_TYPES } from "./config";
import { colors, fonts } from "../../utils/theme";
import { authFetch } from "../../utils/api";
import { API_BASE_URL } from "../../utils/config";
import * as Network from "expo-network";
import { useFocusEffect } from "expo-router";
import { enqueueSOS, hasPendingSOSItem, getPendingSOSItem, flushSOSQueue, clearSOSQueue } from "./sosQueue";
import type { Zone, ZoneType } from "./types";

const OWM_API_KEY = process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY;

type MCIName = React.ComponentProps<typeof MaterialCommunityIcons>['name']

interface MapProps {
  focusLat?: number;
  focusLon?: number;
  focusTitle?: string;
  focusLevel?: number;
}

const LEVEL_COLORS: Record<number, string> = {
  1: '#4CAF50',
  2: '#4CAF50',
  3: '#FFC107',
  4: '#FF9800',
  5: '#F44336',
}

const ZoneMarker = React.memo(function ZoneMarker({ zone, onPress }: { zone: Zone; onPress: () => void }) {
  // Custom-image markers must redraw their native bitmap once on load, then STOP.
  // While tracksViewChanges is true the hit area is unstable and Android drops taps,
  // so we flip it off after the image renders → reliable taps + big perf win.
  const [tracksViewChanges, setTracksViewChanges] = useState(true);
  return (
    <Marker
      coordinate={{ latitude: zone.latitude, longitude: zone.longitude }}
      onPress={onPress}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={tracksViewChanges}
    >
      <Image
        source={ZONE_TYPES[zone.type].image}
        style={{ width: zone.type === 'ayuda' ? 44 : 38, height: zone.type === 'ayuda' ? 44 : 38 }}
        resizeMode="contain"
        // Android fades images in (~300ms). Without this, tracksViewChanges freezes the
        // marker bitmap mid-fade → permanently faded markers. fadeDuration={0} removes
        // the partial-opacity window so the frozen bitmap is always full opacity.
        fadeDuration={0}
        onLoad={() => setTracksViewChanges(false)}
      />
    </Marker>
  );
});

export default function WeatherMapNativewind({ focusLat, focusLon, focusTitle, focusLevel }: MapProps = {}) {
  const [region, setRegion] = useState(DEFAULT_REGION);
  const [showWind, setShowWind] = useState(true);
  const [showPrecip, setShowPrecip] = useState(false);
  const [showClouds, setShowClouds] = useState(false);
  const [showEvents, setShowEvents] = useState(true);
  const [layerModalVisible, setLayerModalVisible] = useState(false);
  const mapRef = useRef(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

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
  const [isSosSending, setIsSosSending] = useState(false);
  const [currentCoords, setCurrentCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [hasPendingSOS, setHasPendingSOS] = useState(false);
  const [linkedContactCount, setLinkedContactCount] = useState<number | null>(null);

  // Al montar y al volver al foco: verificar cola con control de antigüedad.
  // Items < 30 min → flush automático. Items > 30 min → pedir confirmación al usuario.
  useFocusEffect(
    useCallback(() => {
      (async () => {
        const item = await getPendingSOSItem();
        if (!item) {
          setHasPendingSOS(false);
          return;
        }
        setHasPendingSOS(true);
        const ageMs = Date.now() - item.queuedAt;
        if (ageMs > 30 * 60 * 1000) {
          const mins = Math.round(ageMs / 60000);
          Alert.alert(
            'SOS pendiente',
            `Tienes un SOS pendiente de hace ${mins} minuto(s). ¿Quieres enviarlo ahora o cancelarlo?`,
            [
              {
                text: 'Cancelar SOS',
                style: 'destructive',
                onPress: async () => {
                  await clearSOSQueue();
                  setHasPendingSOS(false);
                },
              },
              {
                text: 'Enviar ahora',
                onPress: async () => {
                  await flushSOSQueue();
                  setHasPendingSOS(await hasPendingSOSItem());
                },
              },
            ]
          );
        } else {
          await flushSOSQueue();
          setHasPendingSOS(await hasPendingSOSItem());
        }
      })();
    }, [])
  );

  // Al volver al foco: actualizar conteo de contactos vinculados para el badge del FAB
  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          const res = await authFetch(`${API_BASE_URL}/api/v1/sos-contacts`);
          if (!res.ok) return;
          const data: { link_status: string }[] = await res.json();
          setLinkedContactCount(data.filter(c => c.link_status === 'linked').length);
        } catch {
          // best-effort — badge stays hidden on error
        }
      })();
    }, [])
  );

  // Al volver a foreground (desde background): re-chequear cola tras flush de _layout
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        hasPendingSOSItem().then(setHasPendingSOS);
      }
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (focusLat == null || focusLon == null) return;
    const focusRegion = {
      latitude: focusLat,
      longitude: focusLon,
      latitudeDelta: 3,
      longitudeDelta: 3,
    };
    setRegion(focusRegion);
    mapRef.current?.animateToRegion(focusRegion, 800);
  }, [focusLat, focusLon]);

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
        setUserLocation({ latitude: coords.latitude, longitude: coords.longitude });
        setCurrentCoords({ latitude: coords.latitude, longitude: coords.longitude });
        mapRef.current?.animateToRegion(userRegion, 1000);
        syncLocationToBackend(coords.latitude, coords.longitude);
      } catch (error) {
        console.warn("⚠️ Could not get location (timeout or error), using default region:", error.message);
      }
    })();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    if (!userLocation) return;

    (async () => {
      try {
        const loaded = await loadZones({
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
        });
        const valid = loaded.filter((z: Zone) => z.type && ZONE_TYPES[z.type]);
        setZones(valid);
      } catch (error) {
        console.error('[Map] Failed to load zones:', error);
      }
    })();
  }, [userLocation]);

  const handleToggleAddingMode = () => {
    setIsAddingMode(prev => !prev);
  };

  const handleMapPress = (e: { nativeEvent: { coordinate: { latitude: number; longitude: number } } }) => {
    if (isAddingMode) {
      const { latitude, longitude } = e.nativeEvent.coordinate;
      if (!userLocation) {
        toast.error('Ubicacion requerida', {
          description: 'Activa tu ubicacion para reportar una zona',
        });
        setIsAddingMode(false);
        return;
      }
      if (!canReportFromLocation({ latitude, longitude }, userLocation)) {
        toast.error('Reporte demasiado lejos', {
          description: `Solo puedes reportar dentro de ${Math.round(REPORTING_DISTANCE_METERS / 1000)} km de tu ubicacion`,
        });
        setIsAddingMode(false);
        return;
      }
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
    updateZone(updated).then((savedZone) => {
      setZones(prev => {
        const next = prev.map(z => z.id === savedZone.id ? savedZone : z);
        syncCachedZones(next);
        return next;
      });
      setSelectedZone(savedZone);
    }).catch((error) => {
      console.error('[Map] Failed to update zone:', error);
      setZones(prev => prev.map(z => z.id === selectedZone.id ? selectedZone : z));
      setSelectedZone(selectedZone);
      toast.error('Error al editar', { description: 'No se pudo guardar el cambio' });
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
            deleteZone(deleted.id).then(() => {
              setZones(prev => {
                const next = prev.filter(z => z.id !== deleted.id);
                syncCachedZones(next);
                return next;
              });
            }).catch((error) => {
              console.error('[Map] Failed to delete zone:', error);
              setZones(prev => [...prev, deleted]);
              toast.error('Error al eliminar', { description: 'No se pudo eliminar la zona' });
            });
          },
        },
      ]
    );
  };

  const handleVoteZone = (value: 1 | -1) => {
    if (!selectedZone) return;

    const voterLocation = currentCoords ?? userLocation ?? {
      latitude: region.latitude,
      longitude: region.longitude,
    };

    voteZone(selectedZone.id, value, voterLocation)
      .then((votedZone) => {
        setZones((prev) => {
          const next = prev.map((zone) => (zone.id === votedZone.id ? votedZone : zone));
          syncCachedZones(next);
          return next;
        });
        setSelectedZone(votedZone);
        toast.success(value === 1 ? 'Evento confirmado' : 'Evento marcado como engañoso', {
          description: 'Tu voto se registró correctamente',
        });
      })
      .catch((error) => {
        console.error('[Map] Failed to vote zone:', error);
        toast.error('No se pudo votar', {
          description: value === 1
            ? 'Debes estar cerca del evento para confirmarlo'
            : 'Debes estar cerca del evento para marcarlo como engañoso',
        });
      });
  };

  const handleSaveZone = () => {
    if (!selectedType) return;
    if (!zoneDescription.trim()) {
      setDescriptionError(true);
      return;
    }
    if (!pendingLocation || !userLocation) {
      toast.error('Ubicacion requerida', { description: 'Necesitamos tu ubicacion para validar el reporte' });
      return;
    }
    if (!canReportFromLocation(pendingLocation, userLocation)) {
      toast.error('Reporte demasiado lejos', {
        description: `Solo puedes reportar dentro de ${Math.round(REPORTING_DISTANCE_METERS / 1000)} km de tu ubicacion`,
      });
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
      isOwner: true, // you created it → you own it, until the server confirms with the real record
    };

    setZones(prev => [...prev, newZone]);
    setShowAddModal(false);
    setPendingLocation(null);
    setZoneDescription('');
    setSelectedType(null);
    setDescriptionError(false);
    toast.success('Zona reportada', { description: 'Gracias por tu reporte' });

    // Geocode in the background so the optimistic marker/toast appear instantly,
    // then persist the event WITH the resolved address (null → coords fallback).
    (async () => {
      const address = await reverseGeocodeAddress(newZone.latitude, newZone.longitude);
      if (address) {
        setZones(prev => prev.map(z => (z.id === newZone.id ? { ...z, address } : z)));
      }
      try {
        const savedZone = await createZone({ ...newZone, address });
        setZones(prev => {
          const next = prev.map(z => (z.id === newZone.id ? savedZone : z));
          syncCachedZones(next);
          return next;
        });
      } catch (error) {
        console.error('[Map] Failed to save zone:', error);
        setZones(prev => prev.filter(z => z.id !== newZone.id));
        toast.error('Error al guardar', { description: 'No se pudo guardar la zona' });
      }
    })();
  };

  const handleCancelAdd = () => {
    setShowAddModal(false);
    setPendingLocation(null);
    setZoneDescription('');
    setSelectedType(null);
    setDescriptionError(false);
  };

  const handleSOSTrigger = () => {
    Alert.alert(
      "Enviar SOS",
      "Esto notificará a tus contactos de confianza con tu ubicación actual. ¿Continuar?",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Enviar SOS", style: "destructive", onPress: doSendSOS },
      ]
    );
  };

  const doSendSOS = async () => {
    setIsSosSending(true);
    try {
      // 1. Obtener GPS primero (funciona sin internet)
      let lat: number | undefined;
      let lon: number | undefined;
      let gpsFailed = false;
      let permDenied = false;
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        try {
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("timeout")), 5000)
          );
          const { coords } = await Promise.race([
            Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
            timeoutPromise,
          ]);
          lat = coords.latitude;
          lon = coords.longitude;
        } catch {
          gpsFailed = true;
        }
      } else {
        permDenied = true;
      }

      // 2. Verificar conectividad (con coords ya en mano si las hay)
      const net = await Network.getNetworkStateAsync();
      if (net.isConnected === false || net.isInternetReachable === false) {
        const hasCoords = lat !== undefined;
        await enqueueSOS(lat, lon);
        setHasPendingSOS(true);
        toast.info(hasCoords ? "SOS guardado" : "SOS guardado sin ubicación", {
          description: "Se enviará cuando recuperes conexión.",
        });
        return;
      }

      // 3. Online: mostrar feedback de GPS si aplica
      if (permDenied) {
        toast.info("Permiso de ubicación denegado", { description: "Se enviará el SOS sin coordenadas." });
      } else if (gpsFailed) {
        toast.info("Sin ubicación precisa", { description: "Se enviará el SOS sin coordenadas." });
      }

      const body: { lat?: number; lon?: number } = {};
      if (lat !== undefined) body.lat = lat;
      if (lon !== undefined) body.lon = lon;

      let res: Response;
      try {
        res = await authFetch(`${API_BASE_URL}/api/v1/sos/trigger`, {
          method: "POST",
          body: JSON.stringify(body),
        });
      } catch {
        await enqueueSOS(lat, lon);
        setHasPendingSOS(true);
        toast.info("SOS guardado", { description: "Se enviará cuando recuperes conexión." });
        return;
      }

      if (res.status === 429) {
        await enqueueSOS(lat, lon);
        setHasPendingSOS(true);
        const retryAfterSec = parseInt(res.headers.get('Retry-After') ?? '600', 10);
        const minutes = Math.ceil(retryAfterSec / 60);
        const retryText = minutes <= 1 ? 'en 1 min.' : `en ${minutes} min.`;
        toast.error("Límite alcanzado", { description: `Podrás enviar otro SOS ${retryText}` });
        return;
      }

      if (res.status >= 500) {
        await enqueueSOS(lat, lon);
        setHasPendingSOS(true);
        toast.info("SOS guardado", { description: "Error del servidor. Se reintentará automáticamente." });
        return;
      }

      if (!res.ok) {
        // 4xx (no 429): error de cliente, no encolar
        toast.error("Error", { description: "No se pudo enviar el SOS. Intenta de nuevo." });
        return;
      }

      const data = await res.json();
      setHasPendingSOS(false);
      if (data.notified_count === 0) {
        toast.info("SOS enviado", { description: "No tienes contactos vinculados. Agrégalos en tu perfil." });
      } else {
        toast.success("SOS enviado", { description: `${data.notified_count} contacto(s) notificado(s).` });
      }
    } finally {
      setIsSosSending(false);
    }
  };

  const layers: Array<{ label: string; state: boolean; setter: (v: boolean) => void; icon: MCIName }> = [
    { label: "Viento", state: showWind, setter: setShowWind, icon: "weather-windy" },
    { label: "Precipitación", state: showPrecip, setter: setShowPrecip, icon: "weather-rainy" },
    { label: "Nubes", state: showClouds, setter: setShowClouds, icon: "weather-cloudy" },
    { label: "Eventos", state: showEvents, setter: setShowEvents, icon: "map-marker-multiple-outline" },
  ]

  // Trust is shown as a binary: an event is either community-verified or not yet.
  // 'dudoso' folds into "Sin verificar" — doubtful events are already hidden from other users.
  const getTrustBadge = (status: NonNullable<Zone['trustStatus']>) =>
    status === 'confirmado'
      ? { label: 'Verificado', tone: colors.brandGreen }
      : { label: 'Sin verificar', tone: colors.brandBlue };

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

        {showEvents && zones.map((zone) => (
          <ZoneMarker key={zone.id} zone={zone} onPress={() => handleCirclePress(zone)} />
        ))}

        {focusLat != null && focusLon != null && (
          <Marker coordinate={{ latitude: focusLat, longitude: focusLon }} anchor={{ x: 0.5, y: 0.5 }}>
            <View style={{
              backgroundColor: LEVEL_COLORS[focusLevel ?? 3],
              borderRadius: 24,
              padding: 8,
              borderWidth: 2,
              borderColor: 'white',
            }}>
              <MaterialCommunityIcons name="weather-hurricane" size={28} color="white" />
            </View>
            <Callout>
              <View style={{ padding: 8, maxWidth: 200 }}>
                <Text style={{ fontWeight: 'bold', fontSize: 13 }}>{focusTitle ?? 'Alerta'}</Text>
              </View>
            </Callout>
          </Marker>
        )}
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

      {/* SOS FAB */}
      <View style={{ position: 'absolute', bottom: 56, left: 16 }}>
        <TouchableOpacity
          onPress={handleSOSTrigger}
          disabled={isSosSending}
          style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            backgroundColor: isSosSending ? 'rgba(226,67,55,0.5)' : colors.brandRed,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {isSosSending
            ? <ActivityIndicator size="small" color="#fff" />
            : <MaterialCommunityIcons name="alarm-light-outline" size={24} color="#fff" />
          }
        </TouchableOpacity>
        {linkedContactCount !== null && (
          <View style={{
            position: 'absolute',
            top: -6,
            right: -6,
            minWidth: 18,
            height: 18,
            borderRadius: 9,
            backgroundColor: linkedContactCount === 0 ? colors.brandOrange : colors.brandGreen,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 4,
            borderWidth: 1.5,
            borderColor: '#fff',
          }}>
            <Text style={{ color: '#fff', fontSize: 10, fontFamily: fonts.poppinsSemiBold }}>
              {linkedContactCount === 0 ? '!' : linkedContactCount > 9 ? '9+' : String(linkedContactCount)}
            </Text>
          </View>
        )}
      </View>

      {/* SOS pendiente de envío */}
      {hasPendingSOS && (
        <View style={{
          position: 'absolute',
          top: 60,
          left: 16,
          right: 16,
          backgroundColor: colors.brandOrange + 'dd',
          borderRadius: 10,
          paddingHorizontal: 14,
          paddingVertical: 8,
          flexDirection: 'row',
          alignItems: 'center',
        }}>
          <MaterialCommunityIcons name="clock-outline" size={16} color="#fff" style={{ marginRight: 8 }} />
          <Text style={{ color: '#fff', fontFamily: fonts.poppins, fontSize: 13 }}>
            SOS pendiente de envío
          </Text>
        </View>
      )}

      {/* Modal: Report Zone */}
      <Modal
        animationType="slide"
        transparent
        visible={showAddModal}
        onRequestClose={handleCancelAdd}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
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
                      <Image source={cfg.image} style={{ width: 28, height: 28 }} resizeMode="contain" />
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
                  <Image source={ZONE_TYPES[selectedType].image} style={{ width: 24, height: 24 }} resizeMode="contain" />
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
        </KeyboardAvoidingView>
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
            const trustStatus = selectedZone.trustStatus ?? 'en_revision';
            const trust = getTrustBadge(trustStatus);
            const headerIconButton = {
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: 'rgba(0,0,0,0.18)',
              alignItems: 'center',
              justifyContent: 'center',
            } as const;
            return (
              <View style={{ borderTopRightRadius: 20, borderBottomRightRadius: 20, borderBottomLeftRadius: 20, overflow: 'hidden' }}>
                {/* Header */}
                <View style={{ backgroundColor: cfg.color, padding: 24, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Image source={cfg.image} style={{ width: 32, height: 32 }} resizeMode="contain" />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#fff', fontSize: 24, fontFamily: fonts.poppinsSemiBold, letterSpacing: 2 }}>
                      {cfg.label.toUpperCase()}
                    </Text>
                    <Text style={{
                      color: selectedZone.isOwner ? '#fff' : 'rgba(255,255,255,0.7)',
                      fontSize: 12,
                      fontFamily: selectedZone.isOwner ? fonts.poppinsSemiBold : fonts.poppins,
                      letterSpacing: 3,
                    }}>
                      {selectedZone.isOwner ? 'REPORTADA POR TI' : 'REPORTADA'}
                    </Text>
                  </View>
                  {!isEditing && selectedZone.isOwner && (
                    <>
                      <TouchableOpacity onPress={() => setIsEditing(true)} style={headerIconButton} accessibilityLabel="Editar reporte">
                        <MaterialCommunityIcons name="pencil-outline" size={20} color="#fff" />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={handleDeleteZone} style={headerIconButton} accessibilityLabel="Eliminar reporte">
                        <MaterialCommunityIcons name="trash-can-outline" size={20} color="#fff" />
                      </TouchableOpacity>
                    </>
                  )}
                  <TouchableOpacity
                    onPress={() => { setShowDetailModal(false); setIsEditing(false); }}
                    style={headerIconButton}
                    accessibilityLabel="Cerrar"
                  >
                    <MaterialCommunityIcons name="close" size={20} color="#fff" />
                  </TouchableOpacity>
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
                    {selectedZone.address ?? `${selectedZone.latitude.toFixed(5)}, ${selectedZone.longitude.toFixed(5)}`}
                  </Text>

                  <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, fontFamily: fonts.poppins }}>Reportado:</Text>
                  <Text style={{ color: '#fff', fontFamily: fonts.poppinsSemiBold, fontSize: 15, marginBottom: 20 }}>
                    {formatRelativeTime(selectedZone.timestamp)}
                  </Text>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20, flexWrap: 'wrap' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: `${trust.tone}22`, borderWidth: 1, borderColor: `${trust.tone}66` }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: trust.tone }} />
                      <Text style={{ color: trust.tone, fontFamily: fonts.poppinsSemiBold, fontSize: 13 }}>
                        {trust.label}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      <MaterialCommunityIcons name="thumb-up" size={15} color={colors.brandGreen} />
                      <Text style={{ color: '#fff', fontFamily: fonts.poppinsSemiBold, fontSize: 13 }}>
                        {selectedZone.upvotes ?? 0}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      <MaterialCommunityIcons name="thumb-down" size={15} color={colors.brandRed} />
                      <Text style={{ color: '#fff', fontFamily: fonts.poppinsSemiBold, fontSize: 13 }}>
                        {selectedZone.downvotes ?? 0}
                      </Text>
                    </View>
                  </View>

                  <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, fontFamily: fonts.poppins }}>Distancia:</Text>
                  <Text style={{ color: '#fff', fontFamily: fonts.poppinsSemiBold, fontSize: 15, marginBottom: 20 }}>
                    {selectedZone.distanceKm != null ? `${selectedZone.distanceKm.toFixed(1)} km` : 'Sin calcular'}
                  </Text>

                  {/* Voting (non-owner only) — collapses to a result chip once you've voted */}
                  {!selectedZone.isOwner && !isEditing && (
                    selectedZone.userVote != null ? (
                      <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 8,
                        paddingVertical: 12,
                        paddingHorizontal: 14,
                        borderRadius: 10,
                        backgroundColor: `${selectedZone.userVote === 1 ? colors.brandGreen : colors.brandRed}22`,
                        borderWidth: 1,
                        borderColor: `${selectedZone.userVote === 1 ? colors.brandGreen : colors.brandRed}66`,
                      }}>
                        <MaterialCommunityIcons
                          name={selectedZone.userVote === 1 ? 'check-circle' : 'alert-circle'}
                          size={20}
                          color={selectedZone.userVote === 1 ? colors.brandGreen : colors.brandRed}
                        />
                        <Text style={{ color: '#fff', fontFamily: fonts.poppins, fontSize: 13 }}>
                          {selectedZone.userVote === 1
                            ? 'Confirmaste este evento'
                            : 'Marcaste este evento como engañoso'}
                        </Text>
                      </View>
                    ) : (
                      <View>
                        <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, fontFamily: fonts.poppins, marginBottom: 10 }}>
                          Votación de cercanía: solo usuarios a 10 km o menos pueden votar.
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                          <TouchableOpacity
                            disabled={!selectedZone.canVote}
                            onPress={() => handleVoteZone(1)}
                            style={{ flex: 1, padding: 12, borderRadius: 10, backgroundColor: colors.brandGreen, alignItems: 'center', opacity: selectedZone.canVote ? 1 : 0.45 }}
                          >
                            <Text style={{ color: '#04233d', fontFamily: fonts.poppinsSemiBold }}>Confirmar</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            disabled={!selectedZone.canVote}
                            onPress={() => handleVoteZone(-1)}
                            style={{ flex: 1, padding: 12, borderRadius: 10, backgroundColor: colors.brandRed, alignItems: 'center', opacity: selectedZone.canVote ? 1 : 0.45 }}
                          >
                            <Text style={{ color: '#fff', fontFamily: fonts.poppinsSemiBold }}>Engañoso</Text>
                          </TouchableOpacity>
                        </View>
                        {!selectedZone.canVote && (
                          <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, fontFamily: fonts.poppins, marginTop: 10 }}>
                            Acércate a menos de 10 km para votar.
                          </Text>
                        )}
                      </View>
                    )
                  )}

                  {/* Edit-mode footer — only while editing your own report */}
                  {isEditing && (
                    <View style={{ flexDirection: 'row', gap: 10 }}>
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
                    </View>
                  )}
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
