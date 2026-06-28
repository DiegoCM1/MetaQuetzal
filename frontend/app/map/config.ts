import { colors } from '../../utils/theme'
import type { ZoneType } from './types'

export const DEFAULT_REGION = {
  latitude: 23.6345,
  longitude: -102.5528,
  latitudeDelta: 12,
  longitudeDelta: 12,
}

// How far from their own location a user may CREATE an event.
// NOTE: frontend-only guard — the backend does not yet enforce report distance,
// so this is UX, not security. Keep in sync with any future server-side check.
export const REPORTING_DISTANCE_METERS = 10_000 // 10 km

// Radius of events fetched around the user for display on the map (you can SEE far,
// but only report/vote nearby). Not the same as the reporting/voting radius.
export const MAP_EVENT_RADIUS_KM = 100

export const ZONE_TYPES: Record<ZoneType, { label: string; color: string; image: any }> = {
  natural: { label: 'Natural', color: colors.brandTeal,   image: require('../../assets/markers/EVENTO_NATURAL.png') },
  vial:    { label: 'Vial',    color: colors.brandPurple, image: require('../../assets/markers/OBSTRUCCION.png')    },
  peligro: { label: 'Peligro', color: colors.brandOrange, image: require('../../assets/markers/PELIGRO.png')        },
  ayuda:   { label: 'Ayuda',   color: colors.brandGreen,  image: require('../../assets/markers/AYUDA.png')          },
}

