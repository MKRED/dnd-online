// Тексты ошибок боя с очерёдностью (docs/plan/combat.md, этап 2): UI показывает их как есть.
export const MASTER_ONLY_COMBAT =
  'Начинать бой, звать и убирать участников и править очередь может только мастер';
export const COMBAT_ALREADY = 'Бой с очерёдностью уже идёт';
export const COMBAT_NOT_STARTED = 'Бой с очерёдностью не начат';
export const COMBATANT_NOT_FOUND = 'Такого участника боя нет';
export const COMBATANT_NOT_ON_SCENE =
  'Такого существа или фигурки нет на сцене';
export const COMBATANT_ALREADY = 'Уже в бою';
export const COMBATANT_TWICE = 'Участник указан дважды';
export const INITIATIVE_ALREADY = 'Инициатива уже брошена';
export const INITIATIVE_NOT_YOURS =
  'Бросить инициативу можно только за свою фигурку';
export const MASTER_ONLY_ROLL_MODE =
  'Преимущество и помеху на броске переключает только мастер';
export const COMBAT_ORDER_MISMATCH =
  'Очередь — все бросившие инициативу участники, каждый по разу';
export const TURN_NOT_STARTED =
  'Ходы ещё не начались: не все бросили инициативу';
export const TURN_PASSED = 'Этот ход уже закончен';
export const TURN_NOT_YOURS =
  'Закончить этот ход может тот, кто водит фигурку, или мастер';
export const TURN_NOT_ROLLED = 'Ход — только тому, кто уже бросил инициативу';
export const NOT_YOUR_TURN = 'Сейчас не ваш ход';
export const NOT_ITS_TURN =
  'Сейчас не его ход: вне хода переставить можно в «Правке»';
export const ROUND_BY_ORDER =
  'В бою с очерёдностью раунд меняется сам, когда походили все';
export const ACTION_NOT_YOURS =
  'Действовать за участника может тот, кто водит фигурку, или мастер';
export const NO_ACTIONS_LEFT = 'В этом ходу действий больше нет';
export const ALREADY_DODGING = 'Участник уже уклоняется';
export const ALREADY_DISENGAGED = 'Участник уже отходит';
export const RESOURCES_OVER_MAX = 'Потратить можно не больше, чем есть за ход';
export const ABILITY_NOT_FOUND = 'У участника нет такой способности';
export const ABILITY_NOT_IN_COMBAT =
  'Эту способность в бою не применить: черта действует сама, долгое применение занимает минуты, легендарные действия — позже';
export const ABILITY_NOT_PREPARED = 'Заклинание не подготовлено';
export const slotLevelNeeded = (min: number) =>
  `Выберите круг ячейки — не ниже ${min}`;
export const noFreeSlot = (level: number) =>
  `Свободных ячеек ${level} круга нет`;
// Атаки героев (этап 5).
export const ATTACK_HEROES_ONLY =
  'Пока атакуют только герои: атаки монстров и НПС — следующий этап';
export const ATTACK_NOT_IN_SET = 'Этой атаки нет в активном наборе оружия';
export const ATTACK_NEEDS_LIGHT =
  'Второй рукой — после атаки Лёгким оружием основной руки в этом ходу';
export const DAMAGE_PENDING = 'Сначала бросьте урон по прошлому попаданию';
export const NO_PENDING_DAMAGE = 'Нет попадания, по которому бросить урон';
export const TARGET_NOT_FOUND = 'Такой цели на сцене нет';
export const TARGET_SELF = 'Атаковать самого себя нельзя';
export const TARGET_DOWN = 'Цель уже повержена';
export const TARGET_TOTAL_COVER = 'Цель за полным укрытием';
export const targetOutOfReach = (reach: string) =>
  `Цель вне досягаемости: ${reach}`;
export const WEAPON_SET_SWITCHED = 'Набор оружия уже переключали в этот ход';
export const WEAPON_SET_SAME = 'Этот набор уже выбран';
export const HAND_NOT_YOUR_TURN =
  'В бою оружие и щит в руках меняют только в свой ход';
export const NO_ACTIONS_FOR_SWAP =
  'Действий больше нет: вторая смена оружия за ход и щит стоят действие';
