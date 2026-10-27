import {
  DAMAGE_TYPE_LABELS,
  HEAVY_MIN_SCORE,
  type GearAttack,
  type InactiveMagic,
  type WeaponDamage,
  type WeaponDice,
} from 'shared';
import { WEAPON_LABELS } from '../../characterWeapons';
import {
  WEAPON_FLAG_LABELS,
  WEAPON_MASTERY_LABELS,
  formatDice,
  formatRange,
} from '../../../items/equipmentLabels';

// Строка блока «Атаки» листа (docs/plan/equipment.md, этап 3, вариант А): всё уже
// строками, компонент только раскладывает.
export interface AttackView {
  key: string;
  name: string;
  // «Ближний бой · 5 фт.», «Дальний бой · дист. 30/120».
  place: string;
  chips: string[];
  // Мастерство, если персонаж открыл его для этого оружия.
  mastery: string | null;
  bonus: string;
  // Из чего сложен бонус: «Сила +3, Мастерство +2».
  bonusParts: string;
  damage: string;
  // Пояснения под уроном и под бонусом: двумя руками, вторая рука, помеха.
  damageNotes: string[];
  notes: string[];
}

const signed = (n: number) => (n < 0 ? `−${-n}` : `+${n}`);

// «1к8 + 3 рубящий», «1к6 − 1 колющий»; урон числом — «4 колющий».
export function formatAttackDamage(damage: WeaponDamage, bonus = 0): string {
  const type = DAMAGE_TYPE_LABELS[damage.type].toLowerCase();
  if (damage.die === null)
    return `${Math.max(0, damage.count + bonus)} ${type}`;
  return `${formatDice({ count: damage.count, die: damage.die })}${withBonus(bonus)} ${type}`;
}

const withBonus = (bonus: number) =>
  bonus > 0 ? ` + ${bonus}` : bonus < 0 ? ` − ${-bonus}` : '';

const formatTwoHanded = (dice: WeaponDice, bonus: number) =>
  `${formatDice(dice)}${withBonus(bonus)} двумя руками`;

function place({ weapon }: GearAttack): string {
  const { details } = weapon;
  if (details.attackType === 'ranged') {
    const range = details.ammunition ?? details.thrown;
    return range ? `Дальний бой · ${formatRange(range)}` : 'Дальний бой';
  }
  const reach = details.properties.includes('reach') ? 10 : 5;
  const thrown = details.thrown
    ? ` · метание ${formatRange(details.thrown)}`
    : '';
  return `Ближний бой · ${reach} фт.${thrown}`;
}

// Мастерство в листе — текст (Character.weaponMasteries): русские названия видов оружия
// из подсказок или своё. Совпадение — по названию вида или самого предмета.
export function masteryUnlocked(
  attack: GearAttack,
  masteries: readonly string[],
): boolean {
  const { name, details } = attack.weapon;
  const known = new Set(masteries.map((m) => m.trim().toLowerCase()));
  const base = details.base ? WEAPON_LABELS[details.base].toLowerCase() : null;
  return known.has(name.toLowerCase()) || (base !== null && known.has(base));
}

const ABILITY_SHORT = { strength: 'Сила', dexterity: 'Ловкость' } as const;

// Что не действует без настройки (вариант А макета 2026-10-27): числа строки уже без
// этого, а здесь — что вернёт настройка.
export function unattunedNote(inactive: InactiveMagic): string {
  const parts = [
    ...(inactive.bonus > 0 ? [`бонус +${inactive.bonus}`] : []),
    ...inactive.extraDamage.map((part) => `урон ${formatAttackDamage(part)}`),
  ];
  const verb = parts.length > 1 ? 'не действуют' : 'не действует';
  return `Нет настройки: ${verb} ${parts.join(' и ')}`;
}

export function attackView(
  attack: GearAttack,
  masteries: readonly string[],
): AttackView {
  const { weapon } = attack;
  const { details } = weapon;
  const isOff = weapon.slot === 'meleeOff' || weapon.slot === 'rangedOff';
  const notes: string[] = [];
  if (weapon.inactive) notes.push(unattunedNote(weapon.inactive));
  if (!attack.proficient) notes.push('Без владения: без бонуса мастерства');
  if (attack.heavyDisadvantage) {
    notes.push(
      `Помеха: Тяжёлое, ${ABILITY_SHORT[details.attackType === 'melee' ? 'strength' : 'dexterity']} ниже ${HEAVY_MIN_SCORE}`,
    );
  }
  const damageNotes: string[] = [];
  if (attack.twoHanded) {
    damageNotes.push(formatTwoHanded(attack.twoHanded, attack.damageBonus));
  }
  if (attack.lightBonus) {
    damageNotes.push(
      'Бонусным действием после атаки Лёгким оружием, без модификатора',
    );
  }
  return {
    key: `${weapon.slot}`,
    name: isOff ? `${weapon.name}, вторая рука` : weapon.name,
    place: place(attack),
    chips: [
      ...details.properties.map((flag) => WEAPON_FLAG_LABELS[flag]),
      ...(details.versatile ? ['Универсальное'] : []),
    ],
    mastery:
      details.mastery && masteryUnlocked(attack, masteries)
        ? `Мастерство: ${WEAPON_MASTERY_LABELS[details.mastery]}`
        : null,
    bonus: signed(attack.attackBonus),
    bonusParts: attack.attackParts
      .map((p) => `${p.text} ${p.value}`)
      .join(', '),
    damage: [
      formatAttackDamage(details.damage, attack.damageBonus),
      ...details.extraDamage.map((part) => formatAttackDamage(part)),
    ].join(' + '),
    damageNotes,
    notes,
  };
}
