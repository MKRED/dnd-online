// Хиты существа в игре (docs/dnd/hit-points.md, правила 2024): урон, лечение, временные
// хиты и спасброски от смерти. Сервер считает новое состояние от того, что просили, —
// мастер и игрок правят одно существо одновременно, и число с клиента затёрло бы чужую
// правку.

// Больше в одной правке не бывает; предел ловит опечатку.
export const HIT_POINTS_CHANGE_MAX = 9999;
export const DEATH_SAVES_MAX = 3;

export type HitPointsChange =
  | { kind: 'damage'; amount: number }
  | { kind: 'heal'; amount: number }
  // Временные хиты не складываются: игрок сам решает, какие оставить, поэтому правка
  // ставит число, а 0 их убирает.
  | { kind: 'temp'; amount: number }
  | { kind: 'death_saves'; successes: number; failures: number };

export const HIT_POINTS_CHANGE_KINDS = [
  'damage',
  'heal',
  'temp',
  'death_saves',
] as const satisfies readonly HitPointsChange['kind'][];

export interface HitPointsState {
  current: number;
  max: number;
  temp: number;
  deathSuccesses: number;
  deathFailures: number;
}

export type HitPointsOutcome =
  | {
      ok: true;
      state: HitPointsState;
      // Урон сверх нуля не меньше максимума хитов — мгновенная смерть (персонаж).
      instantDeath: boolean;
    }
  | { ok: false; reason: 'dead' | 'no_death_saves' };

// character — персонаж игрока: у него спасброски от смерти и мгновенная смерть. Монстр и
// НПС умирают на 0 хитов сразу (правило Monster Death), спасбросков у них нет.
export function applyHitPoints(
  state: HitPointsState,
  change: HitPointsChange,
  character: boolean,
): HitPointsOutcome {
  const dead = character && state.deathFailures >= DEATH_SAVES_MAX;
  switch (change.kind) {
    case 'damage':
      return damage(state, change.amount, character);
    case 'heal':
      // Мёртвый хитов не восстанавливает, пока его не вернут магией: мастер сначала
      // снимает провалы спасбросков.
      if (dead) return { ok: false, reason: 'dead' };
      return ok({
        ...state,
        current: Math.min(state.max, state.current + change.amount),
        // Любое лечение с нуля обнуляет счёт спасбросков.
        ...(state.current === 0 && change.amount > 0 ? noSaves : {}),
      });
    case 'temp':
      return ok({ ...state, temp: change.amount });
    case 'death_saves':
      if (!character) return { ok: false, reason: 'no_death_saves' };
      return ok({
        ...state,
        deathSuccesses: change.successes,
        deathFailures: change.failures,
      });
  }
}

const noSaves = { deathSuccesses: 0, deathFailures: 0 };

function ok(state: HitPointsState): HitPointsOutcome {
  return { ok: true, state, instantDeath: false };
}

function damage(
  state: HitPointsState,
  amount: number,
  character: boolean,
): HitPointsOutcome {
  // Сначала теряются временные хиты, остаток идёт в хиты.
  const fromTemp = Math.min(state.temp, amount);
  const rest = amount - fromTemp;
  const temp = state.temp - fromTemp;
  if (!character || rest === 0) {
    return ok({ ...state, temp, current: Math.max(0, state.current - rest) });
  }
  if (state.current === 0) {
    // Урон на нуле — провал спасброска (от критического попадания — два, это мастер
    // отмечает сам), урон не меньше максимума — смерть. Стабильный (три успеха) снова
    // начинает бросать.
    const instantDeath = rest >= state.max;
    return {
      ok: true,
      instantDeath,
      state: {
        ...state,
        temp,
        deathSuccesses: 0,
        deathFailures: instantDeath
          ? DEATH_SAVES_MAX
          : Math.min(DEATH_SAVES_MAX, state.deathFailures + 1),
      },
    };
  }
  const remainder = rest - state.current;
  const instantDeath = remainder > 0 && remainder >= state.max;
  return {
    ok: true,
    instantDeath,
    state: {
      ...state,
      temp,
      current: Math.max(0, state.current - rest),
      ...(instantDeath ? { deathFailures: DEATH_SAVES_MAX } : {}),
    },
  };
}

// Что видно о здоровье со стороны (docs/plan/game.md, «Состояние существ»): «Ранен» —
// Bloodied, половина хитов или меньше; «Повержен» или «Без сознания» — 0 хитов; «Погиб» —
// персонаж с тремя провалами спасбросков.
export type CreatureHealth = 'bloodied' | 'down' | 'dead';

export function creatureHealth(
  state: Pick<HitPointsState, 'current' | 'max' | 'deathFailures'>,
): CreatureHealth | null {
  if (state.current === 0) {
    return state.deathFailures >= DEATH_SAVES_MAX ? 'dead' : 'down';
  }
  return state.current * 2 <= state.max ? 'bloodied' : null;
}
