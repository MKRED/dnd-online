import {
  SPELL_SLOT_LEVEL_MAX,
  type AbilityActivation,
  type AbilityCosts,
  type UsesCount,
  type UsesRecovery,
} from './abilityUsage.js';
import type { AbilityScore } from './character.js';
import { pluralRu } from './pluralRu.js';

// Тексты активации и затрат для карточки и списка. Термины — как в переводе next.dnd.su
// (книга 2024), кроме «бонуса мастерства»: так он назван на листе персонажа
// (docs/dnd/ability-usage.md).

export const ACTIVATION_LABELS: Record<AbilityActivation['kind'], string> = {
  action: 'Действие',
  bonus_action: 'Бонусное действие',
  reaction: 'Реакция',
  free: 'Без действия',
  attack: 'Вместо одной атаки',
  time: 'Время',
};

// «модификатор Силы».
const ABILITY_GENITIVE: Record<AbilityScore, string> = {
  strength: 'Силы',
  dexterity: 'Ловкости',
  constitution: 'Телосложения',
  intelligence: 'Интеллекта',
  wisdom: 'Мудрости',
  charisma: 'Харизмы',
};

const TIME_FORMS = {
  minute: ['минута', 'минуты', 'минут'],
  hour: ['час', 'часа', 'часов'],
} as const;

export function formatActivation(activation: AbilityActivation): string {
  switch (activation.kind) {
    case 'reaction':
    case 'free': {
      const label = ACTIVATION_LABELS[activation.kind];
      const trigger = activation.trigger.trim();
      return trigger ? `${label}, ${trigger}` : label;
    }
    case 'time':
      return `${activation.amount} ${pluralRu(activation.amount, TIME_FORMS[activation.unit])}`;
    default:
      return ACTIVATION_LABELS[activation.kind];
  }
}

function formatUsesCount(count: UsesCount): string {
  switch (count.kind) {
    case 'fixed':
      return `${count.amount} ${pluralRu(count.amount, ['заряд', 'заряда', 'зарядов'])}`;
    case 'proficiency':
      return 'Заряды: бонус мастерства';
    case 'ability':
      return `Заряды: модификатор ${ABILITY_GENITIVE[count.ability]} (минимум 1)`;
  }
}

const RECOVERY_LABELS: Record<UsesRecovery, string> = {
  long: 'все после долгого отдыха',
  short: 'все после короткого или долгого отдыха',
  short_one: 'один после короткого отдыха, все после долгого',
};

// Затраты по строке на вид; пустой список — способность ничего не тратит.
export function formatCosts(costs: AbilityCosts): string[] {
  const lines: string[] = [];
  if (costs.uses) {
    lines.push(
      `${formatUsesCount(costs.uses.count)} — ${RECOVERY_LABELS[costs.uses.recovery]}`,
    );
  }
  if (costs.spellSlot) {
    const { minLevel } = costs.spellSlot;
    lines.push(
      minLevel === 1
        ? 'Ячейка заклинаний'
        : minLevel === SPELL_SLOT_LEVEL_MAX
          ? `Ячейка заклинаний ${minLevel} круга`
          : `Ячейка заклинаний ${minLevel} круга или выше`,
    );
  }
  if (costs.movement) {
    lines.push(
      costs.movement === 'half' ? 'Половина скорости' : 'Вся скорость',
    );
  }
  if (costs.hitDie) lines.push('Кость хитов');
  return lines;
}
