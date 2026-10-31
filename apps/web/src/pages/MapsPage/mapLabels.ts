import { pluralRu } from 'shared';

// Старты — места игроков: по их числу видно, на сколько человек карта.
export function startsLabel(count: number) {
  if (count === 0) return 'нет стартов';
  return `${count} ${pluralRu(count, ['старт', 'старта', 'стартов'])}`;
}

const dayMonth = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'short',
});
const dayMonthYear = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

// Когда карту последний раз меняли: «сегодня», «вчера», «29 окт.», в прошлом году — с годом.
export function editedLabel(iso: string, now = new Date()) {
  const date = new Date(iso);
  const days = Math.round(
    (startOfDay(now).getTime() - startOfDay(date).getTime()) / 86_400_000,
  );
  if (days <= 0) return 'изменена сегодня';
  if (days === 1) return 'изменена вчера';
  const format =
    date.getFullYear() === now.getFullYear() ? dayMonth : dayMonthYear;
  return format.format(date);
}
