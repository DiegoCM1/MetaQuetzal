import AsyncStorage from '@react-native-async-storage/async-storage'

import { API_BASE_URL } from '../../utils/config'
import { MAP_EVENT_RADIUS_KM, REPORTING_DISTANCE_METERS } from './config'
import type { Zone } from './types'

const STORAGE_KEY = '@BluEye:redZones'
const DEV_BYPASS_MAP_AUTH = process.env.EXPO_PUBLIC_DEV_BYPASS_MAP_AUTH === 'true'

type ReporterLocation = {
  latitude: number
  longitude: number
}

type LoadZonesParams = ReporterLocation & {
  radiusKm?: number
}

type MapEventResponse = {
  can_vote?: boolean
  id: string
  user_id?: number | null
  is_owner?: boolean
  type: Zone['type']
  description: string
  distance_km?: number | null
  downvotes?: number
  lat: number
  lon: number
  trust_status?: NonNullable<Zone['trustStatus']>
  upvotes?: number
  created_at?: string
  updated_at?: string
  user_vote?: Zone['userVote']
  within_voting_radius?: boolean
}

function normalizeZone(event: MapEventResponse): Zone {
  return {
    id: String(event.id),
    latitude: Number(event.lat),
    longitude: Number(event.lon),
    description: String(event.description),
    timestamp: String(event.created_at ?? event.updated_at ?? new Date().toISOString()),
    radius: 500,
    type: event.type,
    upvotes: event.upvotes ?? 0,
    downvotes: event.downvotes ?? 0,
    userVote: event.user_vote ?? null,
    isOwner: event.is_owner ?? false,
    distanceKm: event.distance_km ?? null,
    withinVotingRadius: event.within_voting_radius ?? false,
    canVote: event.can_vote ?? false,
    trustStatus: event.trust_status ?? 'en_revision',
  }
}

export function generateZoneId() {
  return `zone_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
}

export function distanceInMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180
  const earthRadius = 6371000
  const dLat = toRadians(lat2 - lat1)
  const dLon = toRadians(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return earthRadius * c
}

export function canReportFromLocation(
  eventLocation: ReporterLocation,
  reporterLocation: ReporterLocation
) {
  return (
    distanceInMeters(
      eventLocation.latitude,
      eventLocation.longitude,
      reporterLocation.latitude,
      reporterLocation.longitude
    ) <= REPORTING_DISTANCE_METERS
  )
}

export async function loadCachedZones() {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY)
    const parsed = data ? JSON.parse(data) : []
    return Array.isArray(parsed) ? parsed : []
  } catch (error) {
    console.error('[Map] Error loading cached zones:', error)
    return []
  }
}

async function saveCachedZones(zones: Zone[]) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(zones))
}

async function mapFetch(path: string, options: RequestInit = {}) {
  if (DEV_BYPASS_MAP_AUTH) {
    return fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })
  }

  const { authFetch } = await import('../../utils/api')
  return authFetch(`${API_BASE_URL}${path}`, options)
}

export async function loadZones({
  latitude,
  longitude,
  radiusKm = MAP_EVENT_RADIUS_KM,
}: LoadZonesParams) {
  try {
    const search = new URLSearchParams({
      lat: String(latitude),
      lon: String(longitude),
      radius_km: String(radiusKm),
    })

    const response = await mapFetch(`/api/v1/map-events?${search.toString()}`)
    if (!response.ok) {
      throw new Error(`Failed to load map events: ${response.status}`)
    }

    const data = await response.json()
    const zones = Array.isArray(data) ? data.map(normalizeZone) : []
    await saveCachedZones(zones)
    return zones
  } catch (error) {
    console.warn('[Map] Falling back to cached zones:', error)
    return await loadCachedZones()
  }
}

export async function createZone(zone: Zone) {
  const response = await mapFetch('/api/v1/map-events', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: zone.type,
      description: zone.description,
      lat: zone.latitude,
      lon: zone.longitude,
    }),
  })

  if (!response.ok) {
    const message = await response.text().catch(() => '')
    throw new Error(message || `Failed to create map event: ${response.status}`)
  }

  const data = await response.json()
  return normalizeZone(data)
}

export async function voteZone(
  zoneId: string,
  value: 1 | -1,
  voterLocation: ReporterLocation
) {
  const response = await mapFetch(`/api/v1/map-events/${zoneId}/vote`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      value,
      lat: voterLocation.latitude,
      lon: voterLocation.longitude,
    }),
  })

  if (!response.ok) {
    const message = await response.text().catch(() => '')
    throw new Error(message || `Failed to vote map event: ${response.status}`)
  }

  const data = await response.json()
  return normalizeZone(data)
}

export async function updateZone(zone: Zone) {
  const response = await mapFetch(`/api/v1/map-events/${zone.id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ description: zone.description }),
  })

  if (!response.ok) {
    const message = await response.text().catch(() => '')
    throw new Error(message || `Failed to update map event: ${response.status}`)
  }

  const data = await response.json()
  return normalizeZone(data)
}

export async function deleteZone(zoneId: string) {
  const response = await mapFetch(`/api/v1/map-events/${zoneId}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    const message = await response.text().catch(() => '')
    throw new Error(message || `Failed to delete map event: ${response.status}`)
  }
}

export async function syncCachedZones(zones: Zone[]) {
  try {
    await saveCachedZones(zones)
  } catch (error) {
    console.error('[Map] Error saving cached zones:', error)
  }
}
