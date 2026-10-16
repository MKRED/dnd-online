import { randomId } from '@mantine/hooks';
import {
  senseHasRange,
  type ConditionKind,
  type EffectComponent,
  type EffectComponentKind,
  type SenseKind,
} from 'shared';
import {
  fromAdvantageValues,
  NEW_ADVANTAGE,
  toAdvantageValues,
  type AdvantageValues,
} from './advantageForm';
import {
  fromAutoFailValues,
  NEW_AUTO_FAIL,
  toAutoFailValues,
  type AutoFailValues,
} from './autoFailForm';
import {
  fromDefenseValues,
  NEW_DEFENSE,
  type DefenseValues,
} from './defenseForm';
import {
  fromPerTurnValues,
  NEW_PER_TURN,
  toPerTurnValues,
  type PerTurnValues,
} from './perTurnForm';
import {
  fromSpeedValues,
  NEW_SPEED,
  toSpeedValues,
  type SpeedValues,
} from './speedForm';

// Составляющие и снятие спасброском в форме эффекта (docs/plan/effects.md). key — только
// для React: по нему список не путает строки при удалении из середины. Поля всех видов
// лежат в одной строке: Mantine проверяет списки по путям, а каждая карточка читает
// только поля своего вида. Виды с несколькими полями — отдельными объектами.
export interface ComponentValues {
  key: string;
  kind: EffectComponentKind;
  // null — ещё не выбрано; range — '' пока поле пустое (так отдаёт NumberInput).
  sense: SenseKind | null;
  range: number | string;
  condition: ConditionKind | null;
  perTurn: PerTurnValues;
  defense: DefenseValues;
  speed: SpeedValues;
  advantage: AdvantageValues;
  autoFail: AutoFailValues;
}

export function newComponent(kind: EffectComponentKind): ComponentValues {
  return {
    key: randomId(),
    kind,
    sense: null,
    range: '',
    condition: null,
    perTurn: NEW_PER_TURN,
    defense: NEW_DEFENSE,
    speed: NEW_SPEED,
    advantage: NEW_ADVANTAGE,
    autoFail: NEW_AUTO_FAIL,
  };
}
export function toComponentValues(component: EffectComponent): ComponentValues {
  const values = newComponent(component.kind);
  switch (component.kind) {
    case 'sense':
      return {
        ...values,
        sense: component.sense,
        range: component.range ?? '',
      };
    case 'condition':
      return { ...values, condition: component.condition };
    case 'per_turn': {
      const { kind, ...details } = component;
      return { ...values, kind, perTurn: toPerTurnValues(details) };
    }
    case 'defense': {
      const { kind, ...details } = component;
      return { ...values, kind, defense: details };
    }
    case 'no_healing':
      return values;
    case 'speed': {
      const { kind, ...details } = component;
      return { ...values, kind, speed: toSpeedValues(details) };
    }
    case 'advantage': {
      const { kind, ...details } = component;
      return { ...values, kind, advantage: toAdvantageValues(details) };
    }
    case 'auto_fail': {
      const { kind, ...details } = component;
      return { ...values, kind, autoFail: toAutoFailValues(details) };
    }
    default:
      return component satisfies never;
  }
}

// Строка формы → составляющая запроса; недозаполненную форма не пропустит до отправки.
export function fromComponentValues(c: ComponentValues): EffectComponent[] {
  switch (c.kind) {
    case 'sense':
      return c.sense
        ? [
            {
              kind: 'sense',
              sense: c.sense,
              // Дистанция, введённая для другого вида, не уходит.
              range: senseHasRange(c.sense) ? Number(c.range) : null,
            },
          ]
        : [];
    case 'condition':
      return c.condition ? [{ kind: 'condition', condition: c.condition }] : [];
    case 'per_turn':
      return [{ kind: 'per_turn', ...fromPerTurnValues(c.perTurn) }];
    case 'defense':
      return [{ kind: 'defense', ...fromDefenseValues(c.defense) }];
    case 'no_healing':
      return [{ kind: 'no_healing' }];
    case 'speed':
      return [{ kind: 'speed', ...fromSpeedValues(c.speed) }];
    case 'advantage':
      return [{ kind: 'advantage', ...fromAdvantageValues(c.advantage) }];
    case 'auto_fail':
      return [{ kind: 'auto_fail', ...fromAutoFailValues(c.autoFail) }];
    default:
      return c.kind satisfies never;
  }
}
