import type { MantineColor } from '@mantine/core';
import type { DamageType } from 'shared';

// Цвет метки типа урона в журнале: стихии — своими цветами, оружейные — нейтральными,
// чтобы смешанный урон читался с первого взгляда.
export const DAMAGE_TYPE_COLORS: Record<DamageType, MantineColor> = {
  acid: 'lime',
  bludgeoning: 'gray',
  cold: 'cyan',
  fire: 'orange',
  force: 'indigo',
  lightning: 'yellow',
  necrotic: 'grape',
  piercing: 'blue',
  poison: 'green',
  psychic: 'pink',
  radiant: 'yellow',
  slashing: 'gray',
  thunder: 'violet',
};
