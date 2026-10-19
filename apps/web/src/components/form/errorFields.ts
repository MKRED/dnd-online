import type { FormErrors } from '@mantine/form';

export interface ErrorField {
  path: string;
  label: string;
  message: string;
}

// Ошибки формы — списком «поле — что не так», в том порядке, в каком поля идут на
// странице. Подпись и место поля по его пути знает сама форма: rankOf возвращает
// числа, которые сравниваются по очереди.
export function collectErrorFields(
  errors: FormErrors,
  labelOf: (path: string) => string,
  rankOf: (path: string) => number[],
): ErrorField[] {
  return Object.entries(errors)
    .flatMap(([path, message]) =>
      // Все проверки форм возвращают строку; пустое значение — ошибки нет.
      typeof message === 'string' && message
        ? [{ path, label: labelOf(path), message }]
        : [],
    )
    .sort((a, b) => byRank(rankOf(a.path), rankOf(b.path)));
}

function byRank(a: number[], b: number[]) {
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i++) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    if (diff) return diff;
  }
  return 0;
}
