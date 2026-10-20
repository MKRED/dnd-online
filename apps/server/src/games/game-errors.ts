// Тексты ошибок игр: UI показывает их как есть.
export const GAME_NOT_FOUND = 'Игра не найдена';
export const SEAT_NOT_FOUND = 'Место не найдено';
export const MEMBER_NOT_FOUND = 'Игрока нет в этой игре';
export const GAME_LOCKED = 'Игра закрыта паролем';
export const CHARACTER_NOT_FOUND = 'Персонаж не найден';
export const WRONG_PASSWORD = 'Неверный пароль игры';
export const MASTER_ONLY_DELETE = 'Удалить игру может только мастер';
export const MASTER_ONLY_REMOVE = 'Убрать игрока может только мастер';
export const MASTER_ONLY_JOURNAL = 'Журнал игры видит только мастер';
export const MASTER_ONLY_SESSION =
  'Начать и закончить встречу может только мастер';
export const SESSION_ALREADY_STARTED = 'Встреча уже идёт';
export const SESSION_NOT_STARTED = 'Встреча не идёт';
export const MASTER_NO_SEAT = 'Мастер не занимает место в своей игре';
export const MASTER_NO_LEAVE =
  'Мастер не выходит из своей игры — её можно удалить';
export const ALREADY_SEATED = 'Вы уже заняли место в этой игре';
export const NO_FREE_SEATS = 'Свободных мест нет';
export const NPC_NO_SEAT = 'Место занимает игровой персонаж, а не НПС';

export function characterInGame(gameName: string) {
  return `Персонаж уже в игре «${gameName}»`;
}
export const MASTER_ONLY_LIBRARY = 'Библиотеку игры видит только мастер';
export const LIBRARY_ENTRY_NOT_FOUND = 'Записи нет в библиотеке игры';
export const LIBRARY_NO_IMAGE = 'У записи нет картинки';
export const LIBRARY_SOURCE_MISSING =
  'Записи нет в справочнике или она скрыта от вас — обновить нельзя';
export const MASTER_ONLY_SCENES = 'Сценами управляет только мастер';
export const SCENE_NOT_FOUND = 'Сцена не найдена';
export const SCENE_MAP_GONE =
  'Карты этой сцены больше нет — перезапустить сцену нельзя';
export const NO_ACTIVE_SCENE = 'В игре нет активной сцены';
export const SCENE_CLOSED = 'Мастер закрыл сцену';
export const SCENE_MEMBERS_ONLY = 'Сцену видят только участники игры';
export const SCENE_NO_IMAGE = 'Такой картинки на сцене нет';
export const SCENE_NO_RESIZE =
  'Размер сцены в игре не меняется: измените карту в редакторе и перезапустите сцену';
export const SCENE_NOTHING_TO_UNDO = 'Нечего отменять';
export const SCENE_NOTHING_TO_REDO = 'Нечего возвращать';
export const FIGURE_NO_IMAGE = 'У фигурки нет картинки';
