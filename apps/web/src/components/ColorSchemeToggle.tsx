import {
  ActionIcon,
  useComputedColorScheme,
  useMantineColorScheme,
} from '@mantine/core';

// Переключатель светлой и тёмной схемы. Выбор Mantine сам хранит в localStorage.
function ColorSchemeToggle() {
  const { setColorScheme } = useMantineColorScheme();
  const scheme = useComputedColorScheme('light');
  const next = scheme === 'dark' ? 'light' : 'dark';

  return (
    <ActionIcon
      variant="subtle"
      size="lg"
      onClick={() => setColorScheme(next)}
      aria-label={next === 'dark' ? 'Тёмная тема' : 'Светлая тема'}
    >
      {next === 'dark' ? '☾' : '☀'}
    </ActionIcon>
  );
}

export default ColorSchemeToggle;
