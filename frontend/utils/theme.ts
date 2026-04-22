export const gradients = {
// TODO: replace with exact values from designer
  primary: ['#030810', '#060f1e', '#08162a', '#0a1c32', '#0c2438'] as const,
  morado:  ['#070308', '#0f0618', '#160928', '#1c0b38', '#240d47'] as const,
  naranja: ['#090601', '#180b02', '#271003', '#361604', '#451b05'] as const,
  verde:   ['#010806', '#02160b', '#032412', '#043218', '#05401e'] as const,
} satisfies Record<string, readonly string[]>
