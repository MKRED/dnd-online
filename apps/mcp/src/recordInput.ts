import type { EntityKind } from './entityKinds.js';

// update (docs/plan/ai-access.md, этап 3) — прочитать запись, наложить правку и отправить
// целиком в PUT: модели не нужно пересылать весь стат-блок ради одного числа.

type Plain = Record<string, unknown>;

const isPlain = (value: unknown): value is Plain =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

// Объекты сливаются вглубь, массивы, details и cells заменяются целиком. details зависит
// от категории: при смене категории старые ключи details сервер бы отклонил. cells модели —
// словарь клеток: при слиянии свойство клетки было бы не убрать.
const REPLACED = new Set(['details', 'cells']);

export function mergePatch(base: Plain, patch: Plain, top = true): Plain {
  const result: Plain = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    const old = result[key];
    const replace = top && REPLACED.has(key);
    result[key] =
      !replace && isPlain(old) && isPlain(value)
        ? mergePatch(old, value, false)
        : value;
  }
  return result;
}

const effectRefs = (effects: unknown) =>
  Array.isArray(effects)
    ? effects.map((e) => ({ effectId: (e as Plain).effectId }))
    : effects;

// Запись в тело PUT. Лишние поля верхнего уровня (id, автор, картинка, связи) сервер
// вырезает сам (ValidationPipe с whitelist), а вложенные проверки строгие: у набора в
// составе только itemId и quantity, у эффекта в шаге способности — только effectId.
export function recordToInput(kind: EntityKind, record: Plain): Plain {
  if (
    kind === 'item' &&
    record.category === 'pack' &&
    isPlain(record.details)
  ) {
    const contents = record.details.contents;
    return {
      ...record,
      details: {
        contents: Array.isArray(contents)
          ? contents.map((e: Plain) => ({
              itemId: e.itemId,
              quantity: e.quantity,
            }))
          : contents,
      },
    };
  }
  if (kind === 'ability' && Array.isArray(record.steps)) {
    return {
      ...record,
      steps: record.steps.map((step: Plain) => ({
        ...step,
        hit: isPlain(step.hit)
          ? { ...step.hit, effects: effectRefs(step.hit.effects) }
          : step.hit,
        miss: isPlain(step.miss)
          ? { ...step.miss, effects: effectRefs(step.miss.effects) }
          : step.miss,
      })),
    };
  }
  return record;
}
