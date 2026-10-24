// Родительный падеж: «с сентября 2026». Intl даёт месяц только в именительном
// («сентябрь 2026 г.»), а в этой фразе он не подходит.
const MONTHS_GENITIVE = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
];

// Когда создан аккаунт, для карточки игрока; месяц — по часам самого человека.
export function memberSince(createdAt: string): string {
  const date = new Date(createdAt);
  return `с ${MONTHS_GENITIVE[date.getMonth()]} ${date.getFullYear()}`;
}
