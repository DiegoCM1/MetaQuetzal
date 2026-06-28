export const colors = {
  // Brand
  brandBlue:   '#3167ff',
  brandIndigo: '#3900ff',
  brandCyan:   '#2ecaff',
  brandBlack:  '#000000',

  // Brand alerts
  brandTeal:   '#4ed5de',
  brandPurple: '#9200ff',
  brandOrange: '#ff8500',
  brandYellow: '#ffce00',
  brandGreen:  '#00e774',
  brandRed:    '#e24337',

  // Surface — content cards (DarkCard) on the primary gradient.
  brandSurface: '#0a1c32',
} as const

export const gradients = {
  // Main Gradients
  primary: ['#030810', '#060f1e', '#08162a', '#0a1c32', '#0c2438'] as const,
  morado:  ['#070308', '#0f0618', '#160928', '#1c0b38', '#240d47'] as const,
  naranja: ['#090601', '#180b02', '#271003', '#361604', '#451b05'] as const,
  verde:   ['#010806', '#02160b', '#032412', '#043218', '#05401e'] as const,
  header: ['#060f1e', '#3167ff'] as const
} satisfies Record<string, readonly string[]>

export const fonts = {
  square721:       'Square721',
  poppins:         'Poppins-Light',
  poppinsSemiBold: 'Poppins-SemiBold',
} as const
