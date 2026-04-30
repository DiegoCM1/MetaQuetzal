import { colors } from '../../utils/theme'
import type { ZoneType } from './types'

export const DEFAULT_REGION = {
  latitude: 23.6345,
  longitude: -102.5528,
  latitudeDelta: 12,
  longitudeDelta: 12,
}

export const ZONE_TYPES: Record<ZoneType, { label: string; color: string; image: any }> = {
  natural: { label: 'Natural', color: colors.brandTeal,   image: require('../../assets/markers/EVENTO_NATURAL.png') },
  vial:    { label: 'Vial',    color: colors.brandPurple, image: require('../../assets/markers/OBSTRUCCION.png')    },
  peligro: { label: 'Peligro', color: colors.brandOrange, image: require('../../assets/markers/PELIGRO.png')        },
  ayuda:   { label: 'Ayuda',   color: colors.brandGreen,  image: require('../../assets/markers/AYUDA.png')          },
}

