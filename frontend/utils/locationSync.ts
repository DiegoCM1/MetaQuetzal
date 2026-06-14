import AsyncStorage from '@react-native-async-storage/async-storage';
import { authFetch } from './api';
import { API_BASE_URL } from './config';

const LAST_SYNC_KEY = '@BluEye:location_last_sync';
const LAST_COORDS_KEY = '@BluEye:location_last_coords';
const SYNC_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Silently syncs the user's GPS coordinates to the backend.
 * Skips if the position hasn't changed by more than 1 km AND less than 1 hour has passed.
 * Never throws — designed to run fire-and-forget alongside other location logic.
 */
export async function syncLocationToBackend(lat: number, lon: number): Promise<void> {
  try {
    const now = Date.now();

    const [lastSyncStr, lastCoordsStr] = await Promise.all([
      AsyncStorage.getItem(LAST_SYNC_KEY),
      AsyncStorage.getItem(LAST_COORDS_KEY),
    ]);

    const intervalElapsed = !lastSyncStr || (now - parseInt(lastSyncStr)) > SYNC_INTERVAL_MS;

    let significantMove = true;
    if (lastCoordsStr) {
      const { lat: pLat, lon: pLon } = JSON.parse(lastCoordsStr);
      significantMove = haversineKm(lat, lon, pLat, pLon) > 1.0;
    }

    if (!significantMove && !intervalElapsed) return;

    const res = await authFetch(`${API_BASE_URL}/api/v1/users/me/location`, {
      method: 'PATCH',
      body: JSON.stringify({ lat, lon }),
    });

    if (res.ok) {
      await Promise.all([
        AsyncStorage.setItem(LAST_SYNC_KEY, String(now)),
        AsyncStorage.setItem(LAST_COORDS_KEY, JSON.stringify({ lat, lon })),
      ]);
    }
  } catch {
    // Silent — never interrupts the caller
  }
}
