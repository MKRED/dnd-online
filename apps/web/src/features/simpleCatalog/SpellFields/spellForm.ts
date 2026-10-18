import {
  DURATION_AMOUNT_MAX,
  SPELL_COMPONENTS_MAX_LENGTH,
  type AbilityCosts,
  type DurationUnit,
  type SpellDetails,
  type SpellDurationKind,
  type SpellSchool,
} from 'shared';

// Поля заклинания в форме (docs/plan/done/abilities.md, этап 6). Круг — строка, как отдаёт
// Select; школа — '' пока не выбрана. Поля «Времени» держатся и при другом виде
// длительности: при смене вида туда и обратно введённое не пропадает.
export interface SpellValues {
  level: string;
  school: SpellSchool | '';
  components: string;
  ritual: boolean;
  duration: {
    kind: SpellDurationKind;
    amount: number | string;
    unit: DurationUnit;
    concentration: boolean;
  };
}

// Новое заклинание — 1 круга: заговоров в книге меньше.
const BLANK: SpellValues = {
  level: '1',
  school: '',
  components: '',
  ritual: false,
  duration: {
    kind: 'instant',
    amount: 1,
    unit: 'minute',
    concentration: false,
  },
};

export function toSpellValues(details?: SpellDetails): SpellValues {
  if (!details) return BLANK;
  return {
    level: String(details.level),
    school: details.school,
    components: details.components,
    ritual: details.ritual,
    duration: { ...BLANK.duration, ...details.duration },
  };
}

// Школу к этому времени проверила форма. Ритуал у заговора не уходит: галочки у него нет,
// а отметка могла остаться с другого круга.
export function fromSpellValues(values: SpellValues): SpellDetails {
  const level = Number(values.level);
  const { duration } = values;
  return {
    level,
    school: values.school as SpellSchool,
    components: values.components.trim(),
    ritual: level >= 1 && values.ritual,
    duration:
      duration.kind === 'time'
        ? {
            kind: 'time',
            amount: Number(duration.amount),
            unit: duration.unit,
            concentration: duration.concentration,
          }
        : { kind: duration.kind },
  };
}

// Затрата «Ячейка заклинаний» заклинания: ровно его круга, у заговора её нет (как
// spellSlotFits на сервере). Отправляется так, что бы ни осталось в поле круга ячейки.
export function spellCosts(costs: AbilityCosts, level: number): AbilityCosts {
  return {
    ...costs,
    spellSlot:
      level >= 1 && costs.spellSlot !== null ? { minLevel: level } : null,
  };
}

type WithSpell = { category?: string; spell?: SpellValues };
const isSpell = (values: WithSpell) => values.category === 'spell';

// Те же пределы, что у сервера (isSpellDetails). Проверяем, только когда выбрано
// «Заклинание».
export const spellValidate = {
  school: (value: string, values: WithSpell) =>
    !isSpell(values) || value !== '' ? null : 'Выберите школу',
  components: (value: string, values: WithSpell) =>
    !isSpell(values) || value.trim().length <= SPELL_COMPONENTS_MAX_LENGTH
      ? null
      : `Не длиннее ${SPELL_COMPONENTS_MAX_LENGTH} символов`,
  duration: {
    amount: (value: number | string, values: WithSpell) => {
      if (!isSpell(values) || values.spell?.duration.kind !== 'time')
        return null;
      const n = Number(value);
      return value !== '' &&
        Number.isInteger(n) &&
        n >= 1 &&
        n <= DURATION_AMOUNT_MAX
        ? null
        : `От 1 до ${DURATION_AMOUNT_MAX}`;
    },
  },
};
