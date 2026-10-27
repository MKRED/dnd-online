import { getAbilityModifier } from './abilityModifier.js';
import type { ArmorTraining } from './character.js';
import type { WornGear } from './gear.js';
import { ARMOR_DEX_CAP } from './itemEquipment.js';

// Класс доспеха от надетого (docs/dnd/weapons-armor.md, «Числа от экипировки»; решено с
// пользователем 2026-10-26, вариант А): доспех — его базовый КД, Ловкость по виду
// доспеха и бонус магии; без доспеха — число формы («КД без доспеха»: 10 + Ловкость или
// своя защита без доспеха у Варвара и Монаха). Щит прибавляется к обоим, если с ним есть
// тренированность.

export interface GearLine {
  text: string;
  value: string;
}

export interface GearArmorClass {
  armorClass: number;
  // Надет доспех: число формы не используется, а «базовый КД» эффектов (Mage Armor)
  // не действует.
  wearsArmor: boolean;
  // Сколько из armorClass даёт щит: он прибавляется и к «базовому КД» эффекта (Mage Armor
  // со щитом — 13 + Ловкость + 2), поэтому итог листа держит его отдельно.
  shieldBonus: number;
  // Из чего сложен КД, по строке: «Кольчуга 16», «Щит +2». Пусто — ничего не надето,
  // КД — число формы.
  lines: GearLine[];
  // Чего не хватает: тренированности с доспехом или со щитом.
  warnings: string[];
  // Чья магия не действует без настройки (gearMagic.ts).
  unattuned: string[];
}

export interface GearArmorClassInput {
  unarmored: number;
  dexterity: number;
  training: readonly ArmorTraining[];
}

const signed = (n: number) => (n < 0 ? `−${-n}` : `+${n}`);

export const armorUntrainedWarning = (name: string) =>
  `Нет тренированности с доспехом «${name}»: помеха к испытаниям Силы и Ловкости, накладывать заклинания нельзя`;
export const shieldUntrainedWarning = (name: string) =>
  `Нет тренированности со щитами: «${name}» КД не даёт`;

export const unattunedBonusNote = (bonus: number, of: string) =>
  `Нет настройки: не действует бонус +${bonus} ${of}`;

export function gearArmorClass(
  gear: WornGear,
  { unarmored, dexterity, training }: GearArmorClassInput,
): GearArmorClass {
  const lines: GearLine[] = [];
  const warnings: string[] = [];
  const unattuned: string[] = [];
  let armorClass = unarmored;
  let shieldBonus = 0;
  const { armor, shield } = gear;

  if (armor) {
    const { kind, armorClass: base, magicBonus } = armor.details;
    const cap = ARMOR_DEX_CAP[kind];
    // Отрицательная Ловкость вычитается и у среднего доспеха: предел книги — только сверху.
    const dex = getAbilityModifier(dexterity);
    const dexAdded = cap === null ? dex : Math.min(dex, cap);
    armorClass = base + magicBonus + dexAdded;
    lines.push({ text: armor.name, value: String(base + magicBonus) });
    if (cap !== 0) {
      const capped = cap !== null && dex > cap;
      lines.push({
        text: capped ? `Ловкость (не больше +${cap})` : 'Ловкость',
        value: signed(dexAdded),
      });
    }
    if (!training.includes(kind))
      warnings.push(armorUntrainedWarning(armor.name));
    if (armor.inactive)
      unattuned.push(
        unattunedBonusNote(armor.inactive.bonus, `доспеха «${armor.name}»`),
      );
  } else if (shield) {
    lines.push({ text: 'Без доспеха', value: String(unarmored) });
  }

  if (shield) {
    if (training.includes('shield')) {
      const bonus = shield.details.armorClass + shield.details.magicBonus;
      armorClass += bonus;
      shieldBonus = bonus;
      lines.push({ text: shield.name, value: signed(bonus) });
      if (shield.inactive)
        unattuned.push(
          unattunedBonusNote(shield.inactive.bonus, `щита «${shield.name}»`),
        );
    } else {
      warnings.push(shieldUntrainedWarning(shield.name));
    }
  }

  return {
    armorClass,
    wearsArmor: armor !== null,
    shieldBonus,
    lines,
    warnings,
    unattuned,
  };
}

// Доспех с требованием Силы снижает Скорость на 10 фт., если Сила ниже требования
// (Equipment, Armor Table, «Strength»).
export const ARMOR_SPEED_PENALTY = 10;

export function armorSpeedPenalty(
  gear: WornGear,
  strength: number,
): { name: string; strength: number } | null {
  const need = gear.armor?.details.strength;
  if (!gear.armor || need === null || need === undefined) return null;
  return strength < need ? { name: gear.armor.name, strength: need } : null;
}
