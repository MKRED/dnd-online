// Короткий вид списка связей для ответа link_add, link_update и link_remove. Сервер
// отдаёт каждую строку с вложенной записью каталога (активация, затраты, картинка…), и
// на шестой способности монстра ответ разрастался до сотен строк (этап 7
// docs/plan/ai-access.md). Модели для следующего шага нужны только id строки, её поля
// и что за запись к ней привязана; запись целиком отдаёт get.
const NESTED = ['item', 'ability', 'effect'] as const;

type Row = Record<string, unknown>;

const isRow = (value: unknown): value is Row =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function summarizeRow(row: Row): Row {
  const out: Row = {};
  for (const [key, value] of Object.entries(row)) {
    if (NESTED.includes(key as (typeof NESTED)[number]) && isRow(value)) {
      out[key] = { id: value.id, name: value.name };
    } else if (value === null || typeof value !== 'object') {
      // Свои поля связи: quantity, location, perDay, prepared, missing, inactive, attuned.
      out[key] = value;
    } else if (
      Array.isArray(value) &&
      value.every((v) => v === null || typeof v !== 'object')
    ) {
      // Места куклы строки инвентаря: equipped.
      out[key] = value;
    }
  }
  return out;
}

export function summarizeLinks(value: unknown): unknown {
  return Array.isArray(value)
    ? value.map((row) => (isRow(row) ? summarizeRow(row) : row))
    : value;
}
