import AsyncStorage from '@react-native-async-storage/async-storage';

import { authFetch } from '../../utils/api';
import type { Zone } from './types';

const STORAGE_KEY = '@BluEye:redZones';
const API_URL = process.env.EXPO_PUBLIC_API_URL;
const DEV_BYPASS_MAP_AUTH = __DEV__;

type MapEventDto = {
  can_vote: boolean;
  created_at: string;
  description: string;
  distance_km: number | null;
  downvotes: number;
  id: string;
  is_owner: boolean;
  lat: number;
  lon: number;
  type: Zone['type'];
  trust_status: NonNullable<Zone['trustStatus']>;
  updated_at: string;
  upvotes: number;
  user_vote: Zone['userVote'];
  within_voting_radius: boolean;
};

function mapDtoToZone(dto: MapEventDto): Zone {
  return {
    id: dto.id,
    latitude: dto.lat,
    longitude: dto.lon,
    description: dto.description,
    timestamp: dto.created_at,
    radius: 500,
    type: dto.type,
    upvotes: dto.upvotes,
    downvotes: dto.downvotes,
    userVote: dto.user_vote,
    isOwner: dto.is_owner,
    distanceKm: dto.distance_km,
    withinVotingRadius: dto.within_voting_radius,
    canVote: dto.can_vote,
    trustStatus: dto.trust_status,
  };
}

async function localLoadRedZones(): Promise<Zone[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('[RedZones] Error loading local zones:', error);
    return [];
  }
}

async function localSaveAllZones(zones: Zone[]) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(zones));
}

async function mapFetch(path: string, options: RequestInit = {}) {
  if (!API_URL) {
    throw new Error('Missing EXPO_PUBLIC_API_URL');
  }

  const url = `${API_URL}${path}`;
  if (DEV_BYPASS_MAP_AUTH) {
    return fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
  }

  return authFetch(url, options);
}

export async function loadRedZones(lat?: number, lon?: number): Promise<Zone[]> {
  if (lat == null || lon == null) {
    return localLoadRedZones();
  }

  try {
    const response = await mapFetch(`/api/v1/map-events?lat=${lat}&lon=${lon}&radius_km=10`);
    if (!response.ok) {
      throw new Error(`Map events fetch failed: ${response.status}`);
    }
    const payload = (await response.json()) as MapEventDto[];
    const zones = payload.map(mapDtoToZone);
    await localSaveAllZones(zones);
    return zones;
  } catch (error) {
    console.error('[RedZones] Falling back to local zones:', error);
    return localLoadRedZones();
  }
}

export async function saveRedZone(zone: Zone) {
  try {
    const response = await mapFetch('/api/v1/map-events', {
      method: 'POST',
      body: JSON.stringify({
        type: zone.type,
        description: zone.description,
        lat: zone.latitude,
        lon: zone.longitude,
      }),
    });

    if (!response.ok) {
      throw new Error(`Map event create failed: ${response.status}`);
    }

    const dto = (await response.json()) as MapEventDto;
    const savedZone = mapDtoToZone(dto);
    const zones = await localLoadRedZones();
    await localSaveAllZones([...zones.filter((item) => item.id !== zone.id), savedZone]);
    return savedZone;
  } catch (error) {
    console.error('[RedZones] Error saving remote zone, keeping local:', error);
    const zones = await localLoadRedZones();
    await localSaveAllZones([...zones, zone]);
    return zone;
  }
}

export async function updateRedZone(zone: Zone) {
  try {
    const response = await mapFetch(`/api/v1/map-events/${zone.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        description: zone.description,
      }),
    });
    if (!response.ok) {
      throw new Error(`Map event update failed: ${response.status}`);
    }
    const dto = (await response.json()) as MapEventDto;
    const updatedZone = mapDtoToZone(dto);
    const zones = await localLoadRedZones();
    await localSaveAllZones(zones.map((item) => (item.id === zone.id ? updatedZone : item)));
    return updatedZone;
  } catch (error) {
    console.error('[RedZones] Error updating remote zone, keeping local:', error);
    const zones = await localLoadRedZones();
    const updated = zones.map((item) => (item.id === zone.id ? zone : item));
    await localSaveAllZones(updated);
    return zone;
  }
}

export async function deleteRedZone(zoneId: string) {
  try {
    await mapFetch(`/api/v1/map-events/${zoneId}`, {
      method: 'DELETE',
    });
  } catch (error) {
    console.error('[RedZones] Error deleting remote zone, removing local copy anyway:', error);
  }

  const zones = await localLoadRedZones();
  await localSaveAllZones(zones.filter((item) => item.id !== zoneId));
  return true;
}

export async function voteRedZone(
  zoneId: string,
  value: 1 | -1,
  lat: number,
  lon: number
) {
  const response = await mapFetch(`/api/v1/map-events/${zoneId}/vote`, {
    method: 'POST',
    body: JSON.stringify({ value, lat, lon }),
  });

  if (!response.ok) {
    throw new Error(`Map event vote failed: ${response.status}`);
  }

  const dto = (await response.json()) as MapEventDto;
  const votedZone = mapDtoToZone(dto);
  const zones = await localLoadRedZones();
  await localSaveAllZones(zones.map((item) => (item.id === zoneId ? votedZone : item)));
  return votedZone;
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
  return `zone_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
