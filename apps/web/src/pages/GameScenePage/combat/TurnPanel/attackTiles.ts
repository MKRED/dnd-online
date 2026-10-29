import type { TurnSpend, WeaponSet } from 'shared';
import type { TurnKit, TurnState, TurnTile } from './turnTiles';

// Значки атак блока «Ваш ход» (docs/plan/combat.md, «Решения к этапу 5»): только активного
// набора и безоружный удар; почему нельзя — в том же порядке, что проверяет сервер.

export const DAMAGE_PENDING = 'Сначала бросьте урон по прошлому попаданию';
export const OFF_HAND_AFTER_LIGHT =
  'Второй рукой — после атаки Лёгким оружием основной руки в этом ходу';

// Набор, который сейчас в руках: выбранный в этот ход или прошлые, иначе начальный.
export function activeSet(kit: TurnKit, state: TurnState): WeaponSet | null {
  if (!kit.weaponSets) return null;
  return state.attack?.weaponSet ?? kit.weaponSets.initial;
}

export function attackTiles(
  kit: TurnKit,
  state: TurnState,
  block: (spend: TurnSpend) => string | null,
): TurnTile[] {
  const set = activeSet(kit, state);
  return kit.attacks
    .filter((a) => a.set === null || set === null || a.set === set)
    .map((a) => ({
      key: `attack:${a.key}`,
      group: 'attacks',
      name: a.name,
      tip: a.tip,
      cost: a.spend,
      level: null,
      image: a.image,
      icon: a.icon,
      use: kit.attackNote
        ? { kind: 'info' }
        : { kind: 'attack', attack: a.key, ranged: a.ranged },
      block:
        a.unavailable ??
        kit.attackNote ??
        (state.ownTurn ? null : block(a.spend)) ??
        (state.attack?.pending ? DAMAGE_PENDING : null) ??
        (a.spend === 'bonus_action' && !state.attack?.lightAttacked
          ? OFF_HAND_AFTER_LIGHT
          : null) ??
        block(a.spend),
    }));
}
