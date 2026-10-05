import type { CSSVariablesResolver } from '@mantine/core';

// Фон светлой схемы — пергамент, чуть темнее «белого» полей ввода и рамок,
// чтобы они не сливались с ним.
export const cssVariablesResolver: CSSVariablesResolver = () => ({
  variables: {},
  light: {
    '--mantine-color-body': '#f3ead7',
    '--mantine-color-default-hover': '#f1e8d6',
  },
  dark: {},
});
