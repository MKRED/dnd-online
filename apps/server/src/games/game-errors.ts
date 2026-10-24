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
export const MASTER_ONLY_CONTROLLER =
  'Отдать управление персонажем может только мастер';
export const HANDOVER_NOT_ALLOWED =
  'Владелец не разрешил передавать управление этим персонажем';
export const BAD_CONTROLLER =
  'Управлять персонажем может только другой участник игры — не владелец и не мастер';

export function characterInGame(gameName: string) {
  return `Персонаж уже в игре «${gameName}»`;
}
export const MASTER_ONLY_LIBRARY = 'Библиотеку игры видит только мастер';
export const LIBRARY_ENTRY_NOT_FOUND = 'Записи нет в библиотеке игры';
export const LIBRARY_NO_IMAGE = 'У записи нет картинки';
export const LIBRARY_SOURCE_MISSING =
  'Записи нет в справочнике или она скрыта от вас — обновить нельзя';
export const MASTER_ONLY_SCENES = 'Сценами управляет только мастер';
export const MASTER_ONLY_FOG =
  'Туман сцены глазами игроков видит только мастер';
export const SCENE_NOT_FOUND = 'Сцена не найдена';
export const SCENE_FOG_OFF =
  'Туман войны на сцене выключен — сбрасывать нечего';
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
export const FIGURE_NO_MODEL = 'У фигурки нет 3D-модели';
export const SCENE_NO_MODEL = 'Такой 3D-модели на сцене нет';
export const FIGURE_NOT_FOUND = 'Фигурки нет на сцене';
export const FIGURE_NOT_YOURS = 'Эту фигурку водит другой игрок';
export const MASTER_ONLY_FIGURES =
  'Ставить фигурки и менять их запас движения может только мастер';
export const FIGURE_CANT_REACH =
  'Туда не дойти: путь перекрыт или не хватает движения';
export const CREATURE_NOT_FOUND = 'Такого существа на сцене нет';
export const MASTER_ONLY_CREATURES =
  'Монстров и НПС ведёт только мастер: их хиты, эффекты и ход';
export const CREATURE_CANT_REACH =
  'Туда не дойти: путь перекрыт или не хватает движения';
export const CREATURE_DOWN = 'Поверженное существо не ходит';
export const GAME_CHARACTER_NOT_FOUND = 'Персонажа нет на местах этой игры';
export const GAME_CHARACTER_NOT_YOURS = 'Этого персонажа ведёт другой игрок';
export const CHARACTER_DEAD =
  'Персонаж погиб: вылечить его нельзя, пока не убраны провалы спасбросков';
export function characterNoHealing(sources: readonly string[]) {
  return `Лечение запрещено: ${sources.join(', ')}`;
}
export const FIGURE_CANT_STAND =
  'Здесь фигурке не встать: нет опоры, тесно или место занято';
