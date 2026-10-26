import { getAbilityModifier } from './abilityModifier.js';
import type { AbilityScore, CharacterProficiencies } from './character.js';
import { OFF_HAND_OF } from './equipment.js';
import type { WornGear, WornWeapon } from './gear.js';
import type { GearLine } from './gearArmorClass.js';
import type {
  WeaponDamage,
  WeaponDice,
  WeaponItemDetails,
} from './itemEquipment.js';

// Атаки оружием в руках (docs/dnd/weapons-armor.md, «Числа от экипировки»; решено с
// пользователем 2026-10-26, вариант А): строка на каждое надетое оружие, своих строк нет.
// Бросок атаки — модификатор характеристики, бонус мастерства при владении и бонус магии;
// урон — кости оружия, тот же модификатор и бонус магии (docs/dnd/attacks-and-saves.md).

export interface GearAttack {
  weapon: WornWeapon;
  ability: Extract<AbilityScore, 'strength' | 'dexterity'>;
  attackBonus: number;
  // Из чего сложен бонус атаки: «Сила +3», «Мастерство +2», «Магия +1».
  attackParts: GearLine[];
  proficient: boolean;
  damage: WeaponDamage;
  damageBonus: number;
  // Универсальное, когда вторая рука набора свободна: урон двумя руками.
  twoHanded: WeaponDice | null;
  // Лёгкое во второй руке при Лёгком в основной: дополнительная атака бонусным
  // действием; модификатор к её урону не прибавляется, если он не отрицательный.
  lightBonus: boolean;
  // Тяжёлое при Силе (рукопашное) или Ловкости (дальнобойное) ниже 13 — помеха.
  heavyDisadvantage: boolean;
}

export interface GearAttackInput {
  abilityScores: Record<AbilityScore, number>;
  proficiencyBonus: number;
  weapons: CharacterProficiencies['weapons'];
}

export const HEAVY_MIN_SCORE = 13;

const ABILITY_LABEL = { strength: 'Сила', dexterity: 'Ловкость' } as const;
const signed = (n: number) => (n < 0 ? `−${-n}` : `+${n}`);

// Рукопашное — Сила, дальнобойное — Ловкость; Фехтовальное — большее из двух, по книге
// игрок выбирает сам, и выгоднее большее.
function abilityOf(
  details: WeaponItemDetails,
  scores: Record<AbilityScore, number>,
): GearAttack['ability'] {
  const usual = details.attackType === 'melee' ? 'strength' : 'dexterity';
  if (!details.properties.includes('finesse')) return usual;
  return getAbilityModifier(scores.dexterity) >
    getAbilityModifier(scores.strength)
    ? 'dexterity'
    : 'strength';
}

export function gearAttacks(
  gear: WornGear,
  { abilityScores, proficiencyBonus, weapons }: GearAttackInput,
): GearAttack[] {
  const at = (slot: string) => gear.weapons.find((w) => w.slot === slot);
  return gear.weapons.map((weapon) => {
    const { details } = weapon;
    const ability = abilityOf(details, abilityScores);
    const mod = getAbilityModifier(abilityScores[ability]);
    const proficient =
      weapons.includes(details.weaponCategory) ||
      (details.base !== null && weapons.includes(details.base));
    const attackParts: GearLine[] = [
      { text: ABILITY_LABEL[ability], value: signed(mod) },
    ];
    if (proficient) {
      attackParts.push({ text: 'Мастерство', value: signed(proficiencyBonus) });
    }
    if (details.magicBonus > 0) {
      attackParts.push({ text: 'Магия', value: signed(details.magicBonus) });
    }

    // Вторая рука набора: где она — у основной; основная — у второй.
    const isOff = weapon.slot === 'meleeOff' || weapon.slot === 'rangedOff';
    const main = isOff
      ? at(weapon.slot === 'meleeOff' ? 'meleeMain' : 'rangedMain')
      : undefined;
    const lightBonus =
      isOff &&
      details.properties.includes('light') &&
      Boolean(main?.details.properties.includes('light'));
    const damageMod = lightBonus ? Math.min(mod, 0) : mod;
    // Щит тоже занимает вторую руку ближнего боя.
    const offSlot = OFF_HAND_OF[weapon.slot];
    const handFree =
      offSlot !== undefined &&
      !at(offSlot) &&
      !(offSlot === 'meleeOff' && gear.shield);

    const heavyScore =
      details.attackType === 'melee'
        ? abilityScores.strength
        : abilityScores.dexterity;
    return {
      weapon,
      ability,
      attackBonus:
        mod + (proficient ? proficiencyBonus : 0) + details.magicBonus,
      attackParts,
      proficient,
      damage: details.damage,
      damageBonus: damageMod + details.magicBonus,
      twoHanded: details.versatile && handFree ? details.versatile : null,
      lightBonus,
      heavyDisadvantage:
        details.properties.includes('heavy') && heavyScore < HEAVY_MIN_SCORE,
    };
  });
}
