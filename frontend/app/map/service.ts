import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@BluEye:redZones';

export async function loadRedZones() {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('[RedZones] Error loading:', error);
    return [];
  }
}

export async function saveRedZone(zone) {
  try {
    const zones = await loadRedZones();
    zones.push(zone);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(zones));
    return true;
  } catch (error) {
    console.error('[RedZones] Error saving zone:', error);
    return false;
  }
}

export async function updateRedZone(zone: { id: string; [key: string]: any }) {
  try {
    const zones = await loadRedZones();
    const updated = zones.map((z: { id: string }) => z.id === zone.id ? zone : z);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return true;
  } catch (error) {
    console.error('[RedZones] Error updating zone:', error);
    return false;
  }
}

export async function deleteRedZone(zoneId) {
  try {
    const zones = await loadRedZones();
    const filtered = zones.filter(z => z.id !== zoneId);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return true;
  } catch (error) {
    console.error('[RedZones] Error deleting zone:', error);
    return false;
  }
}

export async function clearAllZones() {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (error) {
    console.error('[RedZones] Error clearing zones:', error);
    return false;
  }
}

export function generateZoneId() {
  return `zone_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
