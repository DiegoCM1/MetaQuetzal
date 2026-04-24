import { colors } from '../../utils/theme'
import type { ZoneType } from './types'

export const DEFAULT_REGION = {
  latitude: 23.6345,
  longitude: -102.5528,
  latitudeDelta: 12,
  longitudeDelta: 12,
}

export const ZONE_TYPES: Record<ZoneType, { label: string; icon: string; color: string }> = {
  natural: { label: 'Natural',  icon: 'weather-rainy',        color: colors.brandTeal   },
  vial:    { label: 'Vial',     icon: 'traffic-cone',         color: colors.brandPurple },
  peligro: { label: 'Peligro',  icon: 'alert-circle-outline', color: colors.brandOrange },
  ayuda:   { label: 'Ayuda',    icon: 'shield-check-outline', color: colors.brandGreen  },
}
