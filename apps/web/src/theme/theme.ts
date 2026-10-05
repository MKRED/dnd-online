import { createTheme, virtualColor } from '@mantine/core';
import { brass, charcoal, leather, parchment } from './palettes';

export const theme = createTheme({
  // primary — виртуальный цвет: в светлой схеме кожа, в тёмной латунь.
  primaryColor: 'primary',
  primaryShade: { light: 7, dark: 5 },
  // На светлой латуни белый текст не читается — Mantine сам возьмёт тёмный.
  autoContrast: true,
  defaultRadius: 'md',
  // Белый и чёрный тоже тёплые: из белого Mantine красит рамки-fieldset и текст
  // на кнопках, из чёрного — текст светлой схемы.
  white: '#fbf7ee',
  black: '#33261b',
  colors: {
    primary: virtualColor({
      name: 'primary',
      light: 'leather',
      dark: 'brass',
    }),
    brass,
    leather,
    gray: parchment,
    dark: charcoal,
  },
  // Golos Text и Unbounded подключены через Google Fonts (index.html) —
  // поддерживают кириллицу "из коробки", в отличие от большинства фэнтези-шрифтов.
  fontFamily: '"Golos Text", system-ui, "Segoe UI", Roboto, sans-serif',
  headings: {
    fontFamily: '"Unbounded", "Segoe UI", sans-serif',
    fontWeight: '700',
  },
});
