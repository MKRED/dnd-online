import { Tabs } from '@mantine/core';
import { useState, type ReactNode } from 'react';
import type { SheetSection } from '../../../features/characters';

const SECTIONS: { value: SheetSection; label: string }[] = [
  { value: 'stats', label: 'Статы' },
  { value: 'abilities', label: 'Способности' },
  { value: 'effects', label: 'Эффекты' },
  { value: 'gear', label: 'Вещи' },
];

// Вкладки окна карточки (вариант А, выбран 2026-10-24, docs/plan/done/scene-page.md, этап 4).
// Открыта одна вкладка, остальные не рисуются: окно лёгкое, даже когда их три.
function CardTabs({
  render,
}: {
  render: (section: SheetSection) => ReactNode;
}) {
  const [section, setSection] = useState<SheetSection>('stats');
  return (
    <Tabs
      value={section}
      onChange={(value) => value && setSection(value as SheetSection)}
      keepMounted={false}
    >
      <Tabs.List grow>
        {SECTIONS.map(({ value, label }) => (
          <Tabs.Tab key={value} value={value}>
            {label}
          </Tabs.Tab>
        ))}
      </Tabs.List>
      {SECTIONS.map(({ value }) => (
        <Tabs.Panel key={value} value={value} pt="sm">
          {render(value)}
        </Tabs.Panel>
      ))}
    </Tabs>
  );
}

export default CardTabs;
