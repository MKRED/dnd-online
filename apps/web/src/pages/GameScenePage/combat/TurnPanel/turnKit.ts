import {
  gearAttacks,
  getAbilityModifier,
  wornGear,
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

function weaponAttacks(character: Character): TurnKitAttack[] {
  const attacks = gearAttacks(wornGear(character.inventory), {
    abilityScores: character.abilityScores,
    proficiencyBonus: character.proficiencyBonus,
    weapons: character.proficiencies.weapons,
  });
  return attacks.map((attack) => {
    const view = attackView(attack, character.weaponMasteries);
    const row = character.inventory.find((e) =>
      e.equipped.includes(attack.weapon.slot),
    );
    return {
      key: view.key,
      name: view.name,
      tip: `${view.name} · ${view.place} · ${view.bonus} · ${view.damage}`,
      bonusAction: attack.lightBonus,
      image: row?.item ? { id: row.item.id, image: row.item.image } : null,
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
  return {
    attacks: weaponAttacks(character),
    unarmed: unarmedTip(character),
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
    unarmed: null,
    abilities: (monster.abilities ?? []).flatMap((e) =>
      e.ability ? [{ id: e.id, prepared: null, ability: e.ability }] : [],
    ),
    slots: null,
  };
}
