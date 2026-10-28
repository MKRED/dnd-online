import {
  activeWeaponSet,
  gearAttacks,
  getAbilityModifier,
  heroAttacks,
  wornGear,
  type AttackOption,
  type Character,
  type Monster,
  type GameCreatureSpells,
} from 'shared';
import { attackView } from '../../../../features/characters/CharacterSheet/SheetAttacks/attackView';
import type { TurnKit, TurnKitAttack } from './turnTiles';

// Что есть у участника для блока «Ваш ход»: у героя и НПС — оружие в руках куклы,
// безоружный удар, способности листа и ячейки; у монстра — способности стат-блока.

const signed = (n: number) => (n < 0 ? `−${-n}` : `+${n}`);

// Безоружный удар 2024 (docs/dnd/combat.md, «Unarmed Strike»): бонус — Сила и мастерство,
// урон — 1 + модификатор Силы, дробящий.
export function unarmedTip(character: Character): string {
  const strength = getAbilityModifier(character.abilityScores.strength);
  const bonus = strength + character.proficiencyBonus;
  const damage = Math.max(0, 1 + strength);
  return `Безоружный удар · действие «Атака» · ${signed(bonus)}, 5 фт · ${damage} дробящий`;
}

// Атаки НПС и монстров — этап 6: пока у НПС значки только с описанием.
export const NPC_ATTACKS_LATER = 'Атаки НПС — на следующем этапе';

// Атаки героя для значков (attackOptions.ts) с подсказкой, как в блоке «Атаки» листа;
// приём оружия — только подписью (решение к этапу 5, вопрос 2).
function heroAttackKit(character: Character): TurnKitAttack[] {
  const gear = gearAttacks(wornGear(character.inventory), {
    abilityScores: character.abilityScores,
    proficiencyBonus: character.proficiencyBonus,
    weapons: character.proficiencies.weapons,
  });
  return heroAttacks(character).map((option: AttackOption) => {
    const common = {
      key: option.key,
      name: option.name,
      spend: option.spend,
      set: option.set,
      unavailable: option.unavailable,
    };
    const attack = gear.find((a) => a.weapon.slot === option.key);
    if (!attack) {
      return {
        ...common,
        tip: unarmedTip(character),
        image: null,
        icon: 'punch',
      };
    }
    const view = attackView(attack, character.weaponMasteries);
    const row = character.inventory.find((e) =>
      e.equipped.includes(attack.weapon.slot),
    );
    return {
      ...common,
      tip: [view.name, view.place, view.bonus, view.damage, view.mastery]
        .filter(Boolean)
        .join(' · '),
      image: row?.item ? { id: row.item.id, image: row.item.image } : null,
      icon: 'weapon',
    };
  });
}

// instance — ячейки и отметки «подготовлено» экземпляра НПС (свои у каждого на сцене);
// у героя всё из его листа.
export function characterKit(
  character: Character,
  instance?: GameCreatureSpells | null,
): TurnKit {
  const prepared = instance?.prepared ?? {};
  const attacks = heroAttackKit(character);
  const npc = instance !== undefined;
  const has = (set: string) => attacks.some((a) => a.set === set);
  return {
    attacks,
    attackNote: npc ? NPC_ATTACKS_LATER : null,
    weaponSets: npc
      ? null
      : {
          initial: activeWeaponSet(null, wornGear(character.inventory)),
          both: has('melee') && has('ranged'),
        },
    abilities: character.abilities.flatMap((e) =>
      e.ability
        ? [
            {
              id: e.id,
              prepared: prepared[e.id] ?? e.prepared,
              ability: e.ability,
            },
          ]
        : [],
    ),
    slots:
      instance === undefined ? character.spellSlots : (instance?.slots ?? null),
  };
}

export function monsterKit(monster: Monster): TurnKit {
  return {
    attacks: [],
    attackNote: null,
    weaponSets: null,
    abilities: (monster.abilities ?? []).flatMap((e) =>
      e.ability ? [{ id: e.id, prepared: null, ability: e.ability }] : [],
    ),
    slots: null,
  };
}
