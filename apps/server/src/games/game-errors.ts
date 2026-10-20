// Тексты ошибок игр: UI показывает их как есть.
export const GAME_NOT_FOUND = 'Игра не найдена';
export const SEAT_NOT_FOUND = 'Место не найдено';
export const MEMBER_NOT_FOUND = 'Игрока нет в этой игре';
export const GAME_LOCKED = 'Игра закрыта паролем';
export const CHARACTER_NOT_FOUND = 'Персонаж не найден';
export const WRONG_PASSWORD = 'Неверный пароль игры';
export const MASTER_ONLY_DELETE = 'Удалить игру может только мастер';
export const MASTER_ONLY_REMOVE = 'Убрать игрока может только мастер';
export const MASTER_NO_SEAT = 'Мастер не занимает место в своей игре';
export const MASTER_NO_LEAVE =
  'Мастер не выходит из своей игры — её можно удалить';
export const ALREADY_SEATED = 'Вы уже заняли место в этой игре';
export const NO_FREE_SEATS = 'Свободных мест нет';
export const NPC_NO_SEAT = 'Место занимает игровой персонаж, а не НПС';

export function characterInGame(gameName: string) {
  return `Персонаж уже в игре «${gameName}»`;
}
