import type { MantineColor } from '@mantine/core';
import {
  IconHeart,
  IconMap,
  IconSparkles,
  IconSword,
  IconUsers,
  IconWalk,
  IconWand,
  type Icon,
} from '@tabler/icons-react';
import { gameEventGroup, type GameEvent, type GameEventGroup } from 'shared';

interface EventLook {
  icon: Icon;
  color: MantineColor;
}

const GROUP_LOOKS: Record<GameEventGroup, EventLook> = {
  combat: { icon: IconSword, color: 'red' },
  movement: { icon: IconWalk, color: 'blue' },
  effects: { icon: IconSparkles, color: 'grape' },
  spells: { icon: IconWand, color: 'violet' },
  scene: { icon: IconMap, color: 'gray' },
  game: { icon: IconUsers, color: 'gray' },
};

const HEALING: EventLook = { icon: IconHeart, color: 'teal' };

// Значок записи — по группе (shared/game-event-groups.ts); лечение и временные хиты в
// бою — сердцем, чтобы урон и лечение различались не читая.
export function eventLook(event: GameEvent): EventLook {
  if (event.kind === 'character.changed' || event.kind === 'creature.changed') {
    const { kind } = event.intent.change;
    if (kind === 'heal' || kind === 'temp') return HEALING;
  }
  return GROUP_LOOKS[gameEventGroup(event)];
}
