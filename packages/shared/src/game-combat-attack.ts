import type { AttackOutcome } from './attack/attackHit.js';
import type { AttackKey } from './attack/attackOptions.js';
import type { DamageRoll } from './attack/attackDamage.js';
import type { RangeBand } from './attack/attackRange.js';
import type { DamageTermInput } from './attack/attackTerms.js';
import type { WeaponSet } from './attack/weaponSets.js';
import type { D20Roll, D20RollInput, RollMode } from './d20Roll.js';
import type { CombatantRef, GameCombat } from './game-combat.js';
import type { Cover } from './map/rules/cover.js';

// Атака героя в бою (docs/plan/combat.md, этап 5): выбор цели, бросок атаки и урон.

// Что за ход уже было у участника по атакам — тем же, кому видны его ресурсы.
export interface CombatantAttackState {
  // Выбранный набор; null — не выбирали (ближний, без ближнего оружия — дальний).
  weaponSet: WeaponSet | null;
  // Набор уже переключали в этот ход: второй раз нельзя (домашнее правило).
  setSwitched: boolean;
  // Первая смена оружия в руке за ход бесплатна, дальше — действие (домашнее правило).
  handSwapped: boolean;
  // Была атака Лёгким оружием основной руки: можно второй рукой бонусным действием.
  lightAttacked: boolean;
  // Попадание без брошенного урона: пока он не брошен, новой атаки и конца хода нет.
  pending: PendingDamage | null;
}

export interface PendingDamage {
  attack: AttackKey;
  name: string;
  target: { ref: CombatantRef; name: string };
  critical: boolean;
  // Что будет брошено: кости и числа по типам, ещё без крита.
  damage: DamageTermInput[];
}

// Цель в списке под значками (вариант Б макета «Атака и начало боя»).
export interface AttackTarget {
  ref: CombatantRef;
  name: string;
  // Свой: герой атакует героя — с предупреждением.
  ally: boolean;
  distance: number;
  band: RangeBand;
  cover: Exclude<Cover, 'total'>;
  // Что войдёт в бросок по этой цели; вне досягаемости — тоже, для подсказки.
  roll: Omit<D20RollInput, 'master'>;
  // КД с укрытием — только мастеру; игроку null.
  armorClass: number | null;
}

export interface CombatAttackInput {
  attack: AttackKey;
  target: CombatantRef;
  // Переключатель мастера; игроку нельзя.
  mode?: RollMode;
}

export interface CombatWeaponSetInput {
  set: WeaponSet;
}

// Ответ на бросок атаки: бросок для окна, попал ли и очередь после. КД — только мастеру.
export interface GameCombatAttack {
  roll: D20Roll;
  outcome: AttackOutcome;
  armorClass: number | null;
  combat: GameCombat;
}

// Ответ на бросок урона: что выпало и прошло по типам; хиты цели до и после — мастеру
// и тем, кто видит хиты цели (герой партии), иначе null.
export interface GameCombatDamage {
  damage: DamageRoll;
  hitPoints: { before: number; after: number; max: number } | null;
  combat: GameCombat;
}

// Записи журнала об атаке.
export interface GameEventAttack {
  key: AttackKey;
  name: string;
}
export interface GameEventAttackTarget {
  ref: CombatantRef;
  name: string;
}
