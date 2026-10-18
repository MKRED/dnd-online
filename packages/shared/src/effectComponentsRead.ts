import {
  EFFECT_COMPONENTS_MAX,
  isEffectComponents,
  type EffectComponent,
  type EffectComponentKind,
} from './effectComponents.js';

// Поля, у которых есть естественное значение по умолчанию. Когда в вид добавляют поле,
// его умолчание дописывают сюда: старые записи в базе получат его при чтении, а не
// станут «Базовыми» (docs/plan/done/effects-coverage.md, «Чтение с умолчаниями»). Поле без
// естественного умолчания так добавлять нельзя — только с миграцией данных.
const STORED_DEFAULTS: Partial<
  Record<EffectComponentKind, Record<string, unknown>>
> = {
  per_turn: { bonus: 0, addModifier: false },
  defense: { conditions: [] },
  speed: { hover: false },
  advantage: { ability: null, when: null },
};

function withDefaults(stored: object): object {
  const { kind } = stored as { kind?: unknown };
  const defaults =
    typeof kind === 'string' && Object.hasOwn(STORED_DEFAULTS, kind)
      ? STORED_DEFAULTS[kind as EffectComponentKind]
      : undefined;
  return { ...defaults, ...stored };
}

// Составляющие из базы — мягче, чем из запроса. Запрос проверяется целиком
// (isEffectComponents) и с ошибкой не проходит. Из базы недостающие поля заполняются
// умолчаниями, а испорченная составляющая или повтор пропускаются по одной: остальные
// составляющие эффекта сохраняются.
export function readEffectComponents(value: unknown): EffectComponent[] {
  if (!Array.isArray(value)) return [];
  const result: EffectComponent[] = [];
  for (const stored of value.slice(0, EFFECT_COMPONENTS_MAX)) {
    if (typeof stored !== 'object' || stored === null) continue;
    const component = withDefaults(stored);
    // Проверяем вместе с уже принятыми: так ловится и повтор.
    if (isEffectComponents([...result, component])) {
      result.push(component as EffectComponent);
    }
  }
  return result;
}
