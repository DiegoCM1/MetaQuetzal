import { createTamagui } from '@tamagui/core';
import { themes, tokens } from '@tamagui/themes';

const customTokens = {
  ...tokens,
  color: {
    ...tokens.color,
    customColor1: '#ff5733', // Color personalizado
  },
};

const config = createTamagui({
  themes, // Usa los temas predeterminados
  tokens: customTokens, // Combina los tokens predeterminados con los personalizados
  shorthands: {
    padding: 'padding',
    margin: 'margin',
  },
});

export default config;
