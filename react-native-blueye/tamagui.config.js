import { createTamagui } from '@tamagui/core';

const config = createTamagui({
  themes: {
    light: { background: '#fff', color: '#000' },
    dark: { background: '#000', color: '#fff' },
  },
  tokens: {},
  shorthands: {},
});

export default config;
