import { getAbilityModifier } from '../abilityModifier.js';
import type { Character } from '../character.js';
import type { RollTermInput } from '../d20Roll.js';
import { wornGear } from '../gear.js';
import { gearAttacks, type GearAttack } from '../gearAttacks.js';
import type { WeaponDamage, WeaponRange } from '../itemEquipment.js';
import type { DamageType } from '../damageTypes.js';
import { numberTerm, type DamageTermInput } from './attackTerms.js';
import { weaponSetOf, type WeaponSet } from './weaponSets.js';

// Атаки героя на этапе 5 (docs/plan/combat.md, «Решения к этапу 5»): оружие в руках куклы
// и безоружный удар. Бонус атаки и урон — те же, что в блоке «Атаки» листа (gearAttacks.ts),
// здесь они разложены на слагаемые для окна броска.

export const ATTACK_KEYS = [
  'meleeMain',
  'meleeOff',
  'rangedMain',
  'rangedOff',
  'unarmed',
] as const;
export type AttackKey = (typeof ATTACK_KEYS)[number];

export interface AttackOption {
  key: AttackKey;
  name: string;
  kind: 'melee' | 'ranged';
  // Набор куклы; безоружный удар — вне наборов, он есть всегда.
  set: WeaponSet | null;
  // Досягаемость ближней атаки, фт.; у дальней — null.
  reach: number | null;
  // Дистанция дальней атаки; у ближней — null.
  range: WeaponRange | null;
  // Вторая рука с Лёгким — бонусным действием и только после атаки Лёгким оружием
  // основной руки в этом ходу (Light, docs/dnd/combat.md).
  spend: 'action' | 'bonus_action';
  // Лёгкое в основной руке: после атаки им открывается атака второй рукой.
  light: boolean;
  heavyDisadvantage: boolean;
  terms: RollTermInput[];
  damage: DamageTermInput[];
  // Почему этой атакой нельзя совсем; null — можно.
  unavailable: string | null;
}

export const UNARMED_NAME = 'Безоружный удар';
export const THROWN_LATER =
  'Метательное оружие бросать можно будет позже: пока — только вблизи';
export const OFF_HAND_NOT_LIGHT =
  'Второй рукой атакуют, только когда в обеих руках Лёгкое оружие';

const ABILITY_LABEL = { strength: 'Сила', dexterity: 'Ловкость' } as const;
// Досягаемость по книге — 5 фт., со свойством «Досягаемость» — 10 фт.
export const REACH_FT = 5;
const LONG_REACH_FT = 10;
const EXTRA_DAMAGE_LABEL = 'Доп. урон';

type Hero = Pick<
  Character,
  'abilityScores' | 'proficiencyBonus' | 'proficiencies' | 'inventory'
>;

// Кости или число урона одной строкой: урон числом без кости — у духовой трубки.
function damageTerm(
  label: string,
  damage: Pick<WeaponDamage, 'count' | 'die'>,
  type: DamageType,
): DamageTermInput {
  return damage.die === null
    ? { ...numberTerm(label, damage.count), type }
    : {
        kind: 'dice',
        label,
        count: damage.count,
        die: damage.die,
        sign: 1,
        type,
      };
}

function weaponOption(hero: Hero, attack: GearAttack): AttackOption {
  const { weapon, ability, proficient } = attack;
  const { details, name, slot } = weapon;
  const off = slot === 'meleeOff' || slot === 'rangedOff';
  const ranged = details.attackType === 'ranged';
  const mod = getAbilityModifier(hero.abilityScores[ability]);
  const terms: RollTermInput[] = [numberTerm(ABILITY_LABEL[ability], mod)];
  if (proficient) terms.push(numberTerm('Мастерство', hero.proficiencyBonus));
  if (details.magicBonus > 0) {
    terms.push(numberTerm('Магия', details.magicBonus));
  }

  // Универсальное двумя руками — своя кость того же типа (gearAttacks.ts).
  const type = details.damage.type;
  const damage = [damageTerm(name, attack.twoHanded ?? details.damage, type)];
  // Вторая рука с Лёгким — без модификатора, если он не отрицательный (gearAttacks.ts).
  const damageMod = attack.damageBonus - details.magicBonus;
  if (damageMod !== 0) {
    damage.push({ ...numberTerm(ABILITY_LABEL[ability], damageMod), type });
  }
  if (details.magicBonus > 0) {
    damage.push({ ...numberTerm('Магия', details.magicBonus), type });
  }
  // Без настройки ненужное уже выключено (gearMagic.ts).
  for (const part of details.extraDamage) {
    damage.push(damageTerm(EXTRA_DAMAGE_LABEL, part, part.type));
  }
  return {
    key: slot as AttackKey,
    name: off ? `${name}, вторая рука` : name,
    kind: ranged ? 'ranged' : 'melee',
    set: weaponSetOf(slot),
    reach: ranged
      ? null
      : details.properties.includes('reach')
        ? LONG_REACH_FT
        : REACH_FT,
    // Стрелы и болты не кончаются (домашнее правило Михаила, вопрос 3); без боеприпасов
    // дальнобойное — метательное (дротик), а его бросок ждёт своего этапа.
    range: ranged ? (details.ammunition ?? null) : null,
    spend: off ? 'bonus_action' : 'action',
    light: !off && details.properties.includes('light'),
    heavyDisadvantage: attack.heavyDisadvantage,
    terms,
    damage,
    unavailable:
      ranged && !details.ammunition
        ? THROWN_LATER
        : off && !attack.lightBonus
          ? OFF_HAND_NOT_LIGHT
          : null,
  };
}

// Безоружный удар 2024: бонус — Сила и мастерство, урон — 1 + модификатор Силы, дробящий.
export function unarmedOption(hero: Hero): AttackOption {
  const strength = getAbilityModifier(hero.abilityScores.strength);
  const damage: DamageTermInput[] = [
    { ...numberTerm('Удар', 1), type: 'bludgeoning' },
  ];
  if (strength !== 0) {
    damage.push({ ...numberTerm('Сила', strength), type: 'bludgeoning' });
  }
  return {
    key: 'unarmed',
    name: UNARMED_NAME,
    kind: 'melee',
    set: null,
    reach: REACH_FT,
    range: null,
    spend: 'action',
    light: false,
    heavyDisadvantage: false,
    terms: [
      numberTerm('Сила', strength),
      numberTerm('Мастерство', hero.proficiencyBonus),
    ],
    damage,
    unavailable: null,
  };
}

// Все атаки героя, обоих наборов: какой набор активен, решают блок хода и сервер.
export function heroAttacks(hero: Hero): AttackOption[] {
  const attacks = gearAttacks(wornGear(hero.inventory), {
    abilityScores: hero.abilityScores,
    proficiencyBonus: hero.proficiencyBonus,
    weapons: hero.proficiencies.weapons,
  });
  return [
    ...attacks.map((attack) => weaponOption(hero, attack)),
    unarmedOption(hero),
  ];
}
