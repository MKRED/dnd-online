import { Menu } from '@mantine/core';
import {
  IconArrowLeft,
  IconArrowRight,
  IconDice5,
  IconEdit,
  IconFocus2,
  IconPlayerPlay,
  IconX,
} from '@tabler/icons-react';
import type { ReactElement } from 'react';
import type { CombatEntry } from './combatEntries';
import type { StripActions } from './stripActions';

interface CombatantMenuProps {
  entry: CombatEntry;
  master: boolean;
  // Место в очереди бросивших; null — ещё не бросал.
  place: number | null;
  count: number;
  current: boolean;
  actions: StripActions;
  // Портрет в полосе или строка списка очереди.
  children: ReactElement;
  // В списке очереди меню остаётся внутри всплывающего окна: из портала щелчок по пункту
  // закрыл бы окно раньше, чем пункт сработает.
  inline?: boolean;
}

// Щелчок по участнику: игроку — показать его на сцене; мастеру — меню действий с ним
// (макет «Очерёдность»: передать ход, поправить число, переставить, убрать).
function CombatantMenu({
  entry,
  master,
  place,
  count,
  current,
  actions,
  children,
  inline = false,
}: CombatantMenuProps) {
  if (!master) return children;
  const rolled = place !== null;
  return (
    <Menu position="bottom" withArrow shadow="md" withinPortal={!inline}>
      <Menu.Target>{children}</Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>{entry.name}</Menu.Label>
        <Menu.Item
          leftSection={<IconFocus2 size={15} />}
          disabled={!entry.at}
          onClick={() => actions.focus(entry)}
        >
          Показать на сцене
        </Menu.Item>
        {!rolled && (
          <Menu.Item
            leftSection={<IconDice5 size={15} />}
            onClick={() => actions.roll(entry)}
          >
            Бросить инициативу
          </Menu.Item>
        )}
        {rolled && !current && (
          <Menu.Item
            leftSection={<IconPlayerPlay size={15} />}
            onClick={() => actions.pass(entry.id)}
          >
            Передать ход
          </Menu.Item>
        )}
        <Menu.Item
          leftSection={<IconEdit size={15} />}
          onClick={() => actions.edit(entry, 'initiative')}
        >
          Поправить инициативу
        </Menu.Item>
        {rolled && place > 0 && (
          <Menu.Item
            leftSection={<IconArrowLeft size={15} />}
            onClick={() => actions.move(entry.id, -1)}
          >
            Раньше в очереди
          </Menu.Item>
        )}
        {rolled && place < count - 1 && (
          <Menu.Item
            leftSection={<IconArrowRight size={15} />}
            onClick={() => actions.move(entry.id, 1)}
          >
            Позже в очереди
          </Menu.Item>
        )}
        <Menu.Divider />
        <Menu.Item
          color="red"
          leftSection={<IconX size={15} />}
          onClick={() => actions.edit(entry, 'remove')}
        >
          Убрать из боя
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}

export default CombatantMenu;
