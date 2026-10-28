import {
  RECHARGE_MAX,
  USES_AMOUNT_MAX,
  monsterLimitOf,
  type AbilityCosts,
  type MonsterLimit,
  type MonsterLimitKind,
} from 'shared';

// «Ограничение» способности монстра в форме (docs/plan/ability-categories.md, вариант 1А):
// вид и поля всех видов сразу, чтобы при смене вида введённое не пропадало. Перезарядка —
// строка, как отдаёт Select; «N/день» — '' пока поле пустое (так отдаёт NumberInput).
export interface MonsterAbilityValues {
  limit: MonsterLimitKind;
  perDay: number | string;
  recharge: string;
}

const BLANK: MonsterAbilityValues = {
  limit: 'none',
  perDay: 1,
  recharge: String(RECHARGE_MAX - 1),
};

// Запись, которая в «Ограничение» не укладывается (до миграции 0065), открывается с её
// перезарядкой или без ограничения: сохранить её такой форма всё равно не даст.
export function toMonsterAbilityValues(
  details?: { recharge: number | null },
  costs?: AbilityCosts,
): MonsterAbilityValues {
  if (!details || !costs) return BLANK;
  const limit: MonsterLimit =
    monsterLimitOf(costs, details.recharge) ??
    (details.recharge === null
      ? { kind: 'none' }
      : { kind: 'recharge', from: details.recharge });
  return {
    ...BLANK,
    limit: limit.kind,
    ...(limit.kind === 'per_day' && { perDay: limit.amount }),
    ...(limit.kind === 'recharge' && { recharge: String(limit.from) }),
  };
}

export function fromMonsterAbilityValues(
  values: MonsterAbilityValues,
): MonsterLimit {
  switch (values.limit) {
    case 'per_day':
      return { kind: 'per_day', amount: Number(values.perDay) };
    case 'recharge':
      return { kind: 'recharge', from: Number(values.recharge) };
    default:
      return { kind: values.limit };
  }
}

type WithMonster = { monster?: MonsterAbilityValues; category?: string };

export const monsterAbilityValidate = {
  perDay: (value: number | string, values: WithMonster) => {
    if (values.category !== 'monster' || values.monster?.limit !== 'per_day')
      return null;
    const n = Number(value);
    return value !== '' && Number.isInteger(n) && n >= 1 && n <= USES_AMOUNT_MAX
      ? null
      : `От 1 до ${USES_AMOUNT_MAX}`;
  },
};
