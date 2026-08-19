import { createTheme, type MantineColorsTuple } from '@mantine/core';

// Фиолетовый акцент — основной "магический" цвет темы.
const arcane: MantineColorsTuple = [
  '#f4f0ff',
  '#e4d9ff',
  '#c9b3fd',
  '#ab8afa',
  '#9166f5',
  '#7d4bef',
  '#6f3add',
  '#5f2ec4',
  '#4f26a3',
  '#3c1c7d',
];

// Золотой оттенок для точечных акцентов (пока не используется как primaryColor).
const ember: MantineColorsTuple = [
  '#fff9e6',
  '#ffefc0',
  '#ffe093',
  '#fdd066',
  '#f7bf42',
  '#efaf28',
  '#d99a1c',
  '#b37e17',
  '#8c6212',
  '#63450c',
];

export const theme = createTheme({
  primaryColor: 'arcane',
  primaryShade: { light: 6, dark: 4 },
  defaultRadius: 'md',
  colors: {
    arcane,
    ember,
    // Тёмная палитра с фиолетовым подтоном вместо нейтрально-серой дефолтной —
    // это и есть "тёмная фэнтезийная тема" на уровне фона/поверхностей.
    dark: [
      '#c9c3d4',
      '#a89fbd',
      '#8b80a3',
      '#6f6389',
      '#564c6e',
      '#413756',
      '#332b47',
      '#241d34',
      '#1a1526',
      '#100c19',
    ],
  },
  // Golos Text и Unbounded подключены через Google Fonts (index.html) —
  // поддерживают кириллицу "из коробки", в отличие от большинства фэнтези-шрифтов.
  fontFamily: '"Golos Text", system-ui, "Segoe UI", Roboto, sans-serif',
  headings: {
    fontFamily: '"Unbounded", "Segoe UI", sans-serif',
    fontWeight: '700',
  },
});
