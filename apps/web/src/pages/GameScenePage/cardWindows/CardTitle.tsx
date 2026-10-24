import { Anchor, Text, Tooltip } from '@mantine/core';

// Имя в шапке окна карточки (docs/plan/scene-page.md, вариант В артборда «К2»): ссылка на
// полную страницу в новой вкладке, чтобы сцена осталась открытой. Без href — просто имя.
function CardTitle({ title, href }: { title: string; href: string | null }) {
  if (!href) {
    return (
      <Text fw={600} truncate>
        {title}
      </Text>
    );
  }
  return (
    <Tooltip label="Открыть страницу в новой вкладке" withArrow openDelay={400}>
      <Anchor
        href={href}
        target="_blank"
        rel="noopener"
        fw={600}
        c="inherit"
        underline="hover"
        truncate
        display="block"
      >
        {title}
      </Anchor>
    </Tooltip>
  );
}

export default CardTitle;
