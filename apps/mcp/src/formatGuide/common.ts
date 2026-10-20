// Общие куски справки format_guide.

// «key — Метка, …» из словаря меток shared: значения те же, что принимает сервер.
export const labeled = (labels: Record<string, string>) =>
  Object.entries(labels)
    .map(([key, label]) => `${key} (${label})`)
    .join(', ');

export const list = (values: readonly (string | number)[]) => values.join(', ');

// Описание полей: Record по ключам типа из shared, чтобы новое поле без описания не
// собралось (satisfies в файлах видов).
export const fieldLines = (fields: Record<string, string>) =>
  Object.entries(fields).map(([key, about]) => `- ${key} — ${about}`);

export const sample = (value: unknown) => JSON.stringify(value);
