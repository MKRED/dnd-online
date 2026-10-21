import { ABILITY_GENITIVE } from '../abilityUsageLabels.js';
import type { AbilityScore } from '../character.js';
import {
  DAMAGE_TYPE_LABELS,
  type DamageDie,
  type DamageType,
} from '../damageTypes.js';

// Опасность блока по шаблону опасностей DMG 2024: урон тому, кто впервые за ход входит
// на блок или начинает на нём ход. Условие одно для всех, поэтому не хранится. Карта не
// знает уровня группы, а опасности книги растут по уровням: кости заданы одни, мастер
// правит урон сам (docs/dnd/hazards.md). Наносить урон будет бой (map.md, этапы 7–9).
export interface MaterialHazard {
  damage: { count: number; die: DamageDie; type: DamageType };
  // Спасбросок: при успехе — половина урона; null — урон без спасброска.
  save: { ability: AbilityScore; dc: number } | null;
  // Поджигает (Burning из глоссария 2024: 1к4 огнём в начале каждого хода, пока не
  // потушат) — так у «Пожара» DMG 2024.
  burning: boolean;
}

export const HAZARDS = {
  // DMG 2014, «Импровизированный урон»: «брести по лаве» — 10к10.
  lava: {
    damage: { count: 10, die: 10, type: 'fire' },
    save: null,
    burning: false,
  },
  // Там же: «упасть в чан с кислотой» — 4к10.
  acid: {
    damage: { count: 4, die: 10, type: 'acid' },
    save: null,
    burning: false,
  },
  // «Ядовитый газ» DMG 2024 (уровни 1–4), перенесённый на топь.
  swamp: {
    damage: { count: 1, die: 10, type: 'poison' },
    save: { ability: 'constitution', dc: 12 },
    burning: false,
  },
  // «Пожар» DMG 2024 (смертельно на уровнях 5–10): 4к10 огнём и Горение, без спасброска.
  fire: {
    damage: { count: 4, die: 10, type: 'fire' },
    save: null,
    burning: true,
  },
} as const satisfies Record<string, MaterialHazard>;

// «10к10 (Огонь)», «4к10 (Огонь), поджигает»,
// «1к10 (Яд), спасбросок Телосложения Сл 12, при успехе половина».
export function hazardLabel(hazard: MaterialHazard): string {
  const { count, die, type } = hazard.damage;
  const parts = [`${count}к${die} (${DAMAGE_TYPE_LABELS[type]})`];
  if (hazard.save) {
    const { ability, dc } = hazard.save;
    parts.push(
      `спасбросок ${ABILITY_GENITIVE[ability]} Сл ${dc}, при успехе половина`,
    );
  }
  if (hazard.burning) parts.push('поджигает');
  return parts.join(', ');
}

export const HAZARD_TRIGGER =
  'кто впервые за ход входит на блок или начинает на нём ход';
