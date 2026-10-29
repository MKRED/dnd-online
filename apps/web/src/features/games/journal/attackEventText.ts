import {
  ATTACK_OUTCOME_LABELS,
  DAMAGE_TYPE_LABELS,
  DEFENSE_LEVEL_LABELS,
  WEAPON_SET_LABELS,
  type DamageByType,
  type GameEvent,
} from 'shared';
import { rollText, termText } from './combatEventText';
import type { JournalView } from './journalView';

type Attack = Extract<GameEvent, { kind: 'combat.attack' }>;
type Damage = Extract<GameEvent, { kind: 'combat.damage' }>;
type WeaponSetEvent = Extract<GameEvent, { kind: 'combat.weapon_set' }>;

const COVER_SHORT = { half: 'укрытие ½', threeQuarters: 'укрытие ¾' } as const;

// Строки журнала об атаке героя (docs/plan/combat.md, этап 5): бросок со слагаемыми и
// итог; КД цели — только мастеру (игроки его не видят, как и хиты врага).
export function attackEventText(event: Attack, view: JournalView): string {
  const { combatant, attack, target, roll, cover, armorClass, outcome, spent } =
    event.result;
  const against = view === 'master' ? ` против КД ${armorClass}` : '';
  const notes = [
    ...(cover === 'none' ? [] : [COVER_SHORT[cover]]),
    ...(spent === 'bonus_action' ? ['бонусное действие'] : []),
  ];
  const extra = notes.length ? `, ${notes.join(', ')}` : '';
  return `Атака: ${combatant.name} — ${attack.name} → ${target.name}: ${roll.total}${against} — ${ATTACK_OUTCOME_LABELS[outcome].toLowerCase()}${extra} (${rollText(roll)})`;
}

function byTypeText(part: DamageByType): string {
  const type = DAMAGE_TYPE_LABELS[part.type].toLowerCase();
  if (part.defenses.length === 0) return `${part.dealt} ${type}`;
  const defenses = part.defenses
    .map((d) => DEFENSE_LEVEL_LABELS[d].toLowerCase())
    .join(', ');
  return `${part.dealt} ${type} (из ${part.rolled}, ${defenses})`;
}

// Урон атаки по типам с защитами цели; хиты — следующей записью правки хитов.
export function damageEventText(event: Damage): string {
  const { combatant, attack, target, damage, applied } = event.result;
  const parts = damage.byType.map(byTypeText).join(' + ');
  const crit = damage.critical ? ', крит' : '';
  const gone = applied || damage.total === 0 ? '' : ', цели уже нет на сцене';
  const terms = damage.terms.map(termText).join('; ');
  return `Урон атаки: ${combatant.name} — ${attack.name} → ${target.name}: ${parts}${crit}${gone} (${terms})`;
}

export function weaponSetEventText(event: WeaponSetEvent): string {
  return `Набор оружия: ${event.result.combatant.name} — ${WEAPON_SET_LABELS[event.result.set]}`;
}
