import type { D20RollInput, RollTermInput } from '../d20Roll.js';
import type { AdvantageDetails } from '../effectAdvantage.js';
import type { AttackOption } from './attackOptions.js';
import type { RangeBand } from './attackRange.js';
import {
  effectsBySource,
  fighterConditions,
  type FighterEffects,
} from './fighterConditions.js';

// Бросок атаки (docs/dnd/combat.md, «Making an attack»; docs/plan/combat.md, «Решения к
// этапу 5»): слагаемые атаки, прибавки к броску из эффектов атакующего и причины
// преимущества и помехи по правилам. Укрытие меняет не бросок, а КД цели (attackHit.ts).

export interface AttackSituation {
  option: Pick<AttackOption, 'kind' | 'terms' | 'heavyDisadvantage'>;
  // Футы до цели и где она по дистанции.
  distance: number;
  band: RangeBand;
  attacker: FighterEffects;
  target: FighterEffects;
  // В 5 фт. от атакующего враг, который его видит и не Недееспособен: дальнобойной атаке
  // помеха (Ranged Attacks in Close Combat). Решает сервер по сцене.
  enemyClose: boolean;
  // Цель «уклоняется» (Dodge): помеха, если она видит атакующего и дееспособна.
  targetDodging: boolean;
}

export const REASON_LONG_RANGE = 'Дальняя дистанция';
export const REASON_ENEMY_CLOSE = 'Враг вплотную';
export const REASON_HEAVY = 'Тяжёлое оружие';
export const REASON_DODGING = 'Цель уклоняется';

const WITHIN_FT = 5;

// Бросок атаки — Тест к20: его касаются и «свои броски атаки», и «все Тесты к20».
const forAttack = (roll: string) => roll === 'attack' || roll === 'd20';

// Условие «когда» у преимущества на атаки по носителю: проверяется по сцене. Условия
// атакующего («пока источник страха в поле зрения», «по наложившему») движок пока не
// проверяет — как у инициативы, они не считаются.
function attackedWhenHolds(
  when: AdvantageDetails['when'],
  distance: number,
  attackerSees: boolean,
): boolean {
  switch (when) {
    case null:
      return true;
    case 'within_5ft':
      return distance <= WITHIN_FT;
    case 'beyond_5ft':
      return distance > WITHIN_FT;
    case 'attacker_sees':
      return attackerSees;
    default:
      return false;
  }
}

export function attackRollInput(
  s: AttackSituation,
): Omit<D20RollInput, 'master'> {
  const advantage: string[] = [];
  const disadvantage: string[] = [];
  const add = (list: string[], reason: string) => {
    if (!list.includes(reason)) list.push(reason);
  };
  const terms: RollTermInput[] = [...s.option.terms];
  const attackerConditions = fighterConditions(s.attacker.effects);
  const targetConditions = fighterConditions(s.target.effects);
  // Видит ли один другого — пока только по состояниям: света на сцене ещё нет
  // (docs/dnd/vision.md). Невидимого не видят, Ослеплённый не видит никого.
  const attackerSees =
    !attackerConditions.has('blinded') && !targetConditions.has('invisible');
  const targetSees =
    !targetConditions.has('blinded') && !attackerConditions.has('invisible');

  for (const { source, components } of effectsBySource(s.attacker.effects)) {
    const from = s.attacker.nameOf(source);
    for (const c of components) {
      if (c.kind === 'advantage' && forAttack(c.roll) && c.when === null) {
        add(c.mode === 'advantage' ? advantage : disadvantage, from);
      }
      if (c.kind === 'roll_bonus' && forAttack(c.roll)) {
        const sign = c.mode === 'bonus' ? 1 : -1;
        if (c.count > 0) {
          terms.push({
            kind: 'dice',
            label: from,
            count: c.count,
            die: c.die,
            sign,
          });
        }
        if (c.number > 0) {
          terms.push({ kind: 'number', label: from, amount: sign * c.number });
        }
      }
    }
  }
  for (const { source, components } of effectsBySource(s.target.effects)) {
    const from = s.target.nameOf(source);
    for (const c of components) {
      if (
        c.kind === 'advantage' &&
        c.roll === 'attacked' &&
        attackedWhenHolds(c.when, s.distance, attackerSees)
      ) {
        add(c.mode === 'advantage' ? advantage : disadvantage, from);
      }
    }
  }

  if (s.band === 'long') add(disadvantage, REASON_LONG_RANGE);
  if (s.option.kind === 'ranged' && s.enemyClose) {
    add(disadvantage, REASON_ENEMY_CLOSE);
  }
  if (s.option.heavyDisadvantage) add(disadvantage, REASON_HEAVY);
  if (s.targetDodging && targetSees && !targetConditions.has('incapacitated')) {
    add(disadvantage, REASON_DODGING);
  }
  return { terms, reasons: { advantage, disadvantage } };
}
