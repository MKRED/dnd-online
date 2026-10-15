// Поиск по названию в каталогах без учёта регистра, «ё» = «е»: «Верёвка» находится по
// «веревка».
export function normalizeSearch(text: string): string {
  return text.toLocaleLowerCase('ru-RU').replaceAll('ё', 'е').trim();
}

// Сравнение названий для сортировки «По названию».
export const nameCollator = new Intl.Collator('ru-RU', { sensitivity: 'base' });
