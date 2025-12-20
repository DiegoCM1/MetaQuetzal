import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@BluEye:redZones';

/**
 * Red Zone structure:
 * {
 *   id: string,
 *   latitude: number,
 *   longitude: number,
 *   description: string,
 *   timestamp: string (ISO),
 *   radius: number (meters)
 * }
 */

/**
 * Load all red zones from AsyncStorage
 */
export async function loadRedZones() {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    const zones = data ? JSON.parse(data) : [];
    console.log('📍 [RedZones] Loaded from storage:', zones.length, 'zones');
    if (zones.length > 0) {
      console.log('📍 [RedZones] First zone:', zones[0]);
    }
    return zones;
  } catch (error) {
    console.error('❌ [RedZones] Error loading:', error);
    return [];
  }
}

/**
 * Save a new red zone
 */
export async function saveRedZone(zone) {
  try {
    console.log('💾 [RedZones] Attempting to save zone:', zone);
    const zones = await loadRedZones();
    zones.push(zone);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(zones));
    console.log('✅ [RedZones] Zone saved successfully! Total zones:', zones.length);

    // Verify it was saved
    const verification = await AsyncStorage.getItem(STORAGE_KEY);
    console.log('🔍 [RedZones] Verification - storage now contains:', verification ? JSON.parse(verification).length : 0, 'zones');

    return true;
  } catch (error) {
    console.error('❌ [RedZones] Error saving zone:', error);
    return false;
  }
}

/**
 * Delete a red zone by ID
 */
export async function deleteRedZone(zoneId) {
  try {
    const zones = await loadRedZones();
    const filtered = zones.filter(z => z.id !== zoneId);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return true;
  } catch (error) {
    console.error('Error deleting red zone:', error);
    return false;
  }
}

/**
 * Generate a simple unique ID
 */
export function generateZoneId() {
  return `zone_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
